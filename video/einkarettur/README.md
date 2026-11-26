# Einkaréttur í Foreldrabók – útskýringarmyndband

3D explainer video (Icelandic, 1920×1080, 30 fps, ~2:48) that walks advertisers through
how pages and category exclusivity (einkaréttur) are sold in Foreldrabók: what exclusivity is,
why it pays off, how the 2-week bidding works, common questions, and what we believe.

Built with three.js (rendered headless in Chromium via Playwright) plus an HTML text layer.
Everything is timed to a 110 BPM grid (`B(bar, beat)` in `lib.js`), and the soundtrack
(`audio.py`) is generated from the same timeline, so cuts and pops land on the beat.

## Files

| File | What it is |
| --- | --- |
| `story.js` | The whole script: every scene, text line, price and camera move. Edit this. |
| `lib.js` | Engine: easing, keyframes, text animation, 3D models (pram, crown, coins…). |
| `index.html` | Fonts and text styles. |
| `audio.py` | Original music + sound effects, generated from `events.json` (arrangement hints come from `MUSIC` in `story.js`). |
| `render.js` / `render_all.sh` | Frame renderer and full render (4 parallel workers). |
| `stills.js` / `sheet.sh` | Render single frames to check a layout, e.g. `node stills.js out b11.3 b26.2`. |

## Render

```bash
npm install
./render_all.sh            # → einkarettur_foreldrabok.mp4 (~15–20 min on 4 CPU cores)
```

Prices live in the text of `story.js`: page 40.000 kr./month, exclusivity bidding starts at 40.000 kr.
on top of the page, same 2-week window for everyone, exclusivity lasts 3 months.
Companies are anonymous (A, B, C, D); categories come from the Foreldrabók research.
