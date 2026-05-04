import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        setIsScrolled(window.scrollY > 20);
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };
    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  return (
    <AnimatePresence>
      <motion.nav 
        className={`navbar ${isScrolled ? 'scrolled' : ''}`}
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : -100 }}
        transition={{ duration: 0.3 }}
      >
        <div className="navbar-container">
          <div className="navbar-logo">
            <img src="/Logo.png" alt="Logo" />
          </div>

          <div className="navbar-links">
            <a href="#inicio">Inicio</a>
            <a href="#nosotros">Nosotros</a>
            <a href="#servicio">Servicios</a>
            <a href="#contacto">Contacto</a>
          </div>

          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
              <a href="#inicio" className="celeste-link" onClick={() => setMobileMenuOpen(false)}>Inicio</a>
              <a href="#nosotros" className="rosa-link" onClick={() => setMobileMenuOpen(false)}>Nosotros</a>
              <a href="#servicio" className="celeste-link" onClick={() => setMobileMenuOpen(false)}>Servicios</a>
              <a href="#contacto" className="rosa-link" onClick={() => setMobileMenuOpen(false)}>Contacto</a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </AnimatePresence>
  );
};

export default Navbar;
