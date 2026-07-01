import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured, Role } from '../lib/supabase';

interface Profile {
  companyId: string;
  companyName: string | null;
  role: Role;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  companyId: string | null;
  /** Signed in but not yet attached to a company → must create or join one. */
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('company_id, role, companies(name)')
    .eq('id', userId)
    .maybeSingle();
  if (!data || !data.company_id) return null;
  const companies = data.companies as { name: string } | { name: string }[] | null;
  const companyName = Array.isArray(companies) ? companies[0]?.name ?? null : companies?.name ?? null;
  return { companyId: data.company_id, role: data.role as Role, companyName };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(supabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setProfile(await loadProfile(user.id));
  }, [user]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) setProfile(await loadProfile(data.session.user.id));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setProfile(newSession?.user ? await loadProfile(newSession.user.id) : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue['signUp'] = async (email, password) => {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
  };

  // Local-only fallback (no Supabase configured): act as admin so dev keeps working.
  const role: Role | null = supabaseConfigured ? profile?.role ?? null : 'admin';
  const needsOnboarding = supabaseConfigured && !!session && !profile;

  return (
    <AuthContext.Provider
      value={{
        configured: supabaseConfigured,
        loading,
        session,
        user,
        profile,
        role,
        companyId: profile?.companyId ?? null,
        needsOnboarding,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
