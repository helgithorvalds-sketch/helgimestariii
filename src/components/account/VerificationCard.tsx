import { useState, type ComponentType, type ReactNode } from 'react';
import { Check, Loader2, Mail, Phone, ShieldCheck, type LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useSettings } from '../../lib/queries';
import { useErrorToast } from '../../lib/errors';
import { startEidVerification } from '../../lib/api/profiles';
import { settingBoolean } from '../admin/adminUtils';
import { secondaryButtonClass } from '../common/buttonClasses';
import { PhoneVerifyCard } from './PhoneVerifyCard';

type RowStatus = 'verified' | 'unverified' | 'soon';

function Row({
  icon: Icon,
  label,
  value,
  status,
  detail,
  action,
}: {
  icon: ComponentType<LucideProps>;
  label: string;
  value?: string | null;
  status: RowStatus;
  detail?: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">
          {label}
          {value && <span className="ml-2 font-normal text-muted-foreground">{value}</span>}
        </p>
        {detail && <p className="text-[12px] text-muted-foreground">{detail}</p>}
      </div>
      <div className="flex items-center gap-2">
        {status === 'verified' && (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-verified">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t('account.verification.verified')}
          </span>
        )}
        {status === 'unverified' && <span className="text-[12px] text-muted-foreground">{t('account.verification.unverified')}</span>}
        {status === 'soon' && <span className="mt-tag">{t('account.verification.comingSoon')}</span>}
        {action}
      </div>
    </li>
  );
}

/** Email ✓ · phone (SMS OTP via PhoneVerifyCard) · rafræn skilríki (button when the admin switch `eid_enabled` is on, else "Væntanlegt"). */
export function VerificationCard({ className }: { className?: string }) {
  const t = useT();
  const [locale] = useLocale();
  const { user, profile, pendingPhone } = useAuth();
  const [showPhone, setShowPhone] = useState(!!pendingPhone);

  const emailConfirmed = !!user?.email_confirmed_at;
  const phoneVerified = !!profile?.phone_verified_at || (profile?.verification ?? 'none') !== 'none';
  const eidVerified = profile?.verification === 'eid';
  const settings = useSettings();
  const eidEnabled = settingBoolean(settings.data?.find((s) => s.key === 'eid_enabled')?.value);
  const showError = useErrorToast();
  const [eidBusy, setEidBusy] = useState(false);
  const startEid = async () => {
    setEidBusy(true);
    try {
      const { url } = await startEidVerification('/eg');
      window.location.assign(url);
    } catch (err) {
      showError(err);
      setEidBusy(false);
    }
  };
  const eidDetail = eidVerified
    ? profile?.eid_verified_at
      ? t('account.verification.eidDone', { date: formatDate(profile.eid_verified_at, locale), name: profile.legal_name ?? profile.display_name })
      : undefined
    : eidEnabled
      ? t('account.verification.eidHint')
      : t('account.verification.eidBody');

  return (
    <section className={cn('mt-panel p-4 sm:p-5', className)} aria-labelledby="mt-verification-title">
      <h2 id="mt-verification-title" className="text-[14px] font-semibold">
        {t('account.verification.title')}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{t('account.verification.body')}</p>

      <ul className="mt-4 divide-y divide-border border-t border-border">
        <Row
          icon={Mail}
          label={t('account.verification.email')}
          value={user?.email}
          status={emailConfirmed ? 'verified' : 'unverified'}
          detail={emailConfirmed ? undefined : t('account.verification.emailPending')}
        />
        <Row
          icon={Phone}
          label={t('account.verification.phone')}
          status={phoneVerified ? 'verified' : 'unverified'}
          detail={
            phoneVerified && profile?.phone_verified_at
              ? t('account.verification.verifiedOn', { date: formatDate(profile.phone_verified_at, locale) })
              : undefined
          }
          action={
            !phoneVerified && !showPhone ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('h-10 text-[13px] sm:h-9', secondaryButtonClass)}
                onClick={() => setShowPhone(true)}
              >
                {t('account.verification.verifyPhone')}
              </Button>
            ) : undefined
          }
        />
        {showPhone && !phoneVerified && (
          <li className="py-3">
            <PhoneVerifyCard onVerified={() => setShowPhone(false)} />
          </li>
        )}
        <Row
          icon={ShieldCheck}
          label={t('account.verification.eid')}
          status={eidVerified ? 'verified' : eidEnabled ? 'unverified' : 'soon'}
          detail={eidDetail}
          action={
            !eidVerified && eidEnabled ? (
              <Button type="button" size="sm" className="h-10 text-[13px] font-semibold sm:h-9" onClick={() => void startEid()} disabled={eidBusy}>
                {eidBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t('account.verification.eidStart')}
              </Button>
            ) : undefined
          }
        />
      </ul>
    </section>
  );
}
