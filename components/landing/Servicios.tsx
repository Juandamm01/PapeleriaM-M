import React from 'react';
import { Copy, Printer, Scan, FileCheck, BookOpen, PenTool } from 'lucide-react';
import { ScrollReveal, SectionHighlight, LogoLoop, FadeIn } from './animations';
import '../../styles/Servicios.css';

const serviciosData = [
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
  }
];

const Servicios: React.FC = () => {
  const serviceCards = serviciosData.map((servicio) => (
    <div className="servicio-card" key={servicio.id}>
      <div className="servicio-icon">
        {servicio.icon}
      </div>
      <h3 className="servicio-title">{servicio.title}</h3>
      <p className="servicio-description">{servicio.description}</p>
    </div>
  ));

  return (
    <SectionHighlight id="servicio" className="servicios-section" zIndex={30}>
      <div className="servicios-container">
        
        <FadeIn direction="down" delay={0.1}>
          <h2 className="servicios-main-title sticky-title">
            Nuestros Servicios
          </h2>
        </FadeIn>

        <ScrollReveal direction="up" delay={0.3} blur={true} scale={true}>
          <div className="servicios-loop-container">
            <LogoLoop 
              speed={35} 
              direction="left" 
              gap={30} 
              scaleOnHover={true}
              fadeOut={true} 
              fadeOutColor="var(--bg-color)"
            >
              {serviceCards}
            </LogoLoop>
          </div>
        </ScrollReveal>

      </div>
    </SectionHighlight>
  );
};

export default Servicios;
