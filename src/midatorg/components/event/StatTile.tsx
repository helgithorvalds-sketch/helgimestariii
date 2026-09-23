import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EM_DASH } from '../../lib/format';

export type StatTileProps = {
  label: string;
  /** Formatted value; null/undefined renders "—" (never fabricate numbers). */
  value: ReactNode | null | undefined;
  /** Small muted unit after the value ("miðar", "manns"). */
  unit?: string;
  /** Third line: caption or a PriceDelta. */
  sub?: ReactNode;
  /** 7px square swatch before the label (ask = Til sölu, bid = Vilja kaupa). */
  swatch?: 'ask' | 'bid';
  className?: string;
};

/** DESIGN.md StatTile: card, 12px 14px padding, label 12px muted, value 22px/600 tabular. */
export function StatTile({ label, value, unit, sub, swatch, className }: StatTileProps) {
  const empty = value == null || value === '';
  return (
    <div className={cn('mt-panel flex min-w-0 flex-col gap-1 px-[14px] py-3', className)} data-testid="stat-tile">
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {swatch && (
          <span
            aria-hidden="true"
            className={cn('inline-block h-[7px] w-[7px] shrink-0 rounded-[2px]', swatch === 'ask' ? 'bg-ask' : 'bg-bid')}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-[5px] whitespace-nowrap">
        <span
          className={cn(
            'text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums',
            empty ? 'text-muted-foreground' : 'text-foreground',
          )}
          data-testid="stat-value"
        >
          {empty ? EM_DASH : value}
        </span>
        {!empty && unit && <span className="text-[13px] font-medium text-muted-foreground">{unit}</span>}
      </div>
      <div className="min-h-[16px] truncate text-[12px] text-muted-foreground" data-testid="stat-sub">
        {sub}
      </div>
    </div>
  );
}
