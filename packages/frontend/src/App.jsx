import { Routes, Route, Navigate } from 'react-router-dom';
import MarketingLayout from './layouts/MarketingLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Features from './pages/Features';
import About from './pages/About';
import Contact from './pages/Contact';
import { Login, Signup, ForgotPassword } from './pages/auth';
import { DashboardHome, Settings, ComingSoon } from './pages/app';

function App() {
  return (
    <Routes>
      {/* Marketing pages with shared layout */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Auth pages (use marketing layout for consistent header/footer) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Legacy dashboard redirect */}
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />

      {/* Customer Portal - Protected routes with dashboard layout */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="events" element={<ComingSoon module="events" />} />
        <Route path="animals" element={<ComingSoon module="animals" />} />
        <Route path="inventory" element={<ComingSoon module="inventory" />} />
        <Route path="accounting" element={<ComingSoon module="accounting" />} />
        <Route path="reports" element={<ComingSoon module="reports" />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
