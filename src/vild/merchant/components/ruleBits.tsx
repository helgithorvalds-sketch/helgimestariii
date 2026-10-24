/**
 * Shared pieces of the rule and campaign sheets: pick what a rule applies to,
 * pick how much, and show a live example on a real product.
 */
import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_LABELS } from '../../data/seed';
import type { Product, ProductCategory, RewardRule } from '../../lib/types';
import { formatISK, formatSignedISK } from '../../lib/format';
import { CreditTag, ProductImage } from '../../components/kit';
import { Field, Segmented, Stepper, TextInput } from './ui';
import { creditUnder, exampleProductFor } from '../lib/rules';

type ScopeDraft = Pick<RewardRule, 'scope' | 'categoryId' | 'productId'>;

/** Category chips, only for categories the chain actually sells. */
export function CategoryPicker({ value, onChange, products }: { value: ProductCategory | null; onChange: (c: ProductCategory) => void; products: Product[] }) {
  const cats = useMemo(() => (Object.keys(CATEGORY_LABELS) as ProductCategory[]).filter((c) => products.some((p) => p.category === c)), [products]);
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Flokkur">
      {cats.map((c) => {
        const selected = c === value;
        const n = products.filter((p) => p.category === c).length;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c)}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium transition-colors',
              selected ? 'border-[hsl(var(--green-500))] bg-[hsl(var(--mint-50))] text-[hsl(var(--green-700))]' : 'border-border bg-white text-foreground hover:bg-secondary',
            )}
          >
            {CATEGORY_LABELS[c]}
            <span className="vild-num text-[12px] text-muted-foreground">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Searchable product list with thumbnails; single select. */
export function ProductPicker({ value, onChange, products }: { value: string | null; onChange: (id: string) => void; products: Product[] }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => !needle || p.name.toLowerCase().includes(needle) || CATEGORY_LABELS[p.category].toLowerCase().includes(needle));
  }, [products, q]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Leita að vöru" aria-label="Leita að vöru" className="pl-10" />
      </div>
      <ul className="mt-2 max-h-[232px] divide-y divide-border overflow-y-auto rounded-xl border border-border" role="listbox" aria-label="Vörur">
        {list.length === 0 && <li className="px-3.5 py-6 text-center text-[14px] text-muted-foreground">Engin vara passar við „{q}“.</li>}
        {list.map((p) => {
          const selected = p.id === value;
          return (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(p.id)}
                className={cn('flex w-full items-center gap-3 px-3 py-2 text-left transition-colors', selected ? 'bg-[hsl(var(--mint-50))]' : 'hover:bg-secondary')}
              >
                <ProductImage src={p.image} name={p.name} className="h-9 w-9 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold leading-tight">{p.name}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {CATEGORY_LABELS[p.category]} · <span className="vild-num">{formatISK(p.price)}</span>
                  </span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-[hsl(var(--green-500))]" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Scope: segmented Flokkur · Vara (+ Allt when allowed), then the matching picker. */
export function ScopePicker({ draft, onChange, products, allowAll = false }: { draft: ScopeDraft; onChange: (patch: Partial<ScopeDraft>) => void; products: Product[]; allowAll?: boolean }) {
  const options = [...(allowAll ? [{ value: 'merchant' as const, label: 'Allt' }] : []), { value: 'category' as const, label: 'Flokkur' }, { value: 'product' as const, label: 'Vara' }];
  return (
    <div className="space-y-3">
      <Field label="Gildir fyrir">
        <Segmented
          ariaLabel="Gildir fyrir"
          value={draft.scope}
          options={options}
          className="w-full"
          onChange={(scope) => {
            if (scope === 'merchant') onChange({ scope, categoryId: null, productId: null });
            else if (scope === 'category') onChange({ scope, productId: null, categoryId: draft.categoryId ?? (products[0]?.category ?? 'pizza') });
            else onChange({ scope, categoryId: null, productId: draft.productId ?? (products.find((p) => p.featured)?.id ?? products[0]?.id ?? null) });
          }}
        />
      </Field>
      {draft.scope === 'category' && <CategoryPicker value={draft.categoryId} onChange={(categoryId) => onChange({ categoryId })} products={products} />}
      {draft.scope === 'product' && <ProductPicker value={draft.productId} onChange={(productId) => onChange({ productId })} products={products} />}
    </div>
  );
}

type RateDraft = Pick<RewardRule, 'ratePct' | 'fixedAmount'>;

/** Prósenta (stepper) or Föst upphæð (ISK input). */
export function RatePicker({ draft, onChange, max = 100 }: { draft: RateDraft; onChange: (patch: RateDraft) => void; max?: number }) {
  const mode: 'pct' | 'fixed' = draft.fixedAmount != null ? 'fixed' : 'pct';
  return (
    <div className="space-y-3">
      <Field label="Hve mikið til baka">
        <Segmented
          ariaLabel="Tegund inneignar"
          value={mode}
          className="w-full"
          options={[
            { value: 'pct', label: 'Prósenta' },
            { value: 'fixed', label: 'Föst upphæð' },
          ]}
          onChange={(m) => (m === 'pct' ? onChange({ ratePct: draft.ratePct ?? 10, fixedAmount: null }) : onChange({ ratePct: null, fixedAmount: draft.fixedAmount ?? 500 }))}
        />
      </Field>
      {mode === 'pct' ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
          <span className="text-[14px] text-muted-foreground">Hlutfall af verði</span>
          <Stepper label="Hlutfall" value={draft.ratePct ?? 0} min={0} max={max} onChange={(ratePct) => onChange({ ratePct, fixedAmount: null })} format={(v) => `${v}%`} />
        </div>
      ) : (
        <div className="relative">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            step={10}
            value={draft.fixedAmount ?? ''}
            onChange={(e) => onChange({ ratePct: null, fixedAmount: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
            aria-label="Föst upphæð í krónum"
            className="vild-num pr-12"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">kr.</span>
        </div>
      )}
    </div>
  );
}

/** "Margherita 2.990 kr. → +299 kr. til baka" on a real product. */
export function ExampleRow({ draft, products, className, product: forced }: { draft: ScopeDraft & RateDraft; products: Product[]; className?: string; product?: Product }) {
  const product = forced ?? exampleProductFor(draft, products);
  if (!product) return null;
  const credit = creditUnder(product.price, draft);
  return (
    <div className={cn('flex items-center gap-3 rounded-xl bg-[hsl(var(--surface-2))] px-3.5 py-3', className)} aria-live="polite">
      <ProductImage src={product.image} name={product.name} className="h-10 w-10 shrink-0 rounded-lg" />
      <p className="min-w-0 flex-1 text-[14px] leading-snug">
        <span className="font-semibold">{product.name}</span> <span className="vild-num text-muted-foreground">{formatISK(product.price)}</span>
        <span className="mx-1.5 text-muted-foreground" aria-hidden="true">
          →
        </span>
        <CreditTag size="sm">{formatSignedISK(credit)}</CreditTag> <span className="text-muted-foreground">til baka</span>
      </p>
    </div>
  );
}
