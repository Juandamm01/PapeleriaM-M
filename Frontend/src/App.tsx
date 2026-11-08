import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import LandingPage from './LandingPage';

// La landing carga de inmediato; el resto de páginas se descarga solo cuando se visitan.
const ImprimirPage = lazy(() => import('./imprimir/ImprimirPage'));
const PreciosPage = lazy(() => import('./PreciosPage'));
const DigitacionPage = lazy(() => import('./DigitacionPage'));
const RastreoPage = lazy(() => import('./RastreoPage'));
const PrivacidadPage = lazy(() => import('./PrivacidadPage'));
const AdminLogin = lazy(() => import('./admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const NotFoundPage = lazy(() => import('./NotFoundPage'));

const Cargando = () => (
  <div className="pagina-cargando" role="status" aria-live="polite">
    <span className="pagina-cargando__punto" />
    <span className="sr-only">Cargando…</span>
  </div>
);

function App() {
  return (
    // reducedMotion="user": framer-motion omite transformaciones si el sistema pide menos movimiento
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/imprimir" element={<ImprimirPage />} />
            <Route path="/precios" element={<PreciosPage />} />
            <Route path="/digitacion" element={<DigitacionPage />} />
            <Route path="/rastreo" element={<RastreoPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}

export default App;
