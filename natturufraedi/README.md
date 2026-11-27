# „Sápan í Geysi" — Icelandic animated science short

A ~67 s vertical (1080×1920) cartoon short about why people once poured **soap** into Geysir — and why it worked.
Built with two Claude skills:

- **claude-animated-shorts** (cartoon 3D style): one three.js world of Haukadalur rendered in Remotion — flat bean-head
  characters, ink outlines, painted textures, lens blur, the template's look modules (`src/shared/look/{ink,lensblur,grade,shade,cardshade,lights,paint,toon,fx}.ts`).
- **video-shotcraft** (motion grammar): word-by-word captions, number/title slams, the BÚMM burst, the BANNAÐ stamp and
  three explainer boards (`Overlays.tsx`).

| Path | What |
|---|---|
| `SCRIPT.md` | Facts with sources + the Icelandic script |
| `voice/` | Narration (ElevenLabs eleven_v4, your "Íslensk kennslurödd" voice, 1.12× tempo) and `words.json` word timings |
| `src/kaflar/geysir/story.ts` | Shots, cameras, eruptions, lens blur — all timed to the words |
| `src/kaflar/geysir/world.ts`, `cast.ts`, `build.ts` | The geothermal field, the cast (ranger in a lopapeysa, guests, kid) and 2D effects |
| `audio/mix.py` | Offline soundtrack: voice + ducked music + 46 SFX cues, mastered to −14 LUFS |
| `final/` | Finished film |

Credits: music generated with ElevenLabs Music v2.5 (via Higgsfield); sound effects CC0 from Freesound
(`public/audio/sfx/FREESOUND-CREDITS.md`); fonts Inter + Plus Jakarta Sans (OFL).

```bash
npm install
npx remotion studio src/index.ts                                   # preview
npx remotion render src/index.ts GeysirShort out/picture.mp4 --muted
python3 audio/mix.py                                               # public/audio/mix.wav
ffmpeg -i out/picture.mp4 -i public/audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k final/geysir.mp4
```

---

## Náttúrufræði (seed notes)

This project was seeded from `geysir-short/` on branch `origin/claude/blissful-mayer-7dzw09`
at commit **b259498** (Geysir short), minus `public/audio/mix.wav`, `voice/*.mp3`, `voice/*.align.json` and `final/`.
Template licence: `LICENSE-claude-animated-shorts.txt` (MIT).

Rendering in a GPU-less container (CPU SwiftShader WebGL):

```
REMOTION_GL=swangle \
REMOTION_BROWSER=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome \
REMOTION_TMP=/tmp/remotion-tmp COMP=GeysirShort \
node scripts/bridge-stills.mjs out/baseline/g_ 100,800,1500 0.5
python3 tools/still_check.py out/baseline/*.jpg     # black/white frame guard
python3 -m pytest tests -q
```

- `REMOTION_GL` (added to `scripts/bridge-stills.mjs`, default still `angle`) must be `swangle` without a GPU;
  plain `angle` fails with "A WebGL context could not be created".
- `REMOTION_BROWSER` points at Playwright's Chromium (otherwise Remotion tries to download one).
- A cold run (bundle + 3 stills) takes about 13 s here.
