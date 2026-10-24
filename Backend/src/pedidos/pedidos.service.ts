import { ConflictException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPago, Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { mkdir, realpath, rm, stat, writeFile } from 'fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'path';
import { PrismaService } from '../prisma.service';
import { CampoArchivo } from './archivos';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListPedidosDto } from './dto/list-pedidos.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { PagoManualDto, PrecioDto } from './dto/pago.dto';

// Sin 0/O ni 1/I/L para que el código se pueda dictar por teléfono sin confusiones
const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const INTENTOS_CODIGO = 5;

const camposAdmin = {
  id: true,
  codigo: true,
  nombre: true,
  correo: true,
  telefono: true,
  notas: true,
  archivoNombre: true,
  tipoArchivo: true,
  copias: true,
  tamano: true,
  tipoImpresion: true,
  dobleCara: true,
  metodoPago: true,
  referenciaNequi: true,
  comprobanteNombre: true,
  estado: true,
  consentimientoAt: true,
  entregadoAt: true,
  archivosEliminadosAt: true,
  precioCentavos: true,
  estadoPago: true,
  pagadoAt: true,
  pagoManual: true,
  pagos: {
    select: { referencia: true, estado: true, wompiTransactionId: true, montoCentavos: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  },
  createdAt: true,
} satisfies Prisma.PedidoSelect;

// Colombia no tiene horario de verano: el día local va de 05:00 UTC a 05:00 UTC del día siguiente
const OFFSET_COLOMBIA_MS = 5 * 60 * 60_000;
// Comisión estimada de Wompi por transacción aprobada: 2,65 % + $700, más IVA del 19 %
const comisionEstimada = (centavos: number) => Math.round((centavos * 0.0265 + 70_000) * 1.19);

function rangoDelDia(fecha?: string) {
  const base = fecha
    ? new Date(`${fecha}T00:00:00.000Z`)
    : new Date(new Date(Date.now() - OFFSET_COLOMBIA_MS).toISOString().slice(0, 10) + 'T00:00:00.000Z');
  if (Number.isNaN(base.getTime())) throw new NotFoundException('Fecha inválida');
  const desde = new Date(base.getTime() + OFFSET_COLOMBIA_MS);
  return { dia: base.toISOString().slice(0, 10), desde, hasta: new Date(desde.getTime() + 24 * 60 * 60_000) };
}

function generarCodigo() {
  let sufijo = '';
  for (let i = 0; i < 6; i++) {
    sufijo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  }
  return `MM-${sufijo}`;
}

function esCodigoDuplicado(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta?.target ?? '').includes('codigo')
  );
}

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadsDirectory() {
    return join(process.cwd(), 'uploads');
  }

  async create(
    dto: CreatePedidoDto,
    archivo: Express.Multer.File,
    comprobante?: Express.Multer.File,
  ) {
    const uploads = this.uploadsDirectory();
    await mkdir(uploads, { recursive: true });

    // Se guarda solo el nombre del archivo (relativo a uploads/), no la ruta absoluta del servidor
    const archivoRuta = `${randomUUID()}${extname(archivo.originalname).toLowerCase()}`;
    const comprobanteRuta = comprobante
      ? `${randomUUID()}-comprobante${extname(comprobante.originalname).toLowerCase()}`
      : undefined;
    const escritos: string[] = [];
    // aceptaPolitica no es una columna: se guarda como la fecha del consentimiento
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { aceptaPolitica, ...datos } = dto;

    try {
      await writeFile(join(uploads, archivoRuta), archivo.buffer);
      escritos.push(join(uploads, archivoRuta));
      if (comprobante && comprobanteRuta) {
        await writeFile(join(uploads, comprobanteRuta), comprobante.buffer);
        escritos.push(join(uploads, comprobanteRuta));
      }

      for (let intento = 1; ; intento++) {
        try {
          return await this.prisma.pedido.create({
            data: {
              ...datos,
              consentimientoAt: new Date(),
              codigo: generarCodigo(),
              archivoNombre: archivo.originalname,
              archivoRuta,
              tipoArchivo: archivo.mimetype,
              comprobanteNombre: comprobante?.originalname,
              comprobanteRuta,
              comprobanteTipo: comprobante?.mimetype,
            },
            select: { codigo: true, estado: true, metodoPago: true, createdAt: true },
          });
        } catch (error) {
          if (esCodigoDuplicado(error) && intento < INTENTOS_CODIGO) continue;
          throw error;
        }
      }
    } catch (error) {
      await Promise.all(escritos.map((ruta) => rm(ruta, { force: true })));
      throw error;
    }
  }

  async rastreo(codigo: string) {
    // Sin datos personales: solo lo necesario para que el cliente sepa si puede recoger
    const pedido = await this.prisma.pedido.findUnique({
      where: { codigo },
      select: {
        codigo: true,
        estado: true,
        copias: true,
        tamano: true,
        tipoImpresion: true,
        dobleCara: true,
        metodoPago: true,
        precioCentavos: true,
        estadoPago: true,
        createdAt: true,
      },
    });
    if (!pedido) {
      throw new NotFoundException('No encontramos un pedido con ese código.');
    }
    return pedido;
  }

  async list(query: ListPedidosDto) {
    const { page, limit, estado, estadoPago, q } = query;
    const where: Prisma.PedidoWhereInput = {
      ...(estado ? { estado } : {}),
      ...(estadoPago ? { estadoPago } : {}),
      ...(q
        ? {
            OR: [
              { codigo: { contains: q, mode: 'insensitive' } },
              { nombre: { contains: q, mode: 'insensitive' } },
              { telefono: { contains: q.replace(/\D/g, '') || q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.pedido.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: camposAdmin,
      }),
      this.prisma.pedido.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id }, select: camposAdmin });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return pedido;
  }

  async updateEstado(id: string, dto: UpdateEstadoDto) {
    try {
      return await this.prisma.pedido.update({
        where: { id },
        data: {
          estado: dto.estado,
          entregadoAt: dto.estado === 'ENTREGADO' ? new Date() : null,
        },
        select: { id: true, estado: true, entregadoAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Pedido no encontrado');
      }
      throw error;
    }
  }

  async fijarPrecio(id: string, dto: PrecioDto) {
    const pedido = await this.prisma.pedido.findUnique({ where: { id }, select: { estadoPago: true } });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (pedido.estadoPago === EstadoPago.APROBADO) {
      throw new ConflictException('El pedido ya está pagado: no se puede cambiar el precio.');
    }
    // Si hay un cobro esperando aprobación en Nequi, cambiar el precio dejaría montos distintos
    const abierto = await this.prisma.pago.count({ where: { pedidoId: id, estado: EstadoPago.PENDIENTE } });
    if (abierto > 0) {
      throw new ConflictException('Hay un pago con Nequi en curso. Espera a que termine para cambiar el precio.');
    }
    return this.prisma.pedido.update({
      where: { id },
      data: { precioCentavos: dto.precio * 100 },
      select: camposAdmin,
    });
  }

  async marcarPagoManual(id: string, dto: PagoManualDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      select: { estadoPago: true, pagoManual: true },
    });
    if (!pedido) throw new NotFoundException('Pedido no encontrado');
    if (dto.pagado) {
      if (pedido.estadoPago === EstadoPago.APROBADO) return this.getById(id);
      return this.prisma.pedido.update({
        where: { id },
        data: { estadoPago: EstadoPago.APROBADO, pagadoAt: new Date(), pagoManual: true },
        select: camposAdmin,
      });
    }
    // Solo se puede deshacer una confirmación manual; un pago aprobado por Wompi no se revierte aquí
    if (pedido.estadoPago === EstadoPago.APROBADO && !pedido.pagoManual) {
      throw new ConflictException('Este pago lo confirmó Wompi; no se puede desmarcar desde el panel.');
    }
    return this.prisma.pedido.update({
      where: { id },
      data: { estadoPago: EstadoPago.PENDIENTE, pagadoAt: null, pagoManual: false },
      select: camposAdmin,
    });
  }

  /** Resumen de un día (hora de Colombia) para cuadrar contra la app de Nequi. */
  async resumen(fecha?: string) {
    const { dia, desde, hasta } = rangoDelDia(fecha);
    const [recibidos, porEstado, nequi, manuales] = await Promise.all([
      this.prisma.pedido.count({ where: { createdAt: { gte: desde, lt: hasta } } }),
      this.prisma.pedido.groupBy({
        by: ['estado'],
        where: { createdAt: { gte: desde, lt: hasta } },
        _count: { _all: true },
      }),
      this.prisma.pago.findMany({
        where: { estado: EstadoPago.APROBADO, updatedAt: { gte: desde, lt: hasta } },
        select: { referencia: true, montoCentavos: true, wompiTransactionId: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.pedido.aggregate({
        where: { pagoManual: true, pagadoAt: { gte: desde, lt: hasta } },
        _count: { _all: true },
        _sum: { precioCentavos: true },
      }),
    ]);
    const totalNequi = nequi.reduce((suma, pago) => suma + pago.montoCentavos, 0);
    const comision = nequi.reduce((suma, pago) => suma + comisionEstimada(pago.montoCentavos), 0);
    return {
      dia,
      pedidosRecibidos: recibidos,
      porEstado: Object.fromEntries(porEstado.map((fila) => [fila.estado, fila._count._all])),
      nequiWompi: {
        cantidad: nequi.length,
        totalCentavos: totalNequi,
        comisionEstimadaCentavos: comision,
        netoEstimadoCentavos: totalNequi - comision,
        pagos: nequi,
      },
      manual: {
        cantidad: manuales._count._all,
        totalCentavos: manuales._sum.precioCentavos ?? 0,
      },
    };
  }

  async getDownload(id: string, campo: CampoArchivo) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      select: {
        archivoRuta: true,
        archivoNombre: true,
        tipoArchivo: true,
        comprobanteRuta: true,
        comprobanteNombre: true,
        comprobanteTipo: true,
        archivosEliminadosAt: true,
      },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }
    if (pedido.archivosEliminadosAt) {
      throw new GoneException(
        'Los archivos de este pedido se eliminaron por la política de retención.',
      );
    }
    const ruta = campo === 'archivo' ? pedido.archivoRuta : pedido.comprobanteRuta;
    const nombre = campo === 'archivo' ? pedido.archivoNombre : pedido.comprobanteNombre;
    const tipo = campo === 'archivo' ? pedido.tipoArchivo : pedido.comprobanteTipo;
    if (!ruta || !nombre || !tipo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    try {
      const uploadsDirectory = await realpath(resolve(process.cwd(), 'uploads'));
      // Funciona con rutas absolutas (pedidos antiguos) y con nombres relativos (nuevos)
      const realFilePath = await realpath(resolve(uploadsDirectory, ruta));
      const pathFromUploads = relative(uploadsDirectory, realFilePath);
      if (
        !pathFromUploads ||
        pathFromUploads === '..' ||
        pathFromUploads.startsWith(`..${sep}`) ||
        isAbsolute(pathFromUploads) ||
        !(await stat(realFilePath)).isFile()
      ) {
        throw new NotFoundException('Archivo no encontrado');
      }

      const filename = basename(nombre).replace(/[^\w.-]/g, '_').slice(0, 180) || 'archivo';
      return { filePath: realFilePath, filename, contentType: tipo };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Archivo no encontrado');
    }
  }
}
