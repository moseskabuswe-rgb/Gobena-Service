import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment } from '../types';
import { Wrench, Search, ChevronRight, Calendar, Hash, AlertCircle, CheckCircle } from '../components/Icons';

const STATUS_FILTER = ['all', 'operational', 'needs_attention', 'out_of_service'] as const;
const statusLabel: Record<string, string> = {
  all: 'All', operational: 'Good', needs_attention: 'Needs attention', out_of_service: 'Out of service',
};
const statusColor: Record<string, string> = {
  operational:     'bg-green-100 text-green-700',
  needs_attention: 'bg-amber-100 text-amber-700',
  out_of_service:  'bg-red-100 text-red-700',
};
export default function EquipmentListPage() {
  const { shop } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_FILTER)[number]>('all');

  useEffect(() => {
    if (!shop?.id) { setLoading(false); return; }
    supabase
      .from('equipment')
      .select('id, name, brand, model, serial_number, install_date, last_service_date, next_service_date, status, notes')
      .eq('shop_id', shop.id)
      .order('name')
      .then(({ data }) => {
        setEquipment((data as Equipment[]) || []);
        setLoading(false);
      });
  }, [shop?.id]);

  const filtered = equipment.filter(eq => {
    if (filter !== 'all' && eq.status !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return eq.name.toLowerCase().includes(q) || eq.brand.toLowerCase().includes(q) || eq.model.toLowerCase().includes(q);
  });

  const isServiceDueSoon = (eq: Equipment) => {
    if (!eq.next_service_date) return false;
    const diff = (new Date(eq.next_service_date).getTime() - Date.now()) / 86400000;
    return diff <= 14 && diff >= 0;
  };
  const isServiceOverdue = (eq: Equipment) => {
    if (!eq.next_service_date) return false;
    return new Date(eq.next_service_date) < new Date();
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">

        <div>
          <h1 className="text-2xl font-bold text-stone-900">Equipment</h1>
          <p className="text-sm text-stone-400 mt-0.5">{equipment.length} machine{equipment.length !== 1 ? 's' : ''} at {shop?.name}</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            placeholder="Search machines…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {STATUS_FILTER.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
                filter === s
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-500 border-stone-200'
              }`}
            >
              {statusLabel[s]}
              {s !== 'all' && (
                <span className="ml-1.5 opacity-60">
                  {equipment.filter(e => e.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Wrench size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{query ? 'No machines match your search' : 'No equipment found'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(eq => (
              <Link
                key={eq.id}
                to={`/equipment/${eq.id}`}
                className="block bg-white rounded-2xl border border-stone-100 px-4 py-4 hover:border-stone-200 hover:shadow-sm transition active:scale-[.99]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                    <Wrench size={18} className="text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">{eq.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[eq.status]}`}>
                        {statusLabel[eq.status]}
                      </span>
                      {isServiceOverdue(eq) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">Service overdue</span>
                      )}
                      {isServiceDueSoon(eq) && !isServiceOverdue(eq) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Service due soon</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{eq.brand} · {eq.model}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {eq.serial_number && (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Hash size={11} />
                          {eq.serial_number}
                        </span>
                      )}
                      {eq.last_service_date && (
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Calendar size={11} />
                          Last service {new Date(eq.last_service_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 shrink-0 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
