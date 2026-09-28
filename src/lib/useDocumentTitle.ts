import { useSeo } from './seo';

export { APP_TITLE } from './seo';

/**
 * `useDocumentTitle('Sigur Rós')` → "Sigur Rós · Miðatorg", with the default description,
 * share image and a canonical link for the current path. Pass nothing for the site title.
 * Pages with richer data (events) call `useSeo` directly.
 */
export function useDocumentTitle(title?: string | null, opts: { noindex?: boolean } = {}): void {
  useSeo({ title: title ?? null, noindex: opts.noindex });
}
