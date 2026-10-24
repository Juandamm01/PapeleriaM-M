import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MetodoPago, TamanoPapel, TipoImpresion } from '@prisma/client';

const textoOpcional = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

export class CreatePedidoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre.' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres.' })
  nombre!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'Escribe un correo electrónico válido.' })
  @MaxLength(160)
  correo!: string;

  // Acepta "313 839 5365", "+57 3138395365", etc. y guarda solo los 10 dígitos
  @Transform(({ value }) => {
    const texto = textoOpcional({ value });
    if (!texto) return undefined;
    const digitos = texto.replace(/\D/g, '');
    return digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  })
  @IsOptional()
  @Matches(/^3\d{9}$/, { message: 'El teléfono debe ser un celular colombiano de 10 dígitos.' })
  telefono?: string;

  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden superar 500 caracteres.' })
  notas?: string;

  @Type(() => Number)
  @IsInt({ message: 'El número de copias debe ser un número entero.' })
  @Min(1, { message: 'Debes pedir al menos 1 copia.' })
  @Max(500, { message: 'El máximo por pedido en línea es 500 copias.' })
  copias: number = 1;

  @IsEnum(TamanoPapel, { message: 'Elige tamaño carta u oficio.' })
  tamano: TamanoPapel = TamanoPapel.CARTA;

  @IsEnum(TipoImpresion, { message: 'Elige blanco y negro o color.' })
  tipoImpresion: TipoImpresion = TipoImpresion.BN;

  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  dobleCara: boolean = false;

  @IsEnum(MetodoPago, { message: 'Elige un método de pago.' })
  metodoPago!: MetodoPago;

  // Ley 1581 de 2012: autorización previa, expresa e informada
  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, { message: 'Debes aceptar la política de tratamiento de datos personales.' })
  aceptaPolitica!: boolean;

  @Transform(textoOpcional)
  @IsOptional()
  @Matches(/^[A-Za-z0-9 -]{1,40}$/, {
    message: 'La referencia de Nequi solo puede tener letras, números y guiones (máx. 40).',
  })
  referenciaNequi?: string;
}
