# 04 · Film and sound craft for the Svif explainer films

Scope: (a) a 45–60 s luxury explainer film rendered from the three.js world (no live footage),
(b) its soundtrack, (c) how the film is presented on the site. Written for the agent that renders the
homeowner film and the company film (BIBLE §4c) and the agent that builds the film block and lightbox.

Method: web research (sources at the end and inline), plus measurements made in this sandbox:
- encode tests on synthetic dark gradients and on a real lab render (`scratchpad/labshots/hero1.png`),
  with x264, SVT-AV1 1.7 and libvpx-vp9 (ffmpeg 6.1.1). Files and comparison sheets are in
  `research/film-test/` (`cmp_x264.png`, `cmp_mix.png`, `cmp_real.png`, `cmp_fg.png`, `t_cmp.png`);
- a measurement of Jost 300 stroke widths in a real render;
- an audit of the previous company film (`oldvideo-src/video/svif-fyrirtaeki/`);
- a working numpy + scipy + pedalboard 0.9.26 score prototype, loudness-measured:
  `research/film-test/sound/score_proto.py` (output `score_proto.m4a`, spectrogram `spec.png`).

Every pedalboard and three.js API named below was checked against the installed packages
(pedalboard 0.9.26 in `/usr/local/lib/python3.13`, three 0.186.1 in `svif/node_modules`).

---

## 0. The rules in one screen

1. **Grid.** 30 fps, 72 BPM, 4/4. 1 beat = 25 frames exactly, 1 bar = 100 frames = 3.33 s.
   Homeowner film = 16 bars = 1600 frames = 53.3 s. Each story step = 2 bars (6.67 s).
   Every landing, card and cut sits on a beat, so the picture and the music agree by construction.
2. **30 fps, not 24/25.** 24 and 25 fps judder on 60 Hz screens (frames are shown for an uneven number of refreshes).
   30 fps divides evenly into both 60 Hz and 120 Hz. Add 180° motion blur (shutter = half a frame) by accumulating sub-frames.
3. **Move, then hold.** Camera moves in the first ~60% of each step, then holds still (as BIBLE §3 says). A card appears while the
   camera decelerates and stays up at least `max(2.0 s, 0.6 s × words + 1.0 s)`. Type never moves while it is being read.
4. **One world, few cuts.** 3–5 transitions in the whole film. Use continuous camera moves, match cuts on the booklet rectangle,
   a sunbeam light-wipe, a rack focus, and slow dissolves through stage colour #2e2a24 (1.0–1.6 s), never through black or white.
5. **Camera speed.** Background detail never crosses the frame faster than one frame width per ~6 s (RED's 7-second rule at 24 fps, scaled to 30 fps).
   Long lens (fov 28–32), one move at a time (dolly *or* arc *or* tilt), eased with the site's `glide` curve.
6. **Type sizes at 1080p.** Jost 300 caps ≥ 40 px (measured: 38 px gives 2 px stems); display 56–96 px; tracked corner labels in Jost 400 ≥ 22 px;
   Instrument Serif italic accent ≥ 56 px. Cream #F6F5EC on stage (8.8:1), ink on peach (12.5:1). No thin text in rose.
7. **Words.** ≤ 5 words per card in a 2-bar step (6–8 words need 3 bars). One accent phrase in serif italic per card. ~30 words in the whole film.
8. **Sound.** Felt piano lead, warm pad bed, soft low strings, room air. 72 BPM, major-seventh / sus2 harmony. No drums, risers, whooshes, bells or "ding" per element.
   Accents are harmonic (a chord change, a bass note, a swell that peaks on the landing). One accent per bar at most. Audio lands 0–40 ms after the visual event, never before it.
9. **Loudness.** −16 LUFS integrated, true peak ≤ −1.5 dBTP before AAC, LRA 5–8 LU. Two-pass linear `loudnorm`, then a true-peak `BrickwallLimiter`.
   (The old film was −14.2 LUFS with LRA 3.0 and a −0.3 dBFS peak: too squashed and too hot.)
10. **Encode.** Two sources, AV1 first: AV1 10-bit in MP4 (SVT-AV1 preset 4, CRF 28) and H.264 High@4.0 (x264 veryslow, CRF 18).
    Tag colour as sRGB transfer (`-color_trc iec61966-2-1`), not bt709: with a bt709 tag Safari applies a ~1.95 gamma and the taupe looks washed out.
    Use `+faststart` and a keyframe every 2 s.
11. **Banding.** Dark taupe gradients band in 8-bit H.264 whatever dither you add, unless the frame has real texture.
    Give materials a micro-texture (plaster, paper, linen) plus temporal grain of about ±2.5 LSB at render time. AV1 10-bit from a float render is clean at a quarter of the bitrate.
12. **On the site.** Follow Apple's pattern, which I confirmed in apple.com markup. Short inline loops are muted, have no audio track and carry a small play/pause button whose label changes with its state.
    The full film opens from a "Horfa á myndbandið" text link into a lightbox, plays with sound, and the click is the user gesture.
    The poster is frame 0, and the film opens on a ≥ 0.5 s still identical to the poster. The poster crossfades to video only after `requestVideoFrameCallback` fires.
13. **Accessibility.** Pause control on anything that moves for more than 5 s (WCAG 2.2.2). No autoplay with sound. A visible text alternative ("Texti") that lists the film's cards and describes what is shown (1.2.3).
    A WebVTT track. With `prefers-reduced-motion`, nothing autoplays: show the poster and a play button.

---

## 1. Pacing

### 1.1 Why slow, and how slow
- TV commercials average **under 2 s per shot** (by 1991 they were half the length of early-1980s shots;
  [MacLachlan & Logan, WARC](https://www.warc.com/Content/421e1376-baa5-472f-aa9d-adc58bea5146)). This is the
  energy register the owner calls "AI slop / explainer": many short events, each with its own pop.
- Editors put luxury or cinematic pacing at **4–8 s per shot** and fast pacing at 1–2 s
  ([lueurexterne](https://blog.lueurexterne.com/en/blog/video-editing-pacing-transitions-and-professional-motion-graphics/)).
  One luxury studio's version: *"A shot that stays two seconds longer than expected creates a small, deliberate tension
  that the eye reads as assurance"* and *"Cheap video floods a scene to make everything visible; luxury film shapes light to make one thing matter"*
  ([videoproductionresort](https://videoproductionresort.com/luxury-video-production/)).
- Upper bound: most modern viewers feel any shot longer than about 15 s is slow ([Wikipedia: Slow cutting](https://en.wikipedia.org/wiki/Slow_cutting)).
  For a 50 s film, nothing should sit unchanged for more than ~10 s.

### 1.2 The beat grid (do this first, before any animation)
| Unit | Seconds | Frames @30 | Use |
|---|---|---|---|
| beat (72 BPM) | 0.833 | **25** | smallest event spacing (one object rises per beat, at most) |
| half bar | 1.667 | 50 | card fade-in → fully readable; dissolve length upper bound |
| bar | 3.333 | **100** | one camera move or one hold |
| step | 6.667 | 200 | one story step = move (bar 1, into beat 3 of bar 2) + hold |
| film | 53.3 | 1600 | 16 bars (homeowner); company film 16–17 bars |

Author the timeline **in beats** (BIBLE says scenes are pure functions of `g`; make `g` advance per bar), export the
event list (`events.json`, as the old pipeline's `capture.mjs events:` already does) and let the score generator
read it. Do not quantise audio to an unquantised animation.

Other clean pairings if 72 BPM ends up too slow: 75 BPM = 24 frames/beat, 90 BPM = 20 frames/beat (both at 30 fps).
For "luxurious, not futuristic", 66–76 BPM is right (§3.2).

### 1.3 Shot and hold rules
- **Move 60%, hold 40%.** Within a 2-bar step, the camera moves from the step's downbeat to about beat 3 of bar 2
  (≈ 4.2 s, `glide` easing .65,0,.35,1), then holds still for ≈ 2.5 s. A held frame is what makes the frame feel composed.
- **Text arrives on the deceleration.** The card fades in starting at beat 3 of bar 1 (camera is still gliding but
  slowing) and is fully readable by beat 1 of bar 2. It leaves (opacity only, 400–600 ms, `leave` easing) during the last
  beat of the hold, before the next move starts. Text is never on screen during the fast middle of a move.
- **Minimum readable time** = `max(2.0 s, 0.6 s × words + 1.0 s)`:
  0.6 s/word is "read it twice at 200 wpm" ([SSW rule](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos));
  BBC subtitles target 160–180 wpm, about 0.33–0.375 s/word as a floor ([BBC guidelines summary](https://clevercast.com/bbc-subtitling-guidelines));
  the +1.0 s covers eye travel to a card that appears over a picture.
  | words | min hold |
  |---|---|
  | 2 | 2.2 s |
  | 3 | 2.8 s |
  | 4 | 3.4 s |
  | 5 | 4.0 s |
  | 6 | 4.6 s |
  | 8 | 5.8 s |
  A 2-bar step gives ~4.2 s of readable time, so **≤ 5 words**; 6–8 word cards need a 3-bar step.
- **One event per beat at most.** The six objects in step 0 rise one per beat (6 beats = 1.5 bars), not all at once and not faster.
- **End card hold ≥ 4 s** (logo + "Nýji kaflinn" + svif.is), then a 2–3 s fade to stage while the last chord rings.
- **Open on a still.** The film's first 0.5 s is a still identical to the poster, so the poster → video handover is invisible (§5.4).

### 1.4 Camera language (what "Apple quality" means in CG)
- **Long lens, slow, single-axis.** fov 28–32 (BIBLE). One move at a time: dolly in, *or* lateral truck, *or* small arc (≤ 15°),
  *or* tilt. No simultaneous orbit + zoom + roll; that combination is the "3D template" tell.
- **Speed limit.** RED's rule of thumb: *"pan no faster than a full image width every seven seconds"* at 24 fps / 180° shutter
  ([RED: camera panning speed](https://www.red.com/red-101/camera-panning-speed)). At 30 fps with blur we can go to ~6 s per frame width,
  i.e. ≤ ~320 px/s of background motion at 1920 wide (≈ 10 px/frame). When the camera tracks a moving subject (a flying booklet),
  the background can move faster because the eye follows the subject.
- **Ease in and out over at least 1 s.** No camera move ever starts or stops on a hard frame. Use `glide` for camera,
  and keep a tiny residual drift (≤ 2 px/s) in holds only if a hold would otherwise look frozen. The BIBLE bans idle motion
  on the site; in the film, a 0.3%/s push during a hold is acceptable and reads as "alive" without being a bob.
- **Light does the work.** Shape light to isolate one thing (the booklet, the rose door). The flyer's diagonal sunbeam is the
  recurring motif: use it as a transition (§1.5) and as the key light on hero objects.
- **Depth.** Foreground elements (a plinth edge, a soft out-of-focus wall) passing at a different speed give parallax and
  sell "3D" more than rotating the subject does.
- **Motion blur and antialiasing (important).** Without motion blur, CG frames are instants and strobe; the 180° shutter convention
  means blur over half the frame interval ([180° rule, StudioBinder](https://www.studiobinder.com/blog/what-is-the-180-degree-shutter-rule/);
  in CG renderers "shutter 0.5 frame = 180°", [Otoy forum](https://render.otoy.com/forum/viewtopic.php?p=200052)).
  In three 0.186.1, `SSAARenderPass` already re-renders the scene with camera jitter and accumulates the samples
  (`sampleLevel` 0–5 → 1–32 samples, `unbiased`). Do the same, but give **each sample its own time** as well:
  ```js
  // per output frame f at 30 fps; S = 16 samples; shutter = 0.5 frame (180°)
  for (let i = 0; i < S; i++) {
    const tSub = (f + 0.5*((i + 0.5)/S - 0.5)) / 30;      // stratified over the open half of the frame
    setStory(timeToProgress(tSub));                        // scenes are pure functions of time/progress
    camera.setViewOffset(W, H, jitter[i].x, jitter[i].y, W, H); // sub-pixel AA jitter (same table as SSAARenderPass)
    renderer.render(scene, camera) → accumulate in a HalfFloat target (additive, weight 1/S)
  }
  // then OutputPass (applies renderer.toneMapping = AgX and sRGB transfer), then grain+dither pass, then readPixels
  ```
  The result is antialiasing and motion blur in one loop. Hairline frames and 1 px callout lines stop crawling during slow moves.
  If render time is short, render at 2× (3840×2160) and downsample with Lanczos as well.
  Accumulate in linear HDR **before** tone mapping (OutputPass reads `renderer.toneMapping` and `outputColorSpace`, verified in source).

### 1.5 Transitions that feel expensive
Use 3–5 in the whole film:
1. **Continuous camera ("oner").** Steps 0→1→2 can be one move: the objects fly into the booklet, the camera follows the booklet down,
   it opens, the page turns. No cut needed.
2. **Match cut on shape.** The booklet rectangle becomes the door's letter slot, or the printed page becomes the plinth.
   Match on position, scale and angle within a few pixels, and cut on a beat
   ([match cut types: graphic, movement, audio](https://filmdaft.com/match-cut-definition/)).
3. **Light wipe.** The sunbeam sweeps across the frame. The next scene is revealed through the brightest band, a luminance-keyed
   dissolve over 1.2–1.6 s. It is the flyer's motif in motion. It is not a light-leak overlay: there are no stock leaks, no flares, no colour fringes.
4. **Rack focus.** `BokehPass` (three 0.186.1: `focus`, `aperture`, `maxblur` uniforms) pulls focus from the booklet to the town
   over 0.8–1.2 s with `glide`. Use it to move attention without a cut. Keep `maxblur` modest (≤ 0.008) so it reads as a lens, not a filter.
5. **Slow dissolve through stage.** Cross-dissolve 1.0–1.6 s (`breathe` easing .45,0,.55,1) dipping to #2e2a24 at mid-point, for
   the step 3 → 4 change of world and into the end card (BIBLE: dissolves through #2e2a24). Never dip to black (it reads as a
   chapter break in a long film) and never flash to white.

Banned in the film (they read as template or "explainer"): whip pans, zoom-through transitions, spins, slide/push transitions,
shape or iris wipes, glitch, stock light leaks, lens flares, speed ramps, camera shake, morph transitions.

### 1.6 Template for the homeowner film (16 bars, matches BIBLE §4a)
| Bars | Time | Picture | Card (≤5 words) | Sound |
|---|---|---|---|---|
| 1–2 | 0.0–6.7 | Poster still 0.5 s → sunbeam sweeps the dark stage, reveals the clay house; slow dolly in | `SVIF · NÝJI KAFLINN` (corner label only) | room air + pad fades in |
| 3–4 | 6.7–13.3 | Plinth slides in, six objects rise one per beat (labels on hairlines) | *Nýtt heimili* | piano enters on bar 3 downbeat |
| 5–6 | 13.3–20.0 | Objects fly into the booklet (oner); it lands on bar 6 downbeat and opens | *Nýji kaflinn* | swell peaks on the landing |
| 7–8 | 20.0–26.7 | Page turns on beats; four real coupons fan up | *Örfá fyrirtæki í hverjum flokki* | melody answers |
| 9–11 | 26.7–36.7 | Rack focus to the town; new-owner homes turn rose one per beat; rings, pins | *Kerfið finnur nýja húseigendur* | low strings join, gentle build |
| 12–14 | 36.7–46.7 | Dissolve through stage; print stack, copies fly out; the last slides into this door's slot on bar 14 downbeat | *Inn um lúguna* | music drops one beat before the slot; soft paper + flap |
| 15–16 | 46.7–53.3 | Dissolve to end card on stage: roof mark, NÝJI KAFLINN, svif.is | `svif.is` | resolving chord rings 3 s |
Card wording must come from the copy deck (BIBLE §5–6). The lines above are shortened deck phrases that show length, so check them against the copy rules (no triplets, no fragments).

### 1.7 What makes explainer films feel cheap (explicit list)
Motion
1. Everything moves at once; no stillness to rest the eye. Several events per beat.
2. Springy overshoot, bounce, squash-and-stretch, elastic scale-pops on icons and text.
3. Linear or default ease-in-out curves, every move the same length (the "keyframe template" rhythm).
4. Constant orbiting or turntable cameras; camera moves with no motivation; moves that stop dead.
5. No motion blur on CG, so it strobes. 24/25 fps panning on a 60 Hz screen, so it judders.
6. Transitions as decoration: whip pans, zoom-throughs, glitch, slides, iris wipes, "liquid" morphs.
7. Integer-pixel moves on text and hairlines, so they stair-step and crawl. Aliased thin lines.
Typography
8. Too many words per card; full sentences that narrate what the picture already shows.
9. Per-letter animation (typewriter, bounce-in letters, scrambled text), blur-in, gradient or glowing type.
10. Many sizes and weights on one card; centred paragraphs; type moving while it is being read.
11. Pure #FFFFFF on pure black, or colored thin type that bleeds under 4:2:0 chroma.
Picture
12. Flat, even lighting: everything visible, nothing important ("catalogue" look).
13. Saturated "friendly" palette, icon libraries, isometric clip-art, stock characters and hands.
14. Banding in dark gradients, blocky compression, washed-out colour from wrong colour tags.
Sound
15. Royalty-free "corporate ukulele / clap / whistle" or upbeat 120 BPM with drums and risers
    (the old company film: 120 BPM, kick + sidechain, arps, bells, risers, pops, "thock" per event).
16. A sound effect per UI event (pop, ding, swoosh, click); a cymbal or impact on the logo.
17. Over-loud, over-compressed master (LRA ≤ 3 LU, peaks at 0 dBFS).
Structure
18. A logo sting at the start; a "Hi! Meet X" opener; rhetorical questions on screen.
19. No hold on the end card; CTA flashes for 1 s.
20. Mismatch with the website (different fonts, easing, colours), which makes viewers doubt the brand
    ([DesignRush](https://www.designrush.com/best-designs/video/trends/why-explainer-videos-fail),
    [Hatch Studios](https://hatchstudios.com/?p=12784): *"too much or too fast motion, too many animation transitions … can make your video design look a little silly and unprofessional"*).

---

## 2. Typography in film

### 2.1 Sizes at 1080p (measured, not guessed)
Measured in a lab render (`labshots/hero1.png`, Jost 300 uppercase): a 27 px cap height (≈ 38 px font-size) gives **2 px vertical
stems** (the I is exactly 2 px, Ð's stem 3 px). After encoding (x264 CRF 20, AV1 CRF 28), upscaled 1.33× to 1080p, the type stayed clean
in both codecs (`film-test/t_cmp.png`). Below about 2 px, stems fall apart under chroma subsampling and encoder smoothing
(forum consensus: 1–2 px lines blur or flicker, [VideoHelp](https://forum.videohelp.com/showthread.php?p=2076405)).

| Role | Face | Size @1080p (16:9 and 1:1) | Tracking | Notes |
|---|---|---|---|---|
| Card headline | Jost 300 caps | **64–88 px** (min 56) | 0.08–0.12 em | 1–2 lines, ≤ 22 characters per line |
| Accent phrase | Instrument Serif italic | 64–96 px (min 56) | 0 | one phrase per card; hairline serifs need the size |
| Secondary line | Jost 300 caps | 40–48 px (min 40) | 0.14–0.18 em | optional, ≤ 4 words |
| Corner / callout labels | Jost **400** caps | 22–26 px (min 22) | 0.22–0.30 em | on 1 px → render 2 px hairline at 2× SSAA |
| End card wordmark | roof mark + Jost 300 | 96–128 px | 0.2 em | |

The frame is 1080 px tall in both 16:9 and 1:1, so pixel sizes stay the same. On 1:1, line length drops to about 16–18 characters, so re-break the lines.

### 2.2 Contrast and colour (computed WCAG ratios)
| Pair | Ratio | Use |
|---|---|---|
| cream #F6F5EC on stage #4a4438 | 8.8:1 | default dark-frame type |
| cream on #5c5547 (flyer highlight) | 6.7:1 | OK |
| cream on stageDeep #2e2a24 | 13.0:1 | end card |
| sand #C1B6A4 on #2e2a24 | 7.1:1 | secondary labels on dark |
| ink #2A2420 on peach #EFE7DA | 12.5:1 | light-frame type |
| ink on chalk #E1DACA | 11.0:1 | OK |
| rose #B29079 on #4a4438 | 3.3:1 | **graphics only** (roofs, rings), not thin text |
| rose on cream | 2.7:1 | graphics only |
- Never pure #FFFFFF: cream is the flyer's white and keeps highlights from clipping in AgX.
- Thin text must be luma contrast, not hue contrast. 4:2:0 keeps a quarter of the chroma resolution, so rose thin text bleeds.
- On light (clay) frames, use ink type and drop the tracking 0.02 em. Dark type on light looks heavier than light type on dark.
- If a card sits over a busy part of the frame, darken locally with a very soft radial vignette (≤ 12% opacity, ≥ 600 px radius).
  Do not use a box, drop shadow or outline. Shadows also compress badly.

### 2.3 Safe areas and layout
- SMPTE ST 2046-1 (HD, flat panels): **title-safe 90%**, action-safe 93% of width and height
  ([SMPTE](https://pub.smpte.org/doc/st2046-1/20091123-pub/st2046-1-2009.pdf), [NAB summary](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf)).
  At 1920×1080 that is 96 px left/right and 54 px top/bottom. Web players don't crop, but the films will also be posted to social.
- House layout from the flyer: hairline frame inset 48 px (1 px at 1×, render 2 px at 2× SSAA), corner labels 32 px inside the
  frame, type block left-aligned on a 120 px margin (6.25%). On 1:1, keep the bottom 200 px free of type (Instagram UI).
- Left-aligned type blocks, never centred paragraphs. Centre only the end card.

### 2.4 Type in motion (must match the site's tokens, BIBLE §2)
- **In:** mask-line reveal, the same as the site. Each line rises 16 px inside a clip over 1000 ms with `arrive` (.19,1,.22,1),
  with a 90 ms line stagger and the accent phrase +150 ms. Or opacity + 12 px rise over 800 ms with `settle` for labels.
- **Hold:** absolutely still. No drift, no tracking "breathing", no per-letter motion.
- **Out:** opacity only, 400–600 ms, `leave` (.5,0,.75,0). No exit movement.
- **Screen space, not 3D.** Cards sit flat on the screen. Callout labels may be anchored to world points (projected), but they
  fade in only after the camera has settled, so they never slide across the screen while being read.
- Render type in the same capture pass (canvas/WebGL text or DOM composited by the capture browser) at 2× and downsample.
  DOM text captured while it moves can be snapped to whole pixels by the browser and shimmer (not verified here; test it).
  The safe options are to keep type static or to render it in WebGL.
- Kinetic-type guidance agrees: slow fades read as prestige, and luxury titles use *"subtle slides or tracking expansion and no spins or large fly-ins"*
  ([moonb](https://www.moonb.io/blog/kinetic-typography)). Moving text is harder to read than static text
  ([cursa](https://cursa.app/en/page/text-animation-for-readability-kinetic-type-without-overcomplication)).

---

## 3. Soundtrack: "luxurious, not futuristic"

### 3.1 Direction (one paragraph for whoever writes the score)
A warm room. A felt piano (soft, muffled attack, close and intimate) carries a sparse melody over a slow major-seventh
harmony. Under it, a warm pad and, later, a soft low-string swell (cello and viola register, no high violins). Room air throughout,
which is very low filtered noise, like a quiet apartment. No drums, no risers, no sub-drops, no arpeggiators, no bells.
The music breathes with the picture: it swells into each landing and goes almost silent for one beat before the booklet drops through the
door. The only "sound effect" is diegetic and very quiet: a paper slide and the letterbox flap. That is the sound logo.
Luxury sound is *"often quieter than you expect"* and *"strips it back so a single natural sound can do the work"*
([videoproductionresort](https://videoproductionresort.com/luxury-video-production/)).

### 3.2 Musical parameters
- **Tempo** 66–76 BPM; use **72** (grid, §1.2). Vendor luxury briefs cluster at 70–90 BPM with soft piano, warm pads and subtle strings
  ([advids](https://advids.co/insights/the-psychology-of-music-how-tempo-impacts-viewer-engagement-and-perception-of-your-brand),
  [ElevenLabs example](https://elevenlabs.io/music/songs/OFdLSOupxWJn7hAnSWPO)). Slower is warmer. Faster than 90 reads as "promo".
- **Key and harmony.** D♭ or D major. Imaj9 – vi9 – IVmaj9(♯11) – Vsus2 (prototype: D♭maj9 | B♭m9 | G♭maj9 | A♭sus2).
  Use open voicings, chords rolled 20–40 ms, no dominant-seventh pull until the end, and resolve on I at the end card.
  Avoid minor-key melancholy. This is a welcome, not a farewell.
- **Instrumentation and register.** Felt piano C3–C6 with velocities 0.3–0.6 (soft). Pad an octave above the chord, filtered under 1.5 kHz.
  Low strings enter at the "system" step (bars 9–11). Air is band-passed noise at −40 dBFS.
- **Felt piano character.** Felt between hammers and strings *"robs the piano sound of its brilliance"*, giving a soft, muffled tone and reduced attack
  ([pianoo](https://pianoo.com/felt-piano-a-softer-piano-sound),
  [NI Noire](https://www.sweetwater.com/store/detail/NINoire--native-instruments-noire-nils-frahm-grand-piano-software-instrument)).
  Nils Frahm's *Felt* is the reference: close-miked, pedal and key noise audible
  ([review](https://headphonecommute.com/2012/03/09/nils-frahm-felt-erased-tapes/)).
- **Arc.** Bars 1–2: air + pad. Bar 3: piano enters. Bars 5–6: the landing swell. Bars 9–11: strings and a gentle build (the only build).
  Bar 13: thin out. Bar 14: one beat of near-silence, then paper and flap, then the piano answers. Bars 15–16: final chord, 3 s ring.

### 3.3 Syncing accents without "dings"
- Hit points come from `events.json` (the film timeline), which is the same mechanism as the old pipeline. They are *spotted*, not all scored
  ([hit points / spotting](https://subscription.packtpub.com/book/business-and-other/9781837636891/8/ch08lvl1sec39/defining-hit-points)).
  Pick ≤ 1 per bar: object landing, booklet landing, page turn, first rose home, the slot.
- **Soft sync.** Music arrives at the emotional moment, built over 1–3 beats, instead of hitting every visual event. Mickey-mousing every
  action *"feels cartoonish"* ([film-scoring guide](https://www.thepromptindex.com/skill/1428-film-scoring),
  [StudioBinder on mickey-mousing](https://www.studiobinder.com/blog/mickey-mousing/)).
- What an accent is here, from most to least preferred: a chord change on the downbeat; a low piano note; a pad/string swell
  that peaks *on* the landing frame (cubic rise over 1.5–2 beats, 300–500 ms release); a single soft piano note in the melody.
  Never a bell, chime, pluck, pop, whoosh, riser or impact.
- **Timing tolerance.** ITU-R BT.1359: sound leading picture is detectable from about +45 ms, sound lagging from about −125 ms
  ([ITU-R BT.1359](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!MSW-E.doc),
  [Wikipedia](https://en.wikipedia.org/wiki/Audio-to-video_synchronization)). Place note onsets **0–40 ms after** the visual
  landing frame, never before. Humanise melody notes ±8 ms. Keep downbeat accents exact.

### 3.4 Mixing and loudness for the web
- **Target −16 LUFS integrated, true peak ≤ −1.5 dBTP, LRA 5–8 LU.**
  AES TD1008's distribution loudness puts music at about −16 LUFS overall and speech or mixed content at −18
  ([Production Advice on TD1008](https://productionadvice.co.uk/td1008/)). The earlier TD1004 recommended −16 to −20 LUFS with −1 dBTP max
  ([Production Expert](https://www.production-expert.com/home-page/2015/11/17/aes-release-recommendations-for-loudness-of-audio-streaming-and-network-file-playback)).
  −14 LUFS is the YouTube and Spotify playback reference ([LANDR](https://blog.landr.com/lufs-loudness-metering)), but the site has no
  normaliser, and pushing a sparse piano piece to −14 means heavy limiting. That is the squashed sound we are leaving behind.
  −16 sits just under typical web video and feels calm and expensive when someone clicks for sound.
- **Audit of the old company film:** −14.2 LUFS, **LRA 3.0 LU**, **peak −0.3 dBFS**. Its one-pass `loudnorm` ran in dynamic mode,
  compressed the dynamics and let AAC overshoot. Fix: two-pass `loudnorm` with `linear=true` (or a static gain to target), then a
  true-peak brickwall at −1.5 dB.
- **EQ habits for laptop and phone speakers.** High-pass at 28–40 Hz. Low-shelf the piano −2 to −3 dB at 150–200 Hz (the prototype's
  rolled-chord root octave dominated the low end, see `spec.png`). Dip −2 dB around 3 kHz on piano. High-shelf −4 dB above 7 kHz (felt).
  Keep the pad under 1.5 kHz so the piano owns the presence range.

### 3.5 Synthesis in Python (numpy / scipy / pedalboard 0.9.26): verified
**What pedalboard 0.9.26 actually offers** (from `dir(pedalboard)` and docstrings in this sandbox):
`Reverb(room_size, damping, wet_level, dry_level, width, freeze_mode)` is Freeverb, which sounds metallic on solo piano.
`Convolution(impulse_response_filename | np.ndarray, mix, sample_rate)` accepts NumPy IRs (since 0.9.10).
`Compressor(threshold_db, ratio, attack_ms, release_ms)`.
`Limiter(threshold_db, release_ms)` is JUCE's: **auto make-up gain and a hard clip at 0 dBFS**, so do not use it for a ceiling.
**`BrickwallLimiter(ceiling_db=-1.0, release_ms=100, lookahead_ms=5, true_peak=False)`** has a configurable ceiling, no make-up gain,
4× oversampled detection with `true_peak=True`, and the docs advise a margin such as −1.5.
`LadderFilter(mode=LPF12|LPF24|HPF…|BPF…, cutoff_hz, resonance, drive)`. `HighpassFilter`/`LowpassFilter` are first-order (6 dB/oct).
`HighShelfFilter`, `LowShelfFilter`, `PeakFilter(cutoff_frequency_hz, gain_db, q)`. `Chorus(rate_hz, depth, centre_delay_ms, feedback, mix)`.
`Delay(delay_seconds, feedback, mix)`. `Phaser`, `Distortion`, `Clipping`, `NoiseGate`, `Gain`, `PitchShift`, `time_stretch(...)` (Rubber Band).
`Mix`/`Chain` run plugins in parallel. `Plugin.process(x, sr, buffer_size=8192, reset=True)`.
`pedalboard.io.AudioFile` writes `.wav .flac .ogg .mp3 .aiff`, not `.m4a`, so encode AAC with ffmpeg.

**Prototype that runs** (`research/film-test/sound/score_proto.py`, 4 bars at 72 BPM, 16 s):
```python
SR=48000; BPM=72; BEAT=60/BPM; BAR=4*BEAT
def felt_note(m, vel, length):           # additive "felt piano"
    f0 = midi(m); t = arange(n)/SR; y = 0
    for k in 1..13:                       # partials with string inharmonicity B≈4e-4
        fk = k*f0*sqrt(1+B*k*k)
        amp = k**-1.6 * (0.55+0.45*vel)**(0.35*k)          # soft velocity → fewer highs (felt)
        dec = (0.9+2.2*vel)/(1+0.35*(k-1)) * (440/f0)**0.25 # highs die first, low notes ring longer
        y += amp*sin(2π fk t + φk)*exp(-t/dec)
    y *= 1-exp(-t/0.006)                  # 6 ms soft attack: no click
    y += lowpass(noise,1.2k)*exp(-t/0.012)*0.08*vel        # hammer/felt thump
    return y*vel*release_tail
pad  = detuned saws (−7/0/+6 cents) per chord tone, 1.8 s fade in/out → LadderFilter(LPF24, 1400 Hz) → Chorus(0.15 Hz, mix .35)
swell(at) = band-passed noise (300–2500 Hz) with a cubic rise over 1.6 s peaking ON `at`, 350 ms release
room IR  = stereo decorrelated noise × exp(-6.9 t / RT60=2.4 s), 1-pole LP 4.5 kHz, 12 ms pre-delay → Convolution(ir, mix=…, sample_rate=SR)
piano bus: HighpassFilter(60) → LowShelf(200,-2) → Peak(3200,-2.5) → HighShelf(7000,-4) → Convolution(mix .28)
pad bus  : LadderFilter → Chorus → Convolution(mix .5)
master   : HighpassFilter(28) → Compressor(-22 dB, 1.6:1, 30 ms, 250 ms) → BrickwallLimiter(-1.5, true_peak=True)
write wav (pedalboard.io) → ffmpeg loudnorm two-pass linear (I=-16, TP=-1.5) → AAC 192 kbps 48 kHz
```
Measured: raw −20.8 LUFS. After two-pass linear `loudnorm` and AAC 192k: **−16.0 LUFS, LRA 6.6 LU, true peak −4.7 dBTP**.
The commands are in §4.6. Lessons from the run: (1) the rolled-chord bass note an octave down was too loud below 200 Hz, so lower its velocity and low-shelf it;
(2) apply onset jitter only to the melody (my first version threw an index error on a negative offset at t=0, so clamp placements);
(3) Freeverb is not used. The synthetic convolution room is smoother on piano.

**Honest limit.** Additive synthesis gets "soft keys in a room" but not a real piano's body. If the result sounds toy-like, make it
sparser (fewer notes, longer rings) and lean on pad, strings and room. If a CC0 felt-piano sample set can be fetched (package
registries are reachable here; general hosts may not be), sampled notes through the same chain beat additive synthesis.
For the letterbox flap: a paper slide (band-passed noise 300 Hz–3 kHz with a 400 ms slide envelope) plus a soft wooden "tock"
(2–3 damped modes at about 180/420/950 Hz, 60–120 ms decays), mixed −18 dB under the music. If it does not sound real, leave it
out; silence followed by the final chord works too.

---

## 4. Encoding for crisp web delivery

### 4.1 Frame rate: 30 fps
- 24 fps on 60 Hz is shown as 3:2 pulldown, which judders on slow pans ([forasoft: judder](https://www.forasoft.com/learn/video-encoding/glossary/terms/judder),
  [DVinfo thread](https://dvinfo.net/forum/archive/index.php/t-124261.html)). 25 fps (the BIBLE's current number) is worse:
  60/25 = 2.4 refreshes per frame, an uneven 2-2-3-2-3 cadence, and 120/25 = 4.8 on ProMotion.
- 30 fps gives exactly 2 refreshes per frame on 60 Hz and 4 on 120 Hz. With 180° accumulated blur it looks smooth, not "video".
  60 fps doubles render time and bits for little gain at these camera speeds.
- **→ Change BIBLE §4c from 25 fps to 30 fps.**

### 4.2 Capture
- Capture lossless frames (PNG, or raw RGBA from `readPixels`) at 1920×1080. For the AV1 master, grab a float or 16-bit buffer where
  possible: banding in AV1 10-bit only goes away if the source has more than 8 bits (§4.4, test J vs D).
- Grain and dither belong in the **last shader pass before quantisation**: a temporal TPDF grain of about ±2.5 LSB (8-bit sRGB units),
  re-seeded every frame, with luma only so it does not tint the taupe. three's built-in `material.dithering` is a static ±0.5 LSB
  pattern and, with an EffectComposer, runs into a HalfFloat target. It does nothing for the final 8-bit output.
  `FilmPass(intensity, grayscale)` in 0.186.1 is a plain noise blend. Use your own pass so you control amplitude and seed.

### 4.3 Colour tags (the cause of the "washed-out in Safari" bug)
- three.js renders sRGB. Encode the matrix as BT.709, limited range, and tag the **transfer as sRGB**:
  `-colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv`.
  The Academy Software Foundation's encoding guide: Chrome treats a `bt709` transfer tag as sRGB, but *"on safari it will match the camera
  bt709 parameters, which roughly match gamma 1.95"*, and it recommends `-color_trc iec61966-2-1`. A `gamma22` tag *"does not work correctly on safari"*
  ([ASWF Web Color Preservation](https://academysoftwarefoundation.github.io/EncodingGuidelines/WebColorPreservation.html)).
  Firefox had the same washed-out issue, and re-tagging to `iec61966-2-1` fixed it ([Mozilla bug 1783458](https://bugzilla.mozilla.org/show_bug.cgi?id=1783458)).
- The old company film is **untagged** (`color_transfer=unknown`), which is a likely cause of colour shifts between browsers.
- Verified in this sandbox: x264 and SVT-AV1 both write `color_transfer=iec61966-2-1` with those flags.
- Check every encode in Safari and Chrome side by side against a PNG frame of the same moment.

### 4.4 Banding in dark gradients: measured
Test: a #4a4438 → #2e2a24 radial gradient with a soft beam, the film's backdrop, 2 s at 1080p30. Frame 30 contrast-stretched 5×
(sheets: `film-test/cmp_x264.png`, `cmp_mix.png`, `cmp_fg.png`). Bitrates are for this near-static test clip only.
| Variant | Result | kbps |
|---|---|---|
| 8-bit source, no dither | visible steps already in the source | – |
| A · x264 CRF 20 tune film | blotchy blocks along the steps | 710 |
| B · + static ±1 LSB dither, aq-mode 3 | dither erased by the encoder, blocks remain | 486 |
| C · + temporal grain ±1.5 LSB, aq-mode 3 | grain erased, blocks remain | 476 |
| G · x264 CRF 14 (no grain) | smooth, faithful to the source steps | 4 357 |
| F · grain ±3 LSB, CRF 18 `tune grain` | **banding hidden**, grain visible on stretch | 4 677 |
| L · grain ±2.5 LSB, CRF 17, aq-mode 3, deblock −2 | **banding hidden** | 6 670 |
| K · 16-bit source + error-diffusion dither → x264 CRF 18 | dither erased, blocks | 705 |
| D · AV1 10-bit CRF 30 from 8-bit source | soft wide contours | 61 |
| J · AV1 10-bit CRF 24 from 16-bit source | cleaner contours | 52 |
| M · AV1 10-bit CRF 30, 16-bit source, `film-grain=8` synthesis | **contours masked**, no bitrate cost | 64 |

Then a realistic clip: a 6 s sub-pixel push-in on the real hero render (`hero1.png`, which already has micro-texture), 1080p30:
| Encode | Size (6 s) | Bitrate | Visual (5× stretch, `cmp_real.png`) |
|---|---|---|---|
| P1 · x264 veryslow CRF 18 tune film | 1.96 MB | 2.61 Mbps | clean; faint blotching only under stretch |
| P2 · P1 + ±2.5 LSB grain, aq-mode 3, deblock −2 | 2.63 MB | 3.51 Mbps | clean, filmic |
| P3 · x264 veryslow CRF 20 tune film | 1.48 MB | 1.97 Mbps | acceptable |
| P4 · SVT-AV1 10-bit preset 4 CRF 28 | 0.53 MB | 0.70 Mbps | clean |
| P6 · VP9 CRF 30 `-b:v 0` | 0.67 MB | 0.90 Mbps | clean |

Conclusions:
1. Invisible dither (±0.5–1.5 LSB) does not survive H.264 at normal CRFs. Do not rely on it.
2. What works for H.264: **texture in the scene**. Give materials and walls micro-texture (plaster, paper, linen normal or roughness maps).
   It also looks more like the flyer photograph, which has natural grain. On top of that, ±2–3 LSB temporal grain with CRF 17–18 and aq-mode 3 or tune grain.
   Cost: about +35% bitrate on real content (P1 → P2).
3. AV1 10-bit is the best quality per bit, about 4× smaller than H.264 here. Feed it a >8-bit source, and test SVT's `film-grain=6–8`
   (grain synthesised at decode) on the darkest shots. Check Safari with hardware AV1: film-grain synthesis is part of AV1 decoding, but verify it there.
4. Design-side: avoid huge, flat, very dark gradients spanning few code values. The BIBLE's "a bit darker but not too dark" stage (#4a4438 midtone) helps.
   #2e2a24 is the darkest value and should be used for dips only, not as a large lit gradient.

### 4.5 Container and codec plan
- **AV1 10-bit in MP4 first, H.264 MP4 fallback.** Skip VP9: AV1 covers the same browsers better, and VP9 was 30% bigger in the test.
  AV1 support: Chrome, Firefox and Edge decode in software. Safari 17+ is "partial": **hardware only** (A17 Pro / M3 and newer)
  ([caniuse AV1](https://caniuse.com/av1), [Bitmovin](https://bitmovin.com/apple-av1-support)), so older Apple devices take the H.264 source.
- Source order and codec strings ([MDN codecs parameter](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/codecs_parameter)):
  ```html
  <source src="/film/nyji-kaflinn-1080.av1.mp4" type='video/mp4; codecs="av01.0.08M.10, mp4a.40.2"'>
  <source src="/film/nyji-kaflinn-1080.h264.mp4" type='video/mp4; codecs="avc1.640028, mp4a.40.2"'>
  ```
  `av01.0.08M.10` = Main profile, level 4.0, Main tier, 10-bit. `avc1.640028` = High profile, level 4.0.
- **Audio:** AAC-LC, 48 kHz stereo, 192 kbps in both files. Inline loops carry **no audio track** (`-an`).
- **Keyframes:** every 2 s (`-g 60`) for quick seeking in the lightbox. `-movflags +faststart` so playback starts before the download finishes.
- **No HLS needed.** Apple serves its films as HLS (`…_16x9.m3u8` on apple.com), but for one 50 s file progressive MP4 with faststart is simpler and fine.

### 4.6 Commands (ffmpeg 6.1.1, as tested)
```bash
TAGS="-colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv"
# H.264 (universal fallback)
ffmpeg -framerate 30 -i frames/f_%05d.png -i score.m4a \
  -vf "zscale=m=709:r=limited:dither=error_diffusion,format=yuv420p" \
  -c:v libx264 -preset veryslow -crf 18 -tune film -x264-params aq-mode=3:aq-strength=0.8 \
  -profile:v high -level:v 4.0 -g 60 -keyint_min 30 -maxrate 6M -bufsize 12M $TAGS \
  -c:a copy -movflags +faststart nyji-kaflinn-1080.h264.mp4
# AV1 10-bit (primary). Use a 16-bit PNG/raw source if available.
ffmpeg -framerate 30 -i frames/f_%05d.png -i score.m4a \
  -vf "zscale=m=709:r=limited:dither=error_diffusion,format=yuv420p10le" \
  -c:v libsvtav1 -preset 4 -crf 28 -g 60 -svtav1-params tune=0 $TAGS \
  -c:a copy -movflags +faststart nyji-kaflinn-1080.av1.mp4
#   optional on dark shots: -svtav1-params tune=0:film-grain=8:film-grain-denoise=0
# Audio: two-pass linear loudness normalisation to -16 LUFS / -1.5 dBTP, then AAC
ffmpeg -i mix.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -   # read measured_* values
ffmpeg -i mix.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true,aresample=48000" \
  -c:a aac -b:a 192k score.m4a
ffmpeg -i score.m4a -af ebur128=peak=true -f null -    # verify: I ≈ -16, TP ≤ -1.5
# Poster = frame 0, two widths, AVIF/WebP + JPEG fallback
ffmpeg -i frames/f_00000.png -vf scale=1920:-1 -q:v 3 poster-1920.jpg   # plus avif/webp via sharp or avifenc
```
`tune=0` = SVT-AV1 "VQ" (visual quality) tuning (verified: the log prints "tune VQ"). Its default is PSNR.
x264 picks level 5.0 if `-level` is not given. Pin 4.0 so it matches `avc1.640028`.

### 4.7 Size targets (expected from the measurements; real CG adds detail, so plan with margin)
| Deliverable | H.264 | AV1 10-bit |
|---|---|---|
| Film 1920×1080, 53 s | 2.5–4.5 Mbps → **17–30 MB** (cap `-maxrate 6M`) | 0.7–1.5 Mbps → **5–10 MB** |
| Film 1080×1080, 53 s (56% of the pixels) | 1.5–2.8 Mbps → 10–19 MB | 0.4–0.9 Mbps → 3–6 MB |
| Inline loop 1920×1080, 8 s, no audio (CRF 20) | 1.5–3 MB | 0.5–1 MB |
| Inline loop 1080×1080, 8 s | 1–2 MB | 0.3–0.7 MB |
| Poster 1920 (AVIF / JPEG q≈80) | – | 60–120 KB / 150–250 KB |
- 1080×1080 (or 1080×1350, 4:5) is a **re-render**, not a crop. Set the three.js camera for a square aspect, and re-break type and corner labels.
  On a 390 px wide phone a 16:9 film is 390×219, while a square is 390×390, 78% more picture.
- Choose the 16:9 or square source in JS with `matchMedia('(orientation: portrait) and (max-width: 700px)')` before setting `src`.
  `<source media>` inside `<video>` is back in the spec and in newer Firefox, but Chromium support is unclear in my sources
  ([MDN BCD via Chromium mirror](https://chromium.googlesource.com/external/github.com/mdn/browser-compat-data/+/HEAD/html/elements/source.json),
  [Firefox bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1513109)), so don't rely on it.

---

## 5. On-site presentation

### 5.1 Two modes, following Apple's pattern (checked in apple.com markup)
I inspected the AirPods Pro page HTML (downloaded in `research/dl/apple/page.html`; live page: [apple.com/airpods-pro](https://www.apple.com/airpods-pro/)):
- Inline animations sit in `inline-media-component-container` with a start-frame poster (`hero_startframe…jpg`) and a small
  `<button class="play-pause-button">`. Its `aria-label` changes with state: `data-aria-playing="Pause animation of …"`,
  `data-aria-paused="Play animation of …"`, `data-aria-ended="Replay animation of …"`. The label describes what the animation shows.
- The full film opens from a text link, *"Watch the film"* with a play-circle icon after it (`data-films-modal-link`, `role="button"`),
  into a modal player.

For Svif:
1. **Inline loops** (story scenes rendered as video only where the live three.js scene is not used, e.g. mobile fallback or
   section cards): `autoplay muted playsinline loop`, no audio track, `preload="none"` until near the viewport, a 36 px hairline
   play/pause button in the bottom-right corner (44×44 hit area). Use state labels in Icelandic: "Spila hreyfimynd: …" /
   "Stöðva hreyfimynd: …". WCAG 2.2.2 requires a pause control for motion that starts automatically and lasts over 5 s
   ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). The BIBLE bans replay buttons for site animations,
   so loops simply loop.
2. **The film**: a "Horfa á myndbandið" hairline text link (BIBLE §6) with a small play glyph. It opens a lightbox and plays **with sound**.
   The click is the user activation that browsers require for sound ([Chrome autoplay](https://developer.chrome.com/blog/autoplay)).

### 5.2 Autoplay facts to design around
- Chrome: *"Muted autoplay is always allowed."* Sound needs an interaction (or desktop MEI). *"Don't ever assume a video will play"*: check the
  `play()` promise and show a play control on rejection ([Chrome](https://developer.chrome.com/blog/autoplay)).
- iOS WebKit: muted or audio-less video may autoplay. It starts only when visible and pauses when scrolled off-screen. Unmuting without a gesture pauses it.
  `playsinline` prevents fullscreen on iPhone. `display:none` videos need a gesture ([WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/)).
  iOS Low Power Mode blocks even muted inline autoplay; `play()` rejects with `NotAllowedError`
  ([WebKit bug 216887](https://bugs.webkit.org/show_bug.cgi?id=216887), [bug 219889](https://bugs.webkit.org/show_bug.cgi?id=219889)).
  So **the poster must be a finished, beautiful frame**, and the play button must be visible whenever the video is not playing.
- iOS: `video.volume` is user-controlled and not settable from JS ([Apple: iOS-specific considerations](https://developer.apple.com/library/safari/documentation/audiovideo/conceptual/using_html5_audio_video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)).
  To fade audio out on close, route through Web Audio (`createMediaElementSource` → `GainNode`, same-origin file), or just pause during the visual fade.

### 5.3 Lightbox behaviour (the film's "stage")
- `<dialog>` with `showModal()`: focus moves inside, Esc closes, focus returns to the link. Call `lenis.stop()` on open and `lenis.start()` on close (BIBLE §2).
  Pause every inline loop while it is open.
- **Open (1.0–1.2 s total):** the backdrop fades to stageDeep #2e2a24 at 0.94 over 600 ms (`breathe`). The film frame grows from the
  link's poster thumbnail rect to its final rect (FLIP, 1000 ms, `arrive`). The poster is visible throughout. `play()` is called **inside the click handler**,
  and the poster crossfades to video only once the first frame is presented (§5.4). This is the site's curtain vocabulary at a larger scale.
- **Frame:** max 1280 px wide (or `min(88vw, 150vh)`) for 16:9, centred, with a 1 px cream hairline frame at 24 px inset (the flyer frame)
  and corner labels in tracked caps: `NÝJI KAFLINN` top-left, `00:53` top-right.
- **Controls in flyer style:** no browser chrome (`controls` removed when JS runs; keep it as the no-JS fallback).
  - bottom-left: `SPILA` / `HLÉ` (play/pause), `HLJÓÐ` / `ÞÖGN` (mute), `TEXTI` (captions toggle). Jost 400, 11–12 px, 0.24 em tracking,
    cream at 72% opacity, 100% on hover/focus, 200 ms.
  - progress: a 1 px hairline across the bottom of the frame that draws with playback. It can be scrubbed by click, drag or arrow keys (±5 s),
    and its hit area is 24 px tall.
  - time in tabular figures, top-right corner label.
  - auto-hide after 2.5 s without pointer movement (opacity 600 ms). Always visible when paused, focused, or for reduced-motion users.
  - keys: Space/K play-pause, M mute, C captions, ←/→ seek, Esc close. Every control is a real `<button>` with an `aria-label`
    ([W3C ACT on custom controls](https://w3.org/WAI/standards-guidelines/act/rules/4c31df/proposed)).
- **End:** on `ended`, hold the end card (the film already holds ≥ 4 s). Show a "Bóka pláss" CTA under the frame, faded in with the site's block
  reveal (800 ms, 16 px rise). Do not auto-close.
- **Close:** fade video and backdrop out (400 ms, `leave`), FLIP back to the thumbnail. Reset to the poster.

### 5.4 Fade in from the poster so it matches the page reveal
- The film block on the page reveals with the same **curtain** as images: clip-path wipe 1200 ms (`curtain`) with an inner scale 1.08 → 1
  over 1600 ms (`arrive`) (BIBLE §2). The poster is what is revealed. Any inline video starts only **after** the reveal completes,
  so two motions never overlap.
- Poster = exact frame 0. The film holds frame 0 still for ≥ 0.5 s. So when the video replaces the poster, nothing jumps.
- Crossfade poster → video (500 ms, `breathe`) only when a frame is really on screen. Use `video.requestVideoFrameCallback()` (Chrome 83+,
  **Safari 15.4+, Firefox 132+**, [caniuse](https://caniuse.com/mdn-api_htmlvideoelement_requestvideoframecallback)),
  falling back to the `playing` event plus two `requestAnimationFrame`s. This prevents the black or empty flash Safari shows when a video element starts.
- Keep the poster as an `<img>` layered over the `<video>` (not only the `poster` attribute), so it can use AVIF and `srcset` and can be faded.
  If the poster is the LCP element, preload it with `fetchpriority="high"` and do not lazy-load it
  ([web.dev](https://web.dev/articles/lazy-loading-video)).
- The film's own internal motion uses the same easing family (`arrive` for things landing, `glide` for camera, `breathe` for dissolves),
  so the page and the film move alike. That consistency is what makes the video "match the website".

### 5.5 Lazy loading and performance
- `preload="none"` plus the poster `<img loading="lazy">` everywhere except the first screen. IntersectionObserver with
  `rootMargin: "300px 0px"` switches `preload` to `metadata`. Inline loops play at ≥ 50% visibility and pause when out of view
  ([web.dev lazy-loading video](https://web.dev/articles/lazy-loading-video)).
- The film file is never fetched until the lightbox opens (except `metadata` on link hover/focus, to warm up).
- No autoplay when `prefers-reduced-motion: reduce` or `navigator.connection?.saveData` is set. Show the poster and play button only.
- One playing video at a time. `disablepictureinpicture` and `controlslist="nodownload"` are optional.

### 5.6 Accessibility (text alternative and captions)
- The film has music and on-screen text but no speech. Under WCAG it is synchronized media (it has an audio track, so it is not "video-only",
  [W3C 1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html)).
  - **1.2.3 (A):** give a **media alternative**: a short visible "Texti myndbandsins" disclosure under the link or in the lightbox,
    with the cards in order and one sentence of description per step (e.g. "Sex hlutir rísa: tryggingar, málning, …").
  - **Captions (1.2.2):** a WebVTT track `<track kind="captions" srclang="is" label="Íslenska">` with the card texts timed to the
    film, plus a single `[Róleg píanótónlist]` at the start. It costs little and is useful for sound-off viewers.
- `<video aria-label="Myndband: Nýji kaflinn, 53 sekúndur">`. The dialog gets `aria-labelledby` pointing to a visually hidden title.
- No audio ever starts without a click (1.4.2).
- Flashing: none (dissolves and light wipes are slow, far below 3 flashes per second).

---

## 6. Changes to make in the BIBLE (for the lead)
1. §4c frame rate 25 → **30 fps**, with 180° accumulated motion blur + SSAA jitter (§1.4).
2. §4c loudness −14 → **−16 LUFS, −1.5 dBTP, LRA 5–8**, two-pass linear (§3.4).
3. Add the beat grid (72 BPM ↔ 25 frames) and "author the timeline in beats" (§1.2).
4. Add colour tagging `-color_trc iec61966-2-1` and AV1 10-bit primary + H.264 fallback (§4).
5. Add "materials carry micro-texture + ±2.5 LSB temporal grain in the final pass" to the 3D look (§4.4).
6. Type minimums for film (§2.1); ≤ 5 words per 2-bar card.

---

## Sources
Pacing and craft
- [Luxury Video Production: The Discipline of Restraint](https://videoproductionresort.com/luxury-video-production/)
- [Video editing: pacing, transitions and motion graphics (lueurexterne)](https://blog.lueurexterne.com/en/blog/video-editing-pacing-transitions-and-professional-motion-graphics/)
- [Slow cutting (Wikipedia)](https://en.wikipedia.org/wiki/Slow_cutting)
- [MacLachlan & Logan, Camera Shot Length in TV Commercials (WARC)](https://www.warc.com/Content/421e1376-baa5-472f-aa9d-adc58bea5146)
- [RED: camera panning speed (7-second rule)](https://www.red.com/red-101/camera-panning-speed)
- [180-degree shutter rule (StudioBinder)](https://www.studiobinder.com/blog/what-is-the-180-degree-shutter-rule/) · [Otoy forum on CG shutter](https://render.otoy.com/forum/viewtopic.php?p=200052)
- [Judder (forasoft)](https://www.forasoft.com/learn/video-encoding/glossary/terms/judder) · [DVinfo: what is judder](https://dvinfo.net/forum/archive/index.php/t-124261.html)
- [Match cut definition and types (FilmDaft)](https://filmdaft.com/match-cut-definition/)
- [Why explainer videos fail (DesignRush)](https://www.designrush.com/best-designs/video/trends/why-explainer-videos-fail) · [Hatch Studios: explainer mistakes](https://hatchstudios.com/?p=12784)
- [Apple-style product video technique (Manfrotto)](https://www.manfrotto.com/global-en/stories/how-to-shoot-cinematic-tech-videos-like-apple/)
Reading time and typography
- [SSW: give enough time to read texts (read twice at 200 wpm)](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos)
- [BBC subtitling guidelines summary](https://clevercast.com/bbc-subtitling-guidelines) · [Subtitle reading speed CPS/WPM](https://subtitle-toolset.pages.dev/guides/subtitle-reading-speed/)
- [Netflix Timed Text Style Guide: general requirements](https://backlothelp.netflix.com/hc/en-us/articles/215758617)
- [SMPTE ST 2046-1:2009](https://pub.smpte.org/doc/st2046-1/20091123-pub/st2046-1-2009.pdf) · [NAB summary](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf)
- [VideoHelp: thin text and chroma subsampling](https://forum.videohelp.com/showthread.php?p=2234065) · [stroke width thread](https://forum.videohelp.com/showthread.php?p=2076405)
- [Kinetic typography for brand video (moonb)](https://www.moonb.io/blog/kinetic-typography) · [Text animation for readability (cursa)](https://cursa.app/en/page/text-animation-for-readability-kinetic-type-without-overcomplication)
Sound
- [AES TD1008 explained (Production Advice)](https://productionadvice.co.uk/td1008/) · [AES TD1004 (Production Expert)](https://www.production-expert.com/home-page/2015/11/17/aes-release-recommendations-for-loudness-of-audio-streaming-and-network-file-playback)
- [LUFS and platform targets (LANDR)](https://blog.landr.com/lufs-loudness-metering)
- [ITU-R BT.1359](https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1359-1-199811-I!!MSW-E.doc) · [Audio-to-video synchronization (Wikipedia)](https://en.wikipedia.org/wiki/Audio-to-video_synchronization)
- [Defining hit points (Scoring to Picture in Logic Pro)](https://subscription.packtpub.com/book/business-and-other/9781837636891/8/ch08lvl1sec39/defining-hit-points) · [Mickey mousing (StudioBinder)](https://www.studiobinder.com/blog/mickey-mousing/) · [soft vs hard sync](https://www.thepromptindex.com/skill/1428-film-scoring)
- [Felt piano (Pianoo)](https://pianoo.com/felt-piano-a-softer-piano-sound) · [NI Noire](https://www.sweetwater.com/store/detail/NINoire--native-instruments-noire-nils-frahm-grand-piano-software-instrument) · [Nils Frahm, Felt review](https://headphonecommute.com/2012/03/09/nils-frahm-felt-erased-tapes/)
- [Tempo and brand perception (advids)](https://advids.co/insights/the-psychology-of-music-how-tempo-impacts-viewer-engagement-and-perception-of-your-brand)
Encoding
- [ASWF: Color metadata and web color preservation](https://academysoftwarefoundation.github.io/EncodingGuidelines/WebColorPreservation.html) · [Mozilla bug 1783458](https://bugzilla.mozilla.org/show_bug.cgi?id=1783458)
- [x264 settings guide (silentaperture)](https://silentaperture.gitlab.io/mdbook-guide/encoding/x264.html) · [JET x264 params](https://jaded-encoding-thaumaturgy.github.io/JET-guide/encoding/x264params)
- [MDN: codecs parameter](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/codecs_parameter)
- [caniuse: AV1](https://caniuse.com/av1) · [Bitmovin: Apple AV1 support](https://bitmovin.com/apple-av1-support)
Presentation and accessibility
- [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay) · [WebKit: new video policies for iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/) · [WebKit bug 216887 (Low Power Mode)](https://bugs.webkit.org/show_bug.cgi?id=216887)
- [web.dev: lazy-loading video](https://web.dev/articles/lazy-loading-video) · [caniuse: requestVideoFrameCallback](https://caniuse.com/mdn-api_htmlvideoelement_requestvideoframecallback) · [web.dev: rVFC](https://web.dev/articles/requestvideoframecallback-rvfc)
- [Apple iOS-specific media considerations (volume)](https://developer.apple.com/library/safari/documentation/audiovideo/conceptual/using_html5_audio_video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)
- [W3C: Understanding 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) · [W3C: Understanding 1.2.1](https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html) · [W3C ACT: autoplay control mechanism](https://w3.org/WAI/standards-guidelines/act/rules/4c31df/proposed)
- [Apple AirPods Pro page (inline media and "Watch the film" pattern)](https://www.apple.com/airpods-pro/)
