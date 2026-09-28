import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDateTime, formatISK } from '../../lib/format';
import type { MarketEvent } from '../../lib/types';
import { EventThumb } from '../market/EventThumb';
import { eventMeta } from '../market/helpers';

export type MapEventListProps = {
  placed: MarketEvent[];
  unplaced: MarketEvent[];
  selectedId: string | null;
  onSelect: (event: MarketEvent) => void;
  className?: string;
};

function Row({ event, selected, onSelect }: { event: MarketEvent; selected: boolean; onSelect: (e: MarketEvent) => void }) {
  const t = useT();
  const [locale] = useLocale();
  const hasTickets = event.min_ask != null && (event.tickets_available ?? 0) > 0;
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(event)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
          selected ? 'bg-accent' : 'hover:bg-secondary',
        )}
        data-testid="map-list-item"
      >
        <EventThumb event={event} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight">{event.title}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{eventMeta(event, formatDateTime(event.starts_at, locale))}</span>
          <span className={cn('mt-0.5 block text-[13px] tabular-nums', hasTickets ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {hasTickets ? t('home.card.from', { price: formatISK(event.min_ask) }) : t('home.card.noListings')}
          </span>
        </span>
      </button>
    </li>
  );
}

/** The selected day's events beside (lg) or under (phones) the map; unplaced events at the end. */
export function MapEventList({ placed, unplaced, selectedId, onSelect, className }: MapEventListProps) {
  const t = useT();
  return (
    <nav aria-label={t('map.list.label')} className={cn('px-2 py-2', className)}>
      <ul className="space-y-0.5">
        {placed.map((event) => (
          <Row key={event.id} event={event} selected={event.id === selectedId} onSelect={onSelect} />
        ))}
      </ul>
      {unplaced.length > 0 && (
        <>
          <h3 className="mt-4 px-3 pb-1 text-[13px] font-semibold text-muted-foreground">{t('map.list.unknown')}</h3>
          <ul className="space-y-0.5" data-testid="map-list-unplaced">
            {unplaced.map((event) => (
              <Row key={event.id} event={event} selected={event.id === selectedId} onSelect={onSelect} />
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
