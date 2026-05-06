import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         'gobena-auth-v1',
  },
  // Disable realtime entirely — we don't use live subscriptions
  // This prevents WebSocket connection attempts which slow down startup
  realtime: {
    params: { eventsPerSecond: 0 },
  },
});
