import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Copy, FileText, LoaderCircle, MessageCircle, Search, Upload, X } from 'lucide-react';
import { apiUrl, formatoPesos, hasApi, responseMessage, whatsappLink } from './api';
import { correoValido, extension, normalizarTelefono } from './imprimir/validacion';
import '../styles/PedidoModal.css';
import '../styles/Imprimir.css';
import '../styles/Paginas.css';

// Deben coincidir con Backend/src/digitacion/dto/digitacion.dto.ts
const TIPOS_TRABAJO = [
  'Trabajo escolar o universitario',
  'Hoja de vida',
  'Carta o documento formal',
  'Tabla o cuadro en Excel',
  'Transcripción de manuscrito',
  'Otro',
] as const;
const FORMATOS_ENTREGA = ['Impreso', 'Archivo Word', 'Archivo PDF', 'Impreso y archivo digital'] as const;
const MAX_ARCHIVOS = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'];

type Estado = 'RECIBIDO' | 'EN_REVISION' | 'COTIZADO' | 'ACEPTADO' | 'FINALIZADO' | 'CANCELADO';
type Solicitud = {
  codigo: string;
  tipoTrabajo: string;
  formatoEntrega: string;
  paginasAprox: number | null;
  fechaLimite: string | null;
  estado: Estado;
  precioCentavos: number | null;
  notaCliente: string | null;
  aceptadaAt: string | null;
  createdAt: string;
};

const PASOS: { estado: Estado; titulo: string }[] = [
  { estado: 'RECIBIDO', titulo: 'Recibido' },
  { estado: 'EN_REVISION', titulo: 'En revisión' },
  { estado: 'COTIZADO', titulo: 'Cotizado' },
  { estado: 'ACEPTADO', titulo: 'Aceptado' },
  { estado: 'FINALIZADO', titulo: 'Finalizado' },
];

const FORMATO_CODIGO = /^DG-[A-Z0-9]{6}$/;
const normalizarCodigo = (v: string) => {
  const limpio = v.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9]{6}$/.test(limpio) ? `DG-${limpio}` : limpio;
};
const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function consultarSolicitud(codigo: string): Promise<Solicitud> {
  const r = await fetch(apiUrl(`/digitacion/seguimiento/${encodeURIComponent(codigo)}`));
  if (r.status === 404) throw new Error('No encontramos una solicitud con ese código.');
  if (r.status === 429) throw new Error('Hiciste muchas consultas seguidas. Espera un minuto.');
  if (!r.ok) throw new Error(await responseMessage(r, 'No pudimos consultar la solicitud.'));
  return (await r.json()) as Solicitud;
}

function Seguimiento({ codigoInicial }: { codigoInicial: string }) {
  const consultaInicial = FORMATO_CODIGO.test(codigoInicial);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(consultaInicial);
  const [aceptando, setAceptando] = useState(false);

  useEffect(() => {
    if (!consultaInicial) return undefined;
    let activo = true;
    consultarSolicitud(codigoInicial)
      .then((s) => activo && setSolicitud(s))
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : 'Error de conexión.'))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [codigoInicial, consultaInicial]);

  const buscar = async (event: FormEvent) => {
    event.preventDefault();
    const c = normalizarCodigo(codigo);
    setSolicitud(null);
    if (!FORMATO_CODIGO.test(c)) {
      setError('Escribe el código tal como te lo dimos, por ejemplo DG-4K7Q2X.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      setSolicitud(await consultarSolicitud(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    } finally {
      setCargando(false);
    }
  };

  const aceptar = async () => {
    if (!solicitud) return;
    setAceptando(true);
    setError('');
    try {
      const r = await fetch(apiUrl(`/digitacion/seguimiento/${encodeURIComponent(solicitud.codigo)}/aceptar`), {
        method: 'POST',
      });
      if (!r.ok) throw new Error(await responseMessage(r, 'No pudimos registrar tu aceptación.'));
      setSolicitud((await r.json()) as Solicitud);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión.');
    } finally {
      setAceptando(false);
    }
  };

  const actual = solicitud ? PASOS.findIndex((p) => p.estado === solicitud.estado) : -1;

  return (
    <section className="imp-paso" aria-labelledby="seg-titulo">
      <h2 id="seg-titulo">
        <span className="imp-paso__num">
          <Search size={16} aria-hidden="true" />
        </span>
        Consulta tu solicitud
      </h2>
      <form className="pg-buscar" onSubmit={buscar} noValidate>
        <label className="pedido-field">
          <span>Código de la solicitud</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="DG-4K7Q2X"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={12}
          />
        </label>
        <button type="submit" className="imp-btn imp-btn--primario" disabled={cargando}>
          {cargando ? <LoaderCircle className="pedido-spinner" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          {cargando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {error && (
        <p className="imp-ayuda is-error" role="alert">
          {error}
        </p>
      )}
      {solicitud && (
        <div className="pg-solicitud" role="status">
          <p className="pg-solicitud__codigo">
            <strong>{solicitud.codigo}</strong>
            <span>
              {solicitud.tipoTrabajo} · {solicitud.formatoEntrega}
            </span>
            <span>Recibida el {fecha.format(new Date(solicitud.createdAt))}</span>
          </p>
          {solicitud.estado === 'CANCELADO' ? (
            <p className="imp-info imp-info--aviso">Esta solicitud fue cancelada. Si fue un error, escríbenos.</p>
          ) : (
            <ol className="pg-estados">
              {PASOS.map((p, i) => (
                <li key={p.estado} className={i < actual ? 'is-hecho' : i === actual ? 'is-actual' : ''}>
                  <span aria-hidden="true">{i < actual ? <Check size={14} /> : i + 1}</span>
                  {p.titulo}
                </li>
              ))}
            </ol>
          )}
          {solicitud.notaCliente && <p className="pg-nota">“{solicitud.notaCliente}”</p>}
          {solicitud.precioCentavos !== null && (
            <p className="pg-precio">
              Valor: <strong>{formatoPesos(solicitud.precioCentavos)}</strong>
            </p>
          )}
          {solicitud.estado === 'COTIZADO' && solicitud.precioCentavos !== null && (
            <button type="button" className="imp-btn imp-btn--primario" onClick={() => void aceptar()} disabled={aceptando}>
              {aceptando ? <LoaderCircle className="pedido-spinner" size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
              Acepto la cotización
            </button>
          )}
          {solicitud.estado === 'ACEPTADO' && (
            <p className="imp-info imp-info--ok">
              <CheckCircle2 size={16} aria-hidden="true" /> Aceptaste la cotización. Ya estamos trabajando en tu documento.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function DigitacionPage() {
  const [searchParams] = useSearchParams();
  const [codigoInicial] = useState(() => normalizarCodigo(searchParams.get('codigo') ?? ''));
  const [vista, setVista] = useState<'solicitar' | 'consultar'>(codigoInicial ? 'consultar' : 'solicitar');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [errorArchivos, setErrorArchivos] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [creada, setCreada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const agregarArchivos = (event: ChangeEvent<HTMLInputElement>) => {
    const nuevos = Array.from(event.target.files ?? []);
    event.target.value = '';
    const todos = [...archivos, ...nuevos];
    if (todos.length > MAX_ARCHIVOS) {
      setErrorArchivos(`Puedes adjuntar hasta ${MAX_ARCHIVOS} archivos.`);
      return;
    }
    const malo = todos.find((f) => !EXTENSIONES.includes(extension(f.name)) || f.size > MAX_BYTES);
    if (malo) {
      setErrorArchivos(
        malo.size > MAX_BYTES
          ? `"${malo.name}" supera los 10 MB.`
          : `"${malo.name}" no es un formato permitido (PDF, Word, Excel o foto).`,
      );
      return;
    }
    setErrorArchivos('');
    setArchivos(todos);
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nombre = String(form.get('nombre') ?? '').trim();
    const telefono = normalizarTelefono(String(form.get('telefono') ?? ''));
    const correo = String(form.get('correo') ?? '').trim();
    const tipoTrabajo = String(form.get('tipoTrabajo') ?? '');
    const descripcion = String(form.get('descripcion') ?? '').trim();
    const paginasAprox = String(form.get('paginasAprox') ?? '').trim();
    const formatoEntrega = String(form.get('formatoEntrega') ?? '');
    const fechaLimite = String(form.get('fechaLimite') ?? '').trim();
    const observaciones = String(form.get('observaciones') ?? '').trim();

    let mensaje = '';
    if (nombre.length < 2) mensaje = 'Escribe tu nombre.';
    else if (telefono === null) mensaje = 'El celular debe tener 10 dígitos y empezar por 3.';
    else if (correo && !correoValido(correo)) mensaje = 'Escribe un correo electrónico válido.';
    else if (!telefono && !correo) mensaje = 'Déjanos un celular o un correo para enviarte la cotización.';
    else if (!tipoTrabajo) mensaje = 'Elige el tipo de trabajo.';
    else if (descripcion.length < 10) mensaje = 'Cuéntanos con un poco más de detalle qué necesitas (mínimo 10 caracteres).';
    else if (paginasAprox && (!/^\d+$/.test(paginasAprox) || Number(paginasAprox) < 1 || Number(paginasAprox) > 1000)) {
      mensaje = 'Las páginas aproximadas deben ser un número entre 1 y 1000.';
    } else if (!formatoEntrega) mensaje = 'Elige cómo quieres recibir el trabajo.';
    else if (fechaLimite && fechaLimite < hoyLocal()) mensaje = 'La fecha límite debe ser hoy o una fecha futura.';
    else if (!acepta) mensaje = 'Debes autorizar el tratamiento de tus datos para enviar la solicitud.';
    if (mensaje) {
      setError(mensaje);
      return;
    }

    const body = new FormData();
    body.append('nombre', nombre);
    if (telefono) body.append('telefono', telefono);
    if (correo) body.append('correo', correo);
    body.append('tipoTrabajo', tipoTrabajo);
    body.append('descripcion', descripcion);
    if (paginasAprox) body.append('paginasAprox', paginasAprox);
    body.append('formatoEntrega', formatoEntrega);
    if (fechaLimite) body.append('fechaLimite', fechaLimite);
    if (observaciones) body.append('observaciones', observaciones);
    body.append('aceptaPolitica', 'true');
    archivos.forEach((a) => body.append('archivos', a));

    setEnviando(true);
    setError('');
    try {
      const r = await fetch(apiUrl('/digitacion'), { method: 'POST', body });
      if (r.status === 429) throw new Error('Enviaste varias solicitudes seguidas. Espera unos minutos o escríbenos.');
      if (!r.ok) throw new Error(await responseMessage(r, 'No pudimos enviar la solicitud. Revisa los datos.'));
      const resultado = (await r.json()) as { codigo: string };
      setCreada(resultado.codigo);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  if (creada) {
    return (
      <main className="imp-page">
        <div className="imp-exito" role="status">
          <span className="imp-exito__icono" aria-hidden="true">
            <CheckCircle2 size={40} />
          </span>
          <p className="imp-kicker">Solicitud enviada</p>
          <h1>¡Recibimos tu solicitud!</h1>
          <p>La revisamos y te enviamos la cotización. Con este código puedes ver el estado y aceptarla:</p>
          <div className="pedido-code">
            <strong>{creada}</strong>
            <button type="button" onClick={() => void copiar(creada)}>
              {copiado ? <Check size={16} /> : <Copy size={16} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="imp-exito__acciones">
            <Link
              className="imp-btn imp-btn--primario"
              to={`/digitacion?codigo=${encodeURIComponent(creada)}`}
              reloadDocument
            >
              Ver estado de la solicitud
            </Link>
            <a
              className="imp-btn imp-btn--whatsapp"
              href={whatsappLink(`Hola, envié la solicitud de digitación ${creada}`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" /> Avisar por WhatsApp
            </a>
          </div>
          <Link className="imp-volver" to="/">
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="imp-page">
      <div className="imp-contenedor pg-contenedor">
        <Link className="imp-volver" to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </Link>
        <header className="imp-encabezado">
          <p className="imp-kicker">Digitación</p>
          <h1>Nosotros lo escribimos por ti</h1>
          <p>
            Trabajos, hojas de vida, cartas, tablas o transcripción de manuscritos. Cuéntanos qué necesitas, revisamos
            tu solicitud y te enviamos el valor antes de empezar.
          </p>
        </header>

        {!hasApi ? (
          <section className="imp-paso">
            <h2>Pídela por WhatsApp</h2>
            <p className="imp-ayuda">
              Por ahora recibimos las solicitudes de digitación por WhatsApp. Envíanos fotos o el archivo del material y
              te cotizamos.
            </p>
            <a
              className="imp-btn imp-btn--whatsapp"
              href={whatsappLink('Hola, quiero cotizar un trabajo de digitación')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} aria-hidden="true" /> Escribir por WhatsApp
            </a>
          </section>
        ) : (
          <>
            <div className="pg-pestanas" role="tablist" aria-label="Digitación">
              <button
                type="button"
                role="tab"
                id="tab-solicitar"
                aria-controls="panel-solicitar"
                aria-selected={vista === 'solicitar'}
                className={vista === 'solicitar' ? 'is-activa' : ''}
                onClick={() => setVista('solicitar')}
              >
                Nueva solicitud
              </button>
              <button
                type="button"
                role="tab"
                id="tab-consultar"
                aria-controls="panel-consultar"
                aria-selected={vista === 'consultar'}
                className={vista === 'consultar' ? 'is-activa' : ''}
                onClick={() => setVista('consultar')}
              >
                Consultar estado
              </button>
            </div>

            {vista === 'consultar' ? (
              <div role="tabpanel" id="panel-consultar" aria-labelledby="tab-consultar">
                <Seguimiento codigoInicial={codigoInicial} />
              </div>
            ) : (
              <form
                className="imp-pasos"
                role="tabpanel"
                id="panel-solicitar"
                aria-labelledby="tab-solicitar"
                onSubmit={enviar}
                noValidate
              >
                <section className="imp-paso" aria-labelledby="dg-trabajo">
                  <h2 id="dg-trabajo">
                    <span className="imp-paso__num">1</span> El trabajo
                  </h2>
                  <div className="pedido-fields-grid">
                    <label className="pedido-field">
                      <span>
                        Tipo de trabajo <em>*</em>
                      </span>
                      <select name="tipoTrabajo" defaultValue="" required>
                        <option value="" disabled>
                          Elige una opción
                        </option>
                        {TIPOS_TRABAJO.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label className="pedido-field">
                      <span>
                        ¿Cómo lo quieres recibir? <em>*</em>
                      </span>
                      <select name="formatoEntrega" defaultValue="" required>
                        <option value="" disabled>
                          Elige una opción
                        </option>
                        {FORMATOS_ENTREGA.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label className="pedido-field pedido-field-wide">
                      <span>
                        ¿Qué necesitas? <em>*</em>
                      </span>
                      <textarea
                        name="descripcion"
                        rows={4}
                        minLength={10}
                        maxLength={2000}
                        placeholder="Ej.: transcribir 6 hojas de un cuaderno a Word, con títulos y tabla de contenido."
                        required
                      />
                    </label>
                    <label className="pedido-field">
                      <span>Páginas aproximadas</span>
                      <input name="paginasAprox" type="number" inputMode="numeric" min={1} max={1000} placeholder="Opcional" />
                    </label>
                    <label className="pedido-field">
                      <span>¿Para cuándo lo necesitas?</span>
                      <input name="fechaLimite" type="date" min={hoyLocal()} />
                    </label>
                    <label className="pedido-field pedido-field-wide">
                      <span>Observaciones</span>
                      <textarea name="observaciones" rows={2} maxLength={500} placeholder="Normas APA, tipo de letra, márgenes…" />
                    </label>
                  </div>

                  <div className="pg-archivos">
                    <input
                      className="pedido-file-input"
                      id="dg-archivos"
                      type="file"
                      multiple
                      accept={EXTENSIONES.join(',')}
                      onChange={agregarArchivos}
                      disabled={archivos.length >= MAX_ARCHIVOS}
                    />
                    <label className="pedido-file-dropzone" htmlFor="dg-archivos" aria-disabled={archivos.length >= MAX_ARCHIVOS}>
                      <span className="pedido-file-icon" aria-hidden="true">
                        <Upload size={22} />
                      </span>
                      <span className="pedido-file-copy">
                        <strong>Material de referencia</strong>
                        <small>Fotos o archivos · hasta {MAX_ARCHIVOS}, 10 MB cada uno (opcional)</small>
                      </span>
                      <span className="pedido-file-action">Adjuntar</span>
                    </label>
                    {archivos.length > 0 && (
                      <ul className="pg-lista-archivos">
                        {archivos.map((a, i) => (
                          <li key={`${a.name}-${i}`}>
                            <FileText size={16} aria-hidden="true" />
                            <span>{a.name}</span>
                            <button
                              type="button"
                              className="imp-icono-btn"
                              aria-label={`Quitar ${a.name}`}
                              onClick={() => setArchivos((actual) => actual.filter((_, j) => j !== i))}
                            >
                              <X size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errorArchivos && <span className="pedido-error">{errorArchivos}</span>}
                  </div>
                </section>

                <section className="imp-paso" aria-labelledby="dg-datos">
                  <h2 id="dg-datos">
                    <span className="imp-paso__num">2</span> ¿Cómo te contactamos?
                  </h2>
                  <div className="pedido-fields-grid">
                    <label className="pedido-field pedido-field-wide">
                      <span>
                        Nombre <em>*</em>
                      </span>
                      <input name="nombre" autoComplete="name" maxLength={100} required />
                    </label>
                    <label className="pedido-field">
                      <span>Celular</span>
                      <input name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="3XX XXX XXXX" />
                    </label>
                    <label className="pedido-field">
                      <span>Correo</span>
                      <input name="correo" type="email" autoComplete="email" maxLength={160} placeholder="tu@correo.com" />
                    </label>
                  </div>
                  <p className="imp-ayuda">Necesitamos al menos uno de los dos para enviarte la cotización.</p>
                  <label className="pedido-consent">
                    <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} required />
                    <span>
                      Autorizo el tratamiento de mis datos para gestionar esta solicitud, según la{' '}
                      <Link to="/privacidad" target="_blank" rel="noopener noreferrer">
                        política de privacidad
                      </Link>
                      . <em>*</em>
                    </span>
                  </label>
                </section>

                {error && (
                  <p className="pedido-form-error" role="alert">
                    {error}
                  </p>
                )}
                <button className="pedido-submit imp-enviar" type="submit" disabled={enviando}>
                  {enviando ? (
                    <>
                      <LoaderCircle className="pedido-spinner" size={19} /> Enviando…
                    </>
                  ) : (
                    'Enviar solicitud'
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default DigitacionPage;
