# COWI · Danmarks Digitale Gadefoto — film

A 68-second 3D explainer film for COWI's Danmarks Digitale Gadefoto (DDG),
built from the project storyboard. Everything is rendered in code with
three.js: a white architectural-model look, with the important things in
COWI colours (orange #F04E23 for streets, dots and Denmark, grass #31B18F
for the 2026 cycle paths). Inside the 360° street photo the world switches
to full colour.

## Scenes (30 fps, 1920×1080)

| # | Time | Content |
|---|------|---------|
| 1–2 | 0–10 s | White clay globe → Denmark extrudes in orange |
| 3 | 10–16 s | National road network draws in (OSM), dive to Silkeborg, city rises |
| 4 | 16–22 s | Permit house, application card, the long site-visit drive + clock |
| 5 | 22–28 s | A photo dot every 7 m spreads across every street |
| 6 | 28–34 s | COWI street-photo car (360° camera, RTK GPS, callouts) · 2026 path cyclist |
| 7 | 34–42 s | Dive into one dot → full-colour 360° street photo spins |
| 8 | 42–48 s | Date stamp, split screen 2024 vs 2026 (new carport) |
| 9 | 48–55 s | Caseworker's Panoramic Viewer: address, photo, approved |
| 10 | 55–62 s | Pull back: house → Silkeborg → all of Denmark glowing |
| 11 | 62–68 s | COWI logo end card |

## Build

```sh
npm install
# data (already committed in data/): Natural Earth + OpenStreetMap
node scripts/build-data.mjs <natural-earth-geojson-dir> <osm-tiles-dir>
python3 scripts/extract-dk-roads.py denmark-latest.osm.pbf   # needs `pip install osmium`
python3 scripts/music.py out/music.wav                       # original ambient score
node scripts/preview.mjs 12 25 40                            # stills → out/preview/
node scripts/render.mjs                                      # frames → out/frames/ (resumable)
node scripts/render.mjs --encode                             # → out/COWI_DDG_film.mp4
```

Open `index.html` through any static server to scrub: `window.renderFrame(t)`.

## Sources

- COWI wordmark and brand colours: cowi.com.
- Map data © OpenStreetMap contributors (ODbL); Natural Earth (public domain).
- Facts: COWI DDG pages, the Ministry of Taxation contract, the 2026 "Pathway
  cyclist for DDG" job ad (5,000 km of paths, first time by bike).
- The address "Eksempelvej 7" and the permit case are fictional.
