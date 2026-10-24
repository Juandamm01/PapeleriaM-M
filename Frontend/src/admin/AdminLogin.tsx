import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, hasApi, responseMessage } from '../api';
import { useNoIndexMeta } from './useNoIndexMeta';
import './admin.css';

function AdminLogin() {
  useNoIndexMeta();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasApi) {
      setError('El panel no está disponible: falta configurar VITE_API_URL.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError(
          response.status === 429
            ? 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'
            : response.status === 401
              ? 'Correo o contraseña incorrectos.'
              : await responseMessage(response, 'No se pudo iniciar sesión.'),
        );
        return;
      }
      navigate('/admin', { replace: true });
    } catch {
      setError('No fue posible conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <span className="admin-eyebrow">Papelería M&amp;M</span>
        <h1 id="admin-login-title">Panel administrativo</h1>
        <p>Ingresa con tu cuenta para gestionar los pedidos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Correo electrónico</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <button className="admin-primary-button" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;
