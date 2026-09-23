import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { formatISK } from '../../lib/format';
import type { DealStatus, DealWithContext } from '../../lib/types';
import { dealTotal, guidanceKey, secondaryGuidanceKey, type DealRole } from './dealState';

type DealGuidanceProps = {
  deal: DealWithContext;
  /** Effective status (a stale reservation reads as expired). */
  status: DealStatus;
  role: DealRole;
  className?: string;
};

function iconFor(status: DealStatus): { Icon: LucideIcon; className: string } {
  switch (status) {
    case 'completed':
      return { Icon: CheckCircle2, className: 'text-up' };
    case 'cancelled':
    case 'expired':
      return { Icon: XCircle, className: 'text-muted-foreground' };
    case 'disputed':
      return { Icon: AlertTriangle, className: 'text-down' };
    default:
      return { Icon: Info, className: 'text-verified' };
  }
}

/** One plain sentence for the current state and role (spec §4), plus the reason / who cancelled when relevant. */
export function DealGuidance({ deal, status, role, className }: DealGuidanceProps) {
  const t = useT();
  const amount = formatISK(dealTotal(deal));
  const key = guidanceKey(status, role);
  const secondary = secondaryGuidanceKey(status, role);
  const { Icon, className: iconClass } = iconFor(status);

  let cancelledBy: string | null = null;
  if (status === 'cancelled' && deal.cancelled_by) {
    if (deal.cancelled_by === deal.buyer.id) cancelledBy = deal.buyer.display_name;
    else if (deal.cancelled_by === deal.seller.id) cancelledBy = deal.seller.display_name;
    else cancelledBy = t('deals.chat.admin');
  }
  const showReason = (status === 'cancelled' || status === 'disputed') && !!deal.cancel_reason;

  return (
    <div
      className={cn('flex items-start gap-3 rounded-lg border border-border bg-surface-2/60 p-3 text-[13px]', className)}
      role="status"
      aria-live="polite"
      data-guidance={key}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">{t(key, { amount })}</p>
        {cancelledBy && <p className="text-muted-foreground">{t('deals.guidance.cancelledBy', { name: cancelledBy })}</p>}
        {showReason && <p className="text-muted-foreground">{t('deals.guidance.reason', { reason: deal.cancel_reason })}</p>}
        {secondary && <p className="text-muted-foreground">{t(secondary)}</p>}
      </div>
    </div>
  );
}
