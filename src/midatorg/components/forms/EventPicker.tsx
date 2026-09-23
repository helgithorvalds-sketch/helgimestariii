import { useEffect, useRef, useState } from 'react';
import { CalendarX2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';
import { useEventSearch, useMarketEvent } from '../../lib/queries';
import type { MarketEvent } from '../../lib/types';
import { CategoryBadge } from '../common/CategoryBadge';
import { ErrorState } from '../common/ErrorState';
import { UserAvatar } from '../common/UserAvatar';
import { ManualEventForm } from './ManualEventForm';
import { eventRowToMarketEvent, faceValueRange } from './schemas';

export type EventPickerProps = {
  value: MarketEvent | null;
  onChange: (event: MarketEvent | null) => void;
  /** `?event=<id>` from the URL: loaded with getMarketEvent and selected once. */
  preselectId?: string | null;
  /** i18n key (or sentence) rendered under the picker. */
  error?: string | null;
  disabled?: boolean;
  className?: string;
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function eventMeta(event: MarketEvent, locale: 'is' | 'en'): string {
  return [event.venue_name, formatDateTime(event.starts_at, locale)].filter(Boolean).join(' · ');
}

/**
 * Searchable combobox (cmdk) over `searchEvents(q)` showing "title · venue · date",
 * plus an inline "Bæta við viðburði" form for events that are not on tix.is.
 */
export function EventPicker({ value, onChange, preselectId, error, disabled, className }: EventPickerProps) {
  const t = useT();
  const [locale] = useLocale();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);
  const [manualOpen, setManualOpen] = useState(false);
  const active = dq.trim().length >= 2;
  const search = useEventSearch(dq);

  // ?event=<id> preselection (applied once per id, only while nothing is chosen)
  const wantPreselect = !value && !!preselectId;
  const preselect = useMarketEvent(wantPreselect ? preselectId ?? undefined : undefined);
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!wantPreselect || !preselect.data || appliedRef.current === preselectId) return;
    appliedRef.current = preselectId ?? null;
    onChange(preselect.data);
  }, [wantPreselect, preselect.data, preselectId, onChange]);

  const errorId = 'mt-event-picker-error';
  const errorText = error ? t(error) : null;
  const notUpcoming = !!value && value.status !== 'upcoming';

  const pick = (event: MarketEvent | null) => {
    onChange(event);
    if (event) setQ('');
  };

  if (value) {
    const range = faceValueRange(value);
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3" data-testid="event-picker-selected">
          <UserAvatar profile={{ id: value.id, display_name: value.title }} size="md" shape="square" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[14px] font-semibold leading-tight">{value.title}</p>
              <CategoryBadge category={value.category} />
            </div>
            <p className="truncate text-[12px] text-muted-foreground tabular-nums">{eventMeta(value, locale)}</p>
            {range && <p className="text-[12px] text-muted-foreground">{t('forms.event.faceValueHint', { range })}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 bg-card hover:bg-surface-2"
            onClick={() => pick(null)}
            disabled={disabled}
          >
            {t('forms.event.change')}
          </Button>
        </div>
        {notUpcoming && (
          <p className="flex items-start gap-2 text-[12px] font-medium text-down">
            <CalendarX2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('forms.event.notUpcoming')}
          </p>
        )}
        {errorText && (
          <p id={errorId} className="text-[12px] font-medium text-down">
            {errorText}
          </p>
        )}
      </div>
    );
  }

  if (wantPreselect && preselect.isLoading) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-border bg-background p-3', className)} aria-busy="true">
        <Skeleton className="h-11 w-11 rounded-lg bg-surface-2" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-2/3 bg-surface-2" />
          <Skeleton className="h-3 w-1/2 bg-surface-2" />
        </div>
      </div>
    );
  }

  if (wantPreselect && preselect.isError) {
    return (
      <ErrorState
        className={className}
        error={preselect.error}
        title={t('forms.event.loadError')}
        retry={() => {
          void preselect.refetch();
        }}
      />
    );
  }

  const preselectMissing = wantPreselect && preselect.isSuccess && preselect.data === null;

  let body: React.ReactNode;
  if (!active) {
    body = <p className="px-3 py-3 text-[13px] text-muted-foreground">{t('forms.event.searchHint')}</p>;
  } else if (search.isLoading) {
    body = (
      <div className="space-y-1 p-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <Skeleton className="h-[30px] w-[30px] rounded-md bg-surface-2" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3 bg-surface-2" />
              <Skeleton className="h-3 w-1/2 bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (search.isError) {
    body = (
      <ErrorState
        className="m-2"
        error={search.error}
        title={t('forms.event.loadError')}
        retry={() => {
          void search.refetch();
        }}
      />
    );
  } else if (!search.data || search.data.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-2 px-4 py-6 text-center" role="status">
        <p className="text-[13px] font-semibold">{t('forms.event.noResults', { q: dq.trim() })}</p>
        <p className="text-[12.5px] text-muted-foreground">{t('forms.event.noResultsHint')}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-9 gap-1.5 bg-card hover:bg-surface-2"
          onClick={() => setManualOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('forms.event.add')}
        </Button>
      </div>
    );
  } else {
    body = (
      <CommandGroup heading={t('forms.event.results')}>
        {search.isFetching && <p className="px-2 pb-1 text-[11px] text-muted-foreground">{t('forms.event.searching')}</p>}
        {search.data.map((event) => (
          <CommandItem
            key={event.id}
            value={event.id}
            onSelect={() => pick(event)}
            disabled={disabled}
            className="cursor-pointer gap-3 px-2 py-2 aria-selected:bg-accent"
          >
            <UserAvatar profile={{ id: event.id, display_name: event.title }} size="sm" shape="square" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">{event.title}</span>
              <span className="block truncate text-[12px] text-muted-foreground tabular-nums">{eventMeta(event, locale)}</span>
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {preselectMissing && (
        <p className="flex items-start gap-2 text-[12.5px] text-muted-foreground" role="status">
          <CalendarX2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('forms.event.notFound')}
        </p>
      )}
      {manualOpen ? (
        <ManualEventForm
          initialTitle={q.trim()}
          onCancel={() => setManualOpen(false)}
          onCreated={(row) => {
            setManualOpen(false);
            pick(eventRowToMarketEvent(row));
          }}
        />
      ) : (
        <Command
          shouldFilter={false}
          label={t('forms.event.label')}
          className={cn('overflow-hidden rounded-lg border bg-background', error ? 'border-destructive' : 'border-border')}
        >
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder={t('forms.event.searchPlaceholder')}
            disabled={disabled}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error || undefined}
            className="h-10 text-[14px]"
          />
          <CommandList className="max-h-[280px]">{body}</CommandList>
          <div className="border-t border-border px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2 text-[13px] text-muted-foreground hover:text-foreground"
              onClick={() => setManualOpen(true)}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('forms.event.add')}
            </Button>
          </div>
        </Command>
      )}
      {errorText && (
        <p id={errorId} className="text-[12px] font-medium text-down">
          {errorText}
        </p>
      )}
    </div>
  );
}
