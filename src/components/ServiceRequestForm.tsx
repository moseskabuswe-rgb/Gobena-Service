import { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { insertMaintenanceLog } from '../lib/queries';
import type { Equipment, LogType } from '../types';

interface ServiceRequestFormProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

const LOG_TYPES: { value: LogType; label: string }[] = [
  { value: 'maintenance', label: 'Scheduled Maintenance' },
  { value: 'repair',      label: 'Repair'                },
  { value: 'inspection',  label: 'Inspection'            },
  { value: 'install',     label: 'Installation'          },
];

export default function ServiceRequestForm({
  equipment,
  onClose,
  onSuccess,
}: ServiceRequestFormProps) {
  const [performedBy,  setPerformedBy]  = useState('');
  const [description,  setDescription]  = useState('');
  const [logType,      setLogType]      = useState<LogType>('maintenance');
  const [performedAt,  setPerformedAt]  = useState(new Date().toISOString().slice(0, 10));
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!performedBy.trim() || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');

    const result = await insertMaintenanceLog({
      equipment_id: equipment.id,
      performed_by: performedBy.trim(),
      description:  description.trim(),
      log_type:     logType,
    });

    setSaving(false);
    if (!result) {
      setError('Failed to save log. Please try again.');
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cream-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-bark">Log Service Entry</h2>
            <p className="text-xs text-roast-400 mt-0.5">{equipment.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="form-label">Service Type</label>
            <div className="grid grid-cols-2 gap-2">
              {LOG_TYPES.map(lt => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setLogType(lt.value)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                    logType === lt.value
                      ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                      : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Performed by */}
          <div>
            <label className="form-label">Performed By *</label>
            <input
              type="text"
              value={performedBy}
              onChange={e => setPerformedBy(e.target.value)}
              placeholder="e.g. Gobena Tech - Marcus"
              className="form-input"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="form-label">Date Performed</label>
            <input
              type="date"
              value={performedAt}
              onChange={e => setPerformedAt(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="What was done? Parts replaced, measurements, observations…"
              className="form-input resize-none"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Saving…
                </span>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Save Log
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
