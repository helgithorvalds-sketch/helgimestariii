import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatISK, formatNumber } from '../../lib/format';
import type { RequestWithBuyer } from '../../lib/types';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { RatingStars } from '../common/RatingStars';
import { secondaryButtonClass } from '../common/buttonClasses';

export type WantRowProps = {
  request: RequestWithBuyer;
  /** The viewer posted this request – no "Selja til" button. */
  isOwn?: boolean;
  /** Event no longer takes listings. */
  disabled?: boolean;
};

const ROW_BUTTON = 'h-11 min-w-[96px] rounded-lg px-4 text-[14px] font-semibold sm:h-10';

/** One "Óskað eftir" row: buyer · "vantar 2 miða" · "hámark 10.000 kr." · Selja til → sell form. */
export function WantRow({ request, isOwn = false, disabled = false }: WantRowProps) {
  const t = useT();
  const [locale] = useLocale();
  const buyer = request.buyer;

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4" data-testid="want-row">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <UserAvatar profile={buyer} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={href(`/notendur/${buyer.id}`)} className="truncate rounded-sm text-[15px] font-semibold underline-offset-2 hover:underline">
              {buyer.display_name}
            </Link>
            <RatingStars value={buyer.rating_avg} count={buyer.rating_count} />
            <VerifiedBadge level={buyer.verification} />
            {isOwn && <span className="mt-tag">{t('common.you')}</span>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
            <span className="tabular-nums">{t('event.book.wantQty', { count: formatNumber(request.quantity, locale) })}</span>
            {request.notes && (
              <>
                <span aria-hidden="true">·</span>
                <span className="max-w-[260px] truncate" title={request.notes}>
                  {request.notes}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className={cn('text-[15px] tabular-nums', request.max_price != null ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
          {request.max_price != null ? t('event.book.maxPrice', { price: formatISK(request.max_price) }) : t('event.book.noMax')}
        </span>
        {!isOwn &&
          (disabled ? (
            <Button type="button" variant="outline" size="sm" disabled className={cn(ROW_BUTTON, secondaryButtonClass)}>
              {t('event.book.sellTo')}
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className={cn(ROW_BUTTON, secondaryButtonClass)}>
              <Link to={href(`/selja?event=${request.event_id}`)} aria-label={t('event.book.sellToAria', { name: buyer.display_name })}>
                {t('event.book.sellTo')}
              </Link>
            </Button>
          ))}
      </div>
    </li>
  );
}
