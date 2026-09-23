import { cn } from '@/lib/utils';
import { formatISK, formatNumber } from '../../lib/format';

type MoneyProps = {
  amount: number | null | undefined;
  className?: string;
  /** Renders the "kr." unit muted and slightly smaller (headline style). */
  unitClassName?: string;
  /** Plain "8.900 kr." without a separate unit span. */
  plain?: boolean;
};

/** Price in ISK, wrapped so "kr." never orphans; null → "—". */
export function Money({ amount, className, unitClassName, plain }: MoneyProps) {
  if (amount == null || !Number.isFinite(amount)) {
    return <span className={cn('tabular-nums text-muted-foreground', className)}>—</span>;
  }
  if (plain) return <span className={cn('whitespace-nowrap tabular-nums', className)}>{formatISK(amount)}</span>;
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {formatNumber(Math.round(amount), 'is')}
      <span className={cn('ml-[0.3em] font-medium text-muted-foreground', unitClassName)}>kr.</span>
    </span>
  );
}
