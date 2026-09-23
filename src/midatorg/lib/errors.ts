import { useCallback } from 'react';
import { toast } from 'sonner';
import { useT } from './i18n';

/** Codes raised by the RPCs / guard triggers (spec §3). */
export const RPC_ERROR_CODES = [
  'AUTH_REQUIRED',
  'USER_BANNED',
  'NOT_OWNER',
  'PHONE_REQUIRED',
  'EVENT_NOT_FOUND',
  'EVENT_NOT_UPCOMING',
  'EVENT_IN_PAST',
  'TOO_MANY_TICKETS',
  'TOO_MANY_LISTINGS',
  'TOO_MANY_REQUESTS',
  'REQUEST_EXISTS',
  'IMMUTABLE_COLUMN',
  'INVALID_STATUS_CHANGE',
  'OPEN_DEALS',
  'LISTING_NOT_ACTIVE',
  'LISTING_NOT_FOUND',
  'LISTING_EXPIRED',
  'OWN_LISTING',
  'INVALID_QUANTITY',
  'NOT_ENOUGH_TICKETS',
  'SPLIT_NOT_ALLOWED',
  'ALREADY_RESERVED',
  'TOO_MANY_RESERVATIONS',
  'DEAL_NOT_FOUND',
  'NOT_PARTY',
  'NOT_ALLOWED',
  'INVALID_TRANSITION',
  'RESERVATION_EXPIRED',
  'UNKNOWN_ACTION',
  'INVALID_SCORE',
  'DEAL_NOT_COMPLETED',
  'ALREADY_RATED',
] as const;

/** Codes produced client-side or derived from Postgres / auth / storage errors. */
export const CLIENT_ERROR_CODES = [
  'DUPLICATE_PROOF',
  'ALERT_EXISTS',
  'PRICE_ABOVE_FACE_VALUE',
  'DUPLICATE',
  'CHECK_VIOLATION',
  'INVALID_REFERENCE',
  'NOT_FOUND',
  'INVALID_INPUT',
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_CONFIRMED',
  'USER_ALREADY_REGISTERED',
  'PASSWORD_TOO_SHORT',
  'WEAK_PASSWORD',
  'RATE_LIMITED',
  'OTP_INVALID',
  'SIGNUP_DISABLED',
  'INVALID_EMAIL',
  'SAME_PASSWORD',
  'INVALID_PHONE',
  'FILE_TOO_LARGE',
  'FILE_TYPE_NOT_ALLOWED',
  'NETWORK',
  'GENERIC',
] as const;

export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number];
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];
export type ApiErrorCode = RpcErrorCode | ClientErrorCode;

export const ALL_ERROR_CODES: readonly ApiErrorCode[] = [...RPC_ERROR_CODES, ...CLIENT_ERROR_CODES];
const KNOWN = new Set<string>(ALL_ERROR_CODES);

export type ParsedError = {
  /** Stable code, always one of ALL_ERROR_CODES. */
  code: ApiErrorCode;
  /** i18n key: `errors.<code>`. */
  key: `errors.${ApiErrorCode}`;
  /** The raw underlying message, for logging. */
  message: string;
};

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
  error?: unknown;
  error_description?: unknown;
  msg?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function make(code: ApiErrorCode, message: string): ParsedError {
  return { code, key: `errors.${code}`, message };
}

const AUTH_CODE_MAP: Record<string, ApiErrorCode> = {
  invalid_credentials: 'INVALID_CREDENTIALS',
  email_not_confirmed: 'EMAIL_NOT_CONFIRMED',
  user_already_exists: 'USER_ALREADY_REGISTERED',
  email_exists: 'USER_ALREADY_REGISTERED',
  phone_exists: 'INVALID_PHONE',
  weak_password: 'WEAK_PASSWORD',
  over_request_rate_limit: 'RATE_LIMITED',
  over_email_send_rate_limit: 'RATE_LIMITED',
  over_sms_send_rate_limit: 'RATE_LIMITED',
  otp_expired: 'OTP_INVALID',
  otp_disabled: 'OTP_INVALID',
  signup_disabled: 'SIGNUP_DISABLED',
  email_address_invalid: 'INVALID_EMAIL',
  validation_failed: 'INVALID_INPUT',
  same_password: 'SAME_PASSWORD',
  session_not_found: 'AUTH_REQUIRED',
  session_expired: 'AUTH_REQUIRED',
  refresh_token_not_found: 'AUTH_REQUIRED',
  user_banned: 'USER_BANNED',
  sms_send_failed: 'INVALID_PHONE',
};

/**
 * Turns anything thrown by supabase-js (PostgrestError, AuthError, StorageError,
 * FunctionsError), our own `new Error('DUPLICATE_PROOF')`, or a network failure
 * into a stable code + i18n key. Never throws.
 */
export function parseApiError(err: unknown): ParsedError {
  if (err == null) return make('GENERIC', '');
  if (typeof err === 'string') return parseApiError({ message: err });

  const e = err as ErrorLike;
  const message = str(e.message) || str(e.error_description) || str(e.msg) || str(e.error);
  const code = str(e.code);
  const details = str(e.details);
  const hint = str(e.hint);
  const name = str(e.name);
  const status = Number(e.status ?? e.statusCode ?? 0);
  const haystack = `${message} ${details} ${hint}`.toLowerCase();
  const trimmed = message.trim();

  // 1. Exact code as the message (RPC `raise exception 'CODE'`, or our own Error('CODE')).
  if (KNOWN.has(trimmed)) return make(trimmed as ApiErrorCode, message);
  // `P0001` = raise_exception; message may carry extra context ("CODE: …").
  const m = /^([A-Z][A-Z0-9_]{2,})\b/.exec(trimmed);
  if (m && KNOWN.has(m[1])) return make(m[1] as ApiErrorCode, message);

  // 2. Postgres SQLSTATE codes.
  switch (code) {
    case '23505':
      if (haystack.includes('sha') || haystack.includes('proof')) return make('DUPLICATE_PROOF', message);
      if (haystack.includes('mt_alerts')) return make('ALERT_EXISTS', message);
      if (haystack.includes('mt_requests')) return make('REQUEST_EXISTS', message);
      if (haystack.includes('mt_ratings')) return make('ALREADY_RATED', message);
      return make('DUPLICATE', message);
    case '23514':
      if (haystack.includes('price_cap')) return make('PRICE_ABOVE_FACE_VALUE', message);
      return make('CHECK_VIOLATION', message);
    case '23503':
      return make('INVALID_REFERENCE', message);
    case '42501':
      return make('NOT_ALLOWED', message);
    case '22P02':
    case '22001':
    case '22003':
      return make('INVALID_INPUT', message);
    case 'PGRST116':
      return make('NOT_FOUND', message);
    case 'PGRST301':
    case 'PGRST302':
      return make('AUTH_REQUIRED', message);
    default:
      break;
  }

  // 3. Supabase auth error codes (AuthApiError.code) and messages.
  if (code && AUTH_CODE_MAP[code]) return make(AUTH_CODE_MAP[code], message);
  if (haystack.includes('invalid login credentials')) return make('INVALID_CREDENTIALS', message);
  if (haystack.includes('email not confirmed')) return make('EMAIL_NOT_CONFIRMED', message);
  if (haystack.includes('user already registered') || haystack.includes('already been registered')) {
    return make('USER_ALREADY_REGISTERED', message);
  }
  if (haystack.includes('password should be at least')) return make('PASSWORD_TOO_SHORT', message);
  if (haystack.includes('password') && (haystack.includes('weak') || haystack.includes('should contain'))) {
    return make('WEAK_PASSWORD', message);
  }
  if (haystack.includes('new password should be different')) return make('SAME_PASSWORD', message);
  if (haystack.includes('token has expired') || haystack.includes('otp') || haystack.includes('invalid token')) {
    return make('OTP_INVALID', message);
  }
  if (haystack.includes('rate limit') || haystack.includes('for security purposes') || status === 429) {
    return make('RATE_LIMITED', message);
  }
  if (haystack.includes('signups not allowed') || haystack.includes('signup is disabled')) {
    return make('SIGNUP_DISABLED', message);
  }
  if (haystack.includes('unable to validate email') || haystack.includes('invalid email')) {
    return make('INVALID_EMAIL', message);
  }
  if (haystack.includes('invalid phone') || haystack.includes('phone number')) return make('INVALID_PHONE', message);
  if (haystack.includes('auth session missing') || haystack.includes('jwt expired') || haystack.includes('not authenticated')) {
    return make('AUTH_REQUIRED', message);
  }

  // 4. Storage.
  if (status === 413 || haystack.includes('maximum allowed size') || haystack.includes('payload too large')) {
    return make('FILE_TOO_LARGE', message);
  }
  if (haystack.includes('mime type') || haystack.includes('invalid_mime_type') || haystack.includes('not supported')) {
    return make('FILE_TYPE_NOT_ALLOWED', message);
  }
  if (haystack.includes('already exists') || haystack.includes('duplicate')) return make('DUPLICATE', message);
  if (status === 404 || haystack.includes('object not found') || haystack.includes('not found')) {
    return make('NOT_FOUND', message);
  }
  if (status === 401 || status === 403 || haystack.includes('row-level security') || haystack.includes('permission denied')) {
    return make(status === 401 ? 'AUTH_REQUIRED' : 'NOT_ALLOWED', message);
  }

  // 5. Network.
  if (
    name === 'TypeError' ||
    haystack.includes('failed to fetch') ||
    haystack.includes('networkerror') ||
    haystack.includes('load failed') ||
    haystack.includes('fetch failed') ||
    haystack.includes('network request failed')
  ) {
    return make('NETWORK', message);
  }

  return make('GENERIC', message);
}

/** Returns the translated message for any error (hook form). */
export function useErrorMessage(): (err: unknown) => string {
  const t = useT();
  return useCallback((err: unknown) => t(parseApiError(err).key), [t]);
}

/**
 * `const showError = useErrorToast(); mutation.mutate(x, { onError: showError })`.
 * Toasts the translated message via sonner and returns the parsed error.
 */
export function useErrorToast(): (err: unknown, description?: string) => ParsedError {
  const t = useT();
  return useCallback(
    (err: unknown, description?: string) => {
      const parsed = parseApiError(err);
      if (import.meta.env.DEV) console.warn('[midatorg]', parsed.code, err);
      toast.error(t(parsed.key), description ? { description } : undefined);
      return parsed;
    },
    [t],
  );
}
