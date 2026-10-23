import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '../../components/brand';
import { Button, ChipButton, ErrorState, Skeleton } from '../../components/kit';
import { IS_MOCK, errorMessage } from '../../data';
import { useAuth } from '../../lib/auth';
import { formatISK } from '../../lib/format';
import { useProfile, useWalletPass } from '../../lib/queries';
import { CardVisual } from '../components/CardVisual';
import { DemoPurchaseSheet } from '../components/DemoPurchaseSheet';
import { ToggleRow } from '../components/ToggleRow';
import { WalletButton } from '../components/WalletButtons';
import { usePageTitle, usePocketViews } from '../lib/hooks';

const REFRESH_S = 45;

/** Thin ring that empties as the token ages; the number counts down inside. */
function RefreshRing({ seconds }: { seconds: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / REFRESH_S));
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground" role="status" aria-live="off">
      <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
        <circle cx="16" cy="16" r={r} fill="none" stroke="hsl(var(--green-500))" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 16 16)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <span className="vild-num">Endurnýjast eftir {seconds} s</span>
    </span>
  );
}

export default function CardPage() {
  usePageTitle('Kort');
  const { profile: authProfile } = useAuth();
  const profile = useProfile();
  const pockets = usePocketViews();
  const pass = useWalletPass();
  const [pocketId, setPocketId] = useState<string | null>(null);
  const [useCredit, setUseCredit] = useState<boolean | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const live = useMemo(() => pockets.views.filter((v) => v.sector?.status !== 'coming'), [pockets.views]);
  const current = live.find((v) => v.merchant.id === pocketId) ?? live.find((v) => v.pocket.balance > 0) ?? live[0];
  const balance = current?.pocket.balance ?? 0;
  const useCreditOn = useCredit ?? balance > 0;

  const issued = pass.data ? new Date(pass.data.issuedAt).getTime() : now;
  const seconds = Math.max(0, REFRESH_S - Math.floor((now - issued) / 1000));
  const name = profile.data?.name ?? authProfile?.name ?? '';

  return (
    <div className="vild-dark flex-1 bg-[hsl(var(--green-900))] pb-8 text-white">
      <header className="flex items-center justify-between px-4 pt-[max(16px,var(--safe-top))]">
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">Kortið þitt</h1>
        <Wordmark size="sm" className="text-[hsl(var(--mint-300))]" />
      </header>

      {live.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Vasi">
          {live.map((v) => (
            <ChipButton key={v.merchant.id} selected={v.merchant.id === current?.merchant.id} onClick={() => setPocketId(v.merchant.id)} className={cn(v.merchant.id === current?.merchant.id ? 'border-[hsl(var(--mint-300))] bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]' : 'border-white/20 bg-transparent text-white hover:bg-white/10')}>
              {v.label} · {v.merchant.name}
            </ChipButton>
          ))}
        </div>
      )}

      <div className="mt-4 px-4">
        {pockets.isPending || profile.isPending ? (
          <Skeleton className="aspect-[1.586] w-full rounded-[22px] bg-white/10" />
        ) : pockets.error ? (
          <ErrorState message={errorMessage(pockets.error)} retry={pockets.refetch} className="border-white/20 bg-white/5" />
        ) : (
          <CardVisual holderName={name} balance={balance} pocketLabel={current ? `${current.label} · ${current.merchant.name}` : undefined} />
        )}
      </div>

      <section className="mx-4 mt-4 rounded-[22px] bg-white px-5 pb-3 pt-5 text-foreground" aria-label="QR-kóði">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl border border-border p-3" data-testid="wallet-qr">
            {pass.isPending ? (
              <Skeleton className="h-[192px] w-[192px]" />
            ) : pass.error ? (
              <div className="flex h-[192px] w-[192px] items-center justify-center">
                <ErrorState message={errorMessage(pass.error)} retry={() => void pass.refetch()} />
              </div>
            ) : (
              <QRCodeSVG value={pass.data?.token ?? ''} size={192} level="M" bgColor="#ffffff" fgColor="#111814" title="VILD kortið þitt" />
            )}
          </div>
          <p className="mt-4 text-[16px] font-bold tracking-[-0.01em]">Sýndu kóðann við kassann</p>
          <div className="mt-1.5 min-h-[20px]">{pass.data && <RefreshRing seconds={seconds} />}</div>
        </div>
        <div className="-mx-4 mt-3 border-t border-border">
          <ToggleRow label="Nota inneign við næstu kaup" caption={balance > 0 ? `${formatISK(balance)} dregst frá reikningnum` : 'Engin inneign í þessum vasa ennþá'} checked={useCreditOn} onCheckedChange={setUseCredit} disabled={balance === 0} />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2 px-4">
        <WalletButton kind="apple" />
        <WalletButton kind="google" />
      </div>

      {IS_MOCK && current && (
        <section className="mx-4 mt-6 rounded-[22px] border border-white/15 bg-white/5 p-5" aria-label="Prufukassi">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))]">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="vild-eyebrow !text-[hsl(var(--mint-300))]">Prufukassi</p>
              <p className="mt-1 text-[15px] font-semibold">Prófa kaup hjá {current.merchant.name}</p>
              <p className="mt-0.5 text-[13px] text-white/70">Hermdu eftir kassanum og sjáðu inneignina breytast.</p>
            </div>
          </div>
          <Button variant="mint" size="lg" full className="mt-4" onClick={() => setDemoOpen(true)}>
            Prófa kaup
          </Button>
          <DemoPurchaseSheet open={demoOpen} onClose={() => setDemoOpen(false)} merchant={current.merchant} pocketLabel={current.label} balance={balance} />
        </section>
      )}
    </div>
  );
}
