import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '../../lib/i18n';
import { useAuth, loginHref } from '../../lib/auth';
import { useCreateReport } from '../../lib/queries';
import { REPORT_REASONS, type ReportReason } from '../../lib/constants';
import type { ReportTarget } from '../../lib/types';
import { useLocation, useNavigate } from 'react-router-dom';

export type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget;
  /** Shown under the title: "Varðar: Sigur Rós · Harpa". */
  contextLabel?: string;
};

/** Reason select + details textarea → createReport → toast. Used by event, deal and profile pages. */
export function ReportDialog({ open, onOpenChange, target, contextLabel }: ReportDialogProps) {
  const t = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const create = useCreateReport();

  useEffect(() => {
    if (!open) {
      setReason('');
      setDetails('');
    }
  }, [open]);

  useEffect(() => {
    if (open && !user) {
      onOpenChange(false);
      navigate(loginHref(location.pathname + location.search));
    }
  }, [open, user, navigate, location.pathname, location.search, onOpenChange]);

  const submit = () => {
    if (!reason) return;
    create.mutate(
      {
        reported_user_id: target.userId ?? null,
        listing_id: target.listingId ?? null,
        deal_id: target.dealId ?? null,
        reason,
        details: details || null,
      },
      {
        onSuccess: () => {
          toast.success(t('report.success'));
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={create.isPending ? () => undefined : onOpenChange}>
      <DialogContent className="mt-panel max-w-md bg-card p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-down" aria-hidden="true" />
            {t('report.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {t('report.description')}
            {contextLabel && <span className="mt-1 block text-foreground">{t('report.contextLabel', { label: contextLabel })}</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mt-report-reason">{t('report.reasonLabel')}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger id="mt-report-reason" className="h-9 bg-background text-[13px]">
                <SelectValue placeholder={t('report.reasonPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`report.reason.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-report-details">
              {t('report.detailsLabel')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="mt-report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              placeholder={t('report.detailsPlaceholder')}
              rows={4}
              className="bg-background text-[13px]"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={submit} disabled={!reason || create.isPending}>
            {create.isPending ? t('common.sending') : t('report.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
