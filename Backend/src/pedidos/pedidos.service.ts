import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomInt, randomUUID } from 'crypto';
import { mkdir, realpath, rm, stat, writeFile } from 'fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve, sep } from 'path';
import { PrismaService } from '../prisma.service';
import { CampoArchivo } from './archivos';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListPedidosDto } from './dto/list-pedidos.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

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
  createdAt: true,
} satisfies Prisma.PedidoSelect;

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
              ...dto,
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
        createdAt: true,
      },
    });
    if (!pedido) {
      throw new NotFoundException('No encontramos un pedido con ese código.');
    }
    return pedido;
  }

  async list(query: ListPedidosDto) {
    const { page, limit, estado, q } = query;
    const where: Prisma.PedidoWhereInput = {
      ...(estado ? { estado } : {}),
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
        data: { estado: dto.estado },
        select: { id: true, estado: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Pedido no encontrado');
      }
      throw error;
    }
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
      },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
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
