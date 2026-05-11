import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Profile, Shop, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, shop: null, loading: true, signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

// Fetch profile and shop in parallel where possible
async function loadUserData(userId: string): Promise<{ profile: Profile | null; shop: Shop | null }> {
  // Step 1: get profile
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select('id, shop_id, role, full_name, created_at')
    .eq('id', userId)
    .single();

  if (profileErr || !profileData) {
    console.error('Profile fetch error:', profileErr?.message);
    return { profile: null, shop: null };
  }

  const profile = profileData as Profile;

  // Step 2: get shop only if partner (admin has no shop_id)
  if (!profile.shop_id) return { profile, shop: null };

  const { data: shopData, error: shopErr } = await supabase
    .from('shops')
    .select('id, name, address, city, state, contact_name, contact_email, contact_phone, status, approved_at, approved_by, notes, created_at')
    .eq('id', profile.shop_id)
    .single();

  if (shopErr) console.error('Shop fetch error:', shopErr.message);
  return { profile, shop: (shopData as Shop) || null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop]       = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  // Prevent onAuthStateChange from double-firing after getSession
  const initialised = useRef(false);

  useEffect(() => {
    // Hard timeout — if Supabase doesn't respond in 6s, unblock the UI
    const safetyTimer = setTimeout(() => {
      console.warn('Auth timed out — unblocking UI');
      setLoading(false);
    }, 6000);

    // Get session from localStorage immediately (no network call)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialised.current = true;

      if (session?.user) {
        setUser(session.user);
        const { profile: p, shop: s } = await loadUserData(session.user.id);
        setProfile(p);
        setShop(s);
      }

      clearTimeout(safetyTimer);
      setLoading(false);
    });

    // Auth state changes (sign in / sign out after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Skip the first fire — getSession already handled it
      if (!initialised.current) return;

      if (session?.user) {
        setUser(session.user);
        setLoading(true);
        const { profile: p, shop: s } = await loadUserData(session.user.id);
        setProfile(p);
        setShop(s);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setShop(null);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ user, profile, shop, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
