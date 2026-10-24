// Punto único de configuración para hablar con el backend y con WhatsApp.

/** URL del backend sin "/" final. Vacía si VITE_API_URL no está definida. */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

/** true solo si hay un backend configurado; sin él, los pedidos se hacen por WhatsApp. */
export const hasApi = API_URL !== '';

export const apiUrl = (path: string) => `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

export const WHATSAPP_NUMERO = '573138395365';
export const WHATSAPP_VISIBLE = '313 839 5365';
export const NEQUI_NUMERO = '313 839 5365';

export const whatsappLink = (texto: string) =>
  `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;

/** Extrae el mensaje de error que devuelve Nest ({ message: string | string[] }). */
export async function responseMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message)) return body.message.join(' ');
  } catch {
    return fallback;
  }
  return fallback;
}
