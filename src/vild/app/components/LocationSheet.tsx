import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Navigation } from 'lucide-react';
import { Button, Chip, Sheet } from '../../components/kit';
import { href, paths } from '../../lib/paths';
import type { Location, Merchant } from '../../lib/types';
import { directionsUrl, formatDistance, isOpenNow, openStatusText } from '../lib/geo';
import { MerchantMark } from './MerchantMark';

export function PosChip({ location }: { location: Location }) {
  const live = location.acceptsRedemption && location.posStatus === 'connected';
  return <Chip tone={live ? 'mint' : 'outline'}>{live ? 'Inneign virk' : 'Söfnun væntanleg'}</Chip>;
}

export function OpenChip({ location }: { location: Location }) {
  const open = isOpenNow(location.openingHours);
  if (open == null) return null;
  return <Chip tone={open ? 'green' : 'neutral'}>{open ? 'Opið núna' : 'Lokað'}</Chip>;
}

/** Bottom sheet for a tapped pin: name, address, hours, status, two actions. */
export function LocationSheet({ location, merchant, distance, onClose }: { location: Location | null; merchant: Merchant | undefined; distance?: number; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Sheet open={Boolean(location)} onClose={onClose} title={location?.name}>
      {location && (
        <div className="pb-2">
          <div className="flex items-start gap-3">
            {merchant && <MerchantMark merchant={merchant} size={44} />}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[15px]">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">
                  {location.address}, {location.city}
                </span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[15px]">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="vild-num">{openStatusText(location.openingHours)}</span>
                <span className="text-muted-foreground">· {location.openingHours}</span>
              </p>
              {distance != null && <p className="mt-1 text-[13px] text-muted-foreground">{formatDistance(distance)} frá þér</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <OpenChip location={location} />
            <PosChip location={location} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => window.open(directionsUrl(location), '_blank', 'noopener')}>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Leiðarlýsing
            </Button>
            <Button variant="primary" size="lg" onClick={() => navigate(href(paths.appPlace(location.id)))}>
              Skoða stað
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
