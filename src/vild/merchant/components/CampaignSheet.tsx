/**
 * Create or edit a campaign: a rule that only runs on certain weekdays,
 * hours or dates. Templates prefill it; the preview sentence says what it
 * will do in plain Icelandic before it is saved.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Button, Sheet } from '../../components/kit';
import { errorMessage } from '../../data';
import { useSaveRule } from '../../lib/queries';
import type { Product } from '../../lib/types';
import { emptyRule, rateLabel, scheduleLabel, scopeLabel, suggestName, WEEKDAY_LONG, WEEKDAY_SHORT, type RuleDraft } from '../lib/rules';
import { ExampleRow, RatePicker, ScopePicker } from './ruleBits';
import { Field, TextInput } from './ui';

export type CampaignSheetProps = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  products: Product[];
  initial?: Partial<RuleDraft> | null;
};

function campaignDefaults(merchantId: string): RuleDraft {
  return { ...emptyRule(merchantId), scope: 'merchant', categoryId: null, ratePct: 20, weekdays: [1, 2, 3, 4, 5], hoursFrom: '11:00', hoursTo: '14:00' };
}

export function CampaignSheet({ open, onClose, merchantId, products, initial }: CampaignSheetProps) {
  const [draft, setDraft] = useState<RuleDraft>(() => ({ ...campaignDefaults(merchantId), ...initial }));
  const [customName, setCustomName] = useState(false);
  const save = useSaveRule(merchantId);

  useEffect(() => {
    if (!open) return;
    setDraft({ ...campaignDefaults(merchantId), ...initial });
    setCustomName(Boolean(initial?.name) && Boolean(initial?.id));
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (p: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...p }));
  const allDay = !draft.hoursFrom;
  const editing = Boolean(draft.id);
  const suggested = useMemo(() => initial?.name && !initial.id ? initial.name : suggestName(draft, products), [draft, products, initial]);
  const name = customName ? draft.name : suggested;
  const valid = (draft.scope === 'merchant' || (draft.scope === 'category' && draft.categoryId) || (draft.scope === 'product' && draft.productId)) && (allDay || (draft.hoursFrom && draft.hoursTo && draft.hoursFrom < draft.hoursTo));

  const toggleDay = (d: number) => {
    const cur = draft.weekdays ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
    patch({ weekdays: next.length === 0 || next.length === 7 ? null : next });
  };

  const preview = useMemo(() => {
    const who = draft.scope === 'merchant' ? 'allar vörur' : scopeLabel(draft, products, { prefix: false }).toLowerCase();
    const when = scheduleLabel(draft).replace(/^./, (c) => c.toLowerCase());
    const dates = draft.startsAt || draft.endsAt ? ` (${draft.startsAt ? `frá ${draft.startsAt}` : ''}${draft.startsAt && draft.endsAt ? ' ' : ''}${draft.endsAt ? `til ${draft.endsAt}` : ''})` : '';
    return `${rateLabel(draft)} til baka af ${who}, ${when}${dates}.`;
  }, [draft, products]);

  const submit = async () => {
    if (!valid) return;
    try {
      await save.mutateAsync({ ...draft, name: name.trim() || suggested, hoursTo: allDay ? null : draft.hoursTo });
      toast.success(editing ? 'Herferð uppfærð' : 'Herferð vistuð', { description: preview });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Breyta herferð' : 'Ný herferð'} className="md:max-w-[560px]">
      <div className="space-y-5 pb-2 pt-1">
        <Field label="Heiti" htmlFor="campaign-name">
          <TextInput
            id="campaign-name"
            value={name}
            onChange={(e) => {
              setCustomName(true);
              patch({ name: e.target.value });
            }}
            onBlur={() => {
              if (!draft.name.trim()) setCustomName(false);
            }}
          />
        </Field>

        <ScopePicker draft={draft} onChange={patch} products={products} allowAll />
        <RatePicker draft={draft} onChange={patch} />

        <Field label="Vikudagar" hint="Enginn valinn = alla daga.">
          <div className="flex gap-1.5" role="group" aria-label="Vikudagar">
            {WEEKDAY_SHORT.map((label, i) => {
              const d = i + 1;
              const on = (draft.weekdays ?? []).includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_LONG[i]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'vild-num flex h-11 flex-1 items-center justify-center rounded-xl border text-[15px] font-semibold transition-colors',
                    on ? 'border-[hsl(var(--green-500))] bg-[hsl(var(--mint-50))] text-[hsl(var(--green-700))]' : 'border-border bg-white text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Tími dags">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border px-3.5 text-[14px] font-medium">
              <Switch checked={allDay} onCheckedChange={(v) => patch(v ? { hoursFrom: null, hoursTo: null } : { hoursFrom: '11:00', hoursTo: '14:00' })} aria-label="Allan daginn" />
              Allan daginn
            </label>
            {!allDay && (
              <div className="flex items-center gap-2">
                <TextInput type="time" value={draft.hoursFrom ?? ''} onChange={(e) => patch({ hoursFrom: e.target.value })} aria-label="Frá" className="vild-num w-[120px]" />
                <span className="text-muted-foreground" aria-hidden="true">
                  –
                </span>
                <TextInput type="time" value={draft.hoursTo ?? ''} onChange={(e) => patch({ hoursTo: e.target.value })} aria-label="Til" className="vild-num w-[120px]" />
              </div>
            )}
          </div>
        </Field>

        <Field label="Tímabil (valfrjálst)" hint="Tómt = gildir þar til þú slekkur á henni.">
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="date" value={draft.startsAt?.slice(0, 10) ?? ''} onChange={(e) => patch({ startsAt: e.target.value || null })} aria-label="Byrjar" className="vild-num" />
            <TextInput type="date" value={draft.endsAt?.slice(0, 10) ?? ''} onChange={(e) => patch({ endsAt: e.target.value ? `${e.target.value}T23:59:59` : null })} aria-label="Endar" className="vild-num" />
          </div>
        </Field>

        <div className="rounded-xl border border-[hsl(var(--mint-100))] bg-[hsl(var(--mint-50))] px-4 py-3">
          <p className="vild-eyebrow mb-1">Svona virkar hún</p>
          <p className="text-[15px] font-semibold text-[hsl(var(--green-700))]" aria-live="polite">
            {preview}
          </p>
        </div>
        <ExampleRow draft={draft} products={products} />

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hætta við
          </Button>
          <Button onClick={submit} loading={save.isPending} disabled={!valid} className="flex-1">
            {editing ? 'Vista breytingar' : 'Vista herferð'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
