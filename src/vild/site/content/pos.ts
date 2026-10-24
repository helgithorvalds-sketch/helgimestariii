import { POS_VENDORS } from '../../lib/types';

/**
 * The till systems VILD connects to directly, by the short names used in running
 * text. Regla and "Annað" (scan only) are left out. One list, so the restaurants
 * page and the FAQ always name the same systems.
 */
export const POS_CONNECTED: string[] = POS_VENDORS.filter((v) => v.api !== 'scan' && v.id !== 'regla').map((v) => v.short);

/** "Noona, Upsell, Resto, dk, LS Central og Straumur" */
export function listWithOg(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} og ${items[items.length - 1]}`;
}
