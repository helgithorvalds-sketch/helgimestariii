/**
 * Small presentational pieces shared by the admin tables: search box, row
 * skeleton, segmented filter and status pill. Admin-only, so they live here
 * rather than in components/common.
 */
import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function AdminSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9"
      />
    </div>
  );
}

/** N pulse rows in a panel; keeps the box the table will occupy (DESIGN.md §7). */
export function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('mt-panel divide-y divide-border', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full bg-surface-2" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3 bg-surface-2" />
            <Skeleton className="h-3 w-1/2 bg-surface-2" />
          </div>
          <Skeleton className="hidden h-8 w-24 bg-surface-2 sm:block" />
        </div>
      ))}
    </div>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; count?: number };

/** `aria-pressed` segmented group (like the chart range selector). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('mt-scroll-x flex gap-1 rounded-lg border border-border bg-card p-1', className)}>
      {options.map((o) => {
        const pressed = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pressed ? 'bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.count != null && <span className="tabular-nums text-[11px] text-muted-foreground">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export type PillTone = 'up' | 'down' | 'bid' | 'primary' | 'muted' | 'verified';

const PILL_TONES: Record<PillTone, string> = {
  up: 'bg-up/10 text-up',
  down: 'bg-destructive/10 text-down',
  bid: 'bg-bid/10 text-bid',
  primary: 'bg-primary/15 text-foreground',
  muted: 'bg-surface-2 text-muted-foreground',
  verified: 'bg-verified/10 text-verified',
};

/** DESIGN.md badge: 18px, 4px radius, 11px/600, tone tint at 10%. */
export function Pill({ tone = 'muted', children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] items-center whitespace-nowrap rounded-[4px] px-1.5 text-[11px] font-semibold leading-none',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Eyebrow-style table header cell text. */
export const thClass = 'mt-eyebrow h-10 whitespace-nowrap px-3 text-left align-middle font-semibold';
export const tdClass = 'px-3 py-2.5 align-middle text-[13px]';
