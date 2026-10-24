import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { CATEGORY_LABELS } from '../../data/seed';
import { Button, ChipButton, EmptyState, ErrorState, SectionHeader, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useLocations, useMerchant, useOffers, useProducts } from '../../lib/queries';
import type { ProductCategory } from '../../lib/types';
import { MerchantMark } from '../components/MerchantMark';
import { OfferCard } from '../components/OfferCard';
import { PageHeader } from '../components/PageHeader';
import { ProductCardSkeleton, ProductGrid } from '../components/ProductCard';
import { openStatusText } from '../lib/geo';
import { usePageTitle, usePocketViews } from '../lib/hooks';

const CATEGORY_ORDER: ProductCategory[] = ['pizza', 'burger', 'salad', 'side', 'drink', 'dessert', 'coffee', 'other'];

export default function MerchantPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const merchant = useMerchant(slug);
  const m = merchant.data ?? undefined;
  const products = useProducts(m?.id);
  const offers = useOffers(m?.id);
  const locations = useLocations(m?.id);
  const pockets = usePocketViews();
  const pocket = pockets.views.find((v) => v.merchant.id === m?.id);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  usePageTitle(m?.name ?? 'Keðja');

  const categories = useMemo(() => {
    const present = new Set((products.data ?? []).map((p) => p.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [products.data]);

  const shown = useMemo(() => {
    const list = (products.data ?? []).filter((p) => category === 'all' || p.category === category);
    return list.sort((a, b) => b.creditPct - a.creditPct || a.price - b.price);
  }, [products.data, category]);

  if (merchant.isPending) {
    return (
      <div aria-busy="true">
        <PageHeader />
        <div className="px-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="mt-3 h-8 w-1/2" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-4 h-24 w-full rounded-[22px]" />
        </div>
      </div>
    );
  }
  if (merchant.error) return <ErrorState message={errorMessage(merchant.error)} retry={() => void merchant.refetch()} className="m-4" />;
  if (!m) return <EmptyState title="Keðjan fannst ekki" action={<Button variant="secondary" onClick={() => navigate(href(paths.appHome))}>Heim</Button>} />;

  return (
    <div className="pb-8">
      <PageHeader backTo={href(paths.appHome)} />
      <div className="px-4">
        <div className="flex items-center gap-4">
          <MerchantMark merchant={m} size={56} />
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{m.name}</h1>
            <p className="vild-num mt-0.5 text-[13px] font-medium text-muted-foreground">Grunninneign {m.defaultRatePct}% af hverjum kaupum</p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{m.description}</p>

        <div className="mt-4 flex items-center gap-4 rounded-[22px] bg-[hsl(var(--mint-300))] px-5 py-4 text-[hsl(var(--green-700))]">
          <div className="min-w-0 flex-1">
            <p className="vild-eyebrow">{pocket ? `${pocket.label} · inneignin þín` : 'Inneignin þín hér'}</p>
            <div className="vild-num mt-1 text-[32px] font-extrabold leading-none tracking-[-0.03em]" aria-live="polite">
              {pockets.isPending ? <Skeleton className="inline-block h-8 w-28 bg-white/60 align-middle" /> : formatISK(pocket?.pocket.balance ?? 0)}
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate(href(paths.appCard))}>
            Nýta inneign
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 mt-5 border-b border-border bg-white/95 backdrop-blur-[2px]">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5" role="group" aria-label="Flokkar">
          <ChipButton selected={category === 'all'} onClick={() => setCategory('all')}>
            Allt
          </ChipButton>
          {categories.map((c) => (
            <ChipButton key={c} selected={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_LABELS[c]}
            </ChipButton>
          ))}
        </div>
      </div>

      <section className="px-4 pt-4" aria-label="Vörur">
        {products.isPending ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.error ? (
          <ErrorState message={errorMessage(products.error)} retry={() => void products.refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState title="Engar vörur í þessum flokki" body="Veldu annan flokk." />
        ) : (
          <ProductGrid products={shown} />
        )}
      </section>

      {(offers.data?.length ?? 0) > 0 && (
        <section className="mt-8 px-4">
          <SectionHeader title="Tilboð" />
          <div className="mt-3 space-y-3">
            {offers.data!.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 px-4">
        <SectionHeader title="Staðir" action="Á korti" to={href(paths.appPlaces)} />
        <div className="mt-3">
          {locations.isPending ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : locations.error ? (
            <ErrorState message={errorMessage(locations.error)} retry={() => void locations.refetch()} />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
              {(locations.data ?? []).map((l) => (
                <li key={l.id}>
                  <Link to={href(paths.appPlace(l.id))} className="flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold leading-tight">{l.name}</p>
                      <p className="vild-num mt-0.5 truncate text-[13px] text-muted-foreground">
                        {l.address} · {openStatusText(l.openingHours)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
