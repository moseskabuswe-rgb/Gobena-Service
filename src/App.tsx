import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';

import EquipmentDetailPage from './pages/EquipmentDetailPage';
import LoginPage           from './pages/LoginPage';

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

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner/>;
  if (!user) {
    sessionStorage.setItem('gobena_redirect', location.pathname + location.search);
    return <Navigate to="/login" replace/>;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();
  if (loading)                 return <Spinner/>;
  if (!user)                   return <Navigate to="/login" replace/>;
  if (!profile)                return <Spinner/>;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace/>;
  return children;
}

function AppRoutes() {
  const { user, profile } = useAuth();
  // NO loading check here — this was the bug.
  // Public routes must render immediately.
  // Protected routes handle their own loading via RequireAuth/RequireAdmin.

  const location    = useLocation();
  const isPrintPage = location.pathname.endsWith('/qr');
  const isPartner   = profile?.role === 'partner';
  const showNav     = !!user && !isPrintPage;

  // Only redirect from / once we know who the user is
  // If profile is null but user exists, wait — don't redirect yet
  const getDefault = () => {
    if (!user) return '/login';
    if (!profile) return null; // still loading profile
    return profile.role === 'admin' ? '/admin' : '/dashboard';
  };
  const defaultPath = getDefault();

  return (
    <div className={`min-h-screen bg-foam${showNav && isPartner ? ' tab-bar-safe md:pb-0' : ''}`}>
      {showNav && <Navbar/>}
      <Suspense fallback={<Spinner/>}>
        <Routes>

          {/* Public — no auth required */}
          <Route path="/login"
            element={defaultPath ? <Navigate to={defaultPath}/> : <LoginPage/>}/>
          <Route path="/signup"
            element={defaultPath ? <Navigate to={defaultPath}/> : <SignupPage/>}/>

          {/* Equipment detail — always public, loads regardless of auth */}
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

          {/* Catch-all — only redirect once we know the destination */}
          <Route path="*"
            element={defaultPath
              ? <Navigate to={defaultPath} replace/>
              : <Spinner/>}
          />

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
