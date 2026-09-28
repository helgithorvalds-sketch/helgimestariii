import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatRating } from '../../lib/format';

type RatingStarsProps = {
  value: number | null | undefined;
  count?: number | null;
  /** `sm` (default): one star + "4,9" + "(12)". `lg`: five 16px stars + number (profile header). */
  size?: 'sm' | 'lg';
  /** Below this many ratings the component shows "Nýr notandi" instead (default 3). */
  minCount?: number;
  className?: string;
};

/** Blue star, dark number, muted count. */
export function RatingStars({ value, count, size = 'sm', minCount = 3, className }: RatingStarsProps) {
  const t = useT();
  const [locale] = useLocale();
  const n = count ?? 0;
  if (value == null || n < minCount) {
    return (
      <span className={cn('text-[13px] text-muted-foreground', className)} data-testid="rating-new-user">
        {t('rating.newUser')}
      </span>
    );
  }
  const label = t('rating.aria', { value: formatRating(value, locale), count: n });
  if (size === 'lg') {
    const rounded = Math.round(value);
    return (
      <span className={cn('inline-flex items-center gap-2', className)} role="img" aria-label={label}>
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={cn('h-4 w-4', i <= rounded ? 'fill-primary text-primary' : 'fill-transparent text-border')} />
          ))}
        </span>
        <span className="text-base font-semibold tabular-nums">{formatRating(value, locale)}</span>
        <span className="text-sm tabular-nums text-muted-foreground">({n})</span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px]', className)} role="img" aria-label={label}>
      <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
      <span className="font-medium tabular-nums text-foreground">{formatRating(value, locale)}</span>
      <span className="tabular-nums text-muted-foreground">({n})</span>
    </span>
  );
}
