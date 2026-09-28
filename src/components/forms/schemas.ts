/**
 * zod schemas and pure helpers for the sell / want / manual-event forms.
 * Every validation message is an i18n key (forms.error.* or errors.*); the form
 * components translate it with t() when they render the error, which keeps the
 * schemas free of React and easy to unit-test.
 */
import { z } from 'zod';
import { ALLOWED_PROOF_TYPES, EVENT_CATEGORIES, MAX_PROOF_BYTES, MAX_TICKETS_PER_LISTING } from '../../lib/constants';
import { formatNumber, getFormatLocale, type Locale } from '../../lib/format';
import type { EventCategory, EventRow, MarketEvent } from '../../lib/types';

// ---------------------------------------------------------------------------
// Limits (mirror the check constraints in supabase-midatorg/migrations/0001_schema.sql)
// ---------------------------------------------------------------------------
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = MAX_TICKETS_PER_LISTING;
export const MAX_TICKET_TYPE_LENGTH = 60;
export const MAX_SEAT_INFO_LENGTH = 120;
export const MAX_LISTING_NOTES_LENGTH = 500;
export const MAX_REQUEST_NOTES_LENGTH = 300;
export const MAX_TITLE_LENGTH = 200;
export const MAX_VENUE_LENGTH = 120;
export const MAX_CITY_LENGTH = 80;
/** Nine digits: nothing on tix.is costs more, and it keeps the price input from overflowing an int4. */
export const MAX_PRICE = 999_999_999;

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------
const quantityField = z
  .number({ invalid_type_error: 'forms.error.quantityRange', required_error: 'forms.error.quantityRange' })
  .int('forms.error.quantityRange')
  .min(MIN_QUANTITY, 'forms.error.quantityRange')
  .max(MAX_QUANTITY, 'forms.error.quantityRange');

/** Required positive integer price; `null` (empty input) reports `requiredKey`. */
function requiredPrice(requiredKey: string) {
  return z
    .number({ invalid_type_error: requiredKey, required_error: requiredKey })
    .int('forms.error.pricePositive')
    .positive('forms.error.pricePositive')
    .max(MAX_PRICE, 'forms.error.pricePositive');
}

const optionalPositivePrice = z
  .number()
  .int('forms.error.pricePositive')
  .positive('forms.error.pricePositive')
  .max(MAX_PRICE, 'forms.error.pricePositive')
  .nullable();

const optionalNonNegativePrice = z
  .number()
  .int('forms.error.priceNonNegative')
  .nonnegative('forms.error.priceNonNegative')
  .max(MAX_PRICE, 'forms.error.priceNonNegative')
  .nullable();

const eventIdField = z.string().trim().min(1, 'forms.error.eventRequired');

// ---------------------------------------------------------------------------
// Listing (sell form)
// ---------------------------------------------------------------------------
export const listingSchema = z
  .object({
    event_id: eventIdField,
    quantity: quantityField,
    ticket_type: z.string().trim().max(MAX_TICKET_TYPE_LENGTH, 'forms.error.ticketTypeLong'),
    seat_info: z.string().trim().max(MAX_SEAT_INFO_LENGTH, 'forms.error.seatInfoLong'),
    face_value: requiredPrice('forms.error.faceValueRequired'),
    asking_price: requiredPrice('forms.error.askingRequired'),
    split_allowed: z.boolean(),
    notes: z.string().trim().max(MAX_LISTING_NOTES_LENGTH, 'forms.error.notesLong'),
  })
  .superRefine((v, ctx) => {
    if (v.asking_price > v.face_value) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['asking_price'], message: 'forms.error.aboveFace' });
    }
  });

export type ListingFormOutput = z.output<typeof listingSchema>;
/** What react-hook-form holds while the user types (prices start empty). */
export type ListingFormValues = Omit<ListingFormOutput, 'face_value' | 'asking_price'> & {
  face_value: number | null;
  asking_price: number | null;
};

export const listingDefaults: ListingFormValues = {
  event_id: '',
  quantity: 1,
  ticket_type: '',
  seat_info: '',
  face_value: null,
  asking_price: null,
  split_allowed: true,
  notes: '',
};

// ---------------------------------------------------------------------------
// Request (want form)
// ---------------------------------------------------------------------------
export const requestSchema = z
  .object({
    event_id: eventIdField,
    quantity: quantityField,
    max_price: optionalPositivePrice,
    /** The event's known face value ceiling (face_value_max), used only for the ≤ rule. */
    face_cap: z.number().nullable(),
    notes: z.string().trim().max(MAX_REQUEST_NOTES_LENGTH, 'forms.error.requestNotesLong'),
  })
  .superRefine((v, ctx) => {
    if (v.max_price != null && v.face_cap != null && v.face_cap > 0 && v.max_price > v.face_cap) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_price'], message: 'forms.error.maxPriceAboveFace' });
    }
  });

export type RequestFormValues = z.input<typeof requestSchema>;
export type RequestFormOutput = z.output<typeof requestSchema>;

export const requestDefaults: RequestFormValues = {
  event_id: '',
  quantity: 1,
  max_price: null,
  face_cap: null,
  notes: '',
};

// ---------------------------------------------------------------------------
// Manual event
// ---------------------------------------------------------------------------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Local date + time ("2026-11-14", "20:00") → Date, or null when either part is malformed. */
export function toStartsAt(date: string, time: string): Date | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO string for `starts_at`, or null when the input is malformed. */
export function toStartsAtIso(date: string, time: string): string | null {
  const d = toStartsAt(date, time);
  return d ? d.toISOString() : null;
}

/** "tix.is/is/event/123/" or "https://tix.is/…" → canonical https URL; anything off tix.is → null. */
export function normalizeTixUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    const host = url.hostname.toLowerCase();
    if (host !== 'tix.is' && !host.endsWith('.tix.is')) return null;
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return null;
  }
}

export const manualEventSchema = z
  .object({
    title: z.string().trim().min(2, 'forms.error.titleRequired').max(MAX_TITLE_LENGTH, 'forms.error.titleLong'),
    category: z.enum(EVENT_CATEGORIES as [EventCategory, ...EventCategory[]]),
    venue_name: z.string().trim().max(MAX_VENUE_LENGTH, 'forms.error.venueLong'),
    city: z.string().trim().max(MAX_CITY_LENGTH, 'forms.error.cityLong'),
    date: z.string().regex(DATE_RE, 'forms.error.dateRequired'),
    time: z.string().regex(TIME_RE, 'forms.error.timeRequired'),
    face_value_min: optionalNonNegativePrice,
    face_value_max: optionalNonNegativePrice,
    tix_url: z
      .string()
      .trim()
      .refine((v) => v === '' || normalizeTixUrl(v) !== null, 'forms.error.tixUrl'),
  })
  .superRefine((v, ctx) => {
    const starts = toStartsAt(v.date, v.time);
    if (starts && starts.getTime() <= Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'forms.error.dateInPast' });
    }
    if (v.face_value_min != null && v.face_value_max != null && v.face_value_min > v.face_value_max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['face_value_min'], message: 'forms.error.faceRange' });
    }
  });

export type ManualEventFormValues = z.input<typeof manualEventSchema>;
export type ManualEventFormOutput = z.output<typeof manualEventSchema>;

export const manualEventDefaults: ManualEventFormValues = {
  title: '',
  category: 'tonleikar',
  venue_name: '',
  city: '',
  date: '',
  time: '20:00',
  face_value_min: null,
  face_value_max: null,
  tix_url: '',
};

// ---------------------------------------------------------------------------
// ISK input helpers (format while typing, store integers)
// ---------------------------------------------------------------------------

/** "8.900 kr" / "8900" / "8 900" → 8900; no digits → null. Capped at MAX_PRICE. */
export function parseIsk(raw: string): number | null {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return null;
  const n = Number(digits.slice(0, 9));
  return Number.isFinite(n) ? Math.min(n, MAX_PRICE) : null;
}

/** 8900 → "8.900" (always Icelandic grouping, the currency never changes); null → "". */
export function formatIskInput(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '';
  return formatNumber(Math.max(0, Math.round(n)), 'is');
}

/** Index in `formatted` right after the `digitCount`-th digit (keeps the caret in place while typing). */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

/** "" → null, otherwise the trimmed string. */
export function emptyToNull(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s ? s : null;
}

// ---------------------------------------------------------------------------
// Proof file helpers
// ---------------------------------------------------------------------------
export type ProofFileError = 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE';

const PROOF_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg'];

/** PDF / PNG / JPG (by mime type or, when the browser reports none, by extension) and ≤ 10 MB. */
export function validateProofFile(file: File): ProofFileError | null {
  const type = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk = (ALLOWED_PROOF_TYPES as readonly string[]).includes(type) || (!type && PROOF_EXTENSIONS.includes(ext));
  if (!typeOk) return 'FILE_TYPE_NOT_ALLOWED';
  if (file.size > MAX_PROOF_BYTES) return 'FILE_TOO_LARGE';
  return null;
}

function readArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('READ_FAILED'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Lower-case hex SHA-256 of the file, computed in the browser (same digest the api uses for duplicate detection). */
export async function hashFile(file: Blob): Promise<string> {
  const buf = await readArrayBuffer(file);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** First 8 hex characters, shown next to the file name. */
export function shortHash(sha256: string): string {
  return sha256.slice(0, 8);
}

/** 1234 → "1,2 KB" (is) / "1.2 KB" (en); 0 decimals under 10 of a unit's parent. */
export function formatFileSize(bytes: number, locale: Locale = getFormatLocale()): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatNumber(kb, locale, kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${formatNumber(mb, locale, mb < 10 ? 1 : 0)} MB`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** A freshly created event has no listings or requests yet, so every stat is zero / null. */
export function eventRowToMarketEvent(row: EventRow): MarketEvent {
  return {
    ...row,
    tickets_available: 0,
    listings_active: 0,
    min_ask: null,
    avg_ask: null,
    requests_active: 0,
    wanted_tickets: 0,
    max_bid: null,
    sold_count: 0,
    last_sold_price: null,
    last_sold_at: null,
  };
}

/** "6.900–12.900 kr." / "8.900 kr." / null when the event has no face value. */
export function faceValueRange(event: Pick<MarketEvent, 'face_value_min' | 'face_value_max'> | null | undefined): string | null {
  if (!event) return null;
  const { face_value_min: min, face_value_max: max } = event;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${formatNumber(min, 'is')}–${formatNumber(max, 'is')} kr.`;
  return `${formatNumber((min ?? max) as number, 'is')} kr.`;
}
