import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutGrid, Wrench, ShieldCheck, LogOut, BookOpen, ClipboardCheck } from 'lucide-react';

function GoMark({ size = 28 }: { size?: number }) {
  const r = Math.round(size * 0.22);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Gobena Service">
      <rect width="32" height="32" rx={r} fill="#1a0e06"/>
      <rect x="6" y="7" width="20" height="1.5" rx="0.75" fill="white" opacity="0.2"/>
      <text x="16" y="23" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fontWeight="700" fontStyle="italic" fill="white" textAnchor="middle" letterSpacing="-0.5">GO</text>
    </svg>
  );
}

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
      <Icon size={15}/>
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-cream-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2.5 shrink-0 group">
          <GoMark size={30}/>
          <div className="flex items-baseline gap-0.5">
            <span className="font-display font-semibold text-bark text-base tracking-tight">Gobena</span>
            <span className="font-display font-light text-roast-400 text-base tracking-tight ml-1">Service</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {isAdmin ? (
            navLink('/admin', 'Admin', ShieldCheck)
          ) : (
            <>
              {navLink('/dashboard',    'Dashboard',    LayoutGrid)}
              {navLink('/equipment',    'Equipment',    Wrench)}
              {navLink('/checklist',    'Checklist',    ClipboardCheck)}
              {navLink('/troubleshoot', 'Troubleshoot', BookOpen)}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-bark leading-none">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-roast-400 mt-0.5 capitalize">{profile?.role}</p>
          </div>
          <button onClick={handleSignOut} className="p-2 rounded-lg text-roast-400 hover:text-bark hover:bg-cream-100 transition-colors" title="Sign out">
            <LogOut size={16}/>
          </button>
        </div>

      </div>
    </header>
  );
}
