import { useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Minus } from 'lucide-react';
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

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const COLOR_LINE = 'hsl(var(--chart-line))';
const COLOR_FILL = 'hsl(var(--chart-fill))';
const COLOR_MUTED = 'hsl(var(--muted-foreground))';
const COLOR_BORDER = 'hsl(var(--border))';
const COLOR_SURFACE = 'hsl(var(--card))';

function ChartTooltip({ active, payload, face }: TooltipProps<number, string> & { face: number | null }) {
  const t = useT();
  const [locale] = useLocale();
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point || point.min == null) return null;
  return (
    <div className="rounded-[6px] border border-border bg-surface-2 px-2.5 py-2 text-[12px] shadow-none">
      <div className="text-[11px] text-muted-foreground">
        {formatDate(new Date(point.ts), locale)} · {t('event.chart.tooltipForSale', { count: formatNumber(point.listings, locale) })}
      </div>
      <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums">
        {formatISK(point.min)}
        {face != null && <span className="ml-1.5 font-normal text-muted-foreground">{formatDelta(point.min, face, locale)}</span>}
      </div>
      {point.avg != null && (
        <div className="text-[11px] tabular-nums text-muted-foreground">
          {t('event.chart.legendAvg')} {formatISK(point.avg)}
        </div>
      )}
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t('event.chart.range.aria')} className="inline-flex h-8 items-center rounded-lg border border-border bg-card p-0.5">
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
              'h-7 min-w-[40px] rounded-[6px] px-2.5 text-[12px] font-semibold tabular-nums',
              pressed ? 'bg-surface-2 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`event.chart.range.${r}`)}
          </button>
        );
      })}
    </div>
  );
}

/** DESIGN.md PriceChart: step line + area of the lowest asking price, dashed face-value ceiling, table fallback. */
export function PriceChart({ snapshots, faceValue, range, onRangeChange, loading = false, error, retry, lastSold, className }: PriceChartProps) {
  const t = useT();
  const [locale] = useLocale();
  const wide = useMediaQuery('(min-width: 640px)');

  const points = useMemo(() => toChartPoints(snapshots), [snapshots]);
  const inRange = useMemo(() => filterByRange(points, range), [points, range]);
  const priced = countPriced(inRange);
  const current = lastPrice(inRange);
  const change = priceChange(inRange);
  const domain = useMemo(() => chartYDomain(inRange, faceValue), [inRange, faceValue]);
  const ticks = useMemo(() => pickTicks(inRange, wide ? 5 : 3), [inRange, wide]);
  const lastPoint = [...inRange].reverse().find((p) => p.min != null) ?? null;
  const newest = points.length ? points[points.length - 1] : null;

  const changeTone = change == null ? '' : change.diff < 0 ? 'text-up' : change.diff > 0 ? 'text-muted-foreground' : 'text-muted-foreground';
  const ChangeIcon = change == null ? Minus : change.diff < 0 ? ArrowDown : change.diff > 0 ? ArrowUp : Minus;

  return (
    <section className={cn('mt-panel', className)} aria-labelledby="mt-chart-h">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-[14px] py-3">
        <h2 id="mt-chart-h" className="text-[14px] font-semibold">
          {t('event.chart.title')}
        </h2>
        {newest && (
          <span className="text-[12px] text-muted-foreground">{t('event.chart.lastPoint', { date: formatShortDate(new Date(newest.ts), locale) })}</span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 px-[14px] pt-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums" data-testid="chart-current">
            {current != null ? formatISK(current) : '—'}
          </span>
          {change && (
            <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium tabular-nums', changeTone)} data-testid="chart-change">
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

      <div className="px-[6px] pt-2 sm:px-[10px]">
        {loading ? (
          <Skeleton className="h-[214px] w-full bg-surface-2 sm:h-[250px]" aria-label={t('event.chart.loading')} />
        ) : error !== undefined && error !== null ? (
          <ErrorState error={error} retry={retry} className="my-2" />
        ) : priced < 2 ? (
          <div className="relative flex h-[214px] items-center justify-center sm:h-[250px]" role="status">
            {faceValue != null && (
              <div className="absolute left-2 right-2 top-6 border-t border-dashed border-muted-foreground/70">
                <span className="mt-1 inline-block text-[11px] text-muted-foreground">
                  {t('event.chart.refLabel', { price: formatISK(faceValue) })}
                </span>
              </div>
            )}
            <div className="text-center">
              <p className="text-[13px] font-medium text-muted-foreground">{t('event.chart.empty')}</p>
              <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">{t('event.chart.emptyBody')}</p>
            </div>
          </div>
        ) : (
          <div className="h-[214px] w-full sm:h-[250px]" role="img" aria-label={t('event.chart.ariaLabel')} data-testid="chart-plot">
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
                  tick={{ fontSize: 11, fill: COLOR_MUTED, fontFamily: MONO }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  orientation="right"
                  domain={domain}
                  tickFormatter={(v: number) => formatNumber(v, 'is')}
                  tick={{ fontSize: 11, fill: COLOR_MUTED, fontFamily: MONO }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<ChartTooltip face={faceValue} />}
                  cursor={{ stroke: COLOR_MUTED, strokeDasharray: '3 3' }}
                  isAnimationActive={false}
                />
                {faceValue != null && (
                  <ReferenceLine
                    y={faceValue}
                    stroke={COLOR_MUTED}
                    strokeDasharray="3 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: t('event.chart.refLabel', { price: formatISK(faceValue) }),
                      position: 'insideTopLeft',
                      fill: COLOR_MUTED,
                      fontSize: 11,
                    }}
                  />
                )}
                <Area type="stepAfter" dataKey="min" stroke="none" fill={COLOR_FILL} fillOpacity={0.1} isAnimationActive={false} connectNulls />
                <Line
                  type="stepAfter"
                  dataKey="avg"
                  stroke={COLOR_MUTED}
                  strokeWidth={1.5}
                  strokeDasharray="2 3"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
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

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-[14px] py-3 text-[12px] text-muted-foreground">
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t('event.chart.footNote')}</span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded bg-chart-line" />
            {t('event.chart.legendMin')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="inline-block w-3 border-t border-dashed border-muted-foreground" />
            {t('event.chart.legendAvg')}
          </span>
        </span>
        {faceValue != null && <span className="tabular-nums">{t('event.chart.footCap', { price: formatISK(faceValue) })}</span>}
      </div>

      {lastSold && (
        <p className="border-t border-border px-[14px] py-2 text-[12px] tabular-nums text-muted-foreground">
          {t('event.chart.lastSold', { price: formatISK(lastSold.price), date: formatDate(lastSold.at, locale) })}
        </p>
      )}

      {inRange.length > 0 && (
        <details className="group border-t border-border px-[14px] py-2 text-[12px]">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm py-1 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
            {t('event.chart.showTable')}
          </summary>
          <table className="mt-2 w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
                <th scope="col" className="py-1.5 text-left font-semibold">
                  {t('event.chart.th.day')}
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  {t('event.chart.th.min')}
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  {t('event.chart.th.avg')}
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  {t('event.chart.th.delta')}
                </th>
              </tr>
            </thead>
            <tbody>
              {inRange.map((p) => (
                <tr key={p.date} className="border-b border-border last:border-0">
                  <td className="py-1.5 tabular-nums">{formatShortDate(new Date(p.ts), locale)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatISK(p.min)}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatISK(p.avg)}</td>
                  <td className="py-1.5 text-right">
                    {p.min != null && faceValue != null ? <PriceDelta asking={p.min} face={faceValue} className="text-[12px]" /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
