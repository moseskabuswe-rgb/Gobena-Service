import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';

const LoginPage           = lazy(() => import('./pages/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage        = lazy(() => import('./pages/AuthPages').then(m => ({ default: m.RegisterPage })));
const DashboardPage       = lazy(() => import('./pages/DashboardPage'));
const PartnerEquipmentPage= lazy(() => import('./pages/PartnerEquipmentPage'));
const EquipmentDetailPage = lazy(() => import('./pages/EquipmentDetailPage'));
const ChecklistPage       = lazy(() => import('./pages/ChecklistPage'));
const MaintenancePage     = lazy(() => import('./pages/MaintenancePage'));
const TroubleshootPage    = lazy(() => import('./pages/TroubleshootPage'));
const MessagesPage        = lazy(() => import('./pages/MessagesPage'));
const NotificationsPage   = lazy(() => import('./pages/NotificationsPage'));
const QRPrintPage         = lazy(() => import('./pages/QRPrintPage'));
const AdminDashboardPage  = lazy(() => import('./pages/AdminDashboardPage'));
const AdminShopsPage      = lazy(() => import('./pages/AdminShopsPage'));
const AdminEquipmentPage  = lazy(() => import('./pages/AdminEquipmentPage'));
const AdminIssuesPage     = lazy(() => import('./pages/AdminIssuesPage'));
const AdminMessagesPage   = lazy(() => import('./pages/AdminMessagesPage'));

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Spinner />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) return <Spinner />;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const isPrintPage = location.pathname.includes('/qr');
  const showNav = !!user && !!profile && !isPrintPage;
  const defaultPath = profile?.role === 'admin' ? '/admin' : '/dashboard';

  // Don't block public routes on auth loading
  const isPublicEquipmentPage =
    location.pathname.startsWith('/equipment/') &&
    !location.pathname.includes('/qr');
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';

  if (loading && !isPublicEquipmentPage && !isAuthPage) return <Spinner />;

  return (
    <div className="min-h-screen bg-stone-50">
      {showNav && <Navbar />}
      <Suspense fallback={<Spinner />}>
        <Routes>
          {/* Auth */}
          <Route path="/login"    element={user && profile ? <Navigate to={defaultPath} replace /> : <LoginPage />} />
          <Route path="/register" element={user && profile ? <Navigate to={defaultPath} replace /> : <RegisterPage />} />

          {/* Public QR scan */}
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />

          {/* Partner */}
          <Route path="/dashboard"     element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/equipment"     element={<RequireAuth><PartnerEquipmentPage /></RequireAuth>} />
          <Route path="/checklist"     element={<RequireAuth><ChecklistPage /></RequireAuth>} />
          <Route path="/maintenance"   element={<RequireAuth><MaintenancePage /></RequireAuth>} />
          <Route path="/guide"         element={<RequireAuth><TroubleshootPage /></RequireAuth>} />
          <Route path="/messages"      element={<RequireAuth><MessagesPage /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

          {/* QR print */}
          <Route path="/equipment/:id/qr" element={<RequireAuth><QRPrintPage /></RequireAuth>} />

          {/* Admin */}
          <Route path="/admin"               element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
          <Route path="/admin/shops"         element={<RequireAdmin><AdminShopsPage /></RequireAdmin>} />
          <Route path="/admin/equipment"     element={<RequireAdmin><AdminEquipmentPage /></RequireAdmin>} />
          <Route path="/admin/issues"        element={<RequireAdmin><AdminIssuesPage /></RequireAdmin>} />
          <Route path="/admin/messages"      element={<RequireAdmin><AdminMessagesPage /></RequireAdmin>} />
          <Route path="/admin/notifications" element={<RequireAdmin><NotificationsPage /></RequireAdmin>} />

          {/* Root + catch-all */}
          <Route path="/" element={
            !user ? <Navigate to="/login" replace /> :
            !profile ? <Spinner /> :
            <Navigate to={defaultPath} replace />
          } />
          <Route path="*" element={
            !user ? <Navigate to="/login" replace /> :
            !profile ? <Spinner /> :
            <Navigate to={defaultPath} replace />
          } />
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
