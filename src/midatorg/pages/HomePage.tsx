import { useCallback, useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarX, SearchX, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale, useT } from '../lib/i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { href } from '../lib/paths';
import { useInfiniteMarketEvents, useMarketEvents } from '../lib/queries';
import { formatNumber } from '../lib/format';
import type { MarketEvent } from '../lib/types';
import { PageContainer } from '../components/layout/PageContainer';
import { EmptyState } from '../components/common/EmptyState';
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { CategoryChips } from '../components/market/CategoryChips';
import { MarketGrid } from '../components/market/MarketGrid';
import { SearchField } from '../components/market/SearchField';
import { SortMenu } from '../components/market/SortMenu';
import { TrendingStrip } from '../components/market/TrendingStrip';
import { useSparklines } from '../components/market/sparklines';
import {
  HOME_PAGE_SIZE,
  TRENDING_FETCH_LIMIT,
  buildHomeParams,
  parseHomeParams,
  pluralSuffix,
  summarise,
  type HomeParams,
} from '../components/market/helpers';

/** "{n} viðburðir · {t} miðar til sölu · {w} vilja kaupa" over the loaded events. */
function Summary({ events, partial }: { events: MarketEvent[]; partial: boolean }) {
  const t = useT();
  const [locale] = useLocale();
  const s = summarise(events);
  const eventsKey = partial ? 'home.summary.showing' : 'home.summary.events';
  return (
    <span className="text-[12.5px] tabular-nums text-muted-foreground" data-testid="market-summary">
      {t(`${eventsKey}${pluralSuffix(s.events, locale)}`, { count: formatNumber(s.events, locale) })}
      <span aria-hidden="true"> · </span>
      {t(`home.summary.forSale${pluralSuffix(s.tickets, locale)}`, { count: formatNumber(s.tickets, locale) })}
      <span aria-hidden="true"> · </span>
      {t('home.summary.wanted', { count: formatNumber(s.wanted, locale) })}
    </span>
  );
}

/** Market home (spec §5 "/"): search, chips, sort, trending strip and the card grid. */
export default function HomePage() {
  const t = useT();
  useDocumentTitle(t('title.home'));

  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseHomeParams(params), [params]);
  const update = useCallback(
    (patch: Partial<HomeParams>) => {
      setParams(buildHomeParams({ ...state, ...patch }), { replace: true });
    },
    [state, setParams],
  );

  const list = useInfiniteMarketEvents({
    q: state.q || undefined,
    category: state.category ?? undefined,
    sort: state.sort,
    limit: HOME_PAGE_SIZE,
  });
  const events = useMemo(() => list.data?.pages.flat() ?? [], [list.data]);

  const trending = useMarketEvents({ sort: 'demand', limit: TRENDING_FETCH_LIMIT }, { enabled: !state.q });

  const ids = useMemo(() => events.map((e) => e.id), [events]);
  const sparklines = useSparklines(ids);

  const isFiltered = !!state.q || !!state.category;
  const showAll = () => update({ q: '', category: null });

  let empty: ReactNode;
  if (state.q) {
    empty = (
      <EmptyState
        icon={SearchX}
        title={t('home.empty.search', { q: state.q })}
        body={t('home.empty.searchBody')}
        action={
          <>
            <Button type="button" variant="ghost" size="sm" onClick={showAll}>
              {t('common.showAll')}
            </Button>
            <Button asChild variant="outline" size="sm" className={secondaryButtonClass}>
              <Link to={href('/um#samband')}>{t('home.empty.requestEvent')}</Link>
            </Button>
          </>
        }
      />
    );
  } else if (state.category) {
    empty = (
      <EmptyState
        icon={CalendarX}
        title={t('home.empty.category')}
        body={t('home.empty.categoryBody')}
        action={
          <Button type="button" variant="ghost" size="sm" onClick={showAll}>
            {t('common.showAll')}
          </Button>
        }
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={CalendarX}
        title={t('home.empty.all')}
        body={t('home.empty.allBody')}
        action={
          <Button asChild size="sm">
            <Link to={href('/selja')}>{t('nav.sell')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageContainer className="py-4 sm:py-5">
      {/* filters */}
      <div className="flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
        <SearchField value={state.q} onChange={(q) => update({ q })} className="sm:w-[280px] sm:shrink-0" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <CategoryChips value={state.category} onChange={(category) => update({ category })} className="min-w-0 flex-1" />
          <SortMenu value={state.sort} onChange={(sort) => update({ sort })} className="shrink-0" />
        </div>
      </div>

      {/* trending: global, hidden while searching */}
      {!state.q && trending.data && <TrendingStrip events={trending.data} className="mt-4" />}

      {/* market */}
      <section aria-labelledby="mt-market-heading" className="mt-5">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 id="mt-market-heading" className="text-[18px] font-bold tracking-[-0.02em]">
            {t('home.title')}
          </h1>
          {!list.isPending && !list.isError && events.length > 0 && (
            <Summary events={events} partial={!!list.hasNextPage} />
          )}
          <p className="flex basis-full items-center gap-1.5 text-[12px] text-muted-foreground min-[901px]:ml-auto min-[901px]:basis-auto">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-verified" aria-hidden="true" />
            {t('common.tagline')}
          </p>
        </div>

        <MarketGrid
          events={events}
          sparklines={sparklines.data}
          isLoading={list.isPending}
          isStale={list.isPlaceholderData}
          error={list.error}
          onRetry={() => void list.refetch()}
          hasMore={!!list.hasNextPage}
          isLoadingMore={list.isFetchingNextPage}
          onLoadMore={() => void list.fetchNextPage()}
          empty={empty}
          skeletonCount={isFiltered ? 4 : 8}
        />
      </section>
    </PageContainer>
  );
}
