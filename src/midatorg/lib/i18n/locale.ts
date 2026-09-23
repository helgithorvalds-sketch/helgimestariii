export type Locale = 'is' | 'en';
export const LOCALES: Locale[] = ['is', 'en'];
export const DEFAULT_LOCALE: Locale = 'is';
export const LOCALE_STORAGE_KEY = 'midatorg-locale';

export function isLocale(v: unknown): v is Locale {
  return v === 'is' || v === 'en';
}
