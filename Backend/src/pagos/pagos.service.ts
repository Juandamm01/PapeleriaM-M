import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EstadoPago, Pago, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CrearPagoDto } from './dto/crear-pago.dto';
import { EventoWompi, eventoEsAutentico, firmaDeIntegridad } from './firma';
import { EstadoWompi, TransaccionWompi, WompiClient } from './wompi.client';

/** Tiempo que tiene el cliente para aprobar la notificación en su app Nequi (Wompi no lo documenta). */
export const VENTANA_APROBACION_MS = 10 * 60_000;
/** Mientras el cliente espera, se consulta a Wompi como máximo una vez cada tantos ms por intento. */
const INTERVALO_CONSULTA_MS = 8_000;

export function estadoDesdeWompi(estado: EstadoWompi | string): EstadoPago {
  switch (estado) {
    case 'APPROVED':
      return EstadoPago.APROBADO;
    case 'DECLINED':
    case 'ERROR':
      return EstadoPago.RECHAZADO;
    case 'VOIDED':
      return EstadoPago.ANULADO;
    default:
      return EstadoPago.PENDIENTE;
  }
}

export type VistaPago = {
  referencia: string;
  codigo: string;
  estado: EstadoPago;
  montoCentavos: number;
  expiraEn: string;
  mensaje?: string;
};

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);
  private readonly ultimaConsulta = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly wompi: WompiClient,
  ) {}

  configuracion() {
    return { habilitado: this.wompi.habilitado };
  }

  async aceptacion() {
    const contratos = await this.wompi.contratosDeAceptacion();
    return { aceptacion: contratos.aceptacion, datosPersonales: contratos.datosPersonales };
  }

  private vista(pago: Pago, codigo: string): VistaPago {
    const vista: VistaPago = {
      referencia: pago.referencia,
      codigo,
      estado: pago.estado,
      montoCentavos: pago.montoCentavos,
      expiraEn: new Date(pago.createdAt.getTime() + VENTANA_APROBACION_MS).toISOString(),
    };
    if (pago.estado === EstadoPago.RECHAZADO) {
      vista.mensaje = 'Nequi rechazó el pago o no se pudo procesar. Puedes intentarlo de nuevo.';
    } else if (pago.estado === EstadoPago.EXPIRADO) {
      vista.mensaje = 'El tiempo para aprobar el pago terminó. Puedes intentarlo de nuevo.';
    }
    return vista;
  }

  async crear(dto: CrearPagoDto): Promise<VistaPago> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { codigo: dto.codigo },
      select: { id: true, codigo: true, correo: true, precioCentavos: true, estadoPago: true },
    });
    if (!pedido) throw new NotFoundException('No encontramos un pedido con ese código.');
    if (pedido.estadoPago === EstadoPago.APROBADO) {
      throw new ConflictException('Este pedido ya está pagado.');
    }
    if (!pedido.precioCentavos) {
      throw new ConflictException(
        'Todavía no tenemos el valor de tu pedido. Te avisaremos cuando puedas pagarlo.',
      );
    }

    // Antes de crear otro cobro se revisan los intentos abiertos o vencidos de las últimas 24 h:
    // si alguno se aprobó tarde no se vuelve a cobrar, y si sigue esperando se reutiliza.
    const recientes = await this.prisma.pago.findMany({
      where: {
        pedidoId: pedido.id,
        estado: { in: [EstadoPago.PENDIENTE, EstadoPago.EXPIRADO] },
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    for (const intento of recientes) {
      const actualizado = await this.sincronizar(intento, true);
      if (actualizado.estado === EstadoPago.APROBADO) {
        throw new ConflictException('Este pedido ya está pagado.');
      }
      if (actualizado.estado === EstadoPago.PENDIENTE) {
        return this.vista(actualizado, pedido.codigo);
      }
    }

    const intentos = await this.prisma.pago.count({ where: { pedidoId: pedido.id } });
    const referencia = `${pedido.codigo}-${intentos + 1}`;
    const monto = pedido.precioCentavos;
    const pago = await this.prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        referencia,
        montoCentavos: monto,
        telefonoFinal: dto.telefono.slice(-4),
      },
    });

    try {
      const transaccion = await this.wompi.crearTransaccionNequi({
        referencia,
        montoCentavos: monto,
        firma: firmaDeIntegridad(referencia, monto, 'COP', this.wompi.secretoIntegridad),
        correo: pedido.correo,
        telefono: dto.telefono,
        tokenAceptacion: dto.tokenAceptacion,
        tokenDatosPersonales: dto.tokenDatosPersonales,
      });
      const conTransaccion = await this.prisma.pago.update({
        where: { id: pago.id },
        data: { wompiTransactionId: transaccion.id },
      });
      const final = await this.aplicarTransaccion(transaccion, conTransaccion);
      return this.vista(final, pedido.codigo);
    } catch (error) {
      await this.prisma.pago.updateMany({
        where: { id: pago.id, estado: EstadoPago.PENDIENTE, wompiTransactionId: null },
        data: { estado: EstadoPago.RECHAZADO, motivo: 'No se pudo iniciar el cobro en Wompi.' },
      });
      throw error;
    }
  }

  async estado(referencia: string): Promise<VistaPago> {
    const pago = await this.prisma.pago.findUnique({
      where: { referencia },
      include: { pedido: { select: { codigo: true } } },
    });
    if (!pago) throw new NotFoundException('No encontramos ese pago.');
    const { pedido, ...soloPago } = pago;
    const actualizado = await this.sincronizar(soloPago);
    return this.vista(actualizado, pedido.codigo);
  }

  /**
   * Respaldo del webhook: consulta a Wompi un intento abierto.
   * Si sigue pendiente pasada la ventana de aprobación, se marca EXPIRADO (estado propio).
   */
  private async sincronizar(pago: Pago, forzar = false): Promise<Pago> {
    if (pago.estado !== EstadoPago.PENDIENTE && pago.estado !== EstadoPago.EXPIRADO) return pago;
    let actual = pago;

    const ultima = this.ultimaConsulta.get(pago.id) ?? 0;
    if (pago.wompiTransactionId && (forzar || Date.now() - ultima > INTERVALO_CONSULTA_MS)) {
      this.ultimaConsulta.set(pago.id, Date.now());
      try {
        const transaccion = await this.wompi.consultarTransaccion(pago.wompiTransactionId);
        actual = await this.aplicarTransaccion(transaccion, pago);
      } catch {
        // Si Wompi no responde se conserva el estado; el webhook o la próxima consulta lo corrigen
      }
    }

    if (
      actual.estado === EstadoPago.PENDIENTE &&
      Date.now() - actual.createdAt.getTime() > VENTANA_APROBACION_MS
    ) {
      const { count } = await this.prisma.pago.updateMany({
        where: { id: actual.id, estado: EstadoPago.PENDIENTE },
        data: { estado: EstadoPago.EXPIRADO, motivo: 'Sin aprobación dentro del tiempo límite.' },
      });
      if (count > 0) actual = await this.prisma.pago.findUniqueOrThrow({ where: { id: actual.id } });
    }
    if (actual.estado !== EstadoPago.PENDIENTE) this.ultimaConsulta.delete(actual.id);
    return actual;
  }

  /**
   * Aplica el estado de una transacción de Wompi a nuestro intento. Es idempotente: solo cambia
   * intentos PENDIENTE o EXPIRADO, y antes verifica referencia, monto, moneda e id de transacción.
   */
  private async aplicarTransaccion(transaccion: TransaccionWompi, pagoConocido?: Pago): Promise<Pago> {
    const pago =
      pagoConocido ??
      (await this.prisma.pago.findUnique({ where: { referencia: transaccion.reference } }));
    if (!pago) {
      this.logger.warn('Transacción de Wompi con una referencia desconocida; se ignora.');
      throw new NotFoundException('Pago no encontrado');
    }

    const coincide =
      transaccion.reference === pago.referencia &&
      transaccion.amount_in_cents === pago.montoCentavos &&
      transaccion.currency === 'COP' &&
      (!pago.wompiTransactionId || pago.wompiTransactionId === transaccion.id);

    if (!coincide) {
      this.logger.error(`La transacción de Wompi no coincide con el intento ${pago.referencia}; revisar.`);
      await this.prisma.pago.updateMany({
        where: { id: pago.id, estado: { in: [EstadoPago.PENDIENTE, EstadoPago.EXPIRADO] } },
        data: {
          estado: EstadoPago.RECHAZADO,
          motivo: 'Revisar: los datos de Wompi no coinciden con el pedido.',
        },
      });
      return this.prisma.pago.findUniqueOrThrow({ where: { id: pago.id } });
    }

    const nuevo = estadoDesdeWompi(transaccion.status);
    if (nuevo === EstadoPago.PENDIENTE) {
      if (!pago.wompiTransactionId) {
        return this.prisma.pago.update({
          where: { id: pago.id },
          data: { wompiTransactionId: transaccion.id },
        });
      }
      return pago;
    }

    const datos: Prisma.PagoUpdateManyMutationInput = {
      estado: nuevo,
      wompiTransactionId: transaccion.id,
      motivo: transaccion.status_message ? String(transaccion.status_message).slice(0, 200) : null,
    };
    // Un EXPIRADO propio se corrige si Wompi informa una aprobación tardía
    const { count } = await this.prisma.pago.updateMany({
      where: { id: pago.id, estado: { in: [EstadoPago.PENDIENTE, EstadoPago.EXPIRADO] } },
      data: datos,
    });

    if (count > 0 && nuevo === EstadoPago.APROBADO) {
      const marcado = await this.prisma.pedido.updateMany({
        where: { id: pago.pedidoId, estadoPago: { not: EstadoPago.APROBADO } },
        data: { estadoPago: EstadoPago.APROBADO, pagadoAt: new Date(), pagoManual: false },
      });
      if (marcado.count === 0) {
        this.logger.warn(`El pedido del intento ${pago.referencia} ya estaba pagado: posible cobro doble.`);
      }
    }
    return this.prisma.pago.findUniqueOrThrow({ where: { id: pago.id } });
  }

  verificarEvento(evento: EventoWompi, checksum?: string) {
    return eventoEsAutentico(evento, this.wompi.secretoEventos, checksum);
  }

  /** Procesa un evento ya verificado; antes de aplicarlo se vuelve a consultar la transacción a Wompi. */
  async procesarEvento(evento: EventoWompi) {
    if (evento.event !== 'transaction.updated') return;
    const transaccion = (evento.data as { transaction?: { id?: unknown } } | undefined)?.transaction;
    if (!transaccion || typeof transaccion.id !== 'string') return;
    try {
      const confirmada = await this.wompi.consultarTransaccion(transaccion.id);
      await this.aplicarTransaccion(confirmada);
    } catch (error) {
      this.logger.warn(
        `No se pudo aplicar un evento de Wompi (${error instanceof Error ? error.message : 'error'}).`,
      );
    }
  }
}
