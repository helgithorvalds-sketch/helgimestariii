import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CircleHelp, FileText, Fingerprint, Lock, RotateCcw, Settings, ShieldCheck } from 'lucide-react';
import { Button, Card, Chip, ErrorState, Row, Skeleton } from '../../components/kit';
import { IS_MOCK, api, errorMessage } from '../../data';
import type { MockApi } from '../../data/mock';
import { useAuth } from '../../lib/auth';
import { formatMonthYear, formatPhone, initialsOf } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useProfile } from '../../lib/queries';
import { usePageTitle } from '../lib/hooks';

const SUPPORT_MAIL = 'mailto:hjalp@vild.is';

export default function ProfilePage() {
  usePageTitle('Ég');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const auth = useAuth();
  const profile = useProfile();
  const [busy, setBusy] = useState<'none' | 'out' | 'reset'>('none');
  const p = profile.data;

  const signOut = async () => {
    setBusy('out');
    await auth.signOut();
    navigate(href(paths.appLogin), { replace: true });
  };

  const reset = async () => {
    setBusy('reset');
    (api() as MockApi).reset();
    await qc.invalidateQueries({ queryKey: ['vild'] });
    await auth.refresh();
    setBusy('none');
  };

  return (
    <div className="flex-1 bg-[hsl(var(--surface-2))] pb-8">
      <div className="bg-white px-4 pb-5 pt-[max(16px,var(--safe-top))]">
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">Ég</h1>
        {profile.isPending ? (
          <div className="mt-4 flex items-center gap-4" aria-busy="true">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ) : profile.error ? (
          <ErrorState message={errorMessage(profile.error)} retry={() => void profile.refetch()} className="mt-4" />
        ) : p ? (
          <div className="mt-4 flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--mint-300))] text-[22px] font-extrabold text-[hsl(var(--green-700))]" aria-hidden="true">
              {initialsOf(p.legalName ?? p.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-extrabold tracking-[-0.02em]">{p.legalName ?? p.name}</p>
              <p className="vild-num mt-0.5 text-[14px] text-muted-foreground">{formatPhone(p.phone)}</p>
              {p.eidVerifiedAt && (
                <Chip tone="mint" className="mt-2 gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Staðfest með rafrænum skilríkjum
                </Chip>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4 px-4 pt-4">
        {p && !p.eidVerifiedAt && (
          <Card className="overflow-hidden border-[hsl(var(--mint-300))] bg-[hsl(var(--mint-50))]">
            <Row to={href(paths.appEid)} icon={<Fingerprint className="h-5 w-5" aria-hidden="true" />} title="Staðfestu hver þú ert" subtitle="Rafræn skilríki, tekur hálfa mínútu" />
          </Card>
        )}

        <Card className="divide-y divide-border overflow-hidden">
          <Row to={href(paths.appSettings)} icon={<Settings className="h-5 w-5" aria-hidden="true" />} title="Stillingar" subtitle="Nafn, netfang, tilkynningar" />
          <Row to={href(paths.appEid)} icon={<Fingerprint className="h-5 w-5" aria-hidden="true" />} title="Rafræn skilríki" subtitle={p?.eidVerifiedAt ? 'Staðfest' : 'Ekki staðfest'} />
          <Row to={href(paths.siteTerms)} icon={<FileText className="h-5 w-5" aria-hidden="true" />} title="Skilmálar" />
          <Row to={href(paths.sitePrivacy)} icon={<Lock className="h-5 w-5" aria-hidden="true" />} title="Persónuvernd" />
          <Row onClick={() => window.open(SUPPORT_MAIL, '_self')} icon={<CircleHelp className="h-5 w-5" aria-hidden="true" />} title="Aðstoð" subtitle="hjalp@vild.is" />
        </Card>

        {p && <p className="px-1 text-center text-[13px] text-muted-foreground">Meðlimur síðan {formatMonthYear(p.memberSince)}</p>}

        <Button variant="secondary" size="lg" full onClick={() => void signOut()} loading={busy === 'out'}>
          Útskrá
        </Button>

        {IS_MOCK && (
          <Button variant="ghost" size="md" full className="text-muted-foreground" onClick={() => void reset()} loading={busy === 'reset'}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Endurstilla prufugögn
          </Button>
        )}
      </div>
    </div>
  );
}
