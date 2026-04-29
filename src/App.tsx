import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';

// Eager — needed immediately on QR scan
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import LoginPage           from './pages/LoginPage';

// Lazy — only loads when the user navigates there
const SignupPage            = lazy(() => import('./pages/SignupPage'));
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const EquipmentListPage     = lazy(() => import('./pages/EquipmentListPage'));
const AdminDashboardPage    = lazy(() => import('./pages/AdminDashboardPage'));
const QRPrintPage           = lazy(() => import('./pages/QRPrintPage'));
const TroubleshootPage      = lazy(() => import('./pages/TroubleshootPage'));
const ChecklistPage         = lazy(() => import('./pages/ChecklistPage'));
const AdminAddShopPage      = lazy(() => import('./pages/AdminAddShopPage'));
const AdminAddEquipmentPage = lazy(() => import('./pages/AdminAddEquipmentPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-foam flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#e8ddd1" strokeWidth="3"/>
          <path d="M20 4 A16 16 0 0 1 36 20" stroke="#7d4e22" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="text-roast-400 text-sm">Loading…</span>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen/>;
  if (!user) {
    sessionStorage.setItem('gobena_redirect', location.pathname + location.search);
    return <Navigate to="/login" replace/>;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();
  if (loading)                  return <LoadingScreen/>;
  if (!user)                    return <Navigate to="/login" replace/>;
  if (!profile)                 return <LoadingScreen/>;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace/>;
  return children;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen/>;

  const isPrintPage = location.pathname.endsWith('/qr');
  const isPartner   = profile?.role === 'partner';

  const defaultPath = !user
    ? '/login'
    : profile?.role === 'admin'
    ? '/admin'
    : '/dashboard';

  const showNav = !!user && !isPrintPage;

  // Partners on mobile need bottom padding so content clears the tab bar.
  // We use the .tab-bar-safe class which adds 4rem + safe-area-inset-bottom,
  // covering both iPhone home indicator and Android gesture bar.
  // Only apply on md and below (md+ uses top nav, no tab bar).
  const wrapperClass = showNav && isPartner
    ? 'min-h-screen bg-foam tab-bar-safe md:pb-0'
    : 'min-h-screen bg-foam';

  return (
    <div className={wrapperClass}>
      {showNav && <Navbar/>}
      <Suspense fallback={<LoadingScreen/>}>
        <Routes>
          {/* Public */}
          <Route path="/login"
            element={user ? <Navigate to={defaultPath}/> : <LoginPage/>}/>
          <Route path="/signup"
            element={user ? <Navigate to={defaultPath}/> : <SignupPage/>}/>

          {/* Equipment detail — PUBLIC, no login needed to view.
              Authentication only required when submitting an issue. */}
          <Route path="/equipment/:id" element={<EquipmentDetailPage/>}/>

          {/* Partner */}
          <Route path="/dashboard"
            element={<RequireAuth><DashboardPage/></RequireAuth>}/>
          <Route path="/equipment"
            element={<RequireAuth><EquipmentListPage/></RequireAuth>}/>
          <Route path="/troubleshoot"
            element={<RequireAuth><TroubleshootPage/></RequireAuth>}/>
          <Route path="/checklist"
            element={<RequireAuth><ChecklistPage/></RequireAuth>}/>

          {/* QR print */}
          <Route path="/equipment/:id/qr"
            element={<RequireAdmin><QRPrintPage/></RequireAdmin>}/>

          {/* Admin */}
          <Route path="/admin"
            element={<RequireAdmin><AdminDashboardPage/></RequireAdmin>}/>
          <Route path="/admin/add-shop"
            element={<RequireAdmin><AdminAddShopPage/></RequireAdmin>}/>
          <Route path="/admin/add-equipment"
            element={<RequireAdmin><AdminAddEquipmentPage/></RequireAdmin>}/>

          <Route path="*" element={<Navigate to={defaultPath} replace/>}/>
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
