import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, hasApi, responseMessage } from '../api';
import { useNoIndexMeta } from './useNoIndexMeta';
import './admin.css';

type EstadoPedido = 'PENDIENTE' | 'LISTO' | 'ENTREGADO';
type Archivo = 'archivo' | 'comprobante';

type Pedido = {
  id: string;
  codigo: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  notas: string | null;
  archivoNombre: string;
  tipoArchivo: string;
  copias: number;
  tamano: 'CARTA' | 'OFICIO';
  tipoImpresion: 'BN' | 'COLOR';
  dobleCara: boolean;
  metodoPago: 'NEQUI' | 'EFECTIVO';
  referenciaNequi: string | null;
  comprobanteNombre: string | null;
  estado: EstadoPedido;
  archivosEliminadosAt: string | null;
  createdAt: string;
};

type PedidosResponse = {
  items: Pedido[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const STATUS_LABELS: Record<EstadoPedido, string> = {
  PENDIENTE: 'Pendiente',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
};

const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

const especificaciones = (order: Pedido) =>
  [
    `${order.copias} ${order.copias === 1 ? 'copia' : 'copias'}`,
    order.tamano === 'CARTA' ? 'Carta' : 'Oficio',
    order.tipoImpresion === 'BN' ? 'B/N' : 'Color',
    order.dobleCara ? 'Doble cara' : 'Una cara',
  ].join(' · ');

const avisoListo = (order: Pedido) =>
  order.telefono
    ? `https://wa.me/57${order.telefono}?text=${encodeURIComponent(
        `Hola ${order.nombre}, tu pedido ${order.codigo} ya está listo para recoger en Internet Impre-Copias M&M.`,
      )}`
    : null;

function AdminDashboard() {
  useNoIndexMeta();
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('');
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(hasApi ? '' : 'Falta configurar VITE_API_URL.');
  const [downloadingKey, setDownloadingKey] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    if (!hasApi) return undefined;
    let active = true;
    async function checkSession() {
      try {
        const response = await fetch(apiUrl('/auth/me'), { credentials: 'include' });
        if (response.status === 401) {
          navigate('/admin/login', { replace: true });
          return;
        }
        if (!response.ok) throw new Error('No fue posible verificar la sesión.');
        const admin = (await response.json()) as { email: string };
        if (active) {
          setAdminEmail(admin.email);
          setReady(true);
        }
      } catch {
        if (active) {
          setError('No fue posible conectar con el servidor.');
          setLoading(false);
        }
      }
    }
    void checkSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  // Espera a que se deje de escribir antes de buscar
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (statusFilter) params.set('estado', statusFilter);
    if (query) params.set('q', query);
    try {
      const response = await fetch(apiUrl(`/pedidos?${params}`), { credentials: 'include' });
      if (response.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(await responseMessage(response, 'No se pudieron cargar los pedidos.'));
      }
      const data = (await response.json()) as PedidosResponse;
      setOrders(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }, [navigate, page, statusFilter, query]);

  useEffect(() => {
    if (ready) void loadOrders();
  }, [loadOrders, ready]);

  async function changeStatus(order: Pedido, newStatus: EstadoPedido) {
    const oldStatus = order.estado;
    setUpdatingId(order.id);
    setError('');
    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, estado: newStatus } : item)),
    );
    try {
      const response = await fetch(apiUrl(`/pedidos/${order.id}/estado`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (response.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(await responseMessage(response, 'No se pudo actualizar el estado.'));
      }
    } catch (updateError) {
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, estado: oldStatus } : item)),
      );
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado.');
    } finally {
      setUpdatingId('');
    }
  }

  async function download(order: Pedido, tipo: Archivo) {
    const key = `${order.id}:${tipo}`;
    setDownloadingKey(key);
    setError('');
    try {
      const response = await fetch(apiUrl(`/pedidos/${order.id}/${tipo}`), { credentials: 'include' });
      if (response.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo.');
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download =
        tipo === 'archivo'
          ? `${order.codigo}-${order.archivoNombre}`
          : `${order.codigo}-comprobante-${order.comprobanteNombre ?? 'nequi'}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el archivo.');
    } finally {
      setDownloadingKey('');
    }
  }

  async function logout() {
    try {
      const response = await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
      navigate('/admin/login', { replace: true });
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'No se pudo cerrar la sesión.');
    }
  }

  function setFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  if (!ready && !error) {
    return (
      <main className="admin-page">
        <p className="admin-loading">Verificando sesión…</p>
      </main>
    );
  }

  return (
    <main className="admin-page admin-dashboard-page">
      <div className="admin-dashboard">
        <header className="admin-header">
          <div>
            <span className="admin-eyebrow">Papelería M&amp;M</span>
            <h1>Gestión de pedidos</h1>
            <p>{adminEmail}</p>
          </div>
          <button className="admin-logout-button" type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </header>

        <section className="admin-orders-card" aria-labelledby="orders-title">
          <div className="admin-orders-toolbar">
            <div>
              <h2 id="orders-title">Pedidos recibidos</h2>
              <p>{total} pedidos en total</p>
            </div>
            <div className="admin-toolbar-controls">
              <label className="admin-filter admin-search">
                <span>Buscar</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Código, nombre o teléfono"
                />
              </label>
              <label className="admin-filter">
                <span>Estado</span>
                <select value={statusFilter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="">Todos</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="LISTO">Listo</option>
                  <option value="ENTREGADO">Entregado</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <p className="admin-error admin-banner" role="alert">
              {error}
            </p>
          )}

          <div className="admin-table-scroll">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Impresión</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="admin-table-message" colSpan={6}>
                      Cargando pedidos…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td className="admin-table-message" colSpan={6}>
                      No hay pedidos para este filtro.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const aviso = avisoListo(order);
                    return (
                      <tr key={order.id}>
                        <td>
                          <strong className="admin-code">{order.codigo}</strong>
                          <small>{formatoFecha.format(new Date(order.createdAt))}</small>
                        </td>
                        <td>
                          <strong>{order.nombre}</strong>
                          <a href={`mailto:${order.correo}`}>{order.correo}</a>
                          <small>{order.telefono || 'Sin teléfono'}</small>
                          {order.notas && (
                            <details className="admin-notes">
                              <summary>Ver notas</summary>
                              <span>{order.notas}</span>
                            </details>
                          )}
                        </td>
                        <td>
                          <strong>{especificaciones(order)}</strong>
                          <span className="admin-file-name">{order.archivoNombre}</span>
                          {order.archivosEliminadosAt && (
                            <small>
                              Archivos borrados el {formatoFecha.format(new Date(order.archivosEliminadosAt))}
                            </small>
                          )}
                        </td>
                        <td>
                          <strong>{order.metodoPago === 'NEQUI' ? 'Nequi' : 'Efectivo'}</strong>
                          {order.referenciaNequi && <small>Ref. {order.referenciaNequi}</small>}
                          {order.metodoPago === 'NEQUI' && !order.comprobanteNombre && (
                            <small>Sin comprobante</small>
                          )}
                        </td>
                        <td>
                          <span className={`admin-status admin-status-${order.estado.toLowerCase()}`}>
                            {STATUS_LABELS[order.estado]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="admin-download-button"
                              type="button"
                              onClick={() => void download(order, 'archivo')}
                              disabled={Boolean(order.archivosEliminadosAt) || downloadingKey === `${order.id}:archivo`}
                              title={order.archivosEliminadosAt ? 'El archivo ya se borró por la política de retención' : undefined}
                            >
                              {downloadingKey === `${order.id}:archivo` ? 'Descargando…' : 'Descargar archivo'}
                            </button>
                            {order.comprobanteNombre && !order.archivosEliminadosAt && (
                              <button
                                className="admin-download-button admin-secondary-button"
                                type="button"
                                onClick={() => void download(order, 'comprobante')}
                                disabled={downloadingKey === `${order.id}:comprobante`}
                              >
                                {downloadingKey === `${order.id}:comprobante` ? 'Descargando…' : 'Ver comprobante'}
                              </button>
                            )}
                            <select
                              aria-label={`Cambiar estado del pedido ${order.codigo}`}
                              value={order.estado}
                              disabled={updatingId === order.id}
                              onChange={(event) => void changeStatus(order, event.target.value as EstadoPedido)}
                            >
                              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            {order.estado === 'LISTO' && aviso && (
                              <a className="admin-whatsapp-link" href={aviso} target="_blank" rel="noopener noreferrer">
                                Avisar por WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <nav className="admin-pagination" aria-label="Paginación de pedidos">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              Anterior
            </button>
            <span>
              Página {totalPages === 0 ? 0 : page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente
            </button>
          </nav>
        </section>
      </div>
    </main>
  );
}

export default AdminDashboard;
