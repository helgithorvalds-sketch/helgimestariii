import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Mail, Trash2 } from 'lucide-react';
import { Button, Card, ErrorState, Sheet, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { useAuth } from '../../lib/auth';
import { href, paths } from '../../lib/paths';
import { useProfile, useUpdateProfile } from '../../lib/queries';
import { PageHeader } from '../components/PageHeader';
import { ToggleRow } from '../components/ToggleRow';
import { usePageTitle } from '../lib/hooks';

const FIELD = 'mt-1.5 h-12 w-full rounded-xl border border-border bg-secondary px-3.5 text-[15px] font-medium outline-none transition-colors focus:border-[hsl(var(--green-500))] focus:bg-white';

export default function SettingsPage() {
  usePageTitle('Stillingar');
  const navigate = useNavigate();
  const auth = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name);
      setEmail(profile.data.email ?? '');
    }
  }, [profile.data]);

  const dirty = profile.data ? name.trim() !== profile.data.name || email.trim() !== (profile.data.email ?? '') : false;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await update.mutateAsync({ name: name.trim(), email: email.trim() || null });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    await auth.signOut();
    navigate(href(paths.appLogin), { replace: true });
  };

  return (
    <div className="min-h-full bg-[hsl(var(--surface-2))] pb-8">
      <div className="bg-white">
        <PageHeader title="Stillingar" backTo={href(paths.appProfile)} />
      </div>
      <div className="space-y-4 px-4 pt-4">
        {profile.isPending ? (
          <Skeleton className="h-56 w-full rounded-2xl bg-white" />
        ) : profile.error ? (
          <ErrorState message={errorMessage(profile.error)} retry={() => void profile.refetch()} />
        ) : (
          <>
            <Card as="section" className="p-4">
              <form onSubmit={(e) => void save(e)}>
                <h2 className="text-[16px] font-bold tracking-[-0.01em]">Um þig</h2>
                <label className="mt-3 block">
                  <span className="text-[13px] font-semibold text-muted-foreground">Nafn</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={FIELD} required />
                </label>
                <label className="mt-3 block">
                  <span className="text-[13px] font-semibold text-muted-foreground">Netfang</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" className={FIELD} placeholder="nafn@netfang.is" />
                </label>
                {update.error && <ErrorState message={errorMessage(update.error)} className="mt-3" />}
                <Button type="submit" variant="primary" size="lg" full className="mt-4" loading={update.isPending} disabled={!dirty || !name.trim()}>
                  {saved ? 'Vistað' : 'Vista'}
                </Button>
              </form>
            </Card>

            <Card as="section" className="divide-y divide-border overflow-hidden">
              <ToggleRow
                icon={<Bell className="h-5 w-5" aria-hidden="true" />}
                label="Tilkynningar"
                caption="Inneign komin inn, inneign að renna út"
                checked={profile.data?.notificationsEnabled ?? false}
                onCheckedChange={(v) => update.mutate({ notificationsEnabled: v })}
              />
              <ToggleRow
                icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                label="Tilboð og fréttir"
                caption="Af og til, aldrei ruslpóstur"
                checked={profile.data?.marketingOptIn ?? false}
                onCheckedChange={(v) => update.mutate({ marketingOptIn: v })}
              />
            </Card>

            <Card as="section" className="p-4">
              <h2 className="text-[16px] font-bold tracking-[-0.01em]">Aðgangur</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">Ef þú eyðir aðganginum hverfur inneignin þín líka. Það er ekki hægt að afturkalla.</p>
              <Button variant="destructive" size="md" className="mt-3" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eyða aðgangi
              </Button>
            </Card>
          </>
        )}
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Eyða aðgangi?">
        <div className="pb-2">
          <p className="text-[15px] leading-relaxed text-muted-foreground">Aðgangurinn, sagan og öll inneign eyðast. Þetta er ekki hægt að afturkalla.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => setConfirm(false)}>
              Hætta við
            </Button>
            <Button variant="destructive" size="lg" onClick={() => void deleteAccount()} loading={deleting}>
              Eyða
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
