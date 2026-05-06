import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';

// EAGER — load immediately, no waiting
// These are the two most time-critical pages
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import LoginPage           from './pages/LoginPage';

// LAZY — only load when navigated to
const SignupPage            = lazy(() => import('./pages/SignupPage'));
const DashboardPage         = lazy(() => import('./pages/DashboardPage'));
const EquipmentListPage     = lazy(() => import('./pages/EquipmentListPage'));
const AdminDashboardPage    = lazy(() => import('./pages/AdminDashboardPage'));
const QRPrintPage           = lazy(() => import('./pages/QRPrintPage'));
const TroubleshootPage      = lazy(() => import('./pages/TroubleshootPage'));
const ChecklistPage         = lazy(() => import('./pages/ChecklistPage'));
const AdminAddShopPage      = lazy(() => import('./pages/AdminAddShopPage'));
const AdminAddEquipmentPage = lazy(() => import('./pages/AdminAddEquipmentPage'));

function Spinner() {
  return (
    <div className="min-h-screen bg-foam flex items-center justify-center">
      <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin" fill="none">
        <circle cx="20" cy="20" r="16" stroke="#e8ddd1" strokeWidth="3"/>
        <path d="M20 4 A16 16 0 0 1 36 20" stroke="#7d4e22" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

// ── Route guards ─────────────────────────────────────────────────────────────

// RequireAuth: waits for auth, then checks login
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still resolving auth — show spinner (max 3s due to timeout in AuthContext)
  if (loading) return <Spinner/>;

  // Auth resolved, not logged in
  if (!user) {
    sessionStorage.setItem('gobena_redirect', location.pathname + location.search);
    return <Navigate to="/login" replace/>;
  }

  return children;
}

// RequireAdmin: waits for auth + profile, then checks role
function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();

  if (loading)                  return <Spinner/>;
  if (!user)                    return <Navigate to="/login" replace/>;
  // Profile still loading (unlikely given 3s timeout but handle gracefully)
  if (user && !profile)         return <Spinner/>;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace/>;

  return children;
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, profile } = useAuth();
  // NOTE: No "if (loading) return <Spinner/>" here.
  // Public routes (especially /equipment/:id) must render IMMEDIATELY
  // regardless of auth state. Auth loading is handled inside each guard.
  const location    = useLocation();
  const isPrintPage = location.pathname.endsWith('/qr');
  const isPartner   = profile?.role === 'partner';
  const showNav     = !!user && !isPrintPage;

  const defaultPath = !user
    ? '/login'
    : profile?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className={`min-h-screen bg-foam${showNav && isPartner ? ' tab-bar-safe md:pb-0' : ''}`}>
      {showNav && <Navbar/>}
      <Suspense fallback={<Spinner/>}>
        <Routes>

          {/* ── PUBLIC — no auth required ─────────────────────────────── */}
          <Route path="/login"
            element={user ? <Navigate to={defaultPath}/> : <LoginPage/>}/>
          <Route path="/signup"
            element={user ? <Navigate to={defaultPath}/> : <SignupPage/>}/>

          {/* Equipment detail — fully public
              Renders immediately on QR scan, on ANY device, logged in or not.
              Auth is checked INSIDE the component only when submitting. */}
          <Route path="/equipment/:id"
            element={<EquipmentDetailPage/>}/>

          {/* ── PARTNER — requires login ───────────────────────────────── */}
          <Route path="/dashboard"
            element={<RequireAuth><DashboardPage/></RequireAuth>}/>
          <Route path="/equipment"
            element={<RequireAuth><EquipmentListPage/></RequireAuth>}/>
          <Route path="/troubleshoot"
            element={<RequireAuth><TroubleshootPage/></RequireAuth>}/>
          <Route path="/checklist"
            element={<RequireAuth><ChecklistPage/></RequireAuth>}/>

          {/* ── ADMIN — requires admin role ────────────────────────────── */}
          <Route path="/equipment/:id/qr"
            element={<RequireAdmin><QRPrintPage/></RequireAdmin>}/>
          <Route path="/admin"
            element={<RequireAdmin><AdminDashboardPage/></RequireAdmin>}/>
          <Route path="/admin/add-shop"
            element={<RequireAdmin><AdminAddShopPage/></RequireAdmin>}/>
          <Route path="/admin/add-equipment"
            element={<RequireAdmin><AdminAddEquipmentPage/></RequireAdmin>}/>

          {/* ── CATCH-ALL ─────────────────────────────────────────────── */}
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
