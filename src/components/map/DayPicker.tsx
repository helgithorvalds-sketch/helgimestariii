import { useEffect, useMemo, useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate } from '../../lib/format';
import { dayKey, dayOptions, parseDay, type DaySelection } from './mapUtils';

export type DayPickerProps = {
  value: DaySelection;
  onChange: (value: DaySelection) => void;
  /** First chip: "Næstu 30 dagar" (map, default) or "Allar dagsetningar" (list). */
  first?: 'next30' | 'all';
  /** Injected for tests; defaults to the time the picker mounts. */
  now?: Date;
  className?: string;
};

const CHIP = 'inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-[14px] font-medium transition-colors';
const chipClass = (pressed: boolean) =>
  cn(CHIP, pressed ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-secondary');

/**
 * Horizontal chips: "Næstu 30 dagar" (or "Allar dagsetningar"), "Í dag", "Á morgun", the
 * next 12 days, and "Velja dag" — a native date field for any later day.
 */
export function DayPicker({ value, onChange, first = 'next30', now, className }: DayPickerProps) {
  const t = useT();
  const [locale] = useLocale();
  const today = useMemo(() => now ?? new Date(), [now]);
  const options = useMemo(() => {
    const opts = dayOptions(today);
    return first === 'all' ? [{ value: 'all' as DaySelection, date: null, kind: 'all' as const }, ...opts.slice(1)] : opts;
  }, [today, first]);
  const selectedRef = useRef<HTMLElement | null>(null);
  // Keep the chosen day visible when it sits further along the scrolling row (e.g. opened from a link).
  useEffect(() => {
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [value]);

  const inRow = options.some((o) => o.value === value);
  const picked = !inRow && value !== 'next30' && value !== 'all' ? value : null;

  return (
    <div role="group" aria-label={t('map.day.label')} className={cn('mt-scroll-x -my-1 flex gap-2 py-1', className)} data-testid="day-picker">
      {options.map((opt) => {
        const label =
          opt.kind === 'next30'
            ? t('map.day.next30')
            : opt.kind === 'all'
              ? t('map.day.all')
              : opt.kind === 'today'
                ? t('map.day.today')
                : opt.kind === 'tomorrow'
                  ? t('map.day.tomorrow')
                  : formatDate(opt.date, locale);
        const pressed = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={
              pressed
                ? (el) => {
                    selectedRef.current = el;
                  }
                : undefined
            }
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(opt.value)}
            className={chipClass(pressed)}
          >
            {label}
          </button>
        );
      })}
      <label
        ref={
          picked
            ? (el) => {
                selectedRef.current = el;
              }
            : undefined
        }
        className={cn(chipClass(!!picked), 'relative cursor-pointer gap-1.5 focus-within:ring-2 focus-within:ring-ring')}
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        <span>{picked ? formatDate(`${picked}T12:00:00`, locale) : t('map.day.pick')}</span>
        <input
          type="date"
          aria-label={t('map.day.pickAria')}
          min={dayKey(today)}
          value={picked ?? ''}
          onChange={(e) => {
            const next = parseDay(e.target.value, today);
            if (next !== 'next30') onChange(next);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
