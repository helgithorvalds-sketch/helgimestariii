import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * A native range input styled to the brand (green track fill, white thumb with
 * a green ring). Native so it is keyboard-accessible and testable without a
 * ResizeObserver.
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
      <div className="mb-2 flex items-baseline justify-between gap-3">
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
        style={{ background: `linear-gradient(to right, hsl(var(--green-500)) ${pct}%, hsl(var(--border)) ${pct}%)` }}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none',
          '[&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[hsl(var(--green-500))] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[var(--shadow-sm)]',
          '[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[hsl(var(--green-500))] [&::-moz-range-thumb]:bg-white',
          'focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-[hsl(var(--mint-300))]',
        )}
      />
    </div>
  );
}
