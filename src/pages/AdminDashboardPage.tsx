import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Issue, Shop, Equipment } from '../types';
import {
  Store, AlertCircle, CheckCircle, Clock, BarChart2,
  ChevronRight, RefreshCw, Zap, Users, Wrench, Bell,
} from '../components/Icons';

const severityColor: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-stone-100 text-stone-500 border-stone-200',
};
const issueStatusLabel: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', resolved: 'Resolved', closed: 'Closed',
};

interface AdminStats {
  totalShops: number;
  pendingShops: number;
  openIssues: number;
  criticalIssues: number;
  totalEquipment: number;
  equipmentNeedingAttention: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [issues, setIssues] = useState<(Issue & { shops?: { name: string } })[]>([]);
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadData = async () => {
    const [shopRes, issueRes, eqRes] = await Promise.all([
      supabase.from('shops').select('id, name, status, city, contact_name, contact_email, created_at').order('created_at', { ascending: false }),
      supabase
        .from('issues')
        .select('id, title, severity, status, created_at, shop_id, equipment_id, shops:shop_id(name), equipment:equipment_id(name)')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('equipment').select('id, status').neq('status', 'null'),
    ]);

    const shops = (shopRes.data as Shop[]) || [];
    const issueList = (issueRes.data as (Issue & { shops?: { name: string } })[]) || [];
    const equipment = (eqRes.data as Equipment[]) || [];

    setIssues(issueList);
    setPendingShops(shops.filter(s => s.status === 'pending'));
    setStats({
      totalShops:               shops.filter(s => s.status === 'approved').length,
      pendingShops:             shops.filter(s => s.status === 'pending').length,
      openIssues:               issueList.filter(i => i.status === 'open').length,
      criticalIssues:           issueList.filter(i => i.severity === 'critical').length,
      totalEquipment:           equipment.length,
      equipmentNeedingAttention: equipment.filter(e => e.status !== 'operational').length,
    });
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Real-time subscription for new issues
    realtimeRef.current = supabase
      .channel('admin-issues')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'issues' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'issues' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      realtimeRef.current?.unsubscribe();
    };
  }, []);

  const resolveIssue = async (issueId: string) => {
    await supabase
      .from('issues')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', issueId);
    setIssues(prev => prev.filter(i => i.id !== issueId));
  };

  const approveShop = async (shopId: string) => {
    await supabase
      .from('shops')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', shopId);
    setPendingShops(prev => prev.filter(s => s.id !== shopId));
    setStats(prev => prev ? { ...prev, pendingShops: prev.pendingShops - 1, totalShops: prev.totalShops + 1 } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
            <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Live · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={loadData} className="p-2 text-stone-400 hover:text-stone-600 transition">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Active shops',    value: stats.totalShops,               Icon: Store,       alert: false },
              { label: 'Pending approval',value: stats.pendingShops,             Icon: Clock,       alert: stats.pendingShops > 0 },
              { label: 'Open issues',     value: stats.openIssues,               Icon: AlertCircle, alert: stats.openIssues > 0 },
              { label: 'Critical issues', value: stats.criticalIssues,           Icon: Zap,         alert: stats.criticalIssues > 0 },
              { label: 'Equipment',       value: stats.totalEquipment,           Icon: Wrench,      alert: false },
              { label: 'Needs attention', value: stats.equipmentNeedingAttention,Icon: Bell,        alert: stats.equipmentNeedingAttention > 0 },
            ].map(({ label, value, Icon, alert }) => (
              <div key={label} className={`bg-white rounded-2xl border px-4 py-4 ${alert && value > 0 ? 'border-amber-200' : 'border-stone-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={16} className={alert && value > 0 ? 'text-amber-600' : 'text-stone-400'} />
                </div>
                <p className="text-3xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pending shop approvals */}
        {pendingShops.length > 0 && (
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
              Pending approvals ({pendingShops.length})
            </p>
            <div className="space-y-2">
              {pendingShops.map(shop => (
                <div key={shop.id} className="bg-white rounded-2xl border border-amber-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-stone-800">{shop.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{shop.city} · {shop.contact_name} · {shop.contact_email}</p>
                      <p className="text-xs text-stone-400 mt-0.5">Requested {new Date(shop.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => approveShop(shop.id)}
                        className="px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition"
                      >
                        Approve
                      </button>
                      <Link
                        to={`/admin/shops`}
                        className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-200 transition"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live issues feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Open issues
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block ml-2" />
            </p>
            <Link to="/admin/issues" className="text-xs text-amber-700 font-medium">View all →</Link>
          </div>

          {issues.length === 0 ? (
            <div className="text-center py-8 text-stone-400 bg-white rounded-2xl border border-stone-100">
              <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
              <p className="text-sm">No open issues — all clear</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 8).map(issue => (
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
                        {(issue.shops as unknown as { name: string } | null)?.name} ·{' '}
                        {new Date(issue.created_at).toLocaleDateString()} at{' '}
                        {new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveIssue(issue.id)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-xl hover:bg-green-100 transition"
                    >
                      <CheckCircle size={13} />
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Manage</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { to: '/admin/shops',     label: 'Shops',    sub: 'Add, approve, manage shops', Icon: Store   },
              { to: '/admin/equipment', label: 'Equipment',sub: 'All machines across shops',   Icon: Wrench  },
              { to: '/admin/issues',    label: 'All issues',sub: 'Full issue history & search', Icon: AlertCircle },
            ].map(({ to, label, sub, Icon }) => (
              <Link
                key={to}
                to={to}
                className="bg-white rounded-2xl border border-stone-100 px-4 py-4 flex items-center gap-3 hover:border-stone-200 hover:shadow-sm transition"
              >
                <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-stone-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
                </div>
                <ChevronRight size={16} className="text-stone-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
