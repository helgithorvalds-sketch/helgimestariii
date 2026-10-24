import { useEffect } from 'react';

/** Sets the browser tab title for a site page. VildApp restores the host title on unmount. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
