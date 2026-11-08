import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Printer, Scan, FileCheck, BookOpen, PenTool, ArrowRight } from 'lucide-react';
import { ScrollReveal, SectionHighlight, LogoLoop, FadeIn } from './animations';
import { useMediaQuery } from '../../src/hooks/useMediaQuery';
import '../../styles/Servicios.css';

const serviciosData = [
  {
    id: 5,
    icon: <BookOpen size={32} strokeWidth={2} />,
    title: 'Encuadernación',
    description: 'Presentaciones profesionales para tus trabajos y documentos importantes con espiral o argolla.'
  },
  {
    id: 6,
    icon: <PenTool size={32} strokeWidth={2} />,
    title: 'Diseño Básico',
    description: 'Ajustes y diseño rápido para tarjetas, volantes o documentos antes de imprimir.'
  },
  {
    id: 1,
    icon: <Copy size={32} strokeWidth={2} />,
    title: 'Fotocopias',
    description: 'Copias de alta fidelidad, nítidas y rápidas. Blanco y negro o color en diferentes tamaños de papel.'
  },
  {
    id: 2,
    icon: <Printer size={32} strokeWidth={2} />,
    title: 'Impresiones B/N y Color',
    description: 'Desde documentos escolares hasta volantes publicitarios. Resolución premium para todos tus archivos.'
  },
  {
    id: 3,
    icon: <Scan size={32} strokeWidth={2} />,
    title: 'Escaneo y Digital',
    description: 'Convierte tus documentos físicos a PDF de alta calidad o imágenes en segundos.'
  },
  {
    id: 4,
    icon: <FileCheck size={32} strokeWidth={2} />,
    title: 'Certificados',
    description: 'Trámites rápidos para certificados estudiantiles y documentos legales estándar.'
  },
];

type Servicio = (typeof serviciosData)[number];

const TarjetaServicio: React.FC<{ servicio: Servicio; indice: number }> = ({ servicio, indice }) => (
  <article className={`servicio-card ${indice % 2 === 1 ? 'servicio-card--rosa' : ''}`}>
    <div className="servicio-icon" aria-hidden="true">
      {servicio.icon}
    </div>
    <h3 className="servicio-title">{servicio.title}</h3>
    <p className="servicio-description">{servicio.description}</p>
  </article>
);

/** Móvil o movimiento reducido: carrusel nativo con snap, una tarjeta completa por vista. */
const CarruselServicios: React.FC = () => {
  const pistaRef = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);

  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setActiva(Number((entrada.target as HTMLElement).dataset.indice));
          }
        }
      },
      { root: pista, threshold: 0.6 },
    );
    pista.querySelectorAll('[data-indice]').forEach((nodo) => observador.observe(nodo));
    return () => observador.disconnect();
  }, []);

  const irA = (indice: number) => {
    const pista = pistaRef.current;
    const slide = pista?.querySelector<HTMLElement>(`[data-indice="${indice}"]`);
    if (!pista || !slide) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pista.scrollTo({
      left: slide.offsetLeft - (pista.clientWidth - slide.clientWidth) / 2,
      behavior: reducir ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="servicios-carrusel-wrap">
      <div
        ref={pistaRef}
        className="servicios-carrusel"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Servicios de Papelería M&M"
        tabIndex={0}
      >
        {serviciosData.map((servicio, indice) => (
          <div
            className="servicios-carrusel__slide"
            key={servicio.id}
            data-indice={indice}
            aria-label={`${indice + 1} de ${serviciosData.length}`}
          >
            <TarjetaServicio servicio={servicio} indice={indice} />
          </div>
        ))}
      </div>
      <div className="servicios-dots" role="group" aria-label="Elegir servicio">
        {serviciosData.map((servicio, indice) => (
          <button
            key={servicio.id}
            type="button"
            className={`servicios-dot ${indice === activa ? 'is-activa' : ''}`}
            aria-label={`Ver ${servicio.title}`}
            aria-current={indice === activa ? 'true' : undefined}
            onClick={() => irA(indice)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
};

const Servicios: React.FC = () => {
  // Escritorio/tablet con movimiento permitido: se conserva la marquesina animada.
  const usarMarquesina = useMediaQuery('(min-width: 768px) and (prefers-reduced-motion: no-preference)', true);

  return (
    <SectionHighlight id="servicios" className="servicios-section snap-section" zIndex={30} usePaperBg={true} sticky={false}>
      <div className="servicios-container">

        <FadeIn direction="down" delay={0.1}>
          <h2 className="servicios-main-title sticky-title">
            Nuestros Servicios
          </h2>
        </FadeIn>

        <ScrollReveal direction="up" delay={0.3} blur={true} scale={true}>
          <div className="servicios-loop-container">
            {usarMarquesina ? (
              <LogoLoop
                className="servicios-carousel"
                speed={45}
                direction="left"
                gap={28}
                scaleOnHover={true}
                fadeOut={true}
                ariaLabel="Servicios de Papelería M&M"
              >
                {serviciosData.map((servicio, indice) => (
                  <TarjetaServicio servicio={servicio} indice={indice} key={servicio.id} />
                ))}
              </LogoLoop>
            ) : (
              <CarruselServicios />
            )}
          </div>
        </ScrollReveal>

        <FadeIn direction="up" delay={0.45}>
          <div className="servicios-cta">
            <Link className="servicios-cta__btn servicios-cta__btn--primario" to="/imprimir">
              Imprimir en línea
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="servicios-cta__btn" to="/precios">
              Ver precios
            </Link>
            <Link className="servicios-cta__btn" to="/digitacion">
              Pedir digitación
            </Link>
          </div>
        </FadeIn>

      </div>
    </SectionHighlight>
  );
};

export default Servicios;
