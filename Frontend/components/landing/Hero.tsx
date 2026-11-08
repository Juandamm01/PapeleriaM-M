import React from 'react';
import { motion } from 'framer-motion';
import { CloudUpload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FadeIn, SectionHighlight } from './animations';
import '../../styles/Hero.css';

const Hero: React.FC = () => {
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
            <Link className="btn btn-primary" to="/imprimir">
              <CloudUpload size={20} aria-hidden="true" />
              Subir Archivo
            </Link>
            <Link className="btn btn-secondary" to="/precios">
              Ver Precios
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.55} direction="up">
          <ul className="hero-beneficios" aria-label="Beneficios">
            <li>Sin filas</li>
            <li>Paga con Nequi o en efectivo</li>
            <li>Recoge a la hora que elijas</li>
          </ul>
        </FadeIn>
      </motion.div>
    </SectionHighlight>

  );
};

export default Hero;
