import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CoinMark } from '../../components/brand';
import { Chip } from '../../components/kit';
import { formatISK, formatSignedISK, formatTime, initialsOf } from '../../lib/format';
import { href, paths } from '../../lib/paths';
import type { LedgerEntry, Location } from '../../lib/types';
import { InitialsMark } from './MerchantMark';

export function ledgerTitle(entry: LedgerEntry, location: Location | undefined): string {
  if (entry.kind === 'welcome') return 'VILD';
  if (entry.kind === 'expire') return 'Inneign rann út';
  if (entry.kind === 'adjust') return 'Leiðrétting';
  return location?.name ?? 'Lúna';
}

/** One ledger line: place · time, description, +/− chip and the basket total. */
export function LedgerRow({ entry, location, className }: { entry: LedgerEntry; location: Location | undefined; className?: string }) {
  const positive = entry.amount >= 0;
  const title = ledgerTitle(entry, location);
  return (
    <Link to={href(paths.appHistoryEntry(entry.id))} className={cn('flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary', className)}>
      {entry.kind === 'welcome' ? <CoinMark size={40} /> : <InitialsMark text={initialsOf(title)} size={40} tone={positive ? 'mint' : 'neutral'} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          {title} <span className="vild-num font-medium text-muted-foreground">· {formatTime(entry.createdAt)}</span>
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{entry.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip tone={positive ? 'mint' : 'neutral'} className="vild-num h-7 text-[13px] font-bold">
          {formatSignedISK(entry.amount)}
        </Chip>
        {entry.purchaseTotal != null && <span className="vild-num text-[12px] font-medium text-muted-foreground">{formatISK(entry.purchaseTotal)}</span>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
