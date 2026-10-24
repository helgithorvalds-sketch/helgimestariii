import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoinMark } from '../../components/brand';
import { AnimatedNumber, Button, ErrorState, ProductImage, Sheet } from '../../components/kit';
import { api, errorMessage } from '../../data';
import { formatISK, formatSignedISK } from '../../lib/format';
import { hapticSuccess } from '../../lib/haptics';
import { spring } from '../../lib/motion';
import { useLocations, useProducts, useRecordPurchase } from '../../lib/queries';
import type { LedgerEntry, Merchant } from '../../lib/types';
import { ToggleRow } from './ToggleRow';

const DEMO_PRODUCT_IDS = ['p_margherita', 'p_luna_burger', 'p_chicken_salad', 'p_pepperoni'];

type Result = { credit: number; spend: number; balance: number };

/**
 * "Prófa kaup": pretend to be the till. Pick a few products, a place, see
 * the live quote, confirm, and watch the pocket change. Mock only.
 */
export function DemoPurchaseSheet({ open, onClose, merchant, pocketLabel, balance }: { open: boolean; onClose: () => void; merchant: Merchant; pocketLabel: string; balance: number }) {
  const products = useProducts(merchant.id);
  const locations = useLocations(merchant.id);
  const [qty, setQty] = useState<Record<string, number>>({ p_margherita: 1 });
  const [locationId, setLocationId] = useState<string>('');
  const [useCredit, setUseCredit] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const record = useRecordPurchase();

  useEffect(() => {
    if (!locationId && locations.data?.length) setLocationId(locations.data.find((l) => l.posStatus === 'connected')?.id ?? locations.data[0].id);
  }, [locations.data, locationId]);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setUseCredit(false);
    record.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset the sheet each time it opens
  }, [open]);

  const demoProducts = useMemo(() => {
    const list = products.data ?? [];
    const picked = DEMO_PRODUCT_IDS.map((id) => list.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    return picked.length ? picked : list.filter((p) => p.creditAmount > 0).slice(0, 4);
  }, [products.data]);

  const items = demoProducts.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ product: p, qty: qty[p.id] }));
  const total = items.reduce((a, i) => a + i.product.price * i.qty, 0);
  const creditFull = items.reduce((a, i) => a + i.product.creditAmount * i.qty, 0);

  const quote = useQuery({
    queryKey: ['vild', 'quote', merchant.id, total, useCredit],
    queryFn: () => api().redeemQuote(merchant.id, total, useCredit),
    enabled: open && total > 0,
    placeholderData: (prev) => prev,
  });
  const applied = quote.data?.applied ?? 0;
  const toPay = quote.data?.toPay ?? total;
  const willEarn = total > 0 ? Math.round(creditFull * ((total - applied) / total)) : 0;

  const bump = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(9, (q[id] ?? 0) + d)) }));

  const confirm = async () => {
    if (!items.length || !locationId) return;
    try {
      const entries: LedgerEntry[] = await record.mutateAsync({ merchantId: merchant.id, locationId, items: items.map((i) => ({ productId: i.product.id, qty: i.qty })), useCredit });
      const earn = entries.find((e) => e.kind === 'earn');
      const spend = entries.find((e) => e.kind === 'spend');
      const last = entries[entries.length - 1];
      setResult({ credit: earn?.amount ?? 0, spend: -(spend?.amount ?? 0), balance: last?.balanceAfter ?? balance });
      void hapticSuccess();
    } catch {
      /* shown below */
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={result ? 'Kaup skráð' : 'Prófa kaup'}>
      {result ? (
        <div className="flex flex-col items-center pb-4 pt-2 text-center" role="status">
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, stiffness: 320, damping: 18 }}>
            <CoinMark size={88} title="VILD" />
          </motion.div>
          {result.credit > 0 ? (
            <p className="mt-5 text-[22px] font-extrabold tracking-[-0.02em]">
              <span className="vild-marker vild-num">{formatSignedISK(result.credit)}</span> komu inn á {pocketLabel}
            </p>
          ) : (
            <p className="mt-5 text-[22px] font-extrabold tracking-[-0.02em]">Þú borgaðir með inneigninni</p>
          )}
          {result.spend > 0 && (
            <p className="mt-2 text-[14px] text-muted-foreground">
              Inneign nýtt <span className="vild-num">{formatSignedISK(-result.spend)}</span>
            </p>
          )}
          <p className="vild-eyebrow mt-6">Inneign núna</p>
          <p className="mt-1 text-[36px] font-extrabold leading-none tracking-[-0.03em] text-[hsl(var(--green-500))]">
            <AnimatedNumber value={result.balance} />
          </p>
          <Button variant="primary" size="lg" full className="mt-8" onClick={onClose}>
            Loka
          </Button>
        </div>
      ) : (
        <div className="pb-2">
          <p className="text-[14px] text-muted-foreground">Hermdu eftir kassanum: veldu vörur, stað og staðfestu. Inneignin breytist eins og í alvörunni.</p>
          <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
            {demoProducts.map((p) => {
              const n = qty[p.id] ?? 0;
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <ProductImage src={p.image} name={p.name} className="h-11 w-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-tight">{p.name}</p>
                    <p className="vild-num mt-0.5 text-[12px] text-muted-foreground">
                      {formatISK(p.price)} · <span className="font-semibold text-[hsl(var(--green-500))]">{formatSignedISK(p.creditAmount)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Fækka ${p.name}`} onClick={() => bump(p.id, -1)} disabled={n === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-40">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className={cn('vild-num w-6 text-center text-[15px] font-bold', n === 0 && 'text-muted-foreground')} aria-live="polite">
                      {n}
                    </span>
                    <button type="button" aria-label={`Fjölga ${p.name}`} onClick={() => bump(p.id, 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--mint-100))] text-[hsl(var(--green-700))]">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <label className="mt-4 block">
            <span className="vild-eyebrow">Staður</span>
            <span className="relative mt-1.5 block">
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="h-11 w-full appearance-none rounded-xl border border-border bg-white pl-3 pr-10 text-[15px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {(locations.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            </span>
          </label>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border">
            <ToggleRow label="Nota inneign í þessum kaupum" caption={`Í boði: ${formatISK(balance)}`} checked={useCredit} onCheckedChange={setUseCredit} />
          </div>

          <div className="vild-num mt-4 rounded-2xl bg-secondary px-4 py-3 text-[14px]" aria-live="polite">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Samtals</span>
              <span className="font-semibold">{formatISK(total)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Inneign nýtt</span>
              <span className="font-semibold">{formatSignedISK(-applied)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Þú borgar</span>
              <span className="font-bold">{formatISK(toPay)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Færð til baka</span>
              <span className="vild-marker font-bold">{formatSignedISK(willEarn)}</span>
            </div>
          </div>

          {record.error && <ErrorState message={errorMessage(record.error)} className="mt-3" />}

          <Button variant="primary" size="lg" full className="mt-4" loading={record.isPending} disabled={!items.length || !locationId} onClick={() => void confirm()}>
            Staðfesta kaup · {formatISK(toPay)}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
