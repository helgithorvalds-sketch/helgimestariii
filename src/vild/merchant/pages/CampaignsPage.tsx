/**
 * Time-boxed rules: lunch deals, Tuesday deals, happy hour. Templates at the
 * top prefill the sheet; each card says in words when it runs and whether it
 * is running right now.
 */
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { useDeleteRule, useProducts, useRewardRules, useSaveRule } from '../../lib/queries';
import type { RewardRule } from '../../lib/types';
import { CampaignSheet } from '../components/CampaignSheet';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { IconButton, PageHeader, Panel } from '../components/ui';
import { isInWindow, isTimeBoxed, rateLabel, scheduleLabel, scopeLabel, type RuleDraft } from '../lib/rules';
import { useMerchant } from '../lib/useMerchant';

const TEMPLATES: { key: string; title: string; caption: string; draft: Partial<RuleDraft> }[] = [
  { key: 'lunch', title: 'Hádegistilboð', caption: 'Virka daga 11–14 · 30%', draft: { name: 'Hádegistilboð', scope: 'merchant', categoryId: null, productId: null, ratePct: 30, fixedAmount: null, weekdays: [1, 2, 3, 4, 5], hoursFrom: '11:00', hoursTo: '14:00' } },
  { key: 'tuesday', title: 'Þriðjudagstilboð', caption: 'Þriðjudagar, allan daginn · 20%', draft: { name: 'Þriðjudagstilboð', scope: 'merchant', categoryId: null, productId: null, ratePct: 20, fixedAmount: null, weekdays: [2], hoursFrom: null, hoursTo: null } },
  { key: 'happy', title: 'Happy hour', caption: 'Fös.–lau. 16–18 · 25%', draft: { name: 'Happy hour', scope: 'merchant', categoryId: null, productId: null, ratePct: 25, fixedAmount: null, weekdays: [5, 6], hoursFrom: '16:00', hoursTo: '18:00' } },
];

export default function CampaignsPage() {
  const { merchantId } = useMerchant();
  const rules = useRewardRules(merchantId || null);
  const products = useProducts(merchantId || undefined);
  const saveRule = useSaveRule(merchantId);
  const deleteRule = useDeleteRule(merchantId);
  const [sheet, setSheet] = useState<{ open: boolean; initial: Partial<RuleDraft> | null }>({ open: false, initial: null });
  const [toDelete, setToDelete] = useState<RewardRule | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.title = 'Herferðir · VILD fyrirtæki';
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const campaigns = useMemo(() => (rules.data ?? []).filter(isTimeBoxed), [rules.data]);

  const toggle = async (r: RewardRule, active: boolean) => {
    try {
      await saveRule.mutateAsync({ ...r, active });
      toast.success(active ? 'Herferð virk' : 'Herferð óvirk', { description: r.name });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const remove = async () => {
    if (!toDelete) return;
    try {
      await deleteRule.mutateAsync(toDelete.id);
      toast.success('Herferð eytt', { description: toDelete.name });
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Herferðir"
        description="Meiri inneign á ákveðnum tímum. Herferð vinnur alltaf fasta reglu á sama sviði."
        action={
          <Button onClick={() => setSheet({ open: true, initial: null })} disabled={!products.data}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ný herferð
          </Button>
        }
      />

      <div className="mb-5">
        <p className="vild-eyebrow mb-2">Sniðmát</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSheet({ open: true, initial: t.draft })}
              disabled={!products.data}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left transition-colors hover:border-[hsl(var(--green-500))] hover:bg-[hsl(var(--mint-50))] disabled:opacity-50"
            >
              <CalendarClock className="h-5 w-5 shrink-0 text-[hsl(var(--green-500))]" strokeWidth={1.75} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">{t.title}</span>
                <span className="block truncate text-[13px] text-muted-foreground">{t.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {rules.isError && <ErrorState message={errorMessage(rules.error)} retry={() => rules.refetch()} className="mb-4" />}
      {rules.isLoading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}
      {rules.data && campaigns.length === 0 && (
        <Panel>
          <EmptyState title="Engin herferð ennþá" body="Byrjaðu á sniðmáti hér fyrir ofan eða búðu til þína eigin." action={<Button size="sm" onClick={() => setSheet({ open: true, initial: null })}>Ný herferð</Button>} />
        </Panel>
      )}

      {campaigns.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {campaigns.map((r) => {
            const live = isInWindow(r, now);
            return (
              <Panel key={r.id} as="div" className={`flex flex-col px-5 py-4 ${r.active ? '' : 'opacity-80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-bold leading-tight tracking-tight">{r.name}</h2>
                    <p className="mt-0.5 text-[14px] text-muted-foreground">{scopeLabel(r, products.data)}</p>
                  </div>
                  <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} aria-label={`${r.name} virk`} disabled={saveRule.isPending} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="vild-num text-[22px] font-extrabold leading-none tracking-[-0.02em]">{rateLabel(r)}</span>
                  <span className="text-[14px] text-muted-foreground">til baka</span>
                  <span className="mx-1 text-border" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[14px] font-medium">{scheduleLabel(r)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  {live ? <Chip tone="mint">Í gangi núna</Chip> : r.active ? <Chip tone="neutral">Bíður næsta glugga</Chip> : <Chip tone="outline">Óvirk</Chip>}
                  <div className="-mr-2 flex items-center">
                    <IconButton aria-label={`Breyta ${r.name}`} onClick={() => setSheet({ open: true, initial: r })}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton aria-label={`Eyða ${r.name}`} onClick={() => setToDelete(r)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              </Panel>
            );
          })}
        </ul>
      )}

      <CampaignSheet open={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))} merchantId={merchantId} products={products.data ?? []} initial={sheet.initial} />
      <ConfirmSheet open={Boolean(toDelete)} onClose={() => setToDelete(null)} onConfirm={remove} title="Eyða herferð?" body={toDelete ? `${toDelete.name} hættir strax og kemur ekki aftur.` : undefined} confirmLabel="Eyða" destructive loading={deleteRule.isPending} />
    </>
  );
}
