import { useNavigate } from 'react-router-dom';
import { useT } from '../lib/i18n';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { href } from '../lib/paths';
import { MapView } from '../components/map/MapView';
import { ViewToggle } from '../components/map/ViewToggle';
import { writeHomeView } from '../components/map/viewPref';

/** /kort — the event map on its own URL (a shareable deep link to the map view). */
export default function MapPage() {
  const t = useT();
  const navigate = useNavigate();
  useDocumentTitle(t('title.map'));
  return (
    <MapView
      toolbar={
        <ViewToggle
          value="map"
          onChange={(v) => {
            writeHomeView(v);
            if (v === 'list') navigate(href('/'));
          }}
        />
      }
    />
  );
}
