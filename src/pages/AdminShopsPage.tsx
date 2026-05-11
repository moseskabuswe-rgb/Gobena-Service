import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { Shop } from '../types';
import { Plus, Store, Search, ChevronRight, X, AlertCircle, MapPin, Mail, Phone } from '../components/Icons';

const statusConfig: Record<string, { label: string; cls: string }> = {
  approved:  { label: 'Active',    cls: 'bg-green-100 text-green-700'  },
  pending:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-700'  },
  suspended: { label: 'Suspended', cls: 'bg-red-100 text-red-700'      },
};

export default function AdminShopsPage() {
  const [shops, setShops]           = useState<Shop[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState('');
  const [filter, setFilter]         = useState<'all' | 'approved' | 'pending' | 'suspended'>('all');
  const [showAdd, setShowAdd]       = useState(false);
  const [selected, setSelected]     = useState<Shop | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '',
    contact_name: '', contact_email: '', contact_phone: '', notes: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const loadShops = async () => {
    const { data } = await supabase
      .from('shops')
      .select('id, name, address, city, state, contact_name, contact_email, contact_phone, status, approved_at, approved_by, notes, created_at')
      .order('created_at', { ascending: false });
    setShops((data as unknown as Shop[]) || []);
    setLoading(false);
  };
  useEffect(() => { loadShops(); }, []);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.from('shops').insert({ ...form, status: 'approved', approved_at: new Date().toISOString() });
    if (err) { setError(err.message); setSubmitting(false); return; }
    await loadShops();
    setShowAdd(false);
    setForm({ name: '', address: '', city: '', state: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
    setSubmitting(false);
  };

  const updateStatus = async (shopId: string, status: Shop['status']) => {
    await supabase.from('shops').update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('id', shopId);
    setShops(prev => prev.map(s => s.id === shopId ? { ...s, status } : s));
    setSelected(prev => prev?.id === shopId ? { ...prev, status } : prev);
  };

  const filtered = shops.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.contact_email.toLowerCase().includes(q);
  });

  const Field = ({ label, value, onChange, type = 'text', placeholder }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Shops</h1>
            <p className="text-sm text-stone-400 mt-0.5">{shops.filter(s => s.status === 'approved').length} active · {shops.filter(s => s.status === 'pending').length} pending</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl">
            <Plus size={16} /> Add shop
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" placeholder="Search shops…" value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div className="flex gap-2">
          {(['all','approved','pending','suspended'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${filter === s ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Store size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No shops found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(shop => (
              <button key={shop.id} onClick={() => setSelected(shop)}
                className="w-full bg-white rounded-2xl border border-stone-100 px-4 py-4 text-left hover:border-stone-200 hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                    <Store size={18} className="text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-stone-800">{shop.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[shop.status].cls}`}>
                        {statusConfig[shop.status].label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{shop.city}, {shop.state} · {shop.contact_name}</p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 truncate pr-4">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selected.status].cls}`}>
                {statusConfig[selected.status].label}
              </span>
              <div className="space-y-3 text-sm">
                {[
                  { Icon: MapPin, value: `${selected.address}, ${selected.city}, ${selected.state}` },
                  { Icon: Mail,   value: selected.contact_email },
                  { Icon: Phone,  value: selected.contact_phone },
                ].filter(r => r.value).map(({ Icon, value }) => (
                  <div key={value} className="flex items-center gap-2.5 text-stone-600">
                    <Icon size={15} className="text-stone-400 shrink-0" />{value}
                  </div>
                ))}
              </div>
              {selected.notes && <p className="text-sm text-stone-500 bg-stone-50 rounded-xl px-3 py-2.5">{selected.notes}</p>}
              <div className="space-y-2 pt-2">
                <Link to="/admin/equipment" className="block w-full py-2.5 text-center text-sm font-semibold bg-stone-900 text-white rounded-xl">
                  Manage equipment
                </Link>
                {selected.status === 'pending' && (
                  <button onClick={() => updateStatus(selected.id, 'approved')} className="w-full py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl">Approve shop</button>
                )}
                {selected.status === 'approved' && (
                  <button onClick={() => updateStatus(selected.id, 'suspended')} className="w-full py-2.5 text-sm font-semibold bg-white text-red-600 border border-red-200 rounded-xl">Suspend shop</button>
                )}
                {selected.status === 'suspended' && (
                  <button onClick={() => updateStatus(selected.id, 'approved')} className="w-full py-2.5 text-sm font-semibold bg-green-600 text-white rounded-xl">Reinstate shop</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Add shop</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddShop} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <Field label="Shop name" value={form.name} onChange={set('name')} placeholder="The Corner Grind" />
              <Field label="Address" value={form.address} onChange={set('address')} placeholder="123 Main St" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="City" value={form.city} onChange={set('city')} placeholder="Chicago" />
                <Field label="State" value={form.state} onChange={set('state')} placeholder="IL" />
              </div>
              <Field label="Contact name" value={form.contact_name} onChange={set('contact_name')} placeholder="Jane Barista" />
              <Field label="Contact email" type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="jane@shop.com" />
              <Field label="Contact phone" type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+1 (555) 000-0000" />
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2}
                  className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
              {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-3"><AlertCircle size={14} />{error}</div>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl hover:bg-stone-800 transition disabled:opacity-50">
                {submitting ? 'Adding…' : 'Add shop (auto-approved)'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
