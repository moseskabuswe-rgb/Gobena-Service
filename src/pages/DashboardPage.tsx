import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Issue, Equipment } from '../types';
import {
  AlertCircle, Wrench, ClipboardList, BookOpen,
  ChevronRight, Coffee, Clock, TrendingUp, Zap, Calendar,
} from '../components/Icons';

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-stone-100 text-stone-600 border-stone-200',
};
const eqStatusColors: Record<string, string> = {
  operational:     'bg-green-100 text-green-700',
  needs_attention: 'bg-amber-100 text-amber-700',
  out_of_service:  'bg-red-100 text-red-700',
};
const eqStatusLabel: Record<string, string> = {
  operational: 'Good', needs_attention: 'Needs attention', out_of_service: 'Out of service',
};

const TIPS = [
  'Backflush your espresso machine daily to prevent oil buildup and bitter shots.',
  'Descale your equipment every 3 months — hard water is the silent killer of machines.',
  'Purge steam wands before and after each use to avoid milk residue blocking valves.',
  'Check your grinder burrs every 6 months — dull burrs cause inconsistent extraction.',
  'Keep drip trays clean. Bacteria in standing water affects flavor and hygiene scores.',
  'Log every issue early, even minor ones. Small problems caught early save big repair costs.',
  'Water filter cartridges should be replaced every 6 months or 500 gallons.',
];
function tipOfDay() {
  const d = new Date();
  return TIPS[(d.getDate() + d.getMonth()) % TIPS.length];
}

export default function DashboardPage() {
  const { profile, shop } = useAuth();
  const [issues, setIssues]       = useState<Issue[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!shop?.id) { setLoading(false); return; }
    Promise.all([
      supabase
        .from('issues')
        .select('id, title, severity, status, created_at, equipment_id, shop_id, reported_by, reporter_name, reporter_email, description, resolution_notes, resolved_at, resolved_by')
        .eq('shop_id', shop.id)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('equipment')
        .select('id, name, brand, model, status, last_service_date, next_service_date, shop_id, serial_number, install_date, notes, created_at')
        .eq('shop_id', shop.id)
        .order('name'),
    ]).then(([issueRes, eqRes]) => {
      setIssues((issueRes.data as unknown as Issue[]) || []);
      setEquipment((eqRes.data as unknown as Equipment[]) || []);
      setLoading(false);
    });
  }, [shop?.id]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const needsAttention = equipment.filter(e => e.status !== 'operational').length;
  const openIssues = issues.filter(i => i.status === 'open').length;
  const upcomingService = equipment.filter(e => {
    if (!e.next_service_date) return false;
    const diff = (new Date(e.next_service_date).getTime() - Date.now()) / 86400000;
    return diff <= 14 && diff >= 0;
  }).length;

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (shop?.status === 'pending') return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock size={28} className="text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 mb-2">Approval pending</h2>
        <p className="text-sm text-stone-500 leading-relaxed">Your shop is waiting for Gobena to approve your account.</p>
      </div>
    </div>
  );

  return (
    /* pb-24 = space for mobile bottom nav; md:pb-10 = normal desktop padding */
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-8">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">{shop?.name}</p>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mt-0.5">
            {greeting}, {profile?.full_name?.split(' ')[0]} ☕
          </h1>
        </div>

        {/* Alert banner */}
        {(needsAttention > 0 || openIssues > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Attention needed</p>
              <p className="text-amber-700 mt-0.5">
                {[
                  openIssues > 0 && `${openIssues} open issue${openIssues !== 1 ? 's' : ''}`,
                  needsAttention > 0 && `${needsAttention} machine${needsAttention !== 1 ? 's' : ''} need attention`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Two-column layout on desktop */}
        <div className="md:grid md:grid-cols-3 md:gap-8">

          {/* Left column — main content */}
          <div className="md:col-span-2 space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Equipment',    value: equipment.length, Icon: Coffee,      color: 'text-stone-600' },
                { label: 'Open issues',  value: openIssues,       Icon: AlertCircle, color: openIssues > 0 ? 'text-red-500' : 'text-stone-400' },
                { label: 'Service soon', value: upcomingService,  Icon: Calendar,    color: upcomingService > 0 ? 'text-amber-600' : 'text-stone-400' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
                  <Icon size={20} className={`mx-auto mb-1.5 ${color}`} />
                  <p className="text-2xl font-bold text-stone-900">{value}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Equipment list */}
            {equipment.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Your machines</p>
                  <Link to="/equipment" className="text-xs text-amber-700 font-medium">View all →</Link>
                </div>
                <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
                  {equipment.map(eq => (
                    <Link key={eq.id} to={`/equipment/${eq.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition first:rounded-t-2xl last:rounded-b-2xl">
                      <Wrench size={16} className="text-stone-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{eq.name}</p>
                        <p className="text-xs text-stone-400">{eq.brand} {eq.model}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eqStatusColors[eq.status]}`}>
                        {eqStatusLabel[eq.status]}
                      </span>
                      <ChevronRight size={14} className="text-stone-300 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Open issues */}
            {issues.length > 0 && (
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Open issues</p>
                <div className="space-y-2">
                  {issues.map(issue => (
                    <div key={issue.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800">{issue.title}</p>
                          <p className="text-xs text-stone-400 mt-0.5">{new Date(issue.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${severityColors[issue.severity]}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — quick actions + tip */}
          <div className="mt-6 md:mt-0 space-y-6">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Quick actions</p>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                {[
                  { to: '/equipment',   label: 'View equipment',  sub: 'Machines & status',  Icon: Wrench,       style: 'bg-stone-900 text-white' },
                  { to: '/checklist',   label: 'Daily checklist', sub: 'Opening & closing',  Icon: ClipboardList,style: 'bg-amber-600 text-white'  },
                  { to: '/maintenance', label: 'Log maintenance', sub: 'Record service work', Icon: TrendingUp,   style: 'bg-white border border-stone-200 text-stone-800' },
                  { to: '/guide',       label: 'Troubleshoot',    sub: 'Fix common issues',  Icon: BookOpen,     style: 'bg-white border border-stone-200 text-stone-800' },
                ].map(({ to, label, sub, Icon, style }) => (
                  <Link key={to} to={to}
                    className={`${style} rounded-2xl p-4 flex md:flex-row flex-col md:items-center gap-3 hover:opacity-90 active:scale-[.98] transition`}>
                    <Icon size={18} className="shrink-0" />
                    <div>
                      <p className="text-sm font-semibold leading-tight">{label}</p>
                      <p className={`text-xs mt-0.5 ${style.includes('text-white') ? 'opacity-70' : 'text-stone-400'}`}>{sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-stone-900 rounded-2xl px-4 py-4 flex gap-3">
              <Zap size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-1">Tip of the day</p>
                <p className="text-sm text-stone-300 leading-relaxed">{tipOfDay()}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
