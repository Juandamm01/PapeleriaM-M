// Reglas de archivos y datos del pedido (las mismas que valida el servidor).

export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_COMPROBANTE_SIZE = 5 * 1024 * 1024;
export const MAX_COPIAS = 500;
export const MAX_NOTAS_PAGINA = 10;

const archivoPermitido: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

const comprobantePermitido: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
};

export const extension = (name: string) => `.${name.split('.').pop()?.toLowerCase() ?? ''}`;

const tipoValido = (file: File, reglas: Record<string, string[]>) => {
  const mimes = reglas[extension(file.name)];
  return Boolean(mimes) && (!file.type || mimes.includes(file.type));
};

export const esPdf = (file: File) => extension(file.name) === '.pdf';

export const getFileError = (file: File | null) => {
  if (!file) return 'Selecciona un archivo para continuar.';
  if (!tipoValido(file, archivoPermitido)) {
    return 'Solo se aceptan archivos PDF, Word (.doc/.docx) o Excel (.xls/.xlsx).';
  }
  if (file.size > MAX_FILE_SIZE) return 'El archivo no puede superar los 15 MB.';
  return '';
};

export const getComprobanteError = (file: File | null) => {
  if (!file) return '';
  if (!tipoValido(file, comprobantePermitido)) {
    return 'El comprobante debe ser una imagen JPG, PNG o WEBP, o un PDF.';
  }
  if (file.size > MAX_COMPROBANTE_SIZE) return 'El comprobante no puede superar los 5 MB.';
  return '';
};

/** Devuelve los 10 dígitos del celular, '' si está vacío o null si no es válido. */
export const normalizarTelefono = (valor: string) => {
  const digitos = valor.replace(/\D/g, '');
  if (!digitos) return '';
  const local = digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  return /^3\d{9}$/.test(local) ? local : null;
};

export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

/** Mismo patrón que el servidor para textos de rangos ("1-5, 8"). */
export const PATRON_RANGOS = /^[\d\s,;\-–—]{1,300}$/;

export const formatoMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
