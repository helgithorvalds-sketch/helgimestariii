/**
 * Pure helpers for the admin console (no React, no network). Tested in
 * src/midatorg/test/admin.test.tsx.
 */
import { format } from 'date-fns';
import type { EventCategory, EventStatus, Json, MarketEvent } from '../../lib/types';
import type { EventPatch } from '../../lib/api/admin';

// ---------------------------------------------------------------- tix.is
/** True for http(s) URLs whose host is tix.is or a subdomain of it. */
export function isTixUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return u.hostname === 'tix.is' || u.hostname.endsWith('.tix.is');
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- dates
/** ISO timestamp → value for `<input type="datetime-local">` in the browser's zone ("2026-11-14T20:00"). */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

/** datetime-local value → ISO string (UTC), or null when empty/invalid. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------------------------------------------------------------- numbers
/** "12" → 12; "", "abc", "1.5", "-3" → null. Whole numbers ≥ `min` only. */
export function parseWholeNumber(text: string, min = 0): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n >= min ? n : null;
}

/** Deal amount = quantity × price per ticket. */
export function dealAmount(deal: { quantity: number; price_per_ticket: number }): number {
  return deal.quantity * deal.price_per_ticket;
}

// ---------------------------------------------------------------- settings (jsonb values)
export const NUMBER_SETTING_KEYS = [
  'reservation_minutes',
  'max_active_listings',
  'max_active_requests',
  'max_active_reservations',
  'max_quantity_per_listing',
] as const;
export const BOOLEAN_SETTING_KEYS = ['require_phone_to_sell'] as const;
export const LIST_SETTING_KEYS = ['admin_emails'] as const;

export type NumberSettingKey = (typeof NUMBER_SETTING_KEYS)[number];
export type BooleanSettingKey = (typeof BOOLEAN_SETTING_KEYS)[number];
export type ListSettingKey = (typeof LIST_SETTING_KEYS)[number];
export type KnownSettingKey = NumberSettingKey | BooleanSettingKey | ListSettingKey;

export const KNOWN_SETTING_KEYS: readonly KnownSettingKey[] = [
  ...NUMBER_SETTING_KEYS,
  ...BOOLEAN_SETTING_KEYS,
  ...LIST_SETTING_KEYS,
];

export function isKnownSettingKey(key: string): key is KnownSettingKey {
  return (KNOWN_SETTING_KEYS as readonly string[]).includes(key);
}

/** jsonb number (or numeric string) → number; anything else → null. */
export function settingNumber(value: Json | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** jsonb boolean (or "true"/"false") → boolean; anything else → false. */
export function settingBoolean(value: Json | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

/** jsonb array of strings → string[]; a single string counts as one entry; anything else → []. */
export function settingStringList(value: Json | undefined): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Textarea text (one email per line, commas and semicolons also split) →
 * lower-cased, de-duplicated emails plus the entries that are not emails.
 */
export function parseEmailList(text: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/[\n,;]+/)) {
    const entry = raw.trim();
    if (!entry) continue;
    if (!EMAIL_RE.test(entry)) {
      invalid.push(entry);
      continue;
    }
    const lower = entry.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    emails.push(lower);
  }
  return { emails, invalid };
}

/** Stable JSON for "did the value change" comparisons. */
export function jsonEquals(a: Json | undefined, b: Json | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

// ---------------------------------------------------------------- event edit form
/** Form values of EventEditDialog (strings for the numeric / date inputs; converted on submit). */
export type EventEditValues = {
  title: string;
  category: EventCategory;
  venue_name: string;
  city: string;
  starts_at: string;
  face_value_min: string;
  face_value_max: string;
  tix_url: string;
  status: EventStatus;
};

export function eventToValues(event: MarketEvent): EventEditValues {
  return {
    title: event.title,
    category: event.category,
    venue_name: event.venue_name ?? '',
    city: event.city ?? '',
    starts_at: toDateTimeLocal(event.starts_at),
    face_value_min: event.face_value_min == null ? '' : String(event.face_value_min),
    face_value_max: event.face_value_max == null ? '' : String(event.face_value_max),
    tix_url: event.tix_url ?? '',
    status: event.status,
  };
}

/** Form values → the patch `updateEvent` expects (empty strings become null). */
export function valuesToPatch(v: EventEditValues): EventPatch {
  return {
    title: v.title.trim(),
    category: v.category,
    venue_name: v.venue_name.trim() || null,
    city: v.city.trim() || null,
    starts_at: fromDateTimeLocal(v.starts_at) ?? undefined,
    face_value_min: parseWholeNumber(v.face_value_min),
    face_value_max: parseWholeNumber(v.face_value_max),
    tix_url: v.tix_url.trim() || null,
    status: v.status,
  };
}
