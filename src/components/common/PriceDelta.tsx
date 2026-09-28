import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDeltaPct, priceDelta } from '../../lib/format';

type PriceDeltaProps = {
  asking: number | null | undefined;
  face: number | null | undefined;
  /** Hide the words ("undir miðaverði") below `sm`, keep the percentage. */
  short?: boolean;
  /** Pill style instead of inline text. */
  pill?: boolean;
  className?: string;
};

/** "−17% undir miðaverði": green below face value, muted at it, red above. Nothing when face value is unknown. */
export function PriceDelta({ asking, face, short = false, pill = false, className }: PriceDeltaProps) {
  const t = useT();
  const [locale] = useLocale();
  if (asking == null || face == null || face <= 0) return null;
  const { kind } = priceDelta(asking, face);
  const tone = kind === 'below' ? 'text-up' : kind === 'above' ? 'text-down' : 'text-muted-foreground';
  const pillTone = kind === 'below' ? 'bg-up/10' : kind === 'above' ? 'bg-down/10' : 'bg-secondary';
  const words = t(`delta.${kind}`);
  const pct = kind === 'at' ? null : formatDeltaPct(asking, face);
  return (
    <span
      className={cn(
        'whitespace-nowrap text-[13px] font-medium tabular-nums',
        tone,
        pill && cn('inline-flex h-[22px] items-center rounded-full px-2 text-[12px] font-semibold', pillTone),
        className,
      )}
      data-kind={kind}
      lang={locale}
    >
      {pct && <span>{pct}</span>}
      <span className={cn(pct && 'ml-1', short && 'hidden sm:inline')}>{words}</span>
    </span>
  );
}
