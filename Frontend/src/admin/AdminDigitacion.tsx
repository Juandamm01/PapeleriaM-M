import { useCallback, useEffect, useState } from 'react';
import { formatoPesos } from '../api';
import { descargarProtegido, pedirJson } from './descargar';

type Estado = 'RECIBIDO' | 'EN_REVISION' | 'COTIZADO' | 'ACEPTADO' | 'FINALIZADO' | 'CANCELADO';
type Solicitud = {
  id: string;
  codigo: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  tipoTrabajo: string;
  descripcion: string;
  paginasAprox: number | null;
  formatoEntrega: string;
  fechaLimite: string | null;
  observaciones: string | null;
  archivos: { nombre: string; tipo: string }[] | null;
  estado: Estado;
  precioCentavos: number | null;
  notaCliente: string | null;
  aceptadaAt: string | null;
  archivosEliminadosAt: string | null;
  createdAt: string;
};
type Respuesta = { items: Solicitud[]; total: number; page: number; totalPages: number };

const ETIQUETAS: Record<Estado, string> = {
  RECIBIDO: 'Recibido',
  EN_REVISION: 'En revisión',
  COTIZADO: 'Cotizado',
  ACEPTADO: 'Aceptado',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

// Mismas transiciones que valida el servidor (digitacion.service.ts)
const TRANSICIONES: Record<Estado, Estado[]> = {
  RECIBIDO: ['EN_REVISION', 'COTIZADO', 'CANCELADO'],
  EN_REVISION: ['RECIBIDO', 'COTIZADO', 'CANCELADO'],
  COTIZADO: ['EN_REVISION', 'ACEPTADO', 'CANCELADO'],
  ACEPTADO: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: ['ACEPTADO'],
  CANCELADO: ['RECIBIDO'],
};

const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const fechaCorta = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

type Borrador = { precio: string; nota: string };

export default function AdminDigitacion({ onSesionVencida }: { onSesionVencida: () => void }) {
  const [filtro, setFiltro] = useState<Estado | ''>('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState('');
  const [borradores, setBorradores] = useState<Record<string, Borrador>>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    const params = new URLSearchParams({ page: String(pagina) });
    if (filtro) params.set('estado', filtro);
    pedirJson<Respuesta>(`/digitacion?${params}`, {}, 'No se pudieron cargar las solicitudes.')
      .then((r) => {
        if (!activo) return;
        if (r === null) onSesionVencida();
        else setDatos(r);
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : 'Error de conexión.'))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [filtro, pagina, version, onSesionVencida]);

  const recargar = useCallback(() => {
    setCargando(true);
    setVersion((v) => v + 1);
  }, []);

  const borrador = (s: Solicitud): Borrador =>
    borradores[s.id] ?? {
      precio: s.precioCentavos ? String(Math.round(s.precioCentavos / 100)) : '',
      nota: s.notaCliente ?? '',
    };

  const editar = (s: Solicitud, campo: keyof Borrador, valor: string) =>
    setBorradores((actual) => ({ ...actual, [s.id]: { ...borrador(s), [campo]: valor } }));

  async function guardar(s: Solicitud, estado?: Estado) {
    const b = borrador(s);
    const cuerpo: Record<string, unknown> = {};
    const precio = b.precio.replace(/\D/g, '');
    const bloqueado = s.estado === 'ACEPTADO' || s.estado === 'FINALIZADO';
    if (!bloqueado && precio && Number(precio) * 100 !== s.precioCentavos) cuerpo.precio = Number(precio);
    if (b.nota.trim() !== (s.notaCliente ?? '')) cuerpo.notaCliente = b.nota.trim();
    if (estado && estado !== s.estado) cuerpo.estado = estado;
    if (Object.keys(cuerpo).length === 0) return;
    if (estado === 'CANCELADO' && !window.confirm(`¿Cancelar la solicitud ${s.codigo}?`)) return;
    setGuardando(s.id);
    setError('');
    try {
      const r = await pedirJson<Solicitud>(
        `/digitacion/${s.id}`,
        { method: 'PATCH', body: JSON.stringify(cuerpo) },
        'No se pudo guardar la solicitud.',
      );
      if (r === null) return onSesionVencida();
      setDatos((actual) =>
        actual ? { ...actual, items: actual.items.map((x) => (x.id === s.id ? { ...x, ...r } : x)) } : actual,
      );
      setBorradores((actual) => {
        const copia = { ...actual };
        delete copia[s.id];
        return copia;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la solicitud.');
    } finally {
      setGuardando('');
    }
  }

  async function descargar(s: Solicitud, indice: number, nombre: string) {
    setError('');
    try {
      const r = await descargarProtegido(`/digitacion/${s.id}/archivos/${indice}`, `${s.codigo}-${nombre}`);
      if (r === 'sesion') onSesionVencida();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el archivo.');
    }
  }

  const avisoCotizacion = (s: Solicitud) =>
    s.telefono && s.precioCentavos
      ? `https://wa.me/57${s.telefono}?text=${encodeURIComponent(
          `Hola ${s.nombre}, la cotización de tu solicitud de digitación ${s.codigo} es ${formatoPesos(s.precioCentavos)}. ` +
            `Puedes aceptarla aquí: ${window.location.origin}/digitacion?codigo=${s.codigo}`,
        )}`
      : null;

  return (
    <section className="admin-orders-card" aria-labelledby="dg-admin-titulo">
      <div className="admin-orders-toolbar">
        <div>
          <h2 id="dg-admin-titulo">Solicitudes de digitación</h2>
          <p>{datos ? `${datos.total} solicitudes` : 'Cargando…'}</p>
        </div>
        <div className="admin-toolbar-controls">
          <label className="admin-filter">
            <span>Estado</span>
            <select
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value as Estado | '');
                setPagina(1);
                setCargando(true);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(ETIQUETAS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-download-button admin-secondary-button" type="button" onClick={recargar} disabled={cargando}>
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <p className="admin-error admin-banner" role="alert">
          {error}
        </p>
      )}

      {cargando && !datos ? (
        <p className="admin-table-message">Cargando solicitudes…</p>
      ) : datos && datos.items.length === 0 ? (
        <p className="admin-table-message">No hay solicitudes para este filtro.</p>
      ) : (
        <ul className="admin-dg-lista">
          {datos?.items.map((s) => {
            const b = borrador(s);
            const bloqueado = s.estado === 'ACEPTADO' || s.estado === 'FINALIZADO';
            const aviso = avisoCotizacion(s);
            return (
              <li key={s.id} className="admin-dg-item">
                <div className="admin-dg-cabecera">
                  <div>
                    <strong className="admin-code">{s.codigo}</strong>
                    <small>{fecha.format(new Date(s.createdAt))}</small>
                  </div>
                  <span className={`admin-status admin-dg-${s.estado.toLowerCase()}`}>{ETIQUETAS[s.estado]}</span>
                </div>
                <div className="admin-dg-cuerpo">
                  <div>
                    <strong>{s.nombre}</strong>
                    {s.telefono && <small>{s.telefono}</small>}
                    {s.correo && <a href={`mailto:${s.correo}`}>{s.correo}</a>}
                  </div>
                  <div>
                    <strong>{s.tipoTrabajo}</strong>
                    <small>
                      {s.formatoEntrega}
                      {s.paginasAprox ? ` · ~${s.paginasAprox} págs.` : ''}
                      {s.fechaLimite ? ` · para el ${fechaCorta.format(new Date(s.fechaLimite))}` : ''}
                    </small>
                  </div>
                </div>
                <p className="admin-dg-descripcion">{s.descripcion}</p>
                {s.observaciones && <p className="admin-dg-obs">Obs.: {s.observaciones}</p>}
                {s.archivos && s.archivos.length > 0 && (
                  <div className="admin-dg-archivos">
                    {s.archivosEliminadosAt ? (
                      <small>Archivos borrados el {fecha.format(new Date(s.archivosEliminadosAt))}</small>
                    ) : (
                      s.archivos.map((a, i) => (
                        <button
                          key={`${s.id}-${i}`}
                          type="button"
                          className="admin-download-button admin-secondary-button"
                          onClick={() => void descargar(s, i, a.nombre)}
                        >
                          {a.nombre}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <div className="admin-dg-acciones">
                  <label className="admin-filter">
                    <span>Precio ($)</span>
                    <input
                      inputMode="numeric"
                      value={b.precio}
                      disabled={bloqueado}
                      onChange={(e) => editar(s, 'precio', e.target.value)}
                      placeholder="Ej. 15000"
                    />
                  </label>
                  <label className="admin-filter admin-dg-nota">
                    <span>Nota para el cliente</span>
                    <input value={b.nota} maxLength={500} onChange={(e) => editar(s, 'nota', e.target.value)} placeholder="Opcional" />
                  </label>
                  <button
                    className="admin-download-button"
                    type="button"
                    onClick={() => void guardar(s)}
                    disabled={guardando === s.id || !borradores[s.id]}
                  >
                    Guardar
                  </button>
                </div>
                <div className="admin-dg-estados">
                  {TRANSICIONES[s.estado].map((destino) => (
                    <button
                      key={destino}
                      type="button"
                      className={destino === 'CANCELADO' ? 'admin-link-button' : 'admin-download-button admin-secondary-button'}
                      disabled={guardando === s.id}
                      onClick={() => void guardar(s, destino)}
                    >
                      {destino === 'COTIZADO' ? 'Enviar cotización' : `Pasar a ${ETIQUETAS[destino].toLowerCase()}`}
                    </button>
                  ))}
                  {s.estado === 'COTIZADO' && aviso && (
                    <a className="admin-whatsapp-link" href={aviso} target="_blank" rel="noopener noreferrer">
                      Enviar cotización por WhatsApp
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {datos && datos.totalPages > 1 && (
        <nav className="admin-pagination" aria-label="Paginación de solicitudes">
          <button
            type="button"
            onClick={() => {
              setPagina((p) => Math.max(1, p - 1));
              setCargando(true);
            }}
            disabled={pagina <= 1 || cargando}
          >
            Anterior
          </button>
          <span>
            Página {pagina} de {datos.totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              setPagina((p) => Math.min(datos.totalPages, p + 1));
              setCargando(true);
            }}
            disabled={pagina >= datos.totalPages || cargando}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  );
}
