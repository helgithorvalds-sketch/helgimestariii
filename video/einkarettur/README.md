# SVIF einkaréttur – útskýringarmyndband

3D explainer video (Icelandic, 1920×1080, 30 fps, ~2:57) for companies about SVIF, the book for
expecting parents: who we are, how SVIF works (a page, up to three companies per category),
what exclusivity (einkaréttur) is, why it pays off, how bidding works, common questions, and what
we believe. "SVIF" is a placeholder name.

Built with three.js (rendered headless in Chromium via Playwright) plus an HTML text layer.
Everything is timed to a 110 BPM grid (`B(bar, beat)` in `lib.js`), and the soundtrack
(`audio.py`) is generated from the same timeline, so cuts and pops land on the beat.

## Files

| File | What it is |
| --- | --- |
| `story.js` | The whole script: every scene, text line, price and camera move. Edit this. |
| `intro.js` | The 15-second opening: expecting couple, 54 category tiles flying into the book, page flips through discount pages, book closes. |
| `deals.js` | The six discount pages the book flips through. |
| `adpage.js` | Your company's ad page in the ending. |
| `icons.js` | Flat icons used on shop signs and pages (clothes, pram, toy, swim, camera…). |
| `lib.js` | Engine: easing, keyframes, text animation, 3D models (shops, book, crown…). |
| `index.html` | Fonts and text styles. |
| `audio.py` | Original music + sound effects, generated from `events.json` (arrangement hints come from `MUSIC` in `story.js`). |
| `render.js` / `render_all.sh` | Frame renderer and full render (4 parallel workers). |
| `stills.js` / `sheet.sh` | Render single frames to check a layout, e.g. `node stills.js out b11.3 b26.2`. |

## Render

```bash
npm install
./render_all.sh            # → einkarettur_svif.mp4 (~15–20 min on 4 CPU cores)
```

Prices live in the text of `story.js`: page 40.000 kr./month, up to three companies per category,
exclusivity bids start at 40.000 kr. on top of the page, highest bid after the deadline wins,
exclusivity lasts 3 months. Companies are shown as shops with category icons.
