import { useReducer } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { href } from '../../lib/paths';
import { formatDateTime, formatISK, formatTickets, formatTime } from '../../lib/format';
import type { DealWithContext } from '../../lib/types';
import { Countdown } from '../common/Countdown';
import { Money } from '../common/Money';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { DealStatusBadge } from './DealStepper';
import { counterpartOf, dealTotal, effectiveStatus, roleFor } from './dealState';

type DealCardProps = {
  deal: DealWithContext;
  userId: string | null | undefined;
  isAdmin?: boolean;
  /** Called when the live reservation timer reaches zero (the list refetches). */
  onExpire?: () => void;
  className?: string;
};

/**
 * One deal in the list: event title/date, counterpart, quantity × price = total,
 * status badge, a live countdown while reserved. The whole card is the link.
 */
export function DealCard({ deal, userId, isAdmin = false, onExpire, className }: DealCardProps) {
  const t = useT();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const role = roleFor(deal, userId, isAdmin);
  const status = effectiveStatus(deal);
  const other = counterpartOf(deal, role);
  const total = dealTotal(deal);
  const roleLabel = role === 'buyer' ? t('deals.role.buying') : role === 'seller' ? t('deals.role.selling') : t('deals.role.admin');
  const venue = deal.event.venue_name;

  return (
    <article className={cn('mt-panel min-w-0 transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-md', className)} data-status={status} data-deal-id={deal.id}>
      <Link
        to={href(`/vidskipti/${deal.id}`)}
        className="flex h-full flex-col gap-3 rounded-xl p-4"
        aria-label={t('deals.card.aria', { title: deal.event.title })}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-sm font-semibold leading-[1.3]">{deal.event.title}</h2>
            <p className="truncate text-[12px] tabular-nums text-muted-foreground">
              {formatDateTime(deal.event.starts_at)}
              {venue ? ` · ${venue}` : ''}
            </p>
          </div>
          <DealStatusBadge status={status} />
        </div>

        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="shrink-0 text-muted-foreground">{roleLabel}</span>
          {other && (
            <>
              <UserAvatar profile={other} size={24} />
              <span className="truncate font-medium">{other.display_name}</span>
              <VerifiedBadge level={other.verification} />
            </>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3">
          <p className="text-[13px] tabular-nums text-muted-foreground">
            {t('deals.amount.formula', { quantity: formatTickets(deal.quantity), price: formatISK(deal.price_per_ticket) })}
          </p>
          <Money amount={total} className="text-[20px] font-semibold leading-none tracking-[-0.02em]" unitClassName="text-[13px]" />
        </div>

        {status === 'reserved' ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('countdown.reservedUntil', { time: formatTime(deal.reserved_until) })}</span>
            <span aria-hidden="true">·</span>
            <Countdown
              until={deal.reserved_until}
              className="font-semibold text-foreground"
              onExpire={() => {
                bump();
                onExpire?.();
              }}
            />
          </p>
        ) : null}

        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground underline underline-offset-4">
          {t('deals.card.open')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}
