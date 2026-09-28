import type { MarketEvent } from '../../lib/types';

/** Events this high on the tix.is front page count as "Vinsælt á tix.is". */
export const POPULAR_RANK = 12;

export type TixBadgeKind = 'soldOut' | 'popular';

export type TixFields = Pick<MarketEvent, 'status' | 'starts_at'> & Partial<Pick<MarketEvent, 'tix_availability' | 'tix_rank'>>;

/** Sold out on tix.is wins over popular; nothing for past or cancelled events. */
export function tixBadgeOf(event: TixFields, now: number = Date.now()): TixBadgeKind | null {
  if (event.status !== 'upcoming') return null;
  const ts = event.starts_at ? Date.parse(event.starts_at) : NaN;
  if (Number.isFinite(ts) && ts < now) return null;
  if (event.tix_availability === 'sold_out') return 'soldOut';
  if (event.tix_rank != null && event.tix_rank <= POPULAR_RANK) return 'popular';
  return null;
}
