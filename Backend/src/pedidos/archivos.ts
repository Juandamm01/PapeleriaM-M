import { extname } from 'path';

export const MAX_ARCHIVO_BYTES = 15 * 1024 * 1024;
export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;

type Formato = 'pdf' | 'ooxml' | 'ole' | 'png' | 'jpg' | 'webp';

const archivoPermitido = new Map<string, { mimes: string[]; formato: Formato }>([
  ['.pdf', { mimes: ['application/pdf'], formato: 'pdf' }],
  ['.doc', { mimes: ['application/msword'], formato: 'ole' }],
  [
    '.docx',
    {
      mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      formato: 'ooxml',
    },
  ],
  ['.xls', { mimes: ['application/vnd.ms-excel'], formato: 'ole' }],
  [
    '.xlsx',
    {
      mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      formato: 'ooxml',
    },
  ],
]);

const comprobantePermitido = new Map<string, { mimes: string[]; formato: Formato }>([
  ['.jpg', { mimes: ['image/jpeg'], formato: 'jpg' }],
  ['.jpeg', { mimes: ['image/jpeg'], formato: 'jpg' }],
  ['.png', { mimes: ['image/png'], formato: 'png' }],
  ['.webp', { mimes: ['image/webp'], formato: 'webp' }],
  ['.pdf', { mimes: ['application/pdf'], formato: 'pdf' }],
]);

export type CampoArchivo = 'archivo' | 'comprobante';

function reglas(campo: CampoArchivo) {
  return campo === 'archivo' ? archivoPermitido : comprobantePermitido;
}

/** Primer filtro (antes de leer el contenido): extensión + MIME declarado por el navegador. */
export function extensionYMimePermitidos(
  campo: CampoArchivo,
  nombre: string,
  mime: string,
): boolean {
  const regla = reglas(campo).get(extname(nombre).toLowerCase());
  return Boolean(regla?.mimes.includes(mime));
}

function empiezaCon(buffer: Buffer, firma: number[]): boolean {
  return buffer.length >= firma.length && firma.every((byte, i) => buffer[i] === byte);
}

function coincideFormato(buffer: Buffer, formato: Formato): boolean {
  switch (formato) {
    case 'pdf':
      return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
    case 'ole':
      return empiezaCon(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'ooxml':
      // ZIP con [Content_Types].xml y sin macros (vbaProject.bin)
      return (
        empiezaCon(buffer, [0x50, 0x4b, 0x03, 0x04]) &&
        buffer.includes('[Content_Types].xml') &&
        !buffer.includes('vbaProject.bin')
      );
    case 'png':
      return empiezaCon(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'jpg':
      return empiezaCon(buffer, [0xff, 0xd8, 0xff]);
    case 'webp':
      return (
        buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
        buffer.subarray(8, 12).toString('latin1') === 'WEBP'
      );
  }
}

/** Segundo filtro: el contenido real (magic bytes) debe coincidir con la extensión. */
export function contenidoValido(campo: CampoArchivo, nombre: string, buffer: Buffer): boolean {
  const regla = reglas(campo).get(extname(nombre).toLowerCase());
  return Boolean(regla && coincideFormato(buffer, regla.formato));
}
