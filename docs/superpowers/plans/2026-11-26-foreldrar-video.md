# SVIF Foreldrar explainer video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `video/foreldrar/out/svif-foreldrar.mp4` (1920×1080, 30 fps, ~2:30, with music) following the approved storyboard.

**Architecture:** A deterministic three.js scene (`renderAt(t)`) runs in headless Chromium. Each frame the 3D canvas
(rendered below full HD, upscaled) and a full-HD 2D overlay (HUD + headlines) are composited in the page and
returned as JPEG to a Node driver that pipes them into ffmpeg; audio is muxed at the end.

**Tech Stack:** three.js, Playwright (preinstalled Chromium), ffmpeg, ElevenLabs music API.

**Spec:** `docs/superpowers/specs/2026-11-26-foreldrar-video-design.md`

## Global Constraints
- Icelandic on-screen text; no real company names; made-up kennitala; discounts are examples.
- Every object animates in from 0 (scale/extrude/draw/type); no pop-ins, no hard cuts.
- Scene changes on bar lines of the music grid (110 BPM → 1 bar = 2.1818 s).
- Palette: white clay, navy text #14183a, blue #3b5bdb, baby pink #f2a7c3, light bg #eef0f6.

## Review Focus
- A frame at any t (including scene boundaries) renders without throwing: `node render.mjs --check` samples every 0.5 s.
- Text never overlaps the 3D focal object: contact sheet review per scene.
- Folding tiles never intersect each other (fold axis offsets by stack thickness): frame review of scene 3.
- Icelandic glyphs (þ, ð, æ, ö, á) render in the chosen font: overlay test frame.
- Audio and video lengths match: ffprobe both streams.

---

### Task 1: Engine + driver
**Files:** Create `video/foreldrar/{package.json,index.html,src/engine.js,src/overlay.js,render.mjs}`
- [ ] three.js clay look (env light + soft shadow + ground contact shadow), `window.renderAt(t) -> dataURL`.
- [ ] `render.mjs --from a --to b --out file.mp4`, `--still t` writes a PNG; measure s/frame.
- [ ] Commit.

### Task 2: Music
- [ ] Generate ~155 s track via ElevenLabs; detect tempo/first downbeat (`ffmpeg` onset analysis); save `audio/music.mp3`, `src/beat.js` exports `BPM`, `OFFSET`.

### Task 3: Scenes 1–3 (figure, tiles, fold → booklet) `src/scenes/intro.js`, `src/scenes/fold.js`
### Task 4: Scenes 4–5 (booklet open with offers, who orders, order form) `src/scenes/booklet.js`, `src/scenes/order.js`
### Task 5: Scenes 6–8 (burst transitions, print/assemble/deliver, free card, end card) `src/scenes/free.js`
Each scene task: stills at key times → review → fix → commit.

### Task 6: Full render + mux + review
- [ ] Render in parallel chunks, concat, mux audio, contact sheet review, deliver.
