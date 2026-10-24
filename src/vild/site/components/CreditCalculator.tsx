import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber } from '../../components/kit';
import { formatISK, formatPct } from '../../lib/format';
import { springSnappy, useMotionAllowed } from '../../lib/motion';
import { DrawnMarker } from './DrawnMarker';
import { RangeInput } from './RangeInput';

type Mode = 'guest' | 'merchant';

/** All figures in the calculator count over the same 500 ms, so linked numbers settle together. */
const COUNT_MS = 500;

function Column({ title, rows, highlight, className }: { title: string; rows: { label: string; value: number; marker?: boolean; sign?: '+' | '−' }[]; highlight?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn('vild-eyebrow', !highlight && 'text-muted-foreground')}>{title}</p>
      <dl className="mt-3 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
            <dd className="vild-num mt-0.5 text-[22px] font-extrabold leading-none tracking-[-0.02em] sm:text-[26px]">
              {/* The sign sits inside the marker and is read with the amount: "+1.500 kr." */}
              {r.marker ? (
                <DrawnMarker>
                  <AnimatedNumber value={r.value} prefix={r.sign} duration={COUNT_MS} />
                </DrawnMarker>
              ) : (
                <AnimatedNumber value={r.value} prefix={r.sign} duration={COUNT_MS} />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * While a slider moves the result columns sit 2px low; when it stops they
 * spring back up. A motion value, so nothing re-renders per frame.
 */
function useSettle(deps: number[]) {
  const y = useMotionValue(0);
  const allowed = useMotionAllowed();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!allowed) return;
    const down = animate(y, 2, { duration: 0.08 });
    const t = window.setTimeout(() => animate(y, 0, springSnappy), 120);
    return () => {
      down.stop();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, allowed, y]);
  return y;
}

/** True while a slider is moving and for 400 ms after: the live region stays busy until the result rests. */
function useMoving(deps: number[]) {
  const [moving, setMoving] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMoving(true);
    const t = window.setTimeout(() => setMoving(false), 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return moving;
}

/**
 * The film's argument as a thing you can move. Guest mode: what a meal costs
 * with a discount versus with credit. Merchant mode: what 1.000 kr. of credit
 * costs the restaurant versus 1.000 kr. of discount.
 */
export function CreditCalculator({ mode = 'guest', className }: { mode?: Mode; className?: string }) {
  const [price, setPrice] = useState(3000);
  const [pct, setPct] = useState(50);
  const [credit, setCredit] = useState(1000);
  const [cogs, setCogs] = useState(30);

  const back = Math.round((price * pct) / 100);
  const costOfCredit = Math.round((credit * cogs) / 100);
  const deps = mode === 'guest' ? [price, pct] : [credit, cogs];
  const y = useSettle(deps);
  const moving = useMoving(deps);
  const results = 'mt-7 grid grid-cols-2 divide-x divide-border border-t border-border pt-6';
  // Screen readers hear the recomputed result once the slider rests (aria-busy while it moves), not every step on the way.
  const live = { 'aria-live': 'polite', 'aria-atomic': true, 'aria-busy': moving } as const;

  return (
    <div className={cn('rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7', className)} data-testid="credit-calculator">
      {mode === 'guest' ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
            <RangeInput label="Verð máltíðar" value={price} min={1000} max={10000} step={100} onChange={setPrice} format={formatISK} />
            <RangeInput label="Hlutfall til baka" value={pct} min={10} max={50} step={5} onChange={setPct} format={formatPct} />
          </div>
          <motion.div className={results} style={{ y }} {...live}>
            <Column
              title="Afsláttur"
              className="pr-4 sm:pr-6"
              rows={[
                { label: 'Gesturinn borgar', value: price - back },
                { label: 'Fer út úr kassanum, strax', value: back, sign: '−' },
              ]}
            />
            <Column
              title="Inneign"
              highlight
              className="pl-4 sm:pl-6"
              rows={[
                { label: 'Gesturinn borgar', value: price },
                { label: 'Kemur til baka sem inneign', value: back, marker: true, sign: '+' },
              ]}
            />
          </motion.div>
          <p className="mt-5 text-[13px] leading-snug text-muted-foreground">Sama upphæð. En inneignin bíður þín hjá sömu keðju og togar þig aftur. Afslátturinn er gleymdur um leið.</p>
        </>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
            <RangeInput label="Inneign sem gesturinn nýtir" value={credit} min={500} max={5000} step={100} onChange={setCredit} format={formatISK} />
            <RangeInput label="Hráefni, hlutfall af verði" value={cogs} min={20} max={60} step={5} onChange={setCogs} format={formatPct} />
          </div>
          <motion.div className={results} style={{ y }} {...live}>
            <Column
              title="Afsláttur"
              className="pr-4 sm:pr-6"
              rows={[
                { label: 'Gefið við kassann', value: credit },
                { label: 'Kostar þig í reiðufé', value: credit, sign: '−' },
              ]}
            />
            <Column
              title="Inneign"
              highlight
              className="pl-4 sm:pl-6"
              rows={[
                { label: 'Gefið sem inneign', value: credit, marker: true },
                { label: 'Kostar þig, í hráefni', value: costOfCredit, sign: '−' },
              ]}
            />
          </motion.div>
          <p className="mt-5 text-[13px] leading-snug text-muted-foreground">
            Inneign er krafa um mat hjá þér, ekki peningar. Þú borgar hráefnið þegar hún er nýtt – og gesturinn kom aftur til að nýta hana. Munurinn er{' '}
            <AnimatedNumber value={credit - costOfCredit} duration={COUNT_MS} className="font-semibold text-foreground" /> á hverjum gesti.
          </p>
        </>
      )}
    </div>
  );
}
