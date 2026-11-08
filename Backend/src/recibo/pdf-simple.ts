import { deflateSync } from 'zlib';

/** Generador mínimo de PDF de una página (Helvetica + una imagen JPEG), sin dependencias. */

type Color = [number, number, number];
type OpcionesTexto = { tam?: number; negrita?: boolean; color?: Color; alinear?: 'izq' | 'der' | 'centro' };

// Anchos (en milésimas de em) de Helvetica y Helvetica-Bold para los caracteres 32–126 (métricas AFM estándar)
const ANCHOS_REGULAR = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const ANCHOS_NEGRITA = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
  611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Caracteres fuera de Latin-1 que sí existen en WinAnsiEncoding
const WIN_ANSI: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '•': 0x95, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '™': 0x99 };

/** Convierte texto a bytes WinAnsi (como cadena latin1). Lo que no exista se reemplaza por "?". */
function winAnsi(texto: string) {
  let salida = '';
  for (const ch of texto.normalize('NFC')) {
    const codigo = ch.charCodeAt(0);
    if (WIN_ANSI[ch] !== undefined) salida += String.fromCharCode(WIN_ANSI[ch]);
    else if ((codigo >= 32 && codigo <= 126) || (codigo >= 160 && codigo <= 255)) salida += ch;
    else salida += '?';
  }
  return salida;
}

const escapar = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const num = (n: number) => (Math.round(n * 100) / 100).toString();
const color = ([r, g, b]: Color) => `${num(r / 255)} ${num(g / 255)} ${num(b / 255)}`;

/** Ancho de un carácter: acentuados y ñ usan el ancho de su letra base. */
function anchoCaracter(ch: string, negrita: boolean) {
  const base = ch.normalize('NFD')[0] ?? ch;
  const codigo = base.charCodeAt(0);
  const tabla = negrita ? ANCHOS_NEGRITA : ANCHOS_REGULAR;
  if (codigo >= 32 && codigo <= 126) return tabla[codigo - 32];
  if (ch === '—') return 1000;
  if (ch === '–' || ch === '•') return 556;
  return 556;
}

export function dimensionesJpeg(jpeg: Buffer): { ancho: number; alto: number; componentes: number } | null {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < jpeg.length) {
    if (jpeg[i] !== 0xff) return null;
    const marcador = jpeg[i + 1];
    const largo = jpeg.readUInt16BE(i + 2);
    if (marcador >= 0xc0 && marcador <= 0xc3) {
      return { alto: jpeg.readUInt16BE(i + 5), ancho: jpeg.readUInt16BE(i + 7), componentes: jpeg[i + 9] };
    }
    i += 2 + largo;
  }
  return null;
}

export class DocumentoPdf {
  static readonly ANCHO = 612;
  static readonly ALTO = 792;
  private readonly ops: string[] = [];
  private imagen?: { datos: Buffer; ancho: number; alto: number; componentes: number };

  constructor(private readonly titulo: string) {}

  anchoTexto(texto: string, tam: number, negrita = false) {
    let total = 0;
    for (const ch of texto) total += anchoCaracter(ch, negrita);
    return (total * tam) / 1000;
  }

  /** `y` se mide desde arriba de la página, como en una pantalla. */
  texto(x: number, y: number, texto: string, opciones: OpcionesTexto = {}) {
    const { tam = 10, negrita = false, color: c = [37, 44, 64], alinear = 'izq' } = opciones;
    const ancho = this.anchoTexto(texto, tam, negrita);
    const xReal = alinear === 'der' ? x - ancho : alinear === 'centro' ? x - ancho / 2 : x;
    this.ops.push(`BT /${negrita ? 'F2' : 'F1'} ${num(tam)} Tf ${color(c)} rg ${num(xReal)} ${num(DocumentoPdf.ALTO - y)} Td (${escapar(winAnsi(texto))}) Tj ET`);
  }

  /** Corta un texto en líneas que quepan en `ancho`. */
  partir(texto: string, ancho: number, tam: number, negrita = false) {
    const lineas: string[] = [];
    let actual = '';
    for (const palabra of texto.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (this.anchoTexto(prueba, tam, negrita) <= ancho || !actual) actual = prueba;
      else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  linea(x1: number, y1: number, x2: number, y2: number, grosor = 0.75, c: Color = [221, 227, 236]) {
    const A = DocumentoPdf.ALTO;
    this.ops.push(`${num(grosor)} w ${color(c)} RG ${num(x1)} ${num(A - y1)} m ${num(x2)} ${num(A - y2)} l S`);
  }

  rect(x: number, y: number, ancho: number, alto: number, relleno: Color) {
    this.ops.push(`${color(relleno)} rg ${num(x)} ${num(DocumentoPdf.ALTO - y - alto)} ${num(ancho)} ${num(alto)} re f`);
  }

  /** Inserta un JPEG tal cual (sin recodificar). Devuelve false si el archivo no es un JPEG válido. */
  imagenJpeg(jpeg: Buffer, x: number, y: number, ancho: number) {
    const dim = dimensionesJpeg(jpeg);
    if (!dim || ![1, 3].includes(dim.componentes)) return false;
    this.imagen = { datos: jpeg, ...dim };
    const alto = (ancho * dim.alto) / dim.ancho;
    this.ops.push(`q ${num(ancho)} 0 0 ${num(alto)} ${num(x)} ${num(DocumentoPdf.ALTO - y - alto)} cm /Im1 Do Q`);
    return true;
  }

  construir(): Buffer {
    const partes: Buffer[] = [];
    const desplazamientos: number[] = [];
    let largo = 0;
    const agregar = (b: Buffer | string) => {
      const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b;
      partes.push(buf);
      largo += buf.length;
    };
    const objeto = (n: number, cuerpo: string, stream?: Buffer) => {
      desplazamientos[n] = largo;
      agregar(`${n} 0 obj\n${cuerpo}\n`);
      if (stream) {
        agregar('stream\n');
        agregar(stream);
        agregar('\nendstream\n');
      }
      agregar('endobj\n');
    };

    const contenido = deflateSync(Buffer.from(this.ops.join('\n'), 'latin1'));
    const recursosImagen = this.imagen ? ' /XObject << /Im1 6 0 R >>' : '';
    agregar('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objeto(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objeto(
      3,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${DocumentoPdf.ANCHO} ${DocumentoPdf.ALTO}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${recursosImagen} >> /Contents 7 0 R >>`,
    );
    objeto(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objeto(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    if (this.imagen) {
      const { datos, ancho, alto, componentes } = this.imagen;
      objeto(
        6,
        `<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /${componentes === 1 ? 'DeviceGray' : 'DeviceRGB'} /BitsPerComponent 8 /Filter /DCTDecode /Length ${datos.length} >>`,
        datos,
      );
    } else {
      objeto(6, 'null');
    }
    objeto(7, `<< /Length ${contenido.length} /Filter /FlateDecode >>`, contenido);
    const fecha = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    objeto(8, `<< /Title (${escapar(winAnsi(this.titulo))}) /Producer (Papeleria M&M) /CreationDate (D:${fecha}Z) >>`);

    const inicioXref = largo;
    let xref = `xref\n0 9\n0000000000 65535 f \n`;
    for (let n = 1; n <= 8; n++) xref += `${String(desplazamientos[n]).padStart(10, '0')} 00000 n \n`;
    agregar(xref);
    agregar(`trailer\n<< /Size 9 /Root 1 0 R /Info 8 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);
    return Buffer.concat(partes);
  }
}
