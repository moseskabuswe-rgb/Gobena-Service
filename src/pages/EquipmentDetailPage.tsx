import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment, Issue } from '../types';
import {
  ArrowLeft, Calendar, Hash, AlertCircle,
  CheckCircle, XCircle, Plus, Clock, Printer,
} from '../components/Icons';

const IssueForm = lazy(() => import('../components/IssueForm'));

const statusConfig: Record<string, { label: string; cls: string; Icon: React.FC<{size?: number; className?: string}> }> = {
  operational:     { label: 'Operational',    cls: 'bg-green-100 text-green-700 border-green-200',  Icon: CheckCircle  },
  needs_attention: { label: 'Needs attention',cls: 'bg-amber-100 text-amber-700 border-amber-200',  Icon: AlertCircle  },
  out_of_service:  { label: 'Out of service', cls: 'bg-red-100 text-red-700 border-red-200',        Icon: XCircle      },
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
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [eq, setEq]             = useState<Equipment | null>(null);
  const [issues, setIssues]     = useState<Issue[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!id) { setError('Invalid QR code'); setLoading(false); return; }

    // Use AbortController for clean timeout — fixes Android Chrome hang
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchData = async () => {
      try {
        const [eqRes, issueRes] = await Promise.all([
          supabase
            .from('equipment')
            .select('id, name, brand, model, serial_number, install_date, last_service_date, next_service_date, status, notes, shop_id, shops:shop_id(name, city)')
            .eq('id', id)
            .single(),
          supabase
            .from('issues')
            .select('id, title, severity, status, created_at, description')
            .eq('equipment_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (eqRes.error) { setError('Equipment not found. This QR code may be invalid.'); }
        else { setEq(eqRes.data as unknown as Equipment); }
        setIssues((issueRes.data as unknown as Issue[]) || []);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
          setError('Request timed out. Please check your connection and try again.');
        } else {
          setError('Failed to load equipment. Please try again.');
        }
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    fetchData();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [id]);

  const handleIssueLogged = () => {
    setShowForm(false);
    // Refresh issues
    if (!id) return;
    supabase
      .from('issues')
      .select('id, title, severity, status, created_at, description')
      .eq('equipment_id', id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setIssues((data as Issue[]) || []));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-stone-400">Loading equipment…</p>
      </div>
    );
  }

  if (error || !eq) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <AlertCircle size={32} className="text-red-400 mb-3" />
        <p className="text-stone-700 font-medium text-center">{error || 'Equipment not found'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-stone-900 text-white text-sm rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const cfg = statusConfig[eq.status] || statusConfig.needs_attention;
  const openIssues = issues.filter(i => ['open', 'in_progress'].includes(i.status));

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="bg-white border-b border-stone-100 px-4 pt-4 pb-5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-stone-400 mb-4 hover:text-stone-600 transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900">{eq.name}</h1>
              <p className="text-sm text-stone-400 mt-0.5">{eq.brand} · {eq.model}</p>
              {(eq.shops as unknown as { name: string; city: string } | null) && (
                <p className="text-xs text-stone-400 mt-1">
                  {(eq.shops as unknown as { name: string; city: string }).name}
                  {(eq.shops as unknown as { name: string; city: string }).city ? ` · ${(eq.shops as unknown as { name: string; city: string }).city}` : ''}
                </p>
              )}
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${cfg.cls}`}>
              <cfg.Icon size={13} />
              {cfg.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Serial number',   value: eq.serial_number,    Icon: Hash     },
              { label: 'Installed',       value: eq.install_date ? new Date(eq.install_date).toLocaleDateString() : null,       Icon: Calendar },
              { label: 'Last service',    value: eq.last_service_date ? new Date(eq.last_service_date).toLocaleDateString() : null, Icon: Clock    },
              { label: 'Next service',    value: eq.next_service_date ? new Date(eq.next_service_date).toLocaleDateString() : null, Icon: Calendar },
            ].filter(m => m.value).map(({ label, value, Icon }) => (
              <div key={label} className="bg-stone-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-stone-400" />
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">{label}</p>
                </div>
                <p className="text-sm font-medium text-stone-700">{value}</p>
              </div>
            ))}
          </div>

          {eq.notes && (
            <p className="mt-3 text-sm text-stone-500 bg-stone-50 rounded-xl px-3 py-2.5">{eq.notes}</p>
          )}

          {/* Admin print link */}
          {profile?.role === 'admin' && (
            <Link
              to={`/equipment/${eq.id}/qr`}
              className="mt-3 flex items-center gap-2 text-xs text-stone-400 hover:text-stone-600 transition"
            >
              <Printer size={14} />
              Print QR code
            </Link>
          )}
        </div>

        {/* ── Report Issue Button ── */}
        <div className="px-4 py-4">
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl
              flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[.98] transition"
          >
            <Plus size={17} />
            Report an issue
          </button>
        </div>

        {/* ── Issue Form Modal ── */}
        {showForm && (
          <Suspense fallback={null}>
            <IssueForm
              equipment={eq}
              onClose={() => setShowForm(false)}
              onSubmit={handleIssueLogged}
            />
          </Suspense>
        )}

        {/* ── Issues list ── */}
        <div className="px-4 space-y-3 pb-8">
          {openIssues.length > 0 && (
            <>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Open issues ({openIssues.length})</p>
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

          {issues.filter(i => ['resolved','closed'].includes(i.status)).length > 0 && (
            <>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-4">Past issues</p>
              <div className="space-y-2 opacity-60">
                {issues.filter(i => ['resolved','closed'].includes(i.status)).slice(0, 3).map(issue => (
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
