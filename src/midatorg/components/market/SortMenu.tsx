import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useT } from '../../lib/i18n';
import type { MarketSort } from '../../lib/types';
import { MARKET_SORTS, isMarketSort } from './helpers';

export type SortMenuProps = {
  value: MarketSort;
  onChange: (sort: MarketSort) => void;
  className?: string;
};

const SORT_ID = 'mt-sort';

/** "Raða eftir" + a small select (Næst á dagskrá · Mest eftirspurn · Lægsta verð). The label is sr-only on phones. */
export function SortMenu({ value, onChange, className }: SortMenuProps) {
  const t = useT();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={SORT_ID} className="sr-only whitespace-nowrap text-[13px] text-muted-foreground sm:not-sr-only">
        {t('sort.label')}
      </label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (isMarketSort(v)) onChange(v);
        }}
      >
        <SelectTrigger
          id={SORT_ID}
          aria-label={t('sort.label')}
          className="h-10 w-auto min-w-[150px] gap-1.5 rounded-lg border-border bg-card px-3 text-[14px] font-medium text-foreground"
        >
          <SelectValue>{t(`sort.${value}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {MARKET_SORTS.map((s) => (
            <SelectItem key={s} value={s} className="text-[14px]">
              {t(`sort.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SortMenu;
