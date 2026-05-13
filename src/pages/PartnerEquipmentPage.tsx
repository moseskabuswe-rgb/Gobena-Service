import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment } from '../types';
import { Plus, Wrench, Search, ChevronRight, X, AlertCircle, QrCode, Hash, CheckCircle } from '../components/Icons';

const statusColor: Record<string, string> = {
  operational:     'bg-green-100 text-green-700',
  needs_attention: 'bg-amber-100 text-amber-700',
  out_of_service:  'bg-red-100 text-red-700',
};
const statusLabel: Record<string, string> = {
  operational: 'Good', needs_attention: 'Needs attention', out_of_service: 'Out of service',
};

export default function PartnerEquipmentPage() {
  const { shop } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm] = useState({
    name: '', brand: '', model: '', serial_number: '', install_date: '', notes: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    if (!shop?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('equipment')
      .select('id, name, brand, model, serial_number, install_date, last_service_date, next_service_date, status, notes, shop_id, created_at')
      .eq('shop_id', shop.id)
      .order('name');
    setEquipment((data as unknown as Equipment[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shop?.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.model) { setError('Name, brand and model are required'); return; }
    if (!shop?.id) return;
    setError('');
    setSubmitting(true);

    const { error: err } = await supabase.from('equipment').insert({
      shop_id:       shop.id,
      name:          form.name,
      brand:         form.brand,
      model:         form.model,
      serial_number: form.serial_number || null,
      install_date:  form.install_date || null,
      notes:         form.notes || null,
      status:        'operational',
    });

    if (err) { setError(err.message); setSubmitting(false); return; }

    // Notify admin
    supabase.rpc('create_admin_notification', {
      p_type:  'equipment_added',
      p_title: 'New equipment added',
      p_body:  `${shop.name} added ${form.name} (${form.brand} ${form.model})`,
      p_link:  '/admin/equipment',
    }).then(() => {}).catch(() => {}); // non-blocking, fire and forget

    setSuccess(true);
    setSubmitting(false);
    await load();
    setTimeout(() => {
      setSuccess(false);
      setShowAdd(false);
      setForm({ name: '', brand: '', model: '', serial_number: '', install_date: '', notes: '' });
    }, 1500);
  };

  const filtered = equipment.filter(eq => {
    if (!query) return true;
    const q = query.toLowerCase();
    return eq.name.toLowerCase().includes(q) || eq.brand.toLowerCase().includes(q) || eq.model.toLowerCase().includes(q);
  });

  const isServiceOverdue = (eq: Equipment) => eq.next_service_date && new Date(eq.next_service_date) < new Date();
  const isServiceSoon = (eq: Equipment) => {
    if (!eq.next_service_date || isServiceOverdue(eq)) return false;
    return (new Date(eq.next_service_date).getTime() - Date.now()) / 86400000 <= 14;
  };

  const Field = ({ label, value, onChange, type = 'text', placeholder, required }: {
    label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-8 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Equipment</h1>
            <p className="text-sm text-stone-400 mt-0.5">{equipment.length} machine{equipment.length !== 1 ? 's' : ''} at {shop?.name}</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition">
            <Plus size={16} /> Add machine
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input type="search" placeholder="Search machines…" value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Wrench size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{query ? 'No machines match your search' : 'No equipment yet — add your first machine'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(eq => (
              <div key={eq.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">Overdue</span>
                      )}
                      {isServiceSoon(eq) && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Service soon</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{eq.brand} · {eq.model}</p>
                    {eq.serial_number && (
                      <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                        <Hash size={10} />{eq.serial_number}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Link to={`/equipment/${eq.id}`}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition">
                        <ChevronRight size={12} /> View
                      </Link>
                      <Link to={`/equipment/${eq.id}/qr`}
                        className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:underline">
                        <QrCode size={12} /> Print QR
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add machine modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-8">
          <div className="bg-white w-full md:max-w-xl md:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col md:shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Add equipment</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10">
                <CheckCircle size={40} className="text-green-500 mb-3" />
                <p className="font-semibold text-stone-900">Machine added</p>
                <p className="text-xs text-stone-400 mt-1">Gobena has been notified</p>
              </div>
            ) : (
              <form onSubmit={handleAdd} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <Field label="Machine name" value={form.name} onChange={set('name')} placeholder="Espresso Machine" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brand" value={form.brand} onChange={set('brand')} placeholder="La Marzocco" required />
                  <Field label="Model" value={form.model} onChange={set('model')} placeholder="Linea Mini" required />
                </div>
                <Field label="Serial number" value={form.serial_number} onChange={set('serial_number')} placeholder="SN-00001" />
                <Field label="Install date" type="date" value={form.install_date} onChange={set('install_date')} />
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2} placeholder="Any notes about this machine…"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-3">
                    <AlertCircle size={14} />{error}
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl hover:bg-stone-800 transition disabled:opacity-50">
                  {submitting ? 'Adding…' : 'Add machine'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
