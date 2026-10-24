import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * A native range input styled to the brand (green track fill, white thumb with
 * a green ring). Native so it is keyboard-accessible and testable without a
 * ResizeObserver. The input is a 44 px tall transparent hit area; the 6 px
 * track is painted on its pseudo-elements (`.vild-range` in theme.css), the
 * fill up to the thumb's centre comes in as `--fill`.
 */
export function RangeInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  format: (n: number) => string;
  className?: string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
          {label}
        </label>
        <output htmlFor={id} className="vild-num text-[15px] font-bold">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `calc(${pct / 100} * (100% - 24px) + 12px)` }}
        // The hit area's lower 19 px hang into the gap below, so the block grows by the track's own room only.
        className="vild-range -mb-[19px] block"
      />
    </div>
  );
}
