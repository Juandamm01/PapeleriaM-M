import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { WHATSAPP_VISIBLE, whatsappLink } from './api';
import '../styles/Privacidad.css';

const ULTIMA_ACTUALIZACION = '24 de octubre de 2026';

function PrivacidadPage() {
  return (
    <main className="privacidad-page">
      <div className="privacidad-container">
        <Link className="privacidad-back" to="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </Link>

        <article className="privacidad-card" aria-labelledby="privacidad-title">
          <span className="privacidad-kicker">Internet Impre-Copias M&amp;M</span>
          <h1 id="privacidad-title">Política de tratamiento de datos personales</h1>
          <p className="privacidad-meta">Última actualización: {ULTIMA_ACTUALIZACION}</p>

          <p>
            En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, esta política explica qué
            datos recogemos cuando haces un pedido en este sitio, para qué los usamos y cómo puedes ejercer tus
            derechos.
          </p>

          <h2>Responsable</h2>
          <p>
            Internet Impre-Copias M&amp;M, papelería que atiende pedidos de impresión y fotocopias. Canal de
            atención: WhatsApp {WHATSAPP_VISIBLE}.
          </p>

          <h2>Qué datos recogemos</h2>
          <ul>
            <li>Nombre, correo electrónico y, si lo das, tu número de celular.</li>
            <li>El archivo que subes para imprimir y las notas del pedido.</li>
            <li>Si pagas con Nequi, la referencia y el comprobante que adjuntes.</li>
          </ul>
          <p>
            No pedimos datos sensibles. Si el archivo que subes los contiene (por ejemplo, una copia de tu
            documento), solo lo usamos para imprimirlo.
          </p>

          <h2>Para qué los usamos</h2>
          <ul>
            <li>Preparar e imprimir tu pedido y confirmar el pago.</li>
            <li>Avisarte cuando esté listo y resolver dudas sobre él.</li>
            <li>Mostrarte el estado del pedido con su código, sin exponer tus datos.</li>
          </ul>
          <p>No vendemos tus datos ni los usamos para publicidad.</p>

          <h2>Cuánto tiempo los guardamos</h2>
          <p>
            Los archivos y comprobantes se borran automáticamente 7 días después de entregado el pedido y, en
            cualquier caso, a los 30 días de haberlo recibido. Los datos del pedido (nombre, contacto y estado)
            se conservan como registro de la atención.
          </p>

          <h2>Tus derechos</h2>
          <p>Como titular puedes, en cualquier momento:</p>
          <ul>
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Pedir prueba de la autorización que nos diste.</li>
            <li>Saber cómo hemos usado tus datos.</li>
            <li>Revocar la autorización o pedir que suprimamos tus datos cuando no exista un deber legal de conservarlos.</li>
            <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
          </ul>

          <h2>Cómo ejercerlos</h2>
          <p>
            Escríbenos por{' '}
            <a href={whatsappLink('Hola, quiero hacer una consulta sobre mis datos personales')} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>{' '}
            indicando tu nombre y, si lo tienes, el código de tu pedido. Respondemos consultas en máximo 10 días
            hábiles y reclamos en máximo 15 días hábiles, como lo establece la ley.
          </p>

          <h2>Seguridad</h2>
          <p>
            El acceso a los pedidos está restringido al personal de la papelería con usuario y contraseña. Los
            archivos se validan al subirlos y se guardan en servidores con acceso controlado. Para alojar el sitio
            y los archivos podemos usar proveedores de servicios en la nube que actúan como encargados del
            tratamiento.
          </p>

          <h2>Autorización</h2>
          <p>
            Al marcar la casilla de autorización antes de enviar un pedido, aceptas el tratamiento de tus datos
            según esta política. Guardamos la fecha y hora en que la aceptaste.
          </p>
        </article>
      </div>
    </main>
  );
}

export default PrivacidadPage;
