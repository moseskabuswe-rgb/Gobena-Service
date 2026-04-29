import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAllEquipment, getAllServiceRequests, getShops,
  updateServiceRequestStatus, updateEquipmentStatus,
  insertTroubleshootEntry,
} from '../lib/queries';

import type { Equipment, ServiceRequest, Shop, RequestStatus } from '../types';
import { StatusBadge, RequestStatusBadge, PriorityBadge } from '../components/StatusBadge';
import {
  Building2, Wrench, ClipboardList, AlertTriangle,
  ChevronRight, Search, Plus, X, CheckCircle,
  Image as ImageIcon, BookOpen,
} from '../components/Icons';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Tab = 'overview' | 'equipment' | 'requests';

// ── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

// ── Media viewer modal ───────────────────────────────────────────────────────
function MediaModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const url = urls[idx];
  const isVideo = url?.match(/\.(mp4|mov|webm)/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-100">
          <span className="text-sm text-roast-500">{idx + 1} of {urls.length}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400">
            <X size={18} />
          </button>
        </div>
        <div className="bg-bark/5 flex items-center justify-center min-h-64 max-h-[60vh]">
          {isVideo ? (
            <video src={url} controls className="max-h-[60vh] w-full" />
          ) : (
            <img src={url} alt="" className="max-h-[60vh] object-contain" />
          )}
        </div>
        {urls.length > 1 && (
          <div className="flex gap-2 p-3 justify-center flex-wrap">
            {urls.map((u, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === idx ? 'border-brew-600' : 'border-transparent'
                }`}
              >
                <img src={u} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display='none')} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Resolution modal — required when marking resolved ────────────────────────
function ResolveModal({
  request,
  onClose,
  onSaved,
}: {
  request: ServiceRequest;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [notes,           setNotes]           = useState('');
  const [rootCause,       setRootCause]       = useState('');
  const [partsReplaced,   setPartsReplaced]   = useState('');
  const [addToLibrary,    setAddToLibrary]    = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  const equipment = request.equipment as any;

  const handleSave = async () => {
    if (!notes.trim()) { setError('Resolution notes are required.'); return; }
    setSaving(true);
    setError('');

    // 1. Update the request status + resolution notes
    const ok = await updateServiceRequestStatus(request.id, 'resolved', notes.trim());
    if (!ok) { setError('Failed to save. Please try again.'); setSaving(false); return; }

    // 2. Auto-populate troubleshoot library if checked
    if (addToLibrary && equipment) {
      await insertTroubleshootEntry({
        service_request_id:  request.id,
        equipment_id:        request.equipment_id,
        shop_id:             request.shop_id,
        issue_type:          request.issue_type,
        equipment_category:  equipment.category ?? 'Other',
        equipment_model:     equipment.model ?? undefined,
        problem_description: request.ai_summary ?? request.notes ?? request.issue_type,
        resolution_steps:    notes.trim(),
        root_cause:          rootCause.trim() || undefined,
        parts_replaced:      partsReplaced.trim() || undefined,
        is_public:           true,
      });
    }

    // 3. Mark equipment as Good if it was Urgent or Needs Attention
    if (equipment && ['urgent','needs_attention'].includes(equipment.status ?? '')) {
      await updateEquipmentStatus(request.equipment_id, 'good');
    }

    onSaved(request.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-cream-100">
          <div>
            <h2 className="font-display text-base font-semibold text-bark">Resolve Request</h2>
            <p className="text-xs text-roast-400 mt-0.5">{request.issue_type} — {(request.shops as any)?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Context */}
          {request.ai_summary && (
            <div className="bg-cream-50 rounded-xl p-3 border border-cream-200">
              <p className="text-xs font-medium text-roast-500 mb-1">Issue Summary</p>
              <p className="text-sm text-roast-700 leading-snug">{request.ai_summary}</p>
            </div>
          )}

          <div>
            <label className="form-label">Resolution Notes * <span className="text-roast-400 normal-case font-normal">(required)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              placeholder="Describe exactly what was done to fix this issue. Be specific — this will help diagnose the same problem in the future.

e.g. Replaced Group 2 solenoid valve (part #LM-SOL-002). Descaled both groups. Recalibrated extraction pressure to 9.0 bar. Ran 5 test shots — all consistent."
              className="form-input resize-none text-sm"
            />
          </div>

          <div>
            <label className="form-label">Root Cause (optional)</label>
            <input
              type="text"
              value={rootCause}
              onChange={e => setRootCause(e.target.value)}
              placeholder="e.g. Worn solenoid from heavy use, scale buildup in boiler"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Parts Replaced (optional)</label>
            <input
              type="text"
              value={partsReplaced}
              onChange={e => setPartsReplaced(e.target.value)}
              placeholder="e.g. Group solenoid, shower screen gasket, O-rings"
              className="form-input"
            />
          </div>

          {/* Add to troubleshoot library */}
          <button
            type="button"
            onClick={() => setAddToLibrary(v => !v)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left ${
              addToLibrary
                ? 'border-brew-400 bg-brew-50'
                : 'border-cream-200 bg-white hover:border-brew-200'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              addToLibrary ? 'border-brew-600 bg-brew-600' : 'border-cream-300'
            }`}>
              {addToLibrary && <CheckCircle size={12} className="text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium text-bark">Add to Troubleshoot Library</p>
              <p className="text-xs text-roast-400">Help coffee shops self-diagnose this issue in the future</p>
            </div>
          </button>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Saving…
                </span>
              ) : 'Mark Resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Equipment status editor ──────────────────────────────────────────────────
function EquipmentEditor({
  equipment: eq,
  onClose,
  onSaved,
}: {
  equipment: Equipment;
  onClose: () => void;
  onSaved: (id: string, status: string) => void;
}) {
  const [status,  setStatus]  = useState(eq.status);
  const [notes,   setNotes]   = useState((eq as any).notes ?? '');
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  const save = async () => {
    setSaving(true);
    const ok = await updateEquipmentStatus(eq.id, status as Equipment['status'], notes.trim() || undefined);
    setSaving(false);
    if (ok) { setSuccess(true); onSaved(eq.id, status); setTimeout(onClose, 700); }
  };

  const STATUS_OPTS = [
    { value: 'good',            label: 'Good',            desc: 'Fully operational' },
    { value: 'needs_attention', label: 'Needs Attention', desc: 'Minor issue'       },
    { value: 'urgent',          label: 'Urgent',          desc: 'Out of service'    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-cream-100">
          <div>
            <h2 className="font-display text-base font-semibold text-bark">Update Equipment</h2>
            <p className="text-xs text-roast-400 mt-0.5">{eq.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value as Equipment['status'])}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-medium text-left transition-all ${
                    status === opt.value
                      ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                      : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-roast-400 font-normal mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Service notes, observations…"
              className="form-input resize-none text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={save}
              disabled={saving || success}
              className="btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {success ? <span className="flex items-center gap-1.5"><CheckCircle size={14}/> Saved</span>
               : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shop drawer ──────────────────────────────────────────────────────────────
function ShopDrawer({
  shop, equipment, requests, onClose, onEditEquipment,
}: {
  shop: Shop;
  equipment: Equipment[];
  requests: ServiceRequest[];
  onClose: () => void;
  onEditEquipment: (eq: Equipment) => void;
}) {
  const navigate  = useNavigate();
  const shopEq    = equipment.filter(e => e.shop_id === shop.id);
  const shopReqs  = requests.filter(r => r.shop_id === shop.id);
  const openReqs  = shopReqs.filter(r => r.status === 'open' || r.status === 'in_progress');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-cream-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-display text-lg font-semibold text-bark">{shop.name}</h2>
            <p className="text-xs text-roast-400 mt-0.5">
              {[shop.address, shop.city, shop.state].filter(Boolean).join(', ')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400 shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Equipment',     value: shopEq.length   },
              { label: 'Open Requests', value: openReqs.length },
              { label: 'Total Requests',value: shopReqs.length },
            ].map(s => (
              <div key={s.label} className="card py-3 text-center">
                <p className="text-xl font-display font-bold text-bark">{s.value}</p>
                <p className="text-xs text-roast-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Equipment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="section-title text-base">Equipment</h3>
              <button
                onClick={() => { onClose(); navigate('/admin/add-equipment'); }}
                className="text-xs text-brew-600 font-medium flex items-center gap-1 hover:text-brew-800"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            {shopEq.length === 0 ? (
              <p className="text-sm text-roast-400 text-center py-4">No equipment yet.</p>
            ) : (
              <div className="divide-y divide-cream-100 border border-cream-200 rounded-xl overflow-hidden">
                {shopEq.map(eq => (
                  <div key={eq.id} className="flex items-center gap-3 px-4 py-3 hover:bg-cream-50/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bark truncate">{eq.name}</p>
                      <p className="text-xs text-roast-400">{eq.category}{eq.model ? ` · ${eq.model}` : ''}</p>
                    </div>
                    <StatusBadge status={eq.status} />
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => onEditEquipment(eq)}
                        className="text-xs px-2 py-1 rounded-lg bg-cream-100 text-roast-500 hover:bg-cream-200 border border-cream-200"
                      >Edit</button>
                      <Link
                        to={`/equipment/${eq.id}`}
                        onClick={onClose}
                        className="text-xs px-2 py-1 rounded-lg bg-brew-50 text-brew-700 hover:bg-brew-100 border border-brew-200"
                      >View</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requests */}
          <div>
            <h3 className="section-title text-base mb-2">Recent Requests</h3>
            {shopReqs.length === 0 ? (
              <p className="text-sm text-roast-400 text-center py-4">No requests yet.</p>
            ) : (
              <div className="divide-y divide-cream-100 border border-cream-200 rounded-xl overflow-hidden">
                {shopReqs.slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bark truncate">{req.issue_type}</p>
                      <p className="text-xs text-roast-400">{formatDate(req.created_at)}</p>
                    </div>
                    <RequestStatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact */}
          {((shop as any).contact_name || (shop as any).contact_email || (shop as any).contact_phone) && (
            <div className="border-t border-cream-100 pt-4">
              <h3 className="section-title text-base mb-2">Contact</h3>
              {(shop as any).contact_name  && <p className="text-sm text-bark font-medium">{(shop as any).contact_name}</p>}
              {(shop as any).contact_email && <p className="text-sm text-roast-500">{(shop as any).contact_email}</p>}
              {(shop as any).contact_phone && <p className="text-sm text-roast-500">{(shop as any).contact_phone}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [tab,        setTab]        = useState<Tab>('overview');
  const [shops,      setShops]      = useState<Shop[]>([]);
  const [equipment,  setEquipment]  = useState<Equipment[]>([]);
  const [requests,   setRequests]   = useState<ServiceRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [reqFilter,  setReqFilter]  = useState<RequestStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modals
  const [selectedShop,  setSelectedShop]  = useState<Shop | null>(null);
  const [editingEq,     setEditingEq]     = useState<Equipment | null>(null);
  const [resolvingReq,  setResolvingReq]  = useState<ServiceRequest | null>(null);
  const [mediaUrls,     setMediaUrls]     = useState<string[] | null>(null);

  const loadAll = async () => {
    const [s, e, r] = await Promise.all([getShops(), getAllEquipment(), getAllServiceRequests()]);
    setShops(s); setEquipment(e); setRequests(r); setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const handleStatusChange = async (id: string, newStatus: RequestStatus, req: ServiceRequest) => {
    if (newStatus === 'resolved') {
      setResolvingReq(req);
      return;
    }
    setUpdatingId(id);
    await updateServiceRequestStatus(id, newStatus);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setUpdatingId(null);
  };

  const handleResolved = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' as RequestStatus } : r));
    setResolvingReq(null);
  };

  const handleEquipmentSaved = (id: string, status: string) => {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, status: status as Equipment['status'] } : e));
    setEditingEq(null);
  };

  const filteredEquipment = equipment.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.shops as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter(r => {
    const matchStatus = reqFilter === 'all' || r.status === reqFilter;
    const matchSearch = !search ||
      r.issue_type.toLowerCase().includes(search.toLowerCase()) ||
      (r.shops as any)?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount     = requests.filter(r => r.status === 'open').length;
  const urgentEqCount = equipment.filter(e => e.status === 'urgent').length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview',  label: 'Overview'                          },
    { id: 'equipment', label: 'Equipment', count: equipment.length },
    { id: 'requests',  label: 'Requests',  count: openCount        },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Gobena Service · Partner Operations</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => navigate('/admin/add-shop')} className="btn-secondary text-xs py-2 px-3">
            <Building2 size={13} /> Add Shop
          </button>
          <button onClick={() => navigate('/admin/add-equipment')} className="btn-primary text-xs py-2 px-3">
            <Plus size={13} /> Add Equipment
          </button>
        </div>
      </div>

      {/* Stats — clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: 'Partner Shops',    value: shops.length,     color: 'bg-roast-600', onClick: () => setTab('overview')  },
          { icon: Wrench,        label: 'Equipment Units',  value: equipment.length, color: 'bg-brew-600',  onClick: () => setTab('equipment') },
          { icon: AlertTriangle, label: 'Urgent Equipment', value: urgentEqCount,    color: 'bg-red-500',   onClick: () => setTab('equipment') },
          { icon: ClipboardList, label: 'Open Requests',    value: openCount,        color: 'bg-blue-500',  onClick: () => { setTab('requests'); setReqFilter('open'); } },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="card flex items-center gap-3 text-left hover:shadow-warm transition-shadow cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-bark">{stat.value}</p>
              <p className="text-xs text-roast-400">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-cream-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
              tab === t.id
                ? 'text-brew-700 border-b-2 border-brew-600 -mb-px'
                : 'text-roast-400 hover:text-roast-600'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-brew-100 text-brew-700' : 'bg-cream-200 text-roast-500'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {(tab === 'equipment' || tab === 'requests') && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-roast-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'equipment' ? 'Search equipment or shop…' : 'Search requests…'}
              className="form-input pl-9"
            />
          </div>
          {tab === 'requests' && (
            <div className="flex gap-1.5 flex-wrap">
              {(['all','open','in_progress','resolved','closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setReqFilter(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                    reqFilter === s
                      ? 'bg-brew-700 text-cream-50'
                      : 'bg-white text-roast-500 border border-cream-200 hover:border-brew-300'
                  }`}
                >
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && !loading && (
        <div className="space-y-5">
          <div>
            <h2 className="section-title mb-3">Partner Shops</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {shops.map(shop => {
                const shopEq   = equipment.filter(e => e.shop_id === shop.id);
                const hasUrgent = shopEq.some(e => e.status === 'urgent');
                const openReqs  = requests.filter(r => r.shop_id === shop.id && (r.status === 'open' || r.status === 'in_progress'));
                return (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className="card text-left hover:shadow-warm hover:border-brew-200 transition-all cursor-pointer group border border-transparent"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-medium text-bark group-hover:text-brew-700 transition-colors">
                          {shop.name}
                        </h3>
                        <p className="text-xs text-roast-400 mt-0.5">{shop.city}, {shop.state}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasUrgent && (
                          <span className="badge bg-red-50 text-red-600 border border-red-200">
                            <AlertTriangle size={10} /> Urgent
                          </span>
                        )}
                        <ChevronRight size={14} className="text-roast-300 group-hover:text-brew-500 transition-colors" />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-cream-100">
                      <div className="text-center">
                        <p className="text-base font-bold text-bark">{shopEq.length}</p>
                        <p className="text-xs text-roast-400">Equipment</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-bark">{openReqs.length}</p>
                        <p className="text-xs text-roast-400">Open Reqs</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => navigate('/admin/add-shop')}
                className="card border-2 border-dashed border-cream-300 hover:border-brew-300 transition-colors flex flex-col items-center justify-center gap-2 py-8 text-roast-400 hover:text-brew-600 group"
              >
                <Plus size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Add Partner Shop</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Recent Open Requests</h2>
              {openCount > 0 && (
                <button
                  onClick={() => { setTab('requests'); setReqFilter('open'); }}
                  className="text-xs text-brew-600 font-medium hover:text-brew-800"
                >
                  View all →
                </button>
              )}
            </div>
            {requests.filter(r => r.status === 'open').length === 0 ? (
              <div className="card text-center py-8 text-roast-400 text-sm">No open requests. All good ✓</div>
            ) : (
              <div className="card p-0 overflow-hidden divide-y divide-cream-100">
                {requests.filter(r => r.status === 'open').slice(0, 5).map(req => (
                  <button
                    key={req.id}
                    onClick={() => { setTab('requests'); setReqFilter('open'); }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-cream-50/60 transition-colors w-full text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bark truncate">{req.issue_type}</p>
                      <p className="text-xs text-roast-400">
                        {(req.shops as any)?.name} · {(req.equipment as any)?.name} · {formatDate(req.created_at)}
                      </p>
                    </div>
                    <PriorityBadge priority={req.priority} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT ── */}
      {tab === 'equipment' && !loading && (
        <div className="space-y-2">
          {filteredEquipment.length === 0 ? (
            <div className="card text-center py-10 text-roast-400 text-sm">No equipment found.</div>
          ) : (
            <div className="card p-0 overflow-hidden divide-y divide-cream-100">
              {filteredEquipment.map(eq => (
                <div key={eq.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream-50/60">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bark">{eq.name}</p>
                    <p className="text-xs text-roast-400">
                      {(eq.shops as any)?.name} · {eq.category}{eq.model ? ` · ${eq.model}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={eq.status} />
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingEq(eq)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-cream-100 text-roast-600 hover:bg-cream-200 border border-cream-200"
                    >Edit</button>
                    <Link
                      to={`/equipment/${eq.id}`}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-brew-50 text-brew-700 hover:bg-brew-100 border border-brew-200 flex items-center gap-1"
                    >
                      View <ChevronRight size={11} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-center text-roast-300 pt-1">
            {filteredEquipment.length} of {equipment.length} units
          </p>
        </div>
      )}

      {/* ── REQUESTS ── */}
      {tab === 'requests' && !loading && (
        <div className="space-y-2">
          {filteredRequests.length === 0 ? (
            <div className="card text-center py-10 text-roast-400 text-sm">No requests found.</div>
          ) : (
            <div className="card p-0 overflow-hidden divide-y divide-cream-100">
              {filteredRequests.map(req => (
                <div key={req.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-bark">{req.issue_type}</p>
                      <p className="text-xs text-roast-400 mt-0.5">
                        {(req.shops as any)?.name} ·{' '}
                        <Link to={`/equipment/${req.equipment_id}`} className="text-brew-600 hover:text-brew-800">
                          {(req.equipment as any)?.name}
                        </Link>
                        {' · '}{formatDate(req.created_at)}
                      </p>
                      {/* AI summary */}
                      {req.ai_summary && (
                        <p className="text-xs text-roast-600 mt-1.5 leading-snug line-clamp-2 bg-cream-50 px-2 py-1 rounded-lg border border-cream-100">
                          {req.ai_summary}
                        </p>
                      )}
                      {/* Fallback notes */}
                      {!req.ai_summary && req.notes && (
                        <p className="text-xs text-roast-500 mt-1.5 italic line-clamp-2">"{req.notes}"</p>
                      )}
                      {/* Resolution notes */}
                      {req.resolution_notes && (
                        <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                          <p className="text-xs font-medium text-emerald-700 mb-0.5">Resolution</p>
                          <p className="text-xs text-emerald-800 line-clamp-2">{req.resolution_notes}</p>
                        </div>
                      )}
                      {/* Media indicator */}
                      {req.media_urls?.length > 0 && (
                        <button
                          onClick={() => setMediaUrls(req.media_urls)}
                          className="flex items-center gap-1 text-xs text-brew-600 mt-1.5 hover:text-brew-800"
                        >
                          <ImageIcon size={11} /> {req.media_urls.length} attachment{req.media_urls.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <PriorityBadge priority={req.priority} />
                      <RequestStatusBadge status={req.status} />
                    </div>
                  </div>

                  {/* Status updater */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {(['open','in_progress','resolved','closed'] as RequestStatus[]).map(s => (
                      <button
                        key={s}
                        disabled={req.status === s || updatingId === req.id}
                        onClick={() => handleStatusChange(req.id, s, req)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                          req.status === s
                            ? 'bg-brew-700 text-cream-50 cursor-default'
                            : s === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-cream-100 text-roast-500 hover:bg-cream-200 border border-cream-200'
                        }`}
                      >
                        {s.replace('_',' ')}
                      </button>
                    ))}

                    {/* Troubleshoot library link for resolved */}
                    {req.status === 'resolved' && req.resolution_notes && (
                      <Link
                        to="/troubleshoot"
                        className="flex items-center gap-1 text-xs text-roast-400 hover:text-brew-600 ml-auto"
                      >
                        <BookOpen size={11} /> In library
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-center text-roast-300 pt-1">
            {filteredRequests.length} of {requests.length} requests
          </p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16"><Spinner /></div>
      )}

      {/* ── Modals ── */}
      {selectedShop && (
        <ShopDrawer
          shop={selectedShop}
          equipment={equipment}
          requests={requests}
          onClose={() => setSelectedShop(null)}
          onEditEquipment={eq => { setSelectedShop(null); setEditingEq(eq); }}
        />
      )}
      {editingEq && (
        <EquipmentEditor
          equipment={editingEq}
          onClose={() => setEditingEq(null)}
          onSaved={handleEquipmentSaved}
        />
      )}
      {resolvingReq && (
        <ResolveModal
          request={resolvingReq}
          onClose={() => setResolvingReq(null)}
          onSaved={handleResolved}
        />
      )}
      {mediaUrls && (
        <MediaModal urls={mediaUrls} onClose={() => setMediaUrls(null)} />
      )}
    </main>
  );
}
