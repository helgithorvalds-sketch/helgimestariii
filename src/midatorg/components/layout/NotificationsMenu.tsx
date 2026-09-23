import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatRelative } from '../../lib/format';
import { href } from '../../lib/paths';
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from '../../lib/queries';
import type { Notification } from '../../lib/types';

/** Bell with unread badge; dropdown lists the latest 8 notifications. Signed-in only. */
export function NotificationsMenu({ className }: { className?: string }) {
  const t = useT();
  const [locale] = useLocale();
  const navigate = useNavigate();
  const unread = useUnreadCount();
  const list = useNotifications(8);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const count = unread.data ?? 0;

  const open = (n: Notification) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(href(n.link));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('relative h-9 w-9 text-muted-foreground hover:text-foreground', className)}
          aria-label={t('notifications.aria', { count })}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums leading-none text-primary-foreground"
              data-testid="unread-badge"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[13px] font-semibold">{t('notifications.title')}</span>
          {count > 0 && (
            <button
              type="button"
              className="text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[360px] overflow-y-auto py-1">
          {(list.data?.length ?? 0) === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
              {list.isPending ? t('common.loading') : t('notifications.empty')}
            </p>
          ) : (
            list.data?.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => open(n)}
                className={cn('flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2', !n.read_at && 'bg-primary/5')}
              >
                <span className="flex w-full items-center gap-2">
                  {!n.read_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  <span className={cn('min-w-0 flex-1 truncate text-[13px]', !n.read_at ? 'font-semibold' : 'font-medium')}>
                    {n.title}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatRelative(n.created_at, locale)}
                  </span>
                </span>
                {n.body && <span className="line-clamp-2 text-[12px] text-muted-foreground">{n.body}</span>}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          onSelect={() => navigate(href('/tilkynningar'))}
          className="cursor-pointer justify-center py-2 text-[13px] font-medium"
        >
          {t('notifications.seeAll')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
