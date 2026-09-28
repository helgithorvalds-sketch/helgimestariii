/**
 * True inside the iOS / Android app (Capacitor injects `window.Capacitor`), false on the
 * website. Kept dependency-free so the web bundle does not need the Capacitor packages.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}
