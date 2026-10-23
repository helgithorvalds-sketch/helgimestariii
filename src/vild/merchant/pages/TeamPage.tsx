/**
 * Who can sign in to the portal: owners, managers, staff; which places each
 * one sees. Invite opens a sheet; remove asks first.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, Chip, ErrorState, Sheet, Skeleton } from '../../components/kit';
import type { ChipTone } from '../../components/kit/Chip';
import { errorMessage } from '../../data';
import { useInviteUser, useLocations, useMerchantUsers, useRemoveUser } from '../../lib/queries';
import type { Location, MerchantUser } from '../../lib/types';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { Avatar, Field, IconButton, PageHeader, Panel, PanelHeader, Segmented, TextInput } from '../components/ui';
import { ROLE_LABELS, useMerchant } from '../lib/useMerchant';

const ROLE_TONE: Record<MerchantUser['role'], ChipTone> = { owner: 'green', manager: 'mint', staff: 'neutral' };

function InviteSheet({ open, onClose, merchantId, locations }: { open: boolean; onClose: () => void; merchantId: string; locations: Location[] }) {
  const invite = useInviteUser(merchantId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MerchantUser['role']>('manager');
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setRole('manager');
    setScope('all');
    setPicked([]);
    invite.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const valid = name.trim().length > 1 && /.+@.+\..+/.test(email) && (scope === 'all' || picked.length > 0);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await invite.mutateAsync({ merchantId, name: name.trim(), email: email.trim().toLowerCase(), role, locationIds: scope === 'all' ? null : picked });
      toast.success('Boð sent', { description: `${name.trim()} fær tölvupóst á ${email.trim()}.` });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Bjóða notanda" className="md:max-w-[480px]">
      <form onSubmit={submit} className="space-y-4 pb-2 pt-1">
        <Field label="Nafn" htmlFor="inv-name">
          <TextInput id="inv-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Netfang" htmlFor="inv-email">
          <TextInput id="inv-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Hlutverk" htmlFor="inv-role">
          <Select value={role} onValueChange={(v) => setRole(v as MerchantUser['role'])}>
            <SelectTrigger id="inv-role" className="h-11 rounded-xl border-border bg-white text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="vild">
              <SelectItem value="owner">Eigandi · allt, þar á meðal uppgjör og teymi</SelectItem>
              <SelectItem value="manager">Stjórnandi · inneign, herferðir, staðir</SelectItem>
              <SelectItem value="staff">Starfsmaður · prufukassi og yfirlit</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Staðir">
          <Segmented
            ariaLabel="Staðir"
            value={scope}
            onChange={(v) => setScope(v)}
            className="w-full"
            options={[
              { value: 'all', label: 'Allir staðir' },
              { value: 'some', label: 'Valdir staðir' },
            ]}
          />
          {scope === 'some' && (
            <ul className="mt-2 max-h-[200px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {locations.map((l) => {
                const on = picked.includes(l.id);
                return (
                  <li key={l.id}>
                    <label className={cn('flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-[14px]', on && 'bg-[hsl(var(--mint-50))]')}>
                      <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== l.id) : [...p, l.id]))} className="h-4 w-4 accent-[#0C5C3B]" />
                      <span className="font-medium">{l.name}</span>
                      <span className="ml-auto text-[12px] text-muted-foreground">{l.city}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Field>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hætta við
          </Button>
          <Button type="submit" loading={invite.isPending} disabled={!valid} className="flex-1">
            Senda boð
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export default function TeamPage() {
  const { merchantId, user: me } = useMerchant();
  const users = useMerchantUsers(merchantId || null);
  const locations = useLocations(merchantId || undefined);
  const remove = useRemoveUser(merchantId);
  const [inviting, setInviting] = useState(false);
  const [toRemove, setToRemove] = useState<MerchantUser | null>(null);

  useEffect(() => {
    document.title = 'Teymi · VILD fyrirtæki';
  }, []);

  const sorted = useMemo(() => {
    const order = { owner: 0, manager: 1, staff: 2 };
    return [...(users.data ?? [])].sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name, 'is'));
  }, [users.data]);

  const doRemove = async () => {
    if (!toRemove) return;
    try {
      await remove.mutateAsync(toRemove.id);
      toast.success('Notandi fjarlægður', { description: toRemove.name });
      setToRemove(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const placesLabel = (u: MerchantUser) => {
    if (!u.locationIds) return 'Allir staðir';
    const n = u.locationIds.length;
    if (n === 1) return locations.data?.find((l) => l.id === u.locationIds![0])?.name ?? '1 staður';
    return `${n} staðir`;
  };

  return (
    <>
      <PageHeader
        title="Teymi"
        description="Hverjir komast í stjórnborðið og hvaða staði þeir sjá."
        action={
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Bjóða notanda
          </Button>
        }
      />
      {users.isError && <ErrorState message={errorMessage(users.error)} retry={() => users.refetch()} className="mb-4" />}
      <Panel>
        <PanelHeader title="Notendur" caption={users.data ? `${sorted.length} með aðgang` : undefined} />
        {users.isLoading && (
          <div className="space-y-4 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        )}
        {sorted.length > 0 && (
          <ul className="divide-y divide-border">
            {sorted.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {u.name}
                    {u.id === me?.id && <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">(þú)</span>}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">{u.email}</p>
                </div>
                <span className="hidden text-[13px] text-muted-foreground sm:block">{placesLabel(u)}</span>
                <Chip tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role]}</Chip>
                <IconButton aria-label={`Fjarlægja ${u.name}`} onClick={() => setToRemove(u)} disabled={u.id === me?.id || u.role === 'owner'} className="-mr-2">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <InviteSheet open={inviting} onClose={() => setInviting(false)} merchantId={merchantId} locations={locations.data ?? []} />
      <ConfirmSheet open={Boolean(toRemove)} onClose={() => setToRemove(null)} onConfirm={doRemove} title="Fjarlægja notanda?" body={toRemove ? `${toRemove.name} missir aðgang að stjórnborðinu strax.` : undefined} confirmLabel="Fjarlægja" destructive loading={remove.isPending} />
    </>
  );
}
