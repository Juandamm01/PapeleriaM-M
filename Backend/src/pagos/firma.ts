import { createHash, timingSafeEqual } from 'crypto';

const sha256 = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

/**
 * Firma de integridad de Wompi:
 * SHA-256 de referencia + monto en centavos + moneda + secreto de integridad.
 */
export function firmaDeIntegridad(
  referencia: string,
  montoCentavos: number,
  moneda: string,
  secretoIntegridad: string,
) {
  return sha256(`${referencia}${montoCentavos}${moneda}${secretoIntegridad}`);
}

export type EventoWompi = {
  event?: unknown;
  data?: unknown;
  signature?: { properties?: unknown; checksum?: unknown };
  timestamp?: unknown;
  sent_at?: unknown;
};

/** Lee un valor anidado de `data` a partir de una ruta como "transaction.id". */
function valorEnRuta(data: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((actual, clave) => {
    if (actual !== null && typeof actual === 'object' && clave in actual) {
      return (actual as Record<string, unknown>)[clave];
    }
    return undefined;
  }, data);
}

function iguales(a: string, b: string) {
  const ba = Buffer.from(a.toLowerCase(), 'utf8');
  const bb = Buffer.from(b.toLowerCase(), 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Verifica la firma de un evento de Wompi:
 * concatena los valores de `signature.properties` (leídos de `data`, en ese orden),
 * luego `timestamp` y el secreto de eventos; SHA-256; compara con el checksum recibido.
 * Nunca confía en el cuerpo si algo falta o no cuadra.
 */
export function eventoEsAutentico(
  evento: EventoWompi,
  secretoEventos: string,
  checksumCabecera?: string,
) {
  if (!secretoEventos) return false;
  const propiedades = evento.signature?.properties;
  const timestamp = evento.timestamp;
  const checksum =
    typeof checksumCabecera === 'string' && checksumCabecera
      ? checksumCabecera
      : evento.signature?.checksum;

  if (!Array.isArray(propiedades) || propiedades.length === 0) return false;
  if (typeof timestamp !== 'number' && typeof timestamp !== 'string') return false;
  if (typeof checksum !== 'string' || !/^[0-9a-f]{64}$/i.test(checksum)) return false;

  let concatenado = '';
  for (const ruta of propiedades) {
    if (typeof ruta !== 'string') return false;
    const valor = valorEnRuta(evento.data, ruta);
    if (valor === undefined || valor === null || typeof valor === 'object') return false;
    concatenado += String(valor);
  }

  return iguales(sha256(`${concatenado}${timestamp}${secretoEventos}`), checksum);
}
