import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  getShop, getEquipmentByShop, getServiceRequestsByShop,
} from '../lib/queries';
import type { Equipment, ServiceRequest, Shop } from '../types';
import { RequestStatusBadge, PriorityBadge } from '../components/StatusBadge';
import EquipmentCard from '../components/EquipmentCard';
import {
  Wrench, AlertTriangle, Clock, ChevronRight,
  Building2, BookOpen, X, ImageIcon,
} from '../components/Icons';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Stat card — now clickable ─────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-bark">{value}</p>
        <p className="text-xs text-roast-400 font-body mt-0.5">{label}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="card flex items-center gap-4 hover:shadow-warm transition-shadow cursor-pointer text-left"
      >
        {inner}
      </button>
    );
  }
  return <div className="card flex items-center gap-4">{inner}</div>;
}

// ── Request detail drawer ─────────────────────────────────────────────────────
function RequestDrawer({
  request,
  onClose,
}: {
  request: ServiceRequest;
  onClose: () => void;
}) {
  const equipment = request.equipment as any;

  const hasAnswers = request.diagnostic_answers &&
    Object.keys(request.diagnostic_answers).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-md max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-cream-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-display text-base font-semibold text-bark">{request.issue_type}</h2>
            <p className="text-xs text-roast-400 mt-0.5">
              {equipment?.name} · {formatDateFull(request.created_at)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status + priority */}
          <div className="flex gap-2">
            <RequestStatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>

          {/* AI Summary */}
          {request.ai_summary && (
            <div className="bg-brew-50 border border-brew-200 rounded-xl p-3">
              <p className="text-xs font-medium text-brew-700 mb-1">AI Summary</p>
              <p className="text-sm text-bark leading-relaxed">{request.ai_summary}</p>
            </div>
          )}

          {/* Original notes */}
          {request.notes && !request.ai_summary && (
            <div>
              <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-1.5">Notes</p>
              <p className="text-sm text-roast-700">{request.notes}</p>
            </div>
          )}

          {/* Diagnostic answers */}
          {hasAnswers && (
            <div>
              <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-2">Diagnostic Answers</p>
              <div className="space-y-2">
                {Object.entries(request.diagnostic_answers).map(([key, val]) => (
                  <div key={key} className="bg-cream-50 rounded-xl px-3 py-2 border border-cream-200">
                    <p className="text-xs text-roast-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-bark mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Media */}
          {request.media_urls?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-2">
                Attachments
              </p>
              <div className="flex flex-wrap gap-2">
                {request.media_urls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-20 rounded-xl overflow-hidden border border-cream-200 flex items-center justify-center bg-cream-50 hover:opacity-80 transition-opacity"
                  >
                    {url.match(/\.(mp4|mov|webm)/i) ? (
                      <div className="flex flex-col items-center text-roast-400">
                        <ImageIcon size={20} />
                        <span className="text-xs mt-1">Video</span>
                      </div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          {request.resolution_notes && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-medium text-emerald-700 mb-1">How Gobena Resolved This</p>
              <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-line">
                {request.resolution_notes}
              </p>
              {request.resolved_at && (
                <p className="text-xs text-emerald-600 mt-2">
                  Resolved on {formatDateFull(request.resolved_at)}
                </p>
              )}
            </div>
          )}

          {/* Equipment link */}
          <Link
            to={`/equipment/${request.equipment_id}`}
            onClick={onClose}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-cream-200 hover:border-brew-300 hover:bg-cream-50 transition-colors"
          >
            <div>
              <p className="text-xs text-roast-400">Equipment</p>
              <p className="text-sm font-medium text-bark">{equipment?.name}</p>
              <p className="text-xs text-roast-400">{equipment?.category}</p>
            </div>
            <ChevronRight size={14} className="text-roast-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate     = useNavigate();

  const [shop,      setShop]      = useState<Shop | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [requests,  setRequests]  = useState<ServiceRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  useEffect(() => {
    if (!profile?.shop_id) { setLoading(false); return; }
    Promise.all([
      getShop(profile.shop_id),
      getEquipmentByShop(profile.shop_id),
      getServiceRequestsByShop(profile.shop_id),
    ]).then(([s, e, r]) => {
      setShop(s); setEquipment(e); setRequests(r); setLoading(false);
    });
  }, [profile]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-center h-40">
          <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </main>
    );
  }

  if (!profile?.shop_id) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="card text-center py-12">
          <Building2 size={40} className="mx-auto text-roast-300 mb-3" />
          <h2 className="font-display text-lg text-bark">No shop linked</h2>
          <p className="text-sm text-roast-400 mt-1">
            Contact Gobena to link your account to a coffee shop.
          </p>
        </div>
      </main>
    );
  }

  const urgentCount    = equipment.filter(e => e.status === 'urgent').length;
  const attentionCount = equipment.filter(e => e.status === 'needs_attention').length;
  const openRequests   = requests.filter(r => r.status === 'open' || r.status === 'in_progress');

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">{shop?.name ?? 'Your Dashboard'}</h1>
        <p className="page-subtitle">
          {shop?.city && shop?.state ? `${shop.city}, ${shop.state} · ` : ''}
          Good morning, {profile.full_name?.split(' ')[0] ?? 'partner'} ☕
        </p>
      </div>

      {/* Urgent alert */}
      {urgentCount > 0 && (
        <button
          onClick={() => navigate('/equipment')}
          className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 w-full text-left hover:bg-red-100 transition-colors"
        >
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium flex-1">
            {urgentCount} piece{urgentCount > 1 ? 's' : ''} of equipment need{urgentCount === 1 ? 's' : ''} urgent attention
          </p>
          <ChevronRight size={14} className="text-red-400 shrink-0" />
        </button>
      )}

      {/* Stats — all clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Wrench}
          label="Total Equipment"
          value={equipment.length}
          color="bg-brew-600"
          onClick={() => navigate('/equipment')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Need Attention"
          value={attentionCount + urgentCount}
          color="bg-amber-500"
          onClick={() => navigate('/equipment')}
        />
        <StatCard
          icon={Clock}
          label="Open Requests"
          value={openRequests.length}
          color="bg-blue-500"
        />
      </div>

      {/* Equipment section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Equipment</h2>
          <Link to="/equipment" className="text-xs text-brew-600 font-medium flex items-center gap-0.5 hover:text-brew-800">
            View all <ChevronRight size={13} />
          </Link>
        </div>
        {equipment.length === 0 ? (
          <div className="card text-center py-8 text-roast-400 text-sm">
            No equipment registered yet. Contact Gobena to get started.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {equipment.slice(0, 4).map(eq => (
              <EquipmentCard key={eq.id} equipment={eq} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Service Requests — clickable rows */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Recent Service Requests</h2>
        </div>
        {requests.length === 0 ? (
          <div className="card text-center py-8 text-roast-400 text-sm">
            No service requests yet.
          </div>
        ) : (
          <div className="card divide-y divide-cream-100 p-0 overflow-hidden">
            {requests.slice(0, 6).map(req => (
              <button
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="flex items-center justify-between gap-3 px-5 py-3.5 w-full text-left hover:bg-cream-50/60 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-bark truncate group-hover:text-brew-700 transition-colors">
                    {req.issue_type}
                  </p>
                  <p className="text-xs text-roast-400 mt-0.5">
                    {(req.equipment as any)?.name} · {formatDate(req.created_at)}
                    {req.media_urls?.length > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-roast-300">
                        <ImageIcon size={10} /> {req.media_urls.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RequestStatusBadge status={req.status} />
                  <ChevronRight size={13} className="text-roast-300 group-hover:text-brew-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Troubleshoot library teaser */}
      <Link
        to="/troubleshoot"
        className="card flex items-center gap-4 hover:shadow-warm hover:border-brew-200 transition-all group border border-transparent"
      >
        <div className="w-10 h-10 rounded-xl bg-brew-50 border border-brew-200 flex items-center justify-center shrink-0">
          <BookOpen size={18} className="text-brew-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-bark group-hover:text-brew-700 transition-colors">
            Troubleshoot Library
          </p>
          <p className="text-xs text-roast-400">
            Search past issues and how Gobena resolved them before submitting a request
          </p>
        </div>
        <ChevronRight size={16} className="text-roast-300 group-hover:text-brew-500 transition-colors shrink-0" />
      </Link>

      {/* Request detail drawer */}
      {selectedRequest && (
        <RequestDrawer
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </main>
  );
}
