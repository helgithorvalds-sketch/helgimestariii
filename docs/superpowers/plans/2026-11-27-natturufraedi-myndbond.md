# Náttúrufræði shorts – Chapter 1 pilot + 10 scripts: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ten finished Icelandic scripts for 7th-grade náttúrufræði shorts, and Chapter 1, "Ísland verður til – eldgos"
(Heimaey 1973), produced as a 60–90 s vertical cartoon short in the Geysir short's look.

**Architecture:** `natturufraedi/` is a Remotion + three.js project seeded from the Geysir short (`geysir-short/` on
branch `claude/blissful-mayer-7dzw09`).
- Its look modules and overlay grammar move into `src/shared/`.
- Each chapter lives in `src/kaflar/<name>/`: world, cast, story timeline anchored to the narrator's words, and overlays.
- The Geysir short stays inside the project as a regression reference for the shared kit.
- Voice is the user's ElevenLabs voice. Sound is an offline numpy mix.

**Tech Stack:**
- Remotion 4.0.484, three 0.170, @react-three/fiber 9, postprocessing 6.37
- TypeScript, vitest
- Python 3.13 (numpy, pytest, PIL), ffmpeg
- ElevenLabs API: TTS `eleven_v4`, Scribe STT, Music

**Spec:** `docs/superpowers/specs/2026-11-27-natturufraedi-myndbond-design.md`

## Global Constraints

- **Format:** 1080×1920, 30 fps, 60–90 s per chapter, so `TOTAL` is between 1800 and 2700 frames. H.264 final, AAC 192k.
- **Narrator:**
  - voice `vuKNwSXHmXUQ2BKzoJCH` ("Íslensk kennslurödd (kona)"), model `eleven_v4`, `language_code: "is"`;
  - generated at speed 1.0, then `ffmpeg atempo=1.12`, with word times divided by 1.12 (exactly the Geysir pipeline);
  - eleven_v4 audio tags like `[excited]`, `[curious]`, `[shouting]` are allowed in the voice copy.
- **Voice copy:** no digits and no abbreviations; numbers, years and units are written as words. Respellings may use
  hyphens (`gos-hver`).
- **ElevenLabs budget:** about 67k characters left this month. At most 5 full takes for Chapter 1 (~1.5k characters each).
- **Captions and overlays** follow the Geysir short's `Overlays.tsx`:
  - captions are bold uppercase Plus Jakarta Sans, white with a plum ink stroke `#241726`, highlight `#ffd23f`;
  - caption top is 1390 on 3D shots and 1610 on board shots;
  - every overlay reaction lands 0–3 frames before its word.
- **Mix:** 48 kHz; length exactly `TOTAL/30` s; −14 LUFS integrated (±1); true peak ≤ −1 dBTP.
- **Facts:** every fact in a script carries a source URL. Anything the research marked unverified is either checked or left out.
- **Icelandic:** spoken, "þú", short sentences, íðorð as in Náttúrulega / Auðvitað, at most 3 new terms per chapter.
- **Repo:**
  - work on branch `claude/amazing-gauss-pxcxzh`; commit and push at the end of every task (the container is temporary);
  - never edit `geysir-short/` or its branch;
  - no file over 50 MB is committed, and `out/` and `node_modules/` are ignored;
  - the app's `eslint.config.js` ignores `natturufraedi`.
- **Rendering is CPU only (SwiftShader):**
  - stills at `scale 0.5` for look checks;
  - final renders go in chunks of ≤ 300 frames;
  - render temp goes to `REMOTION_TMP=/tmp/remotion-tmp`, outside the repo.
- **User gates:** the Chapter 1 script (after Task 3), the Chapter 1 narration by ear (after Task 5) and the finished
  pilot (after Task 9). Do not start a task that depends on a gate until the user has said yes.

## Review Focus

1. **Long Icelandic compound words in captions** (`JARÐSKORPUFLEKARNIR`, `VESTMANNAEYINGAR`) must shrink to fit inside
   1000 px, never overflow. The test is `captionSize` in Task 2.
2. **A digit or abbreviation slipping into the voice copy** makes the voice read it wrong. The tests are
   `handrit_check` in Task 3 and `narration.txt` = Raddtexti in Task 5.
3. **A new voice take shifts every word.** Shots and overlay cues must follow the words, not stale frame numbers.
   The test is the shifted-fixture test in Task 7.
4. **A container restart in the middle of a multi-hour render** must resume, not start over. The test is the
   chunk-resume test in Task 9.
5. **Icelandic glyphs (Þ Ð Æ Ö Á Í Ú Ý Ó É) in uppercase caption fonts** must render as the real font, not a fallback.
   The test is the `GlyphTest` still in Task 2.

---

### Task 1: Seed `natturufraedi/` from the Geysir short and prove it renders here

**Files:**
- Create: `natturufraedi/**`, copied from `git show origin/claude/blissful-mayer-7dzw09:geysir-short/…` at the branch's
  latest commit. Record the hash in `natturufraedi/README.md`.
  - Leave out `public/audio/mix.wav`, `voice/*.mp3`, `voice/*.align.json` and `final/`.
  - Copy every SFX file that `audio/mix.py` loads, including the ones it reads from `promo-video/public/audio/sfx/`,
    into `natturufraedi/public/audio/sfx/`, and merge the two `audio-manifest.json` and `FREESOUND-CREDITS.md` files.
- Create: `natturufraedi/.gitignore` (`node_modules/`, `out/`, `public/audio/mix.wav`)
- Create: `natturufraedi/tools/still_check.py`
- Create: `natturufraedi/LICENSE-claude-animated-shorts.txt` (MIT text from the template repo)
- Modify: `eslint.config.js:8`, so ignores becomes `["dist", "natturufraedi"]`
- Test: `natturufraedi/tests/test_still_check.py`

**Interfaces:**
- Produces: `still_check.py <jpg>...` prints `path mean_luma` per file and exits 1 if any mean luma is < 0.08 or
  > 0.92. Also `mean_luma(path: str) -> float` in 0..1.
- Produces: baseline stills `natturufraedi/out/baseline/g_{100,800,1500}.jpg` of `GeysirShort`, kept for Task 2.

- [ ] **Step 1: Write the failing test.**
  `test_black_frame_fails`, `test_white_frame_fails` and `test_mid_grey_passes` each make a 64×64 PIL image.
  Assert `mean_luma` ≈ 0.0, 1.0 and 0.5 (±0.02), and that the CLI exit codes are 1, 1 and 0.
- [ ] **Step 2: Run the test to verify it fails.**
  Run `cd natturufraedi && python3 -m pytest tests/test_still_check.py -q`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `mean_luma` and the CLI** in `tools/still_check.py`.
  Use Rec.709 luma on an RGB→float array.
- [ ] **Step 4: Copy the project.**
  Set `COMP=GeysirShort` as the stills default and keep `scripts/bridge-stills.mjs` unchanged.
  Then run `npm ci` and `npx tsc --noEmit`. Expected: no errors.
- [ ] **Step 5: Render the baseline stills.**
  Run `REMOTION_TMP=/tmp/remotion-tmp COMP=GeysirShort node scripts/bridge-stills.mjs out/baseline/g_ 100,800,1500 0.5`,
  then `python3 tools/still_check.py out/baseline/*.jpg`. Expected: 3 lines, exit 0.
  Look at one still to confirm it is the Geysir scene.
- [ ] **Step 6: Run all tests.** Run `python3 -m pytest tests -q`. Expected: PASS.
- [ ] **Step 7: Commit and push** (`natturufraedi/`, `eslint.config.js`), with the message
  "Náttúrufræði: verkefni byggt á Geysis-myndbandinu".

### Task 2: Split out the shared kit (look, timing, overlays) without changing the Geysir short

**Files:**
- Move to `natturufraedi/src/shared/look/`: `ink.ts lensblur.ts grade.ts shade.ts cardshade.ts lights.ts paint.ts toon.ts fx.ts`.
  These import nothing chapter-specific; check with grep and fix import paths only.
- Move to `natturufraedi/src/kaflar/geysir/`: `Geysir.tsx story.ts world.ts build.ts cast.ts Overlays.tsx words.json`
- Create: `natturufraedi/src/shared/timing.ts`
- Create: `natturufraedi/src/shared/overlays/{Captions.tsx,Slam.tsx,Burst.tsx,Stamp.tsx,Badge.tsx}`, lifted from the
  Geysir `Overlays.tsx` (`Captions`, `Slam`, `Boom`→`Burst`, `Stamp`, `DayCounter`→`Badge`) and made generic through props.
- Create: `natturufraedi/src/dev/GlyphTest.tsx`, a composition `GlyphTest`, 1080×1920, 60 frames, `Captions` showing
  `ÞÉTTING ÐÆÖÁ ÍÚÝÓ` (Task 9's chunk test renders it too)
- Modify: `natturufraedi/src/Root.tsx` (import paths; register `GlyphTest`)
- Create: `natturufraedi/tools/img_diff.py` (`psnr(a: str, b: str) -> float`; CLI exits 1 below a threshold argument)
- Test: `natturufraedi/tests/timing.test.ts` (vitest) and `natturufraedi/tests/fixtures/geysir-chunks.json`

**Interfaces:**
- Produces, in `src/shared/timing.ts`:
  - `type Word = { i: number; word: string; start: number; end: number }` (seconds)
  - `norm(w: string): string`: lowercase; keeps `a–z áéíóúýþæöð 0–9`
  - `type Chunk = { text: string; a: number; b: number; hl: boolean }` (frames)
  - `captionChunks(words: Word[], highlight: ReadonlySet<string>, fps = 30): Chunk[]`: the Geysir `CHUNKS` algorithm, unchanged
  - `captionSize(text: string): number`: `min(GeysirRule(len), floor(1000 / (0.62 * len)))`, where GeysirRule gives
    112, then 98 above 9 characters, then 86 above 13
  - `wordAt(words: Word[], text: string, nth = 0): Word`: matches by `norm`. Throws `Error("word not found: <text>#<nth>")`
  - `frameOf(w: Word, fps = 30): number`, which is `Math.round(w.start * fps)`
- Produces, overlay components (props):
  - `Captions {f, chunks, top}`
  - `Slam {f, a, b, text, top, size, rot?, col?, sub?}`
  - `Burst {f, a, text}`
  - `Stamp {f, a, b, text}`
  - `Badge {f, a, b, text, icon?: "calendar" | "clock"}`
- Consumes: the Task 1 baseline stills.

- [ ] **Step 1: Save the regression fixture before moving anything.**
  Write a throwaway vitest step that imports the current Geysir `Overlays.tsx` `CHUNKS`.
  Export `CHUNKS` temporarily if needed, then dump it to `tests/fixtures/geysir-chunks.json`.
- [ ] **Step 2: Write the failing tests** in `tests/timing.test.ts`:
  - `captionChunks(geysirWords, GEYSIR_HL)` deep-equals the fixture (`GEYSIR_HL` is the Geysir highlight set, exported from `kaflar/geysir/Overlays.tsx`);
  - chunks never overlap: `chunks[k].b <= chunks[k+1].a`;
  - `norm("Þrýstingurinn,") === "þrýstingurinn"`;
  - `captionSize("EN") === 112`;
  - `captionSize("JARÐSKORPUFLEKARNIR") * 0.62 * 19 <= 1000`;
  - `wordAt(geysirWords, "BÚMM").word` starts with `"BÚMM"`;
  - `() => wordAt(geysirWords, "xyz")` throws `"word not found: xyz#0"`.
- [ ] **Step 3: Run the tests to verify they fail.** Run `npx vitest run tests/timing.test.ts`.
  Expected: FAIL (module missing).
- [ ] **Step 4: Implement `timing.ts`, the shared overlays and the moves.**
  The Geysir `Overlays.tsx` then composes the shared components. The `captionSize` rule replaces the inline size rule.
- [ ] **Step 5: Run the tests and the typecheck.** Run `npx vitest run && npx tsc --noEmit`. Expected: PASS, no errors.
- [ ] **Step 6: Regression check.**
  Re-render `GeysirShort` stills 100, 800 and 1500 to `out/after/`.
  Then run `python3 tools/img_diff.py out/baseline/g_800.jpg out/after/g_800.jpg 35` (and the same for 100 and 1500).
  Expected: PSNR ≥ 35 dB.
- [ ] **Step 7: Glyph check.**
  Render the `GlyphTest` still and view it. Every letter must be the bold display face; no letter may fall back to a
  serif or system font. If one does, extend `fonts-data.ts` with that glyph subset.
- [ ] **Step 8: Commit and push** ("Sameiginlegt útlit, tímasetning og yfirlag").

### Task 3: Script checker + Chapter 1 script → USER GATE (b)

**Files:**
- Create: `natturufraedi/tools/handrit_check.py`
- Create: `natturufraedi/handrit/kafli-01.md`
- Test: `natturufraedi/tests/test_handrit_check.py` and `natturufraedi/tests/fixtures/handrit_good.md`

**Script file format** (exact headings, in this order):
```
# Kafli NN – <titill>
## Staðreyndir og heimildir      – one bullet per fact: "<fact> — <https://…>"
## Handrit                       – table | Taktur | Lína |
## Skotlisti                     – table | # | Á skjá | Persóna – tilfinning | Yfirlag |
## Raddtexti                     – the exact voice copy (audio tags allowed)
```
`Taktur` must include each of: Krókur, Sögusvið, Stigmögnun, Spurningin, Vendipunktur, Afleiðing, Bakhlaup.
Stigmögnun may repeat.

**Interfaces:**
- Produces: `check(path: str) -> list[str]`, a list of Icelandic error messages, empty when the script is OK.
  CLI: `python3 tools/handrit_check.py handrit/*.md` exits 1 on any error.
- Produces: `raddtexti(path: str) -> str`, the Raddtexti section's text, stripped. Task 5 uses it.
- Word count: Raddtexti words, ignoring `[tags]`. Must be 150–230, which is 60–90 s at the measured 2.56 words/s.

- [ ] **Step 1: Write the failing tests.**
  - The good fixture gives `[]`.
  - Each of these, applied to the fixture, gives exactly one error containing the quoted word:
    - removing `## Skotlisti` → "Skotlisti";
    - `Árið 1973` in Raddtexti → "tölustaf";
    - `t.d.` → "skammstöfun";
    - 120 words → "orðafjöldi";
    - a fact bullet without a URL → "heimild";
    - removing the Bakhlaup row → "Bakhlaup".
  - `raddtexti(fixture)` starts with the fixture's first line.
- [ ] **Step 2: Run the tests to verify they fail.** Run `python3 -m pytest tests/test_handrit_check.py -q`. Expected: FAIL.
- [ ] **Step 3: Implement `check` and `raddtexti`.**
  The abbreviation list is: `t.d. o.s.frv. þ.e. km m. °C % ca. u.þ.b.`
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Verify the Chapter 1 facts and write `handrit/kafli-01.md`.**
  - Facts to verify, with sources:
    - start 23 Jan 1973, about 5,300 people, most evacuated by the fishing fleet that night;
    - about 6.2 million tonnes of seawater;
    - the lava nearly closed the harbour mouth around 12 March;
    - harbour saved;
    - about 2.2–2.5 km² of new land;
    - Eldfell about 200 m;
    - heat from the lava used to heat homes from about 1983;
    - the plates move about 2 cm a year; kvika about 1000 °C;
    - the eruption declared over 3 July 1973;
    - the fingernail growth rate, for the comparison.
  - The "harbour became more sheltered" claim goes in only with a source.
  - Story follows spec §10: Amma at 12, the same age as the viewer, hook line, "Málið er nefnilega að…" pivot,
    hraunlampi analogy with the mapping spelled out, storknun as the "therefore", callback twist.
  - The Skotlisti names a scene for every line, from this set: `stofa` (today: Amma, Sóley and Kári), `nott` (1973
    town at night, the fissure), `hofn` (boats leaving), `hraun` (the lava front at the harbour), `slongur` (workers
    spraying seawater), `idag` (Eldfell today), `bord` (an explainer board). Each line also names the character
    emotion and the overlay (caption highlight, slam, board).
- [ ] **Step 6: Run the checker.** Run `python3 tools/handrit_check.py handrit/kafli-01.md`. Expected: exit 0.
- [ ] **Step 7: Commit and push.** Then **USER GATE (b)**: SendUserFile `handrit/kafli-01.md` with a short English gist.
  Ask the user to read the Icelandic (or have a native speaker read it) and approve it or send corrections.
  Apply the corrections and re-run Step 6. Task 5 waits for the yes; Tasks 4 and 6 may run meanwhile.

### Task 4: Scripts for chapters 2–10

**Files:**
- Create: `natturufraedi/handrit/kafli-02.md` … `kafli-10.md`, following the spec §6 table (topic, core idea, hook,
  criterion) and §7.1–7.2 (formula and language rules).
  - Chapter 9's tone follows spec §6.
  - The Skotlisti may name new scenes; list each chapter's scene set in its file.

- [ ] **Step 1: Verify each chapter's hook facts** against a primary or official source (vedur.is, ust.is, NÍ,
  Orkustofnun, Landsvirkjun, USGS, mms.is), plus the core facts as worded in Náttúrulega 3 / Auðvitað.
  Drop or replace anything that can't be verified. These items in `docs/natturufraedi/rannsokn/namskra-7-bekkur.md`
  are flagged unverified: the 1996 flood peak, the puffin share, the hydro/geothermal split.
- [ ] **Step 2: Write the scripts.** Use one core idea, one everyday Icelandic analogy with the mapping spelled out,
  one prediction beat where it fits, and a callback ending.
- [ ] **Step 3: Run the checker.** Run `python3 tools/handrit_check.py handrit/*.md`. Expected: exit 0.
- [ ] **Step 4: Commit and push** after chapters 2–4, 5–7 and 8–10.
  SendUserFile the nine scripts together at the end. This is not a blocking gate for the pilot.

### Task 5: Chapter 1 narration → USER GATE (c)

*Starts only after gate (b).*

**Files:**
- Create: `natturufraedi/tools/voice.py`, generalised from `voice/tts.py`. Usage:
  `python3 tools/voice.py hljod/kafli01 <take>` → `take-<n>.mp3` + `take-<n>.align.json`.
  Constants: `VOICE_ID`, `MODEL="eleven_v4"`, `LANG="is"`, `TEMPO=1.12`.
- Create: `natturufraedi/tools/align_to_words.py`
- Move: `voice/stt_check.py` → `tools/stt_check.py`, taking `narration.txt` from the take's folder.
- Create: `natturufraedi/hljod/kafli01/narration.txt`, written by `raddtexti(handrit/kafli-01.md)`, never hand-edited.
- Create: `natturufraedi/hljod/kafli01/voice.wav`, `voice.mp3` and `natturufraedi/src/kaflar/kafli01/words.json`
- Test: `natturufraedi/tests/test_align_to_words.py`

**Interfaces:**
- Produces: `words_from_alignment(alignment: dict, tempo: float) -> list[dict]`, shaped like `Word` in Task 2.
  - Splits on whitespace and drops `[tag]` tokens.
  - A word's start is its first character's start ÷ tempo; its end is its last character's end ÷ tempo.
  - `i` is sequential.
- Produces: `src/kaflar/kafli01/words.json`. Task 7 consumes it through `wordAt`.

- [ ] **Step 1: Write the failing tests.**
  - The characters of `"[excited] Ég sé hraun."` with known times give 3 words, `"Ég"`, `"sé"`, `"hraun."`, with
    times divided by 1.12 (abs tol 1e-6).
  - `narration.txt == raddtexti("handrit/kafli-01.md")`.
- [ ] **Step 2: Run the tests to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement `words_from_alignment`, `voice.py`, and the `narration.txt` writer.**
- [ ] **Step 4: Run the tests to verify they pass.** Expected: PASS.
- [ ] **Step 5: Generate take 1.**
  - Make `voice.wav` with `ffmpeg -i take-1.mp3 -af atempo=1.12 -ar 48000 -ac 1 voice.wav`.
  - Write `words.json`, then run `python3 tools/stt_check.py hljod/kafli01/voice.wav`.
  - Expected: at least 95 % of script words heard correctly.
  - For any misheard term, add a respelling or tag to the Raddtexti, re-run the Task 3 checker and make a new take.
    At most 5 takes.
- [ ] **Step 6: Check the length.** Duration ÷ 1.12 must give a `TOTAL` of 1800–2700 frames. If not, shorten or
  lengthen the script, and bring the change back to the user.
- [ ] **Step 7: Commit and push** (mp3, wav under 50 MB, align, words). Then **USER GATE (c)**: SendUserFile
  `voice.mp3` and ask the user to listen for any wrongly pronounced word. Fix by respelling and re-taking.
  Task 7 waits for the yes.

### Task 6: Heimaey world, Icelandic kit and the recurring cast

*May start after Task 2; does not need the voice.*

**Files:**
- Create: `natturufraedi/src/shared/kit/houses.ts`:
  `barujarnshus(o: HouseOpts): THREE.Group`, with
  `type HouseOpts = { w: number; d: number; h: number; wall: string; roof: string; trim?: string; seed: number }`.
  A corrugated-iron house with a gable roof, windows, door step and chimney. Wall colours from red/blue/yellow/white,
  red or green roofs.
- Create: `natturufraedi/src/shared/cast/recurring.ts`:
  - `drawSoley(pen: Pen, expr: Expr)`: 12, lopapeysa, curious;
  - `drawKari(pen: Pen, expr: Expr)`: 12, beanie, joker;
  - `drawAmma(pen: Pen, expr: Expr, age: "ung" | "gomul")`: 12 in 1973 (anorak, húfa), or a grandmother today.
  - `Pen` and `Expr` come from `shared/look/toon.ts`.
- Modify: `natturufraedi/src/shared/look/lights.ts` and `grade.ts`: add light presets and grades
  - `"night"`: cool blue moonlight, sky `#0d1b3d` → `#2a3f73`
  - `"eruption"`: the night preset plus an orange key from the fissure (`#ff7a2a`, HDR emissive kvika, so bloom catches it)
  - Extend `type Light` to `"day" | "golden" | "night" | "eruption"`.
- Create: `natturufraedi/src/kaflar/kafli01/{build.ts,world.ts,cast.ts,story.ts}`.
  - `story.ts` holds, for now, only a scene sampler: one 20-frame shot per scene in Task 3's scene set, with the
    scene's light.
  - The world contains:
    - Heimaey town (≥ 40 bárujárnshús on a street grid);
    - the harbour with a breakwater and ≥ 6 fishing boats;
    - Heimaklettur, Helgafell;
    - a fissure east of town with fire fountains;
    - a parametric lava front `lavaFront(t: number): number` (metres from the harbour mouth), with steam where the hoses hit it;
    - ash on roofs in the `nott` / `hraun` scenes;
    - today's green Eldfell in `idag`;
    - Amma's living room in `stofa`.
- Create: `natturufraedi/src/kaflar/kafli01/Kafli01.tsx` and register `Kafli01` in `src/Root.tsx`
  (1080×1920, 30 fps, `durationInFrames = TOTAL`).

**Interfaces:**
- Produces: `World.update(id: number, f: number, cam, scene)`, the same contract as the Geysir `World`.
- Produces: scene ids for Task 7: `"stofa" | "nott" | "hofn" | "hraun" | "slongur" | "idag" | "bord"`.
- Produces: `lavaFront(t)` and `fissure(t)` (fountain height), exported from `kafli01/story.ts`, for Task 7 to drive.

- [ ] **Step 1: Write the failing test** `tests/kafli01.sampler.test.ts`.
  Every scene id except `bord` appears in the sampler's `SHOTS`; `is3D` is true for them; `SHOTS` are contiguous
  from 0 to `TOTAL`.
- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL.
- [ ] **Step 3: Implement** the kit, the cast, the lights, the world and the sampler.
- [ ] **Step 4: Run the tests and the typecheck.** Run `npx vitest run && npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Render the sampler and check the look.**
  - Render one still per scene (`COMP=Kafli01`), then run `still_check.py`. Expected: exit 0.
  - Dispatch a fresh reviewer agent with the stills and the Geysir baseline stills. It scores colour, light, ink,
    characters, depth and composition out of 10 and lists numbered must-fix items with scene names.
  - Fix every must-fix and re-render. Stop when no must-fix remains or after 3 rounds; report scores to the user
    with the pilot.
- [ ] **Step 6: Commit and push** ("Heimaey: heimur, persónur og ljós").

### Task 7: Chapter 1 timeline, cameras, overlays and explainer boards

*Starts only after gate (c).*

**Files:**
- Modify: `natturufraedi/src/kaflar/kafli01/story.ts`. Replace the sampler with the real timeline:
  - `SHOTS`, `XFADE`, `FLASHES`, cameras, `dofAt`;
  - every boundary derived from `words.json` via `wordAt`/`frameOf`, never typed in as a frame number;
  - `TOTAL = frameOf(last word end) + 18`.
- Create: `natturufraedi/src/kaflar/kafli01/cues.ts`:
  - `type Cue = { kind: "slam" | "burst" | "stamp" | "badge" | "flash" | "board"; id: string; word: string; nth: number; lead: number; a: number; b: number }`
  - `export const CUES: Cue[]`, where `a = frameOf(wordAt(W, word, nth)) - lead`.
- Create: `natturufraedi/src/kaflar/kafli01/Overlays.tsx`, composing the shared `Captions` / `Slam` / `Burst` / `Badge`
  from `CUES` plus 4 boards:
  - `BoardLayers`: jarðskorpa, möttull, ytri/innri kjarni, as a cutaway under the town;
  - `BoardPlates`: Norður-Ameríkuflekinn ← → Evrasíuflekinn, "2 cm á ári" next to a fingernail;
  - `BoardLavaLamp`: hraunlampi → kvika; hot means lighter, so it rises; the mapping is labelled;
  - `BoardCooling`: kvika + sjór → hraun storknar; a thermometer drops from about 1000 °C.
  - Highlight set: kvika, flekaskil, flekar, storknar/storknun, hraun, eldgos, Heimaey, plus the numbers.
- Create: `natturufraedi/tools/export_shots.ts`, run with `npx tsx`. It writes `out/kafli01/shots.json` in
  `short_qa.py`'s format (`shots`, `flash`, `xfade`).
- Test: `natturufraedi/tests/kafli01.story.test.ts`

**Interfaces:**
- Consumes: `words.json` (Task 5), `timing.ts` and the overlays (Task 2), scenes, `lavaFront` and `fissure` (Task 6).
- Produces: `CUES`, `TOTAL`, `SHOTS`, and `out/kafli01/shots.json` for Tasks 8–9.

- [ ] **Step 1: Write the failing tests.**
  - `SHOTS` are contiguous from 0 to `TOTAL`.
  - `1800 ≤ TOTAL ≤ 2700`.
  - Every cue has `0 ≤ lead ≤ 3`.
  - Every scene in `SHOTS` is in the Task 6 set.
  - Board shots put captions at top 1610.
  - **Shifted fixture:** rebuild `SHOTS` and `CUES` from `words.json` with every time +1.0 s (export a
    `build(words: Word[])` factory from `story.ts` and `cues.ts`). Every word-anchored boundary and every cue `a` moves
    by exactly +30 frames.
- [ ] **Step 2: Run the tests to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** the story timeline, cues, overlays and boards from the Skotlisti.
  - Camera grammar as in the Geysir `story.ts`: `dolly`/`zoom`/`pushK`, glides 18–40 f, creeping holds, 4–5° rolls on
    drama, flip-kicks on impacts.
  - Lens blur on close-ups only.
- [ ] **Step 4: Run the tests and the typecheck.** Expected: PASS.
- [ ] **Step 5: Render stills.** Render a still at the middle of every shot, then run `still_check.py`.
  Fix any shot where a caption or slam covers a face or a board label.
- [ ] **Step 6: Export the shots, commit and push** ("Kafli 1: tímalína, yfirlag og skýringarspjöld").

### Task 8: Chapter 1 sound

**Files:**
- Create: `natturufraedi/public/audio/music/kafli01.mp3`.
  - Generate with ElevenLabs Music (`POST https://api.elevenlabs.io/v1/music`), length ≈ `TOTAL/30` s, instrumental.
  - Mood: playful Nordic (pizzicato, marimba, light percussion) for the opening; darker suspense under the 1973
    night; curious and bright under the explanation; warm for the callback.
  - If the API refuses on this plan, use the Higgsfield ElevenLabs Music model as the Geysir short did. Tell the user
    it costs credits before generating.
- Create: `natturufraedi/audio/kafli01_mix.py`, modelled on `audio/mix.py`. SFX cues are pinned to cue ids and shot
  starts read from `out/kafli01/shots.json` and `src/kaflar/kafli01/words.json`.
  - SFX to add as needed: rumble, lava hiss and steam, boat horn, hose spray, crowd murmur, wind.
  - New SFX are CC0 Freesound files, recorded in `audio-manifest.json` and `FREESOUND-CREDITS.md`.
- Test: `natturufraedi/tests/test_mix_kafli01.py`

- [ ] **Step 1: Write the failing test.** After running the mix, `public/audio/kafli01-mix.wav` must meet all of these:
  - 48 kHz;
  - sample count = `round(TOTAL/30*48000)` (±1);
  - integrated loudness −14 ± 1 LUFS and true peak ≤ −1.0 dBTP, both parsed from `ffmpeg -af ebur128=peak=true`.
- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL.
- [ ] **Step 3: Generate the music, choose the SFX, and write `kafli01_mix.py`.**
  Duck the music under the voice as in the Geysir mix, and drop it out for a beat before the key reveal.
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.
- [ ] **Step 5: Commit and push** (music, new SFX and manifest, mix script; not the wav).

### Task 9: Look pass, chunked final render, QA and delivery → USER GATE (d)

**Files:**
- Create: `natturufraedi/tools/render_chunks.sh`. Usage: `<comp> <outdir> [chunk=300]`.
  - Renders `--frames=a-b` into `<outdir>/chunk-<a>.mp4` with `--muted --codec h264 --crf 16`.
  - Skips a chunk whose file exists and whose frame count (ffprobe) equals `b-a+1`.
  - Then concatenates with `ffmpeg -f concat -c copy` into `<outdir>/picture.mp4`.
- Create: `natturufraedi/final/kafli-01.mp4`, muxed with `-map 0:v:0 -map 1:a:0 -c:v libx264 -crf 20 -c:a aac -b:a 192k`.
  Must be under 50 MB.
- Test: `natturufraedi/tests/test_render_chunks.sh` (bash)

- [ ] **Step 1: Write the failing test.**
  Render `GlyphTest` (60 frames) with `chunk=30` into a temp directory; expect 2 chunks and `picture.mp4`
  with 60 frames. Run it again; expect the output to contain `skip chunk-0` and `skip chunk-30`, and no render.
- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL.
- [ ] **Step 3: Implement `render_chunks.sh`.**
- [ ] **Step 4: Run the test to verify it passes.** Expected: PASS.
- [ ] **Step 5: Look pass.** Render 8 key-frame stills (hook, 1973 night, harbour, each board, the hoses, the callback).
  - A fresh reviewer agent compares them with the Geysir baseline and with the user's reference contact sheet, and
    lists must-fix items.
  - Fix them. At most 3 rounds.
- [ ] **Step 6: Final render.**
  Run `REMOTION_TMP=/tmp/remotion-tmp tools/render_chunks.sh Kafli01 out/kafli01` in the background, followed by a
  Monitor. Expect ~1–1.5 h. Mux with the mix into `final/kafli-01.mp4`.
- [ ] **Step 7: QA.** Run `python3 scripts/short_qa.py final/kafli-01.mp4 out/kafli01/qa out/kafli01/shots.json`.
  - Expected: no unplanned black, white, frozen or pop frames, and loudness within the Global Constraints.
  - Fix and re-render only the affected chunks (delete those chunk files and re-run).
- [ ] **Step 8: Commit, push and deliver.** Commit and push `final/kafli-01.mp4`, then SendUserFile it.
  **USER GATE (d)**: ask the user to watch it on their iPhone and say what to change before chapters 2–10 are made
  the same way.
