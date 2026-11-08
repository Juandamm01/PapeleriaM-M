import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { irASeccion } from '../src/hooks/useMediaQuery';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const frameRequest = useRef<number | null>(null);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    // Fuera de la landing (p. ej. /rastreo) el ancla no existe: se deja navegar a "/#id".
    if (!document.getElementById(id)) return;
    event.preventDefault();
    setMobileMenuOpen(false);
    // Tras cerrar el menú móvil se libera el bloqueo de scroll antes de desplazar.
    window.requestAnimationFrame(() => irASeccion(id));
  };

  useEffect(() => {
    const scrollTarget = window;

    const controlNavbar = () => {
      if (frameRequest.current !== null) return;

      frameRequest.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        setIsScrolled(currentScrollY > 20);
        if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
        frameRequest.current = null;
      });
    };

    scrollTarget.addEventListener('scroll', controlNavbar, { passive: true });
    return () => {
      scrollTarget.removeEventListener('scroll', controlNavbar);
      if (frameRequest.current !== null) {
        window.cancelAnimationFrame(frameRequest.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (!mobileMenuOpen) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <AnimatePresence>
      <motion.nav 
        className={`navbar ${isScrolled ? 'scrolled' : ''}`}
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
      >
        <div className="navbar-container">
          <a className="navbar-logo" href="/#inicio" onClick={(event) => handleNavClick(event, 'inicio')} aria-label="Papelería M&M, ir al inicio">
            <img src="/logo-nav.webp" alt="Papelería M&M" width={154} height={112} />
          </a>

          <div className="navbar-links">
            <a href="/#inicio" onClick={(event) => handleNavClick(event, 'inicio')}>Inicio</a>
            <a href="/#nosotros" onClick={(event) => handleNavClick(event, 'nosotros')}>Nosotros</a>
            <a href="/#servicios" onClick={(event) => handleNavClick(event, 'servicios')}>Servicios</a>
            <a href="/#contacto" onClick={(event) => handleNavClick(event, 'contacto')}>Contacto</a>
          </div>

          <button
            className="mobile-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="mobile-menu"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mobile-menu-header">
                <div className="navbar-logo">
                  <img src="/logo-nav.webp" alt="Papelería M&M" width={154} height={112} />
                </div>
                <button
                  className="mobile-close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú"
                  type="button"
                >
                  <X />
                </button>
              </div>

              <nav className="mobile-menu-nav" aria-label="Navegación móvil">
                <a href="/#inicio" className="celeste-link" onClick={(event) => handleNavClick(event, 'inicio')}>Inicio</a>
                <a href="/#nosotros" className="rosa-link" onClick={(event) => handleNavClick(event, 'nosotros')}>Nosotros</a>
                <a href="/#servicios" className="celeste-link" onClick={(event) => handleNavClick(event, 'servicios')}>Servicios</a>
                <a href="/#contacto" className="rosa-link" onClick={(event) => handleNavClick(event, 'contacto')}>Contacto</a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </AnimatePresence>
  );
};

export default Navbar;
