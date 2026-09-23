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

/** DESIGN.md Badge "Staðfestur": 18px, 4px radius, verified colour on a 9% tint. */
export function VerifiedBadge({ level, showUnverified = false, long = false, className }: VerifiedBadgeProps) {
  const t = useT();
  if (!level || level === 'none') {
    if (!showUnverified) return null;
    return <span className={cn('text-[11px] text-muted-foreground', className)}>{t('verification.none')}</span>;
  }
  const Icon = level === 'eid' ? ShieldCheck : Check;
  const title = t(`verification.badgeTitle.${level}`);
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center gap-1 rounded-[4px] bg-verified/10 pl-1 pr-1.5 text-[11px] font-semibold leading-none text-verified',
        className,
      )}
      title={title}
      aria-label={title}
    >
      <Icon className="h-[11px] w-[11px]" aria-hidden="true" />
      {long ? t(`verification.${level}`) : t('verification.badge')}
    </span>
  );
}
