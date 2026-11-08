import { useEffect, useState } from 'react';
import { apiUrl, hasApi } from '../api';
import { TARIFAS_VACIAS, type Tarifas } from '../compartido/precios';

export type Franja = { inicio: string; fin: string; etiqueta: string; cupos: number; disponible: boolean };
export type DiaDisponible = { fecha: string; nombre: string; franjas: Franja[] };

type Estado<T> = { estado: 'cargando' } | { estado: 'listo'; datos: T } | { estado: 'error' };

const normalizarTarifas = (valor: unknown): Tarifas => {
  const t = (valor ?? {}) as Partial<Tarifas>;
  return {
    ...TARIFAS_VACIAS,
    ...t,
    descuentos: Array.isArray(t.descuentos) ? t.descuentos : [],
  };
};

/** Tarifas públicas (las mismas que usa el servidor para cotizar). */
export function useTarifas(): Estado<Tarifas> | { estado: 'sin-api' } {
  const [estado, setEstado] = useState<Estado<Tarifas>>({ estado: 'cargando' });
  useEffect(() => {
    if (!hasApi) return undefined;
    const control = new AbortController();
    fetch(apiUrl('/configuracion/publica'), { signal: control.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const cuerpo = (await r.json()) as { tarifas?: unknown };
        setEstado({ estado: 'listo', datos: normalizarTarifas(cuerpo.tarifas) });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== 'AbortError') setEstado({ estado: 'error' });
      });
    return () => control.abort();
  }, []);
  return hasApi ? estado : { estado: 'sin-api' };
}

/** Franjas de recogida con cupo, calculadas por el servidor. */
export function useFranjas(): Estado<DiaDisponible[]> & { recargar: () => void } {
  const [estado, setEstado] = useState<Estado<DiaDisponible[]>>({ estado: 'cargando' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!hasApi) return undefined;
    const control = new AbortController();
    fetch(apiUrl('/recogida/franjas'), { signal: control.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const dias = (await r.json()) as DiaDisponible[];
        setEstado({ estado: 'listo', datos: Array.isArray(dias) ? dias : [] });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== 'AbortError') setEstado({ estado: 'error' });
      });
    return () => control.abort();
  }, [version]);
  return { ...estado, recargar: () => setVersion((v) => v + 1) };
}
