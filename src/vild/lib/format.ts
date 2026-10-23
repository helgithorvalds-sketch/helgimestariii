import { format as dfFormat, isValid, parseISO } from 'date-fns';
import { is as isLocale } from 'date-fns/locale';

const MINUS = '−';
const DASH = '—';

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : typeof value === 'number' ? new Date(value) : parseISO(value);
  return isValid(d) ? d : null;
}

/** 8900 → "8.900" (Icelandic grouping). Negative uses a typographic minus. */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = n < 0 ? MINUS : '';
  return decPart ? `${sign}${grouped},${decPart}` : sign + grouped;
}

/** 8900 → "8.900 kr." */
export function formatISK(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  return `${formatNumber(Math.round(n))} kr.`;
}

/** +1500 → "+1.500 kr.", -800 → "−800 kr." */
export function formatSignedISK(n: number): string {
  if (!Number.isFinite(n)) return DASH;
  const abs = formatNumber(Math.abs(Math.round(n)));
  return n < 0 ? `${MINUS}${abs} kr.` : `+${abs} kr.`;
}

/** 12.5 → "12,5%" ; 10 → "10%" */
export function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return DASH;
  const rounded = Math.round(n * 10) / 10;
  return `${formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1)}%`;
}

/** "fös. 14. nóv." */
export function formatDate(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'EEE d. MMM', { locale: isLocale });
}

/** "14. nóv. 2026" */
export function formatDateYear(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'd. MMM yyyy', { locale: isLocale });
}

/** "fös. 14. nóv. · 12:40" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, "EEE d. MMM '·' HH:mm", { locale: isLocale });
}

export function formatTime(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'HH:mm');
}

/** "14. nóvember 2026" */
export function formatLongDate(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'd. MMMM yyyy', { locale: isLocale });
}

/** "nóv. 2026" */
export function formatMonthYear(iso: string | Date | null | undefined): string {
  const d = toDate(iso);
  if (!d) return DASH;
  return dfFormat(d, 'MMM yyyy', { locale: isLocale });
}

/** Icelandic: numbers ending in 1 (except 11) take the singular. */
export function isSingular(n: number): boolean {
  return n % 10 === 1 && n % 100 !== 11;
}

/** "Í dag", "Í gær", else the date. */
export function formatDayLabel(iso: string | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(iso);
  if (!d) return DASH;
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key(d) === key(now)) return 'Í dag';
  if (key(d) === key(y)) return 'Í gær';
  return dfFormat(d, 'EEEE d. MMM', { locale: isLocale });
}

/** "eftir 3 daga" / "fyrir 2 klst." / "rétt í þessu" */
export function formatRelative(iso: string | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(iso);
  if (!d) return DASH;
  const diffSec = (d.getTime() - now.getTime()) / 1000;
  const future = diffSec > 0;
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'rétt í þessu';
  const table: [number, string, string, string, string][] = [
    // limit (s), divisor, singular future/past, plural future/past
    [3600, 'mínútu', 'mínútu', 'mínútur', 'mínútum'],
    [86400, 'klst.', 'klst.', 'klst.', 'klst.'],
    [7 * 86400, 'dag', 'degi', 'daga', 'dögum'],
    [30 * 86400, 'viku', 'viku', 'vikur', 'vikum'],
    [365 * 86400, 'mánuð', 'mánuði', 'mánuði', 'mánuðum'],
    [Infinity, 'ár', 'ári', 'ár', 'árum'],
  ] as unknown as [number, string, string, string, string][];
  const divisors = [60, 3600, 86400, 7 * 86400, 30 * 86400, 365 * 86400];
  for (let i = 0; i < table.length; i++) {
    if (abs < table[i][0]) {
      const n = Math.max(1, Math.round(abs / divisors[i]));
      const [, sf, sp, pf, pp] = table[i];
      const word = isSingular(n) ? (future ? sf : sp) : future ? pf : pp;
      return `${future ? 'eftir' : 'fyrir'} ${n} ${word}`;
    }
  }
  return DASH;
}

/** Mask a kennitala: "0101903019" → "010190-xxxx". */
export function maskKennitala(kt: string | null | undefined): string | null {
  if (!kt) return null;
  const digits = kt.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `${digits.slice(0, 6)}-xxxx`;
}

/** "+3546661234" → "666 1234" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return DASH;
  const digits = phone.replace(/\D/g, '').replace(/^354/, '');
  if (digits.length === 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return phone;
}

/** Initials for placeholder marks: "Lúna Laugavegi" → "LL" */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export const EM_DASH = DASH;
