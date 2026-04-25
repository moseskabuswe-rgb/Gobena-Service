import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Building2 } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function AdminAddShopPage() {
  const navigate = useNavigate();

  const [name,         setName]         = useState('');
  const [address,      setAddress]      = useState('');
  const [city,         setCity]         = useState('');
  const [state,        setState]        = useState('');
  const [zip,          setZip]          = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [contactName,  setContactName]  = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !city.trim() || !state) {
      setError('Shop name, city, and state are required.');
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('shops').insert({
      name:          name.trim(),
      address:       address.trim() || null,
      city:          city.trim(),
      state,
      zip:           zip.trim()          || null,
      phone:         phone.trim()        || null,
      email:         email.trim()        || null,
      contact_name:  contactName.trim()  || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      notes:         notes.trim()        || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    navigate('/admin');
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-roast-400 hover:text-bark transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <h1 className="page-title">Add Partner Shop</h1>
        <p className="page-subtitle">Add a new coffee shop to the Gobena Service network</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-cream-100">
          <Building2 size={16} className="text-brew-600" />
          <h2 className="font-display text-base font-medium text-bark">Shop Details</h2>
        </div>

        <div>
          <label className="form-label">Shop Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Riverfront Coffee Co."
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Street Address</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Main Street"
            className="form-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">City *</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Springfield"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">State *</label>
            <select value={state} onChange={e => setState(e.target.value)} className="form-input">
              <option value="">Select…</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">ZIP Code</label>
            <input
              type="text"
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="62701"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Shop Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Shop Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="hello@coffeeshop.com"
            className="form-input"
          />
        </div>

        {/* Divider */}
        <div className="pt-2 pb-1 border-t border-cream-100">
          <h3 className="text-xs font-medium text-roast-500 uppercase tracking-wide">Primary Contact Person</h3>
        </div>

        <div>
          <label className="form-label">Contact Name</label>
          <input
            type="text"
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="e.g. Jordan Smith (Manager)"
            className="form-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="jordan@coffeeshop.com"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="(555) 987-6543"
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Internal Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes for Gobena staff about this location…"
            className="form-input resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add Shop'}
          </button>
        </div>
      </div>
    </main>
  );
}
