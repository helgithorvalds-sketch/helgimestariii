# SVIF · Fyrir nýbakaða foreldra – explainer video

3D explainer for parents and relatives: the many things new parents must sort out fold into one booklet of
discounts; a relative orders it with a simple form; printing, assembly and delivery are free.

- Design: `docs/superpowers/specs/2026-11-26-foreldrar-video-design.md`
- three.js scene rendered frame by frame in headless Chromium (SwiftShader), composited with a full-HD 2D text
  overlay and piped to ffmpeg. Music: `audio/music_raw.mp3` (generated with ElevenLabs, 110 BPM).

```bash
npm install
node render.mjs --still 12.5,40          # PNG stills → out/stills/
node render.mjs --sheet 1,10,20 --cols 3 # contact sheet → out/stills/sheet.jpg
./render-all.sh                          # full video → out/svif-foreldrar.mp4 (~30–50 min on 4 cores)
```

Files: `src/timeline.js` (bar timings, chapters, on-screen text), `src/scenes/*.js` (one file per part of the
story), `src/scenes/cover.js` (placeholder cover art: swap for the real design), `src/pages.js` (example offer pages).
