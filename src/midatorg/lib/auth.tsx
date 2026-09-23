/* eslint-disable react-refresh/only-export-components -- provider, hook and guards live together by design */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { href } from './paths';
import type { Profile } from './types';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { useT } from './i18n';

export type SignUpResult = { needsConfirmation: boolean; user: User | null };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isBanned: boolean;
  /** True until the initial session (and profile, when signed in) has been resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  /** Sends an SMS code to the number (E.164, e.g. +3546661234) via `updateUser({ phone })`. */
  startPhoneVerification: (phone: string) => Promise<void>;
  /** Confirms the SMS code for the number given to `startPhoneVerification` (or `phone`). */
  verifyPhone: (token: string, phone?: string) => Promise<void>;
  /** The number awaiting verification, if any. */
  pendingPhone: string | null;
  refreshProfile: () => Promise<Profile | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function appOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin;
}

async function fetchProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('mt_profiles').select('*').eq('id', uid).maybeSingle();
  if (error) {
    console.error('[midatorg] profile fetch failed', error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      return null;
    }
    const p = await fetchProfile(uid);
    // ignore late results for a user who has signed out in the meantime
    if (sessionRef.current?.user.id === uid) setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        sessionRef.current = data.session;
        setSession(data.session);
        await loadProfile(data.session?.user.id);
      })
      .catch((err) => console.error('[midatorg] getSession failed', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      sessionRef.current = s;
      setSession(s);
      if (event === 'SIGNED_OUT' || !s) {
        setProfile(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Defer: supabase-js warns against awaiting its own calls inside this callback.
        setTimeout(() => {
          void loadProfile(s.user.id);
        }, 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    return loadProfile(sessionRef.current?.user.id);
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: appOrigin() + href('/'),
      },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session, user: data.user };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setPendingPhone(null);
    if (error) throw error;
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: appOrigin() + href('/'), shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appOrigin() + href('/eg?reset=1'),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const startPhoneVerification = useCallback(async (phone: string) => {
    const normalised = phone.replace(/[\s-]/g, '');
    const { error } = await supabase.auth.updateUser({ phone: normalised });
    if (error) throw error;
    setPendingPhone(normalised);
  }, []);

  const verifyPhone = useCallback(
    async (token: string, phone?: string) => {
      const target = phone?.replace(/[\s-]/g, '') ?? pendingPhone;
      if (!target) throw new Error('INVALID_PHONE');
      const { error } = await supabase.auth.verifyOtp({ phone: target, token: token.trim(), type: 'phone_change' });
      if (error) throw error;
      setPendingPhone(null);
      await refreshProfile();
    },
    [pendingPhone, refreshProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === 'admin',
      isBanned: !!profile?.banned_at,
      loading,
      signIn,
      signUp,
      signOut,
      sendMagicLink,
      resetPassword,
      updatePassword,
      startPhoneVerification,
      verifyPhone,
      pendingPhone,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      sendMagicLink,
      resetPassword,
      updatePassword,
      startPhoneVerification,
      verifyPhone,
      pendingPhone,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Builds the login URL that returns to `next` (an absolute app path such as '/midatorg/selja'). */
export function loginHref(next?: string): string {
  return href(next ? `/innskra?next=${encodeURIComponent(next)}` : '/innskra');
}

/**
 * Route guard. Use as a layout route (`<Route element={<RequireAuth />}>…`) or
 * wrap an element (`<RequireAuth><SellPage /></RequireAuth>`).
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to={loginHref(location.pathname + location.search)} replace />;
  return children ? <>{children}</> : <Outlet />;
}

export function RequireAdmin({ children }: { children?: ReactNode }) {
  const { user, isAdmin, loading, profile } = useAuth();
  const location = useLocation();
  const t = useT();
  if (loading || (user && !profile)) return <PageSkeleton />;
  if (!user) return <Navigate to={loginHref(location.pathname + location.search)} replace />;
  if (!isAdmin) return <ErrorState title={t('common.noAccessTitle')} body={t('common.noAccessBody')} />;
  return children ? <>{children}</> : <Outlet />;
}
