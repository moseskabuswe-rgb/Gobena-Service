import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { supabase as supabasePublic } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

import type { Shop } from '../types';

// Fetch shops without auth (requires public read policy — see SQL patch)
async function getShopsPublic(): Promise<Shop[]> {
  const { data, error } = await supabasePublic
    .from('shops')
    .select('id, name, city, state')
    .order('name');
  if (error) { console.error('Shops load error:', error); return []; }
  return (data ?? []) as Shop[];
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [step,     setStep]     = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [shopId,   setShopId]   = useState('');
  const [shops,    setShops]    = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Load shops when user hits step 2
  useEffect(() => {
    if (step === 2 && shops.length === 0) {
      setShopsLoading(true);
      getShopsPublic().then(data => {
        setShops(data);
        setShopsLoading(false);
      });
    }
  }, [step]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) { setError('Please select your shop.'); return; }

    setLoading(true);
    setError('');

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'partner' },
      },
    });

    if (signupErr) {
      setError(signupErr.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    // Wait for the DB trigger to create the profile row, then update shop_id
    // We retry up to 8 times with 600ms gap (total ~5s window)
    let linked = false;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 600));
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ shop_id: shopId, full_name: fullName })
        .eq('id', data.user.id);

      if (!updateErr) { linked = true; break; }
    }

    if (!linked) {
      // Non-fatal: user is created, shop link failed — they can still use the app
      console.warn('Could not link shop — profile trigger may be slow');
    }

    // Force refresh profile in context
    await refreshProfile();

    setLoading(false);
    navigate('/dashboard');
  };

  const stepOneValid = fullName.trim().length > 0 && email.includes('@') && password.length >= 8;

  return (
    <div className="min-h-screen bg-foam flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-cream-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brew-100/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-warm mb-4 overflow-hidden bg-roast-900">
            <img src="/apple-touch-icon.png" alt="Gobena Coffee" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-bold text-bark">Gobena Service</h1>
          <p className="text-sm text-roast-400 mt-1">Create your partner account</p>
        </div>

        <div className="card shadow-warm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {([1, 2] as const).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step >= s ? 'bg-brew-700 text-cream-50' : 'bg-cream-200 text-roast-400'
                }`}>
                  {s}
                </div>
                {s === 1 && (
                  <div className={`h-0.5 w-8 rounded transition-colors ${step >= 2 ? 'bg-brew-400' : 'bg-cream-200'}`} />
                )}
              </div>
            ))}
            <span className="text-xs text-roast-400 ml-1">
              {step === 1 ? 'Your account' : 'Your shop'}
            </span>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="form-input"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="form-input"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="form-input pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-roast-400 hover:text-roast-600"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!stepOneValid}
                  onClick={() => { setError(''); setStep(2); }}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                <div>
                  <label className="form-label">Your Coffee Shop</label>
                  <p className="text-xs text-roast-400 mb-2">
                    Select the shop you manage. Not listed?{' '}
                    <a href="mailto:service@gobena.coffee" className="text-brew-600 hover:underline">
                      Contact Gobena.
                    </a>
                  </p>

                  {shopsLoading ? (
                    <div className="form-input flex items-center gap-2 text-roast-400 text-sm">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Loading shops…
                    </div>
                  ) : shops.length === 0 ? (
                    <div className="form-input text-red-500 text-sm">
                      Could not load shops. Please refresh or contact Gobena.
                    </div>
                  ) : (
                    <select
                      value={shopId}
                      onChange={e => setShopId(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select your shop…</option>
                      {shops.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.city}, {s.state}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !shopId}
                    className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Creating account…
                      </span>
                    ) : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-roast-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brew-600 font-medium hover:text-brew-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
