# 03 · The old company film (SVIF fyrir fyrirtæki): audit and renovation plan

Source: `scratchpad/oldvideo-src/video/svif-fyrirtaeki/` (all paths below are relative to that folder
unless they start with `scratchpad/`). Everything marked **tested** was run in this session in a copy at
`scratchpad/research/audit03/filmtest/` (the source folder was not modified).

Proof frames from this audit (look only, motion untouched):

| File | What it shows |
|---|---|
| `scratchpad/research/audit03/before-after.jpg` | old film (left) vs. restyle pass 3 (right) at 6.2 s, 10 s, 33 s |
| `scratchpad/research/audit03/look-variants.jpg` | old · "golden" taupe (pass 3) · **site-engine look** (pass 4) at 6.2 s and 27 s |
| `scratchpad/research/audit03/proto-site-look-6.2.jpg`, `proto-site-look-27.jpg` | recommended base look (site AgX look + warm env + PAL clay, taupe table) |
| `scratchpad/research/audit03/proto-golden-33.jpg` | VSM soft long shadows from a low sun |
| `scratchpad/research/audit03/proto-brochure-21.5.jpg` | why the brochure pages need a full repaint (recolouring is not enough) |
| `scratchpad/research/audit03/proto-end-48.5.jpg` | why the end card needs a darkened plate behind white type |
| `scratchpad/research/audit03/clips-sheet.jpg` | the four old step clips at 2.5 s and 5.5 s |

Patch scripts that produced them: `scratchpad/research/audit03/make_proto.py`, `make_proto2.py` (both assert every
substitution like `make_skref.py` does), plus inline patches for pass 3/4 (VSM, background = fog colour, site AgX look).

---

## 0. The short version

1. The film's *story and engine* are good: one HTML file, a pure `render(t)` function, frame-exact capture,
   sound cues exported from the same timeline. Keep all of that. What is cheap is the **look** (cool grey-white
   clay with grey outlines, one electric SaaS blue, triple ripple rings, map pins, UI chips, bold grotesk) and the
   **motion** (everything snaps on a 120 BPM grid with overshoot, squash, bobbing, a zoom punch on every beat, and a
   camera that stops and lurches between keyframes).
2. Restyle in place: port the site engine's look constants (custom AgX look, procedural warm environment, `PAL`
   clay colours from `src/three/palette.ts`/`core.ts`), put the city on a **taupe table** (#56514a ground, fog
   #6b6253) so white Jost type works, kill outlines, swap PCFSoft for **VSM** soft shadows, add a cheap height AO.
   All tested; render cost is unchanged (~1.3–1.5 s/frame). GTAO tested and rejected (3.1× render time, barely visible).
3. Rewrite the camera to arc-length + monotone time mapping (one continuous move per shot, eases only at shot
   ends). Remove `punch`, `eback`, squash, sway, bob, spin, and every beat-locked pulse. Use the site's tokens
   (arrive/settle/glide/breathe) for everything.
4. Cut on-screen text from 121 words to ~49: flyer-style caption pairs (Jost 300 caps + one Instrument Serif
   italic line), corner labels and a broken hairline frame like the printed cover, no chapter bars, no cards.
5. Repaint the brochure as the real product: square pages, `NÝR REKSTUR` cover (`/svif/kafli/biz-cover.jpg`),
   cream coupon pages in Nýji kaflinn style, contents page modelled on flyer page 2.
6. Soundtrack: keep the event pipeline, drop the drum kit, sidechain and 38 bell hits; felt piano + warm pad
   + paper foley, half-time feel, convolution hall; ~6 cues instead of 65.
7. The film can move to **three 0.186.1** (the site's version) with a two-line change (tested) so film and site
   share one renderer version.

---

## 1. What exists

| Item | Facts (measured) |
|---|---|
| `svif-fyrirtaeki.html` | 1016 lines, three.js 0.169.0 via import map from jsDelivr; also a browser player (play/mute/scrub, `music.mp3`) |
| Masters | `SVIF-fyrirtaeki.mp4` 1920×1080 30 fps 6.7 Mb/s 43 MB · `-litil.mp4` 3.5 Mb/s 23 MB · `-web.mp4` 2.2 Mb/s 15 MB (used on the site) · `-720p.mp4` 1280×720 Main 1.1 Mb/s · all 52.0 s, AAC |
| Site usage | `/fyrirtaeki` hero video = `SVIF-fyrirtaeki-web.mp4` and poster via jsDelivr pinned to commits `6215875…`/`87e9ac4…`; step clips `web/skref1-4*.mp4` via `fe95f29…` (`src/routes/fyrirtaeki.tsx` lines 37–42, 80–109). Those commits are objects in the local repo but on no branch, so new renders must be pushed (any branch) and the hashes updated. |
| Step clips | 4 × 8 s, 720×720, 240 frames, ~0.85 Mb/s, no audio; posters are **frame 0** (PSNR 42.6 dB vs. first frame, 21.5 dB vs. last) |
| Render | `node capture.mjs` → Playwright Chromium + SwiftShader → JPEG q95 → ffmpeg x264 CRF 17. Default pixel ratio 1.5 (2880×1620 canvas downsampled = SSAA). **~1.3–1.5 s per frame** on this 4-core box (30 frames = 44–48 s incl. ~6 s boot). |
| Toolchain here | node 22, Playwright 1.63 (global, browsers in `/opt/pw-browsers`), ffmpeg 6.1, Python numpy 2.5 / scipy 1.18 / pedalboard 0.9.26. npm registry and Google Fonts reachable. `capture.mjs frames:` and `events:` both ran clean; exported events are byte-identical to `audio/events.json`. |

---

## 2. Code map

### 2.1 `svif-fyrirtaeki.html`

| Lines | System | What it does |
|---|---|---|
| 1–7 | Head | Google Fonts link: Bricolage Grotesque, Instrument Sans, Unbounded |
| 8–91 | Overlay CSS | tokens (`--paper #eceff4`, `--ink #0d1530`, `--signal #1f55ff`, `--roof #8ea2ea`); stage 1920×1080 scaled to fit; `.vignette` (a **white** radial glow bottom-left so dark text reads), `.grain` (SVG turbulence, 5 % multiply); `.brand`; `.chapters` (8 progress bars + "02 NÝR REKSTUR"); `.cap` (blue dot eyebrow, 84 px Bricolage 700 −0.028em title, 30 px sub); `.node-tag` (white card, 18 px radius, shadow); `.count` (120 px blue numerals); `.end` (200 px Unbounded logo, blue "FYRIR NÝ FYRIRTÆKI", blue dot + svif.is); player controls |
| 93–123 | DOM | stage, canvas, vignette, `#pins`, brand, chapters, `#caps`, `#count`, `#end`, grain, loading; controls; `<audio>` |
| 125–130 | Import map | `three` → `three@0.169.0/build/three.module.min.js`, `three/addons/` → `examples/jsm/` |
| 136–158 | Constants/helpers | `W,H,DUR=52`; `BPM=120`, `b(n)` beats→s; `CAPTURE` from `#capture`; seeded RNG `mulberry32(20261026)`; easings `eio` (cubic in-out), `eout` (cubic out), `esine`, **`eback` (back-out, c1=1.5: 10 % overshoot)**; `env()`; `BLUE/GREY/BLUE_LIT`; **`hit()`** = exponentially decaying pulse on every grid step (drives beat bumps) |
| 160–183 | Renderer, lights | antialias, pixel ratio, **ACESFilmic exposure 1.1**, **PCFSoftShadowMap** (manual updates); `Fog(#eceff4, 240, 680)`; camera fov 32; Hemisphere `#ffffff/#bcc5d6` 1.35; sun `#fffdf8` 3.05 at (−80,140,60) ≈ 54° elevation, 4096² map, `shadow.radius = 2.2` (**has no effect with PCFSoft**: in r169 `shadowmap_pars_fragment` only the PCF and VSM branches read `shadowRadius`; PCF_SOFT uses a fixed bilinear kernel) |
| 185–199 | Canvas textures | `texGroove` (vertical grooves), `texGrid` (window grid), `texGlow` (blue radial), `texBlob` (contact shadow), `texMarker` (white disc + blue dot "map pin") |
| 201–219 | Materials `M` | ground `#e3e7ee`, block `#f7f8fb`, white `#fff`, groove, grid, detail `#e6eaf1`, glass `#cfd8e8`, base, path, dash, tree `#fff`, trunk, **blue `#1f55ff`**, blueSoft, dark `#3a4256`, pages |
| 221–238 | City scaffolding | grid `PITCH 26, BLK 20`, `HERO {52,26}`, slab 192², `uvBox()`, detail RNG, **`edgeMat` grey lines (`#c4cbd9` 75 %) + `outline()`** (EdgesGeometry on every building), `detailMesh()` merges details and outlines them too |
| 239–242 | `addRiser()` | rise delay by distance from (−20,−20), **quantised to eighth notes** |
| 243–263 | `tower()` | box with grooves/grid, cap slab, base plinth, balconies on mid-height grid towers, antennas, roof units |
| 264–273 | `cylTower()` | 56-segment cylinder with groove UVs, cap, base |
| 274–289 | `house()` | gable house: body, extruded roof, chimney, windows, door, plinth, outlines |
| 290–304 | `shop()` | 2-storey unit: groove front, glass shopfront, **awning + sign materials cloned so they can turn blue** (`bb.lit`) |
| 305 | `tree()` | registers a tree for instancing |
| 307–328 | `office()` | the hero: glass front, mullions, **blue door + blue awning**, windows, roof unit, `officeSign` group |
| 330–385 | Block generator | 7×7 blocks; forced types around the hero; towers in the middle, houses/apartments/shops/park/midrise elsewhere |
| 386–403 | Street furniture | instanced road dashes, zebra crossings, lamp poles + heads (instanced) |
| 404–416 | Trees | noisy icosahedron foliage (instanced puffs) + trunks; `updateTrees()` grows them with **`eback`** |
| 417–427 | Hero refs + `TL` | timeline in beats (sign 6 s, slabs 8 s, ask 12.5 s, bookIn 16 s, absorb 17 s every **62.5 ms**, open 20 s, rise 23.75 s, node 25.5 s, lines 26 s, van 30–37.75 s, open2 39 s, tiles 40 s every 0.5 s, back 44 s, end 46 s) |
| 429–437 | Delivery route | `CurvePath` of lines + quadratic corners; `vanU` ease `1-(1-u)^1.8`; `timeForU` bisection |
| 439–449 | Who gets found | shops near the route become `delivered` (land on beats, ≥1 bar apart), `detectedExtra`, `finale` |
| 451–472 | Pings | `makePing()` = 3 **blue rings** (RingGeometry .9–1, i.e. 10 % thick) + blue radial glow + **map-pin sprite**; `updatePing()` loops rings every 3 beats forever, burst ring, marker bobs on a 1 s sine and pops with `eback` |
| 474–494 | SVIF node + lines | white sphere + blue core + **2 spinning blue tori** + blue glow sprite at (10,50,8); 7 blue **TubeGeometry** arcs (r .13) grown with `setDrawRange`, a white dot runs each line every second |
| 496–498 | People | `person()` = capsule + sphere + blob; the owner is **solid blue** |
| 500–509 | Van | rounded white body/cab, **blue stripe**, dark wheels, blob; `vanState()` heading from route tangent |
| 511–593 | 2D art kit | `PW 6.6 × PH 7.8` (portrait), canvas 1100×1300; fonts Bricolage/Instrument Sans/Unbounded; `gridPaper`, `frame` (blue corner squares), `logoText` (Unbounded + roof stroke), `cloud`, `streetscape` (line-drawn high street, blue door + blue pin), `icon()` (12 line icons), `check()` (blue disc tick), `chip()` (blue pill), `ledgerArt`, `browserArt` |
| 594–605 | Data | `CATS` (8 categories), `TASKS` (12 tasks), tile and offer rectangles |
| 606–668 | `paintPages()` | cover (grid paper, clouds, sun, streetscape, SVIF, "FYRIRTÆKI / fyrir nýjan rekstur / svif.is"); back; **adA** (chip, "Við sjáum um bókhaldið.", blue 25 % card, check list); **adB** ("Vantar þig vefsíðu?", browser art, bullets, blue 15 % bar); **left** (headline, intro, 3 numbered steps, streetscape); **right** (8 category tiles with icon discs) |
| 669 | `glowTex()` | blue blurred rounded-rect outline used for highlights |
| 671–697 | Task pile | `buildSlabs()`: 12 rounded slabs with a painted label face (icon disc, bold label, empty checkbox), jittered stack beside the office |
| 699–719 | Brochure | `bro` → `broInner` → `leftPivot` (hinged left page), right page, page block, glow meshes, **blue halo sprite**; pages are `MeshBasicMaterial` (unlit) |
| 721–767 | Camera | `SHOTS` = 3 shots (0–16, 16–30, 30–52) with [t, pos, target] keys → centripetal Catmull-Rom; `shotParam()` maps time to curve parameter **per segment** (first segment ease-out^2.2, others 35 % sine + 65 % linear) |
| 769–820 | Overlay | `CAPS` (11 captions, 27 strings, 121 words), chapter list, `wordAnim()` (**per-word 40 px rise + 9 px blur in, −20 px + 6 px blur out, 50 ms stagger**), `updateOverlay()` (chapter bars, node tag follows projected node, counter 0→250 rounded to 5 + 6 % bump, end card parts with blur) |
| 822–923 | `render(t)` | shot pick + **`punch` (−3 % fov on every beat 8–13.5 s)**; risers (`eback`, 0.75 s); shadow refresh only while t < 4.2 s; sign pop (`eback`), owner walk with **26-step bob**; pile **sway** + per-slab wobble; slab fall from +16 with **squash-and-stretch**; absorb flight (spin + shrink to 15 %); ping logic; lit shops turn blue; node in/out, bob, spinning rings, **12 % core pulse per beat**; line growth and running dots; van with **2 Hz bounce**; mini brochures fly to doors with spin; brochure transform, page-map swap for spread 2, glow pulses, tile highlight per beat |
| 924–953 | `bookAt(t)` | brochure as a pure function: appear (`eback`), **+7 % pulse per absorbed block**, +18 % scale during open, rise along a Bézier into the node (shrinks to 21 %), second appearance flying up from the van, return into the door |
| 955–973 | `soundEvents()` | exports `{dur,bpm,tl,events}` (65 events, 20 kinds) → `window.__events` |
| 975–984 | `init()` | waits for fonts (4 s cap), paints pages, builds book and slabs, "OPIÐ" sign (blue pill, 800 weight), mini brochures |
| 986–1016 | Player | layout/scale, audio-clock sync, controls; `window.__ready`, `window.__seek(t)` for capture |

### 2.2 Other files

| File | Lines | What it does |
|---|---|---|
| `capture.mjs` | 1–59 | args `out \| frames:dir \| events:file` `[start] [end] [fps]`; env `VW/VH` (stage size), `PR` (pixel ratio), `HTML` (page + query), `HIDE` (CSS selectors to hide). Routes jsDelivr `three@0.169.0/**` to `node_modules/three`, Google Fonts CSS to `fonts/google.css`, gstatic files to `fonts/<path with / → _>`. Chromium args: ANGLE SwiftShader. Pipes JPEG q95 into ffmpeg x264 `-preset slow -crf 17 yuv420p +faststart`. |
| `finalize.sh` | 1–11 | concat `out/seg0-2.mp4` → `out/silent.mp4`; loudnorm I=−14 TP=−1.5 → `out/mix-14.wav`; mux → `SVIF-fyrirtaeki.mp4`; 3.5 Mb/s `-litil`; `music.mp3`. (The `-web` and `-720p` encodes are not in the script.) |
| `make_skref.py` | 1–23 | builds `skref.html` from the film: square 1080 stage, `DUR` line, splices `skref-clips.js` before `__ready`, swaps `render` for `renderClip`. **Asserts exact strings** (title, `</style>`, canvas tag, `const W = 1920, H = 1080, DUR = 52;`, the `__ready` and `__seek` lines) — any renovation that edits those lines must update this script. |
| `skref-clips.js` | 5–7 consts, 8–14 `camAt` (2-key lerp with `esine` or per-segment sine), 15–19 `cityAt` (risers with `eback`), 20 `litAt`, 21–28 `clearFilm`, 30–56 `clipSetup` (clip 1: 7 shops near the hero light up 4.7 s + 0.4 s each; clip 2: brochure spread 2 above the street, 8 tiles highlighted every 0.5 s with blue check sprites; clip 3: van run on its own clock, 6 drops; clip 4: node + 7 lines from 1.5 s, 4 extra pings from 6 s), 57 `vanAt`, 58–106 `renderClip` | four 8 s clips, last 0.5 s held |
| `audio/compose.py` | 20–28 load events; 51–64 harmony (D major Dmaj7–Bm7–Gmaj7–A6/9, Asus, D9); 66–98 `chord()`/`section()` (**hard-coded seconds** 2, 4, 8, 24, 30, 38); 105–135 drums (4-on-floor kick, clap 2/4, 8th/16th hats, snare build, kicks at drop/end); 138–147 sidechain (55 % depth); 151–175 bass (off-beat 8ths); 178–191 pluck chord stabs; 194–205 pads; 208–223 FM-bell arps (16ths); 227–247 lead hook; 250–258 final chord + 5 bells; 262–326 SFX synths (impact, thock, pop, stab, bell, tonal riser, knock, counter ticks); 329–374 `cues()` maps event kinds to sounds; 378–425 mix (pedalboard chains, ducking, comp, brickwall, fades) → `audio/out/mix.wav` |
| `audio/dsp.py` | 21–45 PolyBLEP saw, sine, tri, noise; 49–61 ADSR, expdec; 65–115 Butterworth lpf/hpf/bpf + swept filters; 118 `soft`; 123–147 pan/place/widen; 151–226 kick, clap, snare, hat, crash, `fm_bell`, `pluck`, `pad_voice`; 229–258 true-peak brickwall |
| `audio/events.json` | 65 events: slab 12, absorb 12, tile 8, fin 8, found 7, deliver 3, open 2, and one each of sign, ask, drop, close, rise, node, vanStart, counter, count, bookUp, back, home, end |
| `fonts/` | `google.css` + 10 woff2 (Bricolage, Instrument Sans, Unbounded) in the routed naming scheme |

---

## 3. Frank critique

### 3.1 Frames (see `scratchpad/old-videos/fr/company-sheet.jpg`, `scratchpad/research/audit03/f_*.jpg`)

- **Palette = SaaS dashboard.** Cool blue-grey paper `#eceff4`, cool shadows `#bcc5d6`, and `#1f55ff` as the
  only colour on doors, awnings, rings, lines, numbers, chips and the person. This is the most generic "tech
  startup" combination there is, and it is the opposite of the flyer (warm taupe, cream, white type, no saturated
  colour at all).
- **Grey outlines on every edge.** `EdgesGeometry` lines at 1 px (WebGL lines cannot be thicker) on white clay is
  the signature of AI-generated isometric town renders. At 1.5× supersampling they become faint, slightly aliased
  pencil lines that fight the shading instead of helping it.
- **Flat light.** Sun at ~54° with a 1.35 white hemisphere fill and ACES at 1.1 exposure: short shadows, white
  walls compressed to light grey, no contact darkening at the base of buildings, everything floats. The ground
  slab has a visible table edge in the opening and closing shots.
- **Blue ripple rings and map pins.** Three thick rings looping forever under every "found" business, plus a
  radial glow and a white map-pin sprite that bobs: the visual language of a ride-hailing app.
- **The "system" node.** A glossy sphere with two spinning blue tori, a glow and blue tubes arcing to the city:
  literally "futuristic", which the owner ruled out.
- **UI chrome inside a film.** Chapter progress bars, a white card with a drop shadow ("SVIF KERFIÐ 2 ný fyrirtæki
  fundin"), a huge blue counter, blue-dot eyebrows. It reads like a product demo of an app, not a brand film.
- **Typography.** Bricolage Grotesque 700 at 84 px with tight negative tracking + Unbounded 900 logo: loud,
  trendy, heavy; nothing to do with Jost 300 caps and Instrument Serif italic on the flyer and the site. Captions
  are full sentences with subtitles under them (121 words in 52 s).
- **Brochure.** Portrait page (the real brochure is square), grid paper, blue chips, blue offer cards, line icons
  in blue discs, bold headlines: a generic SaaS landing page printed on paper, not *Nýji kaflinn*. Pages are unlit
  `MeshBasicMaterial`, so they look pasted onto the scene.
- **Props.** Blue capsule person, white van with a blue stripe, cauliflower trees in pure white, "OPIÐ" in a
  blue pill with 800-weight type.

### 3.2 Motion (measured: camera sampled every frame, `scratchpad/research/audit03/filmtest/cam.json`)

| Time | What happens | Why it feels cheap |
|---|---|---|
| 0–3.2 s | camera speed 126 → 5 u/s (ease-out into key 2) | fine on its own… |
| **3.23 s** | speed jumps **0.3 → 45 u/s in one frame** (1 348 u/s² spike), up to 90 u/s by 4 s | a dead stop followed by a lurch, caused by per-segment easing in `shotParam()` |
| 4.0–5.5 s | turn rate up to **60°/s** (2°/frame at 30 fps, fov 32°) | crosses the frame in ~0.5 s: strobing; RED's rule of thumb for smooth pans is about a full frame width in ~7 s ([RED](https://www.red.com/red-101/camera-panning-speed), [RED support](https://support.red.com/hc/en-us/articles/360019775433-Panning-Speed-Best-Practices)) |
| 5.63 s | 11.7 → 2.4 u/s abrupt | second hard stop |
| 8–13.5 s | **fov 32 → 31.04 and back on every beat (12 punches)**, slabs fall from +16 with squash-and-stretch, the pile sways and wobbles on the beat | music-video tricks; cartoon physics |
| 16 s, 30 s | hard cuts on the downbeat | acceptable in principle, but both shots then start mid-motion |
| 16–20 s | 12 blocks fly in 0.75 s (62.5 ms stagger), each spinning and shrinking; the brochure **pulses +7 % per block** and grows +18 % while opening | "slot-machine" jelly |
| **23.5 s** | whip from the brochure to the city at **99°/s** | the single most jarring moment |
| 25.4 s | 25 → 14 u/s step | velocity seam at a key |
| 25.5–29.5 s | node bobs, two rings spin continuously, core pulses 12 % on every beat, dots race along lines every second | idle motion everywhere (banned in the site bible) |
| 30–37.5 s | van follow decelerates smoothly (good) but the van **bounces at 2 Hz** and every delivered brochure **spins** in flight | toy-like |
| 37.5–39 s | dolly-zoom fov 22 → 32 while moving 70 u/s and turning 57°/s | three moves at once |
| 46–52 s | pull-out speed pumps 53 → 31 → 52 → 22 → 45 u/s | "breathing" speed at every key |
| everywhere | `eback` (10 % overshoot) on the city rise, trees, sign, brochure, node, pins; per-word blur-in captions | every element "boings"; blur-in and overshoot are on the bible's banned list |

### 3.3 Pacing and text
11 captions in 52 s, each with an eyebrow and often a sub: the eye is always reading, never looking. Visual and
text say the same thing twice (the pile shows the tasks, then the sub lists them).

### 3.4 Sound
120 BPM four-on-the-floor kick, clap on 2 and 4, 16th hats, off-beat bass, pluck stabs, 16th FM-bell arps,
pumping sidechain (55 %), snare roll and crash into the drop. Cues: **38 bell hits** in 52 s (12-note run in
0.75 s when blocks enter the brochure, 7 "found", 8 tiles, 4 finale, 5 end bells, 2 more), 12 wood knocks on an
ascending scale, a counter that ticks like a slot machine. Upbeat corporate EDM: energetic, cheap, and it fights
the luxury picture.

---

## 4. Renovation plan (same story, new world)

### 4.0 Which path

- **A (recommended for this film): restyle `svif-fyrirtaeki.html` in place.** It already has everything the
  52 s story needs (city, office, task pile, brochure, system, van, categories, end), the capture and sound
  pipeline, and the step clips derive from it. The changes are data, materials, easing and overlay; the
  architecture stays.
- **B (bible §4c): render the company film from `src/three/stories/business.ts`.** Best for perfect site/film
  identity, but that story has 4 steps and no van/node/city-scale sequence yet; extending it to the 52 s
  script is a bigger build. Use B for the homeowner film; use A here and **share the look constants** so both
  match by construction (4.1).
- Optional and tested: **switch the film to three 0.186.1** (the site's version). Change the import map to
  `three@0.186.1/build/three.module.js` (0.186 ships no `.min` build; `three.module.js` imports
  `three.core.js` from the same folder) and the two `0.169.0` strings plus the `node_modules/three` path in
  `capture.mjs`. Pass-3 frames rendered identically with no console errors.

### 4.1 Lighting and render settings (tested, see `look-variants.jpg`)

| Setting | Old | New | Notes |
|---|---|---|---|
| Tone mapping | ACESFilmic, exposure 1.1 | **site's custom AgX look** (`installAgxLook(1.1, 1.08)` GLSL from `src/three/core.ts` 147–186 → `CustomToneMapping`), exposure 1.0–1.05 | Ported into r169 and r186: the `CustomToneMapping` marker, `agxDefaultContrastApprox` and `LINEAR_SRGB_TO_LINEAR_REC2020` exist in both. Fallback: `NeutralToneMapping` (Khronos PBR Neutral keeps base colours true; [Khronos](https://khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products)); it gave a warmer, more saturated "golden" variant |
| Environment | none | **`createWarmEnvironment()`** from `core.ts` 192–217 (4 emissive panels → PMREM, `environmentIntensity 1.0`), hemisphere off | gives the clay soft gradients; RoomEnvironment at 0.28 also works but is flatter |
| Sun | `#fffdf8` 3.05, ~54° | `#fff6ea` 3.2 along the site's `SUN_DIR (-0.62,0.62,0.48)` (≈38°) for site parity; for the opening and the end a lower golden-hour sun (≈23°, `#ffe4c4` 3.3) gives the long shadows in `proto-golden-33.jpg` | shadow camera ±130 × ±110, near 20, far 420 covers the city at both elevations |
| Shadows | PCFSoft, `radius 2.2` (ignored) | **`VSMShadowMap`, `radius 5`, `blurSamples 16`, `bias −0.0002`, `normalBias 0.05`** | PCF with radius 3.5 at a low sun produced striped acne on walls; VSM gave clean soft shadows. Shadows only re-render while t < 4.2 s, so VSM's blur costs nothing afterwards. Moving props keep their blob shadows |
| Background / fog | `#eceff4`, fog 240–680, visible slab edge | `scene.background = fog colour #6b6253`, `Fog(…, 150, 520)`, plus a 4000×4000 ground plane at y −0.02 in the ground material | a CSS gradient behind a transparent canvas showed a band where fog met sky; matching background to fog removes it |
| AO | none | **height AO via `onBeforeCompile`** on white/groove/grid/detail/base/tree/trunk: `ao = mix(.55, 1, smoothstep(.4, 3.4, worldY))`, faded out on up-facing faces (`vAoN = abs(worldNormal.y)`), applied to indirect fully and direct at 50 % after `#include <aomap_fragment>`; world Y includes `instanceMatrix` | free; grounds every wall. Add instanced footprint blobs (`texBlob` scaled to each building's w×d, scaled with the riser) for ground-side contact darkening |
| GTAO | — | **not recommended** | `GTAOPass` (r169) tested: 135.9 s vs. 44.2 s per 30 frames (3.1×) for a barely visible change |
| Edges | grey `LineSegments` everywhere | `edgeMat.visible = false` (or delete `outline()` calls) | the single biggest "AI render" tell |
| Grain/vignette | white glow bottom-left, 5 % multiply grain | dark warm vignette `rgba(30,26,22,.42)` at the edges, **caption scrim** `radial-gradient(ellipse 75% 70% at 0% 100%, rgba(30,26,22,.62), transparent 72%)`, grain 7 % soft-light, an optional slow diagonal **sunbeam** (118° linear gradient, cream at 10–16 %) drifting 2–3 % across a shot | the flyer's diagonal light, done in the overlay so it costs nothing |

Legibility numbers (cream `#f6f5ec` on…): stageDeep `#2e2a24` 13.0:1, stage `#4a4438` 8.8:1, ground `#5c5547` 6.7:1,
fog `#6b6253` 5.5:1, block `#a89c88` 2.5:1, clay `#efe8db` 1.1:1. White type therefore sits over the dark table,
the scrim (≥ 0.5 of `#1e1a16` over clay reaches 3.5:1, the large-text minimum; 0.6 reaches 4.7:1) or a dark
title plate. **Compose every shot with negative space (dark table) in the lower-left third where the caption lives.**

### 4.2 Palette mapping

| Old | Where | New |
|---|---|---|
| `#eceff4` | `BG`, `--paper`, fog | fog/background `#6b6253`; stage CSS `#4a4438` |
| `#e3e7ee` | `M.ground` | `#56514a` (taupe table; greyer than `#5c5547`, which read olive under warm light) |
| `#f7f8fb` | `M.block` (block plates) | `#b3a793` |
| `#ffffff` | `M.white/groove/grid`, foliage, lamps | `PAL.clay #efe8db` (site clay); towers may alternate `clayWarm #e8dccb` |
| `#dfe4ec`, `#e2e6ee`, `#f3f5f9` | groove/grid canvas | groove `#e6ddcd`; windows `#b9ab95` with `#ede4d4` lintel |
| `#e6eaf1` | `M.detail`, `GREY` (unlit shop sign/awning) | `PAL.clayShade #d8ccb8` |
| `#cfd8e8` | `M.glass` | `#5a5144`, roughness .22, metalness .3 (dark warm glass that picks up the env) |
| `#eaeef5` / `#eceff5` / `#fafbfc` | base / path / road dashes | `clayWarm #e8dccb` / `sand #c1b6a4` / `#7d7262` (dashes darker than the road, not white) |
| `#ffffff`, `#eef1f5` | trees, trunks | foliage `#d9cfbd` (monochrome maquette), trunk `#7a6b58` |
| `#1f55ff` | `M.blue` (door, awning, van stripe, owner), `BLUE_LIT` | **rose `#b29079`** roughness .5 — the one accent, only on "the thing that matters" (hero door/awning, lit businesses) |
| `#8fa9ff` | `blueSoft` | `#d4bba6` |
| `#3a4256` | `M.dark` (van glass, wheels) | ink `#2a2420` |
| `#1f55ff` | ring/line/node `BLUE` | cream `#f3e6d2` hairlines; node accent rose |
| `rgba(31,85,255,…)` | `texGlow`, `glowTex`, halo | warm `rgba(255,214,160,.30→0)` or remove (glows are on the banned list) |
| `rgba(20,30,60,.32)` | `texBlob` | `rgba(30,24,18,.42)` |
| `#0d1530`, `#4a5470`, `#8ea2ea` | overlay ink, soft ink, roof stroke | cream `#f6f5ec`, `rgba(246,245,236,.72)`, cream |
| `INK #2f3850`, `LINE #3c4560`, `ROOF #8ea2ea`, `SIG #1f55ff`, `DEEP #1d2030` | brochure art | ink `#2a2420`, `#6f655b`, sand `#c1b6a4`, rose `#b29079`, ink |

### 4.3 Story objects, restyled (same function, new form)

| Object (lines) | Change |
|---|---|
| Pings (451–472) | `RingGeometry(.988, 1, 160)` hairline in cream at ≤ 60 %; **one** ring expands once per event (1.6 s, ease *arrive*, fades), no loop; no glow plane; no marker sprite (`texMarker` → empty) — a found business is shown by its awning/door turning rose and a warm window (`emissive #f2c894` 0 → 0.35 over 0.8 s, *breathe*) |
| Map-pin markers | delete; if a label is needed, a DOM hairline callout (tracked caps on a 1 px leader), as in the site story |
| Node (474–480) | replace sphere + tori + glow with the **SVIF roof mark** as a thin object: `TubeGeometry` through 3 points of the chevron, MeshStandard rose `#b29079` metalness .6 roughness .35 (reflects the warm env); it fades/rises in 1.2 s (*arrive*), no spin, no bob, no pulse |
| Lines (481–493) | `Line2`/`LineSegments2` + `LineGeometry`/`LineMaterial` (r169 `examples/jsm/lines/`, `linewidth` in px, `resolution` is set automatically in `LineSegments2.onBeforeRender`) at 1.25–1.5 px, cream 70 %; draw on by setting `geometry.instanceCount` (LineSegmentsGeometry extends InstancedBufferGeometry) with *glide* over 1.2 s; one soft light dot travels once, not on a loop. Or keep `TubeGeometry` at r .045 (pass 1) |
| Task pile (671–697) | thinner cards/folders `2.6 × .35 × 4.6` alternating clay/clayWarm/sand; face label Jost 400 caps tracked .2em in ink 80 % with a hairline icon, no blue disc, no checkbox; cards are **placed** (descend 3 units, 0.6 s *settle*, opacity in), no squash, no sway; optional 0.3° settle tilt |
| Absorb (872–883) | cards slide into the brochure along soft arcs, 1.1 s each, 0.12 s stagger, no spin, scale 1 → .5; the brochure does not pulse |
| Owner (497–498) | ink `#2a2420` or rose capsule, slimmer (r .22), glides (*glide*), no step bob |
| Van (500–509) | clay body, rose pin-stripe 2 cm, ink glass and wheels; no bounce; a 1–2° roll into the corner from the route curvature |
| Mini brochures (906, 982) | fly flat, no spin; square cover; land with a 0.25 s *settle* |
| "OPIÐ" sign (979) | ink plate `#2a2420` with a cream hairline inset and **Jost 300 caps, 22 px tracking** (tested); appears with a small damped swing (≤ 3°) or opacity *breathe*, no `eback` pop |
| Halo, glowA/B, tileGlow (669, 714–717) | remove the blue glow; highlight a tile/offer with a cream fill sweep (`clip-path`-like reveal in the page canvas, *curtain* 0.9 s) and a 1 px rose underline drawn with *glide* |

### 4.4 The brochure, repainted as the product (`paintPages()` 606–668)

- **Square pages** like the real brochure: `PW = PH = 7.4`, `CW = CH = 1200` (tested; layouts must be re-laid on
  the 1200 grid). Give the page block real thickness (0.18) with a peach `#efe7da` edge, and use
  `MeshStandardMaterial({ map, roughness: .85 })` for pages so they take the warm light. Optional page bend
  during the turn: subdivide `pagePlane` (24 × 1) and offset z by `sin(π·open)·k·x²` in the vertex stage.
- **Cover** = `scratchpad/svif/public/svif/kafli/biz-cover.jpg` ("NÝR REKSTUR", 1024²) loaded with
  `TextureLoader().loadAsync()`, `colorSpace = SRGBColorSpace` (tested). Loading a `file://` image into WebGL
  throws `SecurityError` unless Chromium gets **`--allow-file-access-from-files`** (tested both ways); add it to
  the `chromium.launch` args in `capture.mjs` (or inline the JPEG as a data URI at build time). Note the bible
  flags "NÝR REKSTUR" as a placeholder name awaiting the owner's word.
- **Offer pages (adA/adB)** in the flyer's coupon style (page 3 of the flyer, `ref/page-2.jpg`): peach card
  `#efe7da` on cream, small tracked caps "FYRIR NÝ FYRIRTÆKI" (Inter 500 26 px, .3em), a hairline frame box
  "SVIF" top-right, **Jost 300 "25%"** at ~210 px with "AFSLÁTTUR" tracked beside it, one Inter 400 line
  "af bókhaldi fyrsta árið", a thin rule, "svif.is" small caps at the foot. Second page the same grammar for
  "15% · af nýrri vefsíðu". No chips, no icons in discs, no check lists, no company names.
- **Spread 2 (left/right)**: left = taupe page `#4a4438` with the cover's broken hairline frame, cream Jost 300
  caps "ALLT Á EINUM STAÐ" and an Instrument Serif italic line, the roof mark between two rules; right =
  contents page modelled on flyer page 2 (`ref/page-1.jpg`): category heads in tracked caps with a 1 px rule
  under each, two or three columns, one line per category. The highlight is a cream band sweeping behind the
  row, not a glowing box.
- **Back**: taupe, "TIL HAMINGJU" in Jost 300 caps, the roof mark between rules, small "HANNAÐ, PRENTAÐ OG SENT
  AF SVIF" bottom-right (flyer back page).
- Fonts in canvas: `FONT_D='"Jost"'`, `FONT_B='"Inter"'`, accent `"Instrument Serif"` italic; set
  `g.letterSpacing` (works in Chromium canvas, already used at 567/614) for tracking. Load them in `init()`
  (`document.fonts.load('300 100px Jost')` etc.) before `paintPages()`.

### 4.5 Overlay: typography, layout, copy, motion

Fonts: vendor the site's families in the routed layout (tested, 25 woff2 incl. latin-ext, 772 KB):
`scratchpad/research/audit03/filmtest/vendor-fonts.sh` (fetches
`family=Jost:wght@200;300;400;500&family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1` with a
Chrome UA, writes `fonts/google.css` and `fonts/s_<family>_<ver>_<file>.woff2`). Icelandic letters are all in the
latin subset. Change the `<link>` in line 7 to the same URL.

Layout (tested in passes 1–4):
- **Broken hairline frame like the printed cover**: 1 px cream at 55 %: top-left L (300 px each way from
  56,56), right vertical (top 200 → 720), bottom-right horizontal 420 px, bottom-left vertical 300 px.
- **Corner labels** Inter 500 15 px, .26em, uppercase, cream 80 %: TL "SVIF", top centre "65°N · 19°W", TR
  "FYRIR NÝJAN REKSTUR", BR "SVIF.IS", BL chapter "02  NÝR REKSTUR" (number at 55 %). This replaces `.brand`
  and the 8 chapter bars.
- **Caption pair** bottom-left at x 120: eyebrow = 56 px hairline + tracked caps (optional; drop it when the
  chapter label already says it); title = **Jost 300 uppercase 58 px, .12em, line-height 1.16, cream**;
  accent = **Instrument Serif italic 40 px `#efe2d3`**. Keep titles ≤ 3–4 words per line (5-word caps lines
  in pass 2 ran into the city).
- **Node tag** → no card: 1 px cream leader, small caps "SVIF KERFIÐ", Jost 200 64 px number, serif italic
  "ný fyrirtæki fundin" (tested).
- **Counter** → Jost 200 150 px cream numerals, tracked caps "Á MÁNUÐI" under; one *DigitRoll* (the bible
  allows one), no rounding-by-5 flicker, no scale bump.
- **End card** → the city dims under a taupe plate (`#2e2a24` at 0 → 70 % over 1.2 s, *breathe*), then centred:
  `scratchpad/svif/public/svif/logo-cream.png` (640×256; ask for an SVG or 2× PNG for 1080p) between two 1 px
  rules drawn outward (*glide* 1.2 s), "FYRIR NÝ FYRIRTÆKI" Jost 300 .42em, serif italic "Rétta fólkið, á réttu
  augnabliki.", "SVIF.IS" .4em. Pass 2 shows why the plate is needed (white type over clay is unreadable).

Copy (draft — check against bible §5/§7 and the copy research before rendering): 121 → ~49 words.

| t (old) | Old | New (caps / *italic*) |
|---|---|---|
| 0.5 | Á hverjum degi verða til ný fyrirtæki. | Á HVERJUM DEGI / *verða til ný fyrirtæki.* |
| 4.4 | Draumurinn er orðinn að rekstri. | DRAUMURINN / *er orðinn að rekstri.* |
| 8.2 | En nýjum rekstri fylgja ótal verkefni. + sub list | ÓTAL VERKEFNI / *fylgja nýjum rekstri.* (the cards are the list) |
| 12.5 | Hvar á að byrja? | *Hvar á að byrja?* alone, large, 1.5 s of near-silence |
| 16.3 | Þess vegna bjuggum við til SVIF. + sub | no caption: the cover fills the frame (NÝR REKSTUR · SVIF); chapter label only |
| 20.2 | Við finnum traust fyrirtæki. + sub | TRAUST FYRIRTÆKI / *bjóða sérkjör.* |
| 25.6 | Kerfið okkar finnur ný fyrirtæki og nýja eigendur. + sub | KERFIÐ / *finnur ný fyrirtæki jafnóðum.* |
| 30.3 | Við sendum bæklinginn til allra nýrra fyrirtækjaeigenda. Um allt land. | UM ALLT LAND / *til allra nýrra fyrirtækjaeigenda.* + counter "250 Á MÁNUÐI" |
| 34.1 | Svo þú getir kynnt þjónustuna þína fyrir þeim sem þurfa á henni að halda. | ÞJÓNUSTAN ÞÍN / *hjá þeim sem þurfa hana.* |
| 39.0 / 42.0 | Eitt fyrirtæki í hverjum flokki. / Allt sem nýr rekstur þarf, á einum stað. | EITT FYRIRTÆKI / *í hverjum flokki.* (merge; the spread says "allt á einum stað") |
| 46 | SVIF · Fyrir ný fyrirtæki · Rétta fólkið, á réttu augnabliki. · svif.is | unchanged words, new card |

Caption motion (bible tokens, replaces `wordAnim()` 801–804 and the eyebrow slide 807): wrap each **line** in an
`overflow: clip` mask; line enters `translateY(100%) → 0` over 1.0 s with *arrive* `cubic-bezier(.19,1,.22,1)`,
opacity 0 → 1 over the first 60 %; 90 ms line stagger; the italic accent follows +150 ms; **no blur, no per-word
stagger**. Exit: opacity only, 0.4 s *leave* `(.5,0,.75,0)`. Hairlines draw with `scaleX` 0 → 1, 1.2 s *glide*;
corner labels fade 0.8 s *breathe* once at the start. In capture these are pure functions of t: evaluate the
cubic-béziers in JS (a 20-line `cubicBezier(x1,y1,x2,y2)` solver, or copy `motion-utils`' implementation).

### 4.6 Camera, timing, easing

**Retime on a 4 s phrase grid (recommended, 56 s)** so chapters land on bar lines of a 60 BPM feel and every
section gets air. Keep `BPM = 120` as the grid constant (all `TL` values stay multiples of 0.5 s):

| Chapter | Old | New | Beats |
|---|---|---|---|
| 01 city | 0–4 | 0–4 | one continuous descent 0–6 s (overlaps 02) |
| 02 office | 4–8 | 4–8 | sign 5.0, owner walks 4.5–7.0 |
| 03 tasks | 8–16 | 8–16 | 12 cards at 8.0…13.5 (keep 0.5 s, each 0.6 s settle); "Hvar á að byrja?" 13.6–15.8 |
| 04 brochure | 16–24 | 16–24 | arrives 16.0, cards in 17.0–18.4, opens 19.5 (1.2 s), offers 20.8 / 21.8, closes 23.0 |
| 05 system | 24–30 | 24–32 | rises into the roof mark 23.5–25.5, lines 26–29.5, hold to 32 |
| 06 delivery | 30–38 | 32–40 | dissolve through `#2e2a24` (0.6 s) at 32; van 32–39.5; DigitRoll 33–36 |
| 07 categories | 38–46 | 40–48 | open 41, tiles 42–45.5 (8 × 0.45 s, cream sweep), back into the door 46–48 |
| 08 end | 46–52 | 48–56 | pull-up 48–52, plate 51–52.2, card 52–56 |

If 52 s must hold, take 2 s each out of 05 and 06. Update `DUR`, `#scrub max`, `CHAPTERS`, `CAPS`, `SHOTS`
keys, `make_skref.py`'s asserted `DUR` line, and the segment boundaries (§6).

**Camera system** (replace `shotParam()` 767 and the `SHOTS` handling 766/832–843):
1. Per shot, build the centripetal Catmull-Rom for position and target as now.
2. Compute each key's arc-length fraction `s_i` (from `curve.getLengths(n)` at `t = i/(n-1)`), then map time →
   arc length with a **monotone cubic (Fritsch–Carlson) through `(t_i, s_i)` with zero slope only at the shot's
   first and last key**, and sample with `curve.getPointAt(u)` (arc-length parameterised; `getPointAt`,
   `getLengths`, `getUtoTmapping` verified in r169 `Curve.js`). Result: one continuous move per shot,
   velocity-continuous at every key, eases only at the shot ends. "Holds" become a 2–3 % drift, never a stop.
3. Caps per shot: position ≤ ~25 u/s in close shots, turn rate ≤ ~8°/s (a frame width in ≥ 4 s at fov 28–32),
   no simultaneous dolly + zoom + turn. The 23.5 s whip becomes either a slow 2.5 s rise with the brochure
   leading the eye, or a dissolve.
4. Lens: fov 32 → **28–30** (site uses 28–32) for a calmer, more architectural perspective.
5. Remove `punch` (841–842) entirely. Keep the van dolly-zoom only if it is the *only* move in that second.
6. Frame rate: bible says **25 fps**. Slow camera + no beat pulses makes 25 fps fine. For the opening descent,
   optional shutter blur: render 4 sub-samples per frame at `t + k/(4·fps)·0.5` and average them in a 2D canvas
   (`globalAlpha` accumulate of the WebGL canvas, which `preserveDrawingBuffer` allows); ×4 cost, so only for
   fast moves.

**Easing replacements** (bible §2):

| Old | Where | New |
|---|---|---|
| `eback` (overshoot) | risers 845, trees 413, sign 850, book appear 934, node 897, markers 468, skref 17/63/77 | *arrive* for entrances; city rise = scale-Y 0 → 1 over 1.4 s *glide* with a distance-ordered stagger (≤ 2 s total), **not quantised to eighths** |
| squash/stretch, fall from +16 | 876–878 | 0.6 s *settle* from +3 with opacity |
| pile sway + wobble | 862–866 | remove |
| owner bob, van bounce, marker bob, node bob, ring spin, node core pulse, book pulse | 854, 905, 468, 899–900, 929/934 | remove (idle motion is banned) |
| ring loop every 3 beats | 465 | one expanding hairline per event |
| block spin in flight, mini-brochure spin | 882, 906 | no spin; soft arc with *glide* |
| per-word blur captions, blurred end card | 801–819 | line masks *arrive*; exits *leave* (opacity only) |
| counter 0→250 with rounding + bump | 816–817 | one DigitRoll, *arrive* 2.4 s |
| hard cuts at 16/30 s | SHOTS | dissolve through `#2e2a24` 0.6–0.8 s (*breathe*), as the bible's film spec says |

### 4.7 Soundtrack: `audio/compose.py` and `dsp.py`

Keep: `events.json` export from the page, `cues()` dispatch by event kind, the pedalboard mix and
`brickwall()`. Event sync survives any retime because the events are re-exported from `soundEvents()`.

Changes:
1. **Export the chapter times** from the page (`soundEvents()` 955–972: add `chapters: CHAPTERS.map(c=>c[0])`)
   and make `section()` (75–98) use them instead of the hard-coded 2/4/8/24/30/38 s.
2. **Feel**: keep the 120 grid from `events.json` but write in half time: `PULSE = 2*BEAT` (60 BPM), harmonic
   rhythm one chord per 4 s; D major is fine, voiced open and lower (root + 5th + 10th, add9/6/9; drop the
   bright Dmaj7 stacks in octave 5). Suggested loop: Dadd9 – Bm11 – Gmaj9 – Asus4 → A.
3. **Delete** `drums()` (kick/clap/hats/snare/crash), `sidechain_env()` use, `bassline()` off-beat 8ths,
   `chord_stabs()`, `arps()` and `lead()`.
4. **Add to `dsp.py`**:
   - `felt_piano(freq, dur, vel)`: 8–10 partials at `f_k = k·f0·√(1 + B·k²)` with B ≈ 0.0003–0.0008 (stiff-string
     inharmonicity, [Fletcher et al.](https://www.academia.edu/22085383/Fast_automatic_inharmonicity_estimation_algorithm),
     [overview](https://wirestrungharp.com/material/strings/inharmonicity/)), amplitudes ∝ `1/k^1.4` scaled by
     velocity, per-partial decay `tau/(1+0.6k)`, a 4 ms low-passed noise "hammer", then `lpf` at 1.8–3 kHz
     (the felt), slight double-detune (±3 cents).
   - `warm_pad(...)`: existing `pad_voice` with cutoff 800–1200 Hz, 1.2–2 s attack, slow 0.15 Hz filter drift.
   - `cello_bass(...)`: sine + `lpf(saw, 300)` on the root, 0.4 s attack, whole-chord length.
   - `paper(kind)`: band-passed noise foley (slide 0.25 s 1–5 kHz swell; tap 15 ms 800–3 kHz + 150 Hz body;
     page turn = 0.35 s sweep 1.5 → 4 kHz). Short and filtered, not whooshes.
   - `hall_ir(seconds=3.2)`: stereo decorrelated noise × exponential decay, 25 ms pre-delay, low-passed 6 kHz;
     use with `pedalboard.Convolution(ir_array, mix=…, sample_rate=48000)` (signature verified in 0.9.26)
     instead of Freeverb `Reverb` on piano and pad.
5. **Cue map** (`cues()` 329–374), ~6 musical cues + quiet foley instead of 38 bells:

| Event | Old | New |
|---|---|---|
| sign | stab + bell | one felt-piano dyad (D5 + A5) at low velocity |
| slab ×12 | wood thocks on an ascending scale | paper tap on each (−24 dB); a piano note on every **third** card (4 notes, rising) |
| ask | (nothing) | music ducks −6 dB for 1.5 s; one low piano D3 |
| drop | impact + crash + bright stab | pad swell (0.8 s attack) + rolled piano chord (40 ms between notes) |
| absorb ×12 | 12-bell run in 0.75 s | one soft paper flutter over 1.4 s; **no bells** |
| open / close | stab / thock | page-turn foley / soft paper tap |
| rise | saw riser | none (pad crescendo carries it) |
| node | impact + bell | low warm chord + sub swell |
| found ×7 | 7 bells | 3 high piano notes (first, middle, last) at low velocity |
| vanStart / deliver ×3 | — / knocks | — / paper slide-and-land |
| counter / count | tick stream / stab | nothing / piano dyad on the final value |
| bookUp, tile ×8, fin ×8 | pop, 8 bells, 4 bells | page whisper; nothing; nothing |
| back / home | — / knock | — / one soft, darker knock on the door (diegetic, nice) |
| end | impact + crash + 5 bells | final chord: pad + rolled piano Dadd9, long hall tail |

6. **Mix**: no sidechain; music bus `LowShelf +2 dB @120 Hz`, `HighShelf −1.5 dB @8 kHz`, `Compressor 1.6:1`;
   foley bus `HighpassFilter(150)`; keep the short music ducking under foley at 15 % instead of 30 %.
   Loudness: −14 LUFS integrated / −1 dBTP is the common web/YouTube target (keep `finalize.sh`'s loudnorm
   `I=-14:TP=-1.5`) ([roex](https://www.roexaudio.com/blog/how-to-master-music-for-streaming-spotify-apple-music-deezer-youtube),
   [Fora Soft 2026](https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026));
   the bible also says −14. A quieter, more dynamic master (−16) is defensible for a calm film, but stay with −14
   so it plays at the same level as other site media.

---

## 5. Step clips (`web/skref1-4*.mp4`)

How they were made: `make_skref.py` splices `skref-clips.js` into a copy of the film (square stage, its own
`renderClip(t)` that reuses the film's city, pings, brochure, van, node, lines, and hides everything else via
`clearFilm()`), then each clip is captured at 1080² and pixel ratio 1, overlays hidden, and transcoded to 720²
(raw renders in the git-ignored `web/_t/`). Posters are frame 0.

Regenerate in the new style:
1. Restyle the film first (all materials, pings, brochure, node, lines live in the film and are inherited).
2. Edit `skref-clips.js`: `camAt()` 8–14 → the same monotone arc-length camera; `cityAt()` 17 `eback` → *glide*
   rise; clip 1 (61–70) sign/owner pop → *arrive*; shops light via rose + warm window, one ring each; clip 2
   (71–80) replace `C.checks` blue `check()` sprites (35–37) with a 1 px rose tick/underline drawn in the page
   canvas and the cream row sweep; clip 3 (81–90) remove van bounce (82) and drop spin (85); clip 4 (91–105)
   remove `hit()` core pulse (102), ring spin (93–95), keep the hairline callout.
3. Add any new overlay ids/classes (e.g. `.frame`) to `HIDE`.
4. Posters: decide frame 0 vs. the held last frame. The site plays each clip once and holds the end, so the
   **last frame is the better poster** (the old frame-0 posters are near-empty for clips 1 and 3).
5. These clips may be superseded by the live pinned `BusinessStorySection` (bible §4b). Then keep them only as
   the no-WebGL / reduced-motion fallback or drop them; don't spend render time before that is decided.

Commands: §6.4.

---

## 6. Exact commands

Work in a copy so the source stays pristine, e.g. `cp -r scratchpad/oldvideo-src/video/svif-fyrirtaeki scratchpad/film-biz && cd scratchpad/film-biz`.

### 6.1 Setup
```bash
# three 0.169 as the film pins it (lockfile present → exact tarball + integrity)
npm ci --no-audit --no-fund                    # → node_modules/three (0.169.0)
#   or, to match the site (tested): npm i three@0.186.1 --save-exact
#   then: import map → three@0.186.1/build/three.module.js ; capture.mjs: replace 'three@0.169.0' (2×)
# fonts in the routed layout (Jost, Inter, Instrument Serif), then append the old css only if old text remains
bash scratchpad/research/audit03/filmtest/vendor-fonts.sh   # copy it next to capture.mjs first; it cds to its own folder
# allow file:// images (the NÝR REKSTUR cover) as WebGL textures
sed -i "s/'--disable-gpu-vsync'\]/'--disable-gpu-vsync','--allow-file-access-from-files']/" capture.mjs
cp scratchpad/svif/public/svif/kafli/biz-cover.jpg scratchpad/svif/public/svif/logo-cream.png .
mkdir -p out frames audio/out
```
Playwright resolves from the global install (`NODE_PATH=/usr/local/lib/node_modules_global`, browsers in
`/opt/pw-browsers`); no `npm i playwright` needed here.

### 6.2 Look development and sound sync
```bash
node capture.mjs frames:frames 2 6 10 14 17 21.5 27 33 41 46 50 54     # stills to check (≈1.5 s each)
node capture.mjs events:audio/events.json                              # re-export cues after any retime
python3 audio/compose.py                                               # → audio/out/mix.wav
```
Camera QA: the probe used here (`scratchpad/research/audit03/filmtest/camprobe.cjs` + a `window.__cam` hook)
samples position/fov per frame; rerun it after the camera rewrite and check there are no single-frame speed
steps and turn rates stay under ~8°/s. (It took 11.5 min at PR 0.25 because every sample renders; fine overnight.)

### 6.3 Film render (25 fps per bible; 56 s = 1400 frames, segments on frame boundaries)
```bash
node capture.mjs out/seg0.mp4 0     18.68 25 &
node capture.mjs out/seg1.mp4 18.68 37.36 25 &
node capture.mjs out/seg2.mp4 37.36 56    25 &
wait
./finalize.sh                    # concat, loudnorm −14 LUFS/−1.5 dBTP, master + -litil + music.mp3
# web + 720p versions used by the site (not in finalize.sh; reconstructed from the old files' bitrates)
ffmpeg -y -i SVIF-fyrirtaeki.mp4 -c:v libx264 -preset slow -b:v 2200k -maxrate 2600k -bufsize 5200k -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart SVIF-fyrirtaeki-web.mp4
ffmpeg -y -i SVIF-fyrirtaeki.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -profile:v main -preset slow -b:v 1100k \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart SVIF-fyrirtaeki-720p.mp4
ffmpeg -y -ss 52.5 -i SVIF-fyrirtaeki.mp4 -frames:v 1 -q:v 3 poster.jpg      # end card as poster (or a hero still)
```
For 52 s at 25 fps use `0 17.32`, `17.32 34.64`, `34.64 52` (433/433/434 frames). For the old 30 fps:
`0 17.3333333`, `17.3333333 34.6666667`, `34.6666667 52` (as in HANDRIT.md). Time: ~1.3–1.5 s/frame per process
measured at PR 1.5 → ~30 min for 1400 frames in one process; three processes share 4 cores, so expect roughly
15–25 min wall time (not measured). `finalize.sh` hard-codes `seg0..2`; keep three segments.

### 6.4 Step clips
```bash
python3 make_skref.py                                 # update its asserted strings first if DUR/title/lines changed
mkdir -p web/_t
for i in 1 2 3 4; do
  HTML="skref.html?clip=$i" VW=1080 VH=1080 PR=1 HIDE='#caps,#brand,#chapters,#count,#end,.frame' \
    node capture.mjs web/_t/skref$i.mp4 0 8 30
done
n=(x ny-fyrirtaeki baeklingurinn dreifingin kerfid)
for i in 1 2 3 4; do
  o=web/skref$i-${n[$i]}
  ffmpeg -y -i web/_t/skref$i.mp4 -vf scale=720:720:flags=lanczos -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -movflags +faststart -an $o.mp4
  ffmpeg -y -sseof -0.04 -i $o.mp4 -frames:v 1 -q:v 3 $o.jpg       # last (held) frame as poster
done
```
Publish: commit `video/svif-fyrirtaeki/**` to a pushed branch of `helgithorvalds-sketch/helgimestariii`, then update
`VIDEO`, `POSTER`, `CLIPS` in `src/routes/fyrirtaeki.tsx` (lines 37–42) to the new commit hash (jsDelivr
`/gh/<owner>/<repo>@<sha>/…`), or move the files into the site's `public/` if size allows.

---

## 7. Checklist for the renovation agent

- [ ] Look: site AgX look + warm env, PAL clay, taupe table/fog/background, VSM, height AO, no edges, footprint blobs
- [ ] Palette table §4.2 applied, no `#1f55ff` left (`grep -n "1f55ff\|31,85,255\|8ea2ea" *.html *.js`)
- [ ] Pings, node, lines, pile, owner, van, minis, sign restyled (§4.3)
- [ ] Brochure square + repainted (§4.4), cover via `--allow-file-access-from-files`
- [ ] Overlay: fonts vendored, frame + corner labels, caption pairs, node tag, counter, end plate + logo (§4.5)
- [ ] Copy reduced (§4.5 table) and checked against the bible copy rules
- [ ] Camera: arc-length + monotone time map, caps on speed/turn, fov 28–30, no punch (§4.6)
- [ ] Every `eback`, squash, sway, bob, spin, pulse removed (`grep -n "eback\|hit(\|Math.sin(t" *.html skref-clips.js`)
- [ ] Retime + `CHAPTERS`/`CAPS`/`SHOTS`/`DUR`/`make_skref.py` updated; events re-exported
- [ ] compose.py: chapters from events, no drums/sidechain/arps/lead, felt piano + pad + foley + convolution, cue table
- [ ] Render 25 fps, finalize, web/720p encodes, posters; step clips if still needed; publish + update hashes

## Sources
- RED, "Camera panning speed" (7-second rule of thumb, frame rate/shutter effects): https://www.red.com/red-101/camera-panning-speed
- RED support, "Panning Speed Best Practices": https://support.red.com/hc/en-us/articles/360019775433-Panning-Speed-Best-Practices
- Khronos, PBR Neutral tone mapper release (base-colour fidelity vs. filmic operators like AgX): https://khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products
- Stiff-string inharmonicity `f_k = k f0 √(1+Bk²)`: https://www.academia.edu/22085383/Fast_automatic_inharmonicity_estimation_algorithm · https://wirestrungharp.com/material/strings/inharmonicity/
- Loudness targets (−14 LUFS / −1 dBTP for web/YouTube; Apple −16 widely cited but not in Apple's docs): https://www.roexaudio.com/blog/how-to-master-music-for-streaming-spotify-apple-music-deezer-youtube · https://www.forasoft.com/learn/audio-for-video/articles-audio/lufs-targets-per-platform-2026
- three.js r169 source (verified locally in `filmtest/node_modules/three`): `src/constants.js` (AgX=6, Neutral=7, VSM=3), `ShaderChunk/shadowmap_pars_fragment.glsl.js` (radius ignored by PCF_SOFT), `src/lights/LightShadow.js` (`radius`, `blurSamples`), `src/scenes/Scene.js` (`environmentIntensity`), `examples/jsm/postprocessing/GTAOPass.js`, `examples/jsm/lines/*`, `src/extras/core/Curve.js`; pedalboard 0.9.26 signatures checked with `inspect`.
- Site look constants: `scratchpad/svif/src/three/core.ts`, `palette.ts`; motion tokens: `scratchpad/research/BIBLE.md` §2, `01-premium-web-motion.md` §2.
