import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Profile } from '../types';

interface AuthContextValue {
  user:    User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true,
  signOut: async () => {},
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, shop_id, created_at')
      .eq('id', userId)
      .single();
    return data as Profile | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Hard 3-second timeout on session check
        // Android Chrome Custom Tab can hang indefinitely on localStorage access
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>(resolve =>
          setTimeout(() => resolve(null), 3000)
        );

        const result = await Promise.race([sessionPromise, timeoutPromise]);

        if (cancelled) return;

        // If timeout won (result is null) or no session, just mark as not loading
        if (!result || !('data' in result) || !result.data.session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const u = result.data.session.user;
        setUser(u);

        // Fetch profile with its own timeout
        const p = await Promise.race([
          fetchProfile(u.id),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);

        if (!cancelled) {
          setProfile(p as Profile | null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    init();

    // Listen for auth changes (login/logout actions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          const p = await fetchProfile(u.id);
          if (!cancelled) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
