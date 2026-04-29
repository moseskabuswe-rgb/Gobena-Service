import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { LayoutGrid, Wrench, ShieldCheck, LogOut, BookOpen, ClipboardCheck } from './Icons';

function GoMark({ size = 28 }: { size?: number }) {
  const r = Math.round(size * 0.22);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx={r} fill="#1a0e06"/>
      <rect x="6" y="7" width="20" height="1.5" rx="0.75" fill="white" opacity="0.2"/>
      <text x="16" y="23" fontFamily="Georgia, serif" fontSize="16" fontWeight="700"
        fontStyle="italic" fill="white" textAnchor="middle" letterSpacing="-0.5">GO</text>
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

  const partnerTabs = [
    { to: '/dashboard',    label: 'Home',        Icon: LayoutGrid     },
    { to: '/equipment',    label: 'Equipment',    Icon: Wrench         },
    { to: '/checklist',    label: 'Checklist',    Icon: ClipboardCheck },
    { to: '/troubleshoot', label: 'Troubleshoot', Icon: BookOpen       },
  ];

  return (
    <>
      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-cream-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link
            to={isAdmin ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 shrink-0"
          >
            <GoMark size={28}/>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display font-semibold text-bark text-base tracking-tight leading-none">
                Gobena
              </span>
              <span className="font-display font-light text-roast-400 text-base tracking-tight leading-none ml-1">
                Service
              </span>
            </div>
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {isAdmin ? (
              <Link to="/admin" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/admin') ? 'bg-brew-700 text-cream-50' : 'text-roast-600 hover:text-bark hover:bg-cream-200/60'
              }`}>
                <ShieldCheck size={15}/> Admin
              </Link>
            ) : (
              partnerTabs.map(({ to, label, Icon }) => (
                <Link key={to} to={to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to) ? 'bg-brew-700 text-cream-50' : 'text-roast-600 hover:text-bark hover:bg-cream-200/60'
                }`}>
                  <Icon size={15}/> {label}
                </Link>
              ))
            )}
          </nav>

          {/* User info + sign out */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-bark leading-none">
                {profile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-xs text-roast-400 capitalize mt-0.5">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-roast-400 hover:text-bark hover:bg-cream-100 transition-colors"
              title="Sign out"
            >
              <LogOut size={16}/>
            </button>
          </div>

        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR (partner only) ──────────────────────── */}
      {/*
        Works on both iOS and Android:
        - tab-bar class adds padding-bottom = safe-area-inset-bottom
          so the 4 tabs sit above the iPhone home indicator AND
          Android gesture nav bar
        - fixed positioning keeps it above all content
        - z-50 ensures it's always on top
      */}
      {!isAdmin && (
        <nav
          className="tab-bar md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cream-200"
          style={{ boxShadow: '0 -2px 12px rgba(44,26,14,0.08)' }}
        >
          <div className="grid grid-cols-4 h-16">
            {partnerTabs.map(({ to, label, Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex flex-col items-center justify-center gap-1 transition-colors active:opacity-70"
                >
                  {/* Active indicator at top of tab */}
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brew-700 rounded-full"/>
                  )}
                  <Icon
                    size={22}
                    className={active ? 'text-brew-700' : 'text-roast-400'}
                  />
                  <span className={`text-[10px] font-medium leading-none ${
                    active ? 'text-brew-700' : 'text-roast-400'
                  }`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Safe area spacer — fills the home indicator / gesture bar area */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'white' }}/>
        </nav>
      )}
    </>
  );
}
