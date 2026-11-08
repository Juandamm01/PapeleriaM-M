import { useEffect, useState, type FormEvent } from 'react';
import type { Tarifas } from '../compartido/precios';
import { pedirJson } from './descargar';

type DiaHorario = { abierto: boolean; desde: string; hasta: string };
type Horarios = {
  dias: DiaHorario[];
  duracionFranjaMinutos: number;
  capacidadPorFranja: number;
  diasAnticipacion: number;
  anticipacionMinimaMinutos: number;
  fechasCerradas: string[];
};
type Configuracion = { tarifas: Tarifas; horarios: Horarios; updatedAt: string };

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type TarifasForm = {
  precioPaginaBn: string;
  precioPaginaColor: string;
  recargoOficio: string;
  cargoFijo: string;
  limitePaginasPedido: string;
  descuentos: { desdePaginas: string; porcentaje: string }[];
};

const aTexto = (v: number | null) => (v === null ? '' : String(v));
const aFormulario = (t: Tarifas): TarifasForm => ({
  precioPaginaBn: aTexto(t.precioPaginaBn),
  precioPaginaColor: aTexto(t.precioPaginaColor),
  recargoOficio: String(t.recargoOficio),
  cargoFijo: String(t.cargoFijo),
  limitePaginasPedido: String(t.limitePaginasPedido),
  descuentos: t.descuentos.map((d) => ({ desdePaginas: String(d.desdePaginas), porcentaje: String(d.porcentaje) })),
});

const entero = (v: string) => Number(v.replace(/\D/g, '') || '0');

export default function AdminConfiguracion({ onSesionVencida }: { onSesionVencida: () => void }) {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [tarifas, setTarifas] = useState<TarifasForm | null>(null);
  const [horarios, setHorarios] = useState<Horarios | null>(null);
  const [fechasTexto, setFechasTexto] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState<'' | 'tarifas' | 'horarios'>('');

  useEffect(() => {
    let activo = true;
    pedirJson<Configuracion>('/configuracion', {}, 'No se pudo cargar la configuración.')
      .then((c) => {
        if (!activo) return;
        if (c === null) return onSesionVencida();
        setConfig(c);
        setTarifas(aFormulario(c.tarifas));
        setHorarios(c.horarios);
        setFechasTexto(c.horarios.fechasCerradas.join(', '));
      })
      .catch((e: unknown) => activo && setError(e instanceof Error ? e.message : 'Error de conexión.'));
    return () => {
      activo = false;
    };
  }, [onSesionVencida]);

  async function guardarTarifas(event: FormEvent) {
    event.preventDefault();
    if (!tarifas) return;
    setGuardando('tarifas');
    setError('');
    setMensaje('');
    const cuerpo: Tarifas = {
      precioPaginaBn: tarifas.precioPaginaBn.trim() === '' ? null : entero(tarifas.precioPaginaBn),
      precioPaginaColor: tarifas.precioPaginaColor.trim() === '' ? null : entero(tarifas.precioPaginaColor),
      recargoOficio: entero(tarifas.recargoOficio),
      cargoFijo: entero(tarifas.cargoFijo),
      limitePaginasPedido: entero(tarifas.limitePaginasPedido),
      descuentos: tarifas.descuentos
        .filter((d) => d.desdePaginas.trim() || d.porcentaje.trim())
        .map((d) => ({ desdePaginas: entero(d.desdePaginas), porcentaje: entero(d.porcentaje) })),
    };
    try {
      const r = await pedirJson<{ tarifas: Tarifas; updatedAt: string }>(
        '/configuracion/tarifas',
        { method: 'PUT', body: JSON.stringify(cuerpo) },
        'No se pudieron guardar las tarifas.',
      );
      if (r === null) return onSesionVencida();
      setTarifas(aFormulario(r.tarifas));
      setConfig((c) => (c ? { ...c, tarifas: r.tarifas, updatedAt: r.updatedAt } : c));
      setMensaje('Tarifas guardadas. Los pedidos nuevos ya se cotizan con estos valores.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las tarifas.');
    } finally {
      setGuardando('');
    }
  }

  async function guardarHorarios(event: FormEvent) {
    event.preventDefault();
    if (!horarios) return;
    setGuardando('horarios');
    setError('');
    setMensaje('');
    const fechasCerradas = fechasTexto
      .split(/[\s,;]+/)
      .map((f) => f.trim())
      .filter(Boolean);
    try {
      const r = await pedirJson<{ horarios: Horarios; updatedAt: string }>(
        '/configuracion/horarios',
        { method: 'PUT', body: JSON.stringify({ ...horarios, fechasCerradas }) },
        'No se pudieron guardar los horarios.',
      );
      if (r === null) return onSesionVencida();
      setHorarios(r.horarios);
      setFechasTexto(r.horarios.fechasCerradas.join(', '));
      setMensaje('Horarios de recogida guardados.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los horarios.');
    } finally {
      setGuardando('');
    }
  }

  if (!config || !tarifas || !horarios) {
    return (
      <section className="admin-orders-card">
        {error ? (
          <p className="admin-error admin-banner" role="alert">
            {error}
          </p>
        ) : (
          <p className="admin-table-message">Cargando configuración…</p>
        )}
      </section>
    );
  }

  const cambiarDia = (i: number, cambio: Partial<DiaHorario>) =>
    setHorarios((h) => (h ? { ...h, dias: h.dias.map((d, j) => (j === i ? { ...d, ...cambio } : d)) } : h));
  const cambiarNumero = (campo: keyof Omit<Horarios, 'dias' | 'fechasCerradas'>, valor: string) =>
    setHorarios((h) => (h ? { ...h, [campo]: entero(valor) } : h));

  return (
    <div className="admin-config">
      {(error || mensaje) && (
        <p className={`admin-banner ${error ? 'admin-error' : 'admin-ok'}`} role={error ? 'alert' : 'status'}>
          {error || mensaje}
        </p>
      )}

      <form className="admin-orders-card admin-config-card" onSubmit={guardarTarifas}>
        <h2>Tarifas de impresión</h2>
        <p className="admin-config-ayuda">
          Valores en pesos por cara impresa (tamaño carta). Deja vacío un precio para que ese tipo se cotice a mano.
          Los pedidos que ya existen conservan su precio.
        </p>
        <div className="admin-config-grid">
          <label className="admin-filter">
            <span>Blanco y negro</span>
            <input inputMode="numeric" value={tarifas.precioPaginaBn} onChange={(e) => setTarifas({ ...tarifas, precioPaginaBn: e.target.value })} placeholder="Sin configurar" />
          </label>
          <label className="admin-filter">
            <span>Color</span>
            <input inputMode="numeric" value={tarifas.precioPaginaColor} onChange={(e) => setTarifas({ ...tarifas, precioPaginaColor: e.target.value })} placeholder="Sin configurar" />
          </label>
          <label className="admin-filter">
            <span>Recargo oficio (por cara)</span>
            <input inputMode="numeric" value={tarifas.recargoOficio} onChange={(e) => setTarifas({ ...tarifas, recargoOficio: e.target.value })} />
          </label>
          <label className="admin-filter">
            <span>Cargo fijo por pedido</span>
            <input inputMode="numeric" value={tarifas.cargoFijo} onChange={(e) => setTarifas({ ...tarifas, cargoFijo: e.target.value })} />
          </label>
          <label className="admin-filter">
            <span>Límite de páginas impresas por pedido</span>
            <input inputMode="numeric" value={tarifas.limitePaginasPedido} onChange={(e) => setTarifas({ ...tarifas, limitePaginasPedido: e.target.value })} />
          </label>
        </div>
        <h3>Descuentos por volumen</h3>
        {tarifas.descuentos.map((d, i) => (
          <div className="admin-config-fila" key={i}>
            <label className="admin-filter">
              <span>Desde (páginas impresas)</span>
              <input
                inputMode="numeric"
                value={d.desdePaginas}
                onChange={(e) =>
                  setTarifas({ ...tarifas, descuentos: tarifas.descuentos.map((x, j) => (j === i ? { ...x, desdePaginas: e.target.value } : x)) })
                }
              />
            </label>
            <label className="admin-filter">
              <span>Descuento (%)</span>
              <input
                inputMode="numeric"
                value={d.porcentaje}
                onChange={(e) =>
                  setTarifas({ ...tarifas, descuentos: tarifas.descuentos.map((x, j) => (j === i ? { ...x, porcentaje: e.target.value } : x)) })
                }
              />
            </label>
            <button
              type="button"
              className="admin-link-button"
              onClick={() => setTarifas({ ...tarifas, descuentos: tarifas.descuentos.filter((_, j) => j !== i) })}
            >
              Quitar
            </button>
          </div>
        ))}
        {tarifas.descuentos.length < 5 && (
          <button
            type="button"
            className="admin-download-button admin-secondary-button admin-config-agregar"
            onClick={() => setTarifas({ ...tarifas, descuentos: [...tarifas.descuentos, { desdePaginas: '', porcentaje: '' }] })}
          >
            Agregar descuento
          </button>
        )}
        <button className="admin-primary-button" type="submit" disabled={guardando !== ''}>
          {guardando === 'tarifas' ? 'Guardando…' : 'Guardar tarifas'}
        </button>
      </form>

      <form className="admin-orders-card admin-config-card" onSubmit={guardarHorarios}>
        <h2>Horarios de recogida</h2>
        <p className="admin-config-ayuda">Hora de Colombia, formato 24 h. Las franjas se calculan con estos horarios.</p>
        <div className="admin-config-dias">
          {horarios.dias.map((d, i) => (
            <div className="admin-config-dia" key={DIAS[i]}>
              <label className="admin-config-check">
                <input type="checkbox" checked={d.abierto} onChange={(e) => cambiarDia(i, { abierto: e.target.checked })} />
                <span>{DIAS[i]}</span>
              </label>
              <input type="time" aria-label={`${DIAS[i]}: abre`} value={d.desde} disabled={!d.abierto} onChange={(e) => cambiarDia(i, { desde: e.target.value })} />
              <input type="time" aria-label={`${DIAS[i]}: cierra`} value={d.hasta} disabled={!d.abierto} onChange={(e) => cambiarDia(i, { hasta: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="admin-config-grid">
          <label className="admin-filter">
            <span>Duración de cada franja (min)</span>
            <input inputMode="numeric" value={horarios.duracionFranjaMinutos} onChange={(e) => cambiarNumero('duracionFranjaMinutos', e.target.value)} />
          </label>
          <label className="admin-filter">
            <span>Pedidos por franja</span>
            <input inputMode="numeric" value={horarios.capacidadPorFranja} onChange={(e) => cambiarNumero('capacidadPorFranja', e.target.value)} />
          </label>
          <label className="admin-filter">
            <span>Días que se pueden reservar</span>
            <input inputMode="numeric" value={horarios.diasAnticipacion} onChange={(e) => cambiarNumero('diasAnticipacion', e.target.value)} />
          </label>
          <label className="admin-filter">
            <span>Anticipación mínima (min)</span>
            <input inputMode="numeric" value={horarios.anticipacionMinimaMinutos} onChange={(e) => cambiarNumero('anticipacionMinimaMinutos', e.target.value)} />
          </label>
        </div>
        <label className="admin-filter">
          <span>Fechas cerradas (AAAA-MM-DD, separadas por coma)</span>
          <input value={fechasTexto} onChange={(e) => setFechasTexto(e.target.value)} placeholder="2026-12-25, 2027-01-01" />
        </label>
        <button className="admin-primary-button" type="submit" disabled={guardando !== ''}>
          {guardando === 'horarios' ? 'Guardando…' : 'Guardar horarios'}
        </button>
      </form>
    </div>
  );
}
