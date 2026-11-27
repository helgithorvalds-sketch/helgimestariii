# „Sápan í Geysi" — Icelandic animated science short

A ~67 s vertical (1080×1920) cartoon short about why people once poured **soap** into Geysir — and why it worked.
Built with two Claude skills:

- **claude-animated-shorts** (cartoon 3D style): one three.js world of Haukadalur rendered in Remotion — flat bean-head
  characters, ink outlines, painted textures, lens blur, the template's look modules (`src/videos/geysir/{ink,lensblur,grade,shade,cardshade,lights,paint,build,toon}.ts`).
- **video-shotcraft** (motion grammar): word-by-word captions, number/title slams, the BÚMM burst, the BANNAÐ stamp and
  three explainer boards (`Overlays.tsx`).

| Path | What |
|---|---|
| `SCRIPT.md` | Facts with sources + the Icelandic script |
| `voice/` | Narration (ElevenLabs eleven_v4, your "Íslensk kennslurödd" voice, 1.12× tempo) and `words.json` word timings |
| `src/videos/geysir/story.ts` | Shots, cameras, eruptions, lens blur — all timed to the words |
| `src/videos/geysir/world.ts`, `cast.ts`, `fx.ts` | The geothermal field, the cast (ranger in a lopapeysa, guests, kid) and 2D effects |
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
