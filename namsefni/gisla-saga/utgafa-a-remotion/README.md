# Version A — "2D characters in a 3D world" (Remotion + three.js)

Built from the free claude-animated-shorts skill (MIT, https://github.com/mromidev/claude-animated-shorts):
its bridge template was rebuilt into a Viking world for Gísla saga, episode 1.

- `src/videos/gisla/` — the world (sets.ts, terrain.ts, build.ts, paint.ts, lights.ts, world.ts),
  characters (toon.ts, cast.ts, cardshade.ts), story/camera (story.ts), post (ink.ts, lensblur.ts, grade.ts),
  entry `Gisla.tsx` (composition **GislaWorld**) and the dyslexia-friendly overlay `Overlay.tsx` + `overlay/`
  (composition **GislaOverlay**: captions 1–3 words, character-coloured names, name cards, counter).
- `audio/` — synthesized SFX + original Nordic-folk score + ducked mix (`python -I audio/mix.py --fresh`).
- `scripts/gisla_overlay_data.py` — regenerates caption/card data from `public/gisla/timeline.json`.

Setup: `npm ci`, then put the narration track at `public/gisla/voice_master.wav`
(rebuild it from `../ep01/rodd/take01–08.mp3`, each take centred in its 10 s block).
**Keep `@react-three/postprocessing` at 3.0.4** — 3.0.5+ renders blank frames under Remotion.

Render without a GPU (≈1.1–1.4 s/frame; four 600-frame ranges in parallel):

    B=<chrome-headless-shell path>; export CHROMIUM_WEBGL_RENDERER=lavapipe-patched CHROMIUM_LAVAPIPE_THREADS=auto
    npx remotion render src/index.ts GislaWorld out/world.mp4 --scale=1 --browser-executable=$B --gl=angle --concurrency=2
    npx remotion render src/index.ts GislaOverlay out/overlay.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
    ffmpeg -i out/world.mp4 -i out/overlay.mov -i audio/mix.wav -filter_complex "[0:v][1:v]overlay=format=auto,format=yuv420p[v]" -map "[v]" -map 2:a -c:v libx264 -crf 17 -c:a aac -b:a 256k final.mp4
