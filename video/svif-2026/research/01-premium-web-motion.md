# 01 — Premium web motion: research and implementable motion spec for svif.is

Scope: what makes website motion read as expensive (Apple product pages, luxury houses, Scandinavian interior/architecture studios, award-winning studio sites) versus cheap / "AI slop", turned into a spec an engineer can build on this repo (TanStack Start + React 19 + Tailwind v4, `framer-motion@12.43.0`, `lenis@1.3.26`, `three@0.186.1`) without more research.

Every library API below was checked against the installed source in `svif/node_modules` (file + line given where it matters). Numbers marked **measured** were read directly from the live CSS/JS of the named sites on 2026-11-09; everything else is either a cited guideline or my recommendation (marked **spec**).

---

## 0. The short version

1. **Luxury motion is quiet, slow to arrive, quick to answer.** Content reveals are long (0.8–1.4 s) and decelerate hard so they look settled within ~300 ms; UI feedback (hover, press, menus) is short (100–300 ms). Never the other way round.
2. **One brand curve family.** Real luxury sites use one strong ease-out for almost everything: B&O, Hermès and Vipp use `cubic-bezier(0.165,0.84,0.44,1)` (ease-out-quart); Aman's design-system token is `cubic-bezier(0.19,1,0.22,1)` (ease-out-expo); Locomotive uses `cubic-bezier(0.215,0.61,0.355,1)` (ease-out-cubic) **measured**. No bounce, no overshoot on content.
3. **Masks, not slides.** Headlines rise out of a clipped line box; images open behind a clip-path curtain while the picture inside settles from scale 1.08 → 1; hairlines draw with `scaleX`. Things are *uncovered*, they don't fly in from the side.
4. **Hierarchy in time.** One primary thing moves, then the next. Eyebrow → heading lines → accent word → body → (CTA never animates in). Stagger only true sequences; cap any group at ~0.5 s of total stagger.
5. **Scroll drives the story, time drives the polish.** Pinned stages scrub on desktop with damping and "dwell" zones; on touch they switch to step-triggered, time-based transitions. Smooth wheel via Lenis (`lerp ≈ 0.09`), native touch.
6. **3D-ish = long lens, light and depth, not spinning.** Small tilts (≤ 10°), perspective 1400–2000 px (or FOV 25–35° in three.js), soft contact shadows, the flyer's diagonal sunbeam sweeping across surfaces. No turntables, no idle bobbing at ~0.2 Hz.
7. **Reduced motion still looks designed**: cross-fades (opacity only, 400 ms), end-frames of every scene, posters instead of autoplay video, Lenis smoothing off (Lenis does this by default).

---

## 1. Evidence: what premium sites actually ship

### 1.1 Measured from live sites (computed from their production CSS/JS)

| Site | What | Value |
|---|---|---|
| Apple AirPods Pro page — `StaggeredFadeIn` component ([CSS](https://www.apple.com/v/airpods-pro/t/built/styles/overview.built.css), [JS](https://www.apple.com/v/airpods-pro/t/built/scripts/overview/main.built.js)) | rise distance / translate duration / opacity duration / per-item delay / easing | `--staggered-translate-y: 30px`, `0.7 s`, `0.9 s`, `0.15 s`, `easeFunction: "easeInOutQuad"` for both y and opacity |
| Apple AirPods Pro page — content offset tokens | enter / exit | y `24px`; enter 420 ms (opacity + transform), exit 300 ms transform / 200 ms opacity, label delay 200 ms |
| Apple AirPods Pro page | stagger tokens | `--aap-stagger-fast: 50` ms, `--aap-stagger-slow: 200` ms |
| Apple AirPods Pro page | will-change hygiene | `.staggered-start [data-staggered-item]{will-change:opacity,transform}` then `.staggered-end ...{will-change:auto}` — set only while animating |
| Apple AirPods Pro page | reduced motion | `html.reduced-motion` forces `opacity:1`, `transform:none`, hides inline `<video>` and shows the still `<picture>` |
| Apple AirPods Pro page | reveal trigger | `data-anim-keyframe='{"start":"t - 70vh","cssClass":"animate"}'` = add the class when the element's top reaches 70 % of the viewport height |
| Apple AirPods Pro page — product viewer | scroll-scrubbed "card grows to full bleed" | `clip-path: inset(0 calc(var(--clip-path-progress)*6.25vw) ... round calc(var(--clip-path-progress)*var(--radius)))`, keyframe `--clip-path-progress: [1,0]` from `t - (70vh + navH)` to fully in view, `ease: .3` (scroll smoothing). Disabled at small breakpoint. |
| Apple Vision Pro page | parallax amount | `"y": ["0", "max(-10h, -10vh)"]` from `t - 100vh` to `b - 40vh` → about −10 % of element height across its whole trip through the viewport |
| Apple product JS | programmatic moves | default `easeInOutCubic`; if interrupting a running tween `easeOutQuint`; touch `easeOutCubic`; small UI scale-out `easeOutQuart` 0.3 s |
| Apple global nav ([CSS](https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css)) | easing | `cubic-bezier(.4,0,.6,1)` ×78, `cubic-bezier(.25,.1,.3,1)` ×13 |
| Apple AirPods Max page | where overshoot is used | `cubic-bezier(0.3,2,0.5,1)` — **only** on tiny colour-swatch controls, never on content |
| Bang & Olufsen ([home](https://www.bang-olufsen.com/en/dk)) | default curve | `cubic-bezier(0.165,0.84,0.44,1)` ×73: `transform 400ms`, `color 200ms`, `width 400ms` |
| Bang & Olufsen | hairline underline draw | `::after{height:1.5px; transform:scaleX(0); transition: transform 0.735s cubic-bezier(0.625,0.05,0,1)}` |
| Hermès ([CSS](https://www.hermes.com/us/en/)) | curves | `(.165,.84,.44,1)`, `(.215,.61,.355,1)`, `opacity .4s cubic-bezier(.25,.8,.25,1)` |
| Aman ([home](https://www.aman.com/)) | system easing token | `--gin-easing: cubic-bezier(0.19,1,0.22,1)` (used even on 150 ms colour changes); also `(0.23,1,0.32,1)` |
| Locomotive (studio behind many luxury sites) ([home](https://locomotive.ca/en)) | curves / durations | `cubic-bezier(0.215,0.61,0.355,1)` ×46 (transform .15–.3 s), `opacity .9s` same curve, `cubic-bezier(0.23,1,0.32,1)` ×9 |
| Minotti ([home](https://www.minotti.com/en)) | big moves | sliders `1s`–`1.2s cubic-bezier(.7,0,.3,1)`; fades `opacity .5s`–`.7s` |
| Vipp ([home](https://vipp.com/en-us)) | curves | `(.165,.84,.44,1)`, `(.4,0,.6,1)` |
| Norm Architects ([home](https://normcph.com/)) | restraint | essentially `ease-in-out .3s` and one `1.5s ease-in-out` |
| Luxury jewellery houses ([Peretz study](https://peretz.agency/blog/luxury-jewellery-website-design)) | button transitions | Van Cleef & Arpels 0 s, Bulgari 0.2 s, Tiffany 0.4 s, Cartier 0.5 s; longest reveal found: VCA 0.5 s product-image fade |

**Read-out.** (a) Luxury brands are not "more animated" — they animate *less*, with one strong ease-out family and very few properties. (b) Apple's content reveals are slow and gentle (0.7–0.9 s, in-out quad, 24–30 px) with 150 ms stagger, gated on JS, and stripped to opacity under reduced motion. (c) Big gestures (full-bleed media, chapter jumps) are scroll-scrubbed or in-out curves. (d) Hairline draws are a real luxury vocabulary item (B&O).

### 1.2 Guidelines that matter

- Apple HIG — Motion: "Add motion purposefully, supporting the experience without overshadowing it… Gratuitous or excessive animation can distract people"; "Let people cancel motion"; "Avoid showing objects that oscillate in a sustained way… frequency of around 0.2 Hz"; "Consider using fades when you need to relocate an object." ([HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion))
- Material 3 tokens ([MDC Android Motion docs](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)): emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)` for entering, emphasized-accelerate `(0.3,0,0.8,0.15)` for exiting; durations 50 → 1000 ms; "duration should increase as the area/traversal of an animation increases."
- Microsoft Fluent ([Timing and easing](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing)): entering `cubic-bezier(0,0,0,1)` ("met with extreme friction"), exiting `cubic-bezier(1,0,1,1)`.
- NN/g ([Animation duration](https://www.nngroup.com/articles/animation-duration/)): UI feedback ~100 ms; modals 200–300 ms; "At 500ms, animations start to feel like a real drag"; exits shorter than entrances (300 ms in / 200–250 ms out). Applies to **interaction feedback**, not to non-blocking editorial reveals.
- Emil Kowalski ([Great animations](https://emilkowal.ski/ui/great-animations), [clip-path](https://emilkowal.ski/ui/the-magic-of-clip-path)): ease-out by default; UI < 300 ms; never animate keyboard-initiated actions; interruptibility; image reveal `inset(0 0 100% 0) → inset(0)` 1 s `cubic-bezier(0.77,0,0.175,1)`.
- Motion "slop" critiques ([Sailop: Motion slop](https://sailop.com/blog/motion-slop-fade-in-up-scroll-animation-2026), [925studios](https://www.925studios.co/blog/ai-slop-web-design-guide), [avoid-ai-design](https://github.com/funboy322/avoid-ai-design)): identical 16 px/500 ms fade-up on everything, linear `index * 0.1` stagger, one curve for all, count-up stats, bounce easing, content hidden behind JS, no reduced-motion.
- GSAP SplitText masks ([docs](https://gsap.com/docs/v3/Plugins/SplitText/masks)): lines wrapped in `overflow: clip`, `yPercent: 100`, `duration 0.6`, `stagger 0.1`, `ease "expo.out"` — the canonical "luxury heading" reveal (we implement the same without GSAP).
- Performance ([web.dev animations guide](https://web.dev/articles/animations-guide), [Motion performance tier list](https://motion.dev/blog/web-animation-performance-tier-list)): animate `transform`/`opacity`; `will-change` sparingly and remove after; blur cost scales with radius × area ("90% of performance issues are just a big `filter: blur`"); animating inherited CSS variables can force style recalc across the tree.
- WCAG 2.3.3 ([Understanding](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)): parallax is named as non-essential motion; must be disable-able; respect `prefers-reduced-motion`.
- Scrollytelling ([Pudding: responsive scrollytelling](https://pudding.cool/process/responsive-scrollytelling/), [sticky](https://pudding.cool/process/scrollytelling-sticky/)): pin with CSS `position: sticky`; avoid `vh` jumps on mobile; "short and sweet"; never steppers/swipe that override scroll.
- Apple-style frame scrubbing ([CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)): canvas + preloaded frames + sticky; Apple serves a still to mobile/slow connections; `<video>` currentTime scrubbing lags.
- Lenis ([README in node_modules](../svif/node_modules/lenis/README.md), [Lunardi 2025](https://www.edoardolunardi.dev/blog/building-smooth-scroll-in-2025-with-lenis)): runs on native scroll so sticky/anchors/a11y work; "no reason to enable smooth scroll on mobile or touch devices"; Safari capped at 60 fps.

---

## 2. Motion tokens (spec)

Put these in `src/styles.css` (`:root`) and mirror them in a new `src/components/motion/tokens.ts`. **Every** animation on the site must use one of these; no inline cubic-beziers anywhere else.

### 2.1 Easing — six named curves

| Token | cubic-bezier | Family | Use for | Never for |
|---|---|---|---|---|
| `--ease-arrive` | `0.19, 1, 0.22, 1` | ease-out-expo (Aman's token) | masked heading lines, image/clip reveals, depth settle, digit roll, anything that *enters* and is ≥ 0.8 s | hover, exits |
| `--ease-settle` | `0.165, 0.84, 0.44, 1` | ease-out-quart (B&O, Hermès, Vipp) | paragraph/card rises, UI transforms (menus opening, lightbox in), hover moves, arrows | long curtains |
| `--ease-glide` | `0.65, 0, 0.35, 1` | ease-in-out-cubic (Apple chapter nav) | hairline draws, state-to-state moves of something already on screen, anchor scrolls, 3D camera moves between poses, text-step cross-fades | first entrance of text |
| `--ease-curtain` | `0.76, 0, 0.24, 1` | ease-in-out-quart (Emil's clip reveal, Minotti/B&O big panels) | full-screen menu, section curtains, page-transition wipes | small elements |
| `--ease-breathe` | `0.45, 0, 0.55, 1` | ease-in-out-quad (Apple StaggeredFadeIn) | opacity-only cross-fades, light sweeps, reduced-motion fades, video poster → video | movement > 40 px |
| `--ease-leave` | `0.5, 0, 0.75, 0` | ease-in-quart | exits (always shorter: 200–350 ms) | entrances |
| `linear` | — | — | values scrubbed by scroll (the scroll *is* the easing), video time, marquee | anything time-based that starts/stops |

`tokens.ts`:

```ts
export const EASE = {
  arrive:  [0.19, 1, 0.22, 1],
  settle:  [0.165, 0.84, 0.44, 1],
  glide:   [0.65, 0, 0.35, 1],
  curtain: [0.76, 0, 0.24, 1],
  breathe: [0.45, 0, 0.55, 1],
  leave:   [0.5, 0, 0.75, 0],
} as const;
// JS easing functions for rAF / three.js code (framer-motion re-exports motion-utils):
import { cubicBezier } from "framer-motion"; // motion-utils/dist/index.d.ts:96
export const easeFn = Object.fromEntries(
  Object.entries(EASE).map(([k, v]) => [k, cubicBezier(...(v as unknown as [number, number, number, number]))]),
) as Record<keyof typeof EASE, (t: number) => number>;
```

Note the existing `EASE = [0.22, 1, 0.36, 1]` in `playback.ts` (ease-out-quint) sits between `arrive` and `settle`; replace it with the named tokens.

### 2.2 Durations

Two regimes. **Editorial reveals** never block input, so they can be long; **interaction feedback** must be short (NN/g, Emil).

| Thing | Duration | Curve |
|---|---|---|
| Eyebrow / corner label (opacity only) | 600 ms | breathe |
| Heading line (mask rise) | 1000 ms per line (H1 hero: 1200 ms) | arrive |
| Serif-italic accent word | 900 ms, starts 150 ms after last heading line starts | arrive |
| Paragraph / card block (fade + rise) | opacity 900 ms, transform 1000 ms | settle (opacity: breathe) |
| Image / video frame curtain (clip-path) | 1300 ms | curtain |
| Image inside curtain (scale 1.08 → 1) | 1800 ms, same start | arrive |
| Hairline draw (≤ 600 px) | 900 ms | glide |
| Hairline draw (full-width / frame) | 1200–1400 ms | glide |
| Digit roll / number settle | 1100 ms, 60 ms per digit column | arrive |
| Depth settle (3D tilt-in, time-based) | 1400 ms | arrive |
| Text-step swap in pinned stage | out 280 ms (leave) + in 700 ms (settle), 120 ms overlap gap | — |
| 3D camera move between step poses (time-based mode) | 1400–1800 ms | glide |
| Light sweep across a surface | 2200 ms | breathe |
| Hover colour / underline / bg | 250 ms (B&O: 200 ms) | settle |
| Hover image zoom (1 → 1.035) | in 1200 ms, out 800 ms | settle |
| Button press | down 100 ms, up 250 ms | settle |
| Menu / overlay open | 700 ms | curtain |
| Menu / overlay close | 400 ms | leave |
| Lightbox in / out | 600 ms / 300 ms | arrive / leave |
| Accordion open / close | 500 ms / 350 ms | settle / leave |
| Header hide / show | 500 ms / 400 ms | settle |
| Route change (view transition) | old 300 ms fade (leave) / new 600 ms fade + 12 px (settle) | — |
| Anchor scroll (Lenis) | `clamp(0.9 s, distance / 2200 px/s, 1.6 s)` | glide |

Rule: a whole section's entrance choreography finishes within **1.8 s** of its trigger. Nothing in the viewport may still be "arriving" 2 s after the user stopped scrolling.

### 2.3 Distances (rise / travel)

| Element | Desktop | Mobile (< 768 px) |
|---|---|---|
| Heading line | `yPercent 105` inside its mask (it travels exactly its own height) | same |
| Paragraph / label | 16 px | 12 px |
| Card / block / form | 28 px (Apple: 24–30 px) | 20 px |
| Large media (≥ 50 % viewport) | no translate — use curtain + inner scale 1.08 → 1 | inner scale 1.06 → 1 |
| 3D depth settle | `translateY 48px`, `rotateX 9° → 0`, `scale 0.965 → 1`, `perspective 1600px` | `translateY 32px`, `rotateX 6°` |
| Exit (rare) | −8 px | −6 px |
| Horizontal travel | **never** for entrances (no left/right slide-ins) | — |

### 2.4 Stagger

| Sequence | Step | Cap on total |
|---|---|---|
| Heading lines | 90 ms | 3 lines → 180 ms |
| Words (word-mask variant) | 45 ms | 450 ms |
| Numbered steps / true sequences (01–05) | 150 ms (Apple tiles) | 600 ms |
| Grid of equal items (cards, partner logos) | **no stagger** — the group fades together, or 50 ms "fast" stagger max (Apple) | 250 ms |
| Diagram callouts inside a scene | 220 ms, in pairs | 900 ms |

If a group would exceed its cap, reveal it as one unit. Never `delay = i * 110` on unrelated items (that is literally what `index.tsx` does today: `delay={i * 110}`, `80/160/240/320`).

### 2.5 Blur — almost never

- No blur-to-sharp on text (reads as 2023 AI landing page, and Safari/iOS animates `filter: blur` poorly: [Motion tier list](https://motion.dev/blog/web-animation-performance-tier-list), [WebKit bug 219729](https://bugs.webkit.org/show_bug.cgi?id=219729)).
- Allowed in exactly one place: the brochure's contact shadow (static `filter: blur` on a small ellipse whose `opacity`/`scale` animate — never animate the blur radius).
- Depth-of-field in three.js renders is fine (it's in the render, not a CSS filter).

### 2.6 Springs — no, with one exception

- Content reveals, sections, text, images: **no springs, no overshoot**. Overshoot = playful (Apple only uses `cubic-bezier(0.3,2,0.5,1)` on tiny colour swatches).
- Exception: direct manipulation (dragging a brochure page, a before/after slider) may use a critically damped spring so it carries momentum: framer-motion `{ type: "spring", visualDuration: 0.5, bounce: 0 }` (`visualDuration`/`bounce` verified in `motion-dom/dist/index.d.ts:2023,2035`).
- Interrupted tweens retarget from the current value (framer-motion does this automatically; with WAAPI, read the computed value first). Apple swaps to `easeOutQuint` when interrupting — do the same: if a step transition is interrupted, retarget with `settle` instead of `glide`.

---

## 3. Reveal vocabulary (spec)

Each pattern has a single owner component. Pages compose these; they never hand-roll motion.

### 3.0 Trigger, once, and no-JS safety (applies to all reveals)

- **One shared IntersectionObserver** for all reveals (today each `<Reveal>` creates its own observer). `rootMargin: "0px 0px -14% 0px"`, `threshold: 0`. Reveal plays **once**; unobserve after.
- Elements already inside the viewport at hydration are not observed: they join the page-load choreography (hero) or snap to their end state if the page was restored mid-scroll / opened at a hash.
- **Content must be visible without JS** (Apple uses `html.no-js` fallbacks). Add in `__root.tsx` `<head>` before CSS paints: `<script>document.documentElement.classList.add('js')</script>`; hidden initial states are scoped to `.js [data-reveal]:not(.is-in)`. SSR HTML then never ships invisible content, and there is no layout shift (only transform/opacity/clip are animated).
- Wait for fonts before first reveal: `await document.fonts.ready` (Jost / Instrument Serif swapping mid-animation looks cheap). Timeout 600 ms.
- Fast scroll: if an element enters while `lenis.velocity` (px/frame) > 40, shorten its durations ×0.6 so reveals don't trail behind the reader. (`velocity` is public on the Lenis instance, `lenis.d.ts:318`.)

### 3.1 Masked line reveal — every H1/H2 (`<MaskLines>`)

How luxury sites do it: each line sits in a wrapper with `overflow: clip`; the inner line starts at `translateY(105%)` and rises to 0 (GSAP SplitText `mask: "lines"` pattern).

```tsx
// Authored lines — headings here are short, so break them by hand per breakpoint
<MaskLines as="h2" lines={["Nýtt heimili.", "Nýr kafli."]} accent="kaflinn" />
```

CSS:
```css
.mask-line { display:block; overflow: clip; padding-block: 0.18em 0.08em; margin-block: -0.18em -0.08em; }
.mask-line > span { display:block; transform: translateY(105%); }
.is-in .mask-line > span { transform: none; transition: transform 1000ms var(--ease-arrive); }
.is-in .mask-line:nth-child(2) > span { transition-delay: 90ms; } /* 180ms for 3rd */
```
- **Icelandic accents**: uppercase `Á É Í Ó Ú Ý Þ` accents rise above cap height; an unpadded mask clips them ("NÝJI KAFLINN"). The `padding-block-start: 0.18em` + negative margin keeps the accent inside the clip box without changing layout. Test with "ÝÍÁ".
- No opacity on the line itself (the mask *is* the fade). Exception: reduced motion (see §9).
- Accessibility: render the full heading text once for AT (`aria-label` on the heading, line spans `aria-hidden`), or keep real text in the spans and don't split into characters. Never split into per-character spans.
- Prefer authored lines over runtime line-splitting (no font-load dependency, no CLS). For long, fluid headings use a **word-mask** variant (each word in its own clip box, 45 ms stagger) — words don't depend on line layout.
- Serif-italic accent word (Instrument Serif): it arrives last, 150 ms after the last line starts, with the same mask + `arrive` 900 ms. That small delay gives the "signature" feel of the flyer cover.

### 3.2 Paragraph / block fade-up (`<Reveal kind="block">`)

- `opacity 0 → 1` 900 ms `breathe`, `translateY(16px) → 0` 1000 ms `settle`, starts 350 ms after the section's heading starts (it is a *follower*, not a peer).
- Long-form text (FAQ answers, legal, statistics page body) does **not** reveal on scroll.
- CTAs/buttons: no entrance animation (Sailop's fix; the CTA must be clickable on the first frame). They can fade with the paragraph at most.

### 3.3 Image / video / canvas curtain (`<Curtain>`)

```css
.curtain { clip-path: inset(100% 0 0 0); }               /* from bottom edge up */
.curtain > img, .curtain > video { transform: scale(1.08); transform-origin: 50% 60%; }
.is-in.curtain { clip-path: inset(0 0 0 0); transition: clip-path 1300ms var(--ease-curtain); }
.is-in.curtain > img, .is-in.curtain > video { transform: none; transition: transform 1800ms var(--ease-arrive); }
```
- Rounded media: animate `inset(100% 0 0 0 round 1.6rem)` → `inset(0 round 1.6rem)` (keep the round value constant).
- Direction: always bottom → top (the page is moving up; the image is uncovered in the direction of travel). Left→right wipes only for horizontal sequences.
- Do not also fade or translate the frame — the curtain + inner settle is the whole effect.
- clip-path is compositor-capable in modern engines ([Motion tier list](https://motion.dev/blog/web-animation-performance-tier-list)); on older WebKit it repaints but does not relayout ([Emil](https://emilkowal.ski/ui/the-magic-of-clip-path)). Keep curtains to ≤ 2 simultaneously.

### 3.4 Apple "grows to full-bleed" (scroll-scrubbed) — dark stage & film sections

The signature Apple move (measured above): the media starts as an inset card and widens to the viewport edges as you scroll in.
- Scrub `p` from 1 → 0 between "element top at 100 % viewport" and "element top at 0 + header". `clip-path: inset(0 calc(p * 6.25vw) round calc(p * 28px))`. Inner media `scale(1 + p*0.06)` (counter-zoom so it doesn't look like it's being squashed).
- Smooth `p` with damping (§5.5) — Apple applies `ease: .3`.
- Write `--p` on the element itself (not `:root`) or set `style.clipPath` directly; animating an inherited global custom property forces style recalc across the subtree ([Motion tier list](https://motion.dev/blog/web-animation-performance-tier-list)). Register with `@property --p { syntax:'<number>'; inherits:false; initial-value:1 }`.
- **Mobile: off** (Apple sets `--clip-path-progress:0` at small breakpoint). Mobile gets the standard curtain.

### 3.5 Hairline draws (`<Hairline>`, `<FrameLines draw>`)

- `transform: scaleX(0) → scaleX(1)`, `transform-origin: left`, 900–1400 ms `glide` (B&O: 735 ms `cubic-bezier(0.625,0.05,0,1)`).
- The flyer frame (`FrameLines`): top edge draws from top-left, right edge from top-right (scaleY, origin top), bottom from bottom-right (origin right), left from bottom-left (origin bottom), each 600 ms, starting 150 ms apart (a single continuous "pen" around the frame, 1050 ms total). Corner labels (`SVIF`, `65°N · 19°W`) fade in 600 ms `breathe` starting at 400 ms.
- Section dividers draw once when they enter; never loop. Delete the infinite `loader-draw` alternate loop.
- Underlines on hover: "out right, in left" double wipe — on hover-in, `scaleX(0→1)` origin left 500 ms `settle`; on hover-out, `scaleX(1→0)` origin right 400 ms `leave`.

### 3.6 Numbers — settle, don't count

Count-ups from 0 on every stat are an explicit AI tell. Spec:
- Default: numbers appear with the heading mask (they are typography).
- One hero figure per page may **digit-roll**: each digit is a column `0–9` stacked in a clipped box; the column translates from `-(10 + d) * 1em` to `-d * 1em` so each digit spins past once and lands; 1100 ms `arrive`, columns staggered 60 ms from the **last** digit backwards (odometer feel). `font-variant-numeric: tabular-nums`. `%` and units don't roll, they fade in at 500 ms.
- Implementation: transforms only; do not `setState` every frame (today `useCount` re-renders React 60×/s). If a counter is unavoidable, use a motion value + `animate()` writing `textContent` in `onUpdate`.
- Reduced motion: final number, no roll.

### 3.7 Depth settle (DOM "3D-ish") — brochure mockups, cards, the stage

```css
.depth { perspective: 1600px; }
.depth > .depth-body { transform: translateY(48px) rotateX(9deg) scale(.965); transform-origin: 50% 100%; }
.is-in.depth > .depth-body { transform: none; transition: transform 1400ms var(--ease-arrive); }
```
- For hero/primary objects, scrub it with scroll instead (element top 100 % → 55 % viewport), smoothed.
- Pair with a contact shadow below the object: ellipse `opacity .25 → .55`, `scaleX .8 → 1` over the same time (shadow tightens as the object "lands").
- Limits: resting angles ≤ 6°, transitional ≤ 10° X / ≤ 18° Y. No continuous rotation, no mouse-tilt "holographic card" effect.

### 3.8 Light sweep — the flyer's sunbeam

The flyer's cover is a diagonal band of sunlight (118°, `light-beam` utility). Make that the brand's "sparkle":
- A pseudo-element with the existing beam gradient, 220 % wide, `translateX(-60%) → translateX(60%)`, `opacity 0 → .55 → 0`, 2200 ms `breathe`, once, 300 ms after a brochure/stage reveal completes. Blend `soft-light` on dark stages, `screen` at 30 % on light.
- Scroll-linked variant on the hero: beam position follows scroll (±12 % over the hero's height). Linear mapping, smoothed.
- Never loop it ("shimmer" loops = cheap).

### 3.9 Section-to-section transitions

- **Light → dark (cream → stage `#4a4438`)**: the dark section uses the full-bleed grow (§3.4) on desktop; on mobile its top edge is a straight cut and its content follows the normal reveal. Do not cross-fade the whole page background (big repaint) — paint the dark section itself.
- **Dark → light**: content of the dark section exits by scrolling normally; the light section's heading mask provides the beat. No extra effect.
- Leave ≥ 1 "quiet" section in every three with no scroll-linked motion at all — stillness is part of luxury ([Peretz](https://peretz.agency/blog/luxury-jewellery-website-design): "the stillness is in the layout").

### 3.10 Header behaviour

- Over the hero: transparent, white lettering when over the dark/photo hero.
- After 80 px: background `color-mix(cream 86%, transparent)` + `backdrop-filter: blur(14px) saturate(1.1)` (static blur, not animated) + 1 px hairline bottom border fading in 400 ms.
- Hide on scroll down / show on scroll up: only after 160 px from top ([Motion tutorial](https://motion.dev/tutorials/react-scroll-hide-header) uses 150 px), ignore deltas < 6 px, hide `translateY(-100%)` 500 ms `settle`, show 400 ms `settle`. Always show when the mobile menu or lightbox is open, near the page bottom, or when keyboard focus is in the header.
- Colour inversion over dark sections: sections carry `data-header="dark|light"`; a thin IntersectionObserver band at the header's height (`rootMargin: "0px 0px -95% 0px"`) flips header colours with a 400 ms colour transition.
- Implementation with installed APIs: `const { scrollY } = useScroll(); useMotionValueEvent(scrollY, "change", v => …)` (`framer-motion/dist/index.d.ts:970,1039`). Lenis writes native scroll (`setScroll` → `window.scrollTo({behavior:"instant"})`, `lenis.mjs:532`) so `useScroll` sees it.

### 3.11 Page load and route changes

- No spinner, no looping loader. If `PageLoader` stays, it's a one-off ≤ 1.2 s: roof mark stroke draws 700 ms `glide`, then the cream curtain lifts `clip-path: inset(0 0 0 0) → inset(0 0 100% 0)` 900 ms `curtain`, overlapping the hero heading mask by 300 ms. Skip it on repeat visits (sessionStorage flag in try/catch) and under reduced motion.
- Hero choreography (desktop): 0 ms frame lines start drawing → 150 ms eyebrow → 250 ms H1 lines → +150 ms accent → 750 ms brochure depth-settle + contact shadow → 1600 ms light sweep. Pills/CTAs are visible from 0 (opacity fade with the eyebrow at most).
- Route changes: enable TanStack `defaultViewTransition: true` in `createRouter` (`router-core/dist/esm/router.d.ts:156`). CSS: `::view-transition-old(root){animation:300ms var(--ease-leave) both fade-out}`, `::view-transition-new(root){animation:600ms var(--ease-settle) both fade-rise-12}`; give the header `view-transition-name: header` so it stays put. Unsupported browsers just navigate instantly (fine). After navigation: `lenis.scrollTo(0, { immediate: true })` unless a hash is present.

### 3.12 Diagram / explainer scenes ("every explanation is a visual")

Rules for the five process scenes and any future explainer:
- One idea per scene; the end frame must be a composed, printable image (people often see only the end).
- Max **3 things moving at once**; the eye follows one primary motion.
- Lines draw (`pathLength`, `glide`), then labels fade + 8 px rise (`settle`, 700 ms) **after** their line lands. Labels are tracked caps on a hairline, not pills.
- Total scene ≤ 2.6 s (today up to ~4.4 s with the caption at 3.7 s), then hold.
- No `scale: 0.86 → 1` pop on labels/chips (today `NeedsScene` chips do this — the main "chips flying in" tell). No rotation on entry except ≤ 3° settle on paper objects.
- No replay button (`RotateCcw` in `StepScene.tsx`); in the pinned stage, scrolling back up *is* replay.
- Numbers inside scenes follow §3.6.

---

## 4. Hover, press, cursor (spec)

- **Primary pill**: background `rose → rose-deep` 250 ms `settle`; arrow `translateX(4px)` 400 ms `settle`; press `scale(.985)` 100 ms, release 250 ms. No lift shadow, no glow, no scale-up.
- **Secondary / outline pill**: hairline border goes `sand → ink` 250 ms; text colour only.
- **Text links**: double-wipe hairline underline (§3.5).
- **Image cards**: inner image `scale(1.035)` in 1200 ms / out 800 ms `settle`; caption hairline draws; nothing else moves.
- **Focus-visible**: 2 px ring with 3 px offset, appears with 150 ms opacity. Never animate focus position.
- **Magnetic buttons: no.** Decorative, buggy on touch (stuck hovers), weakens affordance ([Ceros](https://www.ceros.com/inspire/originals/cursor-design/), [dev.to magnet cursor](https://dev.to/sandeshsapkota/building-a-magnet-cursor-animation-3bk9)). None of the measured luxury houses use it.
- **Custom cursor: no.** Keep the native pointer everywhere (Van Cleef has 0 s button transitions and no cursor tricks — restraint is the luxury signal).
- Hover effects only under `@media (hover: hover) and (pointer: fine)`; touch gets the press state only.
- Never animate keyboard-initiated actions (Emil).

---

## 5. Scroll (spec)

### 5.1 Lenis setup (verified against `lenis@1.3.26`)

Mount once in `__root.tsx` via the React adapter (`lenis/react`, export verified in `lenis/package.json`):

```tsx
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

const glide = cubicBezier(0.65, 0, 0.35, 1);

<ReactLenis
  root
  options={{
    lerp: 0.09,            // default 0.1; damp λ = lerp*60 → ~0.55 s to settle 95 % (lenis.mjs:37,86)
    smoothWheel: true,     // default
    syncTouch: false,      // default — native momentum on phones/tablets
    wheelMultiplier: 1,    // never change native distance
    touchMultiplier: 1,
    anchors: { duration: 1.2, easing: glide }, // header offset comes from `scroll-margin-top` on targets (gotcha 6) — do not also pass offset
    stopInertiaOnNavigate: true,
    autoResize: true,
    // respectReducedMotion: true is the default (lenis.d.ts:263): lerp forced to 1, programmatic scrolls instant
  }}
>
```

Why these values:
- `lerp` controls weight. 0.1 (default) ≈ 0.50 s settle; 0.09 ≈ 0.55 s; 0.07 ≈ 0.71 s. Below 0.075 the page feels "underwater" (input lag) — a common over-designed tell. Don't pass `duration` for wheel: when both `duration` and `easing` exist they override `lerp` (`lenis.mjs:79–86`, constructor defaults `lenis.mjs:442–443`).
- Touch stays native (Lenis README limitations + Lunardi: no reason to smooth touch; `syncTouch` "can be unstable on iOS<16").
- Safari is capped at 60 fps for Lenis (README Limitations) — another reason not to over-smooth.

Gotchas found in the source:
1. **Remove `html { scroll-behavior: smooth }`** from `styles.css` (currently in `@layer base`). With Lenis it causes double smoothing for any native `scrollIntoView` (TanStack's hash scrolling) and fights Lenis. Set `html { scroll-behavior: auto }`.
2. **Lenis `anchors` does not `preventDefault`** (`onClick`, `lenis.mjs:542–551`): the browser/TanStack can still do its own jump on the same click. For same-page anchor links, use a small handler that calls `e.preventDefault(); lenis.scrollTo(target, opts); history.replaceState(null, "", hash)`, or render TanStack `<Link hash=… hashScrollIntoView={false}>` (`router-core/dist/esm/link.d.ts:49`) and let Lenis handle it. Verify no 1-frame jump.
3. Cross-page hashes (`/fyrirtaeki#myndband`): keep TanStack's default `hashScrollIntoView`; with `scroll-behavior:auto` it lands instantly, which is right after a route change.
4. Stop Lenis while overlays are open: `lenis.stop()` on lightbox/menu open, `lenis.start()` on close (`.lenis-stopped { overflow: clip }` from `lenis.css`). Scrollable panels inside get `data-lenis-prevent`.
5. The flipbook `<iframe>`: Lenis can't smooth over iframes (README) — wrap it with `data-lenis-prevent` and give it its own height; don't pin anything around it.
6. `lenis.scrollTo(target, { offset, duration, easing, lock, onComplete })` — offset respects `scroll-margin-top` on the target (`lenis.mjs:781–786`), so set `scroll-margin-top: 72px` on section ids once instead of hard-coding offsets.

### 5.2 Pinned scrollytelling stage (the home "Svona virkar það" story and `/fyrirtaeki`)

Structure (CSS sticky — no JS pinning, per [Pudding](https://pudding.cool/process/scrollytelling-sticky/)):

```
<section class="story" style="height: calc(var(--steps) * 92svh + 100svh)">   ← the scroll track
  <div class="stage" style="position: sticky; top: 0; height: 100svh">      ← canvas/three.js + overlay copy
```

- **Scroll length**: 92 svh per step on desktop (5 steps → 460 svh of scroll while pinned). Apple pins of 150–200 svh per idea are common, but this is a 5-beat explainer: keep it brisk ("short and sweet"). Never exceed 110 svh per step.
- Progress: `const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] })` (offset type verified: `framer-motion/dist/index.d.ts:771–775`).
- **Per-step dwell**: within step *i*'s slice, local progress `p ∈ [0,1]`. Motion happens in `p ∈ [0, 0.6]` mapped through `glide`; `p ∈ [0.6, 1]` is a **dwell** where the scene holds still and the copy is readable. This is what makes it feel "Apple" instead of "always moving".
- Lead-in / lead-out: the first 20 svh after pinning shows step 1's opening frame (no motion); the last 20 svh holds step 5's end frame before unpinning.
- Step index with hysteresis: switch to step *i+1* when global progress passes the boundary + 0.02, back when below boundary − 0.02 (no flicker at edges).
- **Copy swap** (overlay inside the stage, bottom-left on desktop, below the canvas on mobile): outgoing copy `opacity → 0`, `y → -8px`, 280 ms `leave`; incoming waits 120 ms then heading mask (§3.1, 900 ms) + paragraph fade 700 ms `settle`. One step's copy at a time. Step numbers `01 / 05` in tracked caps.
- **Progress hairline**: a 1 px line with 5 ticks; fill `scaleX` = scrubbed progress (linear, smoothed). The only always-moving element.
- **Desktop = scrubbed** (with damping, §5.5) — the user drives it.
- **Touch / < 768 px = step-triggered**: momentum flicks make scrubbed motion jumpy and unreadable. The step index still comes from scroll, but each step's transition plays as a time-based 1.4 s `glide` tween toward that step's pose, retargeting (not restarting) if the step changes mid-flight. Stage height 60 svh sticky at top (below header), copy in the remaining 40 svh. Use `svh` (Apple uses `100svh`/`200svh`) so the iOS URL bar never re-lays out the track; never recompute heights on height-only resize.
- Keyboard: the story must still be readable by tabbing — each step's copy exists in DOM order; focusing a step's heading scrolls to its dwell zone.
- Don't stack more than **two** pinned sections on one page ([theplusaddons scrollytelling](https://theplusaddons.com/blog/scrollytelling/)): home = one pinned story; `/fyrirtaeki` = one.

### 5.3 How Apple scrubs a sequence (for the brochure/stage if not three.js)

- Pre-rendered frames on a `<canvas>` sized to the stage × `min(devicePixelRatio, 2)`, frame index = `round(progress * (n-1))`, draw on rAF only when the index changes, preload all frames (`Image()` array or `createImageBitmap`) before enabling scrub ([CSS-Tricks](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)).
- 60–90 frames per sequence at 1600 px wide WebP/AVIF ≈ 3–6 MB; mobile gets 1080 px frames or a single still (Apple serves a still to mobile/slow connections).
- Never scrub `<video>.currentTime` (laggy seeking with sparse keyframes).
- If the stage is three.js (installed), scrub camera/object parameters instead of frames (§6).

### 5.4 Parallax amounts

| Layer | Amount |
|---|---|
| Full-bleed background photo inside its frame | `translateY` from `-6%` to `+6%` of the frame height across its trip through the viewport (Apple: ~10 %) — image is 112 % tall to cover |
| Floating object over a background (hero brochure) | ±40 px |
| Decorative hairlines / corner labels | 0 (they are the "stationary frame of reference" Apple HIG recommends) |
| Text | **0 — never parallax text** |
| Mobile | half of desktop, or off |
| Reduced motion | 0 |

Linear mapping from scroll (scroll is the easing), smoothed (§5.5). One parallax layer per viewport; WCAG 2.3.3 calls parallax non-essential.

### 5.5 Smoothing scroll-linked values (one rule, no double smoothing)

- Use frame-rate-independent damping: `x = damp(x, target, λ, dt)` (`THREE.MathUtils.damp` in `three/src/math/MathUtils.js:134`; Lenis uses the same formula).
- λ = **10** while Lenis is smoothing the wheel (it already adds ~0.5 s of weight; more would feel laggy), λ = **5** on touch/native scroll. Settle time ≈ 3/λ s.
- Stop the rAF loop when `|x - target| < 1e-4` for all values (render on demand).
- framer-motion `useSpring(scrollYProgress)` is acceptable for DOM-only stages with `{ stiffness: 120, damping: 30, mass: 0.4 }` (no visible overshoot) — but don't combine it with damping elsewhere.

---

## 6. "3D-ish" motion rules for the three.js / canvas stages

(The 3D engine itself is another workstream; these are the motion constraints it must follow.)

- **Lens**: `PerspectiveCamera` FOV **28–35°** (a long product lens). FOV > 45° distorts and reads "gamey/futuristic". Dolly in by moving the camera, not by changing FOV.
- **Camera moves** between step poses: position + target interpolated with `glide`; one axis of interest at a time (push-in *or* orbit, not both); orbit ≤ 25° per step; total camera path per step ≤ 0.6 × the object's size.
- **No turntables, no auto-rotation, no idle bob.** If anything idles, amplitude ≤ 0.6° / 3 px with a period ≥ 10 s (Apple HIG warns about ~0.2 Hz = 5 s oscillation). The current CSS `float-soft` (12 px, 9 s, ±0.6°) on the hero brochure should go, or be scroll-linked instead.
- **Paper physics** for the brochure: page turns 1.2 s `glide`, with the free edge lagging the spine by ~80 ms (a bend), and a shadow band sweeping across the next page in sync. Pages never flip faster than 0.9 s.
- **Light**: warm key light at the flyer's 118° sunbeam angle; the light sweep (§3.8) can be a moving spotlight or emissive band in the scene; soft contact shadow under objects; tone mapping `NeutralToneMapping` or `AgXToneMapping` (both in `three/src/constants.js:473,483`) so the beige/taupe palette doesn't shift orange as ACES does.
- **Materials**: paper is matte (roughness 0.85–0.95), slight sheen on the cover only. No glossy reflections, no bloom, no particles, no glow — those are the "futuristic" look the owner doesn't want.
- **Performance**: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` (1.5 on phones); render only while values are changing or while in view (IntersectionObserver + `document.visibilitychange`); `renderer.setAnimationLoop(null)` when idle (`WebGLRenderer.js:1609`).
- **Fallback**: a pre-rendered still for each step's end frame (also used for reduced motion, no-WebGL, and OG images).

---

## 7. Videos that match the site (spec for the films and inline loops)

The films must feel cut from the same cloth as the page:
- **Same type, same motion**: titles in the film are Jost 300 uppercase white with wide tracking, Instrument Serif italic accent, small tracked corner labels, hairline frame — and they animate with the **same** tokens: line-mask rise 1.0 s `arrive` (≈ 25 frames at 25 fps), 90 ms line stagger, accent word +150 ms, hairlines 1.2 s `glide`. Export the cubic-beziers into the video tool (After Effects/Remotion/ffmpeg pipeline) as custom curves.
- **Holds**: every title holds ≥ 2.0 s fully readable after it lands; one idea per card; ≤ 7 words per card.
- **Exits**: titles leave with opacity only, 400 ms `leave` (≈ 10 frames). No exit slides.
- **Cuts and dissolves**: cross-dissolve 0.6–1.0 s (15–25 frames) between scenes; dips go through the stage colour `#2E2A24`, never pure black or white flashes. Hard cuts on beats are fine; no zoom/whip/spin transitions, no glitch, no light-leak packs.
- **Camera**: slow push-ins of 2–4 % scale over ≥ 4 s, in-out sine/`glide` (start and stop softly; linear Ken Burns looks cheap). Never zoom out-and-in on the same shot.
- **Frame rate**: 25 fps (Iceland/PAL) with motion blur for live-action/3D renders; motion-graphics-only films can render at 50 fps for crisp moving type. Don't mix rates in one film.
- **Colour**: same dark warm taupe stage (#4a4438 → #2E2A24) with the diagonal sunbeam; white lettering (#F6F5EC, not pure #FFF).
- **On the site**:
  - Inline loops: `muted playsinline loop preload="metadata"` + poster that is the video's first frame (so the poster → video swap is invisible). Fade poster → video 600 ms `breathe` once `playing` fires.
  - Play only when ≥ 50 % visible; pause when out of view or the tab is hidden.
  - The first frame and last frame of every inline loop are the same composition (seamless loop; no visible jump).
  - The full film opens in the lightbox (§2.2 timings) and **Lenis is stopped** while it's open.
  - Reduced motion: no autoplay; show the poster with a play button (Apple hides inline video under reduced motion).
  - Replace the `animate-spin` loading spinner in `StepVideo.tsx` with the poster + a 1 px progress hairline.

---

## 8. What makes motion look cheap / AI-generated — and the fix

Items marked ● are present in the current codebase.

| # | Tell | Why it reads cheap | Fix (spec) |
|---|---|---|---|
| 1 ● | Same fade-up on every element (`.reveal` 22 px / 900 ms / one curve) | No hierarchy; "the same 16 px hop" | Pattern-specific reveals (§3); headings mask, blocks follow, CTAs don't animate |
| 2 ● | Linear index stagger on unrelated items (`delay={80/160/240/320}`, `i * 110`) | "Motion cosplaying as choreography" | Stagger only true sequences, capped (§2.4); groups reveal as one |
| 3 ● | Chips/pills popping in with scale (`scale: 0.86 → 1` in `NeedsScene`) | Toy-like, "AI diagram" | Hairline callouts: line draws, label fades + 8 px |
| 4 ● | Horizontal slide-ins (`data-direction="left|right"`, 32 px) | PowerPoint | Remove; nothing enters sideways |
| 5 ● | Infinite floating/bobbing hero object (`float-soft`) | Stock "floating product" | Remove or scroll-link; idle ≤ 3 px / ≥ 10 s period |
| 6 ● | Infinite looping loader hairline (`loader-draw alternate infinite`) | Waiting UI | One-shot intro ≤ 1.2 s or none |
| 7 ● | Replay buttons with rotating-arrow icon (`RotateCcw`) | Demo-ware | Scroll back = replay; remove |
| 8 ● | Count-up numbers recomputed every frame (`useCount`) | Listed AI tell; also 60 re-renders/s | Digit roll on one hero figure; others static |
| 9 ● | Long timed sequences (scene captions at 3.7 s) | User waits for content | ≤ 2.6 s per scene, end frame composed |
| 10 ● | Constant-speed marquee of categories | Template cliché | Replace with a "contents page" list (like flyer p.2) whose hairlines draw; if kept: ≥ 80 s/loop, edge mask, paused off-screen |
| 11 ● | `html { scroll-behavior: smooth }` + (soon) Lenis | Double smoothing, janky anchors | `scroll-behavior: auto`; Lenis handles it |
| 12 | Bouncy springs / overshoot on content | Playful, not luxurious | No overshoot; springs only for drag (bounce 0) |
| 13 | Everything animating at once | Noise | Max 1 primary + 1 secondary motion in view |
| 14 | Too fast (< 300 ms reveals) or too slow UI (> 500 ms hover) | Twitchy / sluggish | Two regimes (§2.2) |
| 15 | Blur-in text, glows, neon, shimmer loops, particles, gradient sweeps | 2023–25 AI landing-page look; heavy paint | None. One once-only light sweep in the flyer's beam |
| 16 | Rotating/spinning icons, Lottie icon animations | Decorative motion | Static icons; state-change rotation (accordion + → ×, 45°, 400 ms) only |
| 17 | Typewriter / scramble / per-letter animations | Gimmick, bad for a11y | Line or word masks only |
| 18 | Hover scale-up + shadow lift on buttons, magnetic buttons, custom cursors | "Creative dev portfolio" | §4 |
| 19 | Reveals re-trigger on every scroll up/down | Restless | Once |
| 20 | Content invisible without JS / layout shift | Blank pages, CLS | `.js` gating, transform/opacity/clip only |
| 21 | Parallax on text, big parallax ranges | Nausea, cheap depth | §5.4 |
| 22 | Scroll-jacking, slow lerp (< 0.075), snap fighting input | Feels broken | Lenis 0.09 wheel only, native touch, no snapping |
| 23 | Random easings and durations per component | No system | Six tokens (§2.1) |
| 24 | 3D turntables, wide-FOV cameras, glossy materials, bloom | Futuristic/game look | §6 |
| 25 | Animating `box-shadow`, `filter: blur`, `width/height`, `top/left` | Paint/layout jank | §10 |

---

## 9. Reduced motion that still looks designed

Detect once (`matchMedia('(prefers-reduced-motion: reduce)')`, live) and also wrap the app in `<MotionConfig reducedMotion="user">` (framer-motion option verified: `"always" | "never" | "user"`, `index.d.ts:208,234` — it turns off transform animations and keeps opacity).

| Pattern | Reduced-motion version |
|---|---|
| Line masks, block rises | Opacity 0 → 1, 400 ms `breathe`, no translate, same order but no stagger > 60 ms |
| Curtains, depth settle, full-bleed grow | Final state; opacity 0 → 1 400 ms on the media only |
| Hairline draws | Drawn; frame fades in 400 ms |
| Digit roll | Final number |
| Parallax, light sweep, hover image zoom | Off |
| Pinned story | Not pinned: steps become a stacked list, each with its end-frame still (rendered from three.js/sequence) + copy. Same order, same captions |
| Lenis | Built in: `respectReducedMotion` default `true` forces `lerp = 1` and instant programmatic scroll (`lenis.mjs:749–754`) |
| Inline video | No autoplay; poster + play button |
| View transitions | Cross-fade 200 ms only |
| Header hide-on-scroll | Off (always visible) |

Everything stays visible and composed; only movement is removed — never the content or the hierarchy.

---

## 10. Performance rules

1. Animate only `transform`, `opacity`, and (sparingly) `clip-path`. Never `width/height/top/left/margin`, `box-shadow`, `filter: blur`, `letter-spacing`, or background-position on large areas.
2. `will-change` only while animating: add `will-change: transform, opacity` when a reveal starts, remove (`auto`) on `transitionend` — exactly what Apple does (`staggered-start` / `staggered-end`). Never in a global stylesheet rule on many elements ([web.dev](https://web.dev/articles/animations-guide), [CSS Will Change spec](https://drafts.csswg.org/css-will-change/)).
3. One shared IntersectionObserver for reveals; one rAF loop for all scroll-linked values (Lenis `autoRaf` + a single subscriber, or framer-motion's frameloop) — no per-component scroll listeners (the current `Header` adds two `scroll` listeners).
4. Batch reads then writes; never read layout (`getBoundingClientRect`) inside a scroll handler — measure on resize only.
5. Scroll-driven custom properties: register with `@property … inherits: false` and set them on the animated element, not `:root`.
6. Pause anything long-running off-screen (marquee, video, WebGL) via IntersectionObserver and `visibilitychange`.
7. `contain: layout paint` on each stage/scene container; `content-visibility: auto` + `contain-intrinsic-size` on heavy below-the-fold blocks that are **not** inside a sticky track (FAQ, footer).
8. Images: AVIF/WebP, explicit `width`/`height`, `decoding="async"`, `fetchpriority="high"` for the hero only; curtain-revealed images must be fully decoded before the curtain opens (`img.decode()` then add `.is-in`).
9. Budgets: no long task > 50 ms during scroll; reveal JS < 6 kB; pinned-story assets ≤ 6 MB desktop / ≤ 2.5 MB mobile; test on an iPhone in Low Power Mode (Safari drops to 30 fps).
10. Prefer CSS transitions/WAAPI for one-shot reveals (they run off the main thread when compositable); use framer-motion for orchestrated scenes and scroll-linked values; lazy-load scene code (`LazyMotion` + `domAnimation`, `m` components) for the explainer routes.

---

## 11. Implementation plan for this repo (file by file)

1. `src/styles.css`
   - Add easing/duration tokens (§2) and `@property --p`.
   - Remove `scroll-behavior: smooth`; remove `.reveal[data-direction=…]`, `float-soft`, `loader-draw`; add `.js`-gated reveal classes (`[data-reveal="mask|block|curtain|hairline|depth"]`), `.mask-line` with accent padding, curtain, hairline, depth, light-sweep utilities, and the reduced-motion block (§9).
2. `src/components/motion/tokens.ts` — `EASE`, `DUR`, `DIST`, `STAGGER`, `easeFn`; delete `EASE` from `playback.ts`.
3. `src/components/motion/reveal-observer.ts` — singleton IntersectionObserver (`-14%` bottom margin), fonts-ready gate, velocity-aware duration scale, `will-change` add/remove.
4. Components: `MaskLines`, `Reveal` (rewritten: `kind="block|curtain|hairline|depth"`, no `delay` prop — sequence comes from a parent `<Sequence>` that assigns offsets by role), `Curtain`, `Hairline`, `DigitRoll`, `LightSweep`, `FullBleed` (scroll-scrubbed §3.4).
5. `src/routes/__root.tsx` — inline `js` class script; `<ReactLenis root options={…}>`; `<MotionConfig reducedMotion="user">`; `scroll-margin-top` on section ids.
6. `src/router.tsx` — `defaultViewTransition: true`.
7. `src/components/Header.tsx` — `useScroll` + `useMotionValueEvent` hide/show and `data-header` colour inversion (§3.10).
8. `PageLoader.tsx` — one-shot intro or delete; `StepVideo.tsx` / `VideoLightbox.tsx` — poster-matched fades, IO play/pause, `lenis.stop()/start()`, no spinner.
9. `motion/StepScene.tsx`, `motion/scenes.tsx` — move into the pinned story stage (§5.2), apply scene rules (§3.12), remove chips' scale-pop and the replay button, replace `useCount`.
10. `index.tsx`, `fyrirtaeki.tsx`, `baeklingur.tsx`, `tolfraedi.tsx` — replace every `<Reveal delay={n}>` ladder with role-based sequences; replace the marquee with a contents-page list; one pinned story per page.
11. QA checklist: trackpad, mouse wheel, iPhone Safari (normal + Low Power), Android Chrome, keyboard-only, reduced motion on, JS off, slow 4G; record 60 fps screen captures of hero and pinned story and scrub them frame-by-frame for pops, double-smoothing or late reveals.

---

## Sources

Primary, measured (fetched 2026-11-09):
- [Apple AirPods Pro overview CSS](https://www.apple.com/v/airpods-pro/t/built/styles/overview.built.css), [JS](https://www.apple.com/v/airpods-pro/t/built/scripts/overview/main.built.js), [page](https://www.apple.com/airpods-pro/)
- [Apple global header CSS](https://www.apple.com/api-www/global-elements/global-header/v1/assets/globalheader.css), [local nav CSS](https://www.apple.com/ac/localnav/9/styles/ac-localnav.built.css)
- [Apple Vision Pro](https://www.apple.com/apple-vision-pro/), [AirPods Max](https://www.apple.com/airpods-max/), [MacBook Pro](https://www.apple.com/macbook-pro/)
- [Bang & Olufsen](https://www.bang-olufsen.com/en/dk), [Hermès](https://www.hermes.com/us/en/), [Aman](https://www.aman.com/), [Locomotive](https://locomotive.ca/en), [Minotti](https://www.minotti.com/en), [Vipp](https://vipp.com/en-us), [Byredo](https://www.byredo.com/), [Norm Architects](https://normcph.com/), [Audo Copenhagen](https://audocph.com/)
- Installed packages: `svif/node_modules/lenis` (1.3.26: `dist/lenis.mjs`, `dist/lenis.d.ts`, `dist/lenis-react.d.ts`, `dist/lenis.css`, `README.md`), `framer-motion` 12.43.0 (`dist/index.d.ts`), `motion-dom`, `motion-utils`, `three` 0.186.1 (`src/math/MathUtils.js`, `src/constants.js`, `src/renderers/WebGLRenderer.js`), `@tanstack/router-core` (`dist/esm/router.d.ts`, `link.d.ts`)

Guidelines and articles:
- [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Material Components — Motion (M3 easing & duration tokens)](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)
- [Microsoft Fluent — Timing and easing](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing)
- [NN/g — Executing UX animations: duration](https://www.nngroup.com/articles/animation-duration/)
- [Emil Kowalski — Great animations](https://emilkowal.ski/ui/great-animations), [The magic of clip-path](https://emilkowal.ski/ui/the-magic-of-clip-path)
- [Josh W. Comeau — Springs and bounces in native CSS](https://www.joshwcomeau.com/animation/linear-timing-function/)
- [GSAP — SplitText masks](https://gsap.com/docs/v3/Plugins/SplitText/masks)
- [Motion — Web animation performance tier list](https://motion.dev/blog/web-animation-performance-tier-list), [Motion — hide header on scroll](https://motion.dev/tutorials/react-scroll-hide-header)
- [web.dev — High-performance animations guide](https://web.dev/articles/animations-guide)
- [W3C — CSS Will Change](https://drafts.csswg.org/css-will-change/)
- [W3C — Understanding SC 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [The Pudding — Responsive scrollytelling best practices](https://pudding.cool/process/responsive-scrollytelling/), [Scrollytelling sticky](https://pudding.cool/process/scrollytelling-sticky/)
- [CSS-Tricks — Apple product page scroll animations](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/)
- [Edoardo Lunardi — Building smooth scroll in 2025 with Lenis](https://www.edoardolunardi.dev/blog/building-smooth-scroll-in-2025-with-lenis)
- [Sailop — Motion slop: fade-in-up](https://sailop.com/blog/motion-slop-fade-in-up-scroll-animation-2026), [925studios — AI slop web design](https://www.925studios.co/blog/ai-slop-web-design-guide), [avoid-ai-design](https://github.com/funboy322/avoid-ai-design)
- [Peretz — We measured 9 luxury brand websites](https://peretz.agency/blog/luxury-jewellery-website-design)
- [Ceros — Cursor design](https://www.ceros.com/inspire/originals/cursor-design/), [dev.to — magnet cursor (complexity/bugs)](https://dev.to/sandeshsapkota/building-a-magnet-cursor-animation-3bk9)
- [WebKit bug 219729 (filter performance)](https://bugs.webkit.org/show_bug.cgi?id=219729)
- [theplusaddons — Scrollytelling (limit pinned sections)](https://theplusaddons.com/blog/scrollytelling/)
