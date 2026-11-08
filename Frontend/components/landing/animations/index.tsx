import React from 'react';
import { motion } from 'framer-motion';

// Animación con Framer Motion
export const FadeIn: React.FC<{ children: React.ReactNode; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' | 'none' }> = ({ children, delay = 0, direction = 'up' }) => {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

// Animación de aparición al hacer scroll (Framer Motion - Estilo Premium)
export const ScrollReveal: React.FC<{ children: React.ReactNode; direction?: 'up' | 'down' | 'left' | 'right' | 'none'; delay?: number; blur?: boolean; scale?: boolean; once?: boolean }> = ({ children, direction = 'up', delay = 0, blur = true, scale = true, once = true }) => {
  const directions = {
    up: { y: 100, x: 0 },
    down: { y: -100, x: 0 },
    left: { x: 100, y: 0 },
    right: { x: -100, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        ...directions[direction],
        ...(blur && { filter: 'blur(20px)' }),
        ...(scale && { scale: 0.8 })
      }}
      whileInView={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        ...(blur && { filter: 'blur(0px)' }),
        ...(scale && { scale: 1 })
      }}
      viewport={{ once: once, margin: "-15%" }}
      transition={{
        duration: 1.2,
        delay,
        type: "spring" as const,
        stiffness: 50,
        damping: 15,
      }}
    >
      {children}
    </motion.div>
  );
};

// Animación de aparición de texto (Palabra por palabra - Estilo Profesional)
export const TextReveal: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className, delay = 0 }) => {
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.div
      style={{ display: "flex", flexWrap: "wrap", overflow: "hidden" }}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.2 }}
      className={className}
    >
      {words.map((word, index) => (
        <motion.span
          variants={child}
          style={{ marginRight: "5px" }}
          key={index}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

// Animación de resaltado de sección (Apilamiento fijo/sticky - Refinado)
export const SectionHighlight: React.FC<{ 
  children: React.ReactNode; 
  id?: string; 
  className?: string; 
  sticky?: boolean; 
  zIndex?: number;
  usePaperBg?: boolean;
  padding?: string;
  align?: 'center' | 'flex-start';
}> = ({ 
  children, 
  id, 
  className, 
  sticky = true, 
  zIndex = 1,
  usePaperBg = false,
  padding,
  align = 'center'
}) => {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ 
        opacity: 0,
      }}
      whileInView={{ 
        opacity: 1, 
      }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ 
        duration: 0.8,
        ease: "easeOut"
      }}
      style={{
        position: sticky ? "sticky" : "relative",
        top: 0,
        width: "100%",
        display: "flex",
        alignItems: align,
        justifyContent: "center",
        ...(padding ? { padding } : {}),
        background: usePaperBg 
          ? 'radial-gradient(circle at 15% 15%, rgba(0, 210, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(255, 0, 127, 0.05) 0%, transparent 40%), linear-gradient(to right, rgba(0, 210, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 210, 255, 0.08) 1px, transparent 1px), linear-gradient(135deg, #ffffff 0%, #f9fbfe 100%)'
          : "transparent",
        backgroundSize: usePaperBg 
          ? "100% 100%, 100% 100%, 45px 45px, 45px 45px, 100% 100%" 
          : "auto",
        zIndex: zIndex,
        boxShadow: sticky ? "0 -30px 60px rgba(0,0,0,0.08)" : "none",
        borderTop: sticky && zIndex > 10 ? "1px solid rgba(255, 255, 255, 0.9)" : "none",
      }}
    >
      {children}
    </motion.section>
  );
};

// Elementos flotantes para dar una sensación orgánica
export const FloatingParticles: React.FC = () => {
  return (
    <div className="particles-container" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            rotate: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: "absolute",
            width: `${100 + i * 50}px`,
            height: `${100 + i * 50}px`,
            borderRadius: "50%",
            background: i % 2 === 0 ? "rgba(0, 210, 255, 0.03)" : "rgba(255, 0, 127, 0.03)",
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 20}%`,
            filter: "blur(40px)"
          }}
        />
      ))}
    </div>
  );
};

export { LogoLoop } from './LogoLoop';
export { default as ShapeGrid } from './ShapeGrid';
