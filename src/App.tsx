import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';

import LoginPage            from './pages/LoginPage';
import SignupPage           from './pages/SignupPage';
import DashboardPage        from './pages/DashboardPage';
import EquipmentListPage    from './pages/EquipmentListPage';
import EquipmentDetailPage  from './pages/EquipmentDetailPage';
import AdminDashboardPage   from './pages/AdminDashboardPage';
import QRPrintPage          from './pages/QRPrintPage';
import Navbar               from './components/Navbar';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-foam flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#e8ddd1" strokeWidth="3" />
          <path d="M20 4 A16 16 0 0 1 36 20" stroke="#7d4e22" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-roast-400 text-sm font-body">Loading…</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) {
    sessionStorage.setItem('gobena_redirect', location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user, profile } = useAuth();
  const defaultPath = user
    ? (profile?.role === 'admin' ? '/admin' : '/dashboard')
    : '/login';

  // Hide navbar on print page
  const location = useLocation();
  const isPrintPage = location.pathname.endsWith('/qr');

  return (
    <div className="min-h-screen bg-foam">
      {user && !isPrintPage && <Navbar />}
      <Routes>
        <Route path="/login"  element={user ? <Navigate to={defaultPath} /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to={defaultPath} /> : <SignupPage />} />

        <Route path="/dashboard"      element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/equipment"      element={<RequireAuth><EquipmentListPage /></RequireAuth>} />
        <Route path="/equipment/:id"  element={<RequireAuth><EquipmentDetailPage /></RequireAuth>} />

        {/* QR print view — admin only, opens in new tab */}
        <Route path="/equipment/:id/qr" element={
          <RequireAdmin><QRPrintPage /></RequireAdmin>
        } />

        <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
