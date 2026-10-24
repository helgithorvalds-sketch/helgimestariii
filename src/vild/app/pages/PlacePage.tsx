import { Suspense, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { Button, EmptyState, ErrorState, ProductImage, SectionHeader, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { href, paths } from '../../lib/paths';
import { useLocation, useMerchants, useProducts } from '../../lib/queries';
import { OpenChip, PosChip } from '../components/LocationSheet';
import { BackButton } from '../components/PageHeader';
import { ProductCardSkeleton, ProductGrid } from '../components/ProductCard';
import { directionsUrl } from '../lib/geo';
import { usePageTitle } from '../lib/hooks';

const StaticMap = lazy(() => import('../components/StaticMap'));

export default function PlacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation(id);
  const merchants = useMerchants();
  const merchant = merchants.data?.find((m) => m.id === location.data?.merchantId);
  const products = useProducts(merchant?.id);
  usePageTitle(location.data?.name ?? 'Staður');

  if (location.isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="aspect-[16/10] w-full rounded-none" />
        <div className="px-4 pt-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      </div>
    );
  }
  if (location.error) return <ErrorState message={errorMessage(location.error)} retry={() => void location.refetch()} className="m-4" />;
  if (!location.data) return <EmptyState title="Staðurinn fannst ekki" body="Hann hefur mögulega verið fjarlægður." action={<Button variant="secondary" onClick={() => navigate(href(paths.appPlaces))}>Allir staðir</Button>} />;

  const loc = location.data;
  const withCredit = (products.data ?? []).filter((p) => p.creditAmount > 0).sort((a, b) => b.creditPct - a.creditPct);

  return (
    <div className="pb-8">
      <div className="relative">
        <ProductImage src={merchant?.heroImage ?? null} name={loc.name} className="aspect-[16/10] w-full" eager />
        <div className="absolute left-4 top-[max(12px,var(--safe-top))]">
          <BackButton to={href(paths.appPlaces)} overlay />
        </div>
      </div>

      <div className="px-4 pt-4">
        {merchant && <p className="vild-eyebrow">{merchant.name}</p>}
        <h1 className="mt-1 text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{loc.name}</h1>
        <div className="mt-3 space-y-1.5 text-[15px]">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {loc.address}, {loc.city}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="vild-num">Opið {loc.openingHours}</span>
          </p>
          {loc.phone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="vild-num font-semibold text-[hsl(var(--green-500))]">
                {loc.phone}
              </a>
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <OpenChip location={loc} />
          <PosChip location={loc} />
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <Suspense fallback={<Skeleton className="h-[160px] w-full rounded-none" />}>
            <StaticMap lat={loc.lat} lng={loc.lng} logoText={merchant?.logoText ?? 'V'} className="h-[160px] w-full" />
          </Suspense>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={() => window.open(directionsUrl(loc), '_blank', 'noopener')}>
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Leiðarlýsing
          </Button>
          <Button variant="primary" size="lg" onClick={() => navigate(href(paths.appCard))}>
            Nýta inneign hér
          </Button>
        </div>
      </div>

      <section className="mt-7 px-4">
        <SectionHeader title="Krónur til baka hér" action={merchant ? 'Öll keðjan' : undefined} to={merchant ? href(paths.appMerchant(merchant.slug)) : undefined} />
        <div className="mt-3">
          {products.isPending ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5">
              {[0, 1, 2, 3].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.error ? (
            <ErrorState message={errorMessage(products.error)} retry={() => void products.refetch()} />
          ) : (
            <ProductGrid products={withCredit} />
          )}
        </div>
      </section>
    </div>
  );
}
