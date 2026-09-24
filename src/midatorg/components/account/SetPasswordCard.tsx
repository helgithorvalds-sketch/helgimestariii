import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { parseApiError } from '../../lib/errors';
import { authInputClass, FieldMessage, FormAlert } from './AuthForm';
import { setPasswordSchema, type SetPasswordValues } from './logic';

export type SetPasswordCardProps = {
  /** Called after the password is saved, or when the user skips. */
  onDone: () => void;
  className?: string;
};

/** Rendered on /eg?reset=1 (the target of the reset-password email): new password + repeat → updatePassword. */
export function SetPasswordCard({ onDone, className }: SetPasswordCardProps) {
  const t = useT();
  const { updatePassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({ resolver: zodResolver(setPasswordSchema), defaultValues: { password: '', confirm: '' } });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await updatePassword(password);
      toast.success(t('account.setPassword.success'));
      onDone();
    } catch (err) {
      const message = t(parseApiError(err).key);
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <section className={cn('mt-panel border-primary/40 p-4 sm:p-5', className)} aria-labelledby="mt-set-password-title">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 id="mt-set-password-title" className="text-[14px] font-semibold">
            {t('account.setPassword.title')}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t('account.setPassword.body')}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-4 max-w-sm space-y-4">
        <FormAlert message={formError} />
        <div className="space-y-1.5">
          <Label htmlFor="mt-new-password">{t('account.setPassword.new')}</Label>
          <Input
            id="mt-new-password"
            type="password"
            autoComplete="new-password"
            className={cn(authInputClass, errors.password && 'border-destructive')}
            aria-invalid={!!errors.password}
            aria-describedby={cn('mt-new-password-hint', errors.password && 'mt-new-password-error')}
            {...register('password')}
          />
          <p id="mt-new-password-hint" className="text-[12px] text-muted-foreground">
            {t('account.login.passwordHint')}
          </p>
          <FieldMessage id="mt-new-password-error" message={errors.password?.message && t(errors.password.message)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mt-confirm-password">{t('account.setPassword.confirm')}</Label>
          <Input
            id="mt-confirm-password"
            type="password"
            autoComplete="new-password"
            className={cn(authInputClass, errors.confirm && 'border-destructive')}
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? 'mt-confirm-password-error' : undefined}
            {...register('confirm')}
          />
          <FieldMessage id="mt-confirm-password-error" message={errors.confirm?.message && t(errors.confirm.message)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" className="h-10 text-[13px] font-semibold sm:h-9" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('account.setPassword.submit')}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-10 text-[13px] sm:h-9" onClick={onDone} disabled={isSubmitting}>
            {t('account.setPassword.skip')}
          </Button>
        </div>
      </form>
    </section>
  );
}
