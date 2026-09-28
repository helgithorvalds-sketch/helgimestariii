export type HomeView = 'map' | 'list';
export const VIEW_STORAGE_KEY = 'midatorg-view';

/** First visit opens on the map; the choice is remembered per browser. */
export function readHomeView(): HomeView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'map';
  } catch {
    return 'map';
  }
}

export function writeHomeView(view: HomeView): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
}
