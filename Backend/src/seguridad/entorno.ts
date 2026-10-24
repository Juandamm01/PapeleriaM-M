/** Falla al arrancar si la configuración de producción es insegura o incompleta. */
export function validarEntorno() {
  const errores: string[] = [];
  const secreto = process.env.JWT_SECRET ?? '';

  if (!process.env.DATABASE_URL) errores.push('DATABASE_URL es obligatoria.');
  if (!secreto) errores.push('JWT_SECRET es obligatoria.');

  if (process.env.NODE_ENV === 'production') {
    if (secreto.length < 32) errores.push('JWT_SECRET debe tener al menos 32 caracteres.');
    if (/replace-with|change-this|example/i.test(secreto)) {
      errores.push('JWT_SECRET todavía tiene el valor de ejemplo.');
    }
    if (!process.env.FRONTEND_URL) errores.push('FRONTEND_URL es obligatoria en producción.');
  }

  if (errores.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errores.join('\n- ')}`);
  }
}

/** FRONTEND_URL admite varias URLs separadas por comas (ej. dominio propio + vercel.app). */
export function origenesPermitidos() {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** Número de proxies de confianza delante de la API (Railway, Render…). 0 en local. */
export function saltosDeProxy() {
  const valor = Number(process.env.TRUST_PROXY ?? 0);
  return Number.isInteger(valor) && valor > 0 ? valor : 0;
}
