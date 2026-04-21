import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  getShop,
  getEquipmentByShop,
  getServiceRequestsByShop,
} from '../lib/queries';
import type { Equipment, ServiceRequest, Shop } from '../types';
import { RequestStatusBadge } from '../components/StatusBadge';
import EquipmentCard from '../components/EquipmentCard';
import {
  Wrench, AlertTriangle, Clock, ChevronRight, Building2
} from 'lucide-react';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-bark">{value}</p>
        <p className="text-xs text-roast-400 font-body mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [shop,      setShop]      = useState<Shop | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [requests,  setRequests]  = useState<ServiceRequest[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!profile?.shop_id) { setLoading(false); return; }

    Promise.all([
      getShop(profile.shop_id),
      getEquipmentByShop(profile.shop_id),
      getServiceRequestsByShop(profile.shop_id),
    ]).then(([s, e, r]) => {
      setShop(s);
      setEquipment(e);
      setRequests(r);
      setLoading(false);
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

  const urgentCount      = equipment.filter(e => e.status === 'urgent').length;
  const attentionCount   = equipment.filter(e => e.status === 'needs_attention').length;
  const openRequests     = requests.filter(r => r.status === 'open' || r.status === 'in_progress');

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">
          {shop ? shop.name : 'Your Dashboard'}
        </h1>
        <p className="page-subtitle">
          {shop?.city && shop?.state ? `${shop.city}, ${shop.state} · ` : ''}
          Good morning, {profile.full_name?.split(' ')[0] ?? 'partner'} ☕
        </p>
      </div>

      {/* Urgent alert */}
      {urgentCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {urgentCount} piece{urgentCount > 1 ? 's' : ''} of equipment need{urgentCount === 1 ? 's' : ''} urgent attention
          </p>
          <Link to="/equipment" className="ml-auto text-xs text-red-600 font-semibold underline-offset-2 hover:underline">
            View
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Wrench}       label="Total Equipment"   value={equipment.length} color="bg-brew-600"     />
        <StatCard icon={AlertTriangle} label="Need Attention"   value={attentionCount + urgentCount} color="bg-amber-500"   />
        <StatCard icon={Clock}        label="Open Requests"    value={openRequests.length} color="bg-blue-500"  />
      </div>

      {/* Equipment */}
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

      {/* Recent Service Requests */}
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
            {requests.slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-bark truncate">{req.issue_type}</p>
                  <p className="text-xs text-roast-400 mt-0.5">{formatDate(req.created_at)}</p>
                </div>
                <RequestStatusBadge status={req.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
