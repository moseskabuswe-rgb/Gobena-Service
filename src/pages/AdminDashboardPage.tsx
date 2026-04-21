import { useEffect, useState } from 'react';
import {
  getAllEquipment,
  getAllServiceRequests,
  getShops,
  updateServiceRequestStatus,
} from '../lib/queries';
import type { Equipment, ServiceRequest, Shop, RequestStatus } from '../types';
import { StatusBadge, RequestStatusBadge, PriorityBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  Building2, Wrench, ClipboardList, AlertTriangle,
  ChevronRight, Search,
} from 'lucide-react';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

type Tab = 'overview' | 'equipment' | 'requests';

export default function AdminDashboardPage() {
  const [tab,       setTab]       = useState<Tab>('overview');
  const [shops,     setShops]     = useState<Shop[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [requests,  setRequests]  = useState<ServiceRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [reqFilter, setReqFilter] = useState<RequestStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAll = async () => {
    const [s, e, r] = await Promise.all([
      getShops(),
      getAllEquipment(),
      getAllServiceRequests(),
    ]);
    setShops(s);
    setEquipment(e);
    setRequests(r);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    setUpdatingId(id);
    await updateServiceRequestStatus(id, status);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setUpdatingId(null);
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
    { id: 'overview',  label: 'Overview'          },
    { id: 'equipment', label: 'Equipment', count: equipment.length },
    { id: 'requests',  label: 'Requests',  count: openCount       },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Gobena Service · Partner Operations</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Building2,     label: 'Partner Shops',    value: shops.length,     color: 'bg-roast-600'  },
          { icon: Wrench,        label: 'Equipment Units',  value: equipment.length, color: 'bg-brew-600'   },
          { icon: AlertTriangle, label: 'Urgent Equipment', value: urgentEqCount,    color: 'bg-red-500'    },
          { icon: ClipboardList, label: 'Open Requests',    value: openCount,        color: 'bg-blue-500'   },
        ].map(stat => (
          <div key={stat.label} className="card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-display font-bold text-bark">{stat.value}</p>
              <p className="text-xs text-roast-400">{stat.label}</p>
            </div>
          </div>
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

      {/* Search bar (for equipment + requests tabs) */}
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
              {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setReqFilter(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                    reqFilter === s
                      ? 'bg-brew-700 text-cream-50'
                      : 'bg-white text-roast-500 border border-cream-200 hover:border-brew-300'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && !loading && (
        <div className="space-y-5">
          {/* Shops grid */}
          <div>
            <h2 className="section-title mb-3">Partner Shops</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {shops.map(shop => {
                const shopEquipment = equipment.filter(e => e.shop_id === shop.id);
                const hasUrgent     = shopEquipment.some(e => e.status === 'urgent');
                const shopRequests  = requests.filter(r => r.shop_id === shop.id && (r.status === 'open' || r.status === 'in_progress'));
                return (
                  <div key={shop.id} className="card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-medium text-bark">{shop.name}</h3>
                        <p className="text-xs text-roast-400 mt-0.5">{shop.city}, {shop.state}</p>
                      </div>
                      {hasUrgent && (
                        <span className="badge bg-red-50 text-red-600 border border-red-200">
                          <AlertTriangle size={10} /> Urgent
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-cream-100">
                      <div className="text-center">
                        <p className="text-base font-bold text-bark">{shopEquipment.length}</p>
                        <p className="text-xs text-roast-400">Equipment</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-bark">{shopRequests.length}</p>
                        <p className="text-xs text-roast-400">Open Reqs</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent requests */}
          <div>
            <h2 className="section-title mb-3">Recent Open Requests</h2>
            {requests.filter(r => r.status === 'open').length === 0 ? (
              <div className="card text-center py-8 text-roast-400 text-sm">
                No open requests. All good ✓
              </div>
            ) : (
              <div className="card p-0 overflow-hidden divide-y divide-cream-100">
                {requests.filter(r => r.status === 'open').slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-bark truncate">{req.issue_type}</p>
                      <p className="text-xs text-roast-400">
                        {(req.shops as any)?.name} · {(req.equipment as any)?.name} · {formatDate(req.created_at)}
                      </p>
                    </div>
                    <PriorityBadge priority={req.priority} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT TAB ── */}
      {tab === 'equipment' && !loading && (
        <div className="space-y-2">
          {filteredEquipment.length === 0 ? (
            <div className="card text-center py-10 text-roast-400 text-sm">No equipment found.</div>
          ) : (
            <div className="card p-0 overflow-hidden divide-y divide-cream-100">
              {filteredEquipment.map(eq => (
                <Link
                  key={eq.id}
                  to={`/equipment/${eq.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-cream-50/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bark group-hover:text-brew-700 transition-colors">
                      {eq.name}
                    </p>
                    <p className="text-xs text-roast-400">
                      {(eq.shops as any)?.name} · {eq.category}
                      {eq.model ? ` · ${eq.model}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={eq.status} />
                  <ChevronRight size={14} className="text-roast-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
          <p className="text-xs text-center text-roast-300 pt-1">
            {filteredEquipment.length} of {equipment.length} units
          </p>
        </div>
      )}

      {/* ── REQUESTS TAB ── */}
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
                        <Link
                          to={`/equipment/${req.equipment_id}`}
                          className="text-brew-600 hover:text-brew-800"
                        >
                          {(req.equipment as any)?.name}
                        </Link>
                        {' · '}{formatDate(req.created_at)}
                      </p>
                      {req.notes && (
                        <p className="text-xs text-roast-500 mt-1.5 italic line-clamp-2">"{req.notes}"</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <PriorityBadge priority={req.priority} />
                      <RequestStatusBadge status={req.status} />
                    </div>
                  </div>

                  {/* Status updater */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {(['open', 'in_progress', 'resolved', 'closed'] as RequestStatus[]).map(s => (
                      <button
                        key={s}
                        disabled={req.status === s || updatingId === req.id}
                        onClick={() => handleStatusChange(req.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${
                          req.status === s
                            ? 'bg-brew-700 text-cream-50 cursor-default'
                            : 'bg-cream-100 text-roast-500 hover:bg-cream-200 border border-cream-200'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
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
        <div className="flex justify-center py-16">
          <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </main>
  );
}
