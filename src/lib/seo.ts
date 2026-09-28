import { useEffect } from 'react';

/** Public address of the website (canonical links, share links, auth e-mails from the phone apps). */
export const SITE_URL: string = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://midatorg.lovable.app').replace(/\/+$/, '');

export const APP_TITLE = 'Miðatorg';
export const DEFAULT_TITLE = 'Miðatorg – miðar á tónleika og viðburði, manna á milli';
export const DEFAULT_DESCRIPTION =
  'Kauptu og seldu miða á tónleika, leiksýningar og íþróttaviðburði á Íslandi. Allir viðburðir af tix.is, aldrei yfir upprunalegu verði og staðfestir notendur.';
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export type SeoInput = {
  /** Page title; shown as "<title> · Miðatorg". Empty = the default site title. */
  title?: string | null;
  description?: string | null;
  /** Absolute https image for link previews. */
  image?: string | null;
  /** Path for the canonical link; defaults to the current path without the query. */
  path?: string | null;
  noindex?: boolean;
  /** schema.org object for this page (e.g. an Event). */
  jsonLd?: Record<string, unknown> | null;
  type?: 'website' | 'article';
};

const JSONLD_ID = 'mt-page-jsonld';

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content == null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Writes title, description, Open Graph / Twitter tags, canonical, robots and JSON-LD into <head>. */
export function applySeo(input: SeoInput = {}): void {
  if (typeof document === 'undefined') return;
  const fullTitle = input.title ? `${input.title} · ${APP_TITLE}` : DEFAULT_TITLE;
  const description = trimDescription(input.description || DEFAULT_DESCRIPTION);
  const image = input.image && /^https:\/\//i.test(input.image) ? input.image : DEFAULT_IMAGE;
  const path = input.path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const url = SITE_URL + (path.startsWith('/') ? path : `/${path}`);

  document.title = fullTitle;
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', input.title ?? DEFAULT_TITLE);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:type', input.type ?? 'website');
  setMeta('name', 'twitter:title', input.title ?? DEFAULT_TITLE);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
  setMeta('name', 'robots', input.noindex ? 'noindex, nofollow' : null);
  setCanonical(url);

  const existing = document.getElementById(JSONLD_ID);
  if (input.jsonLd) {
    const script = existing ?? document.createElement('script');
    script.id = JSONLD_ID;
    script.setAttribute('type', 'application/ld+json');
    // "<" is escaped so event text can never close the script element
    script.textContent = JSON.stringify(input.jsonLd).replace(/</g, '\\u003c');
    if (!existing) document.head.appendChild(script);
  } else {
    existing?.remove();
  }
}

/** Sets the page's head tags while the page is shown. */
export function useSeo(input: SeoInput): void {
  const key = JSON.stringify(input);
  useEffect(() => {
    applySeo(JSON.parse(key) as SeoInput);
  }, [key]);
}
