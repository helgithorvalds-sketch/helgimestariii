import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { Button, Card, ErrorState, Skeleton } from '../../components/kit';
import { ApiError, api, errorMessage } from '../../data';
import { useAuth } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useProfile } from '../../lib/queries';
import { PageHeader } from '../components/PageHeader';
import { usePageTitle } from '../lib/hooks';

export default function EidPage() {
  usePageTitle('Rafræn skilríki');
  const auth = useAuth();
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState(false);

  // The real backend redirects back here with ?eid=ok or ?eid=error&code=EID_…
  useEffect(() => {
    const eid = params.get('eid');
    if (!eid) return;
    if (eid === 'ok') {
      setJustDone(true);
      void profile.refetch();
      void auth.refresh();
    } else setError(errorMessage(new ApiError(params.get('code') ?? 'EID_FAILED')));
    const next = new URLSearchParams(params);
    next.delete('eid');
    next.delete('code');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handle the redirect once
  }, []);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api().startEidLogin(href(paths.appEid));
      if (res.url) {
        window.location.assign(res.url);
        return;
      }
      await profile.refetch();
      await auth.refresh();
      setJustDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verified = profile.data?.eidVerifiedAt ?? null;

  return (
    <div className="flex-1 bg-[hsl(var(--surface-2))] pb-8">
      <div className="bg-white">
        <PageHeader title="Rafræn skilríki" backTo={href(paths.appProfile)} />
      </div>
      <div className="space-y-4 px-4 pt-4">
        {profile.isPending ? (
          <Skeleton className="h-48 w-full rounded-2xl bg-white" />
        ) : verified ? (
          <Card className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">{justDone ? 'Staðfest, takk' : 'Þú ert staðfest'}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {profile.data?.legalName ?? profile.data?.name}
              {profile.data?.kennitalaMasked && <span className="vild-num"> · {profile.data.kennitalaMasked}</span>}
            </p>
            <p className="vild-num mt-2 text-[13px] text-muted-foreground">Staðfest {formatDateTime(verified)}</p>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-[hsl(var(--green-500))]">
              <Fingerprint className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-[19px] font-extrabold tracking-[-0.02em]">Staðfestu hver þú ert</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">Rafræn skilríki tengja inneignina við þig, ekki bara símann. Þá tapast hún ekki þótt þú skiptir um síma eða númer.</p>
            <ol className="mt-3 space-y-1.5 text-[14px] text-muted-foreground">
              <li>1. Þú ýtir á hnappinn og Auðkenni opnast.</li>
              <li>2. Þú samþykkir í símanum eða appinu.</li>
              <li>3. Þú kemur aftur hingað, staðfest.</li>
            </ol>
            {error && <ErrorState message={error} className="mt-4" />}
            <Button variant="primary" size="lg" full className="mt-5" onClick={() => void start()} loading={busy}>
              {busy ? 'Opna Auðkenni…' : 'Staðfesta með rafrænum skilríkjum'}
            </Button>
          </Card>
        )}
        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">Við geymum kennitölu og nafn, ekkert annað úr skilríkjunum. Sjá persónuverndarstefnu.</p>
      </div>
    </div>
  );
}
