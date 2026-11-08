import { BadRequestException, Injectable } from '@nestjs/common';
import { EstadoPedido, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { TARIFAS_VACIAS, Tarifas, validarTarifas } from '../compartido/precios';
import { calcularFranjas, HORARIOS_POR_DEFECTO, Horarios, normalizarHorarios } from './horarios';

const ID = 'principal';
const CACHE_MS = 15_000;

/** Convierte lo que llega del admin (o de la base) a Tarifas, o devuelve un mensaje de error. */
export function normalizarTarifas(entrada: unknown): Tarifas | string {
  if (!entrada || typeof entrada !== 'object') return 'Las tarifas no son válidas.';
  const t = entrada as Record<string, unknown>;
  const precio = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  const numero = (v: unknown, defecto: number) => (v === null || v === undefined || v === '' ? defecto : Number(v));
  const descuentos = Array.isArray(t.descuentos)
    ? t.descuentos.map((d) => {
        const fila = (d ?? {}) as Record<string, unknown>;
        return { desdePaginas: Number(fila.desdePaginas), porcentaje: Number(fila.porcentaje) };
      })
    : [];
  const tarifas: Tarifas = {
    precioPaginaBn: precio(t.precioPaginaBn),
    precioPaginaColor: precio(t.precioPaginaColor),
    recargoOficio: numero(t.recargoOficio, 0),
    cargoFijo: numero(t.cargoFijo, 0),
    descuentos: descuentos.sort((a, b) => a.desdePaginas - b.desdePaginas),
    limitePaginasPedido: numero(t.limitePaginasPedido, TARIFAS_VACIAS.limitePaginasPedido),
  };
  return validarTarifas(tarifas) ?? tarifas;
}

@Injectable()
export class ConfiguracionService {
  private cache?: { tarifas: Tarifas; horarios: Horarios; updatedAt: Date; vence: number };

  constructor(private readonly prisma: PrismaService) {}

  async obtener() {
    if (this.cache && this.cache.vence > Date.now()) return this.cache;
    const fila = await this.prisma.configuracion.upsert({
      where: { id: ID },
      update: {},
      create: {
        id: ID,
        tarifas: TARIFAS_VACIAS as unknown as Prisma.InputJsonValue,
        horarios: HORARIOS_POR_DEFECTO as unknown as Prisma.InputJsonValue,
      },
    });
    // Si la base tiene un valor dañado, se usa el valor por defecto en vez de romper el sitio
    const tarifas = normalizarTarifas(fila.tarifas);
    const horarios = normalizarHorarios(fila.horarios);
    this.cache = {
      tarifas: typeof tarifas === 'string' ? TARIFAS_VACIAS : tarifas,
      horarios: typeof horarios === 'string' ? HORARIOS_POR_DEFECTO : horarios,
      updatedAt: fila.updatedAt,
      vence: Date.now() + CACHE_MS,
    };
    return this.cache;
  }

  async publica() {
    const { tarifas, horarios } = await this.obtener();
    return { tarifas, horarios };
  }

  async actualizarTarifas(entrada: unknown) {
    const tarifas = normalizarTarifas(entrada);
    if (typeof tarifas === 'string') throw new BadRequestException(tarifas);
    await this.obtener();
    await this.prisma.configuracion.update({
      where: { id: ID },
      data: { tarifas: tarifas as unknown as Prisma.InputJsonValue },
    });
    this.cache = undefined;
    return this.obtener();
  }

  async actualizarHorarios(entrada: unknown) {
    const horarios = normalizarHorarios(entrada);
    if (typeof horarios === 'string') throw new BadRequestException(horarios);
    await this.obtener();
    await this.prisma.configuracion.update({
      where: { id: ID },
      data: { horarios: horarios as unknown as Prisma.InputJsonValue },
    });
    this.cache = undefined;
    return this.obtener();
  }

  /** Franjas de recogida de los próximos días con sus cupos libres. */
  async franjas(ahora = new Date()) {
    const { horarios } = await this.obtener();
    const reservas = await this.prisma.pedido.groupBy({
      by: ['recogidaInicio'],
      where: {
        recogidaInicio: { gte: ahora, lt: new Date(ahora.getTime() + (horarios.diasAnticipacion + 1) * 24 * 60 * 60_000) },
        estado: { not: EstadoPedido.ENTREGADO },
      },
      _count: { _all: true },
    });
    const ocupadas = new Map<string, number>();
    for (const fila of reservas) {
      if (fila.recogidaInicio) ocupadas.set(fila.recogidaInicio.toISOString(), fila._count._all);
    }
    return calcularFranjas(horarios, ahora, ocupadas);
  }

  /** Verifica que la franja elegida exista y tenga cupo. Devuelve su inicio y fin. */
  async validarFranja(inicioIso: string) {
    const instante = new Date(inicioIso);
    if (Number.isNaN(instante.getTime())) throw new BadRequestException('La hora de recogida no es válida.');
    const dias = await this.franjas();
    for (const dia of dias) {
      const franja = dia.franjas.find((f) => f.inicio === instante.toISOString());
      if (franja) {
        if (!franja.disponible) {
          throw new BadRequestException('Esa franja de recogida ya se llenó. Elige otra hora.');
        }
        return { inicio: new Date(franja.inicio), fin: new Date(franja.fin) };
      }
    }
    throw new BadRequestException('Esa hora de recogida no está disponible. Elige una de las franjas que te mostramos.');
  }
}
