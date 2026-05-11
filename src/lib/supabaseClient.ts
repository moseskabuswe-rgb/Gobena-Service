import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    // implicit flow: no code exchange, no sessionStorage dependency
    // PKCE caused Android Chrome to stall on QR-scanned tabs because
    // the code_verifier lives in sessionStorage which isn't shared across tabs
    flowType: 'implicit',
    // false: don't try to parse auth tokens from the URL on every page load.
    // Equipment pages are public — there's never an auth token in their URL.
    // Having this true caused getSession() to hang on Android while it tried
    // to exchange a non-existent code from the URL.
    detectSessionInUrl: false,
    autoRefreshToken: true,
  },
  global: {
    headers: { 'x-client-info': 'gobena-service/2.0' },
  },
});
