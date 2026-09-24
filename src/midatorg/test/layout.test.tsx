import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '../lib/i18n';
import type { AuthContextValue } from '../lib/auth';
import type { Profile } from '../lib/types';

const { supabaseMock, authState } = vi.hoisted(() => ({
  supabaseMock: { current: null as unknown },
  authState: { current: null as unknown },
}));

vi.mock('../lib/supabase', async () => {
  const { makeSupabaseMock } = await import('./mocks');
  supabaseMock.current = makeSupabaseMock({ data: [], error: null, count: 3 });
  return { supabase: supabaseMock.current, requireUid: () => Promise.resolve('u1'), PROOF_BUCKET: 'p', AVATAR_BUCKET: 'a' };
});

vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return { ...actual, useAuth: () => authState.current as AuthContextValue };
});

import { TopNav } from '../components/layout/TopNav';
import { AppShell } from '../components/layout/AppShell';
import { Routes, Route } from 'react-router-dom';

const noop = async () => undefined;
function auth(partial: Partial<AuthContextValue>): AuthContextValue {
  return {
    session: null,
    user: null,
    profile: null,
    isAdmin: false,
    isBanned: false,
    loading: false,
    signIn: noop,
    signUp: async () => ({ needsConfirmation: false, user: null }),
    signOut: noop,
    sendMagicLink: noop,
    resetPassword: noop,
    updatePassword: noop,
    startPhoneVerification: noop,
    verifyPhone: noop,
    pendingPhone: null,
    refreshProfile: async () => null,
    ...partial,
  };
}

const profile: Profile = {
  id: 'u1',
  display_name: 'Guðrún Jóns',
  avatar_url: null,
  bio: null,
  verification: 'phone',
  phone_verified_at: null,
  role: 'user',
  banned_at: null,
  ban_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function wrap(ui: ReactNode, path = '/midatorg') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <I18nProvider initialLocale="is">{ui}</I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('TopNav', () => {
  beforeEach(() => {
    authState.current = auth({});
  });

  it('logged out: wordmark, search, Selja miða and Innskrá with a next param', () => {
    wrap(<TopNav />, '/midatorg/um');
    expect(screen.getByText('Miðatorg')).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Leita að viðburði, listamanni eða stað' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Selja miða' })).toHaveAttribute('href', '/midatorg/selja');
    const login = screen.getByRole('link', { name: 'Innskrá' });
    expect(login).toHaveAttribute('href', '/midatorg/innskra?next=%2Fmidatorg%2Fum');
    expect(screen.queryByRole('button', { name: /Tilkynningar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notendavalmynd' })).not.toBeInTheDocument();
  });

  it('logged in: bell with unread count and the avatar menu, no Innskrá', async () => {
    authState.current = auth({
      user: { id: 'u1', email: 'gudrun@example.is' } as AuthContextValue['user'],
      session: {} as AuthContextValue['session'],
      profile,
    });
    wrap(<TopNav />);
    expect(screen.queryByRole('link', { name: 'Innskrá' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Tilkynningar, 3 ólesnar' })).toBeInTheDocument();
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('3');
    const menu = screen.getByRole('button', { name: 'Notendavalmynd' });
    expect(menu).toHaveTextContent('Guðrún Jóns');
    expect(screen.getByTestId('avatar-placeholder')).toHaveTextContent('GJ');
  });

  it('prefills the search box from ?q on the home route', () => {
    wrap(<TopNav />, '/midatorg?q=sigur');
    expect(screen.getByRole('searchbox')).toHaveValue('sigur');
  });
});

describe('AppShell', () => {
  it('renders nav, outlet, footer, mobile nav and the banned banner', () => {
    authState.current = auth({
      user: { id: 'u1', email: 'x@y.is' } as AuthContextValue['user'],
      profile: { ...profile, banned_at: '2026-02-01T00:00:00Z', ban_reason: 'Svik' },
    });
    wrap(
      <Routes>
        <Route path="/midatorg" element={<AppShell />}>
          <Route index element={<p>INNIHALD</p>} />
        </Route>
      </Routes>,
    );
    expect(screen.getByText('INNIHALD')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Aðgangnum þínum hefur verið lokað.');
    expect(screen.getByRole('alert')).toHaveTextContent('Ástæða: Svik');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026 Miðatorg');
    const aboutLinks = screen.getAllByRole('link', { name: 'Um Miðatorg' }); // TopNav + Footer
    expect(aboutLinks.length).toBe(2);
    for (const l of aboutLinks) expect(l).toHaveAttribute('href', '/midatorg/um');
    // mobile nav items
    expect(screen.getAllByRole('link', { name: /Viðskipti/ }).length).toBeGreaterThan(0);
  });
});
