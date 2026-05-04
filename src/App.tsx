
import Navbar from '../common/Navbar';
import Hero from '../components/landing/Hero';
import Nosotros from '../components/landing/Nosotros';
import Servicios from '../components/landing/Servicios';
import { FloatingParticles } from '../components/landing/animations';

function App() {
  return (
    <>
      <Navbar />
      <FloatingParticles />
      <main>
        <Hero />
        <Nosotros />
        <Servicios />
      </main>
    </>
  );
}

export default App;
