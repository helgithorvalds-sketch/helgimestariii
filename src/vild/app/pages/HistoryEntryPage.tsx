import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoinMark } from '../../components/brand';
import { Button, EmptyState, ErrorState, Skeleton } from '../../components/kit';
import { errorMessage } from '../../data';
import { formatDateTime, formatISK, formatSignedISK } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import { useLedger, useLedgerEntry, useLocation } from '../../lib/queries';
import { ledgerTitle } from '../lib/labels';
import { PageHeader } from '../components/PageHeader';
import { usePageTitle } from '../lib/hooks';

const SUPPORT_MAIL = 'mailto:hjalp@vild.is?subject=Kvittun';

export default function HistoryEntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entry = useLedgerEntry(id);
  const ledger = useLedger();
  const location = useLocation(entry.data?.locationId ?? undefined);
  usePageTitle('Kvittun');

  // The till produces one receipt; the ledger keeps a spend line and an earn line for it.
  const siblings = useMemo(() => {
    const e = entry.data;
    if (!e) return [];
    if (!e.receiptNo) return [e];
    const all = (ledger.data ?? []).filter((x) => x.receiptNo === e.receiptNo && x.merchantId === e.merchantId);
    return all.length ? all.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [e];
  }, [entry.data, ledger.data]);

  if (entry.isPending) {
    return (
      <div aria-busy="true">
        <PageHeader title="Kvittun" backTo={href(paths.appHistory)} />
        <div className="px-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  if (entry.error) return <ErrorState message={errorMessage(entry.error)} retry={() => void entry.refetch()} className="m-4" />;
  if (!entry.data) return <EmptyState title="Færslan fannst ekki" action={<Button variant="secondary" onClick={() => navigate(href(paths.appHistory))}>Yfirlit</Button>} />;

  const e = entry.data;
  const earn = siblings.find((x) => x.kind === 'earn') ?? (e.kind === 'earn' ? e : null);
  const spend = siblings.find((x) => x.kind === 'spend');
  const items = earn?.items ?? e.items ?? [];
  const total = e.purchaseTotal ?? earn?.purchaseTotal ?? null;
  const spent = spend ? -spend.amount : 0;
  const credit = earn?.amount ?? (e.kind === 'earn' ? e.amount : null);
  const last = siblings[siblings.length - 1] ?? e;
  const title = ledgerTitle(e, location.data ?? undefined);
  const isPurchase = e.kind === 'earn' || e.kind === 'spend';

  return (
    <div className="flex-1 bg-[hsl(var(--surface-2))] pb-8">
      <div className="bg-white">
        <PageHeader title="Kvittun" backTo={href(paths.appHistory)} />
      </div>
      <div className="px-4 pt-4">
        <article className="overflow-hidden rounded-2xl border border-border bg-white" aria-label="Kvittun">
          <div className="flex items-start gap-3 px-5 pb-4 pt-5">
            {e.kind === 'welcome' && <CoinMark size={40} />}
            <div className="min-w-0 flex-1">
              <p className="text-[19px] font-extrabold tracking-[-0.02em]">{title}</p>
              {location.data && <p className="mt-0.5 text-[13px] text-muted-foreground">{location.data.address}</p>}
              <p className="vild-num mt-1 text-[13px] text-muted-foreground">{formatDateTime(e.createdAt)}</p>
            </div>
            {e.receiptNo && (
              <p className="vild-num shrink-0 text-right text-[12px] text-muted-foreground">
                Nr. <span className="font-semibold text-foreground">{e.receiptNo}</span>
              </p>
            )}
          </div>

          {items.length > 0 && (
            <table className="w-full border-t border-border text-[14px]">
              <thead className="sr-only">
                <tr>
                  <th>Vara</th>
                  <th>Verð</th>
                  <th>Inneign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 align-top">
                      <span className="font-semibold">{it.name}</span>
                      {it.qty > 1 && <span className="vild-num text-muted-foreground"> × {it.qty}</span>}
                    </td>
                    <td className="vild-num px-2 py-2.5 text-right align-top">{formatISK(it.price * it.qty)}</td>
                    <td className="vild-num px-5 py-2.5 text-right align-top font-semibold text-[hsl(var(--green-500))]">{it.credit > 0 ? formatSignedISK(it.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {earn && items.length > 0 && earn.amount < items.reduce((a, i) => a + i.credit, 0) && (
            <p className="border-t border-border px-5 py-2.5 text-[12px] text-muted-foreground">Inneign reiknast aðeins af þeim hluta sem var greiddur með peningum.</p>
          )}
          <dl className="vild-num space-y-2 border-t border-border px-5 py-4 text-[14px]">
            {isPurchase && total != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Samtals</dt>
                <dd className="font-semibold">{formatISK(total)}</dd>
              </div>
            )}
            {spent > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Inneign nýtt</dt>
                <dd className="font-semibold">{formatSignedISK(-spent)}</dd>
              </div>
            )}
            {isPurchase && total != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Greitt</dt>
                <dd className="font-bold">{formatISK(total - spent)}</dd>
              </div>
            )}
            {credit != null && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{e.kind === 'welcome' ? 'Velkomin inneign' : 'Inneign til baka'}</dt>
                <dd>
                  <span className="vild-marker font-bold">{formatSignedISK(credit)}</span>
                </dd>
              </div>
            )}
            {!isPurchase && e.kind !== 'welcome' && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{e.description}</dt>
                <dd className="font-semibold">{formatSignedISK(e.amount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold">Inneign eftir</dt>
              <dd className="font-extrabold text-[hsl(var(--green-500))]">{formatISK(last.balanceAfter)}</dd>
            </div>
          </dl>
        </article>

        <div className="mt-4 text-center">
          <p className="text-[13px] text-muted-foreground">Vantar eitthvað?</p>
          <Button variant="ghost" size="md" className="mt-1" onClick={() => window.open(SUPPORT_MAIL, '_self')}>
            Hafa samband
          </Button>
        </div>
      </div>
    </div>
  );
}
