import { useEffect } from 'react';
import Navbar from '../common/Navbar';
import Hero from '../components/landing/Hero';

import Nosotros from '../components/landing/Nosotros';
import Servicios from '../components/landing/Servicios';
import Contactanos from '../components/landing/Contactanos';
import Footer from './components/Footer';
import { FloatingParticles, ShapeGrid } from '../components/landing/animations';
import { usePrefiereMenosMovimiento } from './hooks/useMediaQuery';

function LandingPage() {

  const menosMovimiento = usePrefiereMenosMovimiento();

  // El documento es el contenedor de scroll; el snap solo aplica en la landing.
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.add('landing-snap');

    // Al llegar con un ancla (/#servicios), React aún no había pintado la sección
    // cuando el navegador intentó saltar: se resuelve aquí, sin animación.
    const id = decodeURIComponent(window.location.hash.slice(1));
    let frame = 0;
    if (id) {
      frame = window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
    }

    return () => {
      raiz.classList.remove('landing-snap');
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="landing-fondo" aria-hidden="true">
        <ShapeGrid
          speed={menosMovimiento ? 0 : 0.8}
          squareSize={45}
          direction="diagonal"
          borderColor="rgba(0, 210, 255, 0.25)"
          hoverFillColor="rgba(255, 0, 127, 0.45)"
          shape="square"
          hoverTrailAmount={6}
        />
      </div>
      {!menosMovimiento && <FloatingParticles />}
      <main>
        <Hero />
        <Nosotros />
        <Servicios />
        <Contactanos />
      </main>
      <Footer />
    </>
  );
}

export default LandingPage;
