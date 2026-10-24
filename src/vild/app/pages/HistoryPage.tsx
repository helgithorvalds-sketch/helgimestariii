import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button, ChipButton, EmptyState, ErrorState, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatDayLabel, formatISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useLedger, useLocations } from '../../lib/queries';
import type { LedgerEntry } from '../../lib/types';
import { LedgerRow } from '../components/LedgerRow';
import { usePageTitle, usePocketViews } from '../lib/hooks';

function groupByDay(entries: LedgerEntry[]): { label: string; key: string; entries: LedgerEntry[] }[] {
  const groups: { label: string; key: string; entries: LedgerEntry[] }[] = [];
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, label: formatDayLabel(e.createdAt), entries: [e] });
  }
  return groups;
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'strong' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={tone === 'strong' ? 'vild-num mt-0.5 truncate text-[20px] font-extrabold tracking-[-0.02em] text-[hsl(var(--green-500))]' : 'vild-num mt-0.5 truncate text-[17px] font-bold tracking-[-0.01em]'}>{formatISK(value)}</p>
    </div>
  );
}

export default function HistoryPage() {
  usePageTitle('Yfirlit');
  const navigate = useNavigate();
  const pockets = usePocketViews();
  const [merchantId, setMerchantId] = useState<string | undefined>(undefined);
  const ledger = useLedger(merchantId);
  const locations = useLocations();
  const locById = useMemo(() => new Map((locations.data ?? []).map((l) => [l.id, l])), [locations.data]);
  const groups = useMemo(() => groupByDay(ledger.data ?? []), [ledger.data]);
  const filters = pockets.views.filter((v) => v.pocket.earnedTotal > 0 || v.sector?.status === 'live');

  return (
    <div className="flex-1 bg-[hsl(var(--surface-2))] pb-8">
      <div className="bg-white px-4 pb-4 pt-[max(16px,var(--safe-top))]">
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">Yfirlit</h1>
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-border px-4 py-3" aria-label="Samantekt">
          {pockets.isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : (
            <>
              <Stat label="Inneign" value={pockets.total} tone="strong" />
              <Stat label="Safnað" value={pockets.earnedTotal} />
              <Stat label="Nýtt" value={pockets.spentTotal} />
            </>
          )}
        </div>
        {filters.length > 1 && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Vasi">
            <ChipButton selected={!merchantId} onClick={() => setMerchantId(undefined)}>
              Allt
            </ChipButton>
            {filters.map((v) => (
              <ChipButton key={v.merchant.id} selected={merchantId === v.merchant.id} onClick={() => setMerchantId(v.merchant.id)}>
                {v.label}
              </ChipButton>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        {ledger.isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-[136px] w-full rounded-2xl bg-white" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-[72px] w-full rounded-2xl bg-white" />
          </div>
        ) : ledger.error ? (
          <ErrorState message={errorMessage(ledger.error)} retry={() => void ledger.refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-5 w-5" aria-hidden="true" />}
            title="Engin færsla ennþá"
            body="Borgaðu fullt verð hjá Lúnu og sýndu kortið. Fyrsta inneignin birtist hér."
            action={<Button variant="primary" onClick={() => navigate(href(paths.appPlaces))}>Finna stað</Button>}
          />
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g.label}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                  {g.entries.map((e) => (
                    <li key={e.id}>
                      <LedgerRow entry={e} location={e.locationId ? locById.get(e.locationId) : undefined} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
