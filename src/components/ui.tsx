/**
 * Shared, domain-agnostic UI primitives.
 *
 * Nothing in this file knows about shops, equipment, or Gobena — it is the
 * first concrete boundary for a future shared component library (Marvelous
 * LLC) that this app and other apps (e.g. Social Brew) can both import.
 * Keep it that way: no Supabase calls, no Gobena copy, no business logic.
 */
import type { InputHTMLAttributes } from 'react';

// ─── Spinner ──────────────────────────────────────────────────────────────────

const SPINNER_SIZE = { sm: 'w-5 h-5', md: 'w-6 h-6', lg: 'w-8 h-8' } as const;

export function Spinner({ size = 'md', className = '' }: { size?: keyof typeof SPINNER_SIZE; className?: string }) {
  return (
    <div className={`${SPINNER_SIZE[size]} border-2 border-amber-600 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}

/** Full-viewport centered spinner — for whole-page loading states. */
export function PageSpinner() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <Spinner />
    </div>
  );
}

/** Centered spinner within a content section — for list/panel loading states. */
export function SectionSpinner({ className = 'py-12' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Spinner />
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({
  label, type = 'text', value, onChange, placeholder, required,
}: {
  label: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl bg-white
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
          placeholder:text-stone-300 transition"
      />
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

export function ModalShell({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-8">
      <div className="bg-white w-full md:max-w-xl md:rounded-2xl rounded-t-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col md:shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-bold text-stone-900">{title}</h2>
          <button onClick={onClose} aria-label="Close"
            className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition text-lg leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
