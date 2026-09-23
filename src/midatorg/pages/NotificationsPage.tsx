import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeftRight, Bell, BellRing, CheckCheck, Info, MessageSquare, Star, Tag, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../lib/i18n';
import { formatRelative } from '../lib/format';
import { href } from '../lib/paths';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../lib/queries';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import type { Notification, NotificationType } from '../lib/types';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageContainer } from '../components/layout/PageContainer';
import { RowsSkeleton } from '../components/admin/AdminBits';

const TYPE_ICON: Record<NotificationType, ComponentType<LucideProps>> = {
  listing_match: Tag,
  request_match: Tag,
  deal: ArrowLeftRight,
  message: MessageSquare,
  rating: Star,
  alert: BellRing,
  system: Info,
};

/**
 * /tilkynningar — full list, newest first, unread emphasised. Click → mark read
 * + navigate to the link. The realtime channel is mounted once by AppShell
 * (useNotificationsRealtime) and invalidates ['mt','notifications'].
 */
export default function NotificationsPage() {
  const t = useT();
  const [locale] = useLocale();
  const navigate = useNavigate();
  useDocumentTitle(t('notifications.title'));
  const list = useNotifications(100);
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = unread.data ?? list.data?.filter((n) => !n.read_at).length ?? 0;

  const open = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(href(n.link));
  };

  return (
    <PageContainer className="max-w-3xl py-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">{t('notifications.title')}</h1>
          <p className="text-[13px] text-muted-foreground">
            {count > 0 ? (count === 1 ? t('notifications.unreadOne') : t('notifications.unread', { count })) : t('notifPage.subtitle')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 sm:h-9"
          disabled={count === 0 || markAll.isPending}
          onClick={() => markAll.mutate(undefined, { onSuccess: () => toast.success(t('notifPage.markAllDone')) })}
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          {count === 0 ? t('notifPage.allRead') : t('notifications.markAllRead')}
        </Button>
      </header>

      {list.isPending ? (
        <RowsSkeleton rows={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} retry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('notifications.empty')}
          body={t('notifPage.emptyBody')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={href('/')}>{t('common.goHome')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-panel divide-y divide-border" aria-label={t('notifPage.listLabel')}>
          {list.data.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Info;
            const isUnread = !n.read_at;
            return (
              <li key={n.id} data-testid="notification-row" data-unread={isUnread || undefined}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full min-h-[44px] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isUnread && 'bg-primary/5',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border',
                      isUnread ? 'bg-primary/15 text-foreground' : 'bg-surface-2 text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {isUnread && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" role="img" aria-label={t('notifPage.unreadLabel')} />
                      )}
                      <span className={cn('min-w-0 flex-1 text-[13.5px]', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                        {n.title}
                      </span>
                      <time dateTime={n.created_at} className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                        {formatRelative(n.created_at, locale)}
                      </time>
                    </span>
                    {n.body && <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{n.body}</span>}
                    {n.link && <span className="mt-1 block text-[12px] text-muted-foreground underline underline-offset-2">{t('notifPage.open')}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
