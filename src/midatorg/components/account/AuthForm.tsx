import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, KeyRound, MailCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { parseApiError } from '../../lib/errors';
import { href } from '../../lib/paths';
import { secondaryButtonClass } from '../common/buttonClasses';
import {
  emailOnlySchema,
  loginSchema,
  signupSchema,
  type EmailOnlyValues,
  type LoginValues,
  type SignupValues,
} from './logic';

export type AuthMode = 'login' | 'signup';
type LinkKind = 'magic' | 'reset';
type Sent = { kind: LinkKind | 'confirm'; email: string };

/** 40px on phones, 36px from sm (DESIGN.md login spec), card-on-canvas contrast. */
export const authInputClass = 'h-10 bg-background text-[14px] sm:h-9 sm:text-[13px]';
export const primaryButtonClass = 'h-10 w-full text-[13px] font-semibold';

/** 12px `text-down` message under a field; the field points at it with aria-describedby. */
export function FieldMessage({ id, message, className }: { id: string; message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={cn('text-[12px] text-down', className)}>
      {message}
    </p>
  );
}

/** Form-level error: card bg, destructive/40 border, one sentence (DESIGN.md §7). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-card p-3 text-[13px]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-down" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function EmailField({
  id,
  error,
  register,
  autoFocus,
}: {
  id: string;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm<{ email: string }>>['register']>;
  autoFocus?: boolean;
}) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t('account.login.email')}</Label>
      <Input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus={autoFocus}
        placeholder={t('account.login.emailPlaceholder')}
        className={cn(authInputClass, error && 'border-destructive')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register}
      />
      <FieldMessage id={`${id}-error`} message={error && t(error)} />
    </div>
  );
}

function LoginForm({ next, onMagic, onReset }: { next: string; onMagic: () => void; onReset: () => void }) {
  const t = useT();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      toast.success(t('account.login.success'));
      navigate(next, { replace: true });
    } catch (err) {
      const message = t(parseApiError(err).key);
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={t('account.login.title')}>
      <FormAlert message={formError} />
      <EmailField id="mt-login-email" error={errors.email?.message} register={register('email')} />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="mt-login-password">{t('account.login.password')}</Label>
          <button
            type="button"
            onClick={onReset}
            className="py-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('account.login.forgot')}
          </button>
        </div>
        <Input
          id="mt-login-password"
          type="password"
          autoComplete="current-password"
          className={cn(authInputClass, errors.password && 'border-destructive')}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'mt-login-password-error' : undefined}
          {...register('password')}
        />
        <FieldMessage id="mt-login-password-error" message={errors.password?.message && t(errors.password.message)} />
      </div>
      <Button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
        {isSubmitting ? t('account.login.working') : t('account.login.submitLogin')}
      </Button>
      <div className="flex items-center gap-3 text-[12px] text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>{t('account.login.or')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className={cn(primaryButtonClass, secondaryButtonClass)} onClick={onMagic}>
        <Send aria-hidden="true" />
        {t('account.login.magicLink')}
      </Button>
    </form>
  );
}

function SignupForm({ next, onConfirm }: { next: string; onConfirm: (email: string) => void }) {
  const t = useT();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await signUp(values.email, values.password, values.displayName, next);
      if (result.needsConfirmation) {
        onConfirm(values.email);
        return;
      }
      toast.success(t('account.login.signupSuccess'));
      navigate(next, { replace: true });
    } catch (err) {
      const message = t(parseApiError(err).key);
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={t('account.login.signupTitle')}>
      <FormAlert message={formError} />
      <div className="space-y-1.5">
        <Label htmlFor="mt-signup-name">{t('account.login.displayName')}</Label>
        <Input
          id="mt-signup-name"
          type="text"
          autoComplete="name"
          maxLength={40}
          className={cn(authInputClass, errors.displayName && 'border-destructive')}
          aria-invalid={!!errors.displayName}
          aria-describedby={cn('mt-signup-name-hint', errors.displayName && 'mt-signup-name-error')}
          {...register('displayName')}
        />
        <p id="mt-signup-name-hint" className="text-[12px] text-muted-foreground">
          {t('account.login.displayNameHint')}
        </p>
        <FieldMessage id="mt-signup-name-error" message={errors.displayName?.message && t(errors.displayName.message)} />
      </div>
      <EmailField id="mt-signup-email" error={errors.email?.message} register={register('email')} />
      <div className="space-y-1.5">
        <Label htmlFor="mt-signup-password">{t('account.login.password')}</Label>
        <Input
          id="mt-signup-password"
          type="password"
          autoComplete="new-password"
          className={cn(authInputClass, errors.password && 'border-destructive')}
          aria-invalid={!!errors.password}
          aria-describedby={cn('mt-signup-password-hint', errors.password && 'mt-signup-password-error')}
          {...register('password')}
        />
        <p id="mt-signup-password-hint" className="text-[12px] text-muted-foreground">
          {t('account.login.passwordHint')}
        </p>
        <FieldMessage id="mt-signup-password-error" message={errors.password?.message && t(errors.password.message)} />
      </div>
      <Button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
        {isSubmitting ? t('account.login.working') : t('account.login.submitSignup')}
      </Button>
      <p className="text-[12px] text-muted-foreground">
        {t('account.login.rulesPrefix')}{' '}
        <Link to={href('/um#reglur')} className="underline underline-offset-2 hover:text-foreground">
          {t('account.login.rulesLink')}
        </Link>
        .
      </p>
    </form>
  );
}

function EmailLinkForm({ kind, next, onSent, onBack }: { kind: LinkKind; next: string; onSent: (email: string) => void; onBack: () => void }) {
  const t = useT();
  const { sendMagicLink, resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({ resolver: zodResolver(emailOnlySchema), defaultValues: { email: '' } });
  const send = kind === 'magic' ? (email: string) => sendMagicLink(email, next) : resetPassword;
  const Icon = kind === 'magic' ? MailCheck : KeyRound;
  const title = t(kind === 'magic' ? 'account.login.magicLinkTitle' : 'account.login.forgotTitle');

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await send(email);
      onSent(email);
    } catch (err) {
      const message = t(parseApiError(err).key);
      setFormError(message);
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label={title}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {t(kind === 'magic' ? 'account.login.magicLinkHelp' : 'account.login.forgotHelp')}
          </p>
        </div>
      </div>
      <FormAlert message={formError} />
      <EmailField id={`mt-${kind}-email`} error={errors.email?.message} register={register('email')} autoFocus />
      <Button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
        {isSubmitting ? t('common.sending') : t('account.login.sendLink')}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="w-full text-[13px]" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {t('account.login.backToLogin')}
      </Button>
    </form>
  );
}

function SentPanel({ sent, onResend, onBack }: { sent: Sent; onResend?: () => Promise<void>; onBack: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const isConfirm = sent.kind === 'confirm';

  const resend = async () => {
    if (!onResend) return;
    setBusy(true);
    try {
      await onResend();
      toast.success(t('account.login.resent'));
    } catch (err) {
      toast.error(t(parseApiError(err).key));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-center" role="status">
      <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-up/10 text-up">
        <MailCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-[16px] font-semibold">{t(isConfirm ? 'account.login.confirmTitle' : 'account.login.sentTitle')}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {t(isConfirm ? 'account.login.confirmBody' : 'account.login.sentBody', { email: sent.email })}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {onResend && (
          <Button type="button" variant="outline" className={cn(primaryButtonClass, secondaryButtonClass)} onClick={resend} disabled={busy}>
            {busy ? t('common.sending') : t('account.login.resend')}
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="w-full text-[13px]" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t('account.login.backToLogin')}
        </Button>
      </div>
    </div>
  );
}

export type AuthFormProps = {
  mode: AuthMode;
  /** Absolute app path to go to after a successful sign-in (already validated by `resolveNext`). */
  next: string;
  onSwitchMode?: (mode: AuthMode) => void;
};

/**
 * Email + password sign-in / sign-up, plus the passwordless "Senda innskráningartengil"
 * and "Gleymt lykilorð" flows with their sent-confirmation states. Every auth error is
 * parsed, shown inline and toasted.
 */
export function AuthForm({ mode, next, onSwitchMode }: AuthFormProps) {
  const { sendMagicLink, resetPassword } = useAuth();
  const [view, setView] = useState<'form' | LinkKind>('form');
  const [sent, setSent] = useState<Sent | null>(null);

  const backToLogin = () => {
    setSent(null);
    setView('form');
    onSwitchMode?.('login');
  };

  if (sent) {
    const resend =
      sent.kind === 'magic'
        ? () => sendMagicLink(sent.email, next)
        : sent.kind === 'reset'
          ? () => resetPassword(sent.email)
          : undefined;
    return <SentPanel sent={sent} onResend={resend} onBack={backToLogin} />;
  }
  if (view !== 'form') {
    return <EmailLinkForm next={next} kind={view} onSent={(email) => setSent({ kind: view, email })} onBack={() => setView('form')} />;
  }
  if (mode === 'signup') {
    return <SignupForm next={next} onConfirm={(email) => setSent({ kind: 'confirm', email })} />;
  }
  return <LoginForm next={next} onMagic={() => setView('magic')} onReset={() => setView('reset')} />;
}
