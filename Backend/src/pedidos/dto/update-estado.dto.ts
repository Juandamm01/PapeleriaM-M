import { IsEnum } from 'class-validator';
import { EstadoPedido } from '@prisma/client';

export class UpdateEstadoDto {
  @IsEnum(EstadoPedido)
  estado!: EstadoPedido;
}
