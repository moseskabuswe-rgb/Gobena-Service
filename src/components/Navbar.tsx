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
      {/* ── TOP BAR ────────────────────────────────────────────────────────
          Mobile layout: [Logo] ............... [Sign Out]
          Just 2 items — never overflows on any phone size.

          Desktop (md+): [Logo] [Nav Links] [Name + Sign Out]
      ──────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-cream-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Logo — always visible */}
          <Link
            to={isAdmin ? '/admin' : '/dashboard'}
            className="flex items-center gap-2.5 shrink-0"
          >
            <GoMark size={28}/>
            <div className="flex items-baseline">
              <span className="font-display font-semibold text-bark text-base tracking-tight leading-none">
                Gobena
              </span>
              <span className="font-display font-light text-roast-400 text-base tracking-tight leading-none ml-1.5">
                Service
              </span>
            </div>
          </Link>

          {/* Center nav — desktop only for partners, always for admin (single item) */}
          <nav className="flex-1 flex justify-center">
            {isAdmin ? (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/admin')
                    ? 'bg-brew-700 text-cream-50'
                    : 'text-roast-600 hover:text-bark hover:bg-cream-200/60'
                }`}
              >
                <ShieldCheck size={15}/> Admin
              </Link>
            ) : (
              /* Hidden on mobile — bottom tab bar handles partner navigation */
              <div className="hidden md:flex items-center gap-1">
                {partnerTabs.map(({ to, label, Icon }) => (
                  <Link key={to} to={to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(to)
                        ? 'bg-brew-700 text-cream-50'
                        : 'text-roast-600 hover:text-bark hover:bg-cream-200/60'
                    }`}
                  >
                    <Icon size={15}/> {label}
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* Right side — name (desktop only) + sign out (always) */}
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
              aria-label="Sign out"
            >
              <LogOut size={18}/>
            </button>
          </div>

        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────────────────────
          Partners only. Hidden on md+ (desktop uses top nav instead).
          4 tabs: Home · Equipment · Checklist · Troubleshoot
          Safe area padding covers:
            - iPhone home indicator (env safe-area-inset-bottom ~34px)
            - Android gesture bar (env safe-area-inset-bottom ~24px)
            - Android 3-button nav (no inset needed, bar sits above buttons)
      ──────────────────────────────────────────────────────────────────── */}
      {!isAdmin && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cream-200"
          style={{
            boxShadow: '0 -2px 16px rgba(44,26,14,0.10)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="grid grid-cols-4 h-16">
            {partnerTabs.map(({ to, label, Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative flex flex-col items-center justify-center gap-1 active:opacity-60 transition-opacity"
                >
                  {/* Active top indicator bar */}
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brew-700 rounded-full"
                    />
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
        </nav>
      )}
    </>
  );
}
