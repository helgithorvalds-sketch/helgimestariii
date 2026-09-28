import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { href } from '../lib/paths';
import { mtKeys, useMyDeals } from '../lib/queries';
import { formatNumber } from '../lib/format';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageContainer } from '../components/layout/PageContainer';
import { DealCard } from '../components/deals/DealCard';
import { DEALS_TABS, filterDeals, type DealsTab } from '../components/deals/dealState';

function DealsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-panel space-y-3 p-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 bg-secondary" />
              <Skeleton className="h-3 w-1/2 bg-secondary" />
            </div>
            <Skeleton className="h-5 w-16 bg-secondary" />
          </div>
          <Skeleton className="h-6 w-2/5 bg-secondary" />
          <Skeleton className="h-6 w-28 bg-secondary" />
        </div>
      ))}
    </div>
  );
}

/** /vidskipti — my deals as buyer and seller, tabs Virk · Lokið · Öll (spec §5). */
export default function DealsPage() {
  const t = useT();
  useDocumentTitle(t('deals.title'));
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const dealsQ = useMyDeals();
  const [tab, setTab] = useState<DealsTab>('active');

  const all = dealsQ.data ?? [];
  const visible = filterDeals(all, tab);
  const counts: Record<DealsTab, number> = {
    active: filterDeals(all, 'active').length,
    done: filterDeals(all, 'done').length,
    all: all.length,
  };

  const onExpire = useCallback(() => {
    void qc.invalidateQueries({ queryKey: mtKeys.deals });
  }, [qc]);

  let content: React.ReactNode;
  if (dealsQ.isPending) {
    content = <DealsSkeleton />;
  } else if (dealsQ.isError) {
    content = <ErrorState error={dealsQ.error} retry={() => void dealsQ.refetch()} />;
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        icon={ArrowLeftRight}
        title={t(`deals.empty.${tab}.title`)}
        body={t(`deals.empty.${tab}.body`)}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to={href('/')}>{t('deals.empty.action')}</Link>
          </Button>
        }
      />
    );
  } else {
    content = (
      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((deal) => (
          <li key={deal.id} className="min-w-0">
            <DealCard deal={deal} userId={user?.id} isAdmin={isAdmin} onExpire={onExpire} className="h-full" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <PageContainer className="py-6 sm:py-8">
      <header className="mb-4">
        <h1 className="text-lg font-bold tracking-[-0.02em]">{t('deals.title')}</h1>
        <p className="text-[13px] text-muted-foreground">{t('deals.subtitle')}</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as DealsTab)}>
        <TabsList
          aria-label={t('deals.tabs.label')}
          className="flex h-auto w-full justify-start gap-4 rounded-none border-b border-border bg-transparent p-0"
        >
          {DEALS_TABS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-10 rounded-none border-b-2 border-transparent px-1 text-[13px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              {t(`deals.tab.${key}`)}
              {!dealsQ.isPending && !dealsQ.isError && (
                <span className="ml-1.5 tabular-nums text-muted-foreground" data-testid={`tab-count-${key}`}>
                  {formatNumber(counts[key])}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {content}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
