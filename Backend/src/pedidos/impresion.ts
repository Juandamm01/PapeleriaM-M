import { BadRequestException } from '@nestjs/common';
import { Prisma, TipoImpresion } from '@prisma/client';
import { promisify } from 'util';
import { constants, inflate } from 'zlib';
import { analizarPdf } from '../compartido/pdf-analisis';
import { cotizar, Tarifas } from '../compartido/precios';
import { parsearRangos } from '../compartido/rangos';

const inflarAsync = promisify(inflate);
// Tolera flujos con bytes de relleno al final, comunes en PDFs generados por algunos programas
const inflar = async (datos: Uint8Array) =>
  new Uint8Array(await inflarAsync(datos, { finishFlush: constants.Z_SYNC_FLUSH }));

export const MAX_NOTAS_PAGINA = 10;
const PATRON_RANGOS = /^[\d\s,;\-–—]{1,300}$/;

export type NotaPagina = { paginas: string; nota: string };

/** Interpreta el JSON de notas por página que llega en el formulario. */
export function leerNotasPaginas(valor: unknown): NotaPagina[] {
  if (valor === undefined || valor === null || valor === '') return [];
  let datos: unknown = valor;
  if (typeof valor === 'string') {
    try {
      datos = JSON.parse(valor);
    } catch {
      throw new BadRequestException('Las notas por página no son válidas.');
    }
  }
  if (!Array.isArray(datos)) throw new BadRequestException('Las notas por página no son válidas.');
  if (datos.length > MAX_NOTAS_PAGINA) {
    throw new BadRequestException(`Puedes agregar hasta ${MAX_NOTAS_PAGINA} notas por página.`);
  }
  return datos.map((fila) => {
    const f = (fila ?? {}) as Record<string, unknown>;
    const paginas = typeof f.paginas === 'string' ? f.paginas.trim() : '';
    const nota = typeof f.nota === 'string' ? f.nota.trim() : '';
    if (!PATRON_RANGOS.test(paginas)) throw new BadRequestException('Cada nota necesita las páginas a las que aplica, por ejemplo "3" o "5-7".');
    if (nota.length < 1 || nota.length > 200) throw new BadRequestException('Cada nota debe tener entre 1 y 200 caracteres.');
    return { paginas, nota };
  });
}

export type DatosImpresion = {
  tipoImpresion: TipoImpresion;
  paginasDocumento: number | null;
  paginasSeleccion: string | null;
  paginasImprimir: number | null;
  paginasColor: string | null;
  notasPaginas: Prisma.InputJsonValue | undefined;
  cotizacion: Prisma.InputJsonValue | undefined;
  precioCentavos: number | null;
  precioAutomatico: boolean;
};

type Entrada = {
  tipoImpresion: TipoImpresion;
  copias: number;
  tamano: 'CARTA' | 'OFICIO';
  paginas?: string;
  paginasColor?: string;
  notasPaginas?: unknown;
};

/**
 * Calcula en el servidor las páginas a imprimir y el precio. Nunca usa conteos ni precios
 * enviados por el navegador: lee el PDF otra vez y aplica las tarifas guardadas.
 */
export async function prepararImpresion(
  entrada: Entrada,
  archivo: Express.Multer.File,
  tarifas: Tarifas,
): Promise<DatosImpresion> {
  const notas = leerNotasPaginas(entrada.notasPaginas);
  const textoPaginas = entrada.paginas?.trim() ?? '';
  const textoColor = entrada.paginasColor?.trim() ?? '';
  if (textoPaginas && !PATRON_RANGOS.test(textoPaginas)) {
    throw new BadRequestException('Escribe las páginas como 1-5, 8, 10-12.');
  }
  if (entrada.tipoImpresion === TipoImpresion.MIXTO && !textoColor) {
    throw new BadRequestException('Indica qué páginas van a color.');
  }
  if (textoColor && !PATRON_RANGOS.test(textoColor)) {
    throw new BadRequestException('Escribe las páginas a color como 3 o 5-7.');
  }

  const analisis =
    archivo.mimetype === 'application/pdf'
      ? await analizarPdf(new Uint8Array(archivo.buffer.buffer, archivo.buffer.byteOffset, archivo.buffer.byteLength), inflar)
      : null;

  // Sin PDF legible (Word, Excel, PDF cifrado): se guarda lo que indicó el cliente y el admin fija el precio
  if (!analisis || !analisis.ok) {
    return {
      tipoImpresion: entrada.tipoImpresion,
      paginasDocumento: null,
      paginasSeleccion: textoPaginas || null,
      paginasImprimir: null,
      paginasColor: entrada.tipoImpresion === TipoImpresion.MIXTO ? textoColor : null,
      notasPaginas: notas.length > 0 ? notas : undefined,
      cotizacion: undefined,
      precioCentavos: null,
      precioAutomatico: false,
    };
  }

  const total = analisis.totalPaginas;
  const seleccion = parsearRangos(textoPaginas, total);
  if (!seleccion.ok) throw new BadRequestException(seleccion.error);
  const elegidas = new Set(seleccion.paginas);

  let color: number[] = [];
  let normalizadoColor: string | null = null;
  if (entrada.tipoImpresion === TipoImpresion.COLOR) color = seleccion.paginas;
  if (entrada.tipoImpresion === TipoImpresion.MIXTO) {
    const enColor = parsearRangos(textoColor, total);
    if (!enColor.ok) throw new BadRequestException(enColor.error);
    const fuera = enColor.paginas.filter((p) => !elegidas.has(p));
    if (fuera.length > 0) {
      throw new BadRequestException(
        `La página ${fuera[0]} está marcada a color pero no está entre las páginas que vas a imprimir.`,
      );
    }
    color = enColor.paginas;
    normalizadoColor = enColor.normalizado;
  }

  const notasNormalizadas: NotaPagina[] = [];
  for (const nota of notas) {
    const rango = parsearRangos(nota.paginas, total);
    if (!rango.ok) throw new BadRequestException(`Nota "${nota.nota.slice(0, 30)}": ${rango.error}`);
    notasNormalizadas.push({ paginas: rango.normalizado, nota: nota.nota });
  }

  // El límite se aplica siempre, haya o no tarifas configuradas
  const carasImpresas = seleccion.paginas.length * entrada.copias;
  if (carasImpresas > tarifas.limitePaginasPedido) {
    throw new BadRequestException(
      `Los pedidos en línea pueden tener hasta ${tarifas.limitePaginasPedido} páginas impresas (páginas × copias) y este tiene ${carasImpresas}. Reduce la selección o escríbenos por WhatsApp.`,
    );
  }

  const cotizacion = cotizar(tarifas, {
    paginasBn: seleccion.paginas.length - color.length,
    paginasColor: color.length,
    copias: entrada.copias,
    tamano: entrada.tamano,
  });
  if (!cotizacion.ok && cotizacion.motivo !== 'sin-tarifa') throw new BadRequestException(cotizacion.mensaje);

  return {
    tipoImpresion: entrada.tipoImpresion,
    paginasDocumento: total,
    paginasSeleccion: seleccion.normalizado,
    paginasImprimir: seleccion.paginas.length,
    paginasColor: normalizadoColor,
    notasPaginas: notasNormalizadas.length > 0 ? notasNormalizadas : undefined,
    cotizacion: cotizacion.ok ? (cotizacion as unknown as Prisma.InputJsonValue) : undefined,
    precioCentavos: cotizacion.ok ? cotizacion.total * 100 : null,
    precioAutomatico: cotizacion.ok,
  };
}
