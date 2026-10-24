import React from 'react';
import { Clock3, Heart, MessageCircle } from 'lucide-react';
import { ScrollReveal, SectionHighlight } from './animations';
import '../../styles/Contactanos.css';

const Contactanos: React.FC = () => {
  return (
    <SectionHighlight
      id="contacto"
      className="contacto-section snap-section"
      zIndex={40}
      usePaperBg={true}
      sticky={false}
      align="flex-start"
    >
      <div className="contacto-container">
        <ScrollReveal direction="down" delay={0.1} blur={true} scale={false}>
          <div className="contacto-heading">
            <h2 className="contacto-title">Contáctanos</h2>
            <p className="contacto-subtitle">
              ¿Necesitas cotizar impresiones, enviar un documento urgente o preguntar por nuestros suministros?
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.2} blur={true} scale={true}>
          <a
            className="whatsapp-card"
            href="https://wa.me/573138395365"
            target="_blank"
            rel="noreferrer"
            aria-label="Chatea con nosotros por WhatsApp"
          >
            <span className="whatsapp-icon" aria-hidden="true">
              <MessageCircle size={30} strokeWidth={2.5} />
            </span>
            <span className="whatsapp-label">Chatea con nosotros</span>
            <span className="whatsapp-number">313 839 5365</span>
          </a>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.35} blur={true} scale={true}>
          <div className="horario-card">
            <div className="horario-heading">
              <Clock3 size={22} strokeWidth={2.5} aria-hidden="true" />
              <h3>Horario de Atención</h3>
            </div>
            <div className="horario-list">
              <div className="horario-row">
                <span>Lunes a Viernes</span>
                <strong>8:00am – 7:00pm</strong>
              </div>
              <div className="horario-row">
                <span>Sábados</span>
                <strong>9:00am – 5:00pm</strong>
              </div>
              <div className="horario-row horario-closed">
                <span>Domingos</span>
                <strong>Cerrado</strong>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="contacto-badge" aria-label="Aquí para ti, como siempre">
          <Heart size={13} fill="currentColor" aria-hidden="true" />
          <span>AQUÍ PARA TI, COMO SIEMPRE</span>
          <Heart size={13} fill="currentColor" aria-hidden="true" />
        </div>
      </div>
    </SectionHighlight>
  );
};

export default Contactanos;
