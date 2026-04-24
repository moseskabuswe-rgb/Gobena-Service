import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CheckCircle, Building2 } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

export default function AdminAddShopPage() {
  const navigate = useNavigate();
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');
  const [savedName, setSavedName] = useState('');

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', zip: '',
    contact_name: '', contact_email: '', contact_phone: '', notes: '',
  });

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.state) {
      setError('Shop name, city, and state are required.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: err } = await supabase.from('shops').insert({
      name:          form.name.trim(),
      address:       form.address.trim()       || null,
      city:          form.city.trim(),
      state:         form.state,
      zip:           form.zip.trim()           || null,
      contact_name:  form.contact_name.trim()  || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      notes:         form.notes.trim()         || null,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSavedName(form.name);
    setSuccess(true);
  };

  const reset = () => {
    setSuccess(false);
    setSavedName('');
    setForm({ name: '', address: '', city: '', state: '', zip: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
  };

  if (success) return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="card text-center py-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-bark">Shop Added!</h2>
          <p className="text-sm text-roast-400 mt-1">
            <span className="font-medium text-bark">{savedName}</span> is now a partner location.
          </p>
          <p className="text-xs text-roast-400 mt-2">
            You can now add equipment to this shop, or create a partner account for their staff.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button onClick={() => navigate('/admin/add-equipment')} className="btn-primary justify-center">
            Add Equipment to This Shop
          </button>
          <button onClick={reset} className="btn-secondary justify-center">
            Add Another Shop
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
        <h1 className="page-title">Add Partner Shop</h1>
        <p className="page-subtitle">Register a new coffee shop location</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Name */}
        <div>
          <label className="form-label">Shop Name *</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Brew & Co — Downtown" className="form-input" required />
        </div>

        {/* Address */}
        <div>
          <label className="form-label">Street Address</label>
          <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="123 Main St" className="form-input" />
        </div>

        {/* City / State / Zip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="form-label">City *</label>
            <input type="text" value={form.city} onChange={e => set('city', e.target.value)}
              placeholder="Chicago" className="form-input" required />
          </div>
          <div>
            <label className="form-label">State *</label>
            <select value={form.state} onChange={e => set('state', e.target.value)} className="form-input" required>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">ZIP</label>
            <input type="text" value={form.zip} onChange={e => set('zip', e.target.value)}
              placeholder="60601" className="form-input" maxLength={10} />
          </div>
        </div>

        {/* Contact */}
        <div className="border-t border-cream-100 pt-1">
          <p className="text-xs font-medium text-roast-400 uppercase tracking-wide mb-3">
            Contact Info (optional)
          </p>
          <div className="space-y-3">
            <div>
              <label className="form-label">Contact Name</label>
              <input type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                placeholder="Manager or owner name" className="form-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Email</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  placeholder="owner@shop.com" className="form-input" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="tel" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                  placeholder="(312) 555-0000" className="form-input" />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Contract details, special instructions…" className="form-input resize-none" />
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
            ) : (
              <><Building2 size={15} /> Add Shop</>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
