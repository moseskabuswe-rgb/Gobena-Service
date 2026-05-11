import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Issue, Shop, Equipment } from '../types';
import {
  Store, AlertCircle, CheckCircle, Clock, Wrench,
  ChevronRight, RefreshCw, Zap, Bell,
} from '../components/Icons';

const severityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-stone-100 text-stone-500 border-stone-200',
};

interface AdminStats {
  totalShops: number; pendingShops: number; openIssues: number;
  criticalIssues: number; totalEquipment: number; equipmentNeedingAttention: number;
}
type IssueWithShop = Issue & { shops?: { name: string } | null };

export default function AdminDashboardPage() {
  const [stats, setStats]           = useState<AdminStats | null>(null);
  const [issues, setIssues]         = useState<IssueWithShop[]>([]);
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadData = async () => {
    const [shopRes, issueRes, eqRes] = await Promise.all([
      supabase.from('shops').select('id, name, status, city, contact_name, contact_email, address, state, contact_phone, approved_at, approved_by, notes, created_at').order('created_at', { ascending: false }),
      supabase.from('issues').select('id, title, severity, status, created_at, shop_id, equipment_id, reported_by, reporter_name, reporter_email, description, resolution_notes, resolved_at, resolved_by, shops:shop_id(name)').in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(20),
      supabase.from('equipment').select('id, status'),
    ]);
    const shops = (shopRes.data as unknown as Shop[]) || [];
    const issueList = (issueRes.data as unknown as IssueWithShop[]) || [];
    const equipment = (eqRes.data as unknown as Equipment[]) || [];
    setIssues(issueList);
    setPendingShops(shops.filter(s => s.status === 'pending'));
    setStats({
      totalShops: shops.filter(s => s.status === 'approved').length,
      pendingShops: shops.filter(s => s.status === 'pending').length,
      openIssues: issueList.filter(i => i.status === 'open').length,
      criticalIssues: issueList.filter(i => i.severity === 'critical').length,
      totalEquipment: equipment.length,
      equipmentNeedingAttention: equipment.filter(e => e.status !== 'operational').length,
    });
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    realtimeRef.current = supabase.channel('admin-issues')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, () => loadData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, () => loadData())
      .subscribe();
    return () => { realtimeRef.current?.unsubscribe(); };
  }, []);

  const resolveIssue = async (issueId: string) => {
    await supabase.from('issues').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', issueId);
    setIssues(prev => prev.filter(i => i.id !== issueId));
  };

  const approveShop = async (shopId: string) => {
    await supabase.from('shops').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', shopId);
    setPendingShops(prev => prev.filter(s => s.id !== shopId));
    setStats(prev => prev ? { ...prev, pendingShops: prev.pendingShops - 1, totalShops: prev.totalShops + 1 } : prev);
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Overview</h1>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Live · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={loadData} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Stats grid — 3 cols mobile, 6 cols desktop */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Active shops',     value: stats.totalShops,                Icon: Store,       alert: false },
              { label: 'Pending',          value: stats.pendingShops,              Icon: Clock,       alert: stats.pendingShops > 0 },
              { label: 'Open issues',      value: stats.openIssues,                Icon: AlertCircle, alert: stats.openIssues > 0 },
              { label: 'Critical',         value: stats.criticalIssues,            Icon: Zap,         alert: stats.criticalIssues > 0 },
              { label: 'Equipment',        value: stats.totalEquipment,            Icon: Wrench,      alert: false },
              { label: 'Need attention',   value: stats.equipmentNeedingAttention, Icon: Bell,        alert: stats.equipmentNeedingAttention > 0 },
            ].map(({ label, value, Icon, alert }) => (
              <div key={label} className={`bg-white rounded-2xl border px-3 py-3 md:px-4 md:py-4 ${alert && value > 0 ? 'border-amber-200' : 'border-stone-100'}`}>
                <Icon size={15} className={`mb-1.5 ${alert && value > 0 ? 'text-amber-600' : 'text-stone-400'}`} />
                <p className="text-2xl md:text-3xl font-bold text-stone-900">{value}</p>
                <p className="text-[10px] md:text-xs text-stone-400 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Two-column layout on desktop */}
        <div className="md:grid md:grid-cols-5 md:gap-8">

          {/* Left: issues feed (wider) */}
          <div className="md:col-span-3 space-y-6">

            {pendingShops.length > 0 && (
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                  Pending approvals ({pendingShops.length})
                </p>
                <div className="space-y-2">
                  {pendingShops.map(shop => (
                    <div key={shop.id} className="bg-white rounded-2xl border border-amber-200 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-800">{shop.name}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{shop.city} · {shop.contact_name} · {shop.contact_email}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => approveShop(shop.id)}
                            className="px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition">
                            Approve
                          </button>
                          <Link to="/admin/shops" className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-200 transition">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  Open issues
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                </p>
                <Link to="/admin/issues" className="text-xs text-amber-700 font-medium">View all →</Link>
              </div>
              {issues.length === 0 ? (
                <div className="text-center py-10 text-stone-400 bg-white rounded-2xl border border-stone-100">
                  <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No open issues — all clear</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.slice(0, 10).map(issue => (
                    <div key={issue.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-stone-800">{issue.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor[issue.severity]}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">
                            {issue.shops?.name} · {new Date(issue.created_at).toLocaleDateString()} {new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button onClick={() => resolveIssue(issue.id)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition">
                          <CheckCircle size={13} /> Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: quick nav */}
          <div className="md:col-span-2 mt-6 md:mt-0">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Manage</p>
            <div className="space-y-2">
              {[
                { to: '/admin/shops',     label: 'Shops',      sub: 'Add, approve, manage shops',   Icon: Store        },
                { to: '/admin/equipment', label: 'Equipment',  sub: 'All machines across shops',     Icon: Wrench       },
                { to: '/admin/issues',    label: 'All issues', sub: 'Full history & search',         Icon: AlertCircle  },
              ].map(({ to, label, sub, Icon }) => (
                <Link key={to} to={to}
                  className="bg-white rounded-2xl border border-stone-100 px-4 py-4 flex items-center gap-3 hover:border-stone-200 hover:shadow-sm transition">
                  <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800">{label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
                  </div>
                  <ChevronRight size={15} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
