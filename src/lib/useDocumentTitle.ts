import { useEffect } from 'react';

export const APP_TITLE = 'Miðatorg';

/**
 * `useDocumentTitle('Sigur Rós')` → "Sigur Rós · Miðatorg". Pass nothing for the bare app name.
 * The CRM's title is restored by MidatorgApp when the module unmounts.
 */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);
}
