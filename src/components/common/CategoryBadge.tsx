import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { EventCategory } from '../../lib/types';

/** Small grey chip with the category label ("Tónleikar"). */
export function CategoryBadge({ category, className }: { category: EventCategory | null | undefined; className?: string }) {
  const t = useT();
  if (!category) return null;
  return <span className={cn('mt-tag', className)}>{t(`category.${category}`)}</span>;
}
