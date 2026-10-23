/**
 * Add or edit an always-on exception: a category or one product that earns
 * something other than the chain default. Time-boxed rules live in CampaignSheet.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Sheet } from '../../components/kit';
import { errorMessage } from '../../data';
import { useSaveRule } from '../../lib/queries';
import type { Product } from '../../lib/types';
import { emptyRule, suggestName, type RuleDraft } from '../lib/rules';
import { ExampleRow, RatePicker, ScopePicker } from './ruleBits';
import { Field, TextInput } from './ui';

export type RuleSheetProps = {
  open: boolean;
  onClose: () => void;
  merchantId: string;
  products: Product[];
  /** Existing rule to edit, or a partial draft to prefill (e.g. a product from the products page). */
  initial?: Partial<RuleDraft> | null;
};

export function RuleSheet({ open, onClose, merchantId, products, initial }: RuleSheetProps) {
  const [draft, setDraft] = useState<RuleDraft>(() => ({ ...emptyRule(merchantId), ...initial }));
  const [customName, setCustomName] = useState(false);
  const save = useSaveRule(merchantId);

  // Reset on every open so a stale draft never leaks between products.
  useEffect(() => {
    if (!open) return;
    const base = { ...emptyRule(merchantId), ...initial };
    setDraft(base);
    setCustomName(Boolean(initial?.name));
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggested = useMemo(() => suggestName(draft, products), [draft, products]);
  const name = customName ? draft.name : suggested;
  const editing = Boolean(draft.id);
  const valid = (draft.scope === 'category' && draft.categoryId) || (draft.scope === 'product' && draft.productId);

  const patch = (p: Partial<RuleDraft>) => setDraft((d) => ({ ...d, ...p }));

  const submit = async () => {
    if (!valid) return;
    try {
      await save.mutateAsync({ ...draft, name: name.trim() || suggested, weekdays: null, hoursFrom: null, hoursTo: null });
      toast.success(editing ? 'Undantekning uppfærð' : 'Undantekning vistuð', { description: `${name} gildir núna.` });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Breyta undantekningu' : 'Ný undantekning'} className="md:max-w-[520px]">
      <div className="space-y-5 pb-2 pt-1">
        <ScopePicker draft={draft} onChange={patch} products={products} />
        <RatePicker draft={draft} onChange={patch} />
        <ExampleRow draft={draft} products={products} />
        <Field label="Heiti" htmlFor="rule-name" hint="Birtist aðeins hér í stjórnborðinu.">
          <TextInput
            id="rule-name"
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
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hætta við
          </Button>
          <Button onClick={submit} loading={save.isPending} disabled={!valid} className="flex-1">
            {editing ? 'Vista breytingar' : 'Vista undantekningu'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
