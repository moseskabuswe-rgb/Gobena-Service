/**
 * EquipmentDetailPage — PUBLIC route, QR scan target.
 *
 * Deliberately does NOT import AuthContext or useAuth.
 * Creates its own lightweight Supabase client so auth initialisation
 * (which can hang on Android Chrome) never blocks this page loading.
 * Admin-only features (print QR) are simply absent for unauthenticated users.
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import type { Equipment, Issue } from '../types';
import {
  ArrowLeft, Calendar, Hash, AlertCircle,
  CheckCircle, XCircle, Plus, Clock,
} from '../components/Icons';

// Minimal client — no auth config, no session detection, just DB reads
const db = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

const IssueForm = lazy(() => import('../components/IssueForm'));

const statusConfig: Record<string, { label: string; cls: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  operational:     { label: 'Operational',     cls: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle },
  needs_attention: { label: 'Needs attention', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertCircle },
  out_of_service:  { label: 'Out of service',  cls: 'bg-red-100 text-red-700 border-red-200',       Icon: XCircle    },
};
const severityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-amber-100 text-amber-700',
  low:      'bg-stone-100 text-stone-500',
};
const issueStatusLabel: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [eq, setEq]             = useState<Equipment | null>(null);
  const [issues, setIssues]     = useState<Issue[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!id) { setError('Invalid QR code'); setPageLoading(false); return; }

    // Hard 8-second wall clock timeout
    const timer = setTimeout(() => {
      setError('Taking too long — check your connection and tap Retry.');
      setPageLoading(false);
    }, 8000);

    (async () => {
      try {
        const [eqRes, issueRes] = await Promise.all([
          db.from('equipment')
            .select('id, name, brand, model, serial_number, install_date, last_service_date, next_service_date, status, notes, shop_id, shops:shop_id(name, city)')
            .eq('id', id)
            .single(),
          db.from('issues')
            .select('id, title, severity, status, created_at, description, shop_id, equipment_id, reported_by, reporter_name, reporter_email, resolution_notes, resolved_at, resolved_by')
            .eq('equipment_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        clearTimeout(timer);

        if (eqRes.error) {
          setError('Equipment not found. This QR code may be invalid.');
        } else {
          setEq(eqRes.data as unknown as Equipment);
          setIssues((issueRes.data as unknown as Issue[]) || []);
        }
      } catch {
        clearTimeout(timer);
        setError('Failed to load. Please check your connection and retry.');
      } finally {
        setPageLoading(false);
      }
    })();

    return () => clearTimeout(timer);
  }, [id]);

  const refreshIssues = async () => {
    if (!id) return;
    const { data } = await db.from('issues')
      .select('id, title, severity, status, created_at, description, shop_id, equipment_id, reported_by, reporter_name, reporter_email, resolution_notes, resolved_at, resolved_by')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false })
      .limit(10);
    setIssues((data as unknown as Issue[]) || []);
  };

  if (pageLoading) return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-stone-400">Loading equipment…</p>
    </div>
  );

  if (error || !eq) return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={32} className="text-red-400 mb-3" />
      <p className="text-stone-700 font-medium max-w-xs leading-relaxed">{error || 'Equipment not found'}</p>
      <button onClick={() => window.location.reload()}
        className="mt-5 px-5 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl">
        Retry
      </button>
    </div>
  );

  const cfg = statusConfig[eq.status] || statusConfig.needs_attention;
  const shop = eq.shops as unknown as { name: string; city: string } | null;
  const openIssues  = issues.filter(i => ['open', 'in_progress'].includes(i.status));
  const pastIssues  = issues.filter(i => ['resolved', 'closed'].includes(i.status));

  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white border-b border-stone-100 px-4 md:px-6 pt-4 pb-5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-stone-400 mb-4 hover:text-stone-600 transition">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-stone-900">{eq.name}</h1>
              <p className="text-sm text-stone-400 mt-0.5">{eq.brand} · {eq.model}</p>
              {shop && (
                <p className="text-xs text-stone-400 mt-1">{shop.name}{shop.city ? ` · ${shop.city}` : ''}</p>
              )}
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border shrink-0 ${cfg.cls}`}>
              <cfg.Icon size={13} />{cfg.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Serial',       value: eq.serial_number,       Icon: Hash     },
              { label: 'Installed',    value: eq.install_date         ? new Date(eq.install_date).toLocaleDateString()        : null, Icon: Calendar },
              { label: 'Last service', value: eq.last_service_date    ? new Date(eq.last_service_date).toLocaleDateString()   : null, Icon: Clock    },
              { label: 'Next service', value: eq.next_service_date    ? new Date(eq.next_service_date).toLocaleDateString()   : null, Icon: Calendar },
            ].filter(m => m.value).map(({ label, value, Icon }) => (
              <div key={label} className="bg-stone-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <Icon size={11} className="text-stone-400" />
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">{label}</p>
                </div>
                <p className="text-sm font-medium text-stone-700">{value}</p>
              </div>
            ))}
          </div>

          {eq.notes && (
            <p className="mt-3 text-sm text-stone-500 bg-stone-50 rounded-xl px-3 py-2.5 leading-relaxed">{eq.notes}</p>
          )}
        </div>

        {/* Report button */}
        <div className="px-4 md:px-6 py-4">
          <button onClick={() => setShowForm(true)}
            className="w-full py-3.5 bg-stone-900 text-white font-semibold text-sm rounded-xl
              flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[.98] transition">
            <Plus size={17} /> Report an issue
          </button>
        </div>

        {showForm && (
          <Suspense fallback={null}>
            <IssueForm
              equipment={eq}
              onClose={() => setShowForm(false)}
              onSubmit={() => { setShowForm(false); refreshIssues(); }}
            />
          </Suspense>
        )}

        {/* Issues */}
        <div className="px-4 md:px-6 space-y-3 pb-8">
          {openIssues.length > 0 && (
            <>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                Open issues ({openIssues.length})
              </p>
              <div className="space-y-2">
                {openIssues.map(issue => (
                  <div key={issue.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-800">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-stone-400 mt-1 line-clamp-2">{issue.description}</p>
                        )}
                        <p className="text-xs text-stone-400 mt-1.5">{new Date(issue.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor[issue.severity]}`}>
                          {issue.severity}
                        </span>
                        <span className="text-xs text-stone-400">{issueStatusLabel[issue.status]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pastIssues.length > 0 && (
            <>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-2">Past issues</p>
              <div className="space-y-2 opacity-60">
                {pastIssues.slice(0, 3).map(issue => (
                  <div key={issue.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-stone-600">{issue.title}</p>
                      <span className="text-xs text-green-600 font-medium">{issueStatusLabel[issue.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {issues.length === 0 && (
            <div className="text-center py-8 text-stone-400">
              <CheckCircle size={28} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">No issues reported yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
