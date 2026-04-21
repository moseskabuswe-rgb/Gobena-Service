import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';


export default function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    // If the user was redirected here from a QR scan or protected route,
    // send them back there. Otherwise go to dashboard.
    const redirect = sessionStorage.getItem('gobena_redirect');
    sessionStorage.removeItem('gobena_redirect');
    navigate(redirect || '/dashboard', { replace: true });
  };

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
          <p className="text-sm text-roast-400 mt-1">Partner Operating System</p>
        </div>

        <div className="card shadow-warm">
          <h2 className="font-display text-lg font-semibold text-bark mb-5">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                required
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
                  placeholder="••••••••"
                  className="form-input pr-10"
                  required
                  autoComplete="current-password"
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
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-roast-400 mt-5">
            New partner?{' '}
            <Link to="/signup" className="text-brew-600 font-medium hover:text-brew-800 transition-colors">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-roast-300 mt-6">
          © {new Date().getFullYear()} Gobena Coffee · Built with care
        </p>
      </div>
    </div>
  );
}
