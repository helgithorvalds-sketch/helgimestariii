import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDeltaPct, priceDelta } from '../../lib/format';

type PriceDeltaProps = {
  asking: number | null | undefined;
  face: number | null | undefined;
  /** Hide the words ("undir miðaverði") below `sm`, keep the percentage. */
  short?: boolean;
  /** Pill style (DESIGN badge) instead of inline text. */
  pill?: boolean;
  className?: string;
};

/** "−17% undir miðaverði" in up / muted / down colour. Renders nothing when face value is unknown. */
export function PriceDelta({ asking, face, short = false, pill = false, className }: PriceDeltaProps) {
  const t = useT();
  const [locale] = useLocale();
  if (asking == null || face == null || face <= 0) return null;
  const { kind } = priceDelta(asking, face);
  const tone = kind === 'below' ? 'text-up' : kind === 'above' ? 'text-down' : 'text-muted-foreground';
  const pillTone = kind === 'below' ? 'bg-up/10' : kind === 'above' ? 'bg-down/10' : 'bg-surface-2';
  const words = t(`delta.${kind}`);
  const pct = kind === 'at' ? null : formatDeltaPct(asking, face);
  return (
    <span
      className={cn(
        'whitespace-nowrap text-[12px] font-medium tabular-nums',
        tone,
        pill && cn('inline-flex h-[18px] items-center rounded-[4px] px-1.5 text-[11px] font-semibold', pillTone),
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
