/* eslint-disable react-refresh/only-export-components -- provider + hooks live together by design */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from './locale';
import { setFormatLocale } from '../format';
import common from './dict/common';
import errors from './dict/errors';
import home from './dict/home';
import event from './dict/event';
import forms from './dict/forms';
import deals from './dict/deals';
import account from './dict/account';
import admin from './dict/admin';

export type { Locale };
export { LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './locale';

export type Dict = { is: Record<string, string>; en: Record<string, string> };
export type TVars = Record<string, string | number | null | undefined>;
export type TFunction = (key: string, vars?: TVars) => string;

/** Every dictionary, by owner. Exported for the parity test. */
export const dictionaries: Record<string, Dict> = { common, errors, home, event, forms, deals, account, admin };

function merge(locale: Locale): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of Object.keys(dictionaries)) {
    Object.assign(out, dictionaries[name][locale]);
  }
  return out;
}

export const messages: Record<Locale, Record<string, string>> = { is: merge('is'), en: merge('en') };

const warned = new Set<string>();

export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = vars[name];
    return v == null ? match : String(v);
  });
}

/** Plain function version of `t` for use outside React (toasts from api code, tests). */
export function translate(locale: Locale, key: string, vars?: TVars): string {
  const table = messages[locale];
  let template = table[key];
  if (template === undefined) {
    // fall back to the other language before giving up
    const other: Locale = locale === 'is' ? 'en' : 'is';
    template = messages[other][key];
    if (import.meta.env.DEV && !warned.has(key)) {
      warned.add(key);
      console.warn(`[midatorg i18n] missing key "${key}" for locale "${locale}"`);
    }
    if (template === undefined) return key;
  }
  return interpolate(template, vars);
}

export function hasKey(key: string, locale: Locale = 'is'): boolean {
  return messages[locale][key] !== undefined;
}

function readStoredLocale(): Locale {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(v)) return v;
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_LOCALE;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());
  // keep the non-React formatters in sync (idempotent)
  setFormatLocale(locale);
  // <html lang> follows the locale from the first render, not only after a toggle
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    setFormatLocale(l);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<TFunction>((key, vars) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT/useLocale must be used inside <I18nProvider>');
  }
  return ctx;
}

/** `const t = useT(); t('home.title'); t('deal.amount', { amount })` */
export function useT(): TFunction {
  return useI18n().t;
}

/** `const [locale, setLocale] = useLocale();` persisted in localStorage 'midatorg-locale'. */
export function useLocale(): [Locale, (l: Locale) => void] {
  const { locale, setLocale } = useI18n();
  return [locale, setLocale];
}
