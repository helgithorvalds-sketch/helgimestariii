import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarX, SearchX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '../lib/i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { href } from '../lib/paths';
import { useInfiniteMarketEvents } from '../lib/queries';
import { PageContainer } from '../components/layout/PageContainer';
import { EmptyState } from '../components/common/EmptyState';
import { secondaryButtonClass } from '../components/common/buttonClasses';
import { CategoryChips } from '../components/market/CategoryChips';
import { MarketGrid } from '../components/market/MarketGrid';
import { SortMenu } from '../components/market/SortMenu';
import { HOME_PAGE_SIZE, buildHomeParams, parseHomeParams, type HomeParams } from '../components/market/helpers';

const INTRO_KEY = 'midatorg-intro-dismissed';

function readIntroDismissed(): boolean {
  try {
    return window.localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

/** One-line intro shown until the visitor closes it (remembered per browser). */
function Intro() {
  const t = useT();
  const [dismissed, setDismissed] = useState(readIntroDismissed);
  if (dismissed) return null;
  const close = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode: just hide it for this visit */
    }
  };
  return (
    <p className="mt-2 flex items-start gap-2 text-[15px] text-muted-foreground" data-testid="home-intro">
      <span>{t('home.intro')}</span>
      <button
        type="button"
        onClick={close}
        aria-label={t('home.introClose')}
        className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </p>
  );
}

/** Home (spec §5 "/"): title + intro, category pills, sort and the card grid. Search lives in the top bar (`?q=`). */
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

  const isFiltered = !!state.q || !!state.category;
  const showAll = () => update({ q: '', category: null });

  let empty: ReactNode;
  if (state.q) {
    empty = (
      <EmptyState
        icon={SearchX}
        title={t('home.empty.title')}
        body={t('home.empty.searchBody', { q: state.q })}
        action={
          <>
            <Button type="button" size="sm" className="h-10 rounded-lg px-4 text-[14px] font-semibold" onClick={showAll}>
              {t('home.query.clear')}
            </Button>
            <Button asChild variant="outline" size="sm" className={`h-10 rounded-lg px-4 text-[14px] ${secondaryButtonClass}`}>
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
        title={t('home.empty.title')}
        body={t('home.empty.categoryBody')}
        action={
          <Button type="button" size="sm" className="h-10 rounded-lg px-4 text-[14px] font-semibold" onClick={showAll}>
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
          <Button asChild size="sm" className="h-10 rounded-lg px-4 text-[14px] font-semibold">
            <Link to={href('/selja')}>{t('nav.sell')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageContainer className="py-5 sm:py-8">
      <header className="mb-5">
        <h1 id="mt-market-heading" className="text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">
          {t('home.title')}
        </h1>
        <Intro />
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoryChips value={state.category} onChange={(category) => update({ category })} className="min-w-0 flex-1" />
        <SortMenu value={state.sort} onChange={(sort) => update({ sort })} className="shrink-0" />
      </div>

      {state.q && (
        <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground" data-testid="home-query">
          <span>{t('home.query.showing', { q: state.q })}</span>
          <button type="button" onClick={showAll} className="rounded-sm font-medium text-primary underline-offset-2 hover:underline">
            {t('home.query.clear')}
          </button>
        </p>
      )}

      <section aria-labelledby="mt-market-heading">
        <MarketGrid
          events={events}
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
