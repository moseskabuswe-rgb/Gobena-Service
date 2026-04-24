import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface Shop { id: string; name: string; city: string; state: string; }

const CATEGORIES = ['Espresso Machine','Grinder','Brewer','Refrigeration','Water System','Other'];

const STATUS_OPTIONS = [
  { value: 'good',             label: 'Good',            desc: 'Fully operational' },
  { value: 'needs_attention',  label: 'Needs Attention', desc: 'Minor issue'       },
  { value: 'urgent',           label: 'Urgent',          desc: 'Out of service'    },
];

export default function AdminAddEquipmentPage() {
  const navigate = useNavigate();
  const [shops,   setShops]   = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');
  const [newId,   setNewId]   = useState<string | null>(null);

  const [form, setForm] = useState({
    shop_id: '', name: '', category: '', model: '',
    serial_number: '', status: 'good', install_date: '', notes: '',
  });

  useEffect(() => {
    supabase.from('shops').select('id, name, city, state').order('name')
      .then(({ data }) => setShops(data ?? []));
  }, []);

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shop_id || !form.name || !form.category) {
      setError('Shop, name, and category are required.');
      return;
    }
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.from('equipment').insert({
      shop_id:       form.shop_id,
      name:          form.name.trim(),
      category:      form.category,
      status:        form.status,
      model:         form.model.trim()         || null,
      serial_number: form.serial_number.trim() || null,
      install_date:  form.install_date         || null,
      notes:         form.notes.trim()         || null,
    }).select().single();

    setLoading(false);
    if (err) { setError(err.message); return; }
    setNewId(data.id);
    setSuccess(true);
  };

  const reset = () => {
    setSuccess(false);
    setNewId(null);
    setForm(f => ({ ...f, name: '', category: '', model: '', serial_number: '', status: 'good', install_date: '', notes: '' }));
  };

  if (success && newId) return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="card text-center py-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-bark">Equipment Added!</h2>
          <p className="text-sm text-roast-400 mt-1">
            <span className="font-medium text-bark">{form.name}</span> has been registered.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={() => navigate(`/equipment/${newId}`)} className="btn-primary justify-center">
            View Equipment &amp; Print QR
          </button>
          <button onClick={reset} className="btn-secondary justify-center">
            Add Another Machine
          </button>
          <button onClick={() => navigate('/admin')} className="text-sm text-roast-400 hover:text-bark transition-colors mt-1">
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    </main>
  );

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <button onClick={() => navigate('/admin')} className="flex items-center gap-1.5 text-sm text-roast-400 hover:text-bark transition-colors">
        <ArrowLeft size={14} /> Back to Admin
      </button>

      <div>
        <h1 className="page-title">Add Equipment</h1>
        <p className="page-subtitle">Register a new machine at a partner location</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Shop */}
        <div>
          <label className="form-label">Partner Shop *</label>
          <select value={form.shop_id} onChange={e => set('shop_id', e.target.value)} className="form-input" required>
            <option value="">Select a shop…</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name} — {s.city}, {s.state}</option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="form-label">Equipment Name *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. La Marzocco Linea PB" className="form-input" required />
        </div>

        {/* Category */}
        <div>
          <label className="form-label">Category *</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => set('category', cat)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                  form.category === cat
                    ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                    : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Model & Serial */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Model</label>
            <input type="text" value={form.model} onChange={e => set('model', e.target.value)}
              placeholder="e.g. Linea PB" className="form-input" />
          </div>
          <div>
            <label className="form-label">Serial Number</label>
            <input type="text" value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
              placeholder="SN-123456" className="form-input font-mono" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="form-label">Initial Status</label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => set('status', opt.value)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                  form.status === opt.value
                    ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                    : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                }`}>
                <div className="font-semibold">{opt.label}</div>
                <div className="text-roast-400 font-normal mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Install Date */}
        <div>
          <label className="form-label">Install Date</label>
          <input type="date" value={form.install_date} onChange={e => set('install_date', e.target.value)} className="form-input" />
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Warranty info, setup notes, special instructions…" className="form-input resize-none" />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => navigate('/admin')} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Saving…
              </span>
            ) : 'Add Equipment'}
          </button>
        </div>
      </form>
    </main>
  );
}
