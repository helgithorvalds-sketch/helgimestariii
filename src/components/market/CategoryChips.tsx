import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import { EVENT_CATEGORIES } from '../../lib/constants';
import type { EventCategory } from '../../lib/types';

export type CategoryChipsProps = {
  /** `null` = Allt. */
  value: EventCategory | null;
  onChange: (category: EventCategory | null) => void;
  className?: string;
};

type Chip = { key: EventCategory | 'all'; value: EventCategory | null };

const CHIPS: Chip[] = [{ key: 'all', value: null }, ...EVENT_CATEGORIES.map((c): Chip => ({ key: c, value: c }))];

/**
 * `role="group"` of pill toggles (Allt · Tónleikar · Leikhús · …), horizontally
 * scrollable with a hidden scrollbar. Pressed = solid blue.
 */
export function CategoryChips({ value, onChange, className }: CategoryChipsProps) {
  const t = useT();
  return (
    <div role="group" aria-label={t('home.filters.label')} className={cn('mt-scroll-x -my-1 flex gap-2 py-1', className)}>
      {CHIPS.map((chip) => {
        const pressed = chip.value === value;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(chip.value)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-[14px] font-medium transition-colors',
              pressed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent',
            )}
          >
            {t(`category.${chip.key}`)}
          </button>
        );
      })}
    </div>
  );
}

export default CategoryChips;
