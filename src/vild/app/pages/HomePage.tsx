import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MapPin, X } from 'lucide-react';
import { CoinMark } from '../../components/brand';
import { Chip, ErrorState, SectionHeader, Skeleton } from '../../components/kit';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../data';
import { fadeUp, staggerParent } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { useLocations, useMerchants, useOffers, useProducts, useProfile, useSectors } from '../../lib/queries';
import type { Location } from '../../lib/types';
import { BalanceCard, BalanceCardSkeleton } from '../components/BalanceCard';
import { OfferCard, OfferCardSkeleton } from '../components/OfferCard';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { OpenChip } from '../components/LocationSheet';
import { formatDistance, openStatusText, sortByDistance } from '../lib/geo';
import { useGeolocation, usePageTitle, usePocketViews } from '../lib/hooks';
import { KEYS, readLocal, writeLocal } from '../lib/storage';

const FALLBACK_LOCATION_ID = 'l_laugavegur';

function HowItWorks({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.section variants={fadeUp} className="relative rounded-2xl border border-border bg-white p-4" aria-label="Svona virkar VILD">
      <button type="button" onClick={onDismiss} aria-label="Loka" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="pr-8 text-[16px] font-bold tracking-[-0.01em]">Svona virkar VILD</p>
      <ol className="mt-2 space-y-1.5 text-[14px] text-muted-foreground">
        {['Þú borgar fullt verð hjá Lúnu.', 'Hluti kemur strax til baka sem inneign.', 'Þú nýtir inneignina næst, á sama stað.'].map((line, i) => (
          <li key={line} className="flex gap-2.5">
            <span className="vild-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--mint-100))] text-[11px] font-bold text-[hsl(var(--green-700))]" aria-hidden="true">
              {i + 1}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}

function NearestPlace({ location, distance }: { location: Location; distance: number | null }) {
  return (
    <Link to={href(paths.appPlace(location.id))} className="block rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-secondary/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold tracking-[-0.01em]">{location.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {location.address}
              {distance != null && <span className="vild-num"> · {formatDistance(distance)}</span>}
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="vild-num">{openStatusText(location.openingHours)}</span>
          </p>
        </div>
        <OpenChip location={location} />
      </div>
      <span className="mt-3 inline-flex text-[14px] font-semibold text-[hsl(var(--green-500))]">Sjá á korti</span>
    </Link>
  );
}

export default function HomePage() {
  usePageTitle('Heim');
  const { profile: authProfile } = useAuth();
  const profile = useProfile();
  const pockets = usePocketViews();
  const merchants = useMerchants();
  const sectors = useSectors();
  const live = merchants.data?.find((m) => m.status === 'active') ?? merchants.data?.[0];
  const products = useProducts(live?.id);
  const offers = useOffers(live?.id);
  const locations = useLocations(live?.id);
  const geo = useGeolocation();
  const [howTo, setHowTo] = useState(() => readLocal(KEYS.howToDismissed) !== '1');

  const firstName = (profile.data?.name ?? authProfile?.name ?? '').split(' ')[0];

  const todays = useMemo(() => {
    const list = (products.data ?? []).filter((p) => p.creditAmount > 0);
    return list.sort((a, b) => Number(b.featured) - Number(a.featured) || b.creditPct - a.creditPct || b.creditAmount - a.creditAmount).slice(0, 8);
  }, [products.data]);

  const nearest = useMemo(() => {
    const list = locations.data ?? [];
    if (!list.length) return null;
    if (geo.position) {
      const [first] = sortByDistance(list, geo.position);
      return { location: first, distance: first.distance as number | null };
    }
    return { location: list.find((l) => l.id === FALLBACK_LOCATION_ID) ?? list[0], distance: null };
  }, [locations.data, geo.position]);

  const coming = (sectors.data ?? []).filter((s) => s.status === 'coming');

  const dismissHowTo = () => {
    setHowTo(false);
    writeLocal(KEYS.howToDismissed, '1');
  };

  return (
    <div className="pb-6">
      <header className="flex items-center justify-between px-4 pt-[max(16px,var(--safe-top))]">
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{firstName ? `Hæ ${firstName}` : 'Hæ'}</h1>
        <CoinMark size={36} title="VILD" />
      </header>

      <motion.div variants={staggerParent(0.05)} initial="hidden" animate="show" className="mt-4 space-y-5 px-4">
        {pockets.isPending ? (
          <BalanceCardSkeleton />
        ) : pockets.error ? (
          <ErrorState message={errorMessage(pockets.error)} retry={pockets.refetch} />
        ) : (
          <motion.div variants={fadeUp}>
            <BalanceCard total={pockets.total} earnedTotal={pockets.earnedTotal} pockets={pockets.views} />
          </motion.div>
        )}

        {howTo && <HowItWorks onDismiss={dismissHowTo} />}

        <motion.section variants={fadeUp} aria-labelledby="home-today">
          <SectionHeader title="Krónur til baka í dag" action="Sjá allt" to={live ? href(paths.appMerchant(live.slug)) : undefined} />
          <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {products.isPending ? (
              [0, 1, 2].map((i) => <ProductCardSkeleton key={i} variant="carousel" />)
            ) : products.error ? (
              <ErrorState message={errorMessage(products.error)} retry={() => void products.refetch()} className="w-full" />
            ) : (
              todays.map((p, i) => <ProductCard key={p.id} product={p} variant="carousel" eager={i < 3} />)
            )}
          </div>
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionHeader title="Tilboð" />
          <div className="mt-3 space-y-3">
            {offers.isPending ? [0, 1].map((i) => <OfferCardSkeleton key={i} />) : offers.error ? <ErrorState message={errorMessage(offers.error)} retry={() => void offers.refetch()} /> : (offers.data ?? []).slice(0, 3).map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        </motion.section>

        <motion.section variants={fadeUp}>
          <SectionHeader title="Næsti staður" action="Allir staðir" to={href(paths.appPlaces)} />
          <div className="mt-3">
            {locations.isPending ? <Skeleton className="h-[118px] w-full rounded-2xl" /> : locations.error ? <ErrorState message={errorMessage(locations.error)} retry={() => void locations.refetch()} /> : nearest ? <NearestPlace location={nearest.location} distance={nearest.distance} /> : null}
          </div>
        </motion.section>

        {coming.length > 0 && (
          <motion.section variants={fadeUp}>
            <SectionHeader title="Væntanlegt" />
            <p className="mt-1 text-[14px] text-muted-foreground">Fleiri vasar eru á leiðinni. Hver keðja fær sinn.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coming.map((s) => (
                <Chip key={s.slug} tone="outline" className="h-8 px-3 text-[13px] font-medium text-muted-foreground">
                  {s.pocketName}
                </Chip>
              ))}
            </div>
          </motion.section>
        )}

      </motion.div>
    </div>
  );
}
