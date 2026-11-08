import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calculator,
  CheckCircle2,
  Copy,
  FileText,
  LoaderCircle,
  MessageCircle,
  PenTool,
  Printer,
  Scan,
  Sparkles,
  Zap,
} from 'lucide-react';
import { formatoPesos, whatsappLink } from './api';
import { cotizar, type Tarifas } from './compartido/precios';
import { useTarifas } from './imprimir/usarConfiguracion';
import '../styles/Imprimir.css';
import '../styles/Paginas.css';
import '../styles/Precios.css';

const pesos = (valor: number) => formatoPesos(valor * 100);

interface ServicioItem {
  nombre: string;
  detalle: string;
  icono: LucideIcon;
  acento: 'cyan' | 'rosa';
  tag: string;
  enlace?: string;
}

const OTROS_SERVICIOS: ServicioItem[] = [
  {
    nombre: 'Fotocopias',
    detalle: 'Blanco y negro o color, carta y oficio.',
    icono: Copy,
    acento: 'cyan',
    tag: 'Al instante',
  },
  {
    nombre: 'Escaneo a PDF',
    detalle: 'Documentos físicos a PDF o imagen.',
    icono: Scan,
    acento: 'rosa',
    tag: 'Digital',
  },
  {
    nombre: 'Encuadernación',
    detalle: 'Espiral o argolla para tus trabajos.',
    icono: BookOpen,
    acento: 'cyan',
    tag: 'Acabados',
  },
  {
    nombre: 'Digitación',
    detalle: 'Transcribimos o armamos tu documento.',
    icono: FileText,
    acento: 'rosa',
    tag: 'Servicio Web',
    enlace: '/digitacion',
  },
  {
    nombre: 'Certificados',
    detalle: 'Trámites estudiantiles y documentos estándar.',
    icono: Award,
    acento: 'cyan',
    tag: 'Trámites',
  },
  {
    nombre: 'Diseño básico',
    detalle: 'Ajustes rápidos antes de imprimir.',
    icono: PenTool,
    acento: 'rosa',
    tag: 'Personalizado',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

function Calculadora({ tarifas }: { tarifas: Tarifas }) {
  const [paginas, setPaginas] = useState('10');
  const [copias, setCopias] = useState('1');
  const [tipo, setTipo] = useState<'BN' | 'COLOR'>('BN');
  const [tamano, setTamano] = useState<'CARTA' | 'OFICIO'>('CARTA');

  const resultado = useMemo(() => {
    const p = Number(paginas);
    const c = Number(copias);
    if (!Number.isInteger(p) || p < 1 || !Number.isInteger(c) || c < 1) return null;
    return cotizar(tarifas, {
      paginasBn: tipo === 'BN' ? p : 0,
      paginasColor: tipo === 'COLOR' ? p : 0,
      copias: c,
      tamano,
    });
  }, [paginas, copias, tipo, tamano, tarifas]);

  return (
    <section className="imp-paso" aria-labelledby="calc-titulo">
      <h2 id="calc-titulo">
        <span className="imp-paso__num">
          <Calculator size={16} aria-hidden="true" />
        </span>
        Calcula tu impresión
      </h2>
      <div className="pg-calc">
        <label className="pedido-field">
          <span>Páginas</span>
          <input type="number" inputMode="numeric" min={1} value={paginas} onChange={(e) => setPaginas(e.target.value)} />
        </label>
        <label className="pedido-field">
          <span>Copias</span>
          <input type="number" inputMode="numeric" min={1} value={copias} onChange={(e) => setCopias(e.target.value)} />
        </label>
        <div className="pedido-segmented" role="radiogroup" aria-label="Tipo de impresión">
          {(['BN', 'COLOR'] as const).map((v) => (
            <label key={v} className={tipo === v ? 'is-selected' : ''}>
              <input type="radio" name="calc-tipo" checked={tipo === v} onChange={() => setTipo(v)} />
              {v === 'BN' ? 'B/N' : 'Color'}
            </label>
          ))}
        </div>
        <div className="pedido-segmented" role="radiogroup" aria-label="Tamaño">
          {(['CARTA', 'OFICIO'] as const).map((v) => (
            <label key={v} className={tamano === v ? 'is-selected' : ''}>
              <input type="radio" name="calc-tamano" checked={tamano === v} onChange={() => setTamano(v)} />
              {v === 'CARTA' ? 'Carta' : 'Oficio'}
            </label>
          ))}
        </div>
      </div>
      <div className="pg-calc__resultado" aria-live="polite">
        {!resultado ? (
          <p className="imp-ayuda">Escribe páginas y copias mayores que cero.</p>
        ) : resultado.ok ? (
          <>
            <span>Total aproximado</span>
            <strong>{pesos(resultado.total)}</strong>
            {resultado.descuento && <small>Incluye {resultado.descuento.porcentaje}% de descuento por volumen.</small>}
          </>
        ) : (
          <p className="imp-ayuda">{resultado.mensaje}</p>
        )}
      </div>
    </section>
  );
}

function PreciosPage() {
  const estado = useTarifas();
  const tarifas = estado.estado === 'listo' ? estado.datos : null;
  const configuradas = Boolean(tarifas && (tarifas.precioPaginaBn !== null || tarifas.precioPaginaColor !== null));

  return (
    <main className="precios-page">
      {/* Halos de luz ambiental con degradados suaves rosa y cian */}
      <div className="precios-ambient" aria-hidden="true">
        <div className="precios-ambient__glow precios-ambient__glow--cian" />
        <div className="precios-ambient__glow precios-ambient__glow--rosa" />
        <div className="precios-ambient__glow precios-ambient__glow--bottom" />
      </div>

      <motion.div
        className="precios-contenedor"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Retorno */}
        <motion.div variants={itemVariants}>
          <Link className="precios-volver" to="/">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver al inicio</span>
          </Link>
        </motion.div>

        {/* Encabezado */}
        <motion.header className="precios-encabezado" variants={itemVariants}>
          <span className="precios-kicker">
            <span className="precios-kicker__dot" aria-hidden="true" />
            Precios
          </span>
          <h1 className="precios-titulo">
            Lo que cuesta <span className="precios-titulo__acento">imprimir con nosotros</span>
          </h1>
          <p className="precios-descripcion">
            Valores por cara impresa. Cuando subes un PDF, el valor exacto se calcula solo con estas mismas tarifas.
          </p>
        </motion.header>

        {/* Estado de carga */}
        {estado.estado === 'cargando' && (
          <motion.p className="imp-info" variants={itemVariants}>
            <LoaderCircle className="pedido-spinner" size={16} aria-hidden="true" /> Cargando precios…
          </motion.p>
        )}

        {/* Estado con tarifas configuradas */}
        {tarifas && configuradas ? (
          <motion.div variants={itemVariants} className="precios-tarifas-wrapper">
            <div className="precios-tarifas-grid">
              <article className="precios-tarifa-card">
                <span className="precios-tarifa-card__muestra precios-tarifa-card__muestra--bn" aria-hidden="true" />
                <h3>Blanco y negro</h3>
                <p className="precios-tarifa-card__precio">
                  {tarifas.precioPaginaBn === null ? 'Por confirmar' : pesos(tarifas.precioPaginaBn)}
                </p>
                <small>por cara · tamaño carta</small>
              </article>
              <article className="precios-tarifa-card precios-tarifa-card--color">
                <span className="precios-tarifa-card__muestra precios-tarifa-card__muestra--color" aria-hidden="true" />
                <h3>Color</h3>
                <p className="precios-tarifa-card__precio">
                  {tarifas.precioPaginaColor === null ? 'Por confirmar' : pesos(tarifas.precioPaginaColor)}
                </p>
                <small>por cara · tamaño carta</small>
              </article>
            </div>
            <ul className="precios-detalles-lista">
              <li>
                Tamaño oficio: {tarifas.recargoOficio > 0 ? `${pesos(tarifas.recargoOficio)} adicional por cara` : 'mismo precio que carta'}.
              </li>
              {tarifas.cargoFijo > 0 && <li>Cargo por pedido en línea: {pesos(tarifas.cargoFijo)}.</li>}
              {tarifas.descuentos
                .slice()
                .sort((a, b) => a.desdePaginas - b.desdePaginas)
                .map((d) => (
                  <li key={d.desdePaginas}>
                    Desde {d.desdePaginas} páginas impresas: {d.porcentaje}% de descuento.
                  </li>
                ))}
              <li>Pedidos en línea de hasta {tarifas.limitePaginasPedido} páginas impresas; para más, escríbenos.</li>
            </ul>
            <Calculadora tarifas={tarifas} />
          </motion.div>
        ) : estado.estado !== 'cargando' ? (
          /* Estado: Precios por confirmar (Rediseño visual premium) */
          <motion.section
            variants={itemVariants}
            className="precios-card-status"
            aria-labelledby="status-titulo"
          >
            <span className="precios-card-status__linea" aria-hidden="true" />
            <div className="precios-card-status__decoracion" aria-hidden="true" />

            <div className="precios-card-status__header">
              <div className="precios-card-status__icono-box" aria-hidden="true">
                <Printer size={26} strokeWidth={2.2} />
              </div>

              <div className="precios-card-status__textos">
                <span className="precios-card-status__tag">
                  <span className="precios-card-status__tag-pulse" aria-hidden="true" />
                  Tarifas a tu medida
                </span>
                <h2 id="status-titulo">Precios por confirmar</h2>
                <p>
                  Aún no hemos publicado la lista de precios en línea. Escríbenos y te decimos el valor de tu trabajo en
                  minutos.
                </p>
              </div>
            </div>

            <div className="precios-card-status__ventajas">
              <span className="precios-ventaja-chip">
                <Zap size={14} aria-hidden="true" /> Respuesta en minutos
              </span>
              <span className="precios-ventaja-chip">
                <Sparkles size={14} aria-hidden="true" /> Cotización sin compromiso
              </span>
              <span className="precios-ventaja-chip">
                <CheckCircle2 size={14} aria-hidden="true" /> Asesoría directa de papelería
              </span>
            </div>

            <a
              className="precios-btn-whatsapp"
              href={whatsappLink('Hola, quiero saber el precio de unas impresiones')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={20} aria-hidden="true" />
              <span>Preguntar por WhatsApp</span>
            </a>
          </motion.section>
        ) : null}

        {/* Sección: Otros servicios */}
        <motion.section variants={itemVariants} className="precios-otros" aria-labelledby="otros-titulo">
          <div className="precios-otros__header">
            <div className="precios-otros__header-top">
              <Sparkles size={20} className="precios-sparkle-icon" aria-hidden="true" />
              <h2 id="otros-titulo">Otros servicios</h2>
            </div>
            <p>El valor depende del trabajo; te lo cotizamos sin compromiso.</p>
          </div>

          <motion.ul className="precios-servicios-grid" variants={containerVariants}>
            {OTROS_SERVICIOS.map((s) => {
              const Icono = s.icono;
              const esRosa = s.acento === 'rosa';
              return (
                <motion.li
                  key={s.nombre}
                  variants={itemVariants}
                  className={`precios-servicio-card ${esRosa ? 'precios-servicio-card--rosa' : ''}`}
                >
                  <div className="precios-servicio-card__top">
                    <div className="precios-servicio-card__icon-box" aria-hidden="true">
                      <Icono size={20} strokeWidth={2.2} />
                    </div>
                    <span className="precios-servicio-card__tag">{s.tag}</span>
                  </div>

                  <div className="precios-servicio-card__content">
                    <h3 className="precios-servicio-card__titulo">{s.nombre}</h3>
                    <p className="precios-servicio-card__descripcion">{s.detalle}</p>
                  </div>

                  {s.enlace ? (
                    <Link className="precios-servicio-card__link" to={s.enlace}>
                      <span>Pedir cotización</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      className="precios-servicio-card__link"
                      href={whatsappLink(`Hola, quiero cotizar: ${s.nombre}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>Cotizar</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.section>

        {/* CTA para imprimir en línea */}
        <motion.div variants={itemVariants} className="precios-cta-container">
          <Link className="precios-btn-imprimir" to="/imprimir">
            <Printer size={20} aria-hidden="true" />
            <span>Imprimir en línea</span>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

export default PreciosPage;
