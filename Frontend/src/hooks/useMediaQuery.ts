import { useSyncExternalStore } from 'react';

/** Suscripción a una media query sin efectos ni renders extra. */
export function useMediaQuery(query: string, valorServidor = false): boolean {
  return useSyncExternalStore(
    (avisar) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const lista = window.matchMedia(query);
      lista.addEventListener('change', avisar);
      return () => lista.removeEventListener('change', avisar);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : valorServidor),
    () => valorServidor,
  );
}

export const usePrefiereMenosMovimiento = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Desplaza hasta una sección respetando prefers-reduced-motion. */
export function irASeccion(id: string, actualizarHash = true): boolean {
  const destino = document.getElementById(id);
  if (!destino) return false;
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  destino.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  if (actualizarHash) {
    window.history.replaceState(null, '', `#${id}`);
  }
  return true;
}
