import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { MarketEvent } from '../../lib/types';
import { ErrorState } from '../common/ErrorState';
import { secondaryButtonClass } from '../common/buttonClasses';
import { MarketCard, MarketCardSkeleton } from './MarketCard';

export type MarketGridProps = {
  events: MarketEvent[];
  /** `{ [eventId]: min_ask series }` from `useSparklines`. */
  sparklines?: Record<string, number[]>;
  /** First load: skeleton cards. */
  isLoading?: boolean;
  /** A refetch for new filters is in flight while old data is still shown. */
  isStale?: boolean;
  error?: unknown;
  onRetry?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  /** Rendered instead of the grid when there is nothing to show. */
  empty?: ReactNode;
  skeletonCount?: number;
  className?: string;
};

/** 4 → 3 (≤1240) → 2 (≤900) → 1 (≤640) columns, 12px gap. */
const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 min-[901px]:grid-cols-3 min-[1241px]:grid-cols-4';

export function MarketGrid({
  events,
  sparklines,
  isLoading = false,
  isStale = false,
  error,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  empty,
  skeletonCount = 8,
  className,
}: MarketGridProps) {
  const t = useT();

  if (isLoading) {
    return (
      <div className={cn(GRID, className)} aria-busy="true" aria-live="polite" data-testid="market-grid-loading">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error !== undefined && error !== null && events.length === 0) {
    return <ErrorState error={error} retry={onRetry} className={className} />;
  }

  if (events.length === 0) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className={cn(GRID, isStale && 'opacity-70')} aria-busy={isStale || undefined} data-testid="market-grid">
        {events.map((event) => (
          <MarketCard key={event.id} event={event} sparkline={sparklines?.[event.id]} />
        ))}
      </div>

      {error !== undefined && error !== null && (
        <ErrorState error={error} body={t('home.loadMoreError')} retry={onLoadMore ?? onRetry} />
      )}

      {hasMore && onLoadMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className={cn(secondaryButtonClass, 'h-10 min-w-[160px] text-[13px] font-semibold')}
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? t('home.loadingMore') : t('common.showMore')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MarketGrid;
