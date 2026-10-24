import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CrearPagoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^MM-[A-Z0-9]{6}$/, { message: 'El código del pedido tiene el formato MM-XXXXXX.' })
  codigo!: string;

  // Celular Nequi: acepta espacios o +57 y guarda los 10 dígitos
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const digitos = value.replace(/\D/g, '');
    return digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  })
  @Matches(/^3\d{9}$/, { message: 'Escribe el celular de tu cuenta Nequi (10 dígitos).' })
  telefono!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  tokenAceptacion!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  tokenDatosPersonales!: string;
}

export class ReferenciaPagoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^MM-[A-Z0-9]{6}-\d{1,3}$/, { message: 'Referencia de pago inválida.' })
  referencia!: string;
}
