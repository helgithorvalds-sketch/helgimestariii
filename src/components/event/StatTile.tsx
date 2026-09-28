import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EM_DASH } from '../../lib/format';

export type StatTileProps = {
  label: string;
  /** Formatted value; null/undefined renders "—" (never fabricate numbers). */
  value: ReactNode | null | undefined;
  /** Small muted unit after the value ("miðar"). */
  unit?: string;
  /** Optional third line: caption or a PriceDelta. */
  sub?: ReactNode;
  className?: string;
};

/** One plain fact of the summary strip: label 13px muted, value 18px semibold. */
export function StatTile({ label, value, unit, sub, className }: StatTileProps) {
  const empty = value == null || value === '';
  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5 px-4 py-3', className)} data-testid="stat-tile">
      <span className="mt-label truncate">{label}</span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className={cn('text-[18px] font-semibold leading-tight tabular-nums', empty ? 'text-muted-foreground' : 'text-foreground')} data-testid="stat-value">
          {empty ? EM_DASH : value}
        </span>
        {!empty && unit && <span className="text-[14px] text-muted-foreground">{unit}</span>}
      </span>
      {sub != null && sub !== '' && (
        <span className="truncate text-[13px] text-muted-foreground" data-testid="stat-sub">
          {sub}
        </span>
      )}
    </div>
  );
}
