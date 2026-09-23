/**
 * Route helpers. The whole app is mounted under `/midatorg` (see src/App.tsx);
 * every link in the app must be built with `href()` so the prefix is never hand-typed.
 *
 *   href('/')                      -> '/midatorg'
 *   href('/vidburdir/' + id)       -> '/midatorg/vidburdir/<id>'
 *   href('/?q=sigur')              -> '/midatorg?q=sigur'
 */
export const MIDATORG_BASE = '/midatorg';

export function href(path = '/'): string {
  if (!path) return MIDATORG_BASE;
  if (path.startsWith(MIDATORG_BASE + '/') || path === MIDATORG_BASE || path.startsWith(MIDATORG_BASE + '?')) {
    return path;
  }
  const p = path.startsWith('/') ? path : '/' + path;
  if (p === '/') return MIDATORG_BASE;
  if (p.startsWith('/?')) return MIDATORG_BASE + p.slice(1);
  return MIDATORG_BASE + p;
}

/** Strips the prefix so a stored absolute link ('/midatorg/vidskipti/1') can be compared with route paths. */
export function stripBase(pathname: string): string {
  if (pathname === MIDATORG_BASE) return '/';
  if (pathname.startsWith(MIDATORG_BASE + '/')) return pathname.slice(MIDATORG_BASE.length);
  return pathname;
}
