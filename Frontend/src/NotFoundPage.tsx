import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNoIndexMeta } from './admin/useNoIndexMeta';
import '../styles/NotFound.css';

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
};

const elemento: Variants = {
  oculto: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/** Impresora con una hoja que se queda a medio salir. Solo SVG + CSS (sin imágenes). */
const Impresora = () => (
  <div className="nf-impresora" aria-hidden="true">
    <svg className="nf-impresora__svg" viewBox="0 0 320 300" role="presentation">
      {/* bandeja de entrada de papel (detrás) */}
      <rect x="92" y="18" width="136" height="70" rx="8" className="nf-papel-atras" />
      {/* cuerpo */}
      <rect x="28" y="78" width="264" height="118" rx="26" className="nf-cuerpo" />
      <rect x="28" y="78" width="264" height="40" rx="20" className="nf-cuerpo-brillo" />
      {/* panel */}
      <rect x="206" y="112" width="62" height="22" rx="11" className="nf-panel" />
      <circle cx="222" cy="123" r="5" className="nf-led nf-led--rosa" />
      <circle cx="240" cy="123" r="5" className="nf-led nf-led--cian" />
      <circle cx="256" cy="123" r="3.5" className="nf-led-apagado" />
      {/* ranura de salida */}
      <rect x="62" y="166" width="196" height="16" rx="8" className="nf-ranura" />
    </svg>

    {/* La hoja sale por la ranura: va en un recorte para que nazca "dentro" de la impresora */}
    <div className="nf-salida">
      <div className="nf-hoja">
        <span className="nf-hoja__num">404</span>
        <span className="nf-hoja__linea" />
        <span className="nf-hoja__linea nf-hoja__linea--corta" />
        <span className="nf-hoja__linea" />
        <span className="nf-hoja__sello">Archivo no encontrado</span>
      </div>
    </div>
    <span className="nf-sombra" />
  </div>
);

function NotFoundPage() {
  useNoIndexMeta();

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Página no encontrada · Papelería M&M';
    return () => {
      document.title = anterior;
    };
  }, []);

  return (
    <main className="nf-page">
      <div className="nf-contenido">
        <motion.div
          className="nf-visual"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Impresora />
        </motion.div>

        <motion.div className="nf-texto" variants={contenedor} initial="oculto" animate="visible">
          <motion.p className="nf-kicker" variants={elemento}>
            <Sparkles size={16} aria-hidden="true" />
            Error 404 · Se quedó en la impresora
          </motion.p>
          <motion.h1 className="nf-titulo" variants={elemento}>
            ¡Ups! Esta página no está en nuestro <span>archivo</span>.
          </motion.h1>
          <motion.p className="nf-descripcion" variants={elemento}>
            Parece que la página que buscas se perdió entre tantos documentos. Pero no te preocupes,
            podemos ayudarte a encontrar el camino.
          </motion.p>
          <motion.div className="nf-acciones" variants={elemento}>
            <Link className="nf-btn nf-btn--primario" to="/">
              <ArrowLeft size={18} aria-hidden="true" />
              Volver al inicio
            </Link>
            <Link className="nf-btn" to="/#servicios">
              Ver nuestros servicios
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}

export default NotFoundPage;
