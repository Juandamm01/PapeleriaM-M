import { readFileSync } from 'fs';
import { join } from 'path';
import { DocumentoPdf } from './pdf-simple';

export type LineaRecibo = { concepto: string; cantidad: number; unitario: number; subtotal: number };

export type DatosRecibo = {
  codigo: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  creado: Date;
  pagado: Date;
  descripcion: string;
  detallePaginas: string | null;
  lineas: LineaRecibo[];
  descuento: { porcentaje: number; valor: number } | null;
  total: number;
  metodo: string;
  referenciaPago: string | null;
};

const ROSA: [number, number, number] = [255, 27, 141];
const CIAN: [number, number, number] = [27, 197, 255];
const TINTA: [number, number, number] = [37, 44, 64];
const GRIS: [number, number, number] = [104, 112, 131];
const FONDO: [number, number, number] = [245, 249, 252];

let logo: Buffer | null | undefined;
function cargarLogo() {
  if (logo === undefined) {
    try {
      logo = readFileSync(join(process.cwd(), 'assets', 'logo-recibo.jpg'));
    } catch {
      logo = null;
    }
  }
  return logo;
}

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const fechaHora = (d: Date) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(d);

export const ocultarCorreo = (correo: string) => {
  const [usuario, dominio] = correo.split('@');
  if (!dominio) return '***';
  return `${usuario.slice(0, 1)}***@${dominio}`;
};
export const ocultarTelefono = (telefono: string) => `*** *** ${telefono.slice(-4)}`;

/** Dibuja el recibo de un pedido pagado y devuelve el PDF. */
export function generarRecibo(datos: DatosRecibo): Buffer {
  const doc = new DocumentoPdf(`Recibo ${datos.codigo}`);
  const M = 56;
  const ANCHO = DocumentoPdf.ANCHO - 2 * M;
  const DER = DocumentoPdf.ANCHO - M;

  // Encabezado
  const imagen = cargarLogo();
  const conLogo = imagen ? doc.imagenJpeg(imagen, M, 48, 132) : false;
  if (!conLogo) doc.texto(M, 80, 'Papelería M&M', { tam: 20, negrita: true, color: ROSA });
  doc.texto(DER, 70, 'Recibo de pago', { tam: 22, negrita: true, alinear: 'der' });
  doc.texto(DER, 90, `Pedido ${datos.codigo}`, { tam: 11, color: GRIS, alinear: 'der' });
  doc.texto(DER, 106, `Pagado el ${fechaHora(datos.pagado)}`, { tam: 9.5, color: GRIS, alinear: 'der' });

  doc.rect(M, 128, ANCHO * 0.62, 3, ROSA);
  doc.rect(M + ANCHO * 0.62, 128, ANCHO * 0.38, 3, CIAN);

  // Negocio y cliente
  let y = 160;
  doc.texto(M, y, 'Internet Impre-Copias M&M', { tam: 11, negrita: true });
  doc.texto(M, y + 15, 'Fotocopias, impresiones y papelería', { tam: 9.5, color: GRIS });
  doc.texto(M, y + 29, 'WhatsApp 313 839 5365', { tam: 9.5, color: GRIS });

  const xCliente = M + ANCHO / 2 + 20;
  doc.texto(xCliente, y, 'Cliente', { tam: 11, negrita: true });
  doc.texto(xCliente, y + 15, datos.nombre.slice(0, 60), { tam: 9.5 });
  doc.texto(xCliente, y + 29, ocultarCorreo(datos.correo), { tam: 9.5, color: GRIS });
  if (datos.telefono) doc.texto(xCliente, y + 43, ocultarTelefono(datos.telefono), { tam: 9.5, color: GRIS });

  // Descripción del trabajo
  y = 240;
  doc.texto(M, y, 'Detalle del servicio', { tam: 11, negrita: true });
  y += 16;
  for (const linea of doc.partir(datos.descripcion, ANCHO, 9.5)) {
    doc.texto(M, y, linea, { tam: 9.5, color: GRIS });
    y += 13;
  }
  if (datos.detallePaginas) {
    for (const linea of doc.partir(datos.detallePaginas, ANCHO, 9.5)) {
      doc.texto(M, y, linea, { tam: 9.5, color: GRIS });
      y += 13;
    }
  }

  // Tabla de valores
  y += 12;
  const col = { cantidad: M + ANCHO * 0.56, unitario: M + ANCHO * 0.78, subtotal: DER };
  doc.rect(M, y - 12, ANCHO, 22, FONDO);
  doc.texto(M + 8, y + 3, 'Concepto', { tam: 9, negrita: true, color: GRIS });
  doc.texto(col.cantidad, y + 3, 'Cantidad', { tam: 9, negrita: true, color: GRIS, alinear: 'der' });
  doc.texto(col.unitario, y + 3, 'Valor unitario', { tam: 9, negrita: true, color: GRIS, alinear: 'der' });
  doc.texto(col.subtotal - 8, y + 3, 'Subtotal', { tam: 9, negrita: true, color: GRIS, alinear: 'der' });
  y += 30;
  for (const linea of datos.lineas.slice(0, 12)) {
    doc.texto(M + 8, y, linea.concepto.slice(0, 60), { tam: 10 });
    doc.texto(col.cantidad, y, String(linea.cantidad), { tam: 10, alinear: 'der' });
    doc.texto(col.unitario, y, pesos(linea.unitario), { tam: 10, alinear: 'der' });
    doc.texto(col.subtotal - 8, y, pesos(linea.subtotal), { tam: 10, alinear: 'der' });
    doc.linea(M, y + 9, DER, y + 9);
    y += 24;
  }

  // Totales
  y += 6;
  const xEtiqueta = M + ANCHO * 0.62;
  if (datos.descuento) {
    const subtotal = datos.lineas.reduce((s, l) => s + l.subtotal, 0);
    doc.texto(xEtiqueta, y, 'Subtotal', { tam: 10, color: GRIS });
    doc.texto(DER - 8, y, pesos(subtotal), { tam: 10, alinear: 'der' });
    y += 18;
    doc.texto(xEtiqueta, y, `Descuento por volumen (${datos.descuento.porcentaje} %)`, { tam: 10, color: GRIS });
    doc.texto(DER - 8, y, `−${pesos(datos.descuento.valor)}`.replace('−', '-'), { tam: 10, alinear: 'der' });
    y += 18;
  }
  doc.linea(xEtiqueta, y - 4, DER, y - 4, 1, TINTA);
  y += 14;
  doc.texto(xEtiqueta, y, 'Total pagado', { tam: 12, negrita: true });
  doc.texto(DER - 8, y, pesos(datos.total), { tam: 16, negrita: true, color: ROSA, alinear: 'der' });

  // Pago
  y += 40;
  doc.rect(M, y - 14, ANCHO, datos.referenciaPago ? 58 : 44, FONDO);
  doc.texto(M + 14, y + 2, 'Pago', { tam: 10, negrita: true });
  doc.texto(M + 90, y + 2, `${datos.metodo} · Estado: aprobado`, { tam: 10 });
  doc.texto(M + 90, y + 17, `Pedido recibido el ${fechaHora(datos.creado)}`, { tam: 9, color: GRIS });
  if (datos.referenciaPago) doc.texto(M + 90, y + 31, `Referencia: ${datos.referenciaPago.slice(0, 70)}`, { tam: 9, color: GRIS });

  // Pie
  const pie = DocumentoPdf.ALTO - 64;
  doc.linea(M, pie - 14, DER, pie - 14);
  doc.texto(M, pie, 'Este recibo confirma un pago registrado en nuestro sistema. No es una factura electrónica.', { tam: 8.5, color: GRIS });
  doc.texto(M, pie + 13, `Generado el ${fechaHora(new Date())}`, { tam: 8.5, color: GRIS });

  return doc.construir();
}
