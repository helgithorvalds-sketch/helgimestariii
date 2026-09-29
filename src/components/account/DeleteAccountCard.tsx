import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { href } from '../../lib/paths';
import { useErrorToast } from '../../lib/errors';
import { deleteMyAccount } from '../../lib/api/profiles';
import { ConfirmDialog } from '../common/ConfirmDialog';

/** "Eyða aðgangi" — required by the App Store and the right to erasure. */
export function DeleteAccountCard({ className }: { className?: string }) {
  const t = useT();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const showError = useErrorToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteMyAccount();
      await signOut().catch(() => undefined);
      toast.success(t('account.delete.done'));
      navigate(href('/'), { replace: true });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <section className={cn('mt-panel p-4 sm:p-5', className)} aria-labelledby="mt-delete-title">
      <h2 id="mt-delete-title" className="text-[14px] font-semibold">
        {t('account.delete.title')}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t('account.delete.body')}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3 h-10 text-[13px] text-destructive sm:h-9" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden="true" />
        {t('account.delete.button')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('account.delete.confirmTitle')}
        description={t('account.delete.confirmBody')}
        confirmLabel={t('account.delete.button')}
        destructive
        loading={busy}
        onConfirm={confirm}
      />
    </section>
  );
}
