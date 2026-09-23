import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatTickets } from '../../lib/format';
import type { RequestWithBuyer } from '../../lib/types';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { RatingStars } from '../common/RatingStars';
import { Money } from '../common/Money';
import { bidButtonClass } from '../common/buttonClasses';

export type WantRowProps = {
  request: RequestWithBuyer;
  /** Cumulative depth 0–100 (tint width). */
  depth: number;
  /** The viewer posted this request – no "Selja til" button. */
  isOwn?: boolean;
  /** Event no longer takes listings. */
  disabled?: boolean;
};

/** One "Óskað eftir" row: buyer · qty · max price (or "ekkert hámark") · Selja til → sell form. */
export function WantRow({ request, depth, isOwn = false, disabled = false }: WantRowProps) {
  const t = useT();
  const buyer = request.buyer;
  const style = {
    background: `linear-gradient(90deg, hsl(var(--bid) / 0.09) ${depth}%, transparent ${depth}%)`,
  } as CSSProperties;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bid/[0.04]" style={style} data-testid="want-row" data-depth={depth}>
      <td className="px-[6px] py-[9px] align-top sm:px-3 sm:py-2.5">
        <div className="flex min-w-0 items-start gap-2">
          <UserAvatar profile={buyer} size="sm" className="hidden sm:inline-flex" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link to={href(`/notendur/${buyer.id}`)} className="truncate rounded-sm text-[13px] font-semibold underline-offset-2 hover:underline">
                {buyer.display_name}
              </Link>
              <VerifiedBadge level={buyer.verification} />
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
              <RatingStars value={buyer.rating_avg} count={buyer.rating_count} />
              {request.notes && (
                <>
                  <span className="hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden max-w-[220px] truncate sm:inline" title={request.notes}>
                    {request.notes}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-[6px] py-[9px] align-top text-[13px] tabular-nums sm:px-3 sm:py-2.5">
        {formatTickets(request.quantity)}
      </td>
      <td className="px-[6px] py-[9px] text-right align-top sm:px-3 sm:py-2.5">
        <div className="flex flex-col items-end">
          {request.max_price != null ? (
            <>
              <span className="text-[11px] text-muted-foreground">{t('event.book.max')}</span>
              <Money amount={request.max_price} plain className="text-[13px] font-semibold" />
            </>
          ) : (
            <span className="text-[12px] text-muted-foreground">{t('event.book.noMax')}</span>
          )}
        </div>
      </td>
      <td className="px-[6px] py-[9px] text-right align-top sm:px-3 sm:py-2.5">
        {isOwn ? (
          <span className="inline-flex h-[34px] items-center justify-end text-[12px] text-muted-foreground">{t('common.you')}</span>
        ) : disabled ? (
          <Button type="button" variant="outline" size="sm" disabled className={cn('h-[34px] w-full px-2 text-[13px] font-semibold', bidButtonClass)}>
            {t('event.book.sellTo')}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className={cn('h-[34px] w-full px-2 text-[13px] font-semibold', bidButtonClass)}>
            <Link to={href(`/selja?event=${request.event_id}`)} aria-label={t('event.book.sellToAria', { name: buyer.display_name })}>
              {t('event.book.sellTo')}
            </Link>
          </Button>
        )}
      </td>
    </tr>
  );
}
