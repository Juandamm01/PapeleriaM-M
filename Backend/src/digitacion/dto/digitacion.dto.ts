import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoDigitacion } from '@prisma/client';

export const TIPOS_TRABAJO = [
  'Trabajo escolar o universitario',
  'Hoja de vida',
  'Carta o documento formal',
  'Tabla o cuadro en Excel',
  'Transcripción de manuscrito',
  'Otro',
] as const;

export const FORMATOS_ENTREGA = ['Impreso', 'Archivo Word', 'Archivo PDF', 'Impreso y archivo digital'] as const;

const texto = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);

export class CrearDigitacionDto {
  @Transform(texto)
  @IsString()
  @MinLength(2, { message: 'Escribe tu nombre.' })
  @MaxLength(100)
  nombre!: string;

  @Transform(({ value }) => {
    const t = texto({ value });
    if (!t) return undefined;
    const d = t.replace(/\D/g, '');
    return d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
  })
  @IsOptional()
  @Matches(/^3\d{9}$/, { message: 'El celular debe tener 10 dígitos y empezar por 3.' })
  telefono?: string;

  @Transform(texto)
  @IsOptional()
  @IsEmail({}, { message: 'Escribe un correo electrónico válido.' })
  @MaxLength(160)
  correo?: string;

  @IsIn(TIPOS_TRABAJO, { message: 'Elige el tipo de trabajo.' })
  tipoTrabajo!: string;

  @Transform(texto)
  @IsString()
  @MinLength(10, { message: 'Cuéntanos con un poco más de detalle qué necesitas (mínimo 10 caracteres).' })
  @MaxLength(2000, { message: 'La descripción no puede superar 2000 caracteres.' })
  descripcion!: string;

  @Transform(texto)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Las páginas aproximadas deben ser un número entero.' })
  @Min(1)
  @Max(1000, { message: 'Para más de 1000 páginas escríbenos por WhatsApp.' })
  paginasAprox?: number;

  @IsIn(FORMATOS_ENTREGA, { message: 'Elige cómo quieres recibir el trabajo.' })
  formatoEntrega!: string;

  @Transform(texto)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha límite no es válida.' })
  fechaLimite?: string;

  @Transform(texto)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las observaciones no pueden superar 500 caracteres.' })
  observaciones?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, { message: 'Debes aceptar la política de tratamiento de datos personales.' })
  aceptaPolitica!: boolean;
}

export class CodigoDigitacionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^DG-[A-Z0-9]{6}$/, { message: 'El código tiene el formato DG-XXXXXX.' })
  codigo!: string;
}

export class ListarDigitacionDto {
  @IsOptional()
  @IsEnum(EstadoDigitacion)
  estado?: EstadoDigitacion;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}

export class ActualizarDigitacionDto {
  @IsOptional()
  @IsEnum(EstadoDigitacion, { message: 'Estado no válido.' })
  estado?: EstadoDigitacion;

  /** Precio total en pesos. null lo borra. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El precio debe ser un número entero de pesos.' })
  @Min(100, { message: 'El precio mínimo es $100.' })
  @Max(10_000_000)
  precio?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La nota no puede superar 500 caracteres.' })
  notaCliente?: string;
}
