import { analizarPdf, type AnalisisPdf, type Inflar } from '../compartido/pdf-analisis';

/**
 * Descomprime FlateDecode con la API nativa del navegador (sin dependencias).
 * Si el flujo trae bytes de relleno o viene truncado, devuelve lo que alcanzó a
 * descomprimir, igual que el servidor con Z_SYNC_FLUSH.
 */
export const inflarNavegador: Inflar = async (datos) => {
  const flujo = new DecompressionStream('deflate');
  const escritor = flujo.writable.getWriter();
  escritor.write(new Uint8Array(datos)).catch(() => undefined);
  escritor.close().catch(() => undefined);

  const lector = flujo.readable.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      partes.push(value);
      total += value.length;
    }
  } catch (error) {
    if (total === 0) throw error;
  }
  const salida = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
};

export const puedeAnalizarPdf = () => typeof DecompressionStream !== 'undefined';

export async function analizarArchivoPdf(archivo: File): Promise<AnalisisPdf> {
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  return analizarPdf(bytes, inflarNavegador);
}
