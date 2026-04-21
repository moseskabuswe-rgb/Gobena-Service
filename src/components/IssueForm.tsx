import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { insertServiceRequest } from '../lib/queries';
import { useAuth } from '../lib/AuthContext';
import type { Equipment, RequestPriority } from '../types';


interface IssueFormProps {
  equipment: Equipment;
  onClose: () => void;
  onSuccess: () => void;
}

const ISSUE_TYPES = [
  'Not Brewing / Not Working',
  'Pressure Issue',
  'Temperature Issue',
  'Grind Inconsistency',
  'Leaking',
  'Strange Noise',
  'Error Code / Display Issue',
  'Filter / Water Quality',
  'Slow / Reduced Output',
  'Other',
];

export default function IssueForm({ equipment, onClose, onSuccess }: IssueFormProps) {
  const { user } = useAuth();
  const [issueType, setIssueType] = useState('');
  const [notes,     setNotes]     = useState('');
  const [priority,  setPriority]  = useState<RequestPriority>('normal');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) { setError('Please select an issue type.'); return; }
    setSaving(true);
    setError('');

    const result = await insertServiceRequest({
      equipment_id: equipment.id,
      shop_id:      equipment.shop_id,
      requested_by: user?.id ?? null,
      issue_type:   issueType,
      notes,
      priority,
    });

    setSaving(false);
    if (!result) {
      setError('Failed to submit. Please try again.');
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cream-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-bark">Log an Issue</h2>
            <p className="text-xs text-roast-400 mt-0.5">{equipment.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Issue type */}
          <div>
            <label className="form-label">Issue Type *</label>
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Select issue type…</option>
              {ISSUE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="form-label">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'normal', 'high', 'urgent'] as RequestPriority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                    priority === p
                      ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                      : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe what you're seeing. The more detail, the faster we can help…"
              className="form-input resize-none"
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
                  Submitting…
                </span>
              ) : (
                <>
                  <Send size={14} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
