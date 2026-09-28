import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate } from '../../lib/format';
import { dayOptions, type DaySelection } from './mapUtils';

export type DayPickerProps = {
  value: DaySelection;
  onChange: (value: DaySelection) => void;
  /** Injected for tests; defaults to the time the picker mounts. */
  now?: Date;
  className?: string;
};

/** Horizontal chips: "Næstu 30 dagar", "Í dag", "Á morgun", then the next 12 days. */
export function DayPicker({ value, onChange, now, className }: DayPickerProps) {
  const t = useT();
  const [locale] = useLocale();
  const options = useMemo(() => dayOptions(now ?? new Date()), [now]);

  return (
    <div role="group" aria-label={t('map.day.label')} className={cn('mt-scroll-x -my-1 flex gap-2 py-1', className)} data-testid="day-picker">
      {options.map((opt) => {
        const label =
          opt.kind === 'next30'
            ? t('map.day.next30')
            : opt.kind === 'today'
              ? t('map.day.today')
              : opt.kind === 'tomorrow'
                ? t('map.day.tomorrow')
                : formatDate(opt.date, locale);
        const pressed = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[14px] font-medium transition-colors',
              pressed ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
