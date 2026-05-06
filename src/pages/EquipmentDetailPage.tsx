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

// Heavy components only load when user actually taps a button
const GuidedIssueForm    = lazy(() => import('../components/GuidedIssueForm'));
const ServiceRequestForm = lazy(() => import('../components/ServiceRequestForm'));
const QRCodeComponent    = lazy(() => import('../components/QRCode'));

// ── Types ──────────────────────────────────────────────────────────────────
type EqRow = {
  id: string; name: string; model: string | null;
  serial_number: string | null; category: string;
  status: 'good' | 'needs_attention' | 'urgent';
  install_date: string | null; last_service: string | null;
  notes: string | null; shop_id: string; created_at: string;
  shops: { name: string; city: string | null } | null;
};

// ── Small inline components (no extra imports) ─────────────────────────────
function StatusBadge({ status }: { status: EqRow['status'] }) {
  const map = {
    good:            'bg-emerald-50 text-emerald-700 border-emerald-200',
    needs_attention: 'bg-amber-50 text-amber-700 border-amber-200',
    urgent:          'bg-red-50 text-red-600 border-red-200',
  };
  const labels = { good: 'Good', needs_attention: 'Needs Attention', urgent: 'Urgent' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

const LOG_ICON: Record<string, React.ElementType> = {
  maintenance: Wrench, repair: AlertCircle, inspection: CheckCircle, install: Zap,
};
const LOG_COLOR: Record<string, string> = {
  maintenance: 'bg-brew-100 text-brew-700 border-brew-200',
  repair:      'bg-red-50 text-red-600 border-red-200',
  inspection:  'bg-blue-50 text-blue-600 border-blue-200',
  install:     'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function Skeleton() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="h-4 w-16 bg-cream-200 rounded-full animate-pulse"/>
      <div className="bg-white rounded-2xl p-5 border border-cream-200 space-y-3">
        <div className="h-3 w-20 bg-cream-200 rounded-full animate-pulse"/>
        <div className="h-6 w-48 bg-cream-200 rounded-full animate-pulse"/>
        <div className="h-6 w-20 bg-cream-200 rounded-xl animate-pulse"/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-2xl bg-brew-200 animate-pulse"/>
        <div className="h-14 rounded-2xl bg-cream-200 animate-pulse"/>
      </div>
    </main>
  );
}

function ModalLoader() {
  return (
    <div className="fixed inset-0 z-50 bg-bark/40 backdrop-blur-sm flex items-center justify-center">
      <svg className="w-10 h-10 animate-spin text-white" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
        <path d="M20 4A16 16 0 0 1 36 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function EquipmentDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate          = useNavigate();

  const [eq,        setEq]        = useState<EqRow | null>(null);
  const [logs,      setLogs]      = useState<MaintenanceLog[]>([]);
  const [status,    setStatus]    = useState<'loading' | 'ok' | 'error'>('loading');
  const [showIssue, setShowIssue] = useState(false);
  const [showLog,   setShowLog]   = useState(false);
  const [showQR,    setShowQR]    = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const isAdmin    = profile?.role === 'admin';
  const isLoggedIn = !!user;

  useEffect(() => {
    if (!id) { setStatus('error'); return; }
    setStatus('loading');

    // AbortController so we can cancel if the component unmounts
    const controller = new AbortController();

    // Hard 10-second timeout — shows error instead of infinite loading
    const timeout = setTimeout(() => {
      controller.abort();
      setStatus('error');
    }, 10000);

    const load = async () => {
      try {
        const [eqRes, logRes] = await Promise.all([
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
            .limit(15),
        ]);

        if (controller.signal.aborted) return;
        clearTimeout(timeout);

        if (eqRes.error || !eqRes.data) {
          setStatus('error');
        } else {
          setEq(eqRes.data as unknown as EqRow);
          setLogs((logRes.data ?? []) as MaintenanceLog[]);
          setStatus('ok');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    };

    load();
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [id]);

  const reload = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('equipment')
      .select('id, name, model, serial_number, category, status, install_date, last_service, notes, shop_id, created_at, shops(name, city)')
      .eq('id', id)
      .single();
    if (data) setEq(data as unknown as EqRow);
  };

  if (status === 'loading') return <Skeleton/>;

  if (status === 'error' || !eq) return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <AlertCircle size={20} className="text-red-500"/>
        </div>
        <p className="font-medium text-bark">Couldn't load this equipment</p>
        <p className="text-sm text-roast-400">Check your internet connection and try again.</p>
        <button onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-brew-700 text-cream-50 font-medium text-sm mx-auto block">
          Try Again
        </button>
      </div>
    </main>
  );

  const equipmentUrl = `${window.location.origin}/equipment/${id}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

      {/* Back — only if navigated from within app */}
      {isLoggedIn && (
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-roast-400 hover:text-bark transition-colors">
          <ArrowLeft size={14}/> Back
        </button>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-warm border border-cream-200 p-5 space-y-0">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-roast-400 uppercase tracking-wide mb-1">
              {eq.category}{eq.shops?.name ? ` · ${eq.shops.name}` : ''}
            </p>
            <h1 className="font-display text-xl font-semibold text-bark leading-tight">{eq.name}</h1>
            {eq.model && <p className="text-sm text-roast-500 mt-0.5">{eq.model}</p>}
            <div className="mt-3"><StatusBadge status={eq.status}/></div>
          </div>
          {isAdmin && (
            <button onClick={() => setShowQR(v => !v)}
              className={`p-2 rounded-xl border transition-colors shrink-0 ${
                showQR ? 'bg-brew-700 text-cream-50 border-brew-700'
                       : 'bg-cream-50 text-roast-500 border-cream-200 hover:border-brew-300'
              }`}>
              <QrCode size={18}/>
            </button>
          )}
        </div>

        {/* QR panel — admin only, lazy loaded */}
        {isAdmin && showQR && (
          <div className="mt-4 pt-4 border-t border-cream-100 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-xl border border-cream-200 bg-foam shrink-0">
              <Suspense fallback={<div className="w-36 h-36 bg-cream-100 rounded-xl animate-pulse"/>}>
                <QRCodeComponent value={equipmentUrl} size={140}/>
              </Suspense>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-bark">QR Code</p>
              <p className="text-xs text-roast-400 mt-1">Print and attach to this machine.</p>
              <p className="text-xs font-mono text-roast-300 mt-1.5 break-all">{equipmentUrl}</p>
              <Link to={`/equipment/${id}/qr`} target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream-100 text-roast-600 text-xs font-medium border border-cream-200 mt-2.5 w-fit">
                <Printer size={12}/> Print View
              </Link>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-cream-100">
          {[
            { Icon: Calendar, label: 'Installed',     value: fmt(eq.install_date)  },
            { Icon: Wrench,   label: 'Last Service',  value: fmt(eq.last_service)  },
            ...(eq.serial_number ? [{ Icon: Hash, label: 'Serial No.', value: eq.serial_number }] : []),
            { Icon: Tag, label: 'ID', value: eq.id.slice(0, 8) + '…' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon size={13} className="text-roast-400 mt-0.5 shrink-0"/>
              <div className="min-w-0">
                <p className="text-xs text-roast-400">{label}</p>
                <p className="text-sm font-medium text-bark truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {eq.notes && (
          <div className="mt-4 pt-4 border-t border-cream-100">
            <p className="text-xs text-roast-400 mb-1">Notes</p>
            <p className="text-sm text-roast-600">{eq.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => isLoggedIn ? setShowIssue(true) : setNeedsAuth(true)}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brew-700 text-cream-50 font-semibold text-sm active:opacity-80 transition-opacity">
          <AlertCircle size={16}/> Log Issue
        </button>
        {isAdmin
          ? <button onClick={() => setShowLog(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-roast-700 font-medium text-sm border border-cream-300 active:opacity-80">
              <PenLine size={16}/> Log Service
            </button>
          : <button onClick={() => isLoggedIn ? setShowIssue(true) : setNeedsAuth(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-roast-700 font-medium text-sm border border-cream-300 active:opacity-80">
              <ClipboardList size={16}/> Request Service
            </button>
        }
      </div>

      {/* Auth prompt for unauthenticated users tapping Log Issue */}
      {needsAuth && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/50 backdrop-blur-sm p-4"
          onClick={() => setNeedsAuth(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-brew-50 border border-brew-200 flex items-center justify-center mx-auto mb-3">
              <LogIn size={20} className="text-brew-700"/>
            </div>
            <h2 className="font-display text-base font-semibold text-bark mb-1">Sign in required</h2>
            <p className="text-sm text-roast-500 mb-5">You need a Gobena partner account to submit service requests.</p>
            <div className="flex gap-3">
              <button onClick={() => setNeedsAuth(false)}
                className="flex-1 py-2.5 rounded-xl bg-cream-100 text-roast-700 font-medium text-sm border border-cream-200">
                Cancel
              </button>
              <Link to="/login"
                onClick={() => sessionStorage.setItem('gobena_redirect', `/equipment/${id}`)}
                className="flex-1 py-2.5 rounded-xl bg-brew-700 text-cream-50 font-medium text-sm text-center">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Service history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-roast-500 uppercase tracking-widest">
            Service History
          </h2>
          <span className="text-xs text-roast-400">{logs.length} entries</span>
        </div>

        {logs.length === 0
          ? <div className="bg-white rounded-2xl border border-cream-200 p-8 text-center text-sm text-roast-400">
              No service history yet.
            </div>
          : (
            <div className="relative">
              <div className="absolute left-[18px] top-5 bottom-5 w-px bg-cream-200"/>
              <div className="space-y-3">
                {logs.map(log => {
                  const Icon  = LOG_ICON[log.log_type]  ?? Wrench;
                  const color = LOG_COLOR[log.log_type] ?? 'bg-cream-100 text-roast-500 border-cream-200';
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${color}`}>
                        <Icon size={14}/>
                      </div>
                      <div className="bg-white rounded-2xl border border-cream-200 flex-1 px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
                            {log.log_type.charAt(0).toUpperCase() + log.log_type.slice(1)}
                          </span>
                          <span className="text-xs text-roast-400">{fmtShort(log.performed_at)}</span>
                        </div>
                        <p className="text-sm text-bark leading-snug">{log.description}</p>
                        <p className="text-xs text-roast-400 mt-1">by {log.performed_by}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }
      </section>

      {/* Lazy modals */}
      {showIssue && (
        <Suspense fallback={<ModalLoader/>}>
          <GuidedIssueForm
            equipment={eq as unknown as Equipment}
            onClose={() => setShowIssue(false)}
            onSuccess={() => { setShowIssue(false); reload(); }}
          />
        </Suspense>
      )}
      {showLog && (
        <Suspense fallback={<ModalLoader/>}>
          <ServiceRequestForm
            equipment={eq as unknown as Equipment}
            onClose={() => setShowLog(false)}
            onSuccess={() => { setShowLog(false); reload(); }}
          />
        </Suspense>
      )}
    </main>
  );
}
