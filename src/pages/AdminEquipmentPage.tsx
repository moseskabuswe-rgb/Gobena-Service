import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Equipment, Shop } from '../types';
import { Plus, Wrench, Search, X, AlertCircle, QrCode } from '../components/Icons';

const statusColor: Record<string, string> = {
  operational:     'bg-green-100 text-green-700',
  needs_attention: 'bg-amber-100 text-amber-700',
  out_of_service:  'bg-red-100 text-red-700',
};
const statusLabel: Record<string, string> = {
  operational: 'Good', needs_attention: 'Needs attention', out_of_service: 'Out of service',
};

type EquipmentWithShop = Equipment & { shops?: { name: string } | null };

export default function AdminEquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentWithShop[]>([]);
  const [shops, setShops]         = useState<Shop[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [shopFilter, setShopFilter] = useState('all');
  const [showAdd, setShowAdd]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm] = useState({
    shop_id: '', name: '', brand: '', model: '', serial_number: '', install_date: '', notes: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const loadData = async () => {
    const [eqRes, shopRes] = await Promise.all([
      supabase.from('equipment')
        .select('id, name, brand, model, serial_number, status, install_date, last_service_date, next_service_date, shop_id, notes, created_at, shops:shop_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('shops').select('id, name').eq('status', 'approved').order('name'),
    ]);
    setEquipment((eqRes.data as unknown as EquipmentWithShop[]) || []);
    setShops((shopRes.data as unknown as Shop[]) || []);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shop_id || !form.name || !form.brand || !form.model) { setError('Please fill in all required fields'); return; }
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.from('equipment').insert({
      shop_id: form.shop_id, name: form.name, brand: form.brand, model: form.model,
      serial_number: form.serial_number || null, install_date: form.install_date || null,
      notes: form.notes || null, status: 'operational',
    });
    if (err) { setError(err.message); setSubmitting(false); return; }
    await loadData();
    setShowAdd(false);
    setForm({ shop_id: '', name: '', brand: '', model: '', serial_number: '', install_date: '', notes: '' });
    setSubmitting(false);
  };

  const updateStatus = async (id: string, status: Equipment['status']) => {
    await supabase.from('equipment').update({ status }).eq('id', id);
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const filtered = equipment.filter(eq => {
    if (shopFilter !== 'all' && eq.shop_id !== shopFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return eq.name.toLowerCase().includes(q) || eq.brand.toLowerCase().includes(q) || eq.model.toLowerCase().includes(q);
  });

  const Field = ({ label, value, onChange, type = 'text', placeholder, required }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Equipment</h1>
            <p className="text-sm text-stone-400 mt-0.5">{equipment.length} machines across all shops</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl">
            <Plus size={16} /> Add machine
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" placeholder="Search equipment…" value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button onClick={() => setShopFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${shopFilter === 'all' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}>
            All shops
          </button>
          {shops.map(s => (
            <button key={s.id} onClick={() => setShopFilter(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition ${shopFilter === s.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}>
              {s.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400"><Wrench size={32} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No equipment found</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(eq => (
              <div key={eq.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                    <Wrench size={18} className="text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">{eq.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[eq.status]}`}>{statusLabel[eq.status]}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{eq.brand} {eq.model} · {eq.shops?.name}</p>
                    {eq.serial_number && <p className="text-xs text-stone-400 mt-0.5">SN: {eq.serial_number}</p>}
                    <div className="flex items-center gap-3 mt-2.5">
                      <Link to={`/equipment/${eq.id}/qr`} className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:underline">
                        <QrCode size={12} /> Print QR
                      </Link>
                      <Link to={`/equipment/${eq.id}`} className="text-xs text-stone-400 hover:text-stone-600">View page →</Link>
                      <select value={eq.status} onChange={e => updateStatus(eq.id, e.target.value as Equipment['status'])}
                        className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="operational">Good</option>
                        <option value="needs_attention">Needs attention</option>
                        <option value="out_of_service">Out of service</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Add equipment</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Shop <span className="text-red-500">*</span></label>
                <select value={form.shop_id} onChange={e => set('shop_id')(e.target.value)} required
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
                  <option value="">Select shop…</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <Field label="Machine name" value={form.name} onChange={set('name')} placeholder="Espresso Machine" required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand" value={form.brand} onChange={set('brand')} placeholder="La Marzocco" required />
                <Field label="Model" value={form.model} onChange={set('model')} placeholder="Linea Mini" required />
              </div>
              <Field label="Serial number" value={form.serial_number} onChange={set('serial_number')} placeholder="SN-00001" />
              <Field label="Install date" type="date" value={form.install_date} onChange={set('install_date')} />
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2}
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
              {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-3"><AlertCircle size={14} />{error}</div>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl hover:bg-stone-800 transition disabled:opacity-50">
                {submitting ? 'Adding…' : 'Add equipment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
