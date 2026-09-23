import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Info, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { parseApiError } from '../../lib/errors';
import { secondaryButtonClass } from '../common/buttonClasses';
import { authInputClass, FieldMessage } from './AuthForm';
import { formatPhone, normalisePhone, OTP_LENGTH } from './logic';

type Step = 'phone' | 'code';

export type PhoneVerifyCardProps = {
  onVerified?: () => void;
  className?: string;
};

/**
 * Two steps: phone number → `startPhoneVerification(+354…)`; six-digit SMS code
 * (shadcn InputOTP) → `verifyPhone`. Explains that SMS may be unavailable until
 * the provider is configured, and shows the raw server message under the
 * translated toast so support can act on it.
 */
export function PhoneVerifyCard({ onVerified, className }: PhoneVerifyCardProps) {
  const t = useT();
  const { startPhoneVerification, verifyPhone, pendingPhone } = useAuth();
  const [step, setStep] = useState<Step>(pendingPhone ? 'code' : 'phone');
  const [target, setTarget] = useState<string | null>(pendingPhone);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) => {
    const parsed = parseApiError(err);
    toast.error(t(parsed.key));
    setServerError(parsed.message.trim() || null);
  };

  const send = async (number: string) => {
    setBusy(true);
    setServerError(null);
    try {
      await startPhoneVerification(number);
      setTarget(number);
      setCode('');
      setStep('code');
      toast.success(t('account.phone.sent', { phone: formatPhone(number) }));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const onPhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    const normalised = normalisePhone(phone);
    if (!normalised) {
      setPhoneError(t('errors.INVALID_PHONE'));
      return;
    }
    void send(normalised);
  };

  const onCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    if (code.length !== OTP_LENGTH) {
      setCodeError(t('account.validation.otpLength'));
      return;
    }
    setBusy(true);
    setServerError(null);
    try {
      await verifyPhone(code, target ?? undefined);
      toast.success(t('account.phone.success'));
      onVerified?.();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const changeNumber = () => {
    setStep('phone');
    setCode('');
    setCodeError(null);
    setServerError(null);
  };

  return (
    <section className={cn('mt-panel bg-surface-2/40 p-4', className)} aria-labelledby="mt-phone-verify-title">
      <h3 id="mt-phone-verify-title" className="flex items-center gap-2 text-[14px] font-semibold">
        <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t('account.phone.title')}
      </h3>
      <p className="mt-2 flex items-start gap-2 text-[12px] text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t('account.phone.smsNotice')}</span>
      </p>

      {step === 'phone' ? (
        <form onSubmit={onPhoneSubmit} noValidate className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mt-phone">{t('account.phone.label')}</Label>
            <Input
              id="mt-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('account.phone.placeholder')}
              className={cn(authInputClass, 'max-w-[260px] tabular-nums', phoneError && 'border-destructive')}
              aria-invalid={!!phoneError}
              aria-describedby={cn('mt-phone-help', phoneError && 'mt-phone-error')}
            />
            <p id="mt-phone-help" className="text-[12px] text-muted-foreground">
              {t('account.phone.help')}
            </p>
            <FieldMessage id="mt-phone-error" message={phoneError} />
          </div>
          <Button type="submit" size="sm" className="h-10 text-[13px] font-semibold sm:h-9" disabled={busy}>
            {busy ? t('account.phone.sending') : t('account.phone.send')}
          </Button>
        </form>
      ) : (
        <form onSubmit={onCodeSubmit} noValidate className="mt-4 space-y-3">
          <p className="text-[13px]">{t('account.phone.sent', { phone: formatPhone(target) })}</p>
          <div className="space-y-1.5">
            <Label htmlFor="mt-otp">{t('account.phone.codeLabel')}</Label>
            <InputOTP
              id="mt-otp"
              maxLength={OTP_LENGTH}
              value={code}
              onChange={setCode}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="one-time-code"
              disabled={busy}
              aria-describedby={cn('mt-otp-help', codeError && 'mt-otp-error')}
              containerClassName="justify-start"
            >
              <InputOTPGroup>
                {Array.from({ length: OTP_LENGTH }, (_, i) => (
                  <InputOTPSlot key={i} index={i} className="h-11 w-10 bg-background text-[16px] tabular-nums" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p id="mt-otp-help" className="text-[12px] text-muted-foreground">
              {t('account.phone.codeHelp')}
            </p>
            <FieldMessage id="mt-otp-error" message={codeError} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" className="h-10 text-[13px] font-semibold sm:h-9" disabled={busy}>
              {busy ? t('account.phone.verifying') : t('account.phone.verify')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('h-10 text-[13px] sm:h-9', secondaryButtonClass)}
              onClick={() => target && void send(target)}
              disabled={busy || !target}
            >
              {t('account.phone.resend')}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-10 text-[13px] sm:h-9" onClick={changeNumber} disabled={busy}>
              {t('account.phone.changeNumber')}
            </Button>
          </div>
        </form>
      )}

      {serverError && (
        <p className="mt-3 break-words text-[12px] text-muted-foreground" data-testid="phone-server-error">
          {t('account.phone.serverError', { message: serverError })}
        </p>
      )}
    </section>
  );
}
