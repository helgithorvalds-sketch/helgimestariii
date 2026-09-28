import { Flame, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { MarketEvent } from '../../lib/types';

/** Events this high on the tix.is front page count as "Vinsælt á tix.is". */
export const POPULAR_RANK = 12;

export type TixBadgeKind = 'soldOut' | 'popular';

type TixFields = Pick<MarketEvent, 'status' | 'starts_at'> & Partial<Pick<MarketEvent, 'tix_availability' | 'tix_rank'>>;

/** Sold out on tix.is wins over popular; nothing for past or cancelled events. */
export function tixBadgeOf(event: TixFields, now: number = Date.now()): TixBadgeKind | null {
  if (event.status !== 'upcoming') return null;
  const ts = event.starts_at ? Date.parse(event.starts_at) : NaN;
  if (Number.isFinite(ts) && ts < now) return null;
  if (event.tix_availability === 'sold_out') return 'soldOut';
  if (event.tix_rank != null && event.tix_rank <= POPULAR_RANK) return 'popular';
  return null;
}

/** Small pill: "Uppselt á tix.is" (dark) or "Vinsælt á tix.is" (blue). Renders nothing otherwise. */
export function TixBadge({ event, className }: { event: TixFields; className?: string }) {
  const t = useT();
  const kind = tixBadgeOf(event);
  if (!kind) return null;
  const Icon = kind === 'soldOut' ? Ticket : Flame;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold shadow-sm',
        kind === 'soldOut' ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground',
        className,
      )}
      data-testid="tix-badge"
      data-kind={kind}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(kind === 'soldOut' ? 'home.badge.soldOut' : 'home.badge.popular')}
    </span>
  );
}
