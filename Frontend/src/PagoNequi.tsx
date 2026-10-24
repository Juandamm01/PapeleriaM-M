import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, LoaderCircle, Smartphone, XCircle } from 'lucide-react';
import { apiUrl, formatoPesos, responseMessage } from './api';
import '../styles/PagoNequi.css';

type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EXPIRADO' | 'ANULADO';

type VistaPago = {
  referencia: string;
  codigo: string;
  estado: EstadoPago;
  montoCentavos: number;
  expiraEn: string;
  mensaje?: string;
};

type Contrato = { token: string; permalink: string };
type Contratos = { aceptacion: Contrato; datosPersonales: Contrato };

type PagoNequiProps = {
  codigo: string;
  montoCentavos: number;
  onPagado: () => void;
};

const INTERVALO_SONDEO_MS = 4_000;

const normalizarCelular = (valor: string) => {
  const digitos = valor.replace(/\D/g, '');
  const local = digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
  return /^3\d{9}$/.test(local) ? local : null;
};

const restante = (expiraEn: string, ahora: number) => {
  const ms = Math.max(0, new Date(expiraEn).getTime() - ahora);
  const minutos = Math.floor(ms / 60_000);
  const segundos = Math.floor((ms % 60_000) / 1000);
  return `${minutos}:${String(segundos).padStart(2, '0')}`;
};

async function pedirJson<T>(ruta: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(ruta), init);
  if (response.status === 429) {
    throw new Error('Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentarlo.');
  }
  if (!response.ok) {
    throw new Error(await responseMessage(response, 'No pudimos procesar el pago. Inténtalo de nuevo.'));
  }
  return (await response.json()) as T;
}

/** Cobro con Nequi a través de Wompi: el cliente aprueba la notificación en su app. */
function PagoNequi({ codigo, montoCentavos, onPagado }: PagoNequiProps) {
  const [habilitado, setHabilitado] = useState<boolean | null>(null);
  const [contratos, setContratos] = useState<Contratos | null>(null);
  const [celular, setCelular] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pago, setPago] = useState<VistaPago | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  // Disponibilidad de pagos y contratos de Wompi que el cliente debe aceptar
  useEffect(() => {
    let activo = true;
    pedirJson<{ habilitado: boolean }>('/pagos/config')
      .then(async ({ habilitado: disponible }) => {
        if (!activo) return;
        setHabilitado(disponible);
        if (disponible) {
          const terminos = await pedirJson<Contratos>('/pagos/aceptacion');
          if (activo) setContratos(terminos);
        }
      })
      .catch(() => activo && setHabilitado(false));
    return () => {
      activo = false;
    };
  }, []);

  // Mientras el cliente aprueba en Nequi: consulta el estado y actualiza la cuenta regresiva
  const referenciaPendiente = pago?.estado === 'PENDIENTE' ? pago.referencia : null;
  useEffect(() => {
    if (!referenciaPendiente) return undefined;
    let activo = true;
    const reloj = window.setInterval(() => setAhora(Date.now()), 1000);
    const sondeo = window.setInterval(() => {
      pedirJson<VistaPago>(`/pagos/${encodeURIComponent(referenciaPendiente)}`)
        .then((vista) => {
          if (!activo) return;
          setPago(vista);
          if (vista.estado === 'APROBADO') onPagado();
        })
        .catch(() => {
          // Un fallo puntual de red no corta la espera; se reintenta en el siguiente ciclo
        });
    }, INTERVALO_SONDEO_MS);
    return () => {
      activo = false;
      window.clearInterval(reloj);
      window.clearInterval(sondeo);
    };
  }, [referenciaPendiente, onPagado]);

  const pagar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const telefono = normalizarCelular(celular);
    if (!telefono) {
      setError('Escribe el celular de tu cuenta Nequi (10 dígitos).');
      return;
    }
    if (!contratos || !aceptaTerminos || !aceptaDatos) {
      setError('Para pagar debes aceptar el reglamento y la autorización de datos de Wompi.');
      return;
    }
    setEnviando(true);
    try {
      const vista = await pedirJson<VistaPago>('/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo,
          telefono,
          tokenAceptacion: contratos.aceptacion.token,
          tokenDatosPersonales: contratos.datosPersonales.token,
        }),
      });
      setAhora(Date.now());
      setPago(vista);
      if (vista.estado === 'APROBADO') onPagado();
    } catch (pagoError) {
      setError(pagoError instanceof Error ? pagoError.message : 'No pudimos conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  if (habilitado === null) {
    return (
      <div className="pago-nequi pago-nequi-cargando">
        <LoaderCircle className="pago-nequi-spinner" size={18} aria-hidden="true" /> Cargando opciones de pago…
      </div>
    );
  }

  if (!habilitado) {
    return (
      <div className="pago-nequi">
        <p className="pago-nequi-nota">
          El pago en línea no está disponible en este momento. Puedes pagar en el local al recoger tu pedido.
        </p>
      </div>
    );
  }

  if (pago?.estado === 'APROBADO') {
    return (
      <div className="pago-nequi pago-nequi-final is-ok" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <div>
          <strong>¡Pago aprobado!</strong>
          <span>
            Recibimos {formatoPesos(pago.montoCentavos)} con Nequi. Referencia {pago.referencia}.
          </span>
        </div>
      </div>
    );
  }

  if (pago?.estado === 'PENDIENTE') {
    return (
      <div className="pago-nequi pago-nequi-esperando" role="status" aria-live="polite">
        <Smartphone size={32} aria-hidden="true" />
        <strong>Abre tu app Nequi y aprueba el pago</strong>
        <span className="pago-nequi-monto">{formatoPesos(pago.montoCentavos)}</span>
        <span>Te llegó una notificación. Tienes {restante(pago.expiraEn, ahora)} para aprobarla.</span>
        <span className="pago-nequi-nota">
          <LoaderCircle className="pago-nequi-spinner" size={14} aria-hidden="true" /> Esperando la confirmación
          de Nequi… no cierres esta página.
        </span>
      </div>
    );
  }

  return (
    <form className="pago-nequi" onSubmit={pagar} noValidate>
      {pago && (pago.estado === 'RECHAZADO' || pago.estado === 'EXPIRADO' || pago.estado === 'ANULADO') && (
        <div className="pago-nequi-final is-error" role="alert">
          <XCircle size={22} aria-hidden="true" />
          <span>{pago.mensaje ?? 'El pago no se completó. Puedes intentarlo de nuevo.'}</span>
        </div>
      )}

      <div className="pago-nequi-total">
        <span>Total a pagar</span>
        <strong>{formatoPesos(montoCentavos)}</strong>
      </div>

      <label className="pago-nequi-campo">
        <span>Celular de tu cuenta Nequi</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="3XX XXX XXXX"
          value={celular}
          onChange={(event) => setCelular(event.target.value)}
        />
      </label>

      {contratos ? (
        <>
          <label className="pago-nequi-check">
            <input type="checkbox" checked={aceptaTerminos} onChange={(event) => setAceptaTerminos(event.target.checked)} />
            <span>
              Acepto el{' '}
              <a href={contratos.aceptacion.permalink} target="_blank" rel="noopener noreferrer">
                reglamento de usuario de Wompi
              </a>
              .
            </span>
          </label>
          <label className="pago-nequi-check">
            <input type="checkbox" checked={aceptaDatos} onChange={(event) => setAceptaDatos(event.target.checked)} />
            <span>
              Autorizo a Wompi el{' '}
              <a href={contratos.datosPersonales.permalink} target="_blank" rel="noopener noreferrer">
                tratamiento de mis datos personales
              </a>
              .
            </span>
          </label>
        </>
      ) : (
        <p className="pago-nequi-nota">Cargando los términos de Wompi…</p>
      )}

      {error && (
        <p className="pago-nequi-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={enviando || !contratos}>
        {enviando ? (
          <>
            <LoaderCircle className="pago-nequi-spinner" size={18} aria-hidden="true" /> Enviando a Nequi…
          </>
        ) : (
          `Pagar ${formatoPesos(montoCentavos)} con Nequi`
        )}
      </button>
      <p className="pago-nequi-nota">Pago procesado por Wompi (Bancolombia). Recibirás una notificación en Nequi.</p>
    </form>
  );
}

export default PagoNequi;
