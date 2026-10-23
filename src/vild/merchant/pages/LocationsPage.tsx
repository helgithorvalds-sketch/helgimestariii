/**
 * The chain's places: hours, phone, POS status, and whether the till there
 * accepts credit. Editing hours/phone opens a small sheet.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button, ErrorState, Sheet, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { useLocations, useUpdateLocation } from '../../lib/queries';
import { POS_VENDORS, type Location } from '../../lib/types';
import { Field, IconButton, PageHeader, Panel, PosStatusChip, TextInput } from '../components/ui';
import { useMerchant } from '../lib/useMerchant';

function EditSheet({ loc, onClose }: { loc: Location | null; onClose: () => void }) {
  const update = useUpdateLocation();
  const [hours, setHours] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (loc) {
      setHours(loc.openingHours);
      setPhone(loc.phone ?? '');
    }
  }, [loc]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loc) return;
    try {
      await update.mutateAsync({ id: loc.id, patch: { openingHours: hours.trim(), phone: phone.trim() || null } });
      toast.success('Staður uppfærður', { description: loc.name });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Sheet open={Boolean(loc)} onClose={onClose} title={loc?.name ?? ''} className="md:max-w-[440px]">
      <form onSubmit={submit} className="space-y-4 pb-2 pt-1">
        <p className="text-[14px] text-muted-foreground">
          {loc?.address}, {loc?.city}
        </p>
        <Field label="Opnunartími" htmlFor="loc-hours" hint="T.d. 11–22 eða 10–21">
          <TextInput id="loc-hours" value={hours} onChange={(e) => setHours(e.target.value)} className="vild-num" />
        </Field>
        <Field label="Sími" htmlFor="loc-phone">
          <TextInput id="loc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="vild-num" />
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hætta við
          </Button>
          <Button type="submit" loading={update.isPending} className="flex-1">
            Vista
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export default function LocationsPage() {
  const { merchantId } = useMerchant();
  const locations = useLocations(merchantId || undefined);
  const update = useUpdateLocation();
  const [editing, setEditing] = useState<Location | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Staðir · VILD fyrirtæki';
  }, []);

  const toggleRedemption = async (loc: Location, v: boolean) => {
    setBusyId(loc.id);
    try {
      await update.mutateAsync({ id: loc.id, patch: { acceptsRedemption: v } });
      toast.success(v ? 'Inneign virk' : 'Inneign óvirk', { description: loc.name });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const list = locations.data ?? [];
  const connected = list.filter((l) => l.posStatus === 'connected').length;

  return (
    <>
      <PageHeader title="Staðir" description={locations.data ? `${list.length} staðir · ${connected} með tengt kassakerfi` : 'Staðir keðjunnar, opnunartími og kassatenging'} />
      {locations.isError && <ErrorState message={errorMessage(locations.error)} retry={() => locations.refetch()} className="mb-4" />}
      <Panel>
        {locations.isLoading && (
          <div className="space-y-4 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {list.length > 0 && (
          <ul className="divide-y divide-border">
            {list.map((loc) => {
              const vendor = POS_VENDORS.find((v) => v.id === loc.posVendor);
              return (
                <li key={loc.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-tight">{loc.name}</p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {loc.address}, {loc.city} · <span className="vild-num">{loc.openingHours}</span>
                    </p>
                  </div>
                  <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-1">
                    <span className="truncate text-[13px] text-muted-foreground">{vendor?.name ?? 'Ekkert kassakerfi'}</span>
                    <PosStatusChip status={loc.posStatus} />
                  </div>
                  <label className="col-start-2 row-start-1 flex items-center gap-2 text-[13px] font-medium text-muted-foreground sm:col-start-auto sm:row-start-auto">
                    <span className="hidden sm:inline">Inneign virk</span>
                    <Switch checked={loc.acceptsRedemption} onCheckedChange={(v) => toggleRedemption(loc, v)} aria-label={`Inneign virk á ${loc.name}`} disabled={busyId === loc.id} />
                  </label>
                  <IconButton aria-label={`Breyta ${loc.name}`} onClick={() => setEditing(loc)} className="col-start-2 row-start-2 justify-self-end sm:col-start-auto sm:row-start-auto">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <EditSheet loc={editing} onClose={() => setEditing(null)} />
    </>
  );
}
