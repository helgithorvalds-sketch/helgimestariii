import { cn } from '@/lib/utils';
import { initialsOf, placeholderClass } from '../../lib/avatar';
import type { MarketEvent } from '../../lib/types';

export type EventThumbProps = {
  event: Pick<MarketEvent, 'id' | 'title' | 'image_url'>;
  /** 44 on cards, 30 in the trending strip. */
  size?: number;
  className?: string;
};

/**
 * Square event thumbnail: the image when there is one, otherwise the solid
 * `ph-n` tile with two initials (DESIGN.md §5). Always decorative — the title
 * is rendered as text right next to it.
 */
export function EventThumb({ event, size = 44, className }: EventThumbProps) {
  const radius = size <= 32 ? 'rounded-[6px]' : 'rounded-lg';
  const fontSize = size <= 32 ? 11 : 14;
  const style = { width: size, height: size };

  if (event.image_url) {
    return (
      <img
        src={event.image_url}
        alt=""
        width={size}
        height={size}
        style={style}
        loading="lazy"
        decoding="async"
        className={cn('shrink-0 bg-secondary object-cover', radius, className)}
        data-testid="event-thumb-image"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-bold leading-none tracking-[0.03em] text-foreground',
        radius,
        placeholderClass(event.id),
        className,
      )}
      data-testid="event-thumb-placeholder"
    >
      {initialsOf(event.title)}
    </span>
  );
}
