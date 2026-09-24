import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Minus } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useLocale, useT } from '../../lib/i18n';
import { formatDate, formatDelta, formatISK, formatNumber, formatShortDate } from '../../lib/format';
import type { PriceSnapshot } from '../../lib/types';
import type { CompletedDealPrice } from '../../lib/api/events';
import { ErrorState } from '../common/ErrorState';
import { PriceDelta } from '../common/PriceDelta';
import {
  CHART_RANGES,
  chartYDomain,
  countPriced,
  filterByRange,
  lastPrice,
  pickTicks,
  priceChange,
  toChartPoints,
  type ChartPoint,
  type ChartRange,
} from './eventUtils';
import { useMediaQuery } from './useMediaQuery';

export type PriceChartProps = {
  snapshots: PriceSnapshot[] | undefined;
  faceValue: number | null;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
  /** The last completed sale (from mt_event_stats), shown as a caption. */
  lastSold?: CompletedDealPrice | null;
  className?: string;
};

const COLOR_LINE = 'hsl(var(--chart-line))';
const COLOR_FILL = 'hsl(var(--chart-fill))';
const COLOR_MUTED = 'hsl(var(--muted-foreground))';
const COLOR_BORDER = 'hsl(var(--border))';
const COLOR_SURFACE = 'hsl(var(--card))';

function ChartTooltip({ active, payload, face }: TooltipProps<number, string> & { face: number | null }) {
  const [locale] = useLocale();
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point || point.min == null) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] shadow-md">
      <div className="text-[12px] text-muted-foreground">{formatDate(new Date(point.ts), locale)}</div>
      <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums">
        {formatISK(point.min)}
        {face != null && <span className="ml-1.5 font-normal text-muted-foreground">{formatDelta(point.min, face, locale)}</span>}
      </div>
    </div>
  );
}

/** Simple pill toggles: Vika · Mánuður · Allt. */
function RangeSelector({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t('event.chart.range.aria')} className="inline-flex h-10 items-center gap-1 rounded-full bg-secondary p-1">
      {CHART_RANGES.map((r) => {
        const pressed = r === value;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={pressed}
            aria-label={t(`event.chart.range.${r}Aria`)}
            onClick={() => onChange(r)}
            className={cn(
              'h-8 rounded-full px-3 text-[13px] font-medium transition-colors',
              pressed ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`event.chart.range.${r}`)}
          </button>
        );
      })}
    </div>
  );
}

/** "Verðþróun": blue line of the lowest price on sale with the face-value line; collapsed by default on phones. */
export function PriceChart({ snapshots, faceValue, range, onRangeChange, loading = false, error, retry, lastSold, className }: PriceChartProps) {
  const t = useT();
  const [locale] = useLocale();
  const wide = useMediaQuery('(min-width: 640px)');
  const [openOnPhone, setOpenOnPhone] = useState(false);
  const expanded = wide || openOnPhone;

  const points = useMemo(() => toChartPoints(snapshots), [snapshots]);
  const inRange = useMemo(() => filterByRange(points, range), [points, range]);
  const priced = countPriced(inRange);
  const current = lastPrice(inRange);
  const change = priceChange(inRange);
  const domain = useMemo(() => chartYDomain(inRange, faceValue), [inRange, faceValue]);
  const ticks = useMemo(() => pickTicks(inRange, wide ? 5 : 3), [inRange, wide]);
  const lastPoint = [...inRange].reverse().find((p) => p.min != null) ?? null;
  const newest = points.length ? points[points.length - 1] : null;

  const changeTone = change != null && change.diff < 0 ? 'text-up' : 'text-muted-foreground';
  const ChangeIcon = change == null ? Minus : change.diff < 0 ? ArrowDown : change.diff > 0 ? ArrowUp : Minus;

  return (
    <section className={cn('mt-panel', className)} aria-labelledby="mt-chart-h" data-expanded={expanded || undefined}>
      <div className={cn('flex items-center justify-between gap-3 px-4 py-3', expanded && 'border-b border-border')}>
        <h2 id="mt-chart-h" className="text-[20px] font-semibold tracking-tight">
          {t('event.chart.title')}
        </h2>
        {!wide && (
          <button
            type="button"
            aria-expanded={openOnPhone}
            aria-controls="mt-chart-body"
            onClick={() => setOpenOnPhone((v) => !v)}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-[14px] font-medium text-primary hover:bg-accent"
          >
            {openOnPhone ? t('event.chart.hide') : t('event.chart.show')}
            <ChevronDown className={cn('h-4 w-4 transition-transform', openOnPhone && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded && (
        <div id="mt-chart-body">
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[24px] font-semibold leading-none tracking-tight tabular-nums" data-testid="chart-current">
                {current != null ? formatISK(current) : '—'}
              </span>
              {change && (
                <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium tabular-nums', changeTone)} data-testid="chart-change">
                  <ChangeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {change.diff === 0 ? (
                    t('event.chart.unchanged')
                  ) : (
                    <>
                      {change.diff < 0 ? '−' : '+'}
                      {formatISK(Math.abs(change.diff))} ({change.diff < 0 ? '−' : '+'}
                      {formatNumber(Math.abs(change.pct), locale, 1)}%)
                    </>
                  )}
                  <span className="font-normal text-muted-foreground">{t(`event.chart.period.${range}`)}</span>
                </span>
              )}
            </div>
            <RangeSelector value={range} onChange={onRangeChange} />
          </div>

          <div className="px-2 pt-2 sm:px-3">
            {loading ? (
              <Skeleton className="h-[220px] w-full rounded-lg bg-secondary sm:h-[260px]" aria-label={t('event.chart.loading')} />
            ) : error !== undefined && error !== null ? (
              <ErrorState error={error} retry={retry} className="my-2" />
            ) : priced < 2 ? (
              <div className="relative flex h-[220px] items-center justify-center sm:h-[260px]" role="status">
                {faceValue != null && (
                  <div className="absolute left-2 right-2 top-6 border-t border-dashed border-muted-foreground/60">
                    <span className="mt-1 inline-block text-[12px] text-muted-foreground">{t('event.chart.refLabel', { price: formatISK(faceValue) })}</span>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[15px] font-medium">{t('event.chart.empty')}</p>
                  <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">{t('event.chart.emptyBody')}</p>
                </div>
              </div>
            ) : (
              <div className="h-[220px] w-full sm:h-[260px]" role="img" aria-label={t('event.chart.ariaLabel')} data-testid="chart-plot">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={inRange} margin={{ top: 26, right: 4, bottom: 0, left: 4 }}>
                    <CartesianGrid horizontal vertical={false} stroke={COLOR_BORDER} />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      ticks={ticks}
                      tickFormatter={(v: number) => formatShortDate(new Date(v), locale)}
                      tick={{ fontSize: 12, fill: COLOR_MUTED }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      orientation="right"
                      domain={domain}
                      tickFormatter={(v: number) => formatNumber(v, 'is')}
                      tick={{ fontSize: 12, fill: COLOR_MUTED }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip content={<ChartTooltip face={faceValue} />} cursor={{ stroke: COLOR_MUTED, strokeDasharray: '3 3' }} isAnimationActive={false} />
                    {faceValue != null && (
                      <ReferenceLine
                        y={faceValue}
                        stroke={COLOR_MUTED}
                        strokeDasharray="4 4"
                        ifOverflow="extendDomain"
                        label={{
                          value: t('event.chart.refLabel', { price: formatISK(faceValue) }),
                          position: 'insideTopLeft',
                          fill: COLOR_MUTED,
                          fontSize: 12,
                        }}
                      />
                    )}
                    <Area type="stepAfter" dataKey="min" stroke="none" fill={COLOR_FILL} fillOpacity={0.08} isAnimationActive={false} connectNulls />
                    <Line
                      type="stepAfter"
                      dataKey="min"
                      stroke={COLOR_LINE}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: COLOR_LINE, stroke: COLOR_SURFACE, strokeWidth: 2 }}
                      isAnimationActive={false}
                      connectNulls
                    />
                    {lastPoint && lastPoint.min != null && (
                      <ReferenceDot
                        x={lastPoint.ts}
                        y={lastPoint.min}
                        r={4}
                        fill={COLOR_LINE}
                        stroke={COLOR_SURFACE}
                        strokeWidth={2}
                        isFront
                        label={{
                          value: formatISK(lastPoint.min),
                          position: 'top',
                          fill: 'hsl(var(--foreground))',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[13px] text-muted-foreground">
            <span>{t('event.chart.footNote')}</span>
            {newest && <span>· {t('event.chart.lastPoint', { date: formatShortDate(new Date(newest.ts), locale) })}</span>}
          </p>

          {lastSold && (
            <p className="border-t border-border px-4 py-2 text-[13px] tabular-nums text-muted-foreground">
              {t('event.chart.lastSold', { price: formatISK(lastSold.price), date: formatDate(lastSold.at, locale) })}
            </p>
          )}

          {inRange.length > 0 && (
            <details className="group border-t border-border px-4 py-2 text-[13px]">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm py-1 text-primary hover:underline">
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
                {t('event.chart.showTable')}
              </summary>
              <table className="mt-2 w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th scope="col" className="py-1.5 text-left font-medium">
                      {t('event.chart.th.day')}
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      {t('event.chart.th.min')}
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      {t('event.chart.th.delta')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inRange.map((p) => (
                    <tr key={p.date} className="border-b border-border last:border-0">
                      <td className="py-1.5 tabular-nums">{formatShortDate(new Date(p.ts), locale)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatISK(p.min)}</td>
                      <td className="py-1.5 text-right">
                        {p.min != null && faceValue != null ? <PriceDelta asking={p.min} face={faceValue} className="text-[13px]" /> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
