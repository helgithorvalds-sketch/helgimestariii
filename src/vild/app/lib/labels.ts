/** Text helpers shared by list rows and detail screens. */
import { creditFor } from '../../data/seed';
import { formatPct, formatSignedISK } from '../../lib/format';
import type { LedgerEntry, Location, Offer, Product, RewardRule } from '../../lib/types';

export function ledgerTitle(entry: LedgerEntry, location: Location | undefined): string {
  if (entry.kind === 'welcome') return 'VILD';
  if (entry.kind === 'expire') return 'Inneign rann út';
  if (entry.kind === 'adjust') return 'Leiðrétting';
  return location?.name ?? 'Lúna';
}

/**
 * The amount an offer gives. An offer about one product shows that product's credit from the
 * rule engine (creditFor, the same number as the product tile and the merchant's Vörur table), so
 * a rounded or stale stored amount can never disagree with it; other offers use what is stored.
 */
export function offerCreditAmount(offer: Offer, products?: Product[], rules?: RewardRule[]): number | null {
  if (offer.creditAmount && offer.productIds.length === 1) {
    const product = products?.find((p) => p.id === offer.productIds[0]);
    if (product) return rules ? creditFor(product, rules).amount : product.creditAmount;
  }
  return offer.creditAmount || null;
}

/** "+1.000 kr." or "30% til baka" */
export function offerCreditText(offer: Offer, products?: Product[], rules?: RewardRule[]): string | null {
  const amount = offerCreditAmount(offer, products, rules);
  if (amount) return formatSignedISK(amount);
  if (offer.creditPct) return `${formatPct(offer.creditPct)} til baka`;
  return null;
}

/** What a place does with credit right now: coming (not connected yet), paused (till offline), live. */
export function posStatusText(location: Pick<Location, 'posStatus' | 'acceptsRedemption'>): string {
  if (location.posStatus === 'pending') return 'Söfnun væntanleg';
  if (location.posStatus === 'offline') return 'Söfnun í bið';
  return location.acceptsRedemption ? 'Inneign virk' : 'Aðeins söfnun';
}
