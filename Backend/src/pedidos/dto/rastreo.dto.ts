import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class RastreoParamsDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^MM-[A-Z0-9]{6}$/, { message: 'El código tiene el formato MM-XXXXXX.' })
  codigo!: string;
}
