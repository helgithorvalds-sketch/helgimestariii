# Straumlind: "Hvernig er það hægt?"

A 95-second explainer for Straumlind, an Icelandic electricity retailer. It is built as a question-and-answer film: how can the same electricity cost up to 19% less? The picture is 3D clay models and 2D type at 1920×1080, 60 fps. The score and sound effects are synthesised to the same beat grid.

The script, beat map, on-screen text with English glosses, and sources for every number are in [STORYBOARD.md](STORYBOARD.md).

## How it works

- **Picture:**
  - Three.js scenes are drawn over CSS backgrounds, with DOM type on top. Every frame is a pure function of time (`window.seek(t)`), so any frame can be rendered on its own.
  - Each scene is a module in `src/scenes/` with `{id, from, to, setup, update}`. Scenes are listed in `src/scenes/index.js`.
- **Numbers:** every number on screen comes from `src/data.js`.
- **Timing:** 120 BPM, so `b(n)` is beat *n* = *n* × 0.5 s. Scenes register sound cues with `cue(t, name, params)` at the moment something happens on screen.
- **Sound:**
  - `scripts/meta.mjs` exports the timeline and cues to `out/meta.json`.
  - `audio/compose.py` writes the score and effects from it (numpy, scipy, pedalboard; no samples), so the hits land on the frames.

## Build and render

```
npm install
node scripts/build.mjs                     # bundle src/ into dist/app.js
node scripts/still.mjs out/stills 6.5 31   # review stills at given seconds
node scripts/meta.mjs                      # export timeline and sound cues
python3 audio/compose.py                   # score and effects, audio/out/mix.wav
node scripts/preview.mjs --fps=4           # quick animatic with sound
node scripts/render.mjs --workers=4        # full 60 fps render, out/video.mp4
node scripts/finalize.mjs --out=out/straumlind.mp4   # mux, -14 LUFS
```

Rendering uses Playwright with the Chromium at `/opt/pw-browsers` (software GL).

## Credits

- Typeface: Montserrat (SIL Open Font License, `public/fonts/OFL-Montserrat.txt`).
- The Straumlind logo is reproduced from straumlind.is for this pitch.
- All other models, motion, music and sound are original to this project.
