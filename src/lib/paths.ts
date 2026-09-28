/**
 * Route helpers. The app lives at the site root; every in-app link goes through
 * `href()` so links stored before the move (notifications saved as
 * '/midatorg/vidskipti/<id>', old bookmarks) still resolve.
 *
 *   href('/')                        -> '/'
 *   href('vidburdir/' + id)          -> '/vidburdir/<id>'
 *   href('/midatorg/vidskipti/1')    -> '/vidskipti/1'
 *   href('/midatorg?q=sigur')        -> '/?q=sigur'
 */
export const LEGACY_BASE = '/midatorg';

/** Strips the legacy '/midatorg' prefix so a stored link can be compared with route paths. */
export function stripBase(pathname: string): string {
  if (pathname === LEGACY_BASE) return '/';
  if (pathname.startsWith(LEGACY_BASE + '/')) return pathname.slice(LEGACY_BASE.length);
  if (pathname.startsWith(LEGACY_BASE + '?') || pathname.startsWith(LEGACY_BASE + '#')) return '/' + pathname.slice(LEGACY_BASE.length);
  return pathname;
}

export function href(path = '/'): string {
  if (!path) return '/';
  const p = path.startsWith('/') ? path : '/' + path;
  return stripBase(p);
}
