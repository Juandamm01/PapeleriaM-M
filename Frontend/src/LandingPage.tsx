import { useState } from 'react';
import Navbar from '../common/Navbar';
import Hero from '../components/landing/Hero';
import PedidoModal from '../components/landing/PedidoModal';
import Nosotros from '../components/landing/Nosotros';
import Servicios from '../components/landing/Servicios';
import Contactanos from '../components/landing/Contactanos';
import Footer from './components/Footer';
import { FloatingParticles, ShapeGrid } from '../components/landing/animations';

function LandingPage() {
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);

  return (
    <>
      <Navbar />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: -1,
          background:
            'radial-gradient(circle at 15% 15%, rgba(0, 210, 255, 0.06) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(255, 0, 127, 0.06) 0%, transparent 40%), linear-gradient(135deg, #ffffff 0%, #f9fbfe 100%)',
          overflow: 'hidden',
        }}
      >
        <ShapeGrid
          speed={0.8}
          squareSize={45}
          direction="diagonal"
          borderColor="rgba(0, 210, 255, 0.25)"
          hoverFillColor="rgba(255, 0, 127, 0.45)"
          shape="square"
          hoverTrailAmount={6}
        />
      </div>
      <FloatingParticles />
      <div className="scroll-container">
        <Hero onUploadClick={() => setIsPedidoModalOpen(true)} />
        <Nosotros />
        <Servicios />
        <Contactanos />
        <Footer />
      </div>
      <PedidoModal
        isOpen={isPedidoModalOpen}
        onClose={() => setIsPedidoModalOpen(false)}
      />
    </>
  );
}

export default LandingPage;
