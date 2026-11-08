import React, { type ReactNode } from 'react';
import '../../../styles/LogoLoop.css';

interface LogoLoopProps {
  children: ReactNode[];
  speed?: number; // duración de una vuelta en segundos
  direction?: 'left' | 'right';
  gap?: number;
  scaleOnHover?: boolean;
  fadeOut?: boolean;
  fadeOutColor?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Marquesina infinita. No es un contenedor de scroll: el desborde horizontal
 * se recorta con overflow-x: clip (sin barras ni scrollLeft que reiniciar) y
 * los bordes se desvanecen con una máscara para que el corte sea intencional.
 */
export const LogoLoop: React.FC<LogoLoopProps> = ({
  children,
  speed = 20,
  direction = 'left',
  gap = 32,
  scaleOnHover = true,
  fadeOut = true,
  fadeOutColor = 'var(--bg-color)',
  className = '',
  ariaLabel,
}) => {
  return (
    <div
      className={`logoloop ${scaleOnHover ? 'logoloop--scale-hover' : ''} ${fadeOut ? 'logoloop--fade' : ''} ${className}`}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      style={{
        '--logoloop-gap': `${gap}px`,
        '--logoloop-fadeColor': fadeOutColor,
        '--loop-copies': 2,
      } as React.CSSProperties}
    >
      <div
        className="logoloop__track"
        style={{ animation: `loop-${direction} ${speed}s linear infinite` }}
      >
        <div className="logoloop__list">
          {children.map((child, i) => (
            <div key={`loop-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
        <div className="logoloop__list" aria-hidden="true" inert>
          {children.map((child, i) => (
            <div key={`loop-copy-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoLoop;
