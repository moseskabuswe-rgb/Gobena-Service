import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { GoMark, Mail, AlertCircle } from '../components/Icons';

// ─── Shared Layout ────────────────────────────────────────────────────────────
function AuthShell({ children, title, sub }: { children: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <GoMark size={48} />
          <h1 className="mt-3 text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, type = 'text', value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wide">
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

// ─── Login Page ───────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    navigate('/dashboard');
  };

  return (
    <AuthShell title="Welcome back" sub="Sign in to Gobena Service">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@coffeeshop.com" required />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl
            hover:bg-stone-800 active:scale-[.98] transition disabled:opacity-50 mt-2"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">
        New shop?{' '}
        <Link to="/register" className="text-amber-700 font-medium hover:underline">
          Request access
        </Link>
      </p>
    </AuthShell>
  );
}

// ─── Shop Registration Page ───────────────────────────────────────────────────
export function RegisterPage() {
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    shopName: '', city: '', state: '', address: '',
    contactName: '', contactEmail: '', contactPhone: '',
    password: '',
  });

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. Create auth account
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.contactEmail,
      password: form.password,
    });
    if (authErr || !authData.user) {
      setError(authErr?.message || 'Registration failed');
      setLoading(false);
      return;
    }

    // 2. Create pending shop
    const { data: shopData, error: shopErr } = await supabase
      .from('shops')
      .insert({
        name: form.shopName,
        address: form.address,
        city: form.city,
        state: form.state,
        contact_name: form.contactName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone,
        status: 'pending',
      })
      .select('id')
      .single();
    if (shopErr || !shopData) {
      setError('Shop registration failed. Please try again.');
      setLoading(false);
      return;
    }

    // 3. Create profile linked to shop
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        shop_id: shopData.id,
        role: 'partner',
        full_name: form.contactName,
      });
    if (profileErr) {
      setError('Profile setup failed. Please contact support.');
      setLoading(false);
      return;
    }

    // Sign out — they must wait for approval
    await supabase.auth.signOut();
    setStep('done');
  };

  if (step === 'done') {
    return (
      <AuthShell title="Request submitted" sub="We'll be in touch soon">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Mail size={28} className="text-green-600" />
          </div>
          <div className="text-sm text-stone-600 leading-relaxed">
            <p className="font-semibold text-stone-800 mb-1">Your request is pending approval</p>
            <p>Gobena will review your shop and send you an email once approved. This usually takes 1–2 business days.</p>
          </div>
          <Link
            to="/login"
            className="block w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl text-center hover:bg-stone-800 transition"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Register your shop" sub="Request access to Gobena Service">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-3">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest pt-1">Shop info</div>
        <Field label="Shop name" value={form.shopName} onChange={set('shopName')} placeholder="The Corner Grind" required />
        <Field label="Address" value={form.address} onChange={set('address')} placeholder="123 Main St" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={form.city} onChange={set('city')} placeholder="Chicago" required />
          <Field label="State" value={form.state} onChange={set('state')} placeholder="IL" required />
        </div>
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest pt-2">Your contact</div>
        <Field label="Your name" value={form.contactName} onChange={set('contactName')} placeholder="Jane Barista" required />
        <Field label="Email" type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="jane@shop.com" required />
        <Field label="Phone" type="tel" value={form.contactPhone} onChange={set('contactPhone')} placeholder="+1 (555) 000-0000" />
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest pt-2">Set a password</div>
        <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="8+ characters" required />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl
            hover:bg-stone-800 active:scale-[.98] transition disabled:opacity-50 mt-2"
        >
          {loading ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-stone-500">
        Already approved?{' '}
        <Link to="/login" className="text-amber-700 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
