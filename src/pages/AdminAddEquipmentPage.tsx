import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getShops } from '../lib/queries';
import { supabase } from '../lib/supabaseClient';
import type { Shop, EquipmentCategory, EquipmentStatus } from '../types';
import { ArrowLeft, Wrench } from '../components/Icons';

const CATEGORIES: EquipmentCategory[] = [
  'Espresso Machine', 'Grinder', 'Brewer', 'Refrigeration', 'Water System', 'Other',
];

const STATUSES: { value: EquipmentStatus; label: string; desc: string }[] = [
  { value: 'good',            label: 'Good',            desc: 'Fully operational'      },
  { value: 'needs_attention', label: 'Needs Attention', desc: 'Minor issue or due soon' },
  { value: 'urgent',          label: 'Urgent',          desc: 'Out of service'          },
];

export default function AdminAddEquipmentPage() {
  const navigate = useNavigate();

  const [shops,        setShops]        = useState<Shop[]>([]);
  const [shopId,       setShopId]       = useState('');
  const [name,         setName]         = useState('');
  const [model,        setModel]        = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category,     setCategory]     = useState<EquipmentCategory>('Espresso Machine');
  const [status,       setStatus]       = useState<EquipmentStatus>('good');
  const [installDate,  setInstallDate]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    getShops().then(setShops);
  }, []);

  const handleSubmit = async () => {
    if (!shopId || !name.trim() || !category) {
      setError('Shop, equipment name, and category are required.');
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('equipment').insert({
      shop_id:       shopId,
      name:          name.trim(),
      model:         model.trim()        || null,
      serial_number: serialNumber.trim() || null,
      category,
      status,
      install_date:  installDate        || null,
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
        <h1 className="page-title">Add Equipment</h1>
        <p className="page-subtitle">Register a new machine for a partner shop</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-cream-100">
          <Wrench size={16} className="text-brew-600" />
          <h2 className="font-display text-base font-medium text-bark">Equipment Details</h2>
        </div>

        {/* Shop selector */}
        <div>
          <label className="form-label">Partner Shop *</label>
          <select value={shopId} onChange={e => setShopId(e.target.value)} className="form-input">
            <option value="">Select a shop…</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city}, {s.state}
              </option>
            ))}
          </select>
          {shops.length === 0 && (
            <p className="text-xs text-roast-400 mt-1">
              No shops yet.{' '}
              <button onClick={() => navigate('/admin/add-shop')} className="text-brew-600 hover:underline">
                Add a shop first
              </button>
            </p>
          )}
        </div>

        {/* Equipment name */}
        <div>
          <label className="form-label">Equipment Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. La Marzocco Linea PB"
            className="form-input"
          />
        </div>

        {/* Category */}
        <div>
          <label className="form-label">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  category === cat
                    ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                    : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Model + Serial */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Model</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. Linea PB AV 2-group"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Serial Number</label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="e.g. LM-2023-00421"
              className="form-input font-mono"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="form-label">Current Status</label>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`py-2.5 px-2 rounded-xl border text-xs font-medium text-left transition-all ${
                  status === opt.value
                    ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                    : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                }`}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-roast-400 font-normal mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Install date */}
        <div>
          <label className="form-label">Install Date</label>
          <input
            type="date"
            value={installDate}
            onChange={e => setInstallDate(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any relevant information about this machine…"
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
            {saving ? 'Adding…' : 'Add Equipment'}
          </button>
        </div>
      </div>
    </main>
  );
}
