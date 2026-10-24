import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { ListPedidosDto } from './dto/list-pedidos.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { PedidosService } from './pedidos.service';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const allowedTypes = new Map([
  ['.pdf', ['application/pdf']],
  ['.doc', ['application/msword']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['.xls', ['application/vnd.ms-excel']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
]);

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Query() query: ListPedidosDto) {
    return this.pedidosService.list(query);
  }

  @Get(':id/archivo')
  @UseGuards(AuthGuard)
  async download(@Param('id', ParseUUIDPipe) id: string) {
    const file = await this.pedidosService.getDownload(id);
    return new StreamableFile(createReadStream(file.filePath), {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Patch(':id/estado')
  @UseGuards(AuthGuard)
  updateEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.pedidosService.updateEstado(id, dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.pedidosService.getById(id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_request, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const mimeTypes = allowedTypes.get(extension);
        if (!mimeTypes?.includes(file.mimetype)) {
          callback(new BadRequestException('Tipo de archivo no permitido'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  create(@UploadedFile() file: Express.Multer.File, @Body() createPedidoDto: CreatePedidoDto) {
    if (!file) {
      throw new BadRequestException('El archivo es obligatorio');
    }
    return this.pedidosService.create(createPedidoDto, file);
  }
}
