import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import {
  CampoArchivo,
  contenidoValido,
  extensionYMimePermitidos,
  MAX_ARCHIVO_BYTES,
  MAX_COMPROBANTE_BYTES,
} from './archivos';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListPedidosDto } from './dto/list-pedidos.dto';
import { RastreoParamsDto } from './dto/rastreo.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { PedidosService } from './pedidos.service';

type ArchivosSubidos = {
  archivo?: Express.Multer.File[];
  comprobante?: Express.Multer.File[];
};

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Query() query: ListPedidosDto) {
    return this.pedidosService.list(query);
  }

  // Público: el cliente consulta su pedido con el código. Va antes de las rutas con :id.
  @Get('rastreo/:codigo')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  rastreo(@Param() params: RastreoParamsDto) {
    return this.pedidosService.rastreo(params.codigo);
  }

  @Get(':id/archivo')
  @UseGuards(AuthGuard)
  async download(@Param('id', ParseUUIDPipe) id: string) {
    return this.stream(await this.pedidosService.getDownload(id, 'archivo'));
  }

  @Get(':id/comprobante')
  @UseGuards(AuthGuard)
  async downloadComprobante(@Param('id', ParseUUIDPipe) id: string) {
    return this.stream(await this.pedidosService.getDownload(id, 'comprobante'));
  }

  @Patch(':id/estado')
  @UseGuards(AuthGuard)
  updateEstado(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstadoDto) {
    return this.pedidosService.updateEstado(id, dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.pedidosService.getById(id);
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'archivo', maxCount: 1 },
        { name: 'comprobante', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: MAX_ARCHIVO_BYTES, files: 2 },
        fileFilter: (_request, file, callback) => {
          const campo = file.fieldname as CampoArchivo;
          if (!extensionYMimePermitidos(campo, file.originalname, file.mimetype)) {
            callback(
              new BadRequestException(
                campo === 'archivo'
                  ? 'Solo se aceptan archivos PDF, Word o Excel.'
                  : 'El comprobante debe ser una imagen JPG, PNG o WEBP, o un PDF.',
              ),
              false,
            );
            return;
          }
          callback(null, true);
        },
      },
    ),
  )
  create(@UploadedFiles() files: ArchivosSubidos, @Body() createPedidoDto: CreatePedidoDto) {
    const archivo = files?.archivo?.[0];
    const comprobante = files?.comprobante?.[0];
    if (!archivo) {
      throw new BadRequestException('El archivo es obligatorio.');
    }
    if (!contenidoValido('archivo', archivo.originalname, archivo.buffer)) {
      throw new BadRequestException('El contenido del archivo no coincide con su tipo.');
    }
    if (comprobante) {
      if (createPedidoDto.metodoPago !== 'NEQUI') {
        throw new BadRequestException('El comprobante solo aplica para pagos con Nequi.');
      }
      if (comprobante.size > MAX_COMPROBANTE_BYTES) {
        throw new BadRequestException('El comprobante no puede superar los 5 MB.');
      }
      if (!contenidoValido('comprobante', comprobante.originalname, comprobante.buffer)) {
        throw new BadRequestException('El contenido del comprobante no coincide con su tipo.');
      }
    }
    if (createPedidoDto.metodoPago !== 'NEQUI') {
      createPedidoDto.referenciaNequi = undefined;
    }
    return this.pedidosService.create(createPedidoDto, archivo, comprobante);
  }

  private stream(file: { filePath: string; filename: string; contentType: string }) {
    return new StreamableFile(createReadStream(file.filePath), {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
