/**
 * Haptics through Capacitor when running inside the native shell; a no-op on
 * the web. Imported lazily so the web bundle never pays for the plugin.
 */
type Style = 'light' | 'medium' | 'heavy';

function isNative(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

export async function haptic(style: Style = 'light'): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {
    /* plugin missing: ignore */
  }
}

export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}

export async function hapticSelection(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionChanged();
  } catch {
    /* ignore */
  }
}
