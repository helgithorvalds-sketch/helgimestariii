# Gleðipeningar: motion-graphics pitch

A 139-second pitch in five chapters for **Gleðipeningar** ("happy money"), a credit-back loyalty app for restaurant and bar chains. Takk krónur, Hagar's app for Bónus and Hagkaup, is used to explain how the model works and where it falls short. The film is made entirely with code: every frame is a function of time, drawn by Three.js and HTML in headless Chromium, and stitched with FFmpeg. The music and sound effects are synthesised in Python from the same timeline, so every hit lands on the beat.

The finished film is `gledipeningar.mp4` (139 s, 1920×1080, 60 fps, AAC stereo at -14 LUFS). See `STORYBOARD.md` for the script with English glosses and `storyboard/storyboard.png` for one rendered key frame per scene.

## Requirements

- Node 20+, Python 3.10+ with `numpy`, `scipy` and `pedalboard`, and `ffmpeg` on the path.
- Chromium for Playwright. The scripts expect it at `/opt/pw-browsers/chromium-1194`; change `CHROME` in `scripts/browser.mjs` for another location.

## Make the film

```sh
npm install
npm run build                            # bundle src/ into dist/app.js
node scripts/storyboard.mjs              # key frames + out/meta.json (timeline and sound cues)
python3 audio/compose.py                 # music + effects -> audio/out/mix.wav
node scripts/render.mjs --workers=3      # frames -> out/seg/*.mp4 -> out/video.mp4
node scripts/finalize.mjs                # mux, loudness to -14 LUFS -> out/gledipeningar.mp4
```

Re-render one scene after a change, then concatenate and mux again:

```sh
npm run build && node scripts/render.mjs --only=math && node scripts/finalize.mjs
```

Check single frames while working: `node scripts/still.mjs out/stills 12.5 30 --scene=how,compare`.
For a quick watchable cut with the music, `node scripts/preview.mjs --fps=4` writes a half-size animatic to `out/preview.mp4` in a few minutes.

## Layout

| Path | What it holds |
| --- | --- |
| `src/scenes/` | One file per scene. Each exports `from`, `to`, `setup()` and `update(t)` and registers its sound cues. `chapter.js` makes the colour question cards, and `index.js` holds the order. |
| `src/models/` | Procedural clay models: Takk and Gleðipeningar coins, phone, card terminal, food and sandwich, stores, bar, bedroom, people. |
| `src/three/` | Renderer, lighting, contact shadows, materials, extruded 3D type. |
| `src/core/` | Easing, springs, the 110 BPM beat grid and DOM text animation. |
| `audio/` | `dsp.py` (synth toolkit), `compose.py` (score, effects, mix), `analyze.py` (level and spectrogram report). |
| `scripts/` | Build, still frames, storyboard, parallel renderer, final mux. |

## Facts on screen

Takk rates, the 1 tkr = 1 kr. rule and the store list come from takkkronur.is. The 65,000 member figure is Hagar's (September 2026). The restaurant and bar figures are illustrative examples for the pitch.

Typeface: Figtree (SIL Open Font License). The Takk wordmark belongs to Hagar. The Gleðipeningar smiling-coin mark is an original placeholder made for this pitch.
