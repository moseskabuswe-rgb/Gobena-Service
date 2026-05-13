import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Profile, Shop, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, shop: null, loading: true, signOut: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

async function fetchProfileAndShop(userId: string): Promise<{ profile: Profile | null; shop: Shop | null }> {
  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('id, shop_id, role, full_name, created_at')
    .eq('id', userId)
    .single();

  if (error || !profileData) {
    console.error('Profile fetch:', error?.message);
    return { profile: null, shop: null };
  }

  const profile = profileData as Profile;
  if (!profile.shop_id) return { profile, shop: null };

  const { data: shopData } = await supabase
    .from('shops')
    .select('id, name, address, city, state, contact_name, contact_email, contact_phone, status, approved_at, approved_by, notes, created_at')
    .eq('id', profile.shop_id)
    .single();

  return { profile, shop: (shopData as Shop) || null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop]       = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safety = setTimeout(() => setLoading(false), 8000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(safety);
      if (session?.user) {
        setUser(session.user);
        const { profile: p, shop: s } = await fetchProfileAndShop(session.user.id);
        setProfile(p);
        setShop(s);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(true);
        const { profile: p, shop: s } = await fetchProfileAndShop(session.user.id);
        setProfile(p);
        setShop(s);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setShop(null);
        setLoading(false);
      }
    });

    return () => { clearTimeout(safety); subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setShop(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, shop, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
