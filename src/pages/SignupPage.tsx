import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getShops, updateProfile } from '../lib/queries';
import type { Shop } from '../types';

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function GoMark() {
  return (
    <div className="w-14 h-14 rounded-2xl bg-dark flex items-center justify-center mx-auto mb-4"
      style={{ background: '#1a0e06' }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="5" y="8" width="26" height="1.5" rx="0.75" fill="white" opacity="0.2"/>
        <text x="18" y="26" fontFamily="Georgia,serif" fontSize="19" fontWeight="700"
          fontStyle="italic" fill="white" textAnchor="middle">GO</text>
      </svg>
    </div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();

  const [step,     setStep]    = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email,    setEmail]   = useState('');
  const [password, setPassword] = useState('');
  const [shopId,   setShopId]  = useState('');
  const [shops,    setShops]   = useState<Shop[]>([]);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');

  useEffect(() => {
    getShops().then(setShops);
  }, []);

  const handleNext = () => {
    if (!fullName.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim())    { setError('Please enter your email.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) { setError('Please select your shop.'); return; }
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'partner' } },
    });

    if (err) { setError(err.message); setLoading(false); return; }

    if (data.user && shopId) {
      await updateProfile(data.user.id, { shop_id: shopId });
    }

    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-foam flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <GoMark/>
          <h1 className="font-display text-2xl font-bold text-bark">Gobena Service</h1>
          <p className="text-sm text-roast-400 mt-1">Create your partner account</p>
        </div>

        <div className="card shadow-warm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  step >= s ? 'bg-brew-700 text-cream-50' : 'bg-cream-200 text-roast-400'
                }`}>{s}</div>
                {s === 1 && <div className={`h-0.5 w-8 rounded transition-colors ${step >= 2 ? 'bg-brew-400' : 'bg-cream-200'}`}/>}
              </div>
            ))}
            <span className="text-xs text-roast-400 ml-1">
              {step === 1 ? 'Your account' : 'Your shop'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your name" className="form-input" autoComplete="name"/>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" className="form-input" autoComplete="email"/>
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" className="form-input" autoComplete="new-password"/>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                <button type="button" onClick={handleNext}
                  className="btn-primary w-full justify-center py-3">
                  Continue →
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="form-label">Your Coffee Shop</label>
                  <p className="text-xs text-roast-400 mb-2">Select the shop you work at. Not listed? Contact Gobena.</p>
                  <select value={shopId} onChange={e => setShopId(e.target.value)} className="form-input">
                    <option value="">Select your shop…</option>
                    {shops.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.city}, {s.state}
                      </option>
                    ))}
                  </select>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                    Back
                  </button>
                  <button type="submit" disabled={loading || !shopId}
                    className="btn-primary flex-1 justify-center disabled:opacity-60">
                    {loading ? <><Spinner/> Creating…</> : 'Create Account'}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-center text-sm text-roast-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brew-600 font-medium hover:text-brew-800">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
