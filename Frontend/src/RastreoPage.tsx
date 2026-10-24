import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, LoaderCircle, PackageCheck, Search } from 'lucide-react';
import { apiUrl, formatoPesos, hasApi, responseMessage, whatsappLink } from './api';
import PagoNequi from './PagoNequi';
import '../styles/Rastreo.css';

type EstadoPedido = 'PENDIENTE' | 'LISTO' | 'ENTREGADO';

type PedidoRastreo = {
  codigo: string;
  estado: EstadoPedido;
  copias: number;
  tamano: 'CARTA' | 'OFICIO';
  tipoImpresion: 'BN' | 'COLOR';
  dobleCara: boolean;
  metodoPago: 'NEQUI' | 'EFECTIVO';
  precioCentavos: number | null;
  estadoPago: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'EXPIRADO' | 'ANULADO';
  createdAt: string;
};

const PASOS: { estado: EstadoPedido; titulo: string; detalle: string; Icono: typeof Clock }[] = [
  { estado: 'PENDIENTE', titulo: 'En cola', detalle: 'Recibimos tu archivo y lo vamos a imprimir.', Icono: Clock },
  { estado: 'LISTO', titulo: '¡Listo para recoger!', detalle: 'Pasa por él en nuestro horario de atención.', Icono: CheckCircle2 },
  { estado: 'ENTREGADO', titulo: 'Entregado', detalle: 'Gracias por imprimir con nosotros.', Icono: PackageCheck },
];

const FORMATO_CODIGO = /^MM-[A-Z0-9]{6}$/;
const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

const normalizar = (valor: string) => {
  const limpio = valor.trim().toUpperCase().replace(/\s+/g, '');
  return /^[A-Z0-9]{6}$/.test(limpio) ? `MM-${limpio}` : limpio;
};

async function buscarPedido(codigo: string): Promise<PedidoRastreo> {
  const response = await fetch(apiUrl(`/pedidos/rastreo/${encodeURIComponent(codigo)}`));
  if (response.status === 404) {
    throw new Error('No encontramos un pedido con ese código. Revisa que esté bien escrito.');
  }
  if (response.status === 429) {
    throw new Error('Hiciste muchas consultas seguidas. Espera un minuto y vuelve a intentarlo.');
  }
  if (!response.ok) {
    throw new Error(await responseMessage(response, 'No pudimos consultar tu pedido.'));
  }
  return (await response.json()) as PedidoRastreo;
}

const mensajeDeError = (error: unknown) =>
  error instanceof Error ? error.message : 'No pudimos conectar con el servidor.';

function RastreoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Código con el que se abrió la página (?codigo=...), fijo durante la visita
  const [codigoInicial] = useState(() => normalizar(searchParams.get('codigo') ?? ''));
  const consultaInicial = hasApi && FORMATO_CODIGO.test(codigoInicial);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [pedido, setPedido] = useState<PedidoRastreo | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(consultaInicial);

  useEffect(() => {
    if (!consultaInicial) return undefined;
    let activo = true;
    buscarPedido(codigoInicial)
      .then((resultado) => activo && setPedido(resultado))
      .catch((consultaError: unknown) => activo && setError(mensajeDeError(consultaError)))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [codigoInicial, consultaInicial]);

  const consultar = async (valor: string) => {
    const buscado = normalizar(valor);
    setPedido(null);
    if (!FORMATO_CODIGO.test(buscado)) {
      setError('Escribe el código tal como te lo dimos, por ejemplo MM-4K7Q2X.');
      return;
    }
    setError('');
    setCargando(true);
    setSearchParams({ codigo: buscado }, { replace: true });
    try {
      setPedido(await buscarPedido(buscado));
    } catch (consultaError) {
      setError(mensajeDeError(consultaError));
    } finally {
      setCargando(false);
    }
  };

  const marcarPagado = useCallback(
    () => setPedido((actual) => (actual ? { ...actual, estadoPago: 'APROBADO' } : actual)),
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void consultar(codigo);
  };

  const pasoActual = pedido ? PASOS.findIndex((paso) => paso.estado === pedido.estado) : -1;

  return (
    <main className="rastreo-page">
      <div className="rastreo-container">
        <Link className="rastreo-back" to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </Link>

        <section className="rastreo-card" aria-labelledby="rastreo-title">
          <span className="rastreo-kicker">Internet Impre-Copias M&amp;M</span>
          <h1 id="rastreo-title">Rastrea tu pedido</h1>

          {hasApi ? (
            <>
              <p className="rastreo-intro">
                Escribe el código que te mostramos al enviar tu archivo.
              </p>
              <form className="rastreo-form" onSubmit={handleSubmit} noValidate>
                <label className="rastreo-label" htmlFor="rastreo-codigo">
                  Código del pedido
                </label>
                <div className="rastreo-input-row">
                  <input
                    id="rastreo-codigo"
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value)}
                    placeholder="MM-4K7Q2X"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={12}
                    aria-describedby={error ? 'rastreo-error' : undefined}
                  />
                  <button type="submit" disabled={cargando}>
                    {cargando ? (
                      <LoaderCircle className="rastreo-spinner" size={18} aria-hidden="true" />
                    ) : (
                      <Search size={18} aria-hidden="true" />
                    )}
                    {cargando ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
              </form>

              {error && (
                <p id="rastreo-error" className="rastreo-error" role="alert">
                  {error}
                </p>
              )}

              {pedido && (
                <div className="rastreo-resultado" role="status">
                  <div className="rastreo-resumen">
                    <strong>{pedido.codigo}</strong>
                    <span>Recibido el {formatoFecha.format(new Date(pedido.createdAt))}</span>
                    <span>
                      {pedido.copias} {pedido.copias === 1 ? 'copia' : 'copias'} ·{' '}
                      {pedido.tamano === 'CARTA' ? 'Carta' : 'Oficio'} ·{' '}
                      {pedido.tipoImpresion === 'BN' ? 'Blanco y negro' : 'Color'} ·{' '}
                      {pedido.dobleCara ? 'Doble cara' : 'Una cara'}
                    </span>
                  </div>

                  <ol className="rastreo-pasos">
                    {PASOS.map(({ estado, titulo, detalle, Icono }, index) => {
                      const clase =
                        index < pasoActual ? 'is-done' : index === pasoActual ? 'is-current' : 'is-next';
                      return (
                        <li key={estado} className={`rastreo-paso ${clase}`}>
                          <span className="rastreo-paso-icono" aria-hidden="true">
                            <Icono size={20} />
                          </span>
                          <span>
                            <strong>{titulo}</strong>
                            {index === pasoActual && <small>{detalle}</small>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  {pedido.estadoPago === 'APROBADO' ? (
                    <p className="rastreo-pagado">
                      Pago recibido
                      {pedido.precioCentavos ? ` · ${formatoPesos(pedido.precioCentavos)}` : ''}
                    </p>
                  ) : pedido.precioCentavos ? (
                    <PagoNequi
                      codigo={pedido.codigo}
                      montoCentavos={pedido.precioCentavos}
                      onPagado={marcarPagado}
                    />
                  ) : (
                    <p className="rastreo-sin-precio">
                      Estamos revisando tu archivo. Cuando tengamos el valor podrás pagarlo aquí con Nequi, o
                      en el local al recoger.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="rastreo-intro">
              Por ahora consultamos los pedidos por WhatsApp. Escríbenos con tu nombre y te
              contamos cómo va.
            </p>
          )}

          <a
            className="rastreo-whatsapp"
            href={whatsappLink(
              pedido ? `Hola, quiero preguntar por mi pedido ${pedido.codigo}` : 'Hola, quiero preguntar por mi pedido',
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            ¿Dudas? Escríbenos por WhatsApp
          </a>
        </section>
      </div>
    </main>
  );
}

export default RastreoPage;
