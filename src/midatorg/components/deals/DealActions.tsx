import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { formatISK } from '../../lib/format';
import { useTransitionDeal } from '../../lib/queries';
import type { DealStatus, DealWithContext } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { secondaryButtonClass } from '../common/buttonClasses';
import { MAX_REASON_LENGTH, actionSpecs, confirmBodyKey, dealTotal, isTerminal, type DealActionSpec, type DealRole } from './dealState';

type DealActionsProps = {
  deal: DealWithContext;
  /** Effective status (a stale reservation reads as expired). */
  status: DealStatus;
  role: DealRole;
  /** Adds the admin buttons for an admin who is also a party. */
  isAdmin?: boolean;
  className?: string;
};

/**
 * The buttons relevant to this viewer in this state. Every action goes through
 * a plain confirm dialog; cancel / dispute / admin_cancel add a reason textarea.
 * Errors (RESERVATION_EXPIRED, INVALID_TRANSITION, …) are toasted and the deal
 * refetched by `useTransitionDeal`, so the UI always settles on the server's state.
 */
export function DealActions({ deal, status, role, isAdmin = false, className }: DealActionsProps) {
  const t = useT();
  const specs = actionSpecs(status, role, { isAdmin });
  const transition = useTransitionDeal();
  const [pending, setPending] = useState<DealActionSpec | null>(null);
  const [reason, setReason] = useState('');
  const [reasonMissing, setReasonMissing] = useState(false);
  const amount = formatISK(dealTotal(deal));

  const close = () => {
    setPending(null);
    setReason('');
    setReasonMissing(false);
  };

  const confirm = () => {
    if (!pending) return;
    const text = reason.trim();
    if (pending.reasonRequired && !text) {
      setReasonMissing(true);
      return;
    }
    const spec = pending;
    transition.mutate(
      { dealId: deal.id, action: spec.action, reason: spec.needsReason && text ? text : null },
      {
        onSuccess: () => {
          toast.success(t(`deals.toast.${spec.action}`));
          close();
        },
        // the hook already toasted the translated error and refetched the deal
        onError: () => close(),
      },
    );
  };

  if (specs.length === 0) {
    if (isTerminal(status) || status === 'completed' || role === 'admin' || role === 'none') return null;
    return (
      <p className={cn('text-[13px] text-muted-foreground', className)} role="status">
        {t('deals.actions.waiting')}
      </p>
    );
  }

  return (
    <section className={cn('mt-panel p-[14px]', className)} aria-labelledby="mt-deal-actions-title">
      <h2 id="mt-deal-actions-title" className="mb-3 text-[16px] font-semibold">
        {t('deals.actions.title')}
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {specs.map((spec) => (
          <Button
            key={spec.action}
            type="button"
            variant={spec.tone === 'primary' ? 'default' : 'outline'}
            className={cn(
              'h-10 text-[13px] font-semibold sm:h-9',
              spec.tone !== 'primary' && secondaryButtonClass,
              spec.tone === 'destructive' && 'hover:border-destructive/60 hover:text-down',
            )}
            disabled={transition.isPending}
            onClick={() => setPending(spec)}
            data-action={spec.action}
          >
            {transition.isPending && transition.variables?.action === spec.action ? t('deals.action.working') : t(`deals.action.${spec.action}`)}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={pending ? t(`deals.confirm.${pending.action}.title`) : undefined}
        description={pending ? t(confirmBodyKey(pending.action, status), { amount }) : undefined}
        confirmLabel={pending ? t(`deals.confirm.${pending.action}.confirm`) : undefined}
        cancelLabel={t('deals.confirm.back')}
        destructive={pending?.tone === 'destructive'}
        loading={transition.isPending}
        onConfirm={confirm}
      >
        {pending?.needsReason && (
          <div className="space-y-1.5">
            <Label htmlFor="mt-deal-reason">
              {t('deals.reason.label')}
              {!pending.reasonRequired && <span className="font-normal text-muted-foreground"> ({t('common.optional')})</span>}
            </Label>
            <Textarea
              id="mt-deal-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value.slice(0, MAX_REASON_LENGTH));
                if (reasonMissing) setReasonMissing(false);
              }}
              placeholder={pending.reasonRequired ? t('deals.reason.placeholderRequired') : t('deals.reason.placeholder')}
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              required={pending.reasonRequired}
              aria-invalid={reasonMissing || undefined}
              aria-describedby={reasonMissing ? 'mt-deal-reason-error' : undefined}
              className={cn('bg-background text-[13px]', reasonMissing && 'border-destructive')}
            />
            {reasonMissing && (
              <p id="mt-deal-reason-error" className="text-[12px] text-down">
                {t('deals.reason.required')}
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
