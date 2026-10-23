import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Button, Chip, CreditTag, EmptyState, ErrorState, ProductImage, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatDateYear, formatISK, formatSignedISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useOffer, useProducts } from '../../lib/queries';
import { offerCreditText } from '../lib/labels';
import { BackButton } from '../components/PageHeader';
import { usePageTitle } from '../lib/hooks';

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const offer = useOffer(id);
  const products = useProducts(offer.data?.merchantId);
  usePageTitle(offer.data?.title ?? 'Tilboð');

  if (offer.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="px-4 pt-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
      </div>
    );
  }
  if (offer.error) return <ErrorState message={errorMessage(offer.error)} retry={() => void offer.refetch()} className="m-4" />;
  if (!offer.data) return <EmptyState title="Tilboðið fannst ekki" body="Það er mögulega runnið út." action={<Button variant="secondary" onClick={() => navigate(href(paths.appHome))}>Heim</Button>} />;

  const o = offer.data;
  const credit = offerCreditText(o);
  const included = (products.data ?? []).filter((p) => o.productIds.includes(p.id));

  return (
    <div className="pb-8">
      <div className="relative">
        <ProductImage src={o.image} name={o.title} className="aspect-[16/10] w-full" eager />
        <div className="absolute left-4 top-[max(12px,var(--safe-top))]">
          <BackButton overlay />
        </div>
      </div>
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {o.tag && <Chip tone="mint">{o.tag}</Chip>}
          {credit && <CreditTag>{credit}</CreditTag>}
        </div>
        <h1 className="mt-3 text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{o.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{o.body}</p>
        <p className="mt-3 flex items-center gap-2 text-[14px] text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          {o.validUntil ? <span>Gildir til {formatDateYear(o.validUntil)}</span> : <span>Gildir þar til annað er tilkynnt</span>}
        </p>

        {(products.isPending || included.length > 0) && (
          <section className="mt-6" aria-labelledby="offer-products">
            <h2 id="offer-products" className="text-[19px] font-bold tracking-[-0.02em]">
              Vörur í tilboðinu
            </h2>
            {products.isPending ? (
              <Skeleton className="mt-3 h-32 w-full rounded-2xl" />
            ) : (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                {included.map((p) => (
                  <li key={p.id}>
                    <Link to={href(paths.appProduct(p.id))} className="flex min-h-[60px] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/60 active:bg-secondary">
                      <ProductImage src={p.image} name={p.name} className="h-12 w-12 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold leading-tight">{p.name}</p>
                        <p className="vild-num mt-0.5 text-[13px] text-muted-foreground">{formatISK(p.price)}</p>
                      </div>
                      {p.creditAmount > 0 && <CreditTag size="sm">{formatSignedISK(p.creditAmount)}</CreditTag>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <Button variant="primary" size="lg" full className="mt-7" onClick={() => navigate(href(paths.appPlaces))}>
          Sjá staði
        </Button>
      </div>
    </div>
  );
}
