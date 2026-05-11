import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  GoMark, LayoutGrid, Wrench, ClipboardList, BookOpen,
  LogOut, Store, BarChart2, Bell,
} from './Icons';

// Partner: 4 tabs — keep labels short so they all fit on 320px screens
const PARTNER_TABS = [
  { to: '/dashboard',   label: 'Home',    Icon: LayoutGrid    },
  { to: '/equipment',   label: 'Machines',Icon: Wrench        },
  { to: '/checklist',   label: 'Checklist',Icon: ClipboardList },
  { to: '/maintenance', label: 'Logs',    Icon: BookOpen      },
];

// Admin: 4 tabs
const ADMIN_TABS = [
  { to: '/admin',           label: 'Overview', Icon: BarChart2 },
  { to: '/admin/shops',     label: 'Shops',    Icon: Store     },
  { to: '/admin/issues',    label: 'Issues',   Icon: Bell      },
  { to: '/admin/equipment', label: 'Equipment',Icon: Wrench    },
];

export default function Navbar() {
  const { profile, shop, signOut } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = profile?.role === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : PARTNER_TABS;

  const isActive = (to: string) =>
    to === (isAdmin ? '/admin' : '/dashboard')
      ? pathname === to
      : pathname.startsWith(to);

  return (
    <>
      {/* ── Desktop top bar ── */}
      <header className="hidden md:flex sticky top-0 z-40 h-14 bg-white border-b border-stone-200 items-center px-6 gap-6 shadow-sm">
        <Link
          to={isAdmin ? '/admin' : '/dashboard'}
          className="flex items-center gap-2.5 mr-4 shrink-0"
        >
          <GoMark size={30} />
          <span className="font-semibold text-stone-800 text-sm tracking-tight">
            Gobena <span className="text-amber-700 font-light">Service</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {tabs.map(({ to, label, Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(to) ? 'bg-amber-50 text-amber-800' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <Icon size={15} />{label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          {!isAdmin && shop && (
            <span className="text-xs text-stone-400 font-medium hidden lg:block truncate max-w-[140px]">
              {shop.name}
            </span>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-stone-800 leading-none">{profile?.full_name}</p>
            <p className="text-xs text-stone-400 mt-0.5 capitalize">{profile?.role}</p>
          </div>
          <button onClick={signOut}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Mobile top bar — logo + sign out button ── */}
      {/* Sign out lives here on mobile so the bottom bar only has nav tabs */}
      <header className="md:hidden sticky top-0 z-40 h-12 bg-white border-b border-stone-200 flex items-center px-4 shadow-sm">
        <GoMark size={26} />
        <div className="flex items-baseline gap-1 ml-2">
          <span className="font-semibold text-stone-800 text-sm">Gobena</span>
          <span className="text-amber-700 font-light text-sm">Service</span>
        </div>

        {/* Shop name (partners) or Admin badge */}
        {!isAdmin && shop && (
          <span className="ml-3 text-xs text-stone-400 truncate flex-1 min-w-0">{shop.name}</span>
        )}
        {isAdmin && (
          <span className="ml-3 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        )}

        {/* Sign out — always visible, no overflow */}
        <button onClick={signOut}
          className="ml-auto p-2 text-stone-400 hover:text-stone-700 shrink-0"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* ── Mobile bottom tab bar — exactly 4 tabs, no sign out, no overflow ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 grid safe-bottom"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map(({ to, label, Icon }) => (
          <Link key={to} to={to}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
              isActive(to) ? 'text-amber-800' : 'text-stone-400'
            }`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
