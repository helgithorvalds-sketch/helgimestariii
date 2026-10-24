/**
 * localStorage with every read/write guarded: private mode, quota and
 * blocked storage never crash a screen. Only for small UI preferences.
 */
export const KEYS = {
  onboarded: 'vild-onboarded',
  howToDismissed: 'vild-howto-dismissed',
  placesView: 'vild-places-view',
} as const;

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function isOnboarded(): boolean {
  return readLocal(KEYS.onboarded) === '1';
}

export function markOnboarded(): void {
  writeLocal(KEYS.onboarded, '1');
}
