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

/**
 * "Raða eftir" + shadcn Select (34px) with the dative options from dict/common
 * (Dagsetningu · Eftirspurn · Lægsta verði). The label is sr-only on phones.
 */
export function SortMenu({ value, onChange, className }: SortMenuProps) {
  const t = useT();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={SORT_ID} className="sr-only whitespace-nowrap text-[12.5px] text-muted-foreground sm:not-sr-only">
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
          className="h-[34px] w-auto min-w-[120px] max-w-[132px] gap-1.5 rounded-[6px] border-border bg-card px-2.5 text-[12.5px] font-medium text-foreground sm:max-w-[180px]"
        >
          <SelectValue>{t(`sort.${value}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {MARKET_SORTS.map((s) => (
            <SelectItem key={s} value={s} className="text-[13px]">
              {t(`sort.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SortMenu;
