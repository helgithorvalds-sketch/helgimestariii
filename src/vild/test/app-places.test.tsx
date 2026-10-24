import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import PlacesPage from '../app/pages/PlacesPage';
import { freshApi, renderAt, signInConsumer } from './setup-helpers';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: unknown }) => <div data-testid="map">{children as never}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => ({ getZoom: () => 6, project: () => ({ x: 0, y: 0 }), fitBounds: () => undefined, invalidateSize: () => undefined }),
  useMapEvents: () => undefined,
}));
vi.mock('leaflet', () => ({ default: { divIcon: () => ({}), latLngBounds: () => ({}) } }));

describe('PlacesPage', () => {
  beforeEach(() => localStorage.clear());

  it('lists every place in list mode, sorted by town, and filters by region', async () => {
    localStorage.setItem('vild-places-view', 'list');
    const api = freshApi();
    await signInConsumer(api);
    renderAt('/vild/app/stadir', '/vild/app/stadir', <PlacesPage />);

    await screen.findByRole('heading', { level: 1, name: 'Staðir' });
    expect(screen.getByRole('tab', { name: 'Listi' })).toHaveAttribute('aria-selected', 'true');
    const list = await screen.findByRole('list');
    const rows = within(list).getAllByRole('link');
    expect(rows).toHaveLength(9);
    expect(rows[0]).toHaveTextContent('Lúna Akureyri'); // Akureyri sorts first by town
    expect(rows[0]).toHaveTextContent('Söfnun væntanleg');
    // Reykjanesbær's till is offline: paused, not "coming"
    const keflavik = within(list).getByText('Lúna Reykjanesbæ').closest('a')!;
    expect(keflavik).toHaveTextContent('Söfnun í bið');
    expect(keflavik).not.toHaveTextContent('væntanleg');
    expect(within(list).getByText('Lúna Laugavegi').closest('a')).toHaveAttribute('href', '/vild/app/stadir/l_laugavegur');

    fireEvent.click(screen.getByRole('button', { name: 'Höfuðborgarsvæðið' }));
    expect(within(screen.getByRole('list')).getAllByRole('link')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Akureyri' }));
    expect(within(screen.getByRole('list')).getAllByRole('link')).toHaveLength(1);

    // switching to the map remembers the choice
    fireEvent.click(screen.getByRole('tab', { name: 'Kort' }));
    expect(localStorage.getItem('vild-places-view')).toBe('map');
    await screen.findByTestId('map');
  });
});
