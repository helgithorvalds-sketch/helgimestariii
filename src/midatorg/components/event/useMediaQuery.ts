import { useEffect, useState } from 'react';

function read(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** `useMediaQuery('(min-width: 768px)')` — false during SSR / when matchMedia is unavailable. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => read(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    setMatches(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

/** Tailwind `md` breakpoint: the order book switches from tabs to two columns here. */
export const MD_QUERY = '(min-width: 768px)';
