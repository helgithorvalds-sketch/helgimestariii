/**
 * Chain settings: description and website (editable), legal name and sector
 * (read-only), a preview of how the chain appears in the app, and the way out.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Button, CreditTag, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatPct } from '../../lib/format';
import { useSectors, useUpdateMerchant } from '../../lib/queries';
import { ChainMark, Field, KeyValue, PageHeader, Panel, PanelHeader, TextInput } from '../components/ui';
import { useMerchant } from '../lib/useMerchant';

export default function SettingsPage() {
  const { merchant } = useMerchant();
  const sectors = useSectors();
  const update = useUpdateMerchant();
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = 'Stillingar · VILD fyrirtæki';
  }, []);
  useEffect(() => {
    if (merchant && !loaded) {
      setDescription(merchant.description);
      setWebsite(merchant.website ?? '');
      setLoaded(true);
    }
  }, [merchant, loaded]);

  const dirty = merchant ? description !== merchant.description || website !== (merchant.website ?? '') : false;
  const sector = sectors.data?.find((s) => s.slug === merchant?.sector);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    try {
      await update.mutateAsync({ id: merchant.id, patch: { description: description.trim(), website: website.trim() || null } });
      toast.success('Stillingar vistaðar');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const mailto = `mailto:hallo@vild.is?subject=${encodeURIComponent(`Hætta í VILD · ${merchant?.name ?? ''}`)}`;

  return (
    <>
      <PageHeader title="Stillingar" description="Upplýsingar um keðjuna og hvernig hún birtist í appinu." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <form onSubmit={submit}>
              <PanelHeader title="Um keðjuna" caption="Lýsingin birtist á síðu keðjunnar í appinu." />
              <div className="space-y-4 px-5 py-5">
                {merchant ? (
                  <>
                    <Field label="Lýsing" htmlFor="m-desc" hint="Ein til tvær setningar. Engin tilboð hér, þau eiga heima í herferðum.">
                      <Textarea id="m-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={240} className="rounded-xl border-border bg-white px-3.5 py-2.5 text-[15px]" />
                    </Field>
                    <Field label="Vefsíða" htmlFor="m-web">
                      <TextInput id="m-web" type="url" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                    </Field>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-11 w-full" />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                <dl className="flex flex-wrap gap-x-6 text-[13px] text-muted-foreground">
                  <div>
                    <dt className="inline">Lögaðili: </dt>
                    <dd className="inline font-medium text-foreground">{merchant?.legalName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="inline">Geiri: </dt>
                    <dd className="inline font-medium text-foreground">{sector?.name ?? '—'}</dd>
                  </div>
                </dl>
                <Button type="submit" loading={update.isPending} disabled={!dirty || !merchant}>
                  Vista
                </Button>
              </div>
            </form>
          </Panel>

          <Panel className="border-destructive/30">
            <PanelHeader title="Hætta í VILD" caption="Uppsögn tekur gildi í lok uppgjörstímabils. Útistandandi inneign gesta heldur gildi sínu." />
            <div className="px-5 py-4">
              <Button variant="secondary" className="border-destructive/40 text-destructive hover:bg-destructive/5" onClick={() => (window.location.href = mailto)}>
                Senda uppsögn
              </Button>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Útlit í appinu" caption="Svona sjá gestir keðjuna" />
          <div className="p-5">
            {merchant ? (
              <div className="rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3">
                  <ChainMark text={merchant.logoText} color={merchant.brandColor} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[18px] font-bold leading-tight tracking-tight">{merchant.name}</p>
                    <p className="text-[13px] text-muted-foreground">{sector?.name ?? ''}</p>
                  </div>
                  <CreditTag size="sm">{formatPct(merchant.defaultRatePct)} til baka</CreditTag>
                </div>
                <p className="mt-3 text-[14px] leading-snug text-muted-foreground">{description || merchant.description}</p>
                <dl className="mt-3 border-t border-border">
                  <KeyValue label="Vasi" value={sector?.pocketName ?? '—'} />
                  <KeyValue label="Vefsíða" value={website ? website.replace(/^https?:\/\//, '') : '—'} className="border-t border-border" />
                </dl>
              </div>
            ) : (
              <Skeleton className="h-40 w-full rounded-2xl" />
            )}
            <p className="mt-3 text-[12px] text-muted-foreground">Merki og litur eru sett upp af VILD við samning. Grunninneign breytist á síðunni Inneign.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
