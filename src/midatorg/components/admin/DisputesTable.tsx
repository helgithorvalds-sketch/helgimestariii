import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Check, Scale, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime, formatISK, formatRelative } from '../../lib/format';
import { href } from '../../lib/paths';
import { useDisputes, useTransitionDeal } from '../../lib/queries';
import type { DealWithContext, PublicProfile } from '../../lib/types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { UserAvatar } from '../common/UserAvatar';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { RowsSkeleton, tdClass, thClass } from './AdminBits';
import { dealAmount } from './adminUtils';

type Pending = { deal: DealWithContext; action: 'admin_complete' | 'admin_cancel' };

function Party({ profile, role }: { profile: PublicProfile; role: string }) {
  return (
    <Link to={href('/notendur/' + profile.id)} className="flex min-w-0 items-center gap-2 underline-offset-2 hover:underline">
      <UserAvatar profile={profile} size={26} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{profile.display_name}</span>
          <VerifiedBadge level={profile.verification} />
        </span>
        <span className="block text-[11px] text-muted-foreground">{role}</span>
      </span>
    </Link>
  );
}

/** Disputes tab: disputed deals with parties, amount, reason, deal-room link and admin_complete / admin_cancel. */
export function DisputesTable() {
  const t = useT();
  const [locale] = useLocale();
  const disputes = useDisputes();
  const transition = useTransitionDeal();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reason, setReason] = useState('');

  const open = (deal: DealWithContext, action: Pending['action']) => {
    setReason('');
    setPending({ deal, action });
  };

  const confirm = () => {
    if (!pending) return;
    const { deal, action } = pending;
    transition.mutate(
      { dealId: deal.id, action, reason: action === 'admin_cancel' ? reason.trim() || null : null },
      {
        onSuccess: () => {
          toast.success(t(action === 'admin_complete' ? 'admin.disputes.completedToast' : 'admin.disputes.cancelledToast'));
          setPending(null);
        },
      },
    );
  };

  return (
    <section className="space-y-3" aria-label={t('admin.tab.disputes')}>
      {disputes.data && <p className="text-[12px] tabular-nums text-muted-foreground">{t('admin.count', { count: disputes.data.length })}</p>}

      {disputes.isPending ? (
        <RowsSkeleton rows={3} />
      ) : disputes.isError ? (
        <ErrorState error={disputes.error} retry={() => void disputes.refetch()} />
      ) : disputes.data.length === 0 ? (
        <EmptyState icon={Scale} title={t('admin.disputes.empty')} body={t('admin.disputes.emptyBody')} />
      ) : (
        <div className="mt-panel overflow-hidden">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className={thClass}>{t('admin.disputes.col.event')}</TableHead>
                <TableHead className={thClass}>{t('admin.disputes.col.parties')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.disputes.col.amount')}</TableHead>
                <TableHead className={thClass}>{t('admin.disputes.col.reason')}</TableHead>
                <TableHead className={cn(thClass, 'text-right')}>{t('admin.disputes.col.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.data.map((d) => (
                <TableRow key={d.id} className="border-border align-top even:bg-secondary/50 hover:bg-accent/50" data-testid="dispute-row">
                  <TableCell className={tdClass}>
                    <Link to={href('/vidburdir/' + d.event.id)} className="line-clamp-2 max-w-[240px] font-semibold underline-offset-2 hover:underline">
                      {d.event.title}
                    </Link>
                    <p className="text-[11.5px] tabular-nums text-muted-foreground">{formatDateTime(d.event.starts_at, locale)}</p>
                    <Link to={href('/vidskipti/' + d.id)} className="mt-1 inline-flex items-center gap-1 py-1 text-[12.5px] text-foreground underline-offset-2 hover:underline">
                      {t('admin.disputes.openDeal')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <div className="space-y-2">
                      <Party profile={d.buyer} role={t('common.buyer')} />
                      <Party profile={d.seller} role={t('common.seller')} />
                    </div>
                  </TableCell>
                  <TableCell className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                    <p className="font-semibold">{formatISK(dealAmount(d))}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {t('admin.disputes.perTicket', { quantity: d.quantity, price: formatISK(d.price_per_ticket) })}
                    </p>
                  </TableCell>
                  <TableCell className={tdClass}>
                    <p className={cn('max-w-[260px] whitespace-pre-line', !d.cancel_reason && 'text-muted-foreground')}>
                      {d.cancel_reason || t('admin.disputes.noReason')}
                    </p>
                    <p className="mt-1 text-[11.5px] tabular-nums text-muted-foreground">
                      {t('admin.disputes.updatedAgo', { ago: formatRelative(d.updated_at, locale) })}
                    </p>
                  </TableCell>
                  <TableCell className={cn(tdClass, 'text-right')}>
                    <div className="flex flex-col items-end gap-1.5">
                      <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => open(d, 'admin_complete')}>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        {t('admin.disputes.complete')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-destructive/40 text-down hover:bg-destructive/10 hover:text-down"
                        onClick={() => open(d, 'admin_cancel')}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        {t('admin.disputes.cancel')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={t(pending?.action === 'admin_cancel' ? 'admin.disputes.cancelTitle' : 'admin.disputes.completeTitle')}
        description={t(pending?.action === 'admin_cancel' ? 'admin.disputes.cancelDescription' : 'admin.disputes.completeDescription')}
        confirmLabel={t(pending?.action === 'admin_cancel' ? 'admin.disputes.cancel' : 'admin.disputes.complete')}
        destructive={pending?.action === 'admin_cancel'}
        loading={transition.isPending}
        onConfirm={confirm}
      >
        {pending?.action === 'admin_cancel' && (
          <div className="space-y-1.5">
            <Label htmlFor="mt-dispute-reason">
              {t('admin.disputes.cancelReason')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="mt-dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={3}
              className="bg-background text-[13px]"
            />
            <p className="text-[12px] text-muted-foreground">{t('admin.disputes.cancelReasonHint')}</p>
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
