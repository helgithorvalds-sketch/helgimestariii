import { Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { VerificationLevel } from '../../lib/types';

type VerifiedBadgeProps = {
  level: VerificationLevel | null | undefined;
  /** Render a muted "Óstaðfestur" text when the level is none (default: render nothing). */
  showUnverified?: boolean;
  /** Full level label ("Staðfestur sími") instead of the short "Staðfestur". */
  long?: boolean;
  className?: string;
};

/** "Staðfestur" chip: blue text on a light-blue fill. */
export function VerifiedBadge({ level, showUnverified = false, long = false, className }: VerifiedBadgeProps) {
  const t = useT();
  if (!level || level === 'none') {
    if (!showUnverified) return null;
    return <span className={cn('text-[12px] text-muted-foreground', className)}>{t('verification.none')}</span>;
  }
  const Icon = level === 'eid' ? ShieldCheck : Check;
  const title = t(`verification.badgeTitle.${level}`);
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full bg-accent pl-1.5 pr-2 text-[12px] font-semibold leading-none text-verified',
        className,
      )}
      title={title}
      aria-label={title}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {long ? t(`verification.${level}`) : t('verification.badge')}
    </span>
  );
}
