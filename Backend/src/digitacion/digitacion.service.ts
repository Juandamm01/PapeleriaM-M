import { BadRequestException, ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoDigitacion, Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { mkdir, realpath, rm, writeFile } from 'fs/promises';
import { basename, extname, join, relative, resolve, sep } from 'path';
import { PrismaService } from '../prisma.service';
import { ActualizarDigitacionDto, CrearDigitacionDto } from './dto/digitacion.dto';

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const POR_PAGINA = 15;
type ArchivoGuardado = { nombre: string; ruta: string; tipo: string };

const generarCodigo = () => `DG-${Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')}`;

const camposAdmin = {
  id: true,
  codigo: true,
  nombre: true,
  telefono: true,
  correo: true,
  tipoTrabajo: true,
  descripcion: true,
  paginasAprox: true,
  formatoEntrega: true,
  fechaLimite: true,
  observaciones: true,
  archivos: true,
  estado: true,
  precioCentavos: true,
  notaCliente: true,
  aceptadaAt: true,
  archivosEliminadosAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SolicitudDigitacionSelect;

// Transiciones que el admin puede hacer; ACEPTADO normalmente lo marca el cliente
const TRANSICIONES: Record<EstadoDigitacion, EstadoDigitacion[]> = {
  RECIBIDO: ['EN_REVISION', 'COTIZADO', 'CANCELADO'],
  EN_REVISION: ['RECIBIDO', 'COTIZADO', 'CANCELADO'],
  COTIZADO: ['EN_REVISION', 'ACEPTADO', 'CANCELADO'],
  ACEPTADO: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: ['ACEPTADO'],
  CANCELADO: ['RECIBIDO'],
};

@Injectable()
export class DigitacionService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearDigitacionDto, archivos: Express.Multer.File[]) {
    if (!dto.telefono && !dto.correo) {
      throw new BadRequestException('Déjanos un celular o un correo para enviarte la cotización.');
    }
    let fechaLimite: Date | undefined;
    if (dto.fechaLimite) {
      fechaLimite = new Date(`${dto.fechaLimite}T23:59:59-05:00`);
      if (Number.isNaN(fechaLimite.getTime()) || fechaLimite.getTime() < Date.now()) {
        throw new BadRequestException('La fecha límite debe ser hoy o una fecha futura.');
      }
    }

    const uploads = join(process.cwd(), 'uploads');
    await mkdir(uploads, { recursive: true });
    const guardados: ArchivoGuardado[] = [];
    try {
      for (const archivo of archivos) {
        const ruta = `${randomUUID()}-digitacion${extname(archivo.originalname).toLowerCase()}`;
        await writeFile(join(uploads, ruta), archivo.buffer);
        guardados.push({ nombre: archivo.originalname.slice(0, 180), ruta, tipo: archivo.mimetype });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { aceptaPolitica, fechaLimite: _fecha, ...datos } = dto;
      for (let intento = 1; ; intento++) {
        try {
          return await this.prisma.solicitudDigitacion.create({
            data: {
              ...datos,
              fechaLimite,
              archivos: guardados as unknown as Prisma.InputJsonValue,
              consentimientoAt: new Date(),
              codigo: generarCodigo(),
            },
            select: { codigo: true, estado: true, createdAt: true },
          });
        } catch (error) {
          const duplicado = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
          if (duplicado && intento < 5) continue;
          throw error;
        }
      }
    } catch (error) {
      await Promise.all(guardados.map((g) => rm(join(uploads, g.ruta), { force: true })));
      throw error;
    }
  }

  /** Consulta pública por código: sin datos de contacto. */
  async consultar(codigo: string) {
    const solicitud = await this.prisma.solicitudDigitacion.findUnique({
      where: { codigo },
      select: {
        codigo: true,
        tipoTrabajo: true,
        formatoEntrega: true,
        paginasAprox: true,
        fechaLimite: true,
        estado: true,
        precioCentavos: true,
        notaCliente: true,
        aceptadaAt: true,
        createdAt: true,
      },
    });
    if (!solicitud) throw new NotFoundException('No encontramos una solicitud con ese código.');
    return solicitud;
  }

  async aceptar(codigo: string) {
    const { count } = await this.prisma.solicitudDigitacion.updateMany({
      where: { codigo, estado: EstadoDigitacion.COTIZADO, precioCentavos: { not: null } },
      data: { estado: EstadoDigitacion.ACEPTADO, aceptadaAt: new Date() },
    });
    if (count === 0) {
      await this.consultar(codigo);
      throw new ConflictException('Esta solicitud no tiene una cotización pendiente de aceptar.');
    }
    return this.consultar(codigo);
  }

  async listar(estado: EstadoDigitacion | undefined, page: number) {
    const where = estado ? { estado } : {};
    const [items, total] = await Promise.all([
      this.prisma.solicitudDigitacion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * POR_PAGINA,
        take: POR_PAGINA,
        select: camposAdmin,
      }),
      this.prisma.solicitudDigitacion.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / POR_PAGINA) };
  }

  async actualizar(id: string, dto: ActualizarDigitacionDto) {
    const actual = await this.prisma.solicitudDigitacion.findUnique({
      where: { id },
      select: { estado: true, precioCentavos: true },
    });
    if (!actual) throw new NotFoundException('Solicitud no encontrada');
    const data: Prisma.SolicitudDigitacionUpdateInput = {};

    if (dto.precio !== undefined) {
      if (actual.estado === EstadoDigitacion.ACEPTADO || actual.estado === EstadoDigitacion.FINALIZADO) {
        throw new ConflictException('El cliente ya aceptó la cotización: no se puede cambiar el precio.');
      }
      data.precioCentavos = dto.precio * 100;
    }
    if (dto.notaCliente !== undefined) data.notaCliente = dto.notaCliente.trim() || null;
    if (dto.estado !== undefined && dto.estado !== actual.estado) {
      if (!TRANSICIONES[actual.estado].includes(dto.estado)) {
        throw new BadRequestException('Ese cambio de estado no está permitido.');
      }
      const precio = dto.precio !== undefined ? dto.precio * 100 : actual.precioCentavos;
      if ((dto.estado === EstadoDigitacion.COTIZADO || dto.estado === EstadoDigitacion.ACEPTADO) && !precio) {
        throw new BadRequestException('Escribe el precio antes de enviar la cotización.');
      }
      data.estado = dto.estado;
      if (dto.estado === EstadoDigitacion.ACEPTADO) data.aceptadaAt = new Date();
    }
    return this.prisma.solicitudDigitacion.update({ where: { id }, data, select: camposAdmin });
  }

  async archivo(id: string, indice: number) {
    const solicitud = await this.prisma.solicitudDigitacion.findUnique({
      where: { id },
      select: { archivos: true, archivosEliminadosAt: true },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.archivosEliminadosAt) throw new GoneException('Los archivos se eliminaron por la política de retención.');
    const archivo = (solicitud.archivos as ArchivoGuardado[] | null)?.[indice];
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    try {
      const uploads = await realpath(resolve(process.cwd(), 'uploads'));
      const real = await realpath(resolve(uploads, archivo.ruta));
      const desde = relative(uploads, real);
      if (!desde || desde.startsWith(`..${sep}`) || desde === '..') throw new Error('fuera');
      return {
        filePath: real,
        filename: basename(archivo.nombre).replace(/[^\w.-]/g, '_').slice(0, 180) || 'archivo',
        contentType: archivo.tipo,
      };
    } catch {
      throw new NotFoundException('Archivo no encontrado');
    }
  }
}
