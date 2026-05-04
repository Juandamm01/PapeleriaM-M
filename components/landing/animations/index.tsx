import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import gsap from 'gsap';

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

// Animación con React Spring
export const BouncyHover: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 1.05 }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const springProps = useSpring({
    transform: isHovered ? `scale(${scale})` : 'scale(1)',
    config: { tension: 300, friction: 10 },
  });

  return (
    <animated.div
      style={{ display: 'inline-block', ...springProps }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </animated.div>
  );
};

// Animación con GSAP
export const GsapReveal: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current) return;
    
    gsap.fromTo(
      elRef.current,
      { opacity: 0, scale: 0.95, y: 30 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 1,
        delay,
        ease: 'power3.out',
      }
    );
  }, [delay]);

  return <div ref={elRef} style={{ width: '100%' }}>{children}</div>;
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
export const SectionHighlight: React.FC<{ children: React.ReactNode; id?: string; className?: string; sticky?: boolean; zIndex?: number }> = ({ children, id, className, sticky = true, zIndex = 1 }) => {
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
        minHeight: sticky ? "100vh" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 0", /* Añadir espacio vertical para respirar */
        backgroundColor: "var(--bg-color)",
        backgroundImage: `
          linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        backgroundAttachment: "fixed",
        zIndex: zIndex,
        willChange: "opacity",
        boxShadow: sticky ? "0 -20px 40px rgba(0,0,0,0.05)" : "none",
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

export * from './LogoLoop';

