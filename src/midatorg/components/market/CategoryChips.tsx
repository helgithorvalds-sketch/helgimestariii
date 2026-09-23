import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { EVENT_CATEGORIES } from '../../lib/constants';
import type { EventCategory } from '../../lib/types';

export type CategoryChipsProps = {
  /** `null` = Allt. */
  value: EventCategory | null;
  onChange: (category: EventCategory | null) => void;
  /** Optional counts shown in mono at 75 % opacity. */
  counts?: Partial<Record<EventCategory | 'all', number>>;
  className?: string;
};

type Chip = { key: EventCategory | 'all'; value: EventCategory | null };

const CHIPS: Chip[] = [{ key: 'all', value: null }, ...EVENT_CATEGORIES.map((c): Chip => ({ key: c, value: c }))];

/**
 * DESIGN.md §5: `role="group"` of 34px pill toggles, horizontally scrollable with
 * a hidden scrollbar. Pressed = foreground bg / background text.
 */
export function CategoryChips({ value, onChange, counts, className }: CategoryChipsProps) {
  const t = useT();
  return (
    <div role="group" aria-label={t('home.filters.label')} className={cn('mt-scroll-x -my-1 flex gap-1.5 py-1', className)}>
      {CHIPS.map((chip) => {
        const pressed = chip.value === value;
        const count = counts?.[chip.key];
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors',
              pressed
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground',
            )}
          >
            {t(`category.${chip.key}`)}
            {count != null && (
              <span className="mt-mono text-[11px] opacity-75" aria-hidden="true">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryChips;
