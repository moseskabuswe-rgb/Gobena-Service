import { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { getEquipmentByShop } from '../lib/queries';
import type { Equipment, EquipmentStatus } from '../types';
import EquipmentCard from '../components/EquipmentCard';
import { Search } from 'lucide-react';

const STATUS_FILTERS: { value: EquipmentStatus | 'all'; label: string }[] = [
  { value: 'all',              label: 'All'             },
  { value: 'urgent',           label: 'Urgent'          },
  { value: 'needs_attention',  label: 'Needs Attention' },
  { value: 'good',             label: 'Good'            },
];

export default function EquipmentListPage() {
  const { profile } = useAuth();
  const [equipment,    setEquipment]    = useState<Equipment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');

  useEffect(() => {
    if (!profile?.shop_id) { setLoading(false); return; }
    getEquipmentByShop(profile.shop_id).then(data => {
      setEquipment(data);
      setLoading(false);
    });
  }, [profile]);

  const filtered = equipment.filter(eq => {
    const matchSearch =
      !search ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.model?.toLowerCase().includes(search.toLowerCase()) ||
      eq.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Equipment</h1>
        <p className="page-subtitle">All equipment at your location</p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-roast-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equipment…"
            className="form-input pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-brew-700 text-cream-50'
                  : 'bg-white text-roast-500 border border-cream-200 hover:border-brew-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="w-8 h-8 animate-spin text-brew-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-roast-400 text-sm">
          {search || statusFilter !== 'all'
            ? 'No equipment matches your filters.'
            : 'No equipment registered. Contact Gobena to add your machines.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(eq => (
            <EquipmentCard key={eq.id} equipment={eq} />
          ))}
        </div>
      )}

      <p className="text-xs text-roast-300 text-center pb-4">
        {filtered.length} of {equipment.length} items shown
      </p>
    </main>
  );
}
