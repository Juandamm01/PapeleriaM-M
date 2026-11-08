import { apiUrl } from '../api';

/** Descarga un archivo protegido por la sesión del admin. Devuelve 'sesion' si expiró. */
export async function descargarProtegido(ruta: string, nombre: string): Promise<'ok' | 'sesion'> {
  const response = await fetch(apiUrl(ruta), { credentials: 'include' });
  if (response.status === 401) return 'sesion';
  if (response.status === 410) throw new Error('El archivo ya se borró por la política de retención.');
  if (!response.ok) throw new Error('No se pudo descargar el archivo.');
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = nombre;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return 'ok';
}

/** Llamada JSON autenticada. Lanza Error con el mensaje del servidor; null si la sesión expiró. */
export async function pedirJson<T>(ruta: string, init: RequestInit = {}, fallback = 'No se pudo completar la acción.'): Promise<T | null> {
  const response = await fetch(apiUrl(ruta), {
    credentials: 'include',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...(init.headers ?? {}) } : init.headers,
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    let mensaje = fallback;
    try {
      const cuerpo = (await response.json()) as { message?: string | string[] };
      if (typeof cuerpo.message === 'string') mensaje = cuerpo.message;
      else if (Array.isArray(cuerpo.message)) mensaje = cuerpo.message.join(' ');
    } catch {
      // se deja el mensaje por defecto
    }
    throw new Error(mensaje);
  }
  return (await response.json()) as T;
}
