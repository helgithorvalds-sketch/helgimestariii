import { format as dfFormat, isValid, parseISO } from 'date-fns';
import { is as isLocale, enGB } from 'date-fns/locale';
import type { Locale } from './i18n/locale';

export type { Locale };

// ---------------------------------------------------------------------------
// Current locale. I18nProvider keeps this in sync so the plain helpers below
// can be called from anywhere (including outside React). Every helper also
// accepts an explicit locale for tests and one-offs.
// ---------------------------------------------------------------------------
let currentLocale: Locale = 'is';
export function setFormatLocale(locale: Locale): void {
  currentLocale = locale;
}
export function getFormatLocale(): Locale {
  return currentLocale;
}

const MINUS = '−'; // typographic minus, never a hyphen in prices/deltas
const DASH = '—';

function dateFnsLocale(locale: Locale) {
  return locale === 'is' ? isLocale : enGB;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value);
  return isValid(d) ? d : null;
}

// ---------------------------------------------------------------------------
// Numbers & money
// ---------------------------------------------------------------------------

/** Thousands with a dot: 8900 → "8.900". Decimals use a comma in Icelandic. */
export function formatNumber(n: number | null | undefined, locale: Locale = currentLocale, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'is' ? '.' : ',');
  const sign = n < 0 ? MINUS : '';
  if (!decPart) return sign + grouped;
  return sign + grouped + (locale === 'is' ? ',' : '.') + decPart;
}

/** 8900 → "8.900 kr." (also in English; the currency is always ISK). null → "—". */
export function formatISK(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  return formatNumber(Math.round(n), 'is') + ' kr.';
}

/** Rating average: 4.87 → "4,9" (is) / "4.9" (en). */
export function formatRating(value: number | null | undefined, locale: Locale = currentLocale): string {
  if (value == null || !Number.isFinite(value)) return DASH;
  return formatNumber(value, locale, 1);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** "fös. 14. nóv." / "Fri 14 Nov" */
export function formatDate(iso: string | Date | null | undefined, locale: Locale = currentLocale): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, locale === 'is' ? 'EEE d. MMM' : 'EEE d MMM', { locale: dateFnsLocale(locale) });
}

/** "fös. 14. nóv. · 20:00" / "Fri 14 Nov · 20:00" */
export function formatDateTime(iso: string | Date | null | undefined, locale: Locale = currentLocale): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, locale === 'is' ? "EEE d. MMM '·' HH:mm" : "EEE d MMM '·' HH:mm", {
    locale: dateFnsLocale(locale),
  });
}

/** "20:00" */
export function formatTime(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'HH:mm');
}

/** "föstudagur 14. nóvember 2025" / "Friday 14 November 2025" */
export function formatLongDate(iso: string | Date | null | undefined, locale: Locale = currentLocale): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, locale === 'is' ? 'EEEE d. MMMM yyyy' : 'EEEE d MMMM yyyy', { locale: dateFnsLocale(locale) });
}

/** "jan. 2026" / "Jan 2026" — for "Meðlimur síðan". */
export function formatMonthYear(iso: string | Date | null | undefined, locale: Locale = currentLocale): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'MMM yyyy', { locale: dateFnsLocale(locale) });
}

/** "25. ágú." style axis tick / "25 Aug". */
export function formatShortDate(iso: string | Date | null | undefined, locale: Locale = currentLocale): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, locale === 'is' ? 'd. MMM' : 'd MMM', { locale: dateFnsLocale(locale) });
}

type RelUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** Icelandic: numbers ending in 1 (except 11) take the singular (21 miði, 11 miðar). */
export function isSingular(n: number): boolean {
  return n % 10 === 1 && n % 100 !== 11;
}

const IS_FUTURE: Record<RelUnit, [string, string]> = {
  minute: ['mínútu', 'mínútur'],
  hour: ['klst.', 'klst.'],
  day: ['dag', 'daga'],
  week: ['viku', 'vikur'],
  month: ['mánuð', 'mánuði'],
  year: ['ár', 'ár'],
};
const IS_PAST: Record<RelUnit, [string, string]> = {
  minute: ['mínútu', 'mínútum'],
  hour: ['klst.', 'klst.'],
  day: ['degi', 'dögum'],
  week: ['viku', 'vikum'],
  month: ['mánuði', 'mánuðum'],
  year: ['ári', 'árum'],
};
const EN_UNITS: Record<RelUnit, [string, string]> = {
  minute: ['min', 'min'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  week: ['week', 'weeks'],
  month: ['month', 'months'],
  year: ['year', 'years'],
};

/**
 * "eftir 3 daga" / "fyrir 2 klst." / "rétt í þessu"  —  "in 3 days" / "2 hours ago" / "just now".
 * Pass `now` for deterministic output in tests.
 */
export function formatRelative(
  iso: string | Date | null | undefined,
  locale: Locale = currentLocale,
  now: Date = new Date(),
): string {
  const d = toDate(iso);
  if (!d) return DASH;
  const diffSec = (d.getTime() - now.getTime()) / 1000;
  const future = diffSec > 0;
  const abs = Math.abs(diffSec);
  if (abs < 60) return locale === 'is' ? 'rétt í þessu' : 'just now';

  let unit: RelUnit;
  let n: number;
  if (abs < 3600) {
    unit = 'minute';
    n = Math.round(abs / 60);
  } else if (abs < 86400) {
    unit = 'hour';
    n = Math.round(abs / 3600);
  } else if (abs < 7 * 86400) {
    unit = 'day';
    n = Math.round(abs / 86400);
  } else if (abs < 30 * 86400) {
    unit = 'week';
    n = Math.round(abs / (7 * 86400));
  } else if (abs < 365 * 86400) {
    unit = 'month';
    n = Math.round(abs / (30 * 86400));
  } else {
    unit = 'year';
    n = Math.round(abs / (365 * 86400));
  }
  n = Math.max(1, n);

  if (locale === 'is') {
    const table = future ? IS_FUTURE : IS_PAST;
    const word = table[unit][isSingular(n) ? 0 : 1];
    return `${future ? 'eftir' : 'fyrir'} ${n} ${word}`;
  }
  const word = EN_UNITS[unit][n === 1 ? 0 : 1];
  return future ? `in ${n} ${word}` : `${n} ${word} ago`;
}

/** "24:59" from milliseconds left; never negative. Over an hour shows "90:00". */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(msLeft) ? msLeft : 0) / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Price vs face value
// ---------------------------------------------------------------------------
export type DeltaKind = 'below' | 'at' | 'above';
export type PriceDeltaResult = { pct: number; kind: DeltaKind };

/**
 * priceDelta(8010, 8900) → { pct: -10, kind: 'below' }.
 * `pct` is rounded to a whole percent; `kind` follows the rounded value so a
 * price 0.3 % under face reads "á miðaverði" rather than "−0 %".
 */
export function priceDelta(asking: number | null | undefined, face: number | null | undefined): PriceDeltaResult {
  if (asking == null || face == null || !Number.isFinite(asking) || !Number.isFinite(face) || face <= 0) {
    return { pct: 0, kind: 'at' };
  }
  const pct = Math.round(((asking - face) / face) * 100) || 0; // `|| 0` normalises -0
  return { pct, kind: pct < 0 ? 'below' : pct > 0 ? 'above' : 'at' };
}

const DELTA_WORDS: Record<Locale, Record<DeltaKind, string>> = {
  is: { below: 'undir miðaverði', at: 'á miðaverði', above: 'yfir miðaverði' },
  en: { below: 'below face value', at: 'at face value', above: 'above face value' },
};

/** "−10% undir miðaverði" / "á miðaverði" / "+5% yfir miðaverði". */
export function formatDelta(
  asking: number | null | undefined,
  face: number | null | undefined,
  locale: Locale = currentLocale,
): string {
  const { pct, kind } = priceDelta(asking, face);
  const words = DELTA_WORDS[locale];
  if (kind === 'at') return words.at;
  const sign = kind === 'below' ? MINUS : '+';
  return `${sign}${Math.abs(pct)}% ${words[kind]}`;
}

/** Just the percentage part: "−10%" / "±0%" / "+5%". */
export function formatDeltaPct(asking: number | null | undefined, face: number | null | undefined): string {
  const { pct, kind } = priceDelta(asking, face);
  if (kind === 'at') return '±0%';
  return `${kind === 'below' ? MINUS : '+'}${Math.abs(pct)}%`;
}

/** Pluralised Icelandic/English ticket count: 1 → "1 miði", 2 → "2 miðar". */
export function formatTickets(n: number, locale: Locale = currentLocale): string {
  if (locale === 'is') return `${formatNumber(n, 'is')} ${isSingular(n) ? 'miði' : 'miðar'}`;
  return `${formatNumber(n, 'en')} ${n === 1 ? 'ticket' : 'tickets'}`;
}

/** Text-only "—" for absent stats, per spec §8 ("never fabricate numbers"). */
export const EM_DASH = DASH;
