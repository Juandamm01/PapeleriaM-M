import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoPedido } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, realpath, rm, stat, writeFile } from 'fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'path';
import { PrismaService } from '../prisma.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListPedidosDto } from './dto/list-pedidos.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPedidoDto: CreatePedidoDto, file: Express.Multer.File) {
    const uploadsDirectory = join(process.cwd(), 'uploads');
    await mkdir(uploadsDirectory, { recursive: true });

    const storedFilename = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const archivoRuta = join(uploadsDirectory, storedFilename);
    await writeFile(archivoRuta, file.buffer);

    try {
      return await this.prisma.pedido.create({
        data: {
          ...createPedidoDto,
          archivoNombre: file.originalname,
          archivoRuta,
          tipoArchivo: file.mimetype,
        },
      });
    } catch (error) {
      await rm(archivoRuta, { force: true });
      throw error;
    }
  }

  async list(query: ListPedidosDto) {
    const { page, limit, estado } = query;
    const where = estado ? { estado } : {};
    const [items, total] = await Promise.all([
      this.prisma.pedido.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          nombre: true,
          correo: true,
          telefono: true,
          notas: true,
          archivoNombre: true,
          tipoArchivo: true,
          metodoPago: true,
          estado: true,
          createdAt: true,
        },
      }),
      this.prisma.pedido.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        correo: true,
        telefono: true,
        notas: true,
        archivoNombre: true,
        tipoArchivo: true,
        metodoPago: true,
        estado: true,
        createdAt: true,
      },
    });
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
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Pedido no encontrado');
      }
      throw error;
    }
  }

  async getDownload(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      select: { archivoRuta: true, archivoNombre: true, tipoArchivo: true },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido no encontrado');
    }

    try {
      const uploadsDirectory = await realpath(resolve(process.cwd(), 'uploads'));
      const filePath = resolve(uploadsDirectory, pedido.archivoRuta);
      const realFilePath = await realpath(filePath);
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

      const filename =
        basename(pedido.archivoNombre)
          .replace(/[^\w.-]/g, '_')
          .slice(0, 180) || 'archivo';
      return {
        filePath: realFilePath,
        filename,
        contentType: pedido.tipoArchivo,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Archivo no encontrado');
    }
  }
}
