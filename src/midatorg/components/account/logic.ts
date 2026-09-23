/**
 * Pure logic for the account module: zod schemas (messages are i18n keys,
 * translated at render time), the `?next=` guard, my-page tab parsing, phone
 * normalisation, price-edit validation and file checks. No React, no network.
 */
import { z } from 'zod';
import { href } from '../../lib/paths';
import { ALLOWED_AVATAR_TYPES, ALLOWED_PROOF_TYPES, MAX_AVATAR_BYTES, MAX_PROOF_BYTES } from '../../lib/constants';
import type { Locale } from '../../lib/i18n/locale';
import type { ListingStatus, RequestStatus } from '../../lib/types';

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_BIO_LENGTH = 300;
export const OTP_LENGTH = 6;

// ---------------------------------------------------------------------------
// Schemas — every message is an i18n key
// ---------------------------------------------------------------------------
const emailField = z.string().trim().min(1, 'account.validation.emailRequired').email('errors.INVALID_EMAIL');
const passwordField = z.string().min(MIN_PASSWORD_LENGTH, 'errors.PASSWORD_TOO_SHORT');
const displayNameField = z.string().trim().min(2, 'account.validation.nameMin').max(40, 'account.validation.nameMin');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'account.validation.passwordRequired'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  displayName: displayNameField,
  email: emailField,
  password: passwordField,
});
export type SignupValues = z.infer<typeof signupSchema>;

export const emailOnlySchema = z.object({ email: emailField });
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;

export const setPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'account.validation.passwordMismatch' });
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;

export const profileSchema = z.object({
  display_name: displayNameField,
  bio: z.string().trim().max(MAX_BIO_LENGTH, 'account.validation.bioMax'),
});
export type ProfileValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// `?next=` — only in-app paths, never the login page itself, never off-site
// ---------------------------------------------------------------------------
export function resolveNext(raw: string | null | undefined, fallback: string = href('/')): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || /\s/.test(value)) {
    return fallback;
  }
  if (value.includes('://') || value.includes('\0')) return fallback;
  const path = href(value);
  const login = href('/innskra');
  if (path === login || path.startsWith(login + '?') || path.startsWith(login + '/')) return fallback;
  return path;
}

// ---------------------------------------------------------------------------
// My page tabs (`?flipi=`)
// ---------------------------------------------------------------------------
export const MY_TABS = ['yfirlit', 'solur', 'oskir', 'vaktanir', 'einkunnir'] as const;
export type MyTab = (typeof MY_TABS)[number];

export function parseMyTab(raw: string | null | undefined): MyTab {
  return (MY_TABS as readonly string[]).includes(raw ?? '') ? (raw as MyTab) : 'yfirlit';
}

// ---------------------------------------------------------------------------
// Phone numbers — Supabase wants E.164 (+3546661234)
// ---------------------------------------------------------------------------
const E164 = /^\+[1-9]\d{6,14}$/;

/**
 * "666 1234" → "+3546661234"; "+45 12 34 56 78" → "+4512345678"; "00354…" → "+354…".
 * Returns null when the input cannot be a valid number.
 */
export function normalisePhone(input: string): string | null {
  let s = (input ?? '').replace(/[\s\-().]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (!/^\d+$/.test(s)) return null;
    if (s.length === 7) s = '+354' + s;
    else if (s.length === 10 && s.startsWith('354')) s = '+' + s;
    else return null;
  }
  return E164.test(s) ? s : null;
}

/** "+3546661234" → "+354 666 1234"; other countries are shown as-is. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+354(\d{3})(\d{4})$/.exec(e164);
  return m ? `+354 ${m[1]} ${m[2]}` : e164;
}

// ---------------------------------------------------------------------------
// Inline asking-price edit (≤ face value, whole krónur)
// ---------------------------------------------------------------------------
export type PriceCheck =
  | { ok: true; price: number }
  | {
      ok: false;
      key: 'account.validation.priceRequired' | 'account.validation.pricePositive' | 'account.validation.priceAboveFace';
    };

/** Accepts "8900", "8.900", "8 900" and "8900,5" (rounded). */
export function validateAskingPrice(raw: string | number, faceValue: number): PriceCheck {
  const s = typeof raw === 'number' ? String(raw) : raw.replace(/[.\s]/g, '').replace(',', '.').trim();
  if (s === '') return { ok: false, key: 'account.validation.priceRequired' };
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, key: 'account.validation.pricePositive' };
  const price = Math.round(n);
  if (price <= 0) return { ok: false, key: 'account.validation.pricePositive' };
  if (price > faceValue) return { ok: false, key: 'account.validation.priceAboveFace' };
  return { ok: true, price };
}

// ---------------------------------------------------------------------------
// Client-side file checks (the server enforces the same limits)
// ---------------------------------------------------------------------------
export type FileProblem = 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE';

function checkFile(file: File, allowed: readonly string[], maxBytes: number): FileProblem | null {
  if (!allowed.includes(file.type)) return 'FILE_TYPE_NOT_ALLOWED';
  if (file.size > maxBytes) return 'FILE_TOO_LARGE';
  return null;
}

export function checkAvatarFile(file: File): FileProblem | null {
  return checkFile(file, ALLOWED_AVATAR_TYPES, MAX_AVATAR_BYTES);
}

export function checkProofFile(file: File): FileProblem | null {
  return checkFile(file, ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES);
}

// ---------------------------------------------------------------------------
// Status tags — colour is never the only signal; the label is always shown
// ---------------------------------------------------------------------------
export function listingStatusTone(status: ListingStatus): string {
  switch (status) {
    case 'active':
      return 'border-up/40 text-up';
    case 'reserved':
      return 'border-primary/50 text-foreground';
    case 'sold':
      return 'border-border text-foreground';
    default:
      return 'border-border text-muted-foreground';
  }
}

export function requestStatusTone(status: RequestStatus): string {
  switch (status) {
    case 'active':
      return 'border-bid/40 text-bid';
    case 'fulfilled':
      return 'border-border text-foreground';
    default:
      return 'border-border text-muted-foreground';
  }
}

/** Icelandic singular for numbers ending in 1 (except 11); English only for 1. */
export function ratingsCountKey(count: number, locale: Locale): 'account.ratings.countOne' | 'account.ratings.countMany' {
  const singular = locale === 'is' ? count % 10 === 1 && count % 100 !== 11 : count === 1;
  return singular ? 'account.ratings.countOne' : 'account.ratings.countMany';
}
