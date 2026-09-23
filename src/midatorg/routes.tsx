import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PageContainer } from './components/layout/PageContainer';
import { PageSkeleton } from './components/common/PageSkeleton';
import { RequireAdmin, RequireAuth } from './lib/auth';

const HomePage = lazy(() => import('./pages/HomePage'));
const EventPage = lazy(() => import('./pages/EventPage'));
const SellPage = lazy(() => import('./pages/SellPage'));
const WantPage = lazy(() => import('./pages/WantPage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));
const DealRoomPage = lazy(() => import('./pages/DealRoomPage'));
const MyPage = lazy(() => import('./pages/MyPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-6">
          <PageSkeleton />
        </PageContainer>
      }
    >
      {children}
    </Suspense>
  );
}

/** Route table; paths are relative to `/midatorg` (the parent route in src/App.tsx owns the prefix). */
export function MidatorgRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Page><HomePage /></Page>} />
        <Route path="vidburdir/:eventId" element={<Page><EventPage /></Page>} />
        <Route path="notendur/:userId" element={<Page><PublicProfilePage /></Page>} />
        <Route path="innskra" element={<Page><LoginPage /></Page>} />
        <Route path="um" element={<Page><AboutPage /></Page>} />

        <Route element={<RequireAuth />}>
          <Route path="selja" element={<Page><SellPage /></Page>} />
          <Route path="oska" element={<Page><WantPage /></Page>} />
          <Route path="vidskipti" element={<Page><DealsPage /></Page>} />
          <Route path="vidskipti/:dealId" element={<Page><DealRoomPage /></Page>} />
          <Route path="eg" element={<Page><MyPage /></Page>} />
          <Route path="tilkynningar" element={<Page><NotificationsPage /></Page>} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="stjorn" element={<Page><AdminPage /></Page>} />
        </Route>

        <Route path="*" element={<Page><NotFoundPage /></Page>} />
      </Route>
    </Routes>
  );
}

export default MidatorgRoutes;
