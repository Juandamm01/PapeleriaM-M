import { Transform, Type } from 'class-transformer';
import { EstadoPedido } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListPedidosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @IsOptional()
  @IsEnum(EstadoPedido)
  estado?: EstadoPedido;

  /** Busca por código, nombre o teléfono */
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
