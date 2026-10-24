/**
 * Test helpers: render a VILD page inside the providers with the mock api
 * (no persistence, no latency), optionally signed in.
 */
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../lib/auth';
import { MockApi } from '../data/mock';
import { setApi } from '../data';

export function freshApi(): MockApi {
  const api = new MockApi({ persist: false, latency: 0 });
  setApi(api);
  return api;
}

export async function signInConsumer(api: MockApi) {
  await api.verifyPhoneLogin('6661234', '123456');
}

export async function signInMerchant(api: MockApi) {
  await api.merchantLogin('johanna@luna.is', 'luna1234');
}

export function renderAt(path: string, routePattern: string, element: ReactNode, opts: { wrapRoutes?: (r: ReactNode) => ReactNode } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const routes = (
    <Routes>
      <Route path={routePattern} element={element} />
    </Routes>
  );
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>{opts.wrapRoutes ? opts.wrapRoutes(routes) : routes}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
