import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutGrid, Wrench, ShieldCheck, LogOut, Coffee, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navLink = (to: string, label: string, Icon: React.ElementType) => (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        isActive(to)
          ? 'bg-brew-700 text-cream-50'
          : 'text-roast-600 hover:text-bark hover:bg-cream-200/60'
      }`}
    >
      <Icon size={15} />
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-cream-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-brew-700 flex items-center justify-center">
            <Coffee size={14} className="text-cream-100" />
          </div>
          <span className="font-display font-semibold text-bark text-base tracking-tight">
            Gobena <span className="text-brew-500">Service</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {isAdmin ? (
            navLink('/admin', 'Admin', ShieldCheck)
          ) : (
            <>
              {navLink('/dashboard',    'Dashboard',    LayoutGrid)}
              {navLink('/equipment',    'Equipment',    Wrench)}
              {navLink('/troubleshoot', 'Troubleshoot', BookOpen)}
            </>
          )}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-bark leading-none">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-roast-400 mt-0.5 capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-roast-400 hover:text-bark hover:bg-cream-100 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>
    </header>
  );
}
