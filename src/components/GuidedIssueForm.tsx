import { useState, useRef } from 'react';
import { X, Send, ImagePlus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { insertServiceRequest, uploadServiceMedia } from '../lib/queries';
import { useAuth } from '../lib/AuthContext';
import type { Equipment, RequestPriority } from '../types';

interface GuidedIssueFormProps {
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
  'Steam Wand Issue',
  'Other',
];

const DIAGNOSTIC_QUESTIONS: Record<string, { id: string; label: string; placeholder?: string }[]> = {
  'Pressure Issue': [
    { id: 'pressure_reading', label: 'What pressure are you seeing on the gauge?', placeholder: 'e.g. 7 bar instead of 9 bar' },
    { id: 'when_drops', label: 'When does the pressure drop?', placeholder: 'e.g. mid-pull, immediately, after warm-up' },
    { id: 'how_often', label: 'How frequently does this happen?', placeholder: 'e.g. every 3-4 shots, constantly, intermittently' },
  ],
  'Temperature Issue': [
    { id: 'symptom', label: 'Is the machine too hot, too cold, or inconsistent?', placeholder: 'e.g. shots taste sour or bitter' },
    { id: 'warmup', label: 'Has the machine had full warm-up time (30+ min)?', placeholder: 'Yes / No / Unsure' },
    { id: 'shot_temp', label: 'What does the espresso feel like when pulled?', placeholder: 'e.g. lukewarm, scalding, seems fine but tastes off' },
  ],
  'Grind Inconsistency': [
    { id: 'how_inconsistent', label: 'How is the grind inconsistent?', placeholder: 'e.g. too fine, too coarse, changes during day' },
    { id: 'when_started', label: 'When did this start?', placeholder: 'e.g. after cleaning, gradually over weeks' },
    { id: 'dose_change', label: 'Has your dose or yield changed recently?', placeholder: 'Yes / No / What changed' },
  ],
  'Leaking': [
    { id: 'location', label: 'Where is the leak coming from?', placeholder: 'e.g. group head, portafilter, steam wand, bottom' },
    { id: 'when_leaks', label: 'When does it leak?', placeholder: 'e.g. always, during extraction, when idle' },
    { id: 'volume', label: 'How much is it leaking?', placeholder: 'e.g. just a drip, steady stream, puddle' },
  ],
  'Strange Noise': [
    { id: 'noise_type', label: 'What type of noise is it?', placeholder: 'e.g. grinding, rattling, humming, clicking' },
    { id: 'when_noise', label: 'When does the noise happen?', placeholder: 'e.g. during extraction, when heating, constantly' },
    { id: 'noise_change', label: 'Has the noise gotten worse over time?', placeholder: 'Yes / No / Started suddenly' },
  ],
  'Error Code / Display Issue': [
    { id: 'error_code', label: 'What is the exact error code or message?', placeholder: 'e.g. E01, TEMP ERROR' },
    { id: 'when_appears', label: 'When does the error appear?', placeholder: 'e.g. on startup, during extraction, randomly' },
    { id: 'reset_tried', label: 'Have you tried turning it off and on?', placeholder: 'Yes, it reset / Yes but came back / No' },
  ],
  'Filter / Water Quality': [
    { id: 'tds_reading', label: 'What is your current TDS reading?', placeholder: 'e.g. 180 ppm, or "we don\'t have a meter"' },
    { id: 'last_filter', label: 'When was the filter last changed?', placeholder: 'e.g. 6 months ago, not sure, never' },
    { id: 'water_taste', label: 'Has the taste of coffee changed?', placeholder: 'Yes / No / Hard to tell' },
  ],
  'Slow / Reduced Output': [
    { id: 'output_amount', label: 'How much output vs. normal?', placeholder: 'e.g. half the usual yield, takes twice as long' },
    { id: 'which_group', label: 'Is this on all groups or a specific one?', placeholder: 'All groups / Group 1 / Group 2' },
    { id: 'grind_changed', label: 'Have you changed your grind setting recently?', placeholder: 'Yes / No / Grind has been drifting' },
  ],
  'Steam Wand Issue': [
    { id: 'symptom', label: 'What is the wand doing wrong?', placeholder: 'e.g. no steam, weak steam, spitting water, blocked' },
    { id: 'last_cleaned', label: 'When was the steam wand last purged and wiped?', placeholder: 'e.g. today, yesterday, not sure' },
    { id: 'boiler_pressure', label: 'What does the steam pressure gauge read?', placeholder: 'e.g. 1.2 bar, or "looks normal"' },
  ],
  'Not Brewing / Not Working': [
    { id: 'what_happens', label: 'What happens when you try to use it?', placeholder: 'e.g. nothing at all, makes noise but no flow' },
    { id: 'power', label: 'Does the machine power on?', placeholder: 'Yes / No / Powers on but no display' },
    { id: 'when_started', label: 'When did this problem start?', placeholder: 'e.g. this morning, after closing last night' },
  ],
};

const DEFAULT_QUESTIONS = [
  { id: 'when_started', label: 'When did this problem start?', placeholder: 'e.g. this morning, after the weekend' },
  { id: 'frequency',    label: 'How often does it happen?',    placeholder: 'e.g. every time, occasionally, once so far' },
];

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export default function GuidedIssueForm({ equipment, onClose, onSuccess }: GuidedIssueFormProps) {
  const { user } = useAuth();

  const [step,      setStep]      = useState<1 | 2 | 3>(1);
  const [issueType, setIssueType] = useState('');
  const [priority,  setPriority]  = useState<RequestPriority>('normal');
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [notes,     setNotes]     = useState('');
  const [mediaFiles,    setMediaFiles]    = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const questions   = DIAGNOSTIC_QUESTIONS[issueType] ?? DEFAULT_QUESTIONS;
  const allAnswered = questions.every(q => answers[q.id]?.trim());

  // ── Media ──────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (mediaFiles.length + files.length > 5) { setError('Maximum 5 files.'); return; }
    setError('');
    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setMediaPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    setMediaFiles(prev => prev.filter((_, idx) => idx !== i));
    setMediaPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!issueType) { setError('Please select an issue type.'); return; }
    setSaving(true);
    setError('');

    try {
      // Always include raw diagnostic answers in notes so technician
      // sees full context even without any AI processing
      const rawAnswersSummary = questions
        .filter(q => answers[q.id]?.trim())
        .map(q => `• ${q.label}: ${answers[q.id]}`)
        .join('\n');

      const combinedNotes = [
        notes.trim(),
        rawAnswersSummary ? `Diagnostic answers:\n${rawAnswersSummary}` : '',
      ].filter(Boolean).join('\n\n');

      const req = await insertServiceRequest({
        equipment_id:       equipment.id,
        shop_id:            equipment.shop_id,
        requested_by:       user?.id ?? null,
        issue_type:         issueType,
        notes:              combinedNotes,
        priority,
        diagnostic_answers: answers,
      });

      if (!req) { setError('Failed to submit. Please try again.'); setSaving(false); return; }

      // Upload media files
      if (mediaFiles.length > 0) {
        const urls: string[] = [];
        for (const file of mediaFiles) {
          const url = await uploadServiceMedia(file, req.id);
          if (url) urls.push(url);
        }
        if (urls.length > 0) {
          const { supabase } = await import('../lib/supabaseClient');
          await supabase.from('service_requests').update({ media_urls: urls }).eq('id', req.id);
        }
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Unexpected error. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-lifted w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cream-100 shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold text-bark">Log an Issue</h2>
            <p className="text-xs text-roast-400 mt-0.5">{equipment.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1,2,3].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                  step === s ? 'bg-brew-700' : step > s ? 'bg-brew-300' : 'bg-cream-200'
                }`}/>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-cream-100 text-roast-400">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step 1 — Issue type + priority */}
          {step === 1 && (
            <>
              <div>
                <label className="form-label">What type of issue is this? *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {ISSUE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setIssueType(t)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-left ${
                        issueType === t
                          ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                          : 'border-cream-200 bg-cream-50 text-roast-600 hover:border-brew-300'
                      }`}
                    >{t}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">How urgent is this?</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low','normal','high','urgent'] as RequestPriority[]).map(p => (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl border text-xs font-medium transition-all capitalize ${
                        priority === p
                          ? 'border-brew-500 bg-brew-50 text-brew-700 shadow-sm'
                          : 'border-cream-200 bg-cream-50 text-roast-500 hover:border-brew-300'
                      }`}
                    >{p}</button>
                  ))}
                </div>
                <p className="text-xs text-roast-400 mt-1.5">
                  {priority === 'urgent' ? '🔴 Out of service — cannot operate' :
                   priority === 'high'   ? '🟠 Major issue affecting all drinks' :
                   priority === 'normal' ? '🟡 Noticeable but workable' :
                                           '🟢 Minor, can wait for scheduled service'}
                </p>
              </div>
            </>
          )}

          {/* Step 2 — Diagnostic questions */}
          {step === 2 && (
            <>
              <div className="bg-brew-50 border border-brew-100 rounded-xl px-3 py-2.5">
                <p className="text-xs text-brew-700">
                  Your answers go directly to the Gobena technician — be as specific as possible.
                </p>
              </div>

              {questions.map(q => (
                <div key={q.id}>
                  <label className="form-label">{q.label}</label>
                  <textarea
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    rows={2}
                    placeholder={q.placeholder}
                    className="form-input resize-none"
                  />
                </div>
              ))}

              <div>
                <label className="form-label">Additional notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything else Gobena should know…"
                  className="form-input resize-none"
                />
              </div>
            </>
          )}

          {/* Step 3 — Media + review */}
          {step === 3 && (
            <>
              {/* Summary of what will be sent */}
              <div className="bg-cream-50 border border-cream-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-medium text-roast-500 uppercase tracking-wide mb-2">
                  What Gobena will receive
                </p>
                <div className="flex items-center gap-2 text-xs text-roast-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brew-500 shrink-0"/>
                  Issue type: <span className="font-medium text-bark ml-1">{issueType}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-roast-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brew-500 shrink-0"/>
                  Priority: <span className="font-medium text-bark capitalize ml-1">{priority}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-roast-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-brew-500 shrink-0"/>
                  All {questions.length} diagnostic answers
                </div>
                {notes.trim() && (
                  <div className="flex items-center gap-2 text-xs text-roast-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-brew-500 shrink-0"/>
                    Additional notes included
                  </div>
                )}
              </div>

              {/* Photo/video upload */}
              <div>
                <label className="form-label">Photos or Videos (optional)</label>
                <p className="text-xs text-roast-400 mb-2">
                  Attach up to 5 photos or videos showing the issue.
                </p>

                {mediaPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {mediaPreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl border border-cream-200"/>
                        <button type="button" onClick={() => removeFile(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                          <Trash2 size={10}/>
                        </button>
                        {mediaFiles[i]?.type.startsWith('video') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-bark/30 rounded-xl">
                            <span className="text-white text-xs font-medium">VIDEO</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {mediaFiles.length < 5 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-cream-300 text-roast-500 text-sm font-medium hover:border-brew-300 hover:text-brew-700 transition-colors w-full justify-center">
                    <ImagePlus size={16}/> Add photo or video
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect}/>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-cream-100 flex gap-3 shrink-0">
          {step > 1 && (
            <button type="button" onClick={() => setStep(prev => (prev - 1) as 1|2|3)} className="btn-secondary">
              <ChevronLeft size={14}/> Back
            </button>
          )}
          {step < 3 ? (
            <button type="button"
              disabled={step === 1 ? !issueType : !allAnswered}
              onClick={() => setStep(prev => (prev + 1) as 2|3)}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {step === 1 ? 'Answer Questions' : 'Review & Submit'} <ChevronRight size={14}/>
            </button>
          ) : (
            <button type="button" disabled={saving} onClick={handleSubmit}
              className="btn-primary flex-1 justify-center disabled:opacity-60">
              {saving
                ? <span className="flex items-center gap-2"><Spinner/> Submitting…</span>
                : <><Send size={14}/> Submit to Gobena</>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
