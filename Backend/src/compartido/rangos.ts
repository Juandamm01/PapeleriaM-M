/**
 * Selección de páginas por rangos ("1-5, 8, 10-12"), compartida entre frontend y backend.
 * Copia idéntica en Frontend/src/compartido y Backend/src/compartido.
 */

export type ResultadoRangos =
  | { ok: true; paginas: number[]; normalizado: string; habiaRepetidas: boolean }
  | { ok: false; error: string };

const MAX_SEGMENTOS = 200;

/**
 * Interpreta un texto de rangos. Vacío o "todas" = todas las páginas.
 * Acepta comas, punto y coma o espacios entre segmentos, y guion o raya en los rangos.
 */
export function parsearRangos(texto: string, totalPaginas: number): ResultadoRangos {
  if (!Number.isInteger(totalPaginas) || totalPaginas < 1) {
    return { ok: false, error: 'No sabemos cuántas páginas tiene el documento.' };
  }
  const limpio = texto.trim().toLowerCase();
  if (limpio === '' || limpio === 'todas' || limpio === 'todo') {
    const paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);
    return { ok: true, paginas, normalizado: formatearRangos(paginas), habiaRepetidas: false };
  }

  const segmentos = limpio
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .split(/[\s,;]+/)
    .filter(Boolean);
  if (segmentos.length > MAX_SEGMENTOS) {
    return { ok: false, error: 'Escribiste demasiados rangos. Agrupa las páginas, por ejemplo "1-20".' };
  }

  const elegidas = new Set<number>();
  let habiaRepetidas = false;
  for (const segmento of segmentos) {
    const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(segmento);
    if (!m) {
      return { ok: false, error: `"${segmento}" no es un número de página ni un rango. Usa algo como 1-5, 8, 10-12.` };
    }
    const desde = Number(m[1]);
    const hasta = m[2] === undefined ? desde : Number(m[2]);
    if (desde < 1 || hasta < 1) return { ok: false, error: 'Las páginas empiezan en 1.' };
    if (hasta < desde) {
      return { ok: false, error: `El rango ${desde}-${hasta} está al revés. Escríbelo como ${hasta}-${desde}.` };
    }
    if (hasta > totalPaginas) {
      return {
        ok: false,
        error:
          totalPaginas === 1
            ? `El documento tiene solo 1 página; la ${hasta} no existe.`
            : `El documento tiene ${totalPaginas} páginas; la ${hasta} no existe.`,
      };
    }
    for (let p = desde; p <= hasta; p++) {
      if (elegidas.has(p)) habiaRepetidas = true;
      elegidas.add(p);
    }
  }
  const paginas = [...elegidas].sort((a, b) => a - b);
  return { ok: true, paginas, normalizado: formatearRangos(paginas), habiaRepetidas };
}

/** [1, 2, 3, 5, 7, 8] → "1-3, 5, 7-8" */
export function formatearRangos(paginas: number[]): string {
  const ordenadas = [...new Set(paginas)].sort((a, b) => a - b);
  const partes: string[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    let j = i;
    while (j + 1 < ordenadas.length && ordenadas[j + 1] === ordenadas[j] + 1) j++;
    partes.push(i === j ? String(ordenadas[i]) : `${ordenadas[i]}-${ordenadas[j]}`);
    i = j;
  }
  return partes.join(', ');
}
