import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { useAuth, loginHref } from '../../lib/auth';
import { href } from '../../lib/paths';
import { parseApiError, type ApiErrorCode } from '../../lib/errors';
import { formatNumber, formatTickets } from '../../lib/format';
import { mtKeys, useReserveListing } from '../../lib/queries';
import type { ListingWithSeller } from '../../lib/types';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { RatingStars } from '../common/RatingStars';
import { Money } from '../common/Money';
import { PriceDelta } from '../common/PriceDelta';
import { clampQuantity } from './eventUtils';

export type BuyDialogProps = {
  listing: ListingWithSeller | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `mt_settings.reservation_minutes` (default 30). */
  reservationMinutes?: number;
};

/** Codes that get extra guidance (and a link) inside the dialog, beyond the toast. */
const GUIDED: ReadonlySet<ApiErrorCode> = new Set<ApiErrorCode>([
  'OWN_LISTING',
  'ALREADY_RESERVED',
  'TOO_MANY_RESERVATIONS',
  'NOT_ENOUGH_TICKETS',
]);

/** Quantity selector → total → `mt_reserve_listing` → deal room. */
export function BuyDialog({ listing, open, onOpenChange, reservationMinutes = 30 }: BuyDialogProps) {
  const t = useT();
  const [locale] = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const reserve = useReserveListing();
  const [qty, setQty] = useState(1);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);

  const remaining = listing?.quantity_remaining ?? 0;
  const splitAllowed = listing?.split_allowed ?? true;

  useEffect(() => {
    if (open && listing) {
      setQty(clampQuantity(1, listing));
      setErrorCode(null);
    }
  }, [open, listing]);

  if (!listing) return null;

  const total = qty * listing.asking_price;
  const canDecrease = splitAllowed && qty > 1;
  const canIncrease = splitAllowed && qty < remaining;

  const submit = () => {
    if (!user) {
      onOpenChange(false);
      navigate(loginHref(location.pathname + location.search));
      return;
    }
    setErrorCode(null);
    reserve.mutate(
      { listingId: listing.id, quantity: clampQuantity(qty, listing) },
      {
        onSuccess: (deal) => {
          toast.success(t('event.buy.success'));
          onOpenChange(false);
          navigate(href(`/vidskipti/${deal.id}`));
        },
        onError: (err) => {
          const parsed = parseApiError(err);
          setErrorCode(parsed.code);
          if (parsed.code === 'NOT_ENOUGH_TICKETS' || parsed.code === 'LISTING_NOT_ACTIVE' || parsed.code === 'LISTING_EXPIRED') {
            void qc.invalidateQueries({ queryKey: mtKeys.listings(listing.event_id) });
            void qc.invalidateQueries({ queryKey: mtKeys.event(listing.event_id) });
          }
        },
      },
    );
  };

  const guidance = errorCode ? (GUIDED.has(errorCode) ? t(`event.buy.err.${errorCode}`) : t(`errors.${errorCode}`)) : null;
  const guidanceLink =
    errorCode === 'ALREADY_RESERVED' || errorCode === 'TOO_MANY_RESERVATIONS'
      ? { to: href('/vidskipti'), label: t('event.buy.goToDeals') }
      : errorCode === 'OWN_LISTING'
        ? { to: href('/eg'), label: t('event.buy.goToMyPage') }
        : null;

  return (
    <Dialog open={open} onOpenChange={reserve.isPending ? () => undefined : onOpenChange}>
      <DialogContent className="mt-panel max-w-md rounded-xl bg-card p-5">
        <DialogHeader>
          <DialogTitle className="text-base">{t('event.buy.title')}</DialogTitle>
          <DialogDescription className="text-[13px]">{t('event.buy.description', { minutes: reservationMinutes })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary p-3">
            <UserAvatar profile={listing.seller} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mt-label">{t('event.buy.seller')}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-[13px] font-semibold">{listing.seller.display_name}</span>
                <VerifiedBadge level={listing.seller.verification} />
              </div>
              <RatingStars value={listing.seller.rating_avg} count={listing.seller.rating_count} />
            </div>
            <div className="text-right">
              <div className="mt-label">{t('event.buy.pricePer')}</div>
              <Money amount={listing.asking_price} plain className="text-[14px] font-semibold" />
              <div>
                <PriceDelta asking={listing.asking_price} face={listing.face_value} className="text-[11px]" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mt-buy-qty" className="text-[13px]">
              {t('event.buy.quantity')}{' '}
              <span className="font-normal text-muted-foreground">({t('event.buy.available', { count: formatNumber(remaining, locale) })})</span>
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setQty((q) => clampQuantity(q - 1, listing))}
                disabled={!canDecrease || reserve.isPending}
                aria-label={t('event.buy.decrease')}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Input
                id="mt-buy-qty"
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                step={1}
                value={qty}
                onChange={(e) => setQty(clampQuantity(Number(e.target.value), listing))}
                disabled={!splitAllowed || reserve.isPending}
                className="h-10 w-20 bg-background text-center text-[15px] font-semibold tabular-nums"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setQty((q) => clampQuantity(q + 1, listing))}
                disabled={!canIncrease || reserve.isPending}
                aria-label={t('event.buy.increase')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {!splitAllowed && (
              <p className="text-[12px] text-muted-foreground">{t('event.buy.onlyTogether', { tickets: formatTickets(remaining, locale) })}</p>
            )}
          </div>

          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[13px] text-muted-foreground">
              {t('event.buy.total')} · {formatTickets(qty, locale)}
            </span>
            <Money amount={total} className="text-[22px] font-semibold tracking-[-0.02em]" unitClassName="text-[15px]" />
          </div>
          <p className="text-[12px] text-muted-foreground">{t('event.buy.note')}</p>

          {guidance && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-card p-3 text-[13px]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
              <div className="min-w-0">
                <p>{guidance}</p>
                {guidanceLink && (
                  <Link to={guidanceLink.to} className="mt-1 inline-block underline underline-offset-2" onClick={() => onOpenChange(false)}>
                    {guidanceLink.label}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" className="h-11 rounded-lg sm:h-10" onClick={() => onOpenChange(false)} disabled={reserve.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-11 rounded-lg font-semibold sm:h-10"
            onClick={submit}
            disabled={reserve.isPending || remaining < 1}
          >
            {reserve.isPending ? t('event.buy.submitting') : t('event.buy.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
