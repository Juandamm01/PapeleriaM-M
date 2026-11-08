/**
 * Cálculo del precio de una impresión, compartido entre frontend y backend.
 * Copia idéntica en Frontend/src/compartido y Backend/src/compartido.
 * El frontend lo usa para mostrar la cotización en vivo; el valor que se cobra
 * siempre lo recalcula el backend con las tarifas guardadas.
 * Todos los valores van en pesos colombianos enteros.
 */

export type Tarifas = {
  /** Precio por cara impresa en blanco y negro, tamaño carta. null = sin configurar */
  precioPaginaBn: number | null;
  /** Precio por cara impresa a color, tamaño carta. null = sin configurar */
  precioPaginaColor: number | null;
  /** Valor adicional por cara impresa en tamaño oficio */
  recargoOficio: number;
  /** Valor fijo que se suma a cada pedido (0 si no aplica) */
  cargoFijo: number;
  /** Descuentos por volumen según el total de caras impresas (páginas × copias) */
  descuentos: { desdePaginas: number; porcentaje: number }[];
  /** Máximo de caras impresas por pedido en línea */
  limitePaginasPedido: number;
};

export const TARIFAS_VACIAS: Tarifas = {
  precioPaginaBn: null,
  precioPaginaColor: null,
  recargoOficio: 0,
  cargoFijo: 0,
  descuentos: [],
  limitePaginasPedido: 300,
};

export type SolicitudCotizacion = {
  paginasBn: number;
  paginasColor: number;
  copias: number;
  tamano: 'CARTA' | 'OFICIO';
};

export type LineaCotizacion = { concepto: string; cantidad: number; unitario: number; subtotal: number };

export type Cotizacion =
  | {
      ok: true;
      lineas: LineaCotizacion[];
      carasImpresas: number;
      subtotal: number;
      descuento: { porcentaje: number; valor: number } | null;
      total: number;
    }
  | { ok: false; motivo: 'sin-tarifa' | 'limite' | 'invalida'; mensaje: string };

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function cotizar(tarifas: Tarifas, solicitud: SolicitudCotizacion): Cotizacion {
  const { paginasBn, paginasColor, copias, tamano } = solicitud;
  const enteros = [paginasBn, paginasColor, copias].every((n) => Number.isInteger(n) && n >= 0);
  if (!enteros || copias < 1 || paginasBn + paginasColor < 1) {
    return { ok: false, motivo: 'invalida', mensaje: 'Revisa las páginas y las copias.' };
  }
  const carasImpresas = (paginasBn + paginasColor) * copias;
  if (carasImpresas > tarifas.limitePaginasPedido) {
    return {
      ok: false,
      motivo: 'limite',
      mensaje: `Los pedidos en línea pueden tener hasta ${tarifas.limitePaginasPedido} páginas impresas (páginas × copias) y este tiene ${carasImpresas}. Reduce la selección o escríbenos por WhatsApp.`,
    };
  }

  if ((paginasBn > 0 && tarifas.precioPaginaBn === null) || (paginasColor > 0 && tarifas.precioPaginaColor === null)) {
    return {
      ok: false,
      motivo: 'sin-tarifa',
      mensaje: 'Todavía no tenemos tarifa en línea para esta impresión. Te confirmaremos el valor al revisar tu archivo.',
    };
  }

  const lineas: LineaCotizacion[] = [];
  if (paginasBn > 0 && tarifas.precioPaginaBn !== null) {
    const cantidad = paginasBn * copias;
    lineas.push({ concepto: 'Páginas en blanco y negro', cantidad, unitario: tarifas.precioPaginaBn, subtotal: cantidad * tarifas.precioPaginaBn });
  }
  if (paginasColor > 0 && tarifas.precioPaginaColor !== null) {
    const cantidad = paginasColor * copias;
    lineas.push({ concepto: 'Páginas a color', cantidad, unitario: tarifas.precioPaginaColor, subtotal: cantidad * tarifas.precioPaginaColor });
  }
  if (tamano === 'OFICIO' && tarifas.recargoOficio > 0) {
    lineas.push({ concepto: 'Recargo tamaño oficio', cantidad: carasImpresas, unitario: tarifas.recargoOficio, subtotal: carasImpresas * tarifas.recargoOficio });
  }

  const impresion = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  const aplicable = [...tarifas.descuentos]
    .filter((d) => carasImpresas >= d.desdePaginas && d.porcentaje > 0)
    .sort((a, b) => b.desdePaginas - a.desdePaginas)[0];
  const descuento = aplicable
    ? { porcentaje: aplicable.porcentaje, valor: Math.round((impresion * aplicable.porcentaje) / 100) }
    : null;

  if (tarifas.cargoFijo > 0) {
    lineas.push({ concepto: 'Cargo por pedido', cantidad: 1, unitario: tarifas.cargoFijo, subtotal: tarifas.cargoFijo });
  }
  const subtotal = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  const total = Math.max(0, subtotal - (descuento?.valor ?? 0));
  return { ok: true, lineas, carasImpresas, subtotal, descuento, total };
}

/** Texto corto de una tarifa para mostrar al cliente, p. ej. "$200 por página". */
export const textoTarifa = (valor: number | null) => (valor === null ? 'Por confirmar' : `${pesos(valor)} por página`);

/** Valida tarifas recibidas (desde el admin). Devuelve un mensaje de error o null. */
export function validarTarifas(t: Tarifas): string | null {
  const precio = (v: number | null) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100_000);
  if (!precio(t.precioPaginaBn) || !precio(t.precioPaginaColor)) return 'Los precios por página deben ser enteros entre $0 y $100.000.';
  if (!Number.isInteger(t.recargoOficio) || t.recargoOficio < 0 || t.recargoOficio > 100_000) return 'El recargo de oficio no es válido.';
  if (!Number.isInteger(t.cargoFijo) || t.cargoFijo < 0 || t.cargoFijo > 1_000_000) return 'El cargo por pedido no es válido.';
  if (!Number.isInteger(t.limitePaginasPedido) || t.limitePaginasPedido < 1 || t.limitePaginasPedido > 5000) {
    return 'El límite de páginas debe estar entre 1 y 5000.';
  }
  if (t.descuentos.length > 10) return 'Puedes tener hasta 10 descuentos por volumen.';
  for (const d of t.descuentos) {
    if (!Number.isInteger(d.desdePaginas) || d.desdePaginas < 1 || !Number.isInteger(d.porcentaje) || d.porcentaje < 1 || d.porcentaje > 90) {
      return 'Cada descuento necesita un mínimo de páginas (desde 1) y un porcentaje entre 1 y 90.';
    }
  }
  return null;
}
