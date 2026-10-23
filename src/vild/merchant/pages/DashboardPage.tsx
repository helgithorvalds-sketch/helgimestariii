import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { ChipButton, CreditTag, ErrorState, ProductImage, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatDate, formatISK, formatNumber, formatPct } from '../../lib/format';
import { useMerchantStats, useProducts } from '../../lib/queries';
import type { MerchantStats } from '../../lib/types';
import { PageHeader, Panel, PanelHeader, ShareBar, Table, Td, Th } from '../components/ui';
import { useMerchant } from '../lib/useMerchant';

const PERIODS = [7, 30, 90] as const;
const GREEN = '#0C5C3B';
const MINT = '#B4FF9B';
const AMBER = '#B07A1C';
const MUTED = '#596660';

/** First half vs second half of the period, as a signed percentage. */
function halfDelta(daily: MerchantStats['daily'], key: 'revenue' | 'issued' | 'redeemed'): number | null {
  if (daily.length < 4) return null;
  const mid = Math.floor(daily.length / 2);
  const a = daily.slice(0, mid).reduce((s, d) => s + d[key], 0);
  const b = daily.slice(mid).reduce((s, d) => s + d[key], 0);
  if (!a) return null;
  return ((b - a) / a) * 100;
}

function Delta({ value, suffix = 'síðari helmingur á móti fyrri' }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-[12px] text-muted-foreground">—</span>;
  const up = value >= 0;
  return (
    <span className="text-[12px] text-muted-foreground">
      <span className={up ? 'vild-num font-semibold text-[hsl(var(--success))]' : 'vild-num font-semibold text-destructive'}>
        {up ? '+' : '−'}
        {formatPct(Math.abs(value))}
      </span>{' '}
      <span className="hidden sm:inline">{suffix}</span>
    </span>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="vild-num mt-1 whitespace-nowrap text-[20px] font-extrabold leading-none tracking-[-0.02em] sm:text-[26px]">{value}</p>
      <p className="mt-1.5">{delta === undefined ? <span className="text-[12px] text-muted-foreground">af öllum kaupum</span> : <Delta value={delta} />}</p>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = { revenue: 'Sala', issued: 'Inneign veitt', redeemed: 'Inneign nýtt' };
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-md)]">
      <p className="font-semibold">{formatDate(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="mt-0.5 flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
            {names[String(p.dataKey)] ?? p.name}
          </span>
          <span className="vild-num font-semibold text-foreground">{formatISK(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

function RevenueChart({ daily, showCredit }: { daily: MerchantStats['daily']; showCredit: boolean }) {
  const tick = { fontFamily: 'Figtree, sans-serif', fontSize: 12, fill: MUTED, fontVariantNumeric: 'tabular-nums' } as const;
  const every = Math.max(1, Math.round(daily.length / 6));
  return (
    <div className="h-[260px] w-full" role="img" aria-label="Dagleg sala yfir tímabilið">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vild-rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={MINT} stopOpacity={0.55} />
              <stop offset="100%" stopColor={MINT} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E0E5DE" strokeWidth={1} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={tick} interval="preserveStartEnd" minTickGap={every > 1 ? 56 : 40} tickFormatter={(d: string) => formatDate(d).replace(/^\w+\.\s/, '')} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={tick} width={56} tickFormatter={(v: number) => (v >= 1_000_000 ? `${formatNumber(v / 1_000_000, 1)} m` : `${formatNumber(Math.round(v / 1000))} þ.`)} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E0E5DE', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="revenue" stroke={GREEN} strokeWidth={2} fill="url(#vild-rev)" isAnimationActive={false} activeDot={{ r: 4, fill: GREEN, stroke: '#fff', strokeWidth: 2 }} />
          {showCredit && <Line type="monotone" dataKey="issued" stroke={AMBER} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: AMBER, stroke: '#fff', strokeWidth: 2 }} />}
          {showCredit && <Line type="monotone" dataKey="redeemed" stroke={MUTED} strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: MUTED, stroke: '#fff', strokeWidth: 2 }} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const { merchantId, merchant } = useMerchant();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [showCredit, setShowCredit] = useState(false);
  const stats = useMerchantStats(merchantId || null, days);
  const products = useProducts(merchantId || undefined);

  useEffect(() => {
    document.title = 'Yfirlit · VILD fyrirtæki';
  }, []);

  const s = stats.data;
  const deltas = useMemo(() => (s ? { revenue: halfDelta(s.daily, 'revenue'), issued: halfDelta(s.daily, 'issued'), redeemed: halfDelta(s.daily, 'redeemed') } : null), [s]);
  const maxLoc = s ? Math.max(...s.byLocation.map((l) => l.revenue), 1) : 1;

  return (
    <>
      <PageHeader
        title="Yfirlit"
        description={merchant ? `${merchant.name} · sala, inneign og endurkomur` : 'Sala, inneign og endurkomur'}
        action={
          <div className="flex gap-1.5" role="radiogroup" aria-label="Tímabil">
            {PERIODS.map((p) => (
              <ChipButton key={p} selected={p === days} onClick={() => setDays(p)} role="radio" aria-checked={p === days}>
                {p} dagar
              </ChipButton>
            ))}
          </div>
        }
      />

      {stats.isError && <ErrorState message={errorMessage(stats.error)} retry={() => stats.refetch()} className="mb-4" />}

      <Panel className="grid grid-cols-2 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-border md:[&>*:nth-child(odd)]:border-r-0 [&>*:nth-child(-n+2)]:border-t-0">
        {s && deltas ? (
          <>
            <Kpi label="Sala" value={formatISK(s.revenue)} delta={deltas.revenue} />
            <Kpi label="Inneign veitt" value={formatISK(s.creditIssued)} delta={deltas.issued} />
            <Kpi label="Inneign nýtt" value={formatISK(s.creditRedeemed)} delta={deltas.redeemed} />
            <Kpi label="Endurkomur" value={formatPct(s.returningCustomersPct)} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-2.5 h-7 w-32" />
              <Skeleton className="mt-2.5 h-3 w-24" />
            </div>
          ))
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelHeader
            title="Sala á dag"
            caption={s ? `${formatNumber(s.purchases)} kaup · meðalkarfa ${formatISK(s.avgBasket)}` : undefined}
            right={
              <label className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                Sýna inneign
                <Switch checked={showCredit} onCheckedChange={setShowCredit} aria-label="Sýna inneign á grafi" />
              </label>
            }
          />
          <div className="px-3 pb-3 pt-4">
            {s ? <RevenueChart daily={s.daily} showCredit={showCredit} /> : <Skeleton className="h-[260px] w-full" />}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-[12px] text-muted-foreground" aria-label="Skýringar">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GREEN }} aria-hidden="true" />
                Sala
              </span>
              {showCredit && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3.5 rounded" style={{ background: AMBER }} aria-hidden="true" />
                    Inneign veitt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-3.5 rounded border-t-2 border-dashed" style={{ borderColor: MUTED, background: 'transparent' }} aria-hidden="true" />
                    Inneign nýtt
                  </span>
                </>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Mest til baka" caption="Vörur sem gáfu mesta inneign" />
          <ol className="divide-y divide-border">
            {s
              ? s.topProducts.map((tp, i) => {
                  const p = products.data?.find((x) => x.id === tp.productId);
                  return (
                    <li key={tp.productId} className="flex items-center gap-3 px-5 py-3">
                      <span className="vild-num w-4 text-[13px] font-semibold text-muted-foreground" aria-hidden="true">
                        {i + 1}
                      </span>
                      <ProductImage src={p?.image} name={tp.name} className="h-10 w-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold leading-tight">{tp.name}</p>
                        <p className="vild-num text-[12px] text-muted-foreground">{formatNumber(tp.qty)} seld</p>
                      </div>
                      <CreditTag size="sm">{formatISK(tp.credit)}</CreditTag>
                    </li>
                  );
                })
              : [0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                  </li>
                ))}
          </ol>
        </Panel>
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Eftir stöðum" caption="Kaup og sala á hverjum stað yfir tímabilið" />
        {s ? (
          <Table>
            <thead>
              <tr>
                <Th>Staður</Th>
                <Th align="right">Kaup</Th>
                <Th align="right">Sala</Th>
                <Th className="hidden w-[30%] min-w-[140px] md:table-cell">Hlutur</Th>
              </tr>
            </thead>
            <tbody>
              {s.byLocation.map((l) => (
                <tr key={l.locationId}>
                  <Td className="font-semibold">{l.name}</Td>
                  <Td align="right" className="whitespace-nowrap">{formatNumber(l.purchases)}</Td>
                  <Td align="right" className="whitespace-nowrap">{formatISK(l.revenue)}</Td>
                  <Td className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <ShareBar pct={(l.revenue / maxLoc) * 100} />
                      <span className="vild-num w-10 shrink-0 text-right text-[12px] text-muted-foreground">{formatPct((l.revenue / s.revenue) * 100)}</span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
