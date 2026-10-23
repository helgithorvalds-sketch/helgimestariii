/**
 * Small, pure helpers for talking about reward rules in Icelandic:
 * what a rule applies to, when it runs, whether it is running now, and what
 * a product earns under it. Mirrors the engine in data/seed.ts (creditFor).
 */
import type { Product, RewardRule } from '../../lib/types';
import { CATEGORY_LABELS } from '../../data/seed';
import { formatISK, formatPct } from '../../lib/format';

export type RuleDraft = Omit<RewardRule, 'id' | 'createdAt'> & { id?: string };

export const WEEKDAY_SHORT = ['M', 'Þ', 'M', 'F', 'F', 'L', 'S'] as const; // 1 = Monday … 7 = Sunday
export const WEEKDAY_LONG = ['mánudaga', 'þriðjudaga', 'miðvikudaga', 'fimmtudaga', 'föstudaga', 'laugardaga', 'sunnudaga'] as const;
export const WEEKDAY_PLURAL_CAP = ['Mánudagar', 'Þriðjudagar', 'Miðvikudagar', 'Fimmtudagar', 'Föstudagar', 'Laugardagar', 'Sunnudagar'] as const;

export function isTimeBoxed(r: Pick<RewardRule, 'weekdays' | 'hoursFrom' | 'hoursTo' | 'startsAt' | 'endsAt'>): boolean {
  return Boolean((r.weekdays && r.weekdays.length) || r.hoursFrom || r.startsAt || r.endsAt);
}

/** "Allt" · "Flokkur: Drykkir" · "Vara: Margherita" */
export function scopeLabel(r: Pick<RewardRule, 'scope' | 'categoryId' | 'productId'>, products: Product[] | undefined, opts: { prefix?: boolean } = {}): string {
  const prefix = opts.prefix ?? true;
  if (r.scope === 'merchant') return 'Allt';
  if (r.scope === 'category') {
    const name = r.categoryId ? CATEGORY_LABELS[r.categoryId] : '—';
    return prefix ? `Flokkur: ${name}` : name;
  }
  const name = products?.find((p) => p.id === r.productId)?.name ?? '—';
  return prefix ? `Vara: ${name}` : name;
}

/** "30%" or "500 kr." */
export function rateLabel(r: Pick<RewardRule, 'ratePct' | 'fixedAmount'>): string {
  if (r.fixedAmount != null) return formatISK(r.fixedAmount);
  return formatPct(r.ratePct ?? 0);
}

/** "11–14" from "11:00"/"14:00"; keeps minutes when they are not :00. */
export function hoursLabel(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  const f = (s: string) => (s.endsWith(':00') ? s.slice(0, 2).replace(/^0/, '') : s);
  return `${f(from)}–${f(to)}`;
}

/** Days in words: "Virka daga", "Þriðjudagar", "Fös.–lau.", "Alla daga". */
export function weekdaysLabel(weekdays: number[] | null): string {
  if (!weekdays || weekdays.length === 0 || weekdays.length === 7) return 'Alla daga';
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  const key = sorted.join(',');
  if (key === '1,2,3,4,5') return 'Virka daga';
  if (key === '6,7') return 'Um helgar';
  if (sorted.length === 1) return WEEKDAY_PLURAL_CAP[sorted[0] - 1];
  // consecutive run → "Fös.–lau."
  const consecutive = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const short = (d: number) => {
    const w = WEEKDAY_LONG[d - 1];
    return w.slice(0, 3) + '.';
  };
  if (consecutive) return `${cap(short(sorted[0]))}–${short(sorted[sorted.length - 1])}`;
  return sorted.map((d, i) => (i === 0 ? cap(short(d)) : short(d))).join(', ');
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Virka daga 11–14" · "Þriðjudagar, allan daginn" · "Alla daga 16–18" */
export function scheduleLabel(r: Pick<RewardRule, 'weekdays' | 'hoursFrom' | 'hoursTo'>): string {
  const days = weekdaysLabel(r.weekdays);
  const hours = hoursLabel(r.hoursFrom, r.hoursTo);
  return hours ? `${days} ${hours}` : `${days}, allan daginn`;
}

/** Is this rule inside its window right now? (same logic as creditFor) */
export function isInWindow(r: RewardRule, at: Date = new Date()): boolean {
  if (!r.active) return false;
  if (r.startsAt && new Date(r.startsAt) > at) return false;
  if (r.endsAt && new Date(r.endsAt) < at) return false;
  if (r.weekdays && r.weekdays.length) {
    const wd = ((at.getDay() + 6) % 7) + 1;
    if (!r.weekdays.includes(wd)) return false;
  }
  if (r.hoursFrom && r.hoursTo) {
    const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    if (hhmm < r.hoursFrom || hhmm >= r.hoursTo) return false;
  }
  return true;
}

/** Credit a product earns under a draft rule (not the full engine, just this rule). */
export function creditUnder(price: number, r: Pick<RewardRule, 'ratePct' | 'fixedAmount'>): number {
  if (r.fixedAmount != null) return Math.min(r.fixedAmount, price);
  return Math.round((price * (r.ratePct ?? 0)) / 100);
}

/** The product a rule example should use: its own product, the first in its category, else the first featured. */
export function exampleProductFor(r: Pick<RewardRule, 'scope' | 'categoryId' | 'productId'>, products: Product[] | undefined): Product | undefined {
  if (!products || products.length === 0) return undefined;
  if (r.scope === 'product' && r.productId) return products.find((p) => p.id === r.productId) ?? products[0];
  if (r.scope === 'category' && r.categoryId) return products.find((p) => p.category === r.categoryId) ?? products[0];
  return products.find((p) => p.featured) ?? products[0];
}

/** Auto-suggested rule name: "Drykkir · 0%" / "Margherita · 50%". */
export function suggestName(r: Pick<RewardRule, 'scope' | 'categoryId' | 'productId' | 'ratePct' | 'fixedAmount'>, products: Product[] | undefined): string {
  const who = r.scope === 'merchant' ? 'Allt' : scopeLabel(r, products, { prefix: false });
  return `${who} · ${rateLabel(r)}`;
}

/** Where a product's current credit comes from, in two words: "Grunn 10%", "Vara 50%", "Hádegið · pítsur". */
export function ruleSourceLabel(rule: RewardRule | null, merchantName = 'Grunn'): string {
  if (!rule) return '—';
  if (isTimeBoxed(rule)) return rule.name;
  if (rule.scope === 'merchant') return `${merchantName} ${rateLabel(rule)}`;
  if (rule.scope === 'category') return `Flokkur ${rateLabel(rule)}`;
  return `Vara ${rateLabel(rule)}`;
}

export function emptyRule(merchantId: string): RuleDraft {
  return {
    merchantId,
    scope: 'category',
    categoryId: 'pizza',
    productId: null,
    ratePct: 10,
    fixedAmount: null,
    name: '',
    startsAt: null,
    endsAt: null,
    weekdays: null,
    hoursFrom: null,
    hoursTo: null,
    active: true,
  };
}
