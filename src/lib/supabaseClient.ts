import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage so sessions persist across QR-scanned tabs on Android
    storage: window.localStorage,
    persistSession: true,
    // detectSessionInUrl must be true for email magic links / oauth
    detectSessionInUrl: true,
    autoRefreshToken: true,
    // Flowkey: PKCE is more reliable than implicit flow on mobile browsers
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-client-info': 'gobena-service/2.0' },
  },
});
