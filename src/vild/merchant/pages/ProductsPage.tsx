/**
 * Every product with what it earns right now and where that number comes
 * from. The pencil opens the same RuleSheet as the credit page, prefilled.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Search } from 'lucide-react';
import { ChipButton, CreditTag, EmptyState, ErrorState, ProductImage, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { CATEGORY_LABELS, creditFor } from '../../data/seed';
import { formatISK, formatSignedISK } from '../../lib/format';
import { useProducts, useRewardRules } from '../../lib/queries';
import type { Product, ProductCategory } from '../../lib/types';
import { RuleSheet } from '../components/RuleSheet';
import { IconButton, PageHeader, Panel, Table, Td, TextInput, Th } from '../components/ui';
import { isTimeBoxed, ruleSourceLabel, type RuleDraft } from '../lib/rules';
import { useMerchant } from '../lib/useMerchant';

export default function ProductsPage() {
  const { merchantId } = useMerchant();
  const products = useProducts(merchantId || undefined);
  const rules = useRewardRules(merchantId || null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<ProductCategory | 'all'>('all');
  const [sheet, setSheet] = useState<{ open: boolean; initial: Partial<RuleDraft> | null }>({ open: false, initial: null });

  useEffect(() => {
    document.title = 'Vörur · VILD fyrirtæki';
  }, []);

  const cats = useMemo(() => (Object.keys(CATEGORY_LABELS) as ProductCategory[]).filter((c) => products.data?.some((p) => p.category === c)), [products.data]);

  const rows = useMemo(() => {
    const list = (products.data ?? []).filter((p) => (cat === 'all' || p.category === cat) && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase())));
    return list
      .map((p) => {
        const c = rules.data ? creditFor(p, rules.data) : null;
        return { p, source: c ? ruleSourceLabel(c.rule) : '—' };
      })
      .sort((a, b) => b.p.creditAmount - a.p.creditAmount || a.p.name.localeCompare(b.p.name, 'is'));
  }, [products.data, rules.data, q, cat]);

  const edit = (p: Product) => {
    const existing = rules.data?.find((r) => r.scope === 'product' && r.productId === p.id && !isTimeBoxed(r));
    setSheet({ open: true, initial: existing ?? { scope: 'product', productId: p.id, categoryId: null, ratePct: p.creditPct, fixedAmount: null } });
  };

  const loading = products.isLoading || rules.isLoading;

  return (
    <>
      <PageHeader title="Vörur" description="Hvað hver vara gefur til baka núna og hvaðan talan kemur." />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Leita að vöru" aria-label="Leita að vöru" className="pl-10" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label="Flokkur">
          <ChipButton selected={cat === 'all'} onClick={() => setCat('all')} role="radio" aria-checked={cat === 'all'}>
            Allt
          </ChipButton>
          {cats.map((c) => (
            <ChipButton key={c} selected={cat === c} onClick={() => setCat(c)} role="radio" aria-checked={cat === c}>
              {CATEGORY_LABELS[c]}
            </ChipButton>
          ))}
        </div>
      </div>

      {(products.isError || rules.isError) && <ErrorState message={errorMessage(products.error ?? rules.error)} retry={() => void (products.refetch(), rules.refetch())} className="mb-4" />}

      <Panel>
        {loading && (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && <EmptyState title="Engin vara fannst" body={q ? `Ekkert passar við „${q}“. Prófaðu annað orð.` : 'Engar vörur í þessum flokki.'} />}

        {/* desktop table */}
        {rows.length > 0 && (
          <Table className="hidden md:block">
            <thead>
              <tr>
                <Th>Vara</Th>
                <Th>Flokkur</Th>
                <Th align="right">Verð</Th>
                <Th align="right">Til baka núna</Th>
                <Th>Regla</Th>
                <Th className="w-12">
                  <span className="sr-only">Breyta</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, source }) => (
                <tr key={p.id} className="group">
                  <Td>
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.image} name={p.name} className="h-12 w-12 shrink-0 rounded-lg" />
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{CATEGORY_LABELS[p.category]}</Td>
                  <Td align="right">{formatISK(p.price)}</Td>
                  <Td align="right">
                    <CreditTag size="sm">{formatSignedISK(p.creditAmount)}</CreditTag>
                  </Td>
                  <Td className="text-muted-foreground">{source}</Td>
                  <Td>
                    <IconButton aria-label={`Breyta inneign fyrir ${p.name}`} onClick={() => edit(p)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* phone cards */}
        {rows.length > 0 && (
          <ul className="divide-y divide-border md:hidden">
            {rows.map(({ p, source }) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <ProductImage src={p.image} name={p.name} className="h-12 w-12 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">{p.name}</p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    <span className="vild-num">{formatISK(p.price)}</span> · {source}
                  </p>
                </div>
                <CreditTag size="sm">{formatSignedISK(p.creditAmount)}</CreditTag>
                <IconButton aria-label={`Breyta inneign fyrir ${p.name}`} onClick={() => edit(p)} className="-mr-2">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <RuleSheet open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} merchantId={merchantId} products={products.data ?? []} initial={sheet.initial} />
    </>
  );
}
