import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment, MaintenanceLog } from '../types';
import { Plus, X, CheckCircle, AlertCircle, Wrench, Calendar, Clock } from '../components/Icons';

const LOG_TYPES = [
  { value: 'routine',    label: 'Routine service',  desc: 'Scheduled maintenance' },
  { value: 'cleaning',   label: 'Deep clean',       desc: 'Full cleaning cycle'   },
  { value: 'inspection', label: 'Inspection',       desc: 'Visual/functional check' },
  { value: 'repair',     label: 'Repair',           desc: 'Fixing a specific issue' },
];

export default function MaintenancePage() {
  const { profile, shop } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs]           = useState<(MaintenanceLog & { equipment?: { name: string } })[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const [form, setForm] = useState({
    equipment_id: '',
    type: 'routine',
    description: '',
    performed_by: '',
    performed_at: new Date().toISOString().slice(0, 16),
    next_service_date: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!shop?.id) { setLoading(false); return; }
    Promise.all([
      supabase.from('equipment').select('id, name, brand, model').eq('shop_id', shop.id).order('name'),
      supabase
        .from('maintenance_logs')
        .select('id, equipment_id, type, description, performed_by, performed_at, next_service_date, created_at, equipment:equipment_id(name)')
        .eq('shop_id', shop.id)
        .order('performed_at', { ascending: false })
        .limit(20),
    ]).then(([eqRes, logRes]) => {
      setEquipment((eqRes.data as Equipment[]) || []);
      setLogs((logRes.data as (MaintenanceLog & { equipment?: { name: string } })[]) || []);
      setLoading(false);
    });
  }, [shop?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipment_id) { setError('Please select a machine'); return; }
    if (!form.description.trim()) { setError('Please describe the work done'); return; }

    setError('');
    setSubmitting(true);

    const { error: err } = await supabase.from('maintenance_logs').insert({
      equipment_id: form.equipment_id,
      shop_id: shop!.id,
      logged_by: profile!.id,
      type: form.type,
      description: form.description.trim(),
      performed_by: form.performed_by || profile!.full_name,
      performed_at: form.performed_at,
      next_service_date: form.next_service_date || null,
    });

    if (err) { setError('Failed to log maintenance. Please try again.'); setSubmitting(false); return; }

    // Update equipment last_service_date
    await supabase
      .from('equipment')
      .update({
        last_service_date: form.performed_at.split('T')[0],
        ...(form.next_service_date ? { next_service_date: form.next_service_date } : {}),
      })
      .eq('id', form.equipment_id);

    setSuccess(true);
    setSubmitting(false);
    // Refresh logs
    const { data } = await supabase
      .from('maintenance_logs')
      .select('id, equipment_id, type, description, performed_by, performed_at, next_service_date, created_at, equipment:equipment_id(name)')
      .eq('shop_id', shop!.id)
      .order('performed_at', { ascending: false })
      .limit(20);
    setLogs((data as (MaintenanceLog & { equipment?: { name: string } })[]) || []);

    setTimeout(() => {
      setSuccess(false);
      setShowForm(false);
      setForm({ equipment_id: '', type: 'routine', description: '', performed_by: '', performed_at: new Date().toISOString().slice(0, 16), next_service_date: '' });
    }, 1500);
  };

  const typeLabel: Record<string, string> = {
    routine: 'Routine', cleaning: 'Deep clean', inspection: 'Inspection', repair: 'Repair',
  };
  const typeColor: Record<string, string> = {
    routine: 'bg-blue-100 text-blue-700', cleaning: 'bg-green-100 text-green-700',
    inspection: 'bg-stone-100 text-stone-600', repair: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Maintenance</h1>
            <p className="text-sm text-stone-400 mt-0.5">Log service work on your machines</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white text-sm font-semibold rounded-xl"
          >
            <Plus size={16} />
            Log work
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Wrench size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No maintenance logged yet</p>
            <p className="text-xs mt-1 text-stone-300">Tap "Log work" to record your first entry</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">
                        {(log.equipment as unknown as { name: string } | null)?.name || '—'}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[log.type]}`}>
                        {typeLabel[log.type]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">{log.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(log.performed_at).toLocaleDateString()}
                      </span>
                      {log.performed_by && (
                        <span>by {log.performed_by}</span>
                      )}
                      {log.next_service_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Next: {new Date(log.next_service_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Log form modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h2 className="font-bold text-stone-900">Log maintenance work</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>

            {success ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10">
                <CheckCircle size={40} className="text-green-500 mb-3" />
                <p className="font-semibold text-stone-900">Maintenance logged</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Machine *</label>
                  <select
                    value={form.equipment_id}
                    onChange={e => set('equipment_id')(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  >
                    <option value="">Select machine…</option>
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name} — {eq.brand} {eq.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Type of work</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOG_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set('type')(t.value)}
                        className={`px-3 py-2.5 rounded-xl border text-left transition ${
                          form.type === t.value
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 text-stone-600'
                        }`}
                      >
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className="text-[10px] mt-0.5 opacity-60">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Work description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => set('description')(e.target.value)}
                    placeholder="What was done? Parts replaced? Observations?"
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Performed at</label>
                    <input
                      type="datetime-local"
                      value={form.performed_at}
                      onChange={e => set('performed_at')(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Next service date</label>
                    <input
                      type="date"
                      value={form.next_service_date}
                      onChange={e => set('next_service_date')(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Performed by</label>
                  <input
                    value={form.performed_by}
                    onChange={e => set('performed_by')(e.target.value)}
                    placeholder={profile?.full_name || 'Your name'}
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-3">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl hover:bg-stone-800 active:scale-[.98] transition disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save log'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
