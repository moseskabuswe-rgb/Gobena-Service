import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment, MaintenanceLog } from '../types';
import {
  ArrowLeft, Calendar, Hash, Tag, Wrench,
  AlertCircle, CheckCircle, Zap,
  ClipboardList, PenLine, QrCode, Printer, LogIn,
} from '../components/Icons';

// Lazy load heavy components — only download when user actually taps the button
// GuidedIssueForm is 381 lines + its own deps
// QRCode pulls in the qrcode library (~50KB)
const GuidedIssueForm  = lazy(() => import('../components/GuidedIssueForm'));
const ServiceRequestForm = lazy(() => import('../components/ServiceRequestForm'));
const QRCodeComponent  = lazy(() => import('../components/QRCode'));

// ── Types ─────────────────────────────────────────────────────────────────
// Use a looser type rather than extending Equipment to avoid strict shop conflict
type EquipmentWithShop = Omit<Equipment, 'shops' | 'created_at'> & {
  created_at?: string;
  shops?: { name: string; city: string | null } | null;
};

// ── Inline status badge — no external import needed ───────────────────────
function StatusBadge({ status }: { status: Equipment['status'] }) {
  const cfg = {
    good:            { label: 'Good',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    needs_attention: { label: 'Needs Attention',  cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
    urgent:          { label: 'Urgent',           cls: 'bg-red-50 text-red-600 border-red-200'           },
  }[status] ?? { label: status, cls: 'bg-cream-100 text-roast-600 border-cream-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Log type config ────────────────────────────────────────────────────────
const LOG_ICONS: Record<string, React.ElementType> = {
  maintenance: Wrench,
  repair:      AlertCircle,
  inspection:  CheckCircle,
  install:     Zap,
};
const LOG_COLORS: Record<string, string> = {
  maintenance: 'bg-brew-100 text-brew-700 border-brew-200',
  repair:      'bg-red-50 text-red-600 border-red-200',
  inspection:  'bg-blue-50 text-blue-600 border-blue-200',
  install:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="w-16 h-4 bg-cream-200 rounded-full animate-pulse"/>
      <div className="bg-white rounded-2xl p-5 space-y-4 border border-cream-200">
        <div className="w-24 h-3 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-52 h-6 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-32 h-4 bg-cream-200 rounded-full animate-pulse"/>
        <div className="w-20 h-6 bg-cream-200 rounded-xl animate-pulse"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 bg-brew-700 rounded-2xl animate-pulse opacity-60"/>
        <div className="h-14 bg-cream-200 rounded-2xl animate-pulse"/>
      </div>
    </main>
  );
}

// ── Spinner for lazy-loaded modals ─────────────────────────────────────────
function ModalSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/40 backdrop-blur-sm">
      <svg className="w-10 h-10 animate-spin text-white" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3"/>
        <path d="M20 4 A16 16 0 0 1 36 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Main component ─────────────────────────────────────────────────────────
export default function EquipmentDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate          = useNavigate();

  const [equipment, setEquipment] = useState<EquipmentWithShop | null>(null);
  const [logs,      setLogs]      = useState<MaintenanceLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [showLog,   setShowLog]   = useState(false);
  const [showQR,    setShowQR]    = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const isAdmin    = profile?.role === 'admin';
  const isLoggedIn = !!user;

  // Load equipment data — runs immediately, no auth check
  // Public RLS policy allows unauthenticated reads
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      // Run both queries in parallel for speed
      const [eqRes, logsRes] = await Promise.all([
        supabase
          .from('equipment')
          .select('id, name, model, serial_number, category, status, install_date, last_service, notes, shop_id, created_at, shops(name, city)')
          .eq('id', id)
          .single(),
        supabase
          .from('maintenance_logs')
          .select('id, equipment_id, performed_by, description, log_type, performed_at')
          .eq('equipment_id', id)
          .order('performed_at', { ascending: false })
          .limit(20), // cap at 20 entries — no one needs to see 200 logs
      ]);

      if (eqRes.error || !eqRes.data) {
        setNotFound(true);
      } else {
        setEquipment(eqRes.data as unknown as EquipmentWithShop);
        setLogs((logsRes.data ?? []) as MaintenanceLog[]);
      }
      setLoading(false);
    };

    load();
  }, [id]);

  const handleLogIssue = () => {
    if (!isLoggedIn) { setNeedsAuth(true); return; }
    setShowIssue(true);
  };

  const reload = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('equipment')
      .select('id, name, model, serial_number, category, status, install_date, last_service, notes, shop_id, created_at, shops(name, city)')
      .eq('id', id)
      .single();
    if (data) setEquipment(data as unknown as EquipmentWithShop);
  };

  if (loading)  return <Skeleton/>;

  if (notFound) return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-warm border border-cream-200 p-8 text-center">
        <p className="text-roast-400 mb-4">Equipment not found.</p>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cream-100 text-roast-700 font-medium text-sm border border-cream-300 mx-auto">
          <ArrowLeft size={14}/> Go Back
        </button>
      </div>
    </main>
  );

  if (!equipment) return null;

  const equipmentUrl = `${window.location.origin}/equipment/${id}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Back button — only if navigated from within app */}
      {isLoggedIn && (
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-roast-400 hover:text-bark transition-colors">
          <ArrowLeft size={14}/> Back
        </button>
      )}

      {/* Equipment card */}
      <div className="bg-white rounded-2xl shadow-warm border border-cream-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-roast-400 uppercase tracking-wide mb-1">
              {equipment.category}
              {equipment.shops?.name && ` · ${equipment.shops.name}`}
            </p>
            <h1 className="font-display text-xl font-semibold text-bark">{equipment.name}</h1>
            {equipment.model && (
              <p className="text-sm text-roast-500 mt-0.5">{equipment.model}</p>
            )}
            <div className="mt-3">
              <StatusBadge status={equipment.status}/>
            </div>
          </div>

          {/* QR button — admin only, lazy loaded */}
          {isAdmin && (
            <button onClick={() => setShowQR(v => !v)}
              className={`p-2 rounded-xl border transition-colors shrink-0 ${
                showQR
                  ? 'bg-brew-700 text-cream-50 border-brew-700'
                  : 'bg-cream-50 text-roast-500 border-cream-200 hover:border-brew-300'
              }`}>
              <QrCode size={18}/>
            </button>
          )}
        </div>

        {/* QR panel — lazy loaded, only for admins */}
        {isAdmin && showQR && (
          <div className="mt-4 pt-4 border-t border-cream-100 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-3 rounded-xl border border-cream-200 bg-foam shrink-0">
              <Suspense fallback={<div className="w-36 h-36 bg-cream-100 rounded-xl animate-pulse"/>}>
                <QRCodeComponent value={equipmentUrl} size={140}/>
              </Suspense>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-bark">QR Code for this machine</p>
              <p className="text-xs text-roast-400 mt-1">Print and stick on the equipment.</p>
              <p className="text-xs font-mono text-roast-300 mt-2 break-all">{equipmentUrl}</p>
              <Link to={`/equipment/${id}/qr`} target="_blank"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cream-100 text-roast-700 font-medium text-sm border border-cream-300 mt-3 w-fit">
                <Printer size={13}/> Open Print View
              </Link>
            </div>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-cream-100">
          <div className="flex items-start gap-2">
            <Calendar size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">Installed</p>
              <p className="text-sm font-medium text-bark">{formatDate(equipment.install_date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Wrench size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">Last Service</p>
              <p className="text-sm font-medium text-bark">{formatDate(equipment.last_service)}</p>
            </div>
          </div>
          {equipment.serial_number && (
            <div className="flex items-start gap-2">
              <Hash size={14} className="text-roast-400 mt-0.5 shrink-0"/>
              <div>
                <p className="text-xs text-roast-400">Serial No.</p>
                <p className="text-sm font-medium text-bark font-mono">{equipment.serial_number}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Tag size={14} className="text-roast-400 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs text-roast-400">ID</p>
              <p className="text-sm font-medium text-bark font-mono">{equipment.id.slice(0, 8)}…</p>
            </div>
          </div>
        </div>

        {equipment.notes && (
          <div className="mt-4 pt-4 border-t border-cream-100">
            <p className="text-xs text-roast-400 mb-1">Notes</p>
            <p className="text-sm text-roast-600">{equipment.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={handleLogIssue}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brew-700 text-cream-50 font-medium text-sm hover:bg-brew-800 transition-colors shadow-sm active:scale-95">
          <AlertCircle size={16}/> Log Issue
        </button>
        {isAdmin ? (
          <button onClick={() => setShowLog(true)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-cream-100 text-roast-700 font-medium text-sm hover:bg-cream-200 transition-colors border border-cream-300 active:scale-95">
            <PenLine size={16}/> Log Service Entry
          </button>
        ) : (
          <button onClick={handleLogIssue}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-cream-100 text-roast-700 font-medium text-sm hover:bg-cream-200 transition-colors border border-cream-300 active:scale-95">
            <ClipboardList size={16}/> Request Service
          </button>
        )}
      </div>

      {/* Auth prompt for unauthenticated users */}
      {needsAuth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-lifted w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-brew-50 border border-brew-200 flex items-center justify-center mx-auto mb-4">
              <LogIn size={20} className="text-brew-700"/>
            </div>
            <h2 className="font-display text-lg font-semibold text-bark mb-2">
              Sign in to log an issue
            </h2>
            <p className="text-sm text-roast-500 mb-6">
              You need a Gobena partner account to submit service requests.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setNeedsAuth(false)} className="flex-1 py-2.5 rounded-xl bg-cream-100 text-roast-700 font-medium text-sm border border-cream-300">
                Cancel
              </button>
              <Link
                to="/login"
                onClick={() => sessionStorage.setItem('gobena_redirect', `/equipment/${id}`)}
                className="flex-1 py-2.5 rounded-xl bg-brew-700 text-cream-50 font-medium text-sm text-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Service history */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-roast-500 uppercase tracking-widest">
            Service History
          </h2>
          <span className="text-xs text-roast-400">{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center text-sm text-roast-400">
            No service history yet.
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[18px] top-4 bottom-4 w-px bg-cream-200"/>
            <div className="space-y-3">
              {logs.map(log => {
                const Icon  = LOG_ICONS[log.log_type]  ?? Wrench;
                const color = LOG_COLORS[log.log_type] ?? 'bg-cream-100 text-roast-500 border-cream-200';
                return (
                  <div key={log.id} className="flex gap-4">
                    <div className={`relative z-10 w-9 h-9 rounded-full border flex items-center justify-center shrink-0 bg-white ${color}`}>
                      <Icon size={14}/>
                    </div>
                    <div className="bg-white rounded-2xl border border-cream-200 flex-1 py-3 px-4">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
                          {log.log_type.charAt(0).toUpperCase() + log.log_type.slice(1)}
                        </span>
                        <span className="text-xs text-roast-400">{formatDateTime(log.performed_at)}</span>
                      </div>
                      <p className="text-sm text-bark leading-snug">{log.description}</p>
                      <p className="text-xs text-roast-400 mt-1.5">by {log.performed_by}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Lazy-loaded modals — only download when user taps the button */}
      {showIssue && (
        <Suspense fallback={<ModalSpinner/>}>
          <GuidedIssueForm
            equipment={equipment as Equipment}
            onClose={() => setShowIssue(false)}
            onSuccess={() => { setShowIssue(false); reload(); }}
          />
        </Suspense>
      )}
      {showLog && (
        <Suspense fallback={<ModalSpinner/>}>
          <ServiceRequestForm
            equipment={equipment as Equipment}
            onClose={() => setShowLog(false)}
            onSuccess={() => { setShowLog(false); reload(); }}
          />
        </Suspense>
      )}
    </main>
  );
}
