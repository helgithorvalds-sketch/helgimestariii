import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springSnappy } from '../../lib/motion';

export type Segment<T extends string> = { value: T; label: string };

/** iOS-style segmented control: a sliding white pill on a grey track. */
export function SegmentedControl<T extends string>({ value, onChange, segments, className, ariaLabel, layoutId = 'segment' }: { value: T; onChange: (v: T) => void; segments: Segment<T>[]; className?: string; ariaLabel: string; layoutId?: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex h-9 items-center rounded-full bg-secondary p-0.5', className)}>
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.value)}
            className={cn('relative h-8 min-w-[64px] rounded-full px-3.5 text-[13px] font-semibold transition-colors', active ? 'text-foreground' : 'text-muted-foreground')}
          >
            {active && <motion.span layoutId={layoutId} transition={springSnappy} className="absolute inset-0 rounded-full bg-white shadow-[var(--shadow-sm)]" aria-hidden="true" />}
            <span className="relative">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
