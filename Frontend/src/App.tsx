import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard';
import AdminLogin from './admin/AdminLogin';
import LandingPage from './LandingPage';
import PrivacidadPage from './PrivacidadPage';
import RastreoPage from './RastreoPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/rastreo" element={<RastreoPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
