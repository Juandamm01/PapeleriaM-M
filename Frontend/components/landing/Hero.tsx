import React from 'react';
import { motion } from 'framer-motion';
import { CloudUpload } from 'lucide-react';
import { FadeIn, BouncyHover, SectionHighlight } from './animations';
import { hasApi, whatsappLink } from '../../src/api';
import '../../styles/Hero.css';

type HeroProps = {
  onUploadClick: () => void;
};

const WHATSAPP_PEDIDO_URL = whatsappLink('Hola, quiero imprimir un documento');

const Hero: React.FC<HeroProps> = ({ onUploadClick }) => {
  return (
    <SectionHighlight id="inicio" className="hero-section snap-section" zIndex={10} sticky={false}>
      <motion.div 
        className="hero-content"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <FadeIn delay={0.1} direction="up">
          <div className="badge">
            Fotocopias e impresiones
          </div>
        </FadeIn>

        <FadeIn delay={0.2} direction="up">
          <h1 className="title">
            <span className="title-cyan">Imprime tus trabajos</span>
            <span className="title-magenta">fácil y rápido</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3} direction="up">
          <p className="subtitle">
            Sube tu archivo y recógelo en minutos. Sin filas, sin
            complicaciones. Calidad profesional para tus mejores proyectos.
          </p>
        </FadeIn>

        <FadeIn delay={0.4} direction="up">
          <div className="button-group">
            <BouncyHover scale={1.05}>
              {hasApi ? (
                <button className="btn btn-primary" type="button" onClick={onUploadClick}>
                  <CloudUpload size={20} />
                  Subir Archivo
                </button>
              ) : (
                <a
                  className="btn btn-primary"
                  href={WHATSAPP_PEDIDO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CloudUpload size={20} />
                  Subir Archivo
                </a>
              )}
            </BouncyHover>
            
            <BouncyHover scale={1.05}>
              <button className="btn btn-secondary">
                Ver Precios
              </button>
            </BouncyHover>
          </div>
        </FadeIn>
      </motion.div>
    </SectionHighlight>

  );
};

export default Hero;
