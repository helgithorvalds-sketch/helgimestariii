import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocale } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';
import { href } from '../../lib/paths';
import type { EventRow } from '../../lib/types';

/** Bordered rows in a surface-2 pulse — the exact box of a list row (DESIGN.md §7). */
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="mt-panel space-y-3 p-4">
          <Skeleton className="h-4 w-2/3 bg-secondary" />
          <Skeleton className="h-3 w-1/3 bg-secondary" />
          <Skeleton className="h-6 w-28 bg-secondary" />
        </div>
      ))}
    </div>
  );
}

/** Small grey status chip. The label is always shown, so colour is never the only signal. */
export function StatusTag({ label, tone, className }: { label: string; tone?: string; className?: string }) {
  return <span className={cn('mt-tag', tone, className)}>{label}</span>;
}

type EventLike = Pick<EventRow, 'id' | 'title' | 'starts_at' | 'venue_name' | 'city'>;

/** Event title (links to the event page) with a "date · venue" meta line. Shared by the personal lists. */
export function EventLine({ event, children, className }: { event: EventLike; children?: ReactNode; className?: string }) {
  const [locale] = useLocale();
  const place = event.venue_name ?? event.city;
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <Link
        to={href(`/vidburdir/${event.id}`)}
        className="line-clamp-2 text-[14px] font-semibold leading-tight underline-offset-2 hover:underline"
      >
        {event.title}
      </Link>
      <p className="mt-0.5 truncate text-[12px] tabular-nums text-muted-foreground">
        {formatDateTime(event.starts_at, locale)}
        {place && <> · {place}</>}
      </p>
      {children}
    </div>
  );
}

/** Eyebrow + value pair for the small definition grids in list rows. */
export function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="mt-label">{label}</dt>
      <dd className="mt-0.5 text-[13px] tabular-nums">{children}</dd>
    </div>
  );
}
