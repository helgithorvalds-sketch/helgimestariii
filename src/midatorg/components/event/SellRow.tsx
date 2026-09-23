import type { CSSProperties } from 'react';
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
import { askButtonClass } from '../common/buttonClasses';
import { isNewListing } from './eventUtils';

export type SellRowProps = {
  listing: ListingWithSeller;
  /** Cumulative depth 0–100 (tint width). */
  depth: number;
  onBuy: (listing: ListingWithSeller) => void;
  /** The viewer owns this listing – no Kaupa button. */
  isOwn?: boolean;
  /** Event no longer takes reservations. */
  disabled?: boolean;
};

/** One "Til sölu" row: seller · seat · qty · price + delta · Kaupa. Tinted from the left by `depth`. */
export function SellRow({ listing, depth, onBuy, isOwn = false, disabled = false }: SellRowProps) {
  const t = useT();
  const seller = listing.seller;
  const seat = [listing.ticket_type, listing.seat_info].filter(Boolean).join(', ');
  const style = {
    background: `linear-gradient(90deg, hsl(var(--ask) / 0.09) ${depth}%, transparent ${depth}%)`,
  } as CSSProperties;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-ask/[0.04]" style={style} data-testid="sell-row" data-depth={depth}>
      <td className="px-[6px] py-[9px] align-top sm:px-3 sm:py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <UserAvatar profile={seller} size="sm" className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={href(`/notendur/${seller.id}`)}
                className="truncate rounded-sm text-[13px] font-semibold underline-offset-2 hover:underline"
              >
                {seller.display_name}
              </Link>
              <VerifiedBadge level={seller.verification} />
              {isNewListing(listing.created_at) && (
                <span className="inline-flex h-[18px] items-center rounded-[4px] border border-border bg-surface-2 px-1.5 text-[11px] font-semibold text-foreground">
                  {t('common.new')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
              <RatingStars value={seller.rating_avg} count={seller.rating_count} />
              {seat && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{seat}</span>
                </>
              )}
              <span className="hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline">{listing.split_allowed ? t('event.book.splitOk') : t('event.book.splitNo')}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-[6px] py-[9px] align-top text-[13px] tabular-nums sm:px-3 sm:py-2.5">
        {formatTickets(listing.quantity_remaining)}
      </td>
      <td className="px-[6px] py-[9px] text-right align-top sm:px-3 sm:py-2.5">
        <div className="flex flex-col items-end">
          <Money amount={listing.asking_price} plain className="text-[13px] font-semibold" />
          <PriceDelta asking={listing.asking_price} face={listing.face_value} short className="text-[11.5px]" />
        </div>
      </td>
      <td className="px-[6px] py-[9px] text-right align-top sm:px-3 sm:py-2.5">
        {isOwn ? (
          <span className="inline-flex h-[34px] items-center justify-end text-[12px] text-muted-foreground">{t('event.book.own')}</span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onBuy(listing)}
            aria-label={t('event.book.buyAria', { name: seller.display_name })}
            className={cn('h-[34px] w-full px-2 text-[13px] font-semibold', askButtonClass)}
          >
            {t('event.book.buy')}
          </Button>
        )}
      </td>
    </tr>
  );
}
