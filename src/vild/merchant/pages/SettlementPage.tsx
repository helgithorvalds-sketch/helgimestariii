/**
 * Monthly settlements: credit issued, redeemed, the platform fee, status.
 * "Sækja PDF" prints a dedicated section (print stylesheet inline).
 */
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '../../components/kit';
import type { ChipTone } from '../../components/kit/Chip';
import { errorMessage } from '../../data';
import { formatISK, formatLongDate, formatMonthYear } from '../../lib/format';
import { useSettlements } from '../../lib/queries';
import type { Settlement } from '../../lib/types';
import { PageHeader, Panel, PanelHeader, Table, Td, Th } from '../components/ui';
import { useMerchant } from '../lib/useMerchant';

const STATUS: Record<Settlement['status'], { label: string; tone: ChipTone }> = {
  open: { label: 'Opið', tone: 'neutral' },
  invoiced: { label: 'Reikningur sendur', tone: 'yellow' },
  paid: { label: 'Greitt', tone: 'mint' },
};

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #vild-print, #vild-print * { visibility: visible !important; }
  #vild-print { position: absolute !important; left: 0; top: 0; width: 100%; display: block !important; padding: 24px; font-family: Figtree, system-ui, sans-serif; color: #111814; }
  #vild-print table { width: 100%; border-collapse: collapse; font-size: 12px; }
  #vild-print th, #vild-print td { border-bottom: 1px solid #E0E5DE; padding: 6px 8px; text-align: left; }
  #vild-print td.num, #vild-print th.num { text-align: right; font-variant-numeric: tabular-nums; }
}`;

export default function SettlementPage() {
  const { merchantId, merchant } = useMerchant();
  const settlements = useSettlements(merchantId || null);
  const [printing, setPrinting] = useState<Settlement | null>(null);

  useEffect(() => {
    document.title = 'Uppgjör · VILD fyrirtæki';
  }, []);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 50);
    return () => clearTimeout(t);
  }, [printing]);

  const rows = settlements.data ?? [];
  const printRows = printing ? [printing] : rows;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <PageHeader title="Uppgjör" description="Mánaðarlegt yfirlit yfir inneign sem var veitt, nýtt og þóknun VILD." />

      <Panel className="px-5 py-4 sm:px-6">
        <p className="text-[15px] leading-relaxed">
          Í hverjum mánuði gerum við upp <span className="font-semibold">inneign veitta</span> (það sem gestir unnu sér inn), <span className="font-semibold">inneign nýtta</span> (það sem þeir notuðu) og <span className="font-semibold">þóknun VILD</span>, 10% af veittri inneign.
          <span className="text-muted-foreground"> Dæmi um skilmála; þínir skilmálar eru í samningnum.</span>
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">Velkomin inneign nýrra meðlima er greidd af VILD: hún er hvorki í veittri inneign né í þóknun.</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Bókhald: inneign er skuldbinding (contract liability) þar til hún er nýtt eða rennur út.</p>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Tímabil" caption={merchant?.legalName || undefined} />
        {settlements.isError && <ErrorState message={errorMessage(settlements.error)} retry={() => settlements.refetch()} className="m-4" />}
        {settlements.isLoading && (
          <div className="space-y-3 p-5">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {settlements.data && rows.length === 0 && <EmptyState title="Ekkert uppgjör ennþá" body="Fyrsta uppgjörið birtist í lok fyrsta mánaðar með VILD." />}
        {rows.length > 0 && (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>Tímabil</Th>
                  <Th align="right">Inneign veitt</Th>
                  <Th align="right">Inneign nýtt</Th>
                  <Th align="right">Þóknun</Th>
                  <Th>Staða</Th>
                  <Th className="w-32">
                    <span className="sr-only">Aðgerðir</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-semibold capitalize">{formatMonthYear(s.periodFrom)}</Td>
                    <Td align="right">{formatISK(s.creditIssued)}</Td>
                    <Td align="right">{formatISK(s.creditRedeemed)}</Td>
                    <Td align="right">{formatISK(s.platformFee)}</Td>
                    <Td>
                      <Chip tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Chip>
                    </Td>
                    <Td align="right">
                      <Button size="sm" variant="ghost" onClick={() => setPrinting(s)}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Sækja PDF
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((s) => (
                <li key={s.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[16px] font-bold capitalize">{formatMonthYear(s.periodFrom)}</p>
                    <Chip tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Chip>
                  </div>
                  <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-[14px]">
                    <dt className="text-muted-foreground">Inneign veitt</dt>
                    <dd className="vild-num text-right font-semibold">{formatISK(s.creditIssued)}</dd>
                    <dt className="text-muted-foreground">Inneign nýtt</dt>
                    <dd className="vild-num text-right font-semibold">{formatISK(s.creditRedeemed)}</dd>
                    <dt className="text-muted-foreground">Þóknun</dt>
                    <dd className="vild-num text-right font-semibold">{formatISK(s.platformFee)}</dd>
                  </dl>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => setPrinting(s)}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Sækja PDF
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {/* Printable section: hidden on screen, the only thing visible on paper. */}
      <section id="vild-print" className="hidden" aria-hidden="true">
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0C5C3B', fontWeight: 600 }}>VILD · Uppgjör</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 2px' }}>{merchant?.legalName || merchant?.name}</h1>
        <p style={{ fontSize: 12, color: '#596660', margin: '0 0 16px' }}>Prentað {formatLongDate(new Date())}</p>
        <table>
          <thead>
            <tr>
              <th>Tímabil</th>
              <th className="num">Inneign veitt</th>
              <th className="num">Inneign nýtt</th>
              <th className="num">Þóknun VILD (10%)</th>
              <th>Staða</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((s) => (
              <tr key={s.id}>
                <td>
                  {formatLongDate(s.periodFrom)} – {formatLongDate(s.periodTo)}
                </td>
                <td className="num">{formatISK(s.creditIssued)}</td>
                <td className="num">{formatISK(s.creditRedeemed)}</td>
                <td className="num">{formatISK(s.platformFee)}</td>
                <td>{STATUS[s.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: '#596660', marginTop: 16 }}>Inneign er skuldbinding (contract liability) þar til hún er nýtt eða rennur út. Þóknun er dæmi um skilmála.</p>
      </section>
    </>
  );
}
