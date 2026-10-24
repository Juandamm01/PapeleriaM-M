import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class PrecioDto {
  /** Valor total del pedido en pesos colombianos (sin centavos). */
  @Type(() => Number)
  @IsInt({ message: 'El precio debe ser un número entero de pesos.' })
  @Min(100, { message: 'El precio mínimo es $100.' })
  @Max(10_000_000, { message: 'El precio no puede superar $10.000.000.' })
  precio!: number;
}

export class PagoManualDto {
  @IsBoolean()
  pagado!: boolean;
}

export class ResumenDto {
  /** Día a resumir en hora de Colombia, YYYY-MM-DD. Por defecto, hoy. */
  @Transform(({ value }) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined))
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha tiene el formato AAAA-MM-DD.' })
  fecha?: string;
}
