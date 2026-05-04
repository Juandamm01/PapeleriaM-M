import React, { ReactNode } from 'react';
import '../../../styles/LogoLoop.css';

interface LogoLoopProps {
  children: ReactNode[];
  speed?: number; // duration in seconds
  direction?: 'left' | 'right';
  gap?: number;
  scaleOnHover?: boolean;
  fadeOut?: boolean;
  fadeOutColor?: string;
  className?: string;
}

export const LogoLoop: React.FC<LogoLoopProps> = ({
  children,
  speed = 20,
  direction = 'left',
  gap = 32,
  scaleOnHover = true,
  fadeOut = true,
  fadeOutColor = 'var(--bg-color)',
  className = ''
}) => {
  return (
    <div 
      className={`logoloop ${scaleOnHover ? 'logoloop--scale-hover' : ''} ${fadeOut ? 'logoloop--fade' : ''} ${className}`}
      style={{
        '--logoloop-gap': `${gap}px`,
        '--logoloop-fadeColor': fadeOutColor,
        '--loop-copies': 4,
      } as React.CSSProperties}
    >
      <div 
        className="logoloop__track" 
        style={{
          animation: `loop-${direction} ${speed}s linear infinite`,
        }}
      >
        <div className="logoloop__list">
          {children.map((child, i) => (
            <div key={`loop-1-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
        <div className="logoloop__list" aria-hidden="true">
          {children.map((child, i) => (
            <div key={`loop-2-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
        <div className="logoloop__list" aria-hidden="true">
          {children.map((child, i) => (
            <div key={`loop-3-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
        <div className="logoloop__list" aria-hidden="true">
          {children.map((child, i) => (
            <div key={`loop-4-${i}`} className="logoloop__item">
              <div className="logoloop__node">{child}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoLoop;
