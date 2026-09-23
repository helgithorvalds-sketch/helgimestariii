import { Outlet } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useNotificationsRealtime } from '../../lib/queries';
import { TopNav } from './TopNav';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { PageContainer } from './PageContainer';

function BannedBanner() {
  const t = useT();
  const { profile } = useAuth();
  if (!profile?.banned_at) return null;
  return (
    <div role="alert" className="border-b border-destructive/40 bg-destructive/10">
      <PageContainer className="flex items-start gap-2 py-2 text-[13px]">
        <Ban className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
        <p>
          <span className="font-semibold">{t('banned.title')}</span> {t('banned.body')}
          {profile.ban_reason && <span className="text-muted-foreground"> {t('banned.reason', { reason: profile.ban_reason })}</span>}
        </p>
      </PageContainer>
    </div>
  );
}

/** TopNav + banned banner + <Outlet/> + Footer + MobileNav. Mounts the notifications realtime channel once. */
export function AppShell() {
  useNotificationsRealtime();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <BannedBanner />
      <main id="mt-main" className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
