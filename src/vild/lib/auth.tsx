/* eslint-disable react-refresh/only-export-components -- provider, hook and guards live together by design */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, type Session } from '../data';
import type { Profile } from './types';
import { href, paths } from './paths';

export type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConsumer: boolean;
  isMerchant: boolean;
  merchantId: string | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s?.kind === 'consumer') {
      try {
        setProfile(await api().getProfile());
      } catch {
        setProfile(null);
      }
    } else setProfile(null);
  }, []);

  useEffect(() => {
    let alive = true;
    api()
      .getSession()
      .then(async (s) => {
        if (!alive) return;
        await load(s);
      })
      .finally(() => alive && setLoading(false));
    const off = api().onSessionChange((s) => {
      void load(s);
      qc.clear();
    });
    return () => {
      alive = false;
      off();
    };
  }, [load, qc]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      profile,
      loading,
      isConsumer: session?.kind === 'consumer',
      isMerchant: session?.kind === 'merchant',
      merchantId: session?.kind === 'merchant' ? session.merchantId : null,
      signOut: () => api().signOut(),
      refresh: async () => load(await api().getSession()),
    }),
    [session, profile, loading, load],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

function Splash() {
  return <div className="min-h-[50dvh]" aria-busy="true" />;
}

/** Consumer routes: send to the login screen, remembering where to return. */
export function RequireConsumer() {
  const { loading, isConsumer } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!isConsumer) return <Navigate to={href(paths.appLogin)} replace state={{ next: loc.pathname + loc.search }} />;
  return <Outlet />;
}

/** Merchant portal routes. */
export function RequireMerchant() {
  const { loading, isMerchant } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!isMerchant) return <Navigate to={href(paths.merchantLogin)} replace state={{ next: loc.pathname + loc.search }} />;
  return <Outlet />;
}
