import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  LoaderCircle,
  MessageCircle,
  Palette,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiUrl, formatoPesos, hasApi, NEQUI_NUMERO, responseMessage, whatsappLink } from '../api';
import { advertenciasPdf, type AnalisisPdf } from '../compartido/pdf-analisis';
import { formatearRangos, parsearRangos } from '../compartido/rangos';
import { cotizar } from '../compartido/precios';
import { analizarArchivoPdf, puedeAnalizarPdf } from './analisisNavegador';
import { SelectorPaginas } from './SelectorPaginas';
import { useFranjas, useTarifas } from './usarConfiguracion';
import {
  correoValido,
  esPdf,
  formatoMB,
  getComprobanteError,
  getFileError,
  MAX_COPIAS,
  MAX_NOTAS_PAGINA,
  normalizarTelefono,
  PATRON_RANGOS,
} from './validacion';
import '../../styles/PedidoModal.css';
import '../../styles/Imprimir.css';

type Tamano = 'CARTA' | 'OFICIO';
type Tipo = 'BN' | 'COLOR' | 'MIXTO';
type MetodoPago = 'NEQUI' | 'EFECTIVO';
type NotaPagina = { id: number; paginas: string; nota: string };
type PedidoCreado = {
  codigo: string;
  nombre: string;
  precioCentavos: number | null;
  metodoPago: MetodoPago;
  recogida: string | null;
};

const TIPOS: { valor: Tipo; titulo: string; detalle: string }[] = [
  { valor: 'BN', titulo: 'Blanco y negro', detalle: 'Todo el documento' },
  { valor: 'COLOR', titulo: 'Color', detalle: 'Todo el documento' },
  { valor: 'MIXTO', titulo: 'Mixto', detalle: 'Eliges qué páginas van a color' },
];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function ImprimirPage() {
  const tarifasEstado = useTarifas();
  const franjas = useFranjas();
  const tarifas = tarifasEstado.estado === 'listo' ? tarifasEstado.datos : null;

  const comprobanteInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [analisis, setAnalisis] = useState<AnalisisPdf | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const analisisId = useRef(0);

  const [textoPaginas, setTextoPaginas] = useState('');
  const [textoColor, setTextoColor] = useState('');
  const [modoChips, setModoChips] = useState<'seleccion' | 'color'>('seleccion');
  const [copias, setCopias] = useState('1');
  const [tamano, setTamano] = useState<Tamano>('CARTA');
  const [tipo, setTipo] = useState<Tipo>('BN');
  const [dobleCara, setDobleCara] = useState(false);
  const [notas, setNotas] = useState<NotaPagina[]>([]);
  const siguienteNota = useRef(1);

  const [diaActivo, setDiaActivo] = useState(0);
  const [franja, setFranja] = useState('');

  const [telefono, setTelefono] = useState('');
  const [avisoWhatsapp, setAvisoWhatsapp] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPago | ''>('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [comprobanteError, setComprobanteError] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formError, setFormError] = useState('');
  const [creado, setCreado] = useState<PedidoCreado | null>(null);
  const [copiado, setCopiado] = useState('');

  // ---------- Archivo ----------
  const elegirArchivo = async (seleccionado: File | null) => {
    const id = ++analisisId.current;
    const error = getFileError(seleccionado);
    setFile(seleccionado);
    setFileError(error);
    setAnalisis(null);
    setTextoPaginas('');
    setTextoColor('');
    setFormError('');
    if (!seleccionado || error || !esPdf(seleccionado) || !puedeAnalizarPdf()) {
      setAnalizando(false);
      return;
    }
    setAnalizando(true);
    try {
      const resultado = await analizarArchivoPdf(seleccionado);
      if (id === analisisId.current) setAnalisis(resultado);
    } catch {
      if (id === analisisId.current) {
        setAnalisis({ ok: false, motivo: 'ilegible', mensaje: 'No pudimos leer el PDF en tu navegador.' });
      }
    } finally {
      if (id === analisisId.current) setAnalizando(false);
    }
  };

  const onArchivo = (event: ChangeEvent<HTMLInputElement>) => {
    void elegirArchivo(event.target.files?.[0] ?? null);
  };

  // ---------- Derivados ----------
  const pdf = analisis?.ok ? analisis : null;
  const total = pdf?.totalPaginas ?? null;
  const seleccion = useMemo(() => (total ? parsearRangos(textoPaginas, total) : null), [textoPaginas, total]);
  const paginasElegidas = useMemo(() => (seleccion?.ok ? seleccion.paginas : []), [seleccion]);
  const setElegidas = useMemo(() => new Set(paginasElegidas), [paginasElegidas]);

  const color = useMemo((): { ok: true; paginas: number[] } | { ok: false; error: string } => {
    if (!total || !seleccion?.ok) return { ok: true, paginas: [] };
    if (tipo === 'COLOR') return { ok: true, paginas: paginasElegidas };
    if (tipo !== 'MIXTO') return { ok: true, paginas: [] };
    if (!textoColor.trim()) return { ok: false, error: 'Marca las páginas que van a color.' };
    const r = parsearRangos(textoColor, total);
    if (!r.ok) return { ok: false, error: r.error };
    const fuera = r.paginas.find((p) => !setElegidas.has(p));
    if (fuera) return { ok: false, error: `La página ${fuera} está a color pero no la vas a imprimir.` };
    return { ok: true, paginas: r.paginas };
  }, [total, seleccion, tipo, textoColor, paginasElegidas, setElegidas]);
  const setColor = useMemo(() => new Set(color.ok ? color.paginas : []), [color]);

  const copiasNum = Number(copias);
  const copiasValidas = Number.isInteger(copiasNum) && copiasNum >= 1 && copiasNum <= MAX_COPIAS;
  const carasImpresas = paginasElegidas.length * (copiasValidas ? copiasNum : 0);
  const limite = tarifas?.limitePaginasPedido ?? null;
  const excedeLimite = limite !== null && carasImpresas > limite;

  const cotizacion = useMemo(() => {
    if (!tarifas || !seleccion?.ok || !color.ok || !copiasValidas) return null;
    return cotizar(tarifas, {
      paginasBn: paginasElegidas.length - color.paginas.length,
      paginasColor: color.paginas.length,
      copias: copiasNum,
      tamano,
    });
  }, [tarifas, seleccion, color, copiasValidas, paginasElegidas, copiasNum, tamano]);

  const advertencias = useMemo(
    () => (pdf && paginasElegidas.length > 0 ? advertenciasPdf(pdf.paginas, paginasElegidas, tamano) : []),
    [pdf, paginasElegidas, tamano],
  );
  const blancasElegidas = useMemo(
    () =>
      pdf
        ? pdf.paginas.filter((p) => p.posiblementeEnBlanco === true && setElegidas.has(p.numero)).map((p) => p.numero)
        : [],
    [pdf, setElegidas],
  );
  const mostrarCuadricula = Boolean(pdf && pdf.paginas.length === pdf.totalPaginas);
  const modoActivo = tipo === 'MIXTO' ? modoChips : 'seleccion';

  // ---------- Selección con la cuadrícula ----------
  const alternarPagina = useCallback(
    (numero: number) => {
      if (!total) return;
      if (modoActivo === 'color') {
        const siguiente = new Set(setColor);
        if (siguiente.has(numero)) siguiente.delete(numero);
        else siguiente.add(numero);
        setTextoColor(formatearRangos([...siguiente]));
        return;
      }
      const siguiente = new Set(setElegidas);
      if (siguiente.has(numero)) {
        if (siguiente.size === 1) return; // siempre queda al menos una página
        siguiente.delete(numero);
        if (tipo === 'MIXTO' && setColor.has(numero)) {
          setTextoColor(formatearRangos([...setColor].filter((p) => p !== numero)));
        }
      } else {
        siguiente.add(numero);
      }
      setTextoPaginas(siguiente.size === total ? '' : formatearRangos([...siguiente]));
    },
    [total, modoActivo, setColor, setElegidas, tipo],
  );

  const quitarBlancas = () => {
    const quedan = paginasElegidas.filter((p) => !blancasElegidas.includes(p));
    if (quedan.length === 0) return;
    setTextoPaginas(formatearRangos(quedan));
    if (tipo === 'MIXTO') setTextoColor(formatearRangos([...setColor].filter((p) => quedan.includes(p))));
  };

  // ---------- Notas por página ----------
  const agregarNota = () => {
    if (notas.length >= MAX_NOTAS_PAGINA) return;
    setNotas((actual) => [...actual, { id: siguienteNota.current++, paginas: '', nota: '' }]);
  };
  const cambiarNota = (id: number, campo: 'paginas' | 'nota', valor: string) =>
    setNotas((actual) => actual.map((n) => (n.id === id ? { ...n, [campo]: valor } : n)));
  const quitarNota = (id: number) => setNotas((actual) => actual.filter((n) => n.id !== id));

  const errorNotas = (() => {
    for (const n of notas) {
      if (!n.paginas.trim() && !n.nota.trim()) continue;
      if (!PATRON_RANGOS.test(n.paginas.trim())) return 'Cada indicación necesita sus páginas, por ejemplo "3" o "5-7".';
      if (total) {
        const r = parsearRangos(n.paginas, total);
        if (!r.ok) return `Indicación de la página "${n.paginas.trim()}": ${r.error}`;
      }
      if (!n.nota.trim()) return 'Escribe cada indicación o quítala.';
    }
    return '';
  })();

  // ---------- Recogida ----------
  const dias = useMemo(() => (franjas.estado === 'listo' ? franjas.datos : []), [franjas]);
  const diaVisible = dias.length > 0 ? dias[Math.min(diaActivo, dias.length - 1)] : undefined;
  const franjaElegida = useMemo(() => {
    for (const dia of dias) {
      const f = dia.franjas.find((x) => x.inicio === franja);
      if (f) return `${dia.nombre}, ${f.etiqueta}`;
    }
    return null;
  }, [dias, franja]);

  // ---------- Textos del resumen ----------
  const tipoTexto = tipo === 'BN' ? 'Blanco y negro' : tipo === 'COLOR' ? 'Color' : 'Mixto';
  const paginasTexto = pdf
    ? seleccion?.ok
      ? textoPaginas.trim() === ''
        ? `Todas (${pdf.totalPaginas})`
        : `${seleccion.normalizado} (${paginasElegidas.length})`
      : 'Revisa la selección'
    : textoPaginas.trim() || 'Todas';
  const impresionTexto = `${plural(copiasValidas ? copiasNum : 1, 'copia', 'copias')} · ${
    tamano === 'CARTA' ? 'Carta' : 'Oficio'
  } · ${tipoTexto} · ${dobleCara ? 'Doble cara' : 'Una cara'}`;

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      window.setTimeout(() => setCopiado(''), 2000);
    } catch {
      setCopiado('');
    }
  };

  const mensajeWhatsapp = () =>
    [
      'Hola, quiero imprimir un documento:',
      file ? `• Archivo: ${file.name}${pdf ? ` (${plural(pdf.totalPaginas, 'página', 'páginas')})` : ''}` : '',
      `• Páginas: ${paginasTexto}`,
      `• ${impresionTexto}`,
      tipo === 'MIXTO' && textoColor.trim() ? `• Páginas a color: ${textoColor.trim()}` : '',
      ...notas.filter((n) => n.nota.trim()).map((n) => `• Pág. ${n.paginas.trim()}: ${n.nota.trim()}`),
      'Te envío el archivo por este chat.',
    ]
      .filter(Boolean)
      .join('\n');

  // ---------- Validación y envío ----------
  const validarImpresion = (): string => {
    const errorArchivo = getFileError(file);
    if (errorArchivo) return errorArchivo;
    if (analizando) return 'Espera a que terminemos de revisar tu PDF.';
    if (seleccion && !seleccion.ok) return seleccion.error;
    if (!pdf && textoPaginas.trim() && !PATRON_RANGOS.test(textoPaginas.trim())) {
      return 'Escribe las páginas como 1-5, 8, 10-12.';
    }
    if (!copiasValidas) return `El número de copias debe estar entre 1 y ${MAX_COPIAS}.`;
    if (tipo === 'MIXTO') {
      if (!textoColor.trim()) return 'Indica qué páginas van a color.';
      if (!color.ok) return color.error;
      if (!PATRON_RANGOS.test(textoColor.trim())) return 'Escribe las páginas a color como 3 o 5-7.';
    }
    if (excedeLimite && limite !== null) {
      return `Los pedidos en línea pueden tener hasta ${limite} páginas impresas (páginas × copias) y este tiene ${carasImpresas}. Reduce la selección o escríbenos por WhatsApp.`;
    }
    return errorNotas;
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const errorImpresion = validarImpresion();
    if (errorImpresion) {
      setFormError(errorImpresion);
      if (!file) setFileError(getFileError(file));
      return;
    }
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get('nombre') ?? '').trim();
    const correo = String(form.get('correo') ?? '').trim();
    const tel = normalizarTelefono(telefono);
    const notasGenerales = String(form.get('notas') ?? '').trim();
    const referenciaNequi = String(form.get('referenciaNequi') ?? '').trim();
    const errorComprobante = metodo === 'NEQUI' ? getComprobanteError(comprobante) : '';
    setComprobanteError(errorComprobante);

    let error = '';
    if (!nombre || !correo) error = 'Completa tu nombre y correo electrónico.';
    else if (!correoValido(correo)) error = 'Escribe un correo electrónico válido.';
    else if (tel === null) error = 'El celular debe ser colombiano de 10 dígitos.';
    else if (avisoWhatsapp && !tel) error = 'Para avisarte por WhatsApp necesitamos tu celular.';
    else if (!metodo) error = 'Elige cómo vas a pagar.';
    else if (errorComprobante) error = errorComprobante;
    else if (referenciaNequi && !/^[A-Za-z0-9 -]{1,40}$/.test(referenciaNequi)) {
      error = 'La referencia de Nequi solo puede tener letras, números y guiones.';
    } else if (!aceptaPolitica) error = 'Para enviar el pedido debes autorizar el tratamiento de tus datos.';
    if (error || !file || tel === null || !metodo) {
      setFormError(error);
      return;
    }

    const body = new FormData();
    body.append('archivo', file);
    body.append('nombre', nombre);
    body.append('correo', correo);
    if (tel) body.append('telefono', tel);
    if (notasGenerales) body.append('notas', notasGenerales);
    body.append('copias', String(copiasNum));
    body.append('tamano', tamano);
    body.append('tipoImpresion', tipo);
    body.append('dobleCara', String(dobleCara));
    body.append('metodoPago', metodo);
    body.append('aceptaPolitica', 'true');
    body.append('whatsappAutorizado', String(avisoWhatsapp && Boolean(tel)));
    if (textoPaginas.trim()) body.append('paginas', textoPaginas.trim());
    if (tipo === 'MIXTO') body.append('paginasColor', textoColor.trim());
    const notasValidas = notas
      .filter((n) => n.nota.trim())
      .map((n) => ({ paginas: n.paginas.trim(), nota: n.nota.trim() }));
    if (notasValidas.length > 0) body.append('notasPaginas', JSON.stringify(notasValidas));
    if (franja) body.append('recogidaInicio', franja);
    if (metodo === 'NEQUI') {
      if (referenciaNequi) body.append('referenciaNequi', referenciaNequi);
      if (comprobante) body.append('comprobante', comprobante);
    }

    setEnviando(true);
    try {
      const response = await fetch(apiUrl('/pedidos'), { method: 'POST', body });
      if (response.status === 429) {
        throw new Error('Enviaste varios pedidos seguidos. Espera unos minutos o escríbenos por WhatsApp.');
      }
      if (!response.ok) {
        const mensaje = await responseMessage(
          response,
          'No pudimos enviar tu pedido. Revisa los datos e inténtalo de nuevo.',
        );
        if (/franja|recogida/i.test(mensaje)) {
          setFranja('');
          franjas.recargar();
        }
        throw new Error(mensaje);
      }
      const resultado = (await response.json()) as { codigo: string; precioCentavos?: number | null };
      setCreado({
        codigo: resultado.codigo,
        nombre,
        precioCentavos: resultado.precioCentavos ?? null,
        metodoPago: metodo,
        recogida: franjaElegida,
      });
      window.scrollTo({ top: 0 });
    } catch (envioError) {
      setFormError(envioError instanceof Error ? envioError.message : 'No pudimos conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Pedido enviado ----------
  if (creado) {
    const rastreo = `/rastreo?codigo=${encodeURIComponent(creado.codigo)}`;
    return (
      <main className="imp-page">
        <div className="imp-exito" role="status">
          <span className="imp-exito__icono" aria-hidden="true">
            <CheckCircle2 size={40} />
          </span>
          <p className="imp-kicker">Pedido enviado</p>
          <h1>¡Recibimos tu archivo!</h1>
          <p>Guarda este código para consultar tu pedido y para recogerlo:</p>
          <div className="pedido-code">
            <strong>{creado.codigo}</strong>
            <button type="button" onClick={() => void copiar(creado.codigo, 'codigo')}>
              {copiado === 'codigo' ? <Check size={16} /> : <Copy size={16} />}
              {copiado === 'codigo' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <dl className="imp-exito__datos">
            <div>
              <dt>Valor</dt>
              <dd>
                {creado.precioCentavos
                  ? formatoPesos(creado.precioCentavos)
                  : 'Te lo confirmamos al revisar el archivo'}
              </dd>
            </div>
            <div>
              <dt>Recogida</dt>
              <dd>{creado.recogida ?? 'Cuando esté listo'}</dd>
            </div>
          </dl>
          <div className="imp-exito__acciones">
            {creado.metodoPago === 'NEQUI' && creado.precioCentavos ? (
              <Link className="imp-btn imp-btn--primario" to={rastreo}>
                Pagar con Nequi
              </Link>
            ) : null}
            <Link className="imp-btn" to={rastreo}>
              Ver estado del pedido
            </Link>
            <a
              className="imp-btn imp-btn--whatsapp"
              href={whatsappLink(`Hola, acabo de enviar el pedido #${creado.codigo} a nombre de ${creado.nombre}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" />
              Avisar por WhatsApp
            </a>
          </div>
          <Link className="imp-volver" to="/">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const resumen = (
    <aside className="imp-resumen" aria-label="Resumen del pedido">
      <h2>Resumen</h2>
      <dl>
        <div>
          <dt>Archivo</dt>
          <dd>{file ? file.name : 'Sin archivo'}</dd>
        </div>
        <div>
          <dt>Páginas</dt>
          <dd>{file ? paginasTexto : '—'}</dd>
        </div>
        <div>
          <dt>Impresión</dt>
          <dd>{impresionTexto}</dd>
        </div>
        {hasApi && (
          <div>
            <dt>Recogida</dt>
            <dd>{franjaElegida ?? 'Cuando esté listo'}</dd>
          </div>
        )}
      </dl>
      <div className="imp-resumen__total" aria-live="polite">
        {!file ? (
          <p>Sube tu archivo para ver el valor.</p>
        ) : analizando ? (
          <p>Contando páginas…</p>
        ) : !pdf ? (
          <p>Te confirmamos el valor al revisar tu archivo.</p>
        ) : excedeLimite ? (
          <p className="imp-alerta">Supera el límite de {limite} páginas impresas por pedido en línea.</p>
        ) : cotizacion?.ok ? (
          <>
            {cotizacion.lineas.map((l) => (
              <p className="imp-linea" key={l.concepto}>
                <span>
                  {l.concepto}
                  {l.cantidad > 1 ? ` × ${l.cantidad}` : ''}
                </span>
                <span>{formatoPesos(l.subtotal * 100)}</span>
              </p>
            ))}
            {cotizacion.descuento && (
              <p className="imp-linea imp-linea--desc">
                <span>Descuento {cotizacion.descuento.porcentaje}%</span>
                <span>−{formatoPesos(cotizacion.descuento.valor * 100)}</span>
              </p>
            )}
            <p className="imp-total">
              <span>Total</span>
              <strong>{formatoPesos(cotizacion.total * 100)}</strong>
            </p>
            <small>Calculado con las tarifas vigentes; el servidor lo confirma al enviar.</small>
          </>
        ) : (
          <p>
            {plural(carasImpresas, 'página impresa', 'páginas impresas')}. Te confirmamos el valor al revisar el
            archivo.
          </p>
        )}
      </div>
    </aside>
  );

  let paso = 1;
  const numeroPaso = () => paso++;

  return (
    <main className="imp-page">
      <div className="imp-contenedor">
        <Link className="imp-volver imp-volver--arriba" to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </Link>
        <header className="imp-encabezado">
          <p className="imp-kicker">Imprime sin filas</p>
          <h1>Sube tu archivo y elige cómo imprimirlo</h1>
          <p>
            Revisamos tu PDF aquí mismo, en tu navegador, para contar las páginas y avisarte de posibles problemas.
            Nada se envía hasta que confirmes.
          </p>
        </header>

        <form className="imp-layout" onSubmit={enviar} noValidate>
          <div className="imp-pasos">
            {/* Archivo */}
            <section className="imp-paso" aria-labelledby="paso-archivo">
              <h2 id="paso-archivo">
                <span className="imp-paso__num">{numeroPaso()}</span> Tu archivo
              </h2>
              <div className="pedido-file-field">
                <input
                  className="pedido-file-input"
                  id="imp-archivo"
                  name="archivo"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={onArchivo}
                />
                <label className="pedido-file-dropzone" htmlFor="imp-archivo">
                  <span className="pedido-file-icon" aria-hidden="true">
                    {file ? <FileText size={24} /> : <Upload size={24} />}
                  </span>
                  <span className="pedido-file-copy">
                    <strong>{file ? file.name : 'Elige tu archivo'}</strong>
                    <small>{file ? formatoMB(file.size) : 'PDF, Word o Excel · máximo 15 MB'}</small>
                  </span>
                  <span className="pedido-file-action">{file ? 'Cambiar' : 'Explorar'}</span>
                </label>
                {fileError && <span className="pedido-error">{fileError}</span>}
              </div>
              {analizando && (
                <p className="imp-info">
                  <LoaderCircle className="pedido-spinner" size={16} aria-hidden="true" /> Revisando el PDF…
                </p>
              )}
              {pdf && (
                <p className="imp-info imp-info--ok">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {plural(pdf.totalPaginas, 'página encontrada', 'páginas encontradas')}.
                </p>
              )}
              {analisis && !analisis.ok && (
                <p className="imp-info imp-info--aviso">
                  <AlertTriangle size={16} aria-hidden="true" />
                  {analisis.motivo === 'cifrado'
                    ? 'El PDF está protegido, así que no pudimos contar sus páginas. Puedes enviarlo igual y te confirmamos el valor.'
                    : 'No pudimos contar las páginas de este PDF. Puedes enviarlo igual y te confirmamos el valor.'}
                </p>
              )}
              {file && !fileError && !esPdf(file) && (
                <p className="imp-info">
                  Los archivos Word y Excel los abrimos en el local: allí contamos las páginas y te confirmamos el
                  valor.
                </p>
              )}
            </section>

            {/* Páginas */}
            {file && !fileError && (
              <section className="imp-paso" aria-labelledby="paso-paginas">
                <h2 id="paso-paginas">
                  <span className="imp-paso__num">{numeroPaso()}</span> Páginas
                </h2>
                <label className="pedido-field">
                  <span>Páginas a imprimir</span>
                  <input
                    value={textoPaginas}
                    onChange={(e) => setTextoPaginas(e.target.value)}
                    placeholder="Todas · o por ejemplo 1-5, 8, 10-12"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={300}
                    aria-describedby="ayuda-paginas"
                    aria-invalid={Boolean(seleccion && !seleccion.ok)}
                  />
                </label>
                <p id="ayuda-paginas" className={`imp-ayuda ${seleccion && !seleccion.ok ? 'is-error' : ''}`}>
                  {seleccion && !seleccion.ok
                    ? seleccion.error
                    : pdf
                      ? `${plural(paginasElegidas.length, 'página', 'páginas')} de ${pdf.totalPaginas}${
                          seleccion?.ok && seleccion.habiaRepetidas ? ' (quitamos las repetidas)' : ''
                        }.`
                      : 'Déjalo vacío para imprimir todo el documento.'}
                </p>

                {mostrarCuadricula && pdf && (
                  <>
                    <div className="imp-cuadricula-barra">
                      {tipo === 'MIXTO' ? (
                        <div className="pedido-segmented imp-modo" role="radiogroup" aria-label="Qué marcar al tocar una página">
                          {(['seleccion', 'color'] as const).map((m) => (
                            <label key={m} className={modoChips === m ? 'is-selected' : ''}>
                              <input type="radio" name="modoChips" checked={modoChips === m} onChange={() => setModoChips(m)} />
                              {m === 'seleccion' ? 'Elegir páginas' : 'Marcar a color'}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="imp-ayuda">Toca una página para incluirla o quitarla.</span>
                      )}
                      {textoPaginas.trim() !== '' && (
                        <button type="button" className="pedido-link-button" onClick={() => setTextoPaginas('')}>
                          Seleccionar todas
                        </button>
                      )}
                    </div>
                    <SelectorPaginas
                      paginas={pdf.paginas}
                      seleccion={setElegidas}
                      color={setColor}
                      modo={modoActivo}
                      onAlternar={alternarPagina}
                    />
                    <p className="imp-leyenda">
                      <span>
                        <i className="imp-dot imp-dot--elegida" /> Se imprime
                      </span>
                      {tipo !== 'BN' && (
                        <span>
                          <i className="imp-dot imp-dot--color" /> A color
                        </span>
                      )}
                      <span>
                        <i className="imp-dot imp-dot--blanca" /> Posiblemente en blanco
                      </span>
                    </p>
                  </>
                )}
                {pdf && !mostrarCuadricula && (
                  <p className="imp-ayuda">
                    El documento es muy largo para mostrar cada página; escribe los rangos arriba.
                  </p>
                )}

                {advertencias.length > 0 && (
                  <ul className="imp-advertencias">
                    {advertencias.map((a) => (
                      <li key={a.tipo}>
                        <AlertTriangle size={16} aria-hidden="true" />
                        <span>{a.mensaje}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {blancasElegidas.length > 0 && blancasElegidas.length < paginasElegidas.length && (
                  <button type="button" className="pedido-link-button" onClick={quitarBlancas}>
                    Quitar las páginas posiblemente en blanco ({blancasElegidas.length})
                  </button>
                )}
                {advertencias.length > 0 && (
                  <p className="imp-ayuda">
                    Estas revisiones son automáticas y aproximadas, así que revisa tu archivo. No bloquean el pedido.
                  </p>
                )}
              </section>
            )}

            {/* Impresión */}
            <section className="imp-paso" aria-labelledby="paso-impresion">
              <h2 id="paso-impresion">
                <span className="imp-paso__num">{numeroPaso()}</span> Impresión
              </h2>
              <div className="imp-opciones-tipo" role="radiogroup" aria-label="Tipo de impresión">
                {TIPOS.map((t) => (
                  <label key={t.valor} className={`imp-opcion ${tipo === t.valor ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="tipoImpresion"
                      value={t.valor}
                      checked={tipo === t.valor}
                      onChange={() => {
                        setTipo(t.valor);
                        setModoChips(t.valor === 'MIXTO' ? 'color' : 'seleccion');
                      }}
                    />
                    <span className={`imp-opcion__muestra imp-opcion__muestra--${t.valor.toLowerCase()}`} aria-hidden="true" />
                    <strong>{t.titulo}</strong>
                    <small>{t.detalle}</small>
                  </label>
                ))}
              </div>
              {tipo === 'MIXTO' && (
                <>
                  <label className="pedido-field">
                    <span>
                      <Palette size={14} aria-hidden="true" /> Páginas a color
                    </span>
                    <input
                      value={textoColor}
                      onChange={(e) => setTextoColor(e.target.value)}
                      placeholder="Por ejemplo 3, 7-9"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={300}
                      aria-invalid={Boolean(textoColor.trim() && !color.ok)}
                    />
                  </label>
                  <p className={`imp-ayuda ${textoColor.trim() && !color.ok ? 'is-error' : ''}`}>
                    {!color.ok
                      ? color.error
                      : pdf
                        ? `${plural(color.paginas.length, 'página', 'páginas')} a color y ${
                            paginasElegidas.length - color.paginas.length
                          } en blanco y negro.`
                        : 'El resto se imprime en blanco y negro.'}
                  </p>
                </>
              )}
              <div className="pedido-specs imp-specs">
                <label className="pedido-field pedido-copias">
                  <span>Copias</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_COPIAS}
                    value={copias}
                    onChange={(event) => setCopias(event.target.value)}
                  />
                </label>
                <div className="pedido-segmented" role="radiogroup" aria-label="Tamaño del papel">
                  <span className="pedido-segmented-title">Tamaño</span>
                  {(['CARTA', 'OFICIO'] as const).map((valor) => (
                    <label key={valor} className={tamano === valor ? 'is-selected' : ''}>
                      <input type="radio" name="tamano" value={valor} checked={tamano === valor} onChange={() => setTamano(valor)} />
                      {valor === 'CARTA' ? 'Carta' : 'Oficio'}
                    </label>
                  ))}
                </div>
                <label className="pedido-toggle">
                  <input type="checkbox" checked={dobleCara} onChange={(event) => setDobleCara(event.target.checked)} />
                  <span>Imprimir a doble cara</span>
                </label>
              </div>

              <div className="imp-notas">
                <div className="imp-notas__cabecera">
                  <h3>Indicaciones por página</h3>
                  <small>Opcional · hasta {MAX_NOTAS_PAGINA}</small>
                </div>
                {notas.map((n) => (
                  <div className="imp-nota" key={n.id}>
                    <label className="pedido-field">
                      <span>Páginas</span>
                      <input
                        value={n.paginas}
                        onChange={(e) => cambiarNota(n.id, 'paginas', e.target.value)}
                        placeholder="3 o 5-7"
                        inputMode="numeric"
                        maxLength={60}
                      />
                    </label>
                    <label className="pedido-field">
                      <span>Indicación</span>
                      <input
                        value={n.nota}
                        onChange={(e) => cambiarNota(n.id, 'nota', e.target.value)}
                        placeholder="Ej.: imprimir en papel más grueso"
                        maxLength={200}
                      />
                    </label>
                    <button type="button" className="imp-icono-btn" onClick={() => quitarNota(n.id)} aria-label="Quitar indicación">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {errorNotas && <p className="imp-ayuda is-error">{errorNotas}</p>}
                {notas.length < MAX_NOTAS_PAGINA && (
                  <button type="button" className="imp-agregar" onClick={agregarNota}>
                    <Plus size={16} aria-hidden="true" /> Agregar indicación
                  </button>
                )}
              </div>
            </section>

            {hasApi ? (
              <>
                {/* Recogida */}
                <section className="imp-paso" aria-labelledby="paso-recogida">
                  <h2 id="paso-recogida">
                    <span className="imp-paso__num">{numeroPaso()}</span> ¿Cuándo lo recoges?
                  </h2>
                  <label className={`imp-franja-asap ${franja === '' ? 'is-selected' : ''}`}>
                    <input type="radio" name="franja" checked={franja === ''} onChange={() => setFranja('')} />
                    <span>
                      <strong>Cuando esté listo</strong>
                      <small>Lo imprimimos lo antes posible.</small>
                    </span>
                  </label>
                  {franjas.estado === 'cargando' && (
                    <p className="imp-info">
                      <LoaderCircle className="pedido-spinner" size={16} aria-hidden="true" /> Cargando horarios…
                    </p>
                  )}
                  {franjas.estado === 'error' && (
                    <p className="imp-info imp-info--aviso">
                      <AlertTriangle size={16} aria-hidden="true" />
                      No pudimos cargar las horas de recogida. Puedes enviar el pedido igual.
                    </p>
                  )}
                  {diaVisible && (
                    <>
                      <p className="imp-ayuda">
                        <Clock size={14} aria-hidden="true" /> O reserva una hora para recogerlo:
                      </p>
                      <div className="imp-dias" role="group" aria-label="Día de recogida">
                        {dias.map((dia, i) => (
                          <button
                            key={dia.fecha}
                            type="button"
                            aria-pressed={dia === diaVisible}
                            className={`imp-dia ${dia === diaVisible ? 'is-activo' : ''}`}
                            onClick={() => setDiaActivo(i)}
                          >
                            <strong>{dia.nombre}</strong>
                            <small>
                              {dia.fecha.slice(8, 10)}/{dia.fecha.slice(5, 7)}
                            </small>
                          </button>
                        ))}
                      </div>
                      <div className="imp-franjas" role="radiogroup" aria-label={`Horas: ${diaVisible.nombre}`}>
                        {diaVisible.franjas.length === 0 && <p className="imp-ayuda">No quedan horas este día.</p>}
                        {diaVisible.franjas.map((f) => (
                          <label
                            key={f.inicio}
                            className={`imp-franja ${franja === f.inicio ? 'is-selected' : ''} ${f.disponible ? '' : 'is-llena'}`}
                          >
                            <input
                              type="radio"
                              name="franja"
                              disabled={!f.disponible}
                              checked={franja === f.inicio}
                              onChange={() => setFranja(f.inicio)}
                            />
                            <span>{f.etiqueta}</span>
                            {!f.disponible && <small>Lleno</small>}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </section>

                {/* Datos y pago */}
                <section className="imp-paso" aria-labelledby="paso-datos">
                  <h2 id="paso-datos">
                    <span className="imp-paso__num">{numeroPaso()}</span> Tus datos y pago
                  </h2>
                  <div className="pedido-fields-grid">
                    <label className="pedido-field">
                      <span>
                        Nombre <em>*</em>
                      </span>
                      <input name="nombre" type="text" placeholder="Tu nombre" autoComplete="name" maxLength={100} required />
                    </label>
                    <label className="pedido-field">
                      <span>
                        Correo <em>*</em>
                      </span>
                      <input name="correo" type="email" placeholder="tu@correo.com" autoComplete="email" maxLength={160} required />
                    </label>
                    <label className="pedido-field">
                      <span>Celular</span>
                      <input
                        name="telefono"
                        type="tel"
                        inputMode="tel"
                        placeholder="Opcional · 3XX XXX XXXX"
                        autoComplete="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                      />
                    </label>
                    <label className="pedido-field pedido-field-wide">
                      <span>Notas generales</span>
                      <textarea name="notas" rows={2} maxLength={500} placeholder="Anillado, grapado, entregar en sobre…" />
                    </label>
                  </div>
                  <label className="pedido-consent">
                    <input type="checkbox" checked={avisoWhatsapp} onChange={(e) => setAvisoWhatsapp(e.target.checked)} />
                    <span>Quiero que me avisen por WhatsApp cuando mi pedido esté listo (necesita tu celular).</span>
                  </label>

                  <fieldset className="pedido-payment-fieldset">
                    <legend>
                      Método de pago <em>*</em>
                    </legend>
                    <div className="pedido-payment-options">
                      <label className={`pedido-payment-option ${metodo === 'NEQUI' ? 'is-selected' : ''}`}>
                        <input type="radio" name="metodoPago" value="NEQUI" checked={metodo === 'NEQUI'} onChange={() => setMetodo('NEQUI')} />
                        <span>
                          <strong>Nequi</strong>
                          <small>En línea cuando tengamos el valor</small>
                        </span>
                      </label>
                      <label className={`pedido-payment-option ${metodo === 'EFECTIVO' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="metodoPago"
                          value="EFECTIVO"
                          checked={metodo === 'EFECTIVO'}
                          onChange={() => setMetodo('EFECTIVO')}
                        />
                        <span>
                          <strong>Efectivo en el local</strong>
                          <small>Pagas al recoger</small>
                        </span>
                      </label>
                    </div>
                    {metodo === 'NEQUI' && (
                      <div className="pedido-nequi-panel">
                        <p>
                          {cotizacion?.ok
                            ? 'Al enviar el pedido podrás pagarlo con Nequi desde la página de seguimiento.'
                            : 'Cuando confirmemos el valor podrás pagarlo con Nequi desde la página de seguimiento.'}{' '}
                          ¿Ya transferiste a {NEQUI_NUMERO}? Deja la referencia o el comprobante.
                        </p>
                        <label className="pedido-field">
                          <span>Referencia de la transferencia</span>
                          <input name="referenciaNequi" type="text" placeholder="Opcional · ej. M1234567" maxLength={40} autoComplete="off" />
                        </label>
                        <div className="pedido-comprobante">
                          <input
                            ref={comprobanteInputRef}
                            className="pedido-file-input"
                            id="imp-comprobante"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={(e) => {
                              const elegido = e.target.files?.[0] ?? null;
                              setComprobante(elegido);
                              setComprobanteError(getComprobanteError(elegido));
                            }}
                          />
                          <label className="pedido-comprobante-button" htmlFor="imp-comprobante">
                            <Upload size={16} aria-hidden="true" />
                            {comprobante ? comprobante.name : 'Adjuntar comprobante (opcional)'}
                          </label>
                          {comprobante && (
                            <button
                              type="button"
                              className="pedido-link-button"
                              onClick={() => {
                                setComprobante(null);
                                setComprobanteError('');
                                if (comprobanteInputRef.current) comprobanteInputRef.current.value = '';
                              }}
                            >
                              Quitar
                            </button>
                          )}
                          <small>Captura o PDF · máximo 5 MB</small>
                          {comprobanteError && <span className="pedido-error">{comprobanteError}</span>}
                        </div>
                      </div>
                    )}
                  </fieldset>

                  <label className="pedido-consent">
                    <input type="checkbox" checked={aceptaPolitica} onChange={(e) => setAceptaPolitica(e.target.checked)} required />
                    <span>
                      Autorizo el tratamiento de mis datos para gestionar mi pedido, según la{' '}
                      <Link to="/privacidad" target="_blank" rel="noopener noreferrer">
                        política de privacidad
                      </Link>
                      . <em>*</em>
                    </span>
                  </label>
                </section>
              </>
            ) : (
              <section className="imp-paso" aria-labelledby="paso-whatsapp">
                <h2 id="paso-whatsapp">
                  <span className="imp-paso__num">{numeroPaso()}</span> Envíalo por WhatsApp
                </h2>
                <p className="imp-ayuda">
                  Por ahora recibimos los archivos por WhatsApp. Te preparamos el mensaje con lo que elegiste; solo
                  adjunta el archivo en el chat.
                </p>
              </section>
            )}

            <div className="imp-resumen-movil">{resumen}</div>

            {formError && (
              <p className="pedido-form-error" role="alert">
                {formError}
              </p>
            )}

            {hasApi ? (
              <button className="pedido-submit imp-enviar" type="submit" disabled={enviando || analizando}>
                {enviando ? (
                  <>
                    <LoaderCircle className="pedido-spinner" size={19} /> Enviando…
                  </>
                ) : (
                  'Enviar pedido'
                )}
              </button>
            ) : (
              <a
                className="pedido-submit pedido-whatsapp imp-enviar"
                href={whatsappLink(mensajeWhatsapp())}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  const error = validarImpresion();
                  if (error) {
                    e.preventDefault();
                    setFormError(error);
                  }
                }}
              >
                <MessageCircle size={19} aria-hidden="true" />
                Enviar por WhatsApp
              </a>
            )}
          </div>

          <div className="imp-resumen-escritorio">{resumen}</div>
        </form>
      </div>
    </main>
  );
}

export default ImprimirPage;
