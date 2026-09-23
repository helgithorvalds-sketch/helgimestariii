import { useState, type ComponentType, type ReactNode } from 'react';
import { Check, Mail, Phone, ShieldCheck, type LucideProps } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
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
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted-foreground">
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

/** Email ✓ · phone (SMS OTP via PhoneVerifyCard) · rafræn skilríki "Væntanlegt". */
export function VerificationCard({ className }: { className?: string }) {
  const t = useT();
  const [locale] = useLocale();
  const { user, profile, pendingPhone } = useAuth();
  const [showPhone, setShowPhone] = useState(!!pendingPhone);

  const emailConfirmed = !!user?.email_confirmed_at;
  const phoneVerified = !!profile?.phone_verified_at || (profile?.verification ?? 'none') !== 'none';
  const eidVerified = profile?.verification === 'eid';

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
          status={eidVerified ? 'verified' : 'soon'}
          detail={eidVerified ? undefined : t('account.verification.eidBody')}
        />
      </ul>
    </section>
  );
}
