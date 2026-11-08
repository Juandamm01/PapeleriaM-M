import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { contenidoValido, extensionYMimePermitidos } from '../pedidos/archivos';
import {
  ActualizarDigitacionDto,
  CodigoDigitacionDto,
  CrearDigitacionDto,
  ListarDigitacionDto,
} from './dto/digitacion.dto';
import { DigitacionService } from './digitacion.service';

const MAX_ARCHIVOS = 3;
const MAX_BYTES = 10 * 1024 * 1024;

@Controller('digitacion')
export class DigitacionController {
  constructor(private readonly digitacion: DigitacionService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @UseInterceptors(
    FilesInterceptor('archivos', MAX_ARCHIVOS, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_BYTES, files: MAX_ARCHIVOS },
      fileFilter: (_req, file, callback) => {
        if (!extensionYMimePermitidos('referencia', file.originalname, file.mimetype)) {
          callback(new BadRequestException('Los archivos de referencia pueden ser PDF, Word, Excel o fotos (JPG, PNG, WEBP).'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  crear(@UploadedFiles() archivos: Express.Multer.File[] = [], @Body() dto: CrearDigitacionDto) {
    for (const archivo of archivos) {
      if (!contenidoValido('referencia', archivo.originalname, archivo.buffer)) {
        throw new BadRequestException(`El contenido de "${archivo.originalname.slice(0, 60)}" no coincide con su tipo.`);
      }
    }
    return this.digitacion.crear(dto, archivos);
  }

  @Get()
  @UseGuards(AuthGuard)
  listar(@Query() query: ListarDigitacionDto) {
    return this.digitacion.listar(query.estado, query.page);
  }

  @Get('seguimiento/:codigo')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  consultar(@Param() params: CodigoDigitacionDto) {
    return this.digitacion.consultar(params.codigo);
  }

  @Post('seguimiento/:codigo/aceptar')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  aceptar(@Param() params: CodigoDigitacionDto) {
    return this.digitacion.aceptar(params.codigo);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarDigitacionDto) {
    return this.digitacion.actualizar(id, dto);
  }

  @Get(':id/archivos/:indice')
  @UseGuards(AuthGuard)
  async descargar(@Param('id', ParseUUIDPipe) id: string, @Param('indice', ParseIntPipe) indice: number) {
    const archivo = await this.digitacion.archivo(id, indice);
    return new StreamableFile(createReadStream(archivo.filePath), {
      type: archivo.contentType,
      disposition: `attachment; filename="${archivo.filename}"`,
    });
  }
}
