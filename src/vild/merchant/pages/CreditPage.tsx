/**
 * The key screen: pick the chain-wide credit rate with one big stepper, see
 * what it means on a real product, save. Exceptions (a category or product
 * that earns something else) live below; campaigns are their own page.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button, CreditTag, EmptyState, ErrorState, ProductImage, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { creditFor } from '../../data/seed';
import { formatISK, formatSignedISK } from '../../lib/format';
import { useDeleteRule, useProducts, useRewardRules, useSaveRule, useUpdateMerchant } from '../../lib/queries';
import type { RewardRule } from '../../lib/types';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { RuleSheet } from '../components/RuleSheet';
import { IconButton, PageHeader, Panel, PanelHeader, Stepper } from '../components/ui';
import { isTimeBoxed, rateLabel, scopeLabel, type RuleDraft } from '../lib/rules';
import { useMerchant } from '../lib/useMerchant';

const MARGIN_ASSUMPTION = 0.3; // share of a sale that is ingredients: an assumption, labelled as such in the UI

export default function CreditPage() {
  const { merchantId, merchant } = useMerchant();
  const products = useProducts(merchantId || undefined);
  const rules = useRewardRules(merchantId || null);
  const updateMerchant = useUpdateMerchant();
  const saveRule = useSaveRule(merchantId);
  const deleteRule = useDeleteRule(merchantId);

  const [rate, setRate] = useState<number | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; initial: Partial<RuleDraft> | null }>({ open: false, initial: null });
  const [toDelete, setToDelete] = useState<RewardRule | null>(null);

  useEffect(() => {
    document.title = 'Inneign · VILD fyrirtæki';
  }, []);
  useEffect(() => {
    if (merchant && rate === null) setRate(merchant.defaultRatePct);
  }, [merchant, rate]);

  const shownRate = rate ?? merchant?.defaultRatePct ?? 0;
  const dirty = merchant ? shownRate !== merchant.defaultRatePct : false;
  // The example must follow the base rate, so pick a product no product or category rule touches
  // (featured first), and compute it with the rule engine itself: the same creditFor() the Vörur table uses.
  const example = useMemo(() => {
    if (!products.data || !rules.data) return undefined;
    const list = products.data;
    const ruled = rules.data.filter((r) => r.active && r.scope !== 'merchant');
    const plain = list.filter((p) => !ruled.some((r) => (r.scope === 'product' ? r.productId === p.id : r.categoryId === p.category)));
    return plain.find((p) => p.featured) ?? plain[0] ?? list[0];
  }, [products.data, rules.data]);
  const { amount: exampleCredit, pct: examplePct } = useMemo(() => {
    if (!example) return { amount: 0, pct: shownRate };
    // the saved rules, with the always-on base rule at the rate on the stepper (campaigns left out: this is the base)
    const base: RewardRule = { id: 'example-base', merchantId, scope: 'merchant', categoryId: null, productId: null, ratePct: shownRate, fixedAmount: null, name: 'Grunninneign', startsAt: null, endsAt: null, weekdays: null, hoursFrom: null, hoursTo: null, active: true, createdAt: '' };
    const exampleRules = [...(rules.data ?? []).filter((r) => r.scope !== 'merchant' && !isTimeBoxed(r)), base];
    return creditFor(example, exampleRules);
  }, [example, rules.data, shownRate, merchantId]);

  const exceptions = useMemo(() => (rules.data ?? []).filter((r) => r.scope !== 'merchant' && !isTimeBoxed(r)), [rules.data]);

  const save = async () => {
    if (!merchant) return;
    try {
      await updateMerchant.mutateAsync({ id: merchant.id, patch: { defaultRatePct: shownRate } });
      toast.success('Grunninneign vistuð', { description: `${shownRate}% til baka af öllu sem ekki er með undantekningu.` });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggle = async (r: RewardRule, active: boolean) => {
    try {
      await saveRule.mutateAsync({ ...r, active });
      toast.success(active ? 'Undantekning virk' : 'Undantekning óvirk', { description: r.name });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteRule.mutateAsync(toDelete.id);
      toast.success('Undantekningu eytt', { description: `${toDelete.name} · varan fylgir nú grunninneign.` });
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Inneign" description="Hve mikið kemur til baka af hverjum kaupum. Þú borgar aðeins hráefnið í inneigninni." />

      {/* Hero: the one number that matters */}
      <Panel className="overflow-hidden">
        <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="vild-eyebrow">Grunninneign</p>
            <p className="mt-1 text-[15px] text-muted-foreground">Gildir um allar vörur sem eru ekki með undantekningu.</p>
            <div className="mt-5">
              {merchant ? <Stepper size="lg" label="Grunninneign" value={shownRate} min={0} max={50} onChange={setRate} format={(v) => `${v}%`} /> : <Skeleton className="h-14 w-[220px]" />}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant={dirty ? 'primary' : 'secondary'} onClick={save} loading={updateMerchant.isPending} disabled={!dirty || !merchant}>
                Vista
              </Button>
              {dirty && merchant && (
                <button type="button" onClick={() => setRate(merchant.defaultRatePct)} className="h-11 px-3 text-[14px] font-semibold text-muted-foreground hover:text-foreground">
                  Hætta við ({merchant.defaultRatePct}%)
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-[hsl(var(--surface-2))] p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-muted-foreground">Dæmi</p>
            {example ? (
              <div className="mt-3 flex items-center gap-3" aria-live="polite">
                <ProductImage src={example.image} name={example.name} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-bold leading-tight">{example.name}</p>
                  <p className="vild-num text-[14px] text-muted-foreground">{formatISK(example.price)}</p>
                </div>
              </div>
            ) : (
              <Skeleton className="mt-3 h-14 w-full" />
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-[14px] text-muted-foreground">Gesturinn fær</span>
              <CreditTag size="lg">{formatSignedISK(exampleCredit)}</CreditTag>
            </div>
          </div>
        </div>
      </Panel>

      {/* Exceptions */}
      <Panel className="mt-4">
        <PanelHeader
          title="Undantekningar"
          caption="Flokkar eða vörur sem gefa annað en grunninneign. Vara vinnur flokk, flokkur vinnur grunn."
          right={
            <Button size="sm" variant="secondary" onClick={() => setSheet({ open: true, initial: null })} disabled={!products.data}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Bæta við
            </Button>
          }
        />
        {rules.isError && <ErrorState message={errorMessage(rules.error)} retry={() => rules.refetch()} className="m-4" />}
        {rules.isLoading && (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {rules.data && exceptions.length === 0 && (
          <EmptyState title="Engar undantekningar" body="Allar vörur fylgja grunninneigninni. Bættu við undantekningu ef drykkir eiga t.d. ekki að gefa neitt." action={<Button size="sm" onClick={() => setSheet({ open: true, initial: null })}>Bæta við undantekningu</Button>} />
        )}
        {exceptions.length > 0 && (
          <ul className="divide-y divide-border">
            {exceptions.map((r) => {
              const product = r.scope === 'product' ? products.data?.find((p) => p.id === r.productId) : undefined;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  {product ? <ProductImage src={product.image} name={product.name} className="h-10 w-10 shrink-0 rounded-lg" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-[12px] font-bold text-muted-foreground">Fl.</span>}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-semibold leading-tight ${r.active ? '' : 'text-muted-foreground'}`}>{scopeLabel(r, products.data)}</p>
                    <p className="truncate text-[13px] text-muted-foreground">{r.name}</p>
                  </div>
                  <span className={`vild-num shrink-0 text-[15px] font-bold ${r.active ? '' : 'text-muted-foreground line-through'}`}>{rateLabel(r)}</span>
                  <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} aria-label={`${r.name} virk`} disabled={saveRule.isPending} />
                  <div className="hidden items-center sm:flex">
                    <IconButton aria-label={`Breyta ${r.name}`} onClick={() => setSheet({ open: true, initial: r })}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton aria-label={`Eyða ${r.name}`} onClick={() => setToDelete(r)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                  <IconButton aria-label={`Breyta ${r.name}`} onClick={() => setSheet({ open: true, initial: r })} className="sm:hidden">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* Explainer */}
      <Panel className="mt-4 px-5 py-5 sm:px-8">
        <h2 className="text-[17px] font-bold tracking-tight">Hvað þýðir þetta?</h2>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">
          Inneign kostar þig aðeins hráefnið. {example && merchant ? (
            <>
              <span className="vild-num font-semibold text-foreground">{examplePct}%</span> inneign af <span className="vild-num font-semibold text-foreground">{formatISK(example.price)}</span> {example.name} = <span className="vild-num font-semibold text-foreground">{formatISK(exampleCredit)}</span> inneign, sem kostar þig um{' '}
              <span className="vild-num font-semibold text-foreground">{formatISK(Math.round(exampleCredit * MARGIN_ASSUMPTION))}</span> í hráefni.
            </>
          ) : null}{' '}
          Gesturinn kemur aftur til að nýta hana og borgar þá fullt verð fyrir restina.
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">Forsenda: hráefni er 30% af söluverði. Þín tala getur verið önnur.</p>
      </Panel>

      <RuleSheet open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} merchantId={merchantId} products={products.data ?? []} initial={sheet.initial} />
      <ConfirmSheet open={Boolean(toDelete)} onClose={() => setToDelete(null)} onConfirm={remove} title="Eyða undantekningu?" body={toDelete ? `${scopeLabel(toDelete, products.data)} fylgir þá grunninneigninni (${merchant?.defaultRatePct ?? 0}%).` : undefined} confirmLabel="Eyða" destructive loading={deleteRule.isPending} />
    </>
  );
}
