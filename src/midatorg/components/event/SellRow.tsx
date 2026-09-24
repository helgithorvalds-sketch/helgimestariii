import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatTickets } from '../../lib/format';
import type { ListingWithSeller } from '../../lib/types';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { RatingStars } from '../common/RatingStars';
import { PriceDelta } from '../common/PriceDelta';
import { Money } from '../common/Money';
import { secondaryButtonClass } from '../common/buttonClasses';
import { isNewListing } from './eventUtils';

export type SellRowProps = {
  listing: ListingWithSeller;
  onBuy: (listing: ListingWithSeller) => void;
  /** The viewer owns these tickets – "Skoða" instead of "Kaupa". */
  isOwn?: boolean;
  /** Event no longer takes reservations. */
  disabled?: boolean;
};

const ROW_BUTTON = 'h-11 min-w-[96px] rounded-lg px-4 text-[14px] font-semibold sm:h-10';

/** One "Miðar til sölu" row: seller · "2 miðar · Svalir A" · price per ticket + delta · Kaupa. */
export function SellRow({ listing, onBuy, isOwn = false, disabled = false }: SellRowProps) {
  const t = useT();
  const seller = listing.seller;
  const seat = [listing.ticket_type, listing.seat_info].filter(Boolean).join(', ');

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4" data-testid="sell-row">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <UserAvatar profile={seller} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={href(`/notendur/${seller.id}`)} className="truncate rounded-sm text-[15px] font-semibold underline-offset-2 hover:underline">
              {seller.display_name}
            </Link>
            <RatingStars value={seller.rating_avg} count={seller.rating_count} />
            <VerifiedBadge level={seller.verification} />
            {isOwn && <span className="mt-tag">{t('event.book.own')}</span>}
            {!isOwn && isNewListing(listing.created_at) && <span className="mt-tag bg-accent text-accent-foreground">{t('common.new')}</span>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
            <span className="tabular-nums">{formatTickets(listing.quantity_remaining)}</span>
            {seat && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{seat}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{listing.split_allowed ? t('event.book.splitOk') : t('event.book.splitNo')}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="flex flex-col sm:items-end">
          <p className="text-[16px] font-semibold leading-tight">
            <Money amount={listing.asking_price} plain className="text-foreground" />{' '}
            <span className="text-[13px] font-normal text-muted-foreground">{t('event.book.perTicket')}</span>
          </p>
          <PriceDelta asking={listing.asking_price} face={listing.face_value} short />
        </div>
        {isOwn ? (
          <Button asChild variant="outline" size="sm" className={cn(ROW_BUTTON, secondaryButtonClass)}>
            <Link to={href('/eg?flipi=solur')} aria-label={t('event.book.viewAria')}>
              {t('event.book.view')}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onBuy(listing)}
            aria-label={t('event.book.buyAria', { name: seller.display_name })}
            className={ROW_BUTTON}
          >
            {t('event.book.buy')}
          </Button>
        )}
      </div>
    </li>
  );
}
