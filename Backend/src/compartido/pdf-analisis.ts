/**
 * Lector mínimo de PDF, sin dependencias, compartido entre frontend y backend.
 * Copia idéntica en Frontend/src/compartido y Backend/src/compartido: si cambias una, cambia la otra.
 *
 * Obtiene el número de páginas, el tamaño y la orientación de cada una, y marca las páginas
 * que *posiblemente* están en blanco (sin texto, imágenes ni trazos en su contenido).
 * Es una heurística: no reemplaza revisar el documento.
 */

export type Inflar = (datos: Uint8Array) => Promise<Uint8Array>;

export type PaginaPdf = {
  numero: number;
  /** Ancho y alto en puntos (1/72 de pulgada), ya aplicando la rotación de la página */
  ancho: number;
  alto: number;
  rotacion: number;
  /** true: no se encontró nada dibujado; false: tiene contenido; null: no se pudo revisar */
  posiblementeEnBlanco: boolean | null;
};

export type AnalisisPdf =
  | { ok: true; totalPaginas: number; paginas: PaginaPdf[]; detalleCompleto: boolean }
  | { ok: false; motivo: 'no-es-pdf' | 'cifrado' | 'ilegible'; mensaje: string };

type Nombre = { t: 'n'; v: string };
type Ref = { t: 'r'; n: number; g: number };
type Dict = { t: 'd'; v: Record<string, Valor> };
type Cadena = { t: 's' };
type Valor = number | boolean | null | Nombre | Ref | Dict | Cadena | Valor[];

type Objeto = { valor: Valor; inicioStream?: number; finStream?: number };

const MAX_PAGINAS = 5000;
const MAX_DETALLE = 400;

const esEspacio = (c: number) => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
const esDelimitador = (c: number) =>
  c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;

function aLatin1(bytes: Uint8Array) {
  let texto = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    texto += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return texto;
}

const esDict = (v: Valor | undefined): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v) && v.t === 'd';
const esRef = (v: Valor | undefined): v is Ref => typeof v === 'object' && v !== null && !Array.isArray(v) && v.t === 'r';
const esNombre = (v: Valor | undefined, nombre?: string): v is Nombre =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && v.t === 'n' && (nombre === undefined || v.v === nombre);

/** Parser de objetos PDF sobre el texto latin1 del archivo. */
class Lector {
  pos: number;
  private readonly s: string;
  constructor(s: string, inicio = 0) {
    this.s = s;
    this.pos = inicio;
  }

  private saltar() {
    const s = this.s;
    while (this.pos < s.length) {
      const c = s.charCodeAt(this.pos);
      if (esEspacio(c)) this.pos++;
      else if (c === 37) {
        while (this.pos < s.length && s.charCodeAt(this.pos) !== 10 && s.charCodeAt(this.pos) !== 13) this.pos++;
      } else break;
    }
  }

  private palabra() {
    const s = this.s;
    const inicio = this.pos;
    while (this.pos < s.length) {
      const c = s.charCodeAt(this.pos);
      if (esEspacio(c) || esDelimitador(c)) break;
      this.pos++;
    }
    return s.slice(inicio, this.pos);
  }

  /** Mira si después de la posición actual vienen "<entero> R" sin consumirlos. */
  private referenciaSiguiente(): { g: number; fin: number } | null {
    const guardado = this.pos;
    this.saltar();
    const g = this.palabra();
    if (!/^\d+$/.test(g)) {
      this.pos = guardado;
      return null;
    }
    this.saltar();
    if (this.s[this.pos] === 'R' && (this.pos + 1 >= this.s.length || esEspacio(this.s.charCodeAt(this.pos + 1)) || esDelimitador(this.s.charCodeAt(this.pos + 1)))) {
      const fin = this.pos + 1;
      this.pos = guardado;
      return { g: Number(g), fin };
    }
    this.pos = guardado;
    return null;
  }

  valor(profundidad = 0): Valor {
    if (profundidad > 64) throw new Error('anidamiento excesivo');
    this.saltar();
    const s = this.s;
    const c = s[this.pos];
    if (c === undefined) throw new Error('fin inesperado');
    if (c === '/') {
      this.pos++;
      return { t: 'n', v: this.palabra() };
    }
    if (c === '<' && s[this.pos + 1] === '<') {
      this.pos += 2;
      const v: Record<string, Valor> = {};
      for (;;) {
        this.saltar();
        if (s[this.pos] === '>' && s[this.pos + 1] === '>') {
          this.pos += 2;
          return { t: 'd', v };
        }
        if (s[this.pos] !== '/') throw new Error('clave de diccionario inválida');
        this.pos++;
        const clave = this.palabra();
        v[clave] = this.valor(profundidad + 1);
      }
    }
    if (c === '[') {
      this.pos++;
      const arr: Valor[] = [];
      for (;;) {
        this.saltar();
        if (s[this.pos] === ']') {
          this.pos++;
          return arr;
        }
        if (this.pos >= s.length) throw new Error('arreglo sin cerrar');
        arr.push(this.valor(profundidad + 1));
      }
    }
    if (c === '(') {
      let nivel = 0;
      while (this.pos < s.length) {
        const ch = s[this.pos];
        if (ch === '\\') this.pos += 2;
        else {
          if (ch === '(') nivel++;
          else if (ch === ')') {
            nivel--;
            if (nivel === 0) {
              this.pos++;
              return { t: 's' };
            }
          }
          this.pos++;
        }
      }
      throw new Error('cadena sin cerrar');
    }
    if (c === '<') {
      const fin = s.indexOf('>', this.pos);
      if (fin < 0) throw new Error('cadena hexadecimal sin cerrar');
      this.pos = fin + 1;
      return { t: 's' };
    }
    const p = this.palabra();
    if (p === '') {
      this.pos++;
      throw new Error('token inesperado');
    }
    if (p === 'true') return true;
    if (p === 'false') return false;
    if (p === 'null') return null;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(p)) {
      if (/^\d+$/.test(p)) {
        const ref = this.referenciaSiguiente();
        if (ref) {
          this.pos = ref.fin;
          return { t: 'r', n: Number(p), g: ref.g };
        }
      }
      return Number(p);
    }
    // Operador o palabra desconocida (p. ej. "obj", "endobj"): se trata como nulo
    return null;
  }
}

export async function analizarPdf(bytes: Uint8Array, inflar: Inflar): Promise<AnalisisPdf> {
  const cabecera = aLatin1(bytes.subarray(0, 1024));
  if (!cabecera.includes('%PDF-')) {
    return { ok: false, motivo: 'no-es-pdf', mensaje: 'El archivo no parece ser un PDF.' };
  }
  const texto = aLatin1(bytes);
  const objetos = new Map<number, Objeto>();

  // 1. Objetos directos ("n g obj ... endobj"); en actualizaciones incrementales gana el último
  const patron = /(\d+)\s+(\d+)\s+obj\b/g;
  for (let m = patron.exec(texto); m; m = patron.exec(texto)) {
    const numero = Number(m[1]);
    try {
      const lector = new Lector(texto, m.index + m[0].length);
      const valor = lector.valor();
      const objeto: Objeto = { valor };
      if (esDict(valor)) {
        const resto = texto.slice(lector.pos, lector.pos + 32);
        const st = /^\s*stream(\r\n|\n|\r)/.exec(resto);
        if (st) {
          objeto.inicioStream = lector.pos + st[0].length;
          const largo = valor.v.Length;
          let fin = typeof largo === 'number' ? objeto.inicioStream + largo : -1;
          if (fin < 0 || fin > texto.length || !/^\s*endstream/.test(texto.slice(fin, fin + 32))) {
            fin = texto.indexOf('endstream', objeto.inicioStream);
            if (fin < 0) fin = texto.length;
          }
          objeto.finStream = fin;
          patron.lastIndex = Math.max(patron.lastIndex, fin);
        }
      }
      objetos.set(numero, objeto);
    } catch {
      // Objeto dañado: se ignora y se sigue con el resto del archivo
    }
  }

  const resolver = (v: Valor | undefined, saltos = 0): Valor | undefined => {
    if (esRef(v) && saltos < 32) return resolver(objetos.get(v.n)?.valor, saltos + 1);
    return v;
  };

  const datosStream = async (objeto: Objeto | undefined): Promise<Uint8Array | null> => {
    if (!objeto || objeto.inicioStream === undefined || objeto.finStream === undefined || !esDict(objeto.valor)) return null;
    const crudo = bytes.subarray(objeto.inicioStream, objeto.finStream);
    const filtro = resolver(objeto.valor.v.Filter);
    const filtros = Array.isArray(filtro) ? filtro.map((f) => resolver(f)) : filtro === undefined ? [] : [filtro];
    if (filtros.length === 0) return crudo;
    if (filtros.length === 1 && esNombre(filtros[0], 'FlateDecode')) {
      try {
        return await inflar(crudo);
      } catch {
        return null;
      }
    }
    return null;
  };

  // 2. Objetos guardados dentro de flujos de objetos comprimidos (PDF 1.5+)
  for (const objeto of [...objetos.values()]) {
    if (!esDict(objeto.valor) || !esNombre(objeto.valor.v.Type, 'ObjStm')) continue;
    const datos = await datosStream(objeto);
    if (!datos) continue;
    const contenido = aLatin1(datos);
    const n = resolver(objeto.valor.v.N);
    const primero = resolver(objeto.valor.v.First);
    if (typeof n !== 'number' || typeof primero !== 'number') continue;
    const cabeceraObj = new Lector(contenido);
    const pares: [number, number][] = [];
    try {
      for (let i = 0; i < n; i++) {
        const num = cabeceraObj.valor();
        const off = cabeceraObj.valor();
        if (typeof num === 'number' && typeof off === 'number') pares.push([num, off]);
      }
    } catch {
      continue;
    }
    for (const [num, off] of pares) {
      if (objetos.has(num)) continue;
      try {
        objetos.set(num, { valor: new Lector(contenido, primero + off).valor() });
      } catch {
        // se ignora
      }
    }
  }

  // 3. Diccionario del tráiler: clásico ("trailer << >>") o de un flujo de referencias cruzadas
  let raiz: Valor | undefined;
  let cifrado = false;
  const patronTrailer = /trailer\s*<</g;
  for (let m = patronTrailer.exec(texto); m; m = patronTrailer.exec(texto)) {
    try {
      const d = new Lector(texto, m.index + 'trailer'.length).valor();
      if (esDict(d)) {
        if (d.v.Root) raiz = d.v.Root;
        if (d.v.Encrypt) cifrado = true;
      }
    } catch {
      // se ignora
    }
  }
  for (const objeto of objetos.values()) {
    if (esDict(objeto.valor) && esNombre(objeto.valor.v.Type, 'XRef')) {
      if (objeto.valor.v.Root) raiz = objeto.valor.v.Root;
      if (objeto.valor.v.Encrypt) cifrado = true;
    }
  }
  if (cifrado) {
    return {
      ok: false,
      motivo: 'cifrado',
      mensaje: 'El PDF está protegido con contraseña o cifrado, así que no podemos leer sus páginas.',
    };
  }

  // 4. Árbol de páginas, con atributos heredados (MediaBox, CropBox, Rotate, Resources)
  type Heredado = { caja?: Valor; rotacion?: Valor; recursos?: Valor };
  const hojas: { dict: Dict; heredado: Heredado }[] = [];
  const visitados = new Set<number>();
  const recorrer = (nodo: Valor | undefined, heredado: Heredado, profundidad: number) => {
    if (hojas.length >= MAX_PAGINAS || profundidad > 64) return;
    if (esRef(nodo)) {
      if (visitados.has(nodo.n)) return;
      visitados.add(nodo.n);
    }
    const d = resolver(nodo);
    if (!esDict(d)) return;
    const propio: Heredado = {
      caja: d.v.CropBox ?? d.v.MediaBox ?? heredado.caja,
      rotacion: d.v.Rotate ?? heredado.rotacion,
      recursos: d.v.Resources ?? heredado.recursos,
    };
    const hijos = resolver(d.v.Kids);
    if (Array.isArray(hijos)) {
      for (const hijo of hijos) recorrer(hijo, propio, profundidad + 1);
    } else if (esNombre(d.v.Type, 'Page') || d.v.Contents !== undefined || d.v.MediaBox !== undefined) {
      hojas.push({ dict: d, heredado: propio });
    }
  };

  const catalogo = resolver(raiz);
  if (esDict(catalogo)) recorrer(catalogo.v.Pages, {}, 0);

  // Respaldo: si no hay tráiler legible, se toman los objetos /Type /Page en orden
  if (hojas.length === 0) {
    const ordenados = [...objetos.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, objeto] of ordenados) {
      if (esDict(objeto.valor) && esNombre(objeto.valor.v.Type, 'Page')) {
        hojas.push({
          dict: objeto.valor,
          heredado: { caja: objeto.valor.v.CropBox ?? objeto.valor.v.MediaBox, rotacion: objeto.valor.v.Rotate },
        });
        if (hojas.length >= MAX_PAGINAS) break;
      }
    }
  }
  if (hojas.length === 0) {
    return { ok: false, motivo: 'ilegible', mensaje: 'No pudimos leer las páginas de este PDF.' };
  }

  const pintaAlgo = /(?:^|[\s\])>}])(?:Tj|TJ|'|"|Do|BI|sh|f\*?|F|B\*?|b\*?|S|s)(?=[\s[(</{]|$)/;

  const paginas: PaginaPdf[] = [];
  for (let i = 0; i < hojas.length; i++) {
    const { dict, heredado } = hojas[i];
    const cajaValor = resolver(heredado.caja);
    const caja = Array.isArray(cajaValor) ? cajaValor.map((x) => resolver(x)) : null;
    let ancho = 612;
    let alto = 792;
    if (caja && caja.length === 4 && caja.every((x) => typeof x === 'number')) {
      const [x0, y0, x1, y1] = caja as number[];
      ancho = Math.abs(x1 - x0);
      alto = Math.abs(y1 - y0);
    }
    const rotacionValor = resolver(heredado.rotacion);
    const rotacion = typeof rotacionValor === 'number' ? (((Math.round(rotacionValor / 90) * 90) % 360) + 360) % 360 : 0;
    if (rotacion === 90 || rotacion === 270) [ancho, alto] = [alto, ancho];

    let posiblementeEnBlanco: boolean | null = null;
    if (i < MAX_DETALLE) {
      const contenidos = resolver(dict.v.Contents);
      const refs: Valor[] = contenidos === undefined ? [] : Array.isArray(contenidos) ? contenidos : [dict.v.Contents as Valor];
      if (refs.length === 0) {
        posiblementeEnBlanco = true;
      } else {
        let legible = true;
        let dibuja = false;
        for (const ref of refs) {
          const objeto = esRef(ref) ? objetos.get(ref.n) : undefined;
          const datos = await datosStream(objeto);
          if (!datos) {
            legible = false;
            break;
          }
          if (pintaAlgo.test(aLatin1(datos))) {
            dibuja = true;
            break;
          }
        }
        posiblementeEnBlanco = dibuja ? false : legible ? true : null;
      }
    }
    paginas.push({ numero: i + 1, ancho: Math.round(ancho), alto: Math.round(alto), rotacion, posiblementeEnBlanco });
  }

  return { ok: true, totalPaginas: paginas.length, paginas, detalleCompleto: paginas.length <= MAX_DETALLE };
}

// --- Tamaños de papel y advertencias -------------------------------------------------------

export type TamanoPapel = 'CARTA' | 'OFICIO';

/** Medidas en puntos: Carta 21,6 × 27,9 cm; Oficio (Colombia) 21,6 × 33 cm. */
export const PAPEL: Record<TamanoPapel, { ancho: number; alto: number; nombre: string }> = {
  CARTA: { ancho: 612, alto: 792, nombre: 'carta' },
  OFICIO: { ancho: 612, alto: 935, nombre: 'oficio' },
};

const nombreTamano = (ancho: number, alto: number) => {
  const [a, b] = [Math.min(ancho, alto), Math.max(ancho, alto)];
  const cerca = (x: number, y: number) => Math.abs(x - y) <= 6;
  if (cerca(a, 595) && cerca(b, 842)) return 'A4';
  if (cerca(a, 612) && cerca(b, 792)) return 'carta';
  if (cerca(a, 612) && (cerca(b, 935) || cerca(b, 936))) return 'oficio';
  if (cerca(a, 612) && cerca(b, 1008)) return 'legal';
  if (cerca(a, 420) && cerca(b, 595)) return 'A5';
  return `${(a / 72 * 2.54).toFixed(1)} × ${(b / 72 * 2.54).toFixed(1)} cm`;
};

export type Advertencia = { tipo: 'en-blanco' | 'tamano' | 'orientacion'; paginas: number[]; mensaje: string };

/** Advertencias para mostrar al cliente. Nunca bloquean el pedido. */
export function advertenciasPdf(paginas: PaginaPdf[], seleccion: number[], papel: TamanoPapel): Advertencia[] {
  const elegidas = new Set(seleccion);
  const enSeleccion = paginas.filter((p) => elegidas.has(p.numero));
  const advertencias: Advertencia[] = [];

  const enBlanco = enSeleccion.filter((p) => p.posiblementeEnBlanco === true).map((p) => p.numero);
  if (enBlanco.length > 0) {
    advertencias.push({
      tipo: 'en-blanco',
      paginas: enBlanco,
      mensaje:
        enBlanco.length === 1
          ? `La página ${enBlanco[0]} parece estar en blanco. Si no la necesitas, quítala de la selección.`
          : `${enBlanco.length} páginas parecen estar en blanco. Si no las necesitas, quítalas de la selección.`,
    });
  }

  const destino = PAPEL[papel];
  const proporcionDestino = destino.alto / destino.ancho;
  const distintas = new Map<string, number[]>();
  for (const p of enSeleccion) {
    const corto = Math.min(p.ancho, p.alto);
    const largo = Math.max(p.ancho, p.alto);
    const igual = Math.abs(corto - destino.ancho) <= 6 && Math.abs(largo - destino.alto) <= 6;
    if (igual) continue;
    const proporcion = largo / corto;
    if (Math.abs(proporcion - proporcionDestino) / proporcionDestino < 0.03) continue;
    const nombre = nombreTamano(p.ancho, p.alto);
    distintas.set(nombre, [...(distintas.get(nombre) ?? []), p.numero]);
  }
  for (const [nombre, numeros] of distintas) {
    advertencias.push({
      tipo: 'tamano',
      paginas: numeros,
      mensaje: `${numeros.length === enSeleccion.length ? 'El documento' : `${numeros.length === 1 ? 'La página' : 'Las páginas'} ${formatearLista(numeros)}`} ${numeros.length === 1 || numeros.length === enSeleccion.length ? 'está' : 'están'} en tamaño ${nombre} y lo imprimiremos en ${destino.nombre}: se ajustará al papel y pueden quedar márgenes distintos.`,
    });
  }

  const horizontales = enSeleccion.filter((p) => p.ancho > p.alto).map((p) => p.numero);
  if (horizontales.length > 0 && horizontales.length < enSeleccion.length) {
    advertencias.push({
      tipo: 'orientacion',
      paginas: horizontales,
      mensaje: `${horizontales.length === 1 ? 'La página' : 'Las páginas'} ${formatearLista(horizontales)} ${horizontales.length === 1 ? 'está' : 'están'} en horizontal. Las giraremos para que quepan en la hoja.`,
    });
  }
  return advertencias;
}

function formatearLista(numeros: number[]) {
  const partes: string[] = [];
  for (let i = 0; i < numeros.length; i++) {
    let j = i;
    while (j + 1 < numeros.length && numeros[j + 1] === numeros[j] + 1) j++;
    partes.push(i === j ? String(numeros[i]) : `${numeros[i]}-${numeros[j]}`);
    i = j;
  }
  return partes.length > 6 ? `${partes.slice(0, 6).join(', ')}…` : partes.join(', ');
}
