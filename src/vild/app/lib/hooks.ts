/**
 * Small hooks shared by the app screens.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation as useRouteLocation } from 'react-router-dom';
import { useMerchants, usePockets, useSectors } from '../../lib/queries';
import type { LatLng } from './geo';
import type { Merchant, Pocket, Sector } from '../../lib/types';

export type GeoState = { status: 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable'; position: LatLng | null };

/** The user's position, asked once; never blocks a screen. */
export function useGeolocation(enabled = true): GeoState {
  const [state, setState] = useState<GeoState>({ status: 'idle', position: null });
  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unavailable', position: null });
      return;
    }
    let alive = true;
    setState((s) => (s.status === 'idle' ? { ...s, status: 'asking' } : s));
    navigator.geolocation.getCurrentPosition(
      (pos) => alive && setState({ status: 'granted', position: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => alive && setState({ status: 'denied', position: null }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
    return () => {
      alive = false;
    };
  }, [enabled]);
  return state;
}

/** Pockets joined with their merchant and sector; what the balance card and the wallet show. */
export type PocketView = { pocket: Pocket; merchant: Merchant; sector: Sector | null; label: string };

export function usePocketViews() {
  const pockets = usePockets();
  const merchants = useMerchants();
  const sectors = useSectors();
  const views = useMemo<PocketView[]>(() => {
    if (!pockets.data || !merchants.data) return [];
    return pockets.data
      .map((pocket) => {
        const merchant = merchants.data.find((m) => m.id === pocket.merchantId);
        if (!merchant) return null;
        const sector = sectors.data?.find((s) => s.slug === pocket.sector) ?? null;
        return { pocket, merchant, sector, label: sector?.pocketName ?? merchant.name };
      })
      .filter((v): v is PocketView => v != null);
  }, [pockets.data, merchants.data, sectors.data]);
  const total = views.reduce((a, v) => a + v.pocket.balance, 0);
  const earnedTotal = views.reduce((a, v) => a + v.pocket.earnedTotal, 0);
  const spentTotal = views.reduce((a, v) => a + v.pocket.spentTotal, 0);
  return {
    views,
    total,
    earnedTotal,
    spentTotal,
    isPending: pockets.isPending || merchants.isPending,
    error: pockets.error ?? merchants.error,
    refetch: () => {
      void pockets.refetch();
      void merchants.refetch();
    },
  };
}

/** Sets the browser title while the screen is mounted. */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · VILD` : 'VILD';
    return () => {
      document.title = prev;
    };
  }, [title]);
}

/** Scroll to the top on every route change (the document scrolls, not the column). */
export function useScrollToTop() {
  const { pathname } = useRouteLocation();
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      /* jsdom */
    }
  }, [pathname]);
}

/** True when the router history has somewhere to go back to inside the app. */
export function canGoBack(): boolean {
  try {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    return typeof idx === 'number' && idx > 0;
  } catch {
    return false;
  }
}
