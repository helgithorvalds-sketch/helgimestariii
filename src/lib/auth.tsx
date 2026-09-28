/* eslint-disable react-refresh/only-export-components -- provider, hook and guards live together by design */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { EmailOtpType, Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { href } from './paths';
import { SITE_URL } from './seo';
import { isNativeApp } from './platform';
import { parseApiError } from './errors';
import type { Profile } from './types';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { useT } from './i18n';

export type SignUpResult = { needsConfirmation: boolean; user: User | null };

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /**
   * Why `profile` is null although a user is signed in: the query failed, or
   * there is no row. Undefined while the profile is loading or once it loaded.
   */
  profileError?: unknown;
  isAdmin: boolean;
  isBanned: boolean;
  /** True until the initial session (and profile, when signed in) has been resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** `next` is the app path (e.g. '/selja?event=1') the confirmation e-mail should return to. */
  signUp: (email: string, password: string, displayName: string, next?: string | null) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  /** `next` as in `signUp`. */
  sendMagicLink: (email: string, next?: string | null) => Promise<void>;
  /** Sends the sign-up confirmation e-mail again. */
  resendConfirmation: (email: string, next?: string | null) => Promise<void>;
  /**
   * Signs in with the 6-digit code from an e-mail (magic link or sign-up confirmation).
   * Works in the phone apps, where the e-mail link would open the browser instead.
   */
  verifyEmailCode: (email: string, code: string, kind: 'magic' | 'signup') => Promise<void>;
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

/**
 * Where auth e-mails send people back to. On the website that is the page's own origin;
 * in the phone apps (origin capacitor://localhost) it is the public website.
 */
function appOrigin(): string {
  if (typeof window === 'undefined' || isNativeApp()) return SITE_URL;
  return window.location.origin;
}

/**
 * Supabase sends people back with `#error=…&error_code=otp_expired` (or `?error=…`) when an
 * e-mail link is expired or already used. Returns the parsed code and strips it from the URL.
 */
function takeAuthLinkError(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get('error_code') ?? query.get('error_code');
  const error = hash.get('error') ?? query.get('error');
  if (!code && !error) return null;
  const description = hash.get('error_description') ?? query.get('error_description') ?? '';
  for (const key of ['error', 'error_code', 'error_description']) query.delete(key);
  const search = query.toString();
  window.history.replaceState(window.history.state, '', window.location.pathname + (search ? `?${search}` : ''));
  if (code === 'otp_expired' || /expired|invalid/i.test(description)) return 'LINK_EXPIRED';
  return code ?? error;
}

/** Absolute redirect URL for auth e-mails: only a same-origin app path is honoured, anything else lands on the market home. */
function emailRedirect(next?: string | null): string {
  const value = next?.trim() ?? '';
  const safe =
    value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !/\s/.test(value) && !value.includes('://');
  return appOrigin() + href(safe ? value : '/');
}

type ProfileFetch = { profile: Profile | null; error: unknown };

async function fetchProfile(uid: string): Promise<ProfileFetch> {
  const { data, error } = await supabase.from('mt_profiles').select('*').eq('id', uid).maybeSingle();
  if (error) {
    console.error('[midatorg] profile fetch failed', error);
    return { profile: null, error };
  }
  return { profile: data, error: data ? undefined : new Error('NOT_FOUND') };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setProfileError(undefined);
      return null;
    }
    const result = await fetchProfile(uid);
    // ignore late results for a user who has signed out in the meantime
    if (sessionRef.current?.user.id === uid) {
      setProfile(result.profile);
      setProfileError(result.error);
    }
    return result.profile;
  }, []);

  // An expired or already-used e-mail link: say so instead of silently showing a signed-out page.
  useEffect(() => {
    const code = takeAuthLinkError();
    if (code) toast.error(t(parseApiError(code).key), { duration: 10_000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on the first render after the redirect
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
        setProfileError(undefined);
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

  const signUp = useCallback(
    async (email: string, password: string, displayName: string, next?: string | null): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: emailRedirect(next),
        },
      });
      if (error) throw error;
      // With e-mail confirmation on, Supabase answers a sign-up for an existing address with a
      // user that has no identities (and sends nothing) instead of an error.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('USER_ALREADY_REGISTERED');
      }
      return { needsConfirmation: !data.session, user: data.user };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setProfileError(undefined);
    setPendingPhone(null);
    if (error) throw error;
  }, []);

  const sendMagicLink = useCallback(async (email: string, next?: string | null) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: emailRedirect(next), shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const resendConfirmation = useCallback(async (email: string, next?: string | null) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: emailRedirect(next) } });
    if (error) throw error;
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string, kind: 'magic' | 'signup') => {
    const type: EmailOtpType = kind === 'signup' ? 'signup' : 'email';
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type });
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
      profileError,
      isAdmin: profile?.role === 'admin',
      isBanned: !!profile?.banned_at,
      loading,
      signIn,
      signUp,
      signOut,
      sendMagicLink,
      resendConfirmation,
      verifyEmailCode,
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
      profileError,
      loading,
      signIn,
      signUp,
      signOut,
      sendMagicLink,
      resendConfirmation,
      verifyEmailCode,
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

/** Builds the login URL that returns to `next` (an absolute app path such as '/selja'). */
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
  const { user, isAdmin, loading, profile, profileError, refreshProfile } = useAuth();
  const location = useLocation();
  const t = useT();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to={loginHref(location.pathname + location.search)} replace />;
  if (!profile) {
    // still loading, or the profile could not be loaded: never a skeleton forever
    if (profileError === undefined) return <PageSkeleton />;
    return <ErrorState error={profileError} retry={() => void refreshProfile()} />;
  }
  if (!isAdmin) return <ErrorState title={t('common.noAccessTitle')} body={t('common.noAccessBody')} />;
  return children ? <>{children}</> : <Outlet />;
}
