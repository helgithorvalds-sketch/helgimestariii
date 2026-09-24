import { describe, expect, it } from 'vitest';
import { ALL_ERROR_CODES, parseApiError, RPC_ERROR_CODES } from '../lib/errors';
import errorsDict from '../lib/i18n/dict/errors';

describe('parseApiError', () => {
  it('maps every RPC exception message to its own code', () => {
    for (const code of RPC_ERROR_CODES) {
      const parsed = parseApiError({ message: code, code: 'P0001', details: null, hint: null });
      expect(parsed.code).toBe(code);
      expect(parsed.key).toBe(`errors.${code}`);
    }
  });

  it('accepts a code followed by extra context', () => {
    expect(parseApiError({ message: 'OWN_LISTING: seller cannot buy', code: 'P0001' }).code).toBe('OWN_LISTING');
  });

  it('understands our own thrown errors', () => {
    expect(parseApiError(new Error('DUPLICATE_PROOF')).code).toBe('DUPLICATE_PROOF');
    expect(parseApiError('AUTH_REQUIRED').code).toBe('AUTH_REQUIRED');
  });

  it('maps Postgres unique violations by context', () => {
    expect(
      parseApiError({ code: '23505', message: 'duplicate key value violates unique constraint "mt_listing_proofs_sha_idx"' }).code,
    ).toBe('DUPLICATE_PROOF');
    expect(
      parseApiError({ code: '23505', message: 'duplicate key value violates unique constraint "mt_alerts_user_id_event_id_key"' }).code,
    ).toBe('ALERT_EXISTS');
    expect(parseApiError({ code: '23505', message: 'duplicate key value' }).code).toBe('DUPLICATE');
  });

  it('maps check violations, RLS and PostgREST codes', () => {
    expect(
      parseApiError({ code: '23514', message: 'new row violates check constraint "mt_listings_price_cap"' }).code,
    ).toBe('PRICE_ABOVE_FACE_VALUE');
    expect(parseApiError({ code: '23514', message: 'check constraint "mt_listings_quantity_check"' }).code).toBe(
      'CHECK_VIOLATION',
    );
    expect(parseApiError({ code: '42501', message: 'permission denied for table mt_deals' }).code).toBe('NOT_ALLOWED');
    expect(parseApiError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }).code).toBe(
      'NOT_FOUND',
    );
    expect(parseApiError({ code: '23503', message: 'violates foreign key constraint' }).code).toBe('INVALID_REFERENCE');
  });

  it('maps Supabase auth messages and codes', () => {
    expect(parseApiError({ message: 'Invalid login credentials', status: 400 }).code).toBe('INVALID_CREDENTIALS');
    expect(parseApiError({ message: 'Email not confirmed', status: 400 }).code).toBe('EMAIL_NOT_CONFIRMED');
    expect(parseApiError({ message: 'User already registered', status: 422 }).code).toBe('USER_ALREADY_REGISTERED');
    expect(parseApiError({ message: 'Password should be at least 6 characters', status: 422 }).code).toBe(
      'PASSWORD_TOO_SHORT',
    );
    expect(parseApiError({ message: 'x', code: 'invalid_credentials' }).code).toBe('INVALID_CREDENTIALS');
    expect(parseApiError({ message: 'x', code: 'over_email_send_rate_limit' }).code).toBe('RATE_LIMITED');
    expect(parseApiError({ message: 'Token has expired or is invalid' }).code).toBe('OTP_INVALID');
    expect(parseApiError({ message: 'For security purposes, you can only request this after 60 seconds.' }).code).toBe(
      'RATE_LIMITED',
    );
  });

  it('maps storage and network failures', () => {
    expect(parseApiError({ statusCode: '413', message: 'The object exceeded the maximum allowed size' }).code).toBe(
      'FILE_TOO_LARGE',
    );
    expect(parseApiError({ statusCode: '415', message: 'mime type text/plain is not supported' }).code).toBe(
      'FILE_TYPE_NOT_ALLOWED',
    );
    expect(parseApiError(new TypeError('Failed to fetch')).code).toBe('NETWORK');
  });

  it('falls back to GENERIC and never throws', () => {
    expect(parseApiError(undefined).code).toBe('GENERIC');
    expect(parseApiError({}).code).toBe('GENERIC');
    expect(parseApiError({ message: 'something odd happened' }).code).toBe('GENERIC');
    expect(parseApiError(42).code).toBe('GENERIC');
  });

  it('renders a real translation in both languages for every code', () => {
    for (const code of ALL_ERROR_CODES) {
      // a code whose dictionary entry is still missing falls back to errors.GENERIC, never to the raw key
      const { key } = parseApiError(code);
      expect([`errors.${code}`, 'errors.GENERIC'], code).toContain(key);
      expect(errorsDict.is[key], `is ${key}`).toBeTruthy();
      expect(errorsDict.en[key], `en ${key}`).toBeTruthy();
    }
    for (const key of Object.keys(errorsDict.is)) expect(errorsDict.en[key], `en ${key}`).toBeTruthy();
    for (const key of Object.keys(errorsDict.en)) expect(errorsDict.is[key], `is ${key}`).toBeTruthy();
  });

  it('keeps the precise code for edge-function errors even when the text falls back', () => {
    const parsed = parseApiError(new Error('PARSE_FAILED: NO_START_DATE'));
    expect(parsed.code).toBe('PARSE_FAILED');
    expect(parseApiError(new Error('EVENT_IN_USE')).code).toBe('EVENT_IN_USE');
    expect(parseApiError({ message: 'INVALID_INPUT: tix_url must be a tix.is link', code: 'P0001' }).code).toBe('INVALID_INPUT');
  });
});
