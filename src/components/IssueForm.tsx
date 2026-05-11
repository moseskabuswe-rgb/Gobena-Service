import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Equipment } from '../types';
import { X, AlertCircle, CheckCircle, Camera } from './Icons';

const SEVERITY_OPTIONS = [
  { value: 'low',      label: 'Low',      desc: 'Minor issue, not urgent',             color: 'border-stone-200 text-stone-600' },
  { value: 'medium',   label: 'Medium',   desc: 'Affecting workflow',                  color: 'border-amber-300 text-amber-700' },
  { value: 'high',     label: 'High',     desc: 'Significantly impacting operations',  color: 'border-orange-300 text-orange-700' },
  { value: 'critical', label: 'Critical', desc: 'Machine unusable or safety concern',  color: 'border-red-300 text-red-700' },
];

// Compress a photo to JPEG, max 1200px on longest side, 75% quality.
// A typical phone photo (4-8 MB) comes out ~100-200 KB - safe for Supabase free tier.
function compressImage(file: File, maxPx = 1200, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

export default function IssueForm({
  equipment,
  onClose,
  onSubmit,
}: {
  equipment: Equipment;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { user, profile } = useAuth();
  const [step, setStep]   = useState<'form' | 'done'>('form');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity]       = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [guestName, setGuestName]     = useState('');
  const [guestEmail, setGuestEmail]   = useState('');
  const [photos, setPhotos]           = useState<File[]>([]);

  const isGuest = !user;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(Array.from(e.target.files || []).slice(0, 3));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Please describe the issue'); return; }
    if (isGuest && !guestName.trim()) { setError('Please enter your name'); return; }

    setError('');
    setLoading(true);

    // Compress then upload each photo
    const photoUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      setUploadProgress(`Compressing photo ${i + 1} of ${photos.length}...`);
      try {
        const compressed = await compressImage(photos[i]);
        const path = `issues/${equipment.id}/${Date.now()}-${i}.jpg`;
        setUploadProgress(`Uploading photo ${i + 1} of ${photos.length}...`);
        const { error: uploadErr } = await supabase.storage
          .from('issue-photos')
          .upload(path, compressed, { contentType: 'image/jpeg' });
        if (!uploadErr) {
          const { data } = supabase.storage.from('issue-photos').getPublicUrl(path);
          photoUrls.push(data.publicUrl);
        }
      } catch {
        // Skip a photo that fails - don't block the whole report
      }
    }
    setUploadProgress('');

    const { error: issueErr } = await supabase.from('issues').insert({
      equipment_id:   equipment.id,
      shop_id:        equipment.shop_id,
      reported_by:    user?.id || null,
      reporter_name:  isGuest ? guestName : (profile?.full_name || null),
      reporter_email: isGuest ? guestEmail : (user?.email || null),
      title:          title.trim(),
      description:    description.trim(),
      severity,
      status:         'open',
      photo_urls:     photoUrls.length > 0 ? photoUrls : null,
    });

    if (issueErr) {
      setError('Failed to submit issue. Please try again.');
      setLoading(false);
      return;
    }

    setStep('done');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-900">Report an issue</h2>
            <p className="text-xs text-stone-400 mt-0.5">{equipment.name} · {equipment.brand} {equipment.model}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition">
            <X size={18} />
          </button>
        </div>

        {step === 'done' ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <h3 className="font-bold text-stone-900 mb-1">Issue reported</h3>
            <p className="text-sm text-stone-500">Gobena has been notified and will follow up soon.</p>
            <button onClick={onSubmit} className="mt-6 px-6 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {isGuest && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 space-y-3">
                <p className="text-xs font-semibold text-amber-800">Quick report - no login needed</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Your name *</label>
                    <input value={guestName} onChange={e => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Jane" />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Email (optional)</label>
                    <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="you@shop.com" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                What's the issue? *
              </label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Espresso machine not reaching pressure"
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                More detail
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="When did it start? What have you already tried? Any error messages?"
                rows={3}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Severity
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setSeverity(opt.value as typeof severity)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition ${
                      severity === opt.value ? `${opt.color} bg-opacity-10 border-2` : 'border-stone-200 text-stone-500'
                    }`}>
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                Photos (optional, max 3)
              </label>
              <label className="flex items-center gap-2 border border-dashed border-stone-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-stone-50 transition">
                <Camera size={16} className="text-stone-400 shrink-0" />
                <span className="text-sm text-stone-400">
                  {photos.length > 0
                    ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected`
                    : 'Add up to 3 photos'}
                </span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
              </label>
              {photos.length > 0 && (
                <p className="text-xs text-stone-400 mt-1.5 pl-1">
                  Photos are compressed before upload to save storage.
                </p>
              )}
            </div>

            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-stone-500 bg-stone-50 rounded-xl px-3.5 py-3">
                <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                {uploadProgress}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-3">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-stone-900 text-white font-semibold text-sm rounded-xl hover:bg-stone-800 active:scale-[.98] transition disabled:opacity-50">
              {loading ? (uploadProgress ? 'Processing...' : 'Submitting...') : 'Submit issue'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
