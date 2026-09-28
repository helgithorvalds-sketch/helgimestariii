/**
 * Phone-app glue (Capacitor). Every function is a no-op on the website, and the plugins
 * are imported lazily so the web bundle stays small.
 */
import { isNativeApp } from './platform';
import { supabase } from './supabase';
import { href } from './paths';
import { SITE_URL } from './seo';

type Navigate = (to: string) => void;

/** `is.midatorg.app://app/eg?eid=ok` or `https://<site>/vidburdir/1` → in-app path. */
export function appPathFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const site = new URL(SITE_URL);
    if (u.protocol === 'is.midatorg.app:' || u.host === site.host) {
      const path = u.protocol === 'is.midatorg.app:' ? u.pathname || '/' : u.pathname;
      return href(path) + u.search;
    }
  } catch {
    // not a URL we handle
  }
  return null;
}

/** Status bar, splash, Android back button and links that open the app. Call once. */
export async function initNativeShell(navigate: Navigate): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  const [{ App }, { StatusBar, Style }, { SplashScreen }, { Browser }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/browser'),
  ]);
  StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  SplashScreen.hide().catch(() => undefined);

  const open = await App.addListener('appUrlOpen', ({ url }) => {
    const path = appPathFromUrl(url);
    if (!path) return;
    Browser.close().catch(() => undefined); // the electronic ID flow ran in the in-app browser
    navigate(path);
  });
  const back = await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
  return () => {
    void open.remove();
    void back.remove();
  };
}

/** Opens a page outside the app (electronic ID provider, tix.is) in the in-app browser. */
export async function openExternal(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.location.assign(url);
    return;
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}

/**
 * Asks for permission once and registers this phone for push notifications
 * ("Miðar komnir í sölu", deal updates). Tapping a notification opens its page.
 */
export async function registerPush(navigate: Navigate): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const { Capacitor } = await import('@capacitor/core');
  const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

  let status = await PushNotifications.checkPermissions();
  if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') status = await PushNotifications.requestPermissions();
  if (status.receive !== 'granted') return () => undefined;

  const reg = await PushNotifications.addListener('registration', ({ value }) => {
    void supabase.rpc('mt_register_push_token', { p_token: value, p_platform: platform });
  });
  const tap = await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const link = (notification.data as { link?: string } | undefined)?.link;
    if (link) navigate(href(link));
  });
  await PushNotifications.register();
  return () => {
    void reg.remove();
    void tap.remove();
  };
}

/** Native share sheet in the apps, Web Share where the browser has it, else copy the link. */
export async function shareLink(opts: { title: string; text?: string; url: string }): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (isNativeApp()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: opts.title, text: opts.text, url: opts.url, dialogTitle: opts.title });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return 'shared';
    }
    await navigator.clipboard.writeText(opts.url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
