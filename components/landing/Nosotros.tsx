import React from 'react';
import { SectionHighlight, TextReveal, ScrollReveal } from './animations';
import '../../styles/Nosotros.css';

const Nosotros: React.FC = () => {
  return (
    <SectionHighlight id="nosotros" className="nosotros-section" zIndex={20}>
      <div className="nosotros-container">
        
        {/* Left Column - Image with Parallax Hover */}
        <div className="nosotros-image-column">
          <div className="image-wrapper-pro">
            <img 
              src="/InternetM&M.png" 
              alt="Internet y Copias M&M" 
              className="nosotros-image-pro"
            />
          </div>
          <div className="image-badge-bottom">
            <span className="badge-year">Desde 2022</span>
            <span className="badge-text">Creciendo con el barrio</span>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="nosotros-content-column">
          <h2 className="nosotros-title">
            <span className="title-cyan">Nosotros:</span>
          </h2>

          <div className="nosotros-description-container">
            <ScrollReveal direction="up" delay={0.2} blur={true} scale={false}>
              <p className="nosotros-description">
                Este emprendimiento de Papelería M&M nació dando fruto de productividad en la pandemia y ofreciendo servicios de calidad para el barrio.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.4} blur={true} scale={false}>
              <p className="nosotros-description">
                Ofrecemos fotocopias a color o blanco y negro, digitalización de trabajos, certificados, útiles de oficina y escolares, detalles y mucho más para toda la comunidad.
              </p>
            </ScrollReveal>
          </div>

          <div className="stats-container-pro">
            <div className="stat-card-pro">
              <span className="stat-number magenta-text">100%</span>
              <span className="stat-label magenta-text">DISPONIBLES</span>
            </div>
            <div className="stat-card-pro">
              <span className="stat-number cyan-text">100%</span>
              <span className="stat-label cyan-text">PASIÓN</span>
            </div>
          </div>
        </div>

      </div>
    </SectionHighlight>
  );
};

export default Nosotros;
