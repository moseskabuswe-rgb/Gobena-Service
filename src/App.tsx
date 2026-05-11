import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';

// ─── Lazy page imports ────────────────────────────────────────────────────────
const LoginPage             = lazy(() => import('./pages/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage          = lazy(() => import('./pages/AuthPages').then(m => ({ default: m.RegisterPage })));
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const EquipmentListPage     = lazy(() => import('./pages/EquipmentListPage'));
const EquipmentDetailPage   = lazy(() => import('./pages/EquipmentDetailPage'));
const ChecklistPage         = lazy(() => import('./pages/ChecklistPage'));
const MaintenancePage       = lazy(() => import('./pages/MaintenancePage'));
const TroubleshootPage      = lazy(() => import('./pages/TroubleshootPage'));
const QRPrintPage           = lazy(() => import('./pages/QRPrintPage'));
const AdminDashboardPage    = lazy(() => import('./pages/AdminDashboardPage'));
const AdminShopsPage        = lazy(() => import('./pages/AdminShopsPage'));
const AdminEquipmentPage    = lazy(() => import('./pages/AdminEquipmentPage'));
const AdminIssuesPage       = lazy(() => import('./pages/AdminIssuesPage'));

// ─── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Auth guards ──────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && profile.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Route layout ─────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const isPrintPage = location.pathname.includes('/qr');
  const showNav = user && profile && !isPrintPage;

  const defaultPath = profile?.role === 'admin' ? '/admin' : '/dashboard';

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-stone-50">
      {showNav && <Navbar />}
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login"    element={user ? <Navigate to={defaultPath} replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to={defaultPath} replace /> : <RegisterPage />} />

          {/* Public equipment page (QR scan target) — no auth required */}
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

          {/* Partner routes */}
          <Route path="/dashboard"   element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/equipment"   element={<RequireAuth><EquipmentListPage /></RequireAuth>} />
          <Route path="/checklist"   element={<RequireAuth><ChecklistPage /></RequireAuth>} />
          <Route path="/maintenance" element={<RequireAuth><MaintenancePage /></RequireAuth>} />
          <Route path="/guide"       element={<RequireAuth><TroubleshootPage /></RequireAuth>} />

          {/* QR print — admin only */}
          <Route path="/equipment/:id/qr" element={<RequireAdmin><QRPrintPage /></RequireAdmin>} />

          {/* Admin routes */}
          <Route path="/admin"           element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
          <Route path="/admin/shops"     element={<RequireAdmin><AdminShopsPage /></RequireAdmin>} />
          <Route path="/admin/equipment" element={<RequireAdmin><AdminEquipmentPage /></RequireAdmin>} />
          <Route path="/admin/issues"    element={<RequireAdmin><AdminIssuesPage /></RequireAdmin>} />

          {/* Root + catch-all */}
          <Route path="/"  element={<Navigate to={user ? defaultPath : '/login'} replace />} />
          <Route path="*"  element={<Navigate to={user ? defaultPath : '/login'} replace />} />
        </Routes>
      </Suspense>
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
