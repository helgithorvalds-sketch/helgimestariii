/**
 * Kassakerfi: how VILD reaches the till (three paths), each place's vendor
 * and status, the integration details to hand a vendor, and a cashier
 * simulator ("Prufukassi") that exercises the real ledger.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Copy, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, CreditTag, ErrorState, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatISK, formatSignedISK } from '../../lib/format';
import { useLocations, useTillCharge, useTillLookup, useUpdateLocation } from '../../lib/queries';
import { POS_VENDORS, type Location, type PosVendor } from '../../lib/types';
import { Field, IconButton, KeyValue, PageHeader, Panel, PanelHeader, PosStatusChip, TextInput } from '../components/ui';
import { useMerchant } from '../lib/useMerchant';

const WEBHOOK_URL = 'https://<project>.supabase.co/functions/v1/vild-pos-webhook';
const API_KEY = 'vild_live_7f3a9c2e4b1d8f06a5c3e9b2d4f7a1c8';
const SIGNATURE_HEADER = 'x-vild-signature';

const PATHS = [
  { n: 1, title: 'API-tenging', who: 'Noona HQ · LS Central · Straumur', body: 'Kassinn sendir hver kaup sjálfkrafa til VILD um vefkrók og inneignin bókast strax. Gesturinn sýnir VILD-kortið eða símanúmer við kassann.' },
  { n: 2, title: 'Samstarfstenging', who: 'Upsell · Resto · dk · Regla', body: 'VILD setur tenginguna upp með kassakerfinu þínu. Þú þarft ekkert að gera nema staðfesta hjá þeim.' },
  { n: 3, title: 'Skönnun', who: 'Virkar með hvaða kassa sem er', body: 'Gjaldkeri skannar QR-kóða VILD-kortsins eða slær inn kóðann og upphæðina í Prufukassann hér fyrir neðan. Engin uppsetning.' },
];

function mask(key: string): string {
  return `${key.slice(0, 10)}${'•'.repeat(16)}${key.slice(-4)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success('Afritað');
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error('Tókst ekki að afrita.');
    }
  };
  return (
    <IconButton aria-label={label} onClick={copy}>
      {done ? <Check className="h-4 w-4 text-[hsl(var(--success))]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </IconButton>
  );
}

function LocationRow({ loc }: { loc: Location }) {
  const update = useUpdateLocation();
  const [testing, setTesting] = useState(false);
  const vendor = POS_VENDORS.find((v) => v.id === loc.posVendor);

  const setVendor = async (v: PosVendor) => {
    try {
      await update.mutateAsync({ id: loc.id, patch: { posVendor: v, posStatus: v === 'other' ? 'offline' : 'pending' } });
      toast.success('Kassakerfi vistað', { description: `${loc.name} · ${POS_VENDORS.find((x) => x.id === v)?.name}` });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const test = async () => {
    setTesting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await update.mutateAsync({ id: loc.id, patch: { posStatus: 'connected' } });
      toast.success('Tenging virkar', { description: `${loc.name} svaraði um ${vendor?.name ?? 'kassakerfið'}.` });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(200px,1fr)_auto_auto] sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight">{loc.name}</p>
        <p className="truncate text-[13px] text-muted-foreground">{loc.city}</p>
      </div>
      <PosStatusChip status={loc.posStatus} />
      <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <Select value={loc.posVendor ?? 'other'} onValueChange={(v) => setVendor(v as PosVendor)} disabled={update.isPending}>
          <SelectTrigger className="h-10 rounded-xl border-border bg-white text-[14px]" aria-label={`Kassakerfi á ${loc.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="vild">
            {POS_VENDORS.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-[14px]">
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2 flex justify-end sm:col-span-1 sm:col-start-4 sm:row-start-1">
        <Button size="sm" variant="secondary" onClick={test} loading={testing} disabled={loc.posVendor === 'other'}>
          <Plug className="h-4 w-4" aria-hidden="true" />
          Prófa tengingu
        </Button>
      </div>
    </li>
  );
}

function TillSimulator({ locations }: { locations: Location[] }) {
  const { merchant } = useMerchant();
  const lookup = useTillLookup();
  const charge = useTillCharge();
  const [token, setToken] = useState('VILD-DEMO-7F3A');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [useCredit, setUseCredit] = useState(true);
  const [result, setResult] = useState<{ applied: number; toPay: number; earned: number; balanceAfter: number } | null>(null);

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
  }, [locations, locationId]);

  const customer = lookup.data ?? null;
  const total = Math.max(0, Math.round(Number(amount) || 0));
  const preview = useMemo(() => {
    const available = customer?.balance ?? 0;
    const applied = useCredit ? Math.min(available, total) : 0;
    const toPay = total - applied;
    const earned = Math.round((toPay * (merchant?.defaultRatePct ?? 0)) / 100);
    return { applied, toPay, earned };
  }, [customer, useCredit, total, merchant]);

  const find = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    try {
      const r = await lookup.mutateAsync(token.trim());
      if (!r) toast.error('Kóðinn fannst ekki. Prófaðu VILD-DEMO-7F3A.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const confirm = async () => {
    if (!customer || total <= 0 || !locationId) return;
    try {
      const r = await charge.mutateAsync({ token: token.trim(), locationId, amount: total, useCredit });
      setResult(r);
      toast.success('Kaup skráð', { description: `${customer.firstName} fékk ${formatSignedISK(r.earned)} til baka.` });
      await lookup.mutateAsync(token.trim());
      setAmount('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Panel>
      <PanelHeader title="Prufukassi" caption="Svona lítur skönnunarleiðin út fyrir gjaldkera. Skrifar í alvöru inneignarbók prufunotandans." />
      <div className="grid gap-6 px-5 py-5 lg:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={find} className="flex items-end gap-2">
            <Field label="VILD-kóði" htmlFor="till-token" className="flex-1">
              <TextInput id="till-token" value={token} onChange={(e) => setToken(e.target.value)} className="vild-num uppercase" autoComplete="off" spellCheck={false} />
            </Field>
            <Button type="submit" variant="secondary" loading={lookup.isPending} disabled={!token.trim()}>
              Fletta upp
            </Button>
          </form>
          {customer && (
            <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--mint-50))] px-4 py-3" aria-live="polite">
              <span className="text-[15px] font-bold text-[hsl(var(--green-700))]">{customer.firstName}</span>
              <span className="text-[14px] text-[hsl(var(--green-700))]">
                Inneign <span className="vild-num font-bold">{formatISK(customer.balance)}</span>
              </span>
            </div>
          )}
          <Field label="Staður" htmlFor="till-location">
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="till-location" className="h-11 rounded-xl border-border bg-white text-[15px]">
                <SelectValue placeholder="Veldu stað" />
              </SelectTrigger>
              <SelectContent className="vild">
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-[14px]">
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Upphæð kaupa" htmlFor="till-amount">
            <div className="relative">
              <TextInput id="till-amount" type="number" inputMode="numeric" min={0} step={10} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="vild-num pr-12" disabled={!customer} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">kr.</span>
            </div>
          </Field>
          <label className="flex h-11 items-center justify-between rounded-xl border border-border px-3.5 text-[14px] font-medium">
            Nýta inneign
            <Switch checked={useCredit} onCheckedChange={setUseCredit} aria-label="Nýta inneign" disabled={!customer} />
          </label>
        </div>

        <div className="flex flex-col">
          <dl className="divide-y divide-border rounded-xl border border-border px-4">
            <KeyValue label="Kaup" value={formatISK(total)} />
            <KeyValue label="Inneign nýtt" value={customer ? `−${formatISK(preview.applied)}` : '—'} />
            <KeyValue label="Gestur borgar" value={customer ? formatISK(preview.toPay) : '—'} className="[&>dd]:text-[16px]" />
            <KeyValue label="Fær til baka" value={customer ? <CreditTag size="sm">{formatSignedISK(preview.earned)}</CreditTag> : '—'} />
          </dl>
          <Button className="mt-4" size="lg" full onClick={confirm} loading={charge.isPending} disabled={!customer || total <= 0 || !locationId}>
            Staðfesta
          </Button>
          {result && (
            <div className="mt-4 rounded-xl border border-[hsl(var(--mint-100))] bg-[hsl(var(--mint-50))] px-4 py-3" role="status">
              <p className="text-[14px] font-bold text-[hsl(var(--green-700))]">Kaup skráð</p>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 text-[13px] text-[hsl(var(--green-700))]">
                <dt>Inneign nýtt</dt>
                <dd className="vild-num text-right font-semibold">{formatISK(result.applied)}</dd>
                <dt>Gestur borgaði</dt>
                <dd className="vild-num text-right font-semibold">{formatISK(result.toPay)}</dd>
                <dt>Fékk til baka</dt>
                <dd className="vild-num text-right font-semibold">{formatSignedISK(result.earned)}</dd>
                <dt>Inneign eftir</dt>
                <dd className="vild-num text-right font-semibold">{formatISK(result.balanceAfter)}</dd>
              </dl>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function PosPage() {
  const { merchantId, merchant } = useMerchant();
  const locations = useLocations(merchantId || undefined);
  const mailto = `mailto:?subject=${encodeURIComponent(`VILD tenging · ${merchant?.name ?? ''}`)}&body=${encodeURIComponent(`Vefkrókur: ${WEBHOOK_URL}\nHaus: ${SIGNATURE_HEADER} (HMAC-SHA256)\nAPI-lykill: sendur sérstaklega.`)}`;

  useEffect(() => {
    document.title = 'Kassakerfi · VILD fyrirtæki';
  }, []);

  return (
    <>
      <PageHeader title="Kassakerfi" description="Hvernig kaupin berast til VILD og inneignin á kassann." />

      <Panel className="px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="text-[19px] font-bold tracking-tight">Hvernig tengist VILD kassanum?</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] text-muted-foreground">Þrjár leiðir, eftir kassakerfinu á hverjum stað. Allar enda á sama stað: kaupin bókast og inneignin birtist í appinu.</p>
        <ol className="mt-5 divide-y divide-border">
          {PATHS.map((p) => (
            <li key={p.n} className="grid gap-1 py-4 sm:grid-cols-[48px_200px_minmax(0,1fr)] sm:gap-4 sm:py-5">
              <span className="vild-num text-[22px] font-extrabold leading-none text-[hsl(var(--green-500))]" aria-hidden="true">
                {String(p.n).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-[16px] font-bold leading-tight">{p.title}</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{p.who}</p>
              </div>
              <p className="text-[15px] leading-relaxed text-foreground/90">{p.body}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Staðir" caption="Kassakerfi og staða tengingar á hverjum stað" />
        {locations.isError && <ErrorState message={errorMessage(locations.error)} retry={() => locations.refetch()} className="m-4" />}
        {locations.isLoading && (
          <div className="space-y-4 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {locations.data && (
          <ul className="divide-y divide-border">
            {locations.data.map((l) => (
              <LocationRow key={l.id} loc={l} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Tengiupplýsingar"
          caption="Það sem kassakerfið þarf til að senda kaup til VILD"
          right={
            <Button size="sm" variant="secondary" onClick={() => (window.location.href = mailto)}>
              Senda til kassakerfis
            </Button>
          }
        />
        <dl className="divide-y divide-border px-5">
          {[
            { label: 'Vefkrókur (POST)', value: WEBHOOK_URL, copy: WEBHOOK_URL },
            { label: 'API-lykill', value: mask(API_KEY), copy: API_KEY },
            { label: 'Undirskriftarhaus', value: `${SIGNATURE_HEADER} · HMAC-SHA256 af meginmáli`, copy: SIGNATURE_HEADER },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
                <dd className="vild-num truncate font-mono text-[13px] font-medium">{row.value}</dd>
              </div>
              <CopyButton value={row.copy} label={`Afrita ${row.label.toLowerCase()}`} />
            </div>
          ))}
        </dl>
        <p className="border-t border-border px-5 py-3 text-[12px] text-muted-foreground">Lykillinn er aðeins sýndur að hluta. Nýr lykill fæst hjá VILD; sá gamli hættir þá að virka.</p>
      </Panel>

      <div className="mt-4">{locations.data ? <TillSimulator locations={locations.data} /> : <Skeleton className="h-64 w-full rounded-2xl" />}</div>
    </>
  );
}
