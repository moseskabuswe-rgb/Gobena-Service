import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LoginPage             from './pages/LoginPage';
import SignupPage            from './pages/SignupPage';
import DashboardPage         from './pages/DashboardPage';
import EquipmentListPage     from './pages/EquipmentListPage';
import EquipmentDetailPage   from './pages/EquipmentDetailPage';
import AdminDashboardPage    from './pages/AdminDashboardPage';
import QRPrintPage           from './pages/QRPrintPage';
import TroubleshootPage      from './pages/TroubleshootPage';
import ChecklistPage         from './pages/ChecklistPage';
import AdminAddShopPage      from './pages/AdminAddShopPage';
import AdminAddEquipmentPage from './pages/AdminAddEquipmentPage';
import Navbar                from './components/Navbar';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-foam flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin" fill="none">
          <circle cx="20" cy="20" r="16" stroke="#e8ddd1" strokeWidth="3"/>
          <path d="M20 4 A16 16 0 0 1 36 20" stroke="#7d4e22" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="text-roast-400 text-sm font-body">Loading…</span>
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
  if (loading) return <LoadingScreen/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (!profile) return <LoadingScreen/>;
  if (profile.role !== 'admin') return <Navigate to="/dashboard" replace/>;
  return children;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const isPrintPage = location.pathname.endsWith('/qr');

  // Wait for profile before deciding where to send logged-in users
  const getDefaultPath = () => {
    if (!user) return '/login';
    if (!profile) return null;
    return profile.role === 'admin' ? '/admin' : '/dashboard';
  };

  const defaultPath = getDefaultPath();
  if (user && !profile && loading) return <LoadingScreen/>;
  const resolvedDefault = defaultPath ?? '/dashboard';

  return (
    <div className="min-h-screen bg-foam">
      {user && !isPrintPage && <Navbar/>}
      <Routes>
        {/* Public */}
        <Route path="/login"  element={user && defaultPath ? <Navigate to={resolvedDefault}/> : <LoginPage/>}/>
        <Route path="/signup" element={user && defaultPath ? <Navigate to={resolvedDefault}/> : <SignupPage/>}/>

        {/* Partner */}
        <Route path="/dashboard"     element={<RequireAuth><DashboardPage/></RequireAuth>}/>
        <Route path="/equipment"     element={<RequireAuth><EquipmentListPage/></RequireAuth>}/>
        <Route path="/equipment/:id" element={<RequireAuth><EquipmentDetailPage/></RequireAuth>}/>
        <Route path="/troubleshoot"  element={<RequireAuth><TroubleshootPage/></RequireAuth>}/>
        <Route path="/checklist"     element={<RequireAuth><ChecklistPage/></RequireAuth>}/>

        {/* QR print */}
        <Route path="/equipment/:id/qr" element={<RequireAdmin><QRPrintPage/></RequireAdmin>}/>

        {/* Admin */}
        <Route path="/admin"               element={<RequireAdmin><AdminDashboardPage/></RequireAdmin>}/>
        <Route path="/admin/add-shop"      element={<RequireAdmin><AdminAddShopPage/></RequireAdmin>}/>
        <Route path="/admin/add-equipment" element={<RequireAdmin><AdminAddEquipmentPage/></RequireAdmin>}/>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={resolvedDefault} replace/>}/>
      </Routes>
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
