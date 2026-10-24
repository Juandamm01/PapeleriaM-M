import React, { type ReactNode, useEffect, useRef } from 'react';
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
  const loopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loop = loopRef.current;
    if (!loop) return;

    const resetScroll = () => {
      loop.scrollLeft = 0;
    };

    resetScroll();
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) resetScroll();
    });

    observer.observe(loop);
    const verticalScroller = loop.closest('.scroll-container');
    verticalScroller?.addEventListener('scroll', resetScroll, { passive: true });

    return () => {
      observer.disconnect();
      verticalScroller?.removeEventListener('scroll', resetScroll);
    };
  }, []);

  return (
    <div 
      ref={loopRef}
      className={`logoloop ${scaleOnHover ? 'logoloop--scale-hover' : ''} ${fadeOut ? 'logoloop--fade' : ''} ${className}`}
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
        <div className="logoloop__list" aria-hidden="true">
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
