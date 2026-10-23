/** Text helpers shared by list rows and detail screens. */
import { formatPct, formatSignedISK } from '../../lib/format';
import type { LedgerEntry, Location, Offer } from '../../lib/types';

export function ledgerTitle(entry: LedgerEntry, location: Location | undefined): string {
  if (entry.kind === 'welcome') return 'VILD';
  if (entry.kind === 'expire') return 'Inneign rann út';
  if (entry.kind === 'adjust') return 'Leiðrétting';
  return location?.name ?? 'Lúna';
}

/** "+1.000 kr." or "30% til baka" */
export function offerCreditText(offer: Offer): string | null {
  if (offer.creditAmount) return formatSignedISK(offer.creditAmount);
  if (offer.creditPct) return `${formatPct(offer.creditPct)} til baka`;
  return null;
}
