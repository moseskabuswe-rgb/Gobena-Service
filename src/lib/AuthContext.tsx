import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Profile, Shop, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  shop: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, shop_id, role, full_name, created_at')
    .eq('id', userId)
    .single();
  if (error) { console.error('Profile fetch error:', error.message); return null; }
  return data as Profile;
}

async function fetchShop(shopId: string): Promise<Shop | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address, city, state, contact_name, contact_email, contact_phone, status, approved_at, approved_by, notes, created_at')
    .eq('id', shopId)
    .single();
  if (error) { console.error('Shop fetch error:', error.message); return null; }
  return data as Shop;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop]       = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (u: User) => {
    const p = await fetchProfile(u.id);
    setProfile(p);
    if (p?.shop_id) {
      const s = await fetchShop(p.shop_id);
      setShop(s);
    } else {
      setShop(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setShop(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, shop, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
