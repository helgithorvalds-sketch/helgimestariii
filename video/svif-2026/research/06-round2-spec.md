# 06 · Round-2 spec: "Meira um hugmyndina" stepper, copy deck, vignettes, films, meta

Written 9 Nov 2026 for the round-2 build. Binding inputs, in order of authority:

1. `BIBLE-R2.md` (wins)
2. `user-feedback-r2.md` (the owner's words)
3. `BIBLE.md`
4. `05-copy-audit.md`
5. `01-premium-web-motion.md`
6. `02-premium-threejs.md`

This file adds the research for the new "one item at a time" section. It also gives the full Icelandic copy deck for round 2, a storyboard for each of the 16 vignettes, the film cards, the meta text and the section order.

Copies of the live pages, CSS and JS I measured are saved in `research/dl-06/`. These cover Apple MacBook Air, Apple Pay, Apple Card, iPhone, Stripe, Linear and B&O. **No code was changed.**

**How to read the copy:** `*…*` marks the one serif-italic accent phrase. In DisplayTitle terms that is `accent`; the text before it is `caps` and the text after it is `capsAfter`. Every factual sentence carries a source tag:

| Tag | Meaning |
|---|---|
| **[E2]** | Owner, round 2 (BIBLE-R2 §1 and the feedback) |
| **[E1]** | Owner's earlier text (round 1 FAQ and cards, restored in 05) |
| **[S]** | A claim the site already makes |
| **[D]** | Arithmetic derived from [E2]/[E1] |
| **[L]** | Lead or agent wording or interpretation. Plausible, but the owner should see it. |

---

## 0. Decisions in one screen

1. **Pattern.** "Meira um hugmyndina" is the APG's **tabbed carousel**: the WAI-ARIA **Tabs** pattern picks the item, with previous/next buttons beside it. It has:
   - previous/next buttons;
   - eight tick tabs and a `01 / 08` counter;
   - ←/→, Home/End, touch swipe and trackpad swipe.

   One item is shown at a time and nothing advances on its own. When an item becomes active, its 3D vignette plays once (1.5–3 s) and then holds still.
2. **Layout.**
   - **Desktop:** 50/50. The text column is on the left, with the controls at its top, so the controls never move. The light, square, rounded vignette panel is on the right.
   - **Phones:** the vignette comes first, then the controls, then the text.
   - **All sizes:** all eight panels sit in one grid cell, so changing items never shifts the layout.
3. **Rendering.**
   - One WebGL canvas serves all eight vignettes. Each vignette is built lazily.
   - When the item changes, a snapshot of the outgoing frame cross-fades away (500 ms).
   - Pre-rendered end frames cover reduced motion, no WebGL, software GL and no JS.
4. **Copy.** All eight items are questions, which Apple Pay's "Get started" cards also do. Each has one accented key phrase. Item 1 carries the selling point: many companies compete, a discount at the right time wins the call, and the booklet puts it in their hands.
5. **Stories.**
   - Home has six steps, with the problem first, a plain-words line and titles that name the action.
   - Business has four steps.
   - "Örfá … í hverjum flokki" is removed everywhere, "Lausnin" is replaced (it breaks the copy rules) and every "Um 500" becomes "350–500".
6. **Films.** Cards have at most 7 words, with two deliberate exceptions: the owner's H1 and the 80% line. Both films end on the booking card.
7. **Order.** Sections follow BIBLE-R2 §6. The old anchors (`#af-hverju`, `#spurningar`) become aliases of the new section, so old links still work.

---

## 1. Research: how premium sites explain things one item at a time

### 1.1 What the reference sites ship (measured 9 Nov 2026)

| Site · component | What I found | Source |
|---|---|---|
| **Apple MacBook Air (M5), "Get the highlights" (`ScrollGallery`)** | A native horizontal scroller: `.scroll-container{overflow-x:scroll; scroll-snap-type:x mandatory; scroll-padding:var(--gallery-side-padding); scrollbar-width:none}`, items `scroll-snap-align:start`, `<ul role="list">`, gallery `aria-label="Highlights gallery"`. | page HTML; `overview.built.css` |
| | **Paddles:** two `<button>`s labelled "Previous item in highlights gallery" / "Next item in highlights gallery", each a 36 px circle (`--sk-iconcontrol-diameter:36px`). Scrim is `rgb(232,232,237)` (dark theme `rgb(51,51,54)`); icon alpha goes .56 → .64 on hover in `100ms linear`. At the ends the paddle is disabled and hidden (opacity 0; the bottom-paddle variant uses .2). | `overview.built.css`, `main.built.css` |
| | **Programmatic move:** `duration: .5` s with `easeFunction: "easeInOutQuad"`. Scroll-snap is switched off during the tween and back on afterwards. Under reduced motion it uses `scrollTo({behavior:"instant"})`. A swipe is native scroll; the current index settles 200–300 ms after scrolling stops. | `main.built.js` (ScrollGallery) |
| | **Keyboard:** a `window` keydown listener exists **only while the gallery is in view** (`start: "t - 100vh"`, `end: "b + 100%"`). It ignores INPUT/SELECT/TEXTAREA. Left (37) and right (39) step one item and respect RTL. | `main.built.js` |
| | **Media per card:** each card has a caption pinned to the top, then: start-frame `<picture aria-hidden>` → `<video muted playsinline role="img" aria-label="Animation of M5 chip">` → end-frame `<picture aria-hidden>`. A separate *static* frame with real alt text covers reduced motion and no inline media. The video resets and pauses when it leaves the viewport. Its control's label changes between Play, Pause and Replay. | page HTML |
| **Apple Pay, "Ways to Pay" (`FadeGallery`)** | **One item at a time, cross-faded.** A tablist (pill tabs with icon and label, `role="tab"`, `aria-selected`, `aria-controls`) drives four `role="tabpanel"` items (`aria-labelledby`). Each panel has a media block (`role="img"` with a descriptive `aria-label`) and a caption. | page HTML |
| | **Timing:** items fade over `Fade.duration = .5` s. The caption leaves and then enters with `opacity 300ms cubic-bezier(.33,1,.68,1)` (outgoing → midpoint → incoming). Start and end frames swap in 200 ms ease-out (`--frame-transition-duration`). The tab indicator slides `left,width` in 280–320 ms ease-out. Tab labels go from .8 to 1 opacity in 100 ms. | `overview.built.css`, `main.built.js` |
| | **Deep link:** `location.hash` picks the first item. **Reduced motion:** captions get `transition:none` and the static fallback frames show. The active item's media plays when about 60% of the gallery is in view (`"t - 100vh + 60h"`), and a playback queue can move through items. | `main.built.js` |
| **Apple Pay, "Get started"** | **Question titles with one highlighted key phrase:** "How do I add `<span class="text-highlight-blue">`my card`</span>` to my iPhone?", "Where can I use *Apple Pay?*", "How do I pay with just my *iPhone?*". Each card has one short film, labelled "Watch video (27s)" with a visually hidden "27 seconds". | page HTML |
| **Apple iPhone, "Significant others" (`ImageAccordion`)** | **Text left, one shared visual right.** On large screens, a list of titles with the open item's copy sits on the left, and one large image (`aria-hidden`) on the right swaps to the open item. On small screens each item shows its own image inline under its copy. Large images download only at large breakpoints. | page HTML |
| **Apple Card** | One benefit per tile. The front has a headline or number ("2% Daily Cash", "No Fees") over an image; a "+" flips the tile to the detail, a `role="dialog"` back face. Each tile animates once, when its top reaches 70% of the viewport height (`"a0t - 70vh"`). | page HTML |
| **Stripe home, "What's happening"** | **One `<canvas aria-hidden>` draws the visuals for all 8 items.** The text items are stacked; inactive ones get `aria-hidden="true"`, `opacity:0`, `pointer-events:none`, and their links get `tabindex="-1"`. An sr-only `aria-live="polite" aria-atomic="true"` region announces "**Item 1 of 8: Businesses on Stripe generated $1.9T in 2025.**" The controls are a `role="group" aria-label="Carousel navigation"` with "Previous slide" / "Next slide" quiet buttons in the section header. | page HTML |
| **Linear home** | A horizontal card row with a hidden scrollbar. Each card has an SVG illustration with a once-only lift (`--purpose-lift`, `--lift-delay`). Elsewhere: a "1 / 84" counter with "Previous issue" / "Next issue" buttons. | page HTML |
| **Bang & Olufsen home** | `role="region" aria-roledescription="carousel" aria-label="Find the perfect gift"`, with the track as `role="group" tabindex="0"`. Arrows fade in 150 ms ease-in-out; the slide-title underline uses `400ms cubic-bezier(.165,.84,.44,1)`, our `settle`. | page HTML/CSS |
| **Aesop** | Not measurable: the site returned a Cloudflare challenge page. | n/a |

### 1.2 Accessibility patterns (binding)

- **APG Tabs:**
  - ←/→ move between tabs and wrap at the ends; Home/End are optional.
  - Use roving `tabindex`.
  - "It is recommended that tabs activate automatically when they receive focus", but only when panels show without noticeable delay. Our panels are preloaded, so activation is automatic.
  - Give a tabpanel `tabindex="0"` when its first content is not focusable.
- **APG Carousel:**
  - Previous/next are native buttons, and "activating the rotation, next, or previous control does not move focus".
  - The tabbed style uses tablist, tab and tabpanel.
  - An optional live region: `aria-live` is `off` while the carousel rotates and `polite` otherwise.
  - Any `aria-roledescription` must be localised. We skip it: plain Tabs is announced in the screen reader's own language ("flipi, 3 af 8").
- **WAI carousel tutorial:**
  - Previous/next do not move focus.
  - A visually hidden polite live region says "Item x of y".
  - Picker buttons must show which item is current.
- **WCAG:**
  - **2.5.1 Pointer Gestures (A):** a swipe needs a single-pointer alternative. Our arrows and tabs are that alternative.
  - **2.2.2 Pause, Stop, Hide (A):** applies only to motion that lasts more than 5 s. Our vignettes run for 3 s or less, then hold, and never loop.
  - **2.5.8 Target Size (AA):** at least 24×24. We use 44×44.
  - **2.3.3 Animation from Interactions (AAA):** reduced motion is honoured.
- **NN/g on carousels:**
  - Aim for five frames or fewer.
  - "Dots are a particularly poor cue on mobile devices."
  - Make the selected state clearly distinct.
  - Keep controls inside the carousel and large.
  - Never auto-forward on mobile.

  We must ship **eight** items (BIBLE-R2 §5), so we mitigate:
  - every item is a self-explaining question;
  - the strongest item comes first;
  - a clear `03 / 08` counter;
  - tabs that carry the full question as their accessible name;
  - deep links;
  - prominent arrows;
  - hairline ticks instead of dots.
- **Swiper's defaults, as a gesture reference:** `threshold` 5 px, `touchAngle` 45°, `longSwipesRatio` 0.5, `longSwipesMs` 300, `speed` 300 ms, `keyboard.onlyInViewport` true.

### 1.3 What we take from it

1. **Cross-fade, don't slide.** We follow Apple's FadeGallery: one item at a time, with the text and the media changing in place. This matches our "no slide-ins" rule.
2. **Share one visual surface.** Stripe draws every item into one `<canvas aria-hidden>`, and Apple's ImageAccordion uses one shared image. We do the same: one WebGL canvas, which saves contexts on a page that already has two (hero and story).
3. **Use start frame → animation → end frame → static frame.** This is Apple's media contract. Our vignettes are pure functions of `t`, so the end frame (`t = 1`) is the held state, the reduced-motion still and the poster all at once.
4. **Build accessibility like Stripe and the APG:**
   - real tabs;
   - inactive panels hidden from assistive tech and from the tab order;
   - an sr-only polite live region saying "Spurning 3 af 8: <question>";
   - buttons that never move focus.
5. **Put the keyboard where people already are.** Arrows work on the tablist (APG). Like Apple and Swiper (`onlyInViewport`), ←/→ also work while the section is in view and nothing else has focus.
6. **Keep text out of the render.** Numbers and labels are DOM over the visual, never baked in. Apple's performance galleries use a big `badge-value` plus a small `badge-unit`; Apple Pay highlights the key phrase in the title. We use crisp DOM callouts projected from world points, plus at most one big figure.
7. **No autoplay.** The owner wants to click through, and NN/g advises against auto-forwarding on mobile. The only automatic motion is the active vignette's single beat when the section first comes into view.

---

## 2. The stepper: implementation spec

New files only (no collision with the story, hero and booklet agents):

| File | Contents |
|---|---|
| `src/content/meira-copy.ts` | copy for both pages, shaped as in §3.4 |
| `src/components/meira/MeiraSection.tsx` + `meira.css` | the section component |
| `src/three/vignettes/*` | the vignette engine and builders, §4 |
| `lab/vignettes.html` + `lab/vignettes.ts` | lab preview and still capture |
| `public/svif/meira/{heim,fyr}-{01..08}.webp` (+ `-m.webp`) | stills |

### 2.1 Anatomy

```
DESKTOP ≥ 1024 px (site container, 12 columns, gap 56–72 px)

  [roof-mark] SPURT OG SVARAÐ                                  ← eyebrow (cream, label-caps)
  MEIRA UM *hugmyndina.*                                       ← H2, DisplayTitle size lg
  Af hverju þetta virkar og hvernig samstarfið gengur fyrir sig.   ← intro, 17 px, cream/72

  ┌──────── text column, col 1–6 ─────────┐   ┌──── visual panel, col 7–12, square ────┐
  │ 01 / 08  ─ ━━ ─ ─ ─ ─ ─ ─   (‹)  (›)  │   │  [figure: 350–500 / Á MÁNUÐI]          │
  │                                        │   │                                        │
  │ AF HVERJU *virkar þetta?*              │   │          3D clay vignette              │
  │                                        │   │      callouts on hairlines (DOM)       │
  │ Mörg fyrirtæki keppast um nýja         │   │                                        │
  │ húseigendur. Afsláttur á réttum …      │   │                                        │
  └────────────────────────────────────────┘   └────────────────────────────────────────┘
  AÐRAR SPURNINGAR · 853 5147                                  ← tel: link, label-caps, cream/60

PHONES < 768 px (16–20 px gutters; tablets 768–1023 use the phone order with a 4:3 panel)

  eyebrow · H2 (size md) · intro
  [ visual panel, 1:1, full width ]
  (‹)    01 / 08  ─ ━━ ─ ─ ─ ─ ─ ─    (›)      ← fixed position directly under the panel
  TITLE (2–4 lines)
  answer
  AÐRAR SPURNINGAR · 853 5147
```

**DOM order:** section header → controls (counter, tablist, arrows) → panels → visual.

- This is the APG order (tablist before tabpanel). It also matches the reading order on desktop, where the controls sit above the text.
- On phones, CSS `order` (or grid areas) moves the visual first. The visual is not focusable, so focus order stays logical.
- No page-level wrapper is needed beyond `<section>`.

**Height stability:**
- All eight `.meira-panel`s share `grid-area: 1 / 1` in one grid. The column is therefore as tall as the longest answer, and the visual and controls never jump.
- Inactive panels get `visibility:hidden`, which also removes them from the accessibility tree and the tab order. They fade out first: `transition: opacity 280ms var(--ease-leave), visibility 0s linear 280ms`.

**Sizes and type:**

| Element | Spec |
|---|---|
| Section padding | `py-24 md:py-32 lg:py-40` (same rhythm as the other sections) |
| Header to stepper | 56 px (phones) / 80 px (desktop) |
| Item title (H3) | Jost 300 caps, `clamp(1.75rem, 1.1rem + 1.9vw, 2.75rem)`, tracking .06em, line-height 1.14; accent in Instrument Serif italic at ×1.3, not in caps. Max 3 lines on desktop, 4 on phones. |
| Answer | Inter 400, 16/1.62 (phones) and 17.5/1.62 (desktop), cream at 80% (about 6.9:1 on `#4a4438`), max-width 34rem; 24 px under the title |
| Counter | label-caps 11 px, tabular numbers, `01` in cream, `/ 08` in cream/55 |
| Ticks | 8 tab buttons, each with a 44×44 hit area. Visual tick 20×1 px in cream/30. One indicator element (36×1.5 px, cream) glides to the active tick. |
| Arrows | 44×44 circles with a 1 px cream/28 border and a 14 px chevron (stroke 1.4, cream). Hover: border cream/70 and background cream/6, 200 ms `settle`. Press: scale .96 down in 120 ms, back in 250 ms. At the ends: `aria-disabled="true"` at opacity .32, cursor default. They stay focusable and are not hidden like Apple's, because a visible dimmed state tells people they have reached the end. |
| Visual panel | Square, max 600 px on desktop, full width on phones; radius 24 px (desktop) / 18 px (phones). Background `--peach` `#efe7da`, inset hairline `rgba(42,36,32,.06)`, shadow `0 60px 120px -60px rgba(0,0,0,.6)`. |
| Focus ring | 2 px cream outline, 3 px offset (the site style), never animated |
| Section chrome | `stage-bg`, beam and grain as on the other dark sections. **No FrameLines or corner labels**, so it does not read as a second hero. `data-header="dark"`. |

### 2.2 Controls, keyboard and gestures

| Input | Behaviour |
|---|---|
| **‹ / › buttons** | Step −1 / +1. **No wrap.** At 01 the previous button gets `aria-disabled`; at 08 the next button does. Focus stays on the button. |
| **Tabs (ticks)** | Click selects. Keyboard follows the APG with **automatic activation**: ←/→ move and select, wrapping at the ends; Home/End jump to the first/last. Roving `tabindex` (0 on the active tab, −1 on the rest). |
| **←/→ inside the section** | When focus is in the stepper but not on a tab (the panel, an arrow or the contact link), ←/→ step without wrapping. Tabs handle their own keys, so a key is never handled twice. |
| **←/→ while in view** (Apple pattern) | A `window` keydown handler, active only while at least 60% of the stepper is in the viewport **and** `document.activeElement === document.body`. It ignores modifiers, form fields and contenteditable, and does nothing while a dialog or menu is open (lightbox, mobile menu). A held key repeats at most once every 250 ms. |
| **Touch swipe** | Pointer Events on the visual panel and the text column, with `touch-action: pan-y` so vertical page scroll is never captured. Mouse is ignored, so text stays selectable.<br>• **Axis lock:** decided after 10 px of travel; the gesture is horizontal if `|dy| ≤ 0.7·|dx|` (about 35°, stricter than Swiper's 45° so scrolling always wins on diagonals).<br>• **Commit:** when `|dx| ≥ max(48 px, 15% of the panel width)`, or on a flick (`|dx| ≥ 24 px` within 300 ms). Swiping left goes to the next item.<br>• **Drag-follow:** the *visual layer only* follows at `dx·0.25`, clamped to ±28 px (direct manipulation, the one allowed exception). On release it returns in 300 ms `settle`, then the cross-fade runs.<br>• At the ends, the visual follows with resistance (`dx·0.1`) and does not commit. |
| **Trackpad two-finger swipe** (nice to have) | `wheel` events with `|deltaX| > 1.5·|deltaY|` accumulate; 60 px within one gesture steps once, then input is locked until 220 ms pass without a wheel event. Add `overscroll-behavior-x: contain` on the section so Chrome's back-swipe does not fire. Lenis leaves horizontal deltas alone, so vertical smoothing is unaffected. |
| **Deep link** | `#spurning-1` … `#spurning-8` (the panel ids) select that item on load and Lenis-scroll to the section (`scroll-margin-top` handles the header). **Never write the hash on change**, so the URL is not hijacked. The old anchors `#af-hverju` and `#spurningar` become empty `<span id>` aliases at the top of the section (see §7). |

### 2.3 ARIA and focus

```tsx
<section id="meira" aria-labelledby="meira-title" data-header="dark" className="stage-bg …">
  <span id="af-hverju" className="anchor-alias" /> <span id="spurningar" className="anchor-alias" />
  <header>…eyebrow… <h2 id="meira-title">…</h2> <p>…intro…</p></header>

  <div className="meira" data-mode="live|stills">
    <div className="meira-controls">
      <p className="meira-count" aria-hidden="true"><span>01</span> / 08</p>
      <div role="tablist" aria-label="Spurningar" className="meira-ticks">
        {items.map((it, i) => (
          <button role="tab" id={`spurning-tab-${i+1}`} aria-selected={i===a}
                  aria-controls={`spurning-${i+1}`} tabIndex={i===a ? 0 : -1} key={it.id}>
            <span className="sr-only">{it.title}</span><span aria-hidden="true" className="tick" />
          </button>))}
        <span aria-hidden="true" className="meira-indicator" />
      </div>
      <button className="meira-arrow" aria-label="Fyrri spurning" aria-disabled={a===0}>…</button>
      <button className="meira-arrow" aria-label="Næsta spurning" aria-disabled={a===7}>…</button>
    </div>

    <div className="meira-panels">
      {items.map((it, i) => (
        <div role="tabpanel" id={`spurning-${i+1}`} aria-labelledby={`spurning-tab-${i+1}`}
             tabIndex={0} data-active={i===a} key={it.id}>
          <h3 className="meira-title">{it.caps} <em>{it.accent}</em> {it.capsAfter}</h3>
          {it.answer.map(p => <p className="meira-answer">{p}</p>)}
        </div>))}
    </div>

    <p className="sr-only" aria-live="polite" aria-atomic="true">{announce}</p>

    <figure className="meira-visual" role="img" aria-label={items[a].alt}>
      <canvas aria-hidden="true" /> <canvas className="meira-ghost" aria-hidden="true" />
      <img className="meira-still" alt="" aria-hidden="true" />
      <div className="meira-overlay" aria-hidden="true">{/* figure + callouts */}</div>
    </figure>
  </div>
  <a className="meira-contact label-caps" href="tel:8535147">Aðrar spurningar · 853 5147</a>
</section>
```

- **Accessible names.**
  - Each tab is named by the full question, so a screen reader says something like "Hversu mörgum bæklingum er dreift?, flipi, valinn, 3 af 8". The visible tick is decorative.
  - The counter is `aria-hidden` because the tab already gives the position.
  - Each panel is labelled by its tab (`aria-labelledby`), so its name is the question. The visible H3 inside the panel keeps the heading outline intact.
- **Live region.**
  - **Arrow, swipe, section-key and trackpad changes** update it to: `Spurning 3 af 8: Hversu mörgum bæklingum er dreift?`
  - **Tab-key changes** do not update it, because the focused tab already announces itself (no double speech).
- **The visual.**
  - `role="img"` whose `aria-label` is the active item's alt text. It is not live: it updates silently.
  - The overlay labels are `aria-hidden` because they repeat the answer.
- **Focus never moves on its own:**
  - Arrows keep focus.
  - Tabs keep focus.
  - Deep-link selection does not move focus either; only the scroll changes.

### 2.4 Motion (our tokens: `src/components/motion/tokens.ts`)

| Moment | Element | Property | Duration | Easing |
|---|---|---|---|---|
| **Section enters** (shared observer, −14%) | eyebrow / H2 lines / accent / intro | the site's `Sequence` roles | 600 / 1000 (+90 per line) / 900 (+150) / 900 | breathe / arrive / arrive / breathe+settle |
| | visual panel | `Curtain`: `clip-path inset(100% 0 0 0 round 24px)` → `inset(0 round 24px)`; inside it the canvas or still scales 1.06 → 1 | 1200 / 1600 | curtain / arrive |
| | vignette 01 | starts at +400 ms into the curtain, plays its beat once | 1.5–3 s | per storyboard |
| | controls | just there: CTAs and controls never animate in | n/a | n/a |
| **Item change** | outgoing panel | opacity 1 → 0, y 0 → −8 px, then `visibility:hidden` | 280 | leave |
| | incoming title | mask lines `translateY(105%)` → 0, 90 ms per line; the accent follows 150 ms after the last line starts. Starts at +320 ms. | 900 | arrive |
| | incoming answer | opacity 0 → 1, y 12 → 0, starting 200 ms after the title | 600 / 700 | breathe / settle |
| | counter `01` | direction-aware digit mask swap: next = old digit up and out, new digit up and in; previous = the reverse | 500 | arrive |
| | tick indicator | `translateX` to the new tick (Apple: 280–320 ms ease-out) | 320 | settle |
| | visual | the ghost canvas (snapshot of the outgoing frame) fades out while the new vignette starts at `t = 0`, 120 ms later | 500 | breathe |
| | callouts | outgoing labels fade out; incoming ones follow the vignette's beats: hairline draws, then text fades in with an 8 px rise | 200 · 600 · 400 | leave · glide · settle |
| **Interrupt** (a new change mid-transition) | everything | Retarget from the current state. Snapshot the canvas as it is now (not the end frame); the outgoing text exits from its current opacity; the new title starts at once. If the user taps again before the 320 ms text gap ends, skip that item's text entrance (show it instantly) so rapid clicking never queues animations. | n/a | settle for retargets (Apple uses ease-out when interrupting) |
| **Hover / press** | arrows, ticks | border / opacity / scale | 200 / 120↓ 250↑ | settle |
| **Reduced motion** | text + still | opacity cross-fade only; no masks, no translate, no digit roll, no drag-follow; the indicator jumps | 400 | breathe |

The whole change, from tap to the answer at rest, takes about 1.2 s; the vignette keeps going to 3 s at most and then holds. That stays under the bible's 1.8 s rule for text and its 3-moving-things rule for scenes (the vignette's own beat counts as one).

**Autoplay:** none.
- Items never advance by themselves.
- On the first visit, item 01's beat plays once when at least 50% of the section is in view.
- Scrolling back to an item that has finished does **not** replay it; the held frame stays.
- Re-selecting the active item does nothing.
- Selecting another item, or coming back to one, plays its beat from `t = 0`, because the brief says it "animates when it becomes active".

### 2.5 Rendering, fallbacks and performance

- **Mode.**
  - `live` when `supportsWebGL()` is true **and** reduced motion is off **and** the GL is not software (check `WEBGL_debug_renderer_info` with `/swiftshader|llvmpipe|softpipe|software|basic render/i`, research 02 §7) **and** `(navigator.deviceMemory ?? 8) > 2`.
  - Otherwise `stills`: the stepper behaves the same, but the panel shows `<img>` end frames.
- **Loading.**
  - `import("@/three/vignettes")` when the section is within one viewport (IntersectionObserver `rootMargin: "100% 0px"`).
  - One `createStage({ canvas, background: PAL.peach, fog: [16, 30], fov: 26, maxDpr: 2 | 1.75 | 1.25, shadowSize: 1024 })`, with the warm look (AgX + look, warm studio, sun on `SUN_DIR`).
  - The still shows until the first live frame, then cross-fades out (500 ms breathe).
- **Vignettes.**
  - Build item k on first activation.
  - Prebuild k+1 and k−1 in `requestIdleCallback` (2 s timeout), then call `await renderer.compileAsync(root, camera)`.
  - Keep them in a `Map` and dispose all on unmount (every texture slot, then `renderer.dispose()` and `forceContextLoss()`).
- **Render on demand.**
  - rAF runs only while a beat is playing (`t < 1`) or labels are settling, and once on resize.
  - After the hold frame, render nothing.
  - If the section is off-screen, hold the clock: when a beat was running as the section left, jump to `t = 1` on return.
- **Ghost snapshot.**
  - In the same task as the last `render()` before a change: `ghostCtx.drawImage(glCanvas, 0, 0)`.
  - The drawing buffer is still valid in that task, so `preserveDrawingBuffer` is not needed (verified in research 02 §9).
- **Context loss** switches to stills.
- **Per-vignette budget:** ≤ 40 draw calls including the shadow pass; ≤ 60k triangles; 1 shadow-casting light (1024²); canvas textures ≤ 512²; one material per small object (see research 02's draw-call trap).
- **Stills.**
  - Each vignette at `t = 1`, captured from the lab with the same engine (deterministic), as 1200×1200 (desktop) and 720×720 (phones) WebP at quality 82, about 40–80 KB each.
  - Paths: `/svif/meira/heim-01.webp` … `heim-08`, `fyr-01` … `fyr-08` (+ `-m`).
  - Used for: reduced motion, no WebGL, software GL, the no-JS list, the loading poster and the ghost fallback.
- **No JS** (`html:not(.js)`): the eight items render as a stacked list (still, number, title, answer) and the controls are hidden. This matches the story's static list, and all the Q&A stays in the HTML for search engines.

### 2.6 QA checklist (for the build agent)

- [ ] Every input works: mouse, keyboard (Tab into the tablist, ←/→/Home/End, Tab to the panel, the arrows), trackpad, iPhone Safari swipe and Android Chrome swipe. A vertical scroll that starts on the panel always scrolls the page.
- [ ] VoiceOver and NVDA: each tab reads its question with "x af 8"; the arrows announce the new item once; nothing is read twice.
- [ ] Rapidly tapping the arrows eight times never stacks animations or leaves two answers visible.
- [ ] No layout shift when changing items (check the CLS overlay); the controls are pixel-stable across all eight.
- [ ] Reduced motion: no vignette motion, 400 ms fades only. No JS: the stacked list. No WebGL: stills.
- [ ] For every vignette, check frame by frame (lab, `t` from 0 to 1 in 0.01 steps) that nothing passes through the disc, the tray or another object, and that no shadow pops (§4.1).
- [ ] On a mid-range Android: no frame over 33 ms during a beat; zero frames rendered while idle.

---

## 3. Copy deck (Icelandic)

House style (05 §1): short declaratives in spoken Icelandic.

**Banned:**
- *einmitt þegar*
- *lausn/lausnir*
- *raunverulegur*
- rhetorical questions in headings
- exclamation marks
- triplets that are rhythm rather than a real list
- a possessive before its noun

**Address:**
- Home page: *þú* (the H1's *ykkur* is the one exception).
- /fyrirtaeki: *þið*.

**Numbers:** "350–500" with an en dash; "1.050–1.500" (a dot for thousands); "um 250".

### 3.1 Hero

**Home (/)**

| Element | Copy | Notes |
|---|---|---|
| Tagline | SVIF · Nýji kaflinn | keep [S] |
| H1 | Við tengjum ykkur við *alla nýja húseigendur* á höfuðborgarsvæðinu. | owner, verbatim [E1] |
| Sub (9 words) | **Í hverri viku fá nýir húseigendur Nýja kaflann heim.** | Carries the owner's "weekly is important" [E2]. Putting "Í hverri viku" first makes it read as the delivery rhythm, not as each owner receiving it every week. *If the lead wants to keep the letterbox image:* "Nýir húseigendur fá Nýja kaflann inn um lúguna." (7 words, current), with "Sent í hverri viku" as the bottom-right corner (the back-page line already sits in the footer). |
| CTA 1 | Bóka pláss | solid |
| CTA 2 | Svona virkar það | outline (05 §3.2) |
| Corner, top-left | Velkomin | echo of the printed cover |
| Corner, top-right | 65°N · 19°W | |
| Corner, bottom-left | **350–500 heimili á mánuði** | was "Um 500 heimili á mánuði" [E2]. En dash, no spaces. |
| Corner, bottom-right | Hannað, prentað og sent af SVIF | the flyer's back page [S] |
| Facts row | **none** | Every fact is already in the sub or the corners; a fifth tier works against the owner's "tighter" request. If the layout needs one on wide screens: "Eitt fyrirtæki í hverjum flokki" alone, with the roof mark. |

Corners stay `aria-hidden` as decoration: the same facts are spoken elsewhere (item 3, the sub).

**/fyrirtaeki**

| Element | Copy | Notes |
|---|---|---|
| Tagline | SVIF · Fyrir ný fyrirtæki | ("Nýr rekstur" is still an unapproved name, 05 §9) |
| H1 | Við tengjum ykkur við *öll ný fyrirtæki* á Íslandi. | keep [S] |
| Sub (9 words) | Nýstofnuð fyrirtæki fá bækling með sérkjörum á fyrstu vikunum. | keep [S] |
| CTAs | Bóka pláss · Horfa á myndbandið (FilmButton, short label "Myndband") | keep |
| Corners | Velkomin · 65°N · 19°W · Um 250 eintök á mánuði · Hannað, prentað og sent af SVIF | keep [S] |
| Facts row | none (fallback: "Um allt land") | **Do not write "vikulega" on /fyrirtaeki:** the business cadence is not confirmed (§8). |

### 3.2 Home story: "Svona virkar það", 6 steps

**Stage header** (fixed at the top of the pinned stage): **SVONA VIRKAR ÞAÐ** · *frá sölu að póstlúgu* · `01 / 06`

That is caps "Svona virkar það" + accent "frá sölu að póstlúgu"; the counter is label-caps.

**Chapter labels.** Things take the definite form (Vandinn, Bæklingurinn, Sérkjörin); activities stay indefinite (Hönnun, Prentun, Dreifing). The same rule applies on /fyrirtaeki, so both pages use "Dreifing".

| # | Chapter | TITLE (≤ 9 words, one accent) | Line (≤ 14 words) | In-scene words (for the story owners) |
|---|---|---|---|---|
| 01 | Vandinn | Um 80% nýrra húseigenda *ráðast í framkvæmdir* eftir húsakaup (9) [E1] | Nýju heimili fylgja ótal verkefni og erfitt er að vita hverjum á að treysta. (14) [L, from the flyer's sentence + BIBLE-R2 §3] | Sign texture "SELT"; callouts Tryggingar · Málning · Húsgögn · Gluggar · Gólfefni · Rafmagn. Small note under the line: "Heimild: HIRI, Bandaríkin 2025" (keep). |
| 02 | Bæklingurinn | *Þess vegna* bjuggum við til SVIF (6) [E1]. Accent first: caps empty, accent "Þess vegna", capsAfter "bjuggum við til SVIF". | Nýji kaflinn er bæklingur sem kemur inn um lúguna hjá nýjum húseigendum. (12) [S] | none; the cover texture reads NÝJI KAFLINN |
| 03 | Sérkjörin | Traust fyrirtæki með afslátt *fyrir hvert verkefni* (7) [E2] | Nýir húseigendur fá sérkjör hjá fyrirtækjunum sem þeir þurfa á að halda. (12) [E2] | Only the real coupon faces (Parki, Ormsson, Íspan, Maus). Each lands by its need: Parki → Gólfefni, Íspan → Gluggar, Ormsson → Rafmagn, Maus → Tryggingar. |
| 04 | Hönnun | Við *hönnum* auglýsinguna þína (4) [S] | Þú sendir merki og tilboð og færð próförk til samþykktar fyrir prentun. (12) [S/E1] | none (the guides and blocks are the explanation) |
| 05 | Prentun | Við *prentum* bæklinginn (3) [S] | 350–500 eintök á mánuði, eitt fyrir hvert nýtt heimili. (9) [E2; one copy per home is [L]] | none |
| 06 | Dreifing | Og *sendum* vikulega til allra nýrra húseigenda á höfuðborgarsvæðinu (9) [E2] | Þannig fær fólk afsláttinn þinn þegar það þarf á þjónustunni þinni að halda. (13) [E2, the owner's benefit sentence] | Map label "Höfuðborgarsvæðið"; final callout at the door slot "Inn um lúguna" |

**Notes:**
- **"Lausnin" (BIBLE-R2 §3, step 02) breaks the copy rules** (BIBLE §5 and 05 §1 ban *lausn/lausnir*), so the chapter is "Bæklingurinn".
- The accents on steps 04–06 fall on the verbs (hönnum, prentum, sendum), so the three titles read as one sentence across the cut, and each verb names the animation under it.
- "höfuðborgarsvæðinu" is 18 letters. At the phone title size, check that it fits in 358 px. If not, drop the tracking from .07em to .05em, or use soft hyphens `höfuð&shy;borgar&shy;svæðinu`.
- Ready to paste into `story-copy.ts` (that file belongs to the story agent; the lead merges):

```ts
export const HOME_STEPS: StoryStep[] = [
  { n: "01", chapter: "Vandinn", title: "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup",
    body: "Nýju heimili fylgja ótal verkefni og erfitt er að vita hverjum á að treysta.",
    note: "Heimild: HIRI, Bandaríkin 2025" },
  { n: "02", chapter: "Bæklingurinn", title: "Þess vegna bjuggum við til SVIF",
    body: "Nýji kaflinn er bæklingur sem kemur inn um lúguna hjá nýjum húseigendum." },
  { n: "03", chapter: "Sérkjörin", title: "Traust fyrirtæki með afslátt fyrir hvert verkefni",
    body: "Nýir húseigendur fá sérkjör hjá fyrirtækjunum sem þeir þurfa á að halda." },
  { n: "04", chapter: "Hönnun", title: "Við hönnum auglýsinguna þína",
    body: "Þú sendir merki og tilboð og færð próförk til samþykktar fyrir prentun." },
  { n: "05", chapter: "Prentun", title: "Við prentum bæklinginn",
    body: "350–500 eintök á mánuði, eitt fyrir hvert nýtt heimili." },
  { n: "06", chapter: "Dreifing", title: "Og sendum vikulega til allra nýrra húseigenda á höfuðborgarsvæðinu",
    body: "Þannig fær fólk afsláttinn þinn þegar það þarf á þjónustunni þinni að halda." },
];
// accents (if StoryStep gains caps/accent/capsAfter): 01 "ráðast í framkvæmdir", 02 "Þess vegna" (first),
// 03 "fyrir hvert verkefni", 04 "hönnum", 05 "prentum", 06 "sendum"
```

### 3.3 Business story (/fyrirtaeki): "Svona virkar það", 4 steps

**Stage header:** **SVONA VIRKAR ÞAÐ** · *frá stofnun að póstkassa* · `01 / 04`

| # | Chapter | TITLE | Line | In-scene words |
|---|---|---|---|---|
| 01 | Ný fyrirtæki | Hundruð *nýrra fyrirtækja* í hverjum mánuði (6) [S, Hagstofa supports it] | Öll þurfa þau sömu þjónustu og flest er valið á fyrstu vikunum. (12) [S/E2] | "NÝTT" signs on the doors; callouts Bókhald · Tryggingar · Vefsíða · Banki · Tölvur · Hönnun |
| 02 | Bæklingurinn | Sérkjör frá þeim *sem nýr rekstur þarf* (7) [E2] | Eitt fyrirtæki í hverjum flokki. Auglýsingin ykkar stendur ein. (9) [S/E2] | The category page lights up **one at a time**: Bókhald → Tryggingar → Vefsíða → Banki → Tölvur → Hönnun. Each lifts briefly in rose. |
| 03 | Kerfið | Kerfið finnur *nýskráð fyrirtæki* (4) [S] | Við fylgjumst með nýskráningum og vitum hvert bæklingurinn á að fara. (11) [S/L] | "NÝTT FYRIRTÆKI" on each lit company. The counter counts only the companies visible in the shot (01 → 06) with the label "Ný fyrirtæki", so the number is true to the picture, not a live statistic. **Write no "gervigreind" or "AI"** (§8). |
| 04 | Dreifing | Við *sendum* bæklinginn til nýrra fyrirtækja um allt land (9) [S] | Um 250 eintök á mánuði, á fyrstu vikum rekstrarins. (8) [S] | Final callout at the office door: "Í póstkassann" (it echoes the header's "að póstkassa") |

```ts
export const BIZ_STEPS: StoryStep[] = [
  { n: "01", chapter: "Ný fyrirtæki", title: "Hundruð nýrra fyrirtækja í hverjum mánuði",
    body: "Öll þurfa þau sömu þjónustu og flest er valið á fyrstu vikunum." },
  { n: "02", chapter: "Bæklingurinn", title: "Sérkjör frá þeim sem nýr rekstur þarf",
    body: "Eitt fyrirtæki í hverjum flokki. Auglýsingin ykkar stendur ein." },
  { n: "03", chapter: "Kerfið", title: "Kerfið finnur nýskráð fyrirtæki",
    body: "Við fylgjumst með nýskráningum og vitum hvert bæklingurinn á að fara." },
  { n: "04", chapter: "Dreifing", title: "Við sendum bæklinginn til nýrra fyrirtækja um allt land",
    body: "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins." },
];
// accents: 01 "nýrra fyrirtækja", 02 "sem nýr rekstur þarf", 03 "nýskráð fyrirtæki", 04 "sendum"
```

### 3.4 "Meira um hugmyndina": header and the 16 items

**Header** (the same on both pages):

| Element | Copy | Tag |
|---|---|---|
| Eyebrow | Spurt og svarað | [L] |
| H2 | Meira um *hugmyndina.* | the owner's name for the section [E2] |
| Intro | Af hverju þetta virkar og hvernig samstarfið gengur fyrir sig. | [L] |
| Under the stepper | Aðrar spurningar · 853 5147 (a `tel:` link) | [L]; the phone number is [S] |
| UI strings | tablist "Spurningar"; arrows "Fyrri spurning" / "Næsta spurning"; live region "Spurning {n} af 8: {spurning}" | [L] |

Copy shape for `src/content/meira-copy.ts`:

```ts
export interface MeiraItem {
  id: string;                 // "spurning-1" (also the panel id / deep link)
  caps: string; accent: string; capsAfter?: string;
  title: string;              // the plain question (tab name, live region)
  answer: string[];           // 1–3 short sentences, rendered as one paragraph
  labels: { text: string; at: string }[];   // DOM callouts (≤ 4, ≤ 3 words) — `at` = anchor id in the vignette
  figure?: { value: string; unit: string }; // one big number, fixed top-left of the panel
  alt: string;
  vignette: "crowd" | "timeline" | "weeks" | "iceland" | "kept" | "address" | "months" | "tray" | "typecase";
  still: string;              // "/svif/meira/heim-01.webp"
}
```

#### Home items (/), in the BIBLE-R2 §5 order

| # | TITLE (caps · *accent*) | Answer | Overlay | Alt text |
|---|---|---|---|---|
| **01** "Af hverju virkar þetta" | AF HVERJU *virkar þetta?* | Mörg fyrirtæki keppast um nýja húseigendur. [E2] Afsláttur á réttum tíma eykur líkurnar á að hringt sé í þig. [E2] Nýji kaflinn kemur honum í hendur þeirra. [S] | "Mörg fyrirtæki" · "Tilboðið þitt" | Lítið hús og sjö eins fyrirtækjaspjöld í hálfhring fyrir framan það. Eitt spjaldanna ber rósrauðan afsláttarmiða og lína liggur frá dyrum hússins að því. Hin dofna. |
| **02** "Rétt tímasetning" | HVENÆR *berst bæklingurinn?* | Á fyrstu vikunum eftir kaupin, á meðan fólk er að koma sér fyrir og skipuleggja framkvæmdir. [L "first weeks" · E1 "koma sér fyrir, skipuleggja framkvæmdir"] Þess vegna sendum við í hverri viku. [E2] | "Kaupin" · "Nýji kaflinn" · "Framkvæmdir" | Kvarði með sex merkjum eins og tímalína. Lykill liggur við það fyrsta, Nýji kaflinn við annað og hlutir fyrir framkvæmdir birtast við hin. |
| **03** "Hversu mörgum er dreift" | HVERSU MÖRGUM BÆKLINGUM *er dreift?* | 350–500 á mánuði, til nýrra húseigenda á höfuðborgarsvæðinu. [E2] Dreift er í hverri viku. [E2] Á þremur mánuðum nær auglýsingin þín til 1.050–1.500 heimila. [D: 350–500 × 3, E1 three-month term] | figure **350–500** / Á MÁNUÐI · "Í hverri viku" | Fjórir jafnháir staflar af bæklingum á dagatali með fjórum reitum, einn fyrir hverja viku mánaðarins. |
| **04** "Þarf afslátt" | ÞARF ÉG AÐ BJÓÐA *afslátt?* | Nei, en við mælum eindregið með því. [E2] Auglýsingu er hent, en afsláttur er geymdur þar til þörfin vaknar. [S/E1] | "Auglýsingu hent" · "Afsláttur geymdur" | Venjuleg auglýsing endar í ruslafötu en rósrauður afsláttarmiði er festur á ísskáp með segli. |
| **05** "Þarf afsláttarkóða" | ÞARF ÉG *afsláttarkóða?* | Nei. [E2] Í kerfinu okkar sérðu öll heimili sem fengu bæklinginn. [E2] Viðskiptavinurinn nefnir heimilisfangið sitt og þú staðfestir það þar. [E2] | "Heimilisfangið" · "Staðfest" | Sími og fartölva. Á skjánum er listi yfir heimili og eitt þeirra er merkt með haki. |
| **06** "Hvernig er greitt" | HVERNIG *er greitt?* | Mánaðarlega. [E2] Verðið fer eftir því hve margar síður þú kaupir. [E2] Samningurinn er til þriggja mánaða í senn. [E1, see §8] | "Eftir síðufjölda" · "Mánaðarlega" · "3 mánuðir í senn" | Opinn bæklingur þar sem tvær síður lyftast upp. Við hliðina raðast þrír reikningar, einn fyrir hvern mánuð. |
| **07** "Hvað er innifalið" | HVAÐ ER *innifalið?* | Hönnun, prentun og dreifing. [E2] Þú færð þrívíddarmynd af bæklingnum, eintak sent til þín og aðgang að kerfinu. [E2] Í hverjum mánuði förum við saman yfir árangurinn og bætum auglýsinguna. [E2] | "Hönnun & prentun" · "Dreifing" · "Þrívíddarmynd" · "Mánaðarlegt samtal" | Bakki með sex hólfum: penni, prentaðar síður, umslag, bæklingur á standi, fartölva og tvær talblöðrur. |
| **08** "Leyfið þið samkeppnisaðila" | FÁ KEPPINAUTAR MÍNIR *líka pláss?* | Nei. [E2] Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin þín stendur ein. [E2/S] | "Flokkurinn þinn" · "Enginn keppinautur" | Leturkassi með átta hólfum og einu spjaldi í hverju. Eitt spjaldið er rósrautt. Annað spjald kemst ekki að og hverfur. |

#### Business items (/fyrirtaeki), the same set adapted (*þið*)

| # | TITLE | Answer | Overlay | Alt text |
|---|---|---|---|---|
| **01** | AF HVERJU *virkar þetta?* | Mörg fyrirtæki keppast um viðskipti nýrra fyrirtækja. [E2] Sérkjör á réttum tíma auka líkurnar á að leitað sé til ykkar. [E2] Bæklingurinn kemur þeim í hendur eigendanna. [S] | "Mörg fyrirtæki" · "Sérkjörin ykkar" | Lítil skrifstofubygging og sjö eins fyrirtækjaspjöld í hálfhring fyrir framan hana. Eitt spjaldanna ber rósrauðan afsláttarmiða og lína liggur frá dyrunum að því. Hin dofna. |
| **02** | HVENÆR *berst bæklingurinn?* | Á fyrstu vikum rekstrarins, á meðan verið er að velja bókhald, banka og tryggingar. [S] Þá er flest valið. [S] | "Skráning" · "Bæklingurinn" · "Fyrstu vikurnar" | Kvarði með sex merkjum eins og tímalína. Skráningarskjal liggur við það fyrsta, bæklingurinn við annað og skrifstofuhlutir birtast við hin. |
| **03** | HVERSU MÖRGUM BÆKLINGUM *er dreift?* | Um 250 á mánuði, til nýstofnaðra fyrirtækja um allt land. [S] Á þremur mánuðum nær auglýsingin ykkar til um 750 fyrirtækja. [D: 250 × 3; the three-month term is [S] on /fyrirtaeki] | figure **Um 250** / Á MÁNUÐI · "Um allt land" | Upphleypt Íslandskort. Rósrauðir prjónar birtast í bæjum um allt land. |
| **04** | ÞURFUM VIÐ AÐ BJÓÐA *sérkjör?* | Nei, en við mælum eindregið með því. [E2] Auglýsingu er hent, en sérkjör eru geymd þar til þörfin vaknar. [S] | "Auglýsingu hent" · "Sérkjör geymd" | Venjuleg auglýsing endar í ruslafötu en rósrauður afsláttarmiði er festur á korktöflu. |
| **05** | ÞURFUM VIÐ *afsláttarkóða?* | Nei. [E2] Í kerfinu okkar sjáið þið öll fyrirtæki sem fengu bæklinginn. [E2 adapted] Viðskiptavinurinn gefur upp nafn fyrirtækisins eða kennitölu og þið staðfestið það þar. [L, BIBLE-R2 §5 adaptation] | "Nafn eða kennitala" · "Staðfest" | Sími og fartölva. Á skjánum er listi yfir fyrirtæki og eitt þeirra er merkt með haki. |
| **06** | HVERNIG *er greitt?* | Mánaðarlega. Verðið fer eftir því hve margar síður þið kaupið. [E2, assumed to hold for the business booklet too, §8] Samningurinn er til þriggja mánaða í senn. [S] | "Eftir síðufjölda" · "Mánaðarlega" · "3 mánuðir í senn" | Opinn bæklingur þar sem tvær síður lyftast upp. Við hliðina raðast þrír reikningar, einn fyrir hvern mánuð. |
| **07** | HVAÐ ER *innifalið?* | Hönnun, prentun og dreifing. Þið fáið þrívíddarmynd af bæklingnum, eintak sent til ykkar og aðgang að kerfinu. Í hverjum mánuði förum við saman yfir árangurinn og bætum auglýsinguna. [E2, assumed for business] | as home | as home |
| **08** | FÁ KEPPINAUTAR OKKAR *líka pláss?* | Nei. Aðeins eitt fyrirtæki í hverjum flokki, svo auglýsingin ykkar stendur ein. [E2/S] | "Flokkurinn ykkar" · "Enginn keppinautur" | as home |

**Grammar notes on the tricky constructions** (all checked):

| Construction | Rule |
|---|---|
| *keppast um* + accusative | (nýja húseigendur, viðskipti) |
| *eykur líkurnar á að hringt **sé** í þig* and *að leitað **sé** til ykkar* | subjunctive after *líkur á að* |
| *kemur honum í hendur þeirra* | *honum* = afslættinum, dative; *koma e-u í hendur e-s* is idiomatic |
| *mælum með **því*** | dative: the act of offering |
| *Auglýsingu er hent* | dative stays in the passive (05 §0.3) |
| *sérkjör eru geymd* | neuter plural participle |
| *þurfa **á** e-u **að halda*** | preposition stranded in *sem þeir þurfa á að halda* |
| *fer eftir því hve margar síður þú kaupir* | indicative is natural; 2nd singular subjunctive is identical anyway |
| *nær til* + genitive | (1.050–1.500 heimila, um 750 fyrirtækja) |
| *fyrirtæki með afslátt* | accusative (*vera með e-ð*) |
| *Nýju heimili fylgja ótal verkefni* | dative (the flyer's own sentence) |
| *eftir síðufjölda* | dative |
| *Öll þurfa **þau*** | neuter, agreeing with *fyrirtæki*. On the home page the plural people are rephrased as *fólk … það* to avoid the *þeir/þau* question. |

#### How the old FAQ folds in (nothing useful is lost)

| Old question (home FAQ) | Where it goes now | What changed |
|---|---|---|
| Hvar og hversu oft er bæklingnum dreift? | item 03 | Um 500 becomes 350–500 [E2] and weekly is added [E2]. "Um 1.500 heimila" becomes 1.050–1.500 [D]. **Dropped:** "Við bætum stærstu þéttbýliskjörnum landsins við…" [E1], because it is a forward-looking promise; the owner may restore it. |
| Hvað kostar að auglýsa? | item 06 | The old "price by size and placement plus number of homes; you pay per distribution" is **replaced** by R2 "monthly, by pages" [E2]. The owner's round-2 word wins. |
| Hver hannar auglýsinguna? | story step 04 line + item 07 | "próförk til samþykktar fyrir prentun" kept [S/E1] |
| Hver er uppsagnarfresturinn? | item 06, 3rd sentence | "Þú gerir samning um þrjá mánuði í senn" becomes "Samningurinn er til þriggja mánaða í senn." [E1] **Confirm it still holds with monthly payment** (§8). |
| Af hverju eru afslættir í bæklingnum? | item 04 | "Auglýsingu er hent, en afsláttur … er geymdur" [S/E1] |
| /fyrirtaeki: Hverjir fá bæklinginn? · Hvað kostar? · Er bara eitt fyrirtæki í hverjum flokki? · Hver hannar? · Uppsagnarfrestur · Af hverju sérkjör? | B03 · B06 · B08 · B07 · B06 · B04 | the same mapping |

---

## 4. Vignettes: the shared kit and the 16 storyboards

### 4.1 Shared rules

Every vignette:
- is a small clay diorama in the site's warm look (research 02);
- is a **pure function of `t ∈ [0,1]`** over its duration, so the site, the stills and any future film match;
- holds still at `t = 1`.

They must not look like the stories. The stories use a long rectangular plinth with six need-objects, the aerial town, the booklet opening with page turns, the press, offices with "NÝTT" signs, the category page lighting up, the orb and the van. Every vignette therefore stands on the **same round clay disc**, like a museum piece on a pedestal. This is the section's unifying device; the stories never use it.

**World and camera:**
- **Disc:** radius R = 2.4, height 0.14, top surface at y = 0, a 0.04 bevel (LatheGeometry profile), colour `#ddd3c3`.
- **Floor:** a peach plane at y = −0.14 with `ShadowMaterial` opacity .16. Background = fog = `PAL.peach` (`#efe7da`), so the canvas edge dissolves into the CSS panel (research 02 §5: background hex = CSS hex).
- **Axes:** +z is the front, toward the camera; +x is right.
- **Camera:** default fov 26°, elevation 30°, azimuth +16° (to the right of front), target (0, 0.32, 0.05). Fit the composition's bounding sphere to 82% of `min(vfov, hfov)`. Hold still after the beat; an optional dolly-in of at most 4% using `glide`.
- **Sun:** `SUN_DIR`, `aimSun((0, 0.4, 0), 3.4)`, `shadow.mapSize` 1024, radius 3, texel-relative bias (research 02 §3).
- **Materials:**
  - objects `clay(PAL.clay)`;
  - warm variants `PAL.clayWarm` and `PAL.clayShade`;
  - the single accent `accent(PAL.rose)`;
  - paper `paper()`.

  No metal, no glow, no particles.

**Entrances, exits and the no-interpenetration rule (BIBLE-R2 §1):**

| Helper (`vignettes/kit.ts`) | What it does |
|---|---|
| `settle(o, t, a, b, { from = 0.35 })` | y from base + from·(1−k) with `arrive`; opacity follows `breathe(min(1, k/0.6))` |
| `grow(o, t, a, b)` | `scale.y` from 0.001 → 1 with `settle`. Geometry is authored **with its pivot on the base** (`translate(0, h/2, 0)`), so it reads as being built. |
| `recede(o, t, a, b, { to = 0.3, lift = 0.03 })` | opacity 1 → to, colour lerp 60% toward the disc colour, small lift |
| `fadeOut(o, t, a, b, { lift = 0.12 })` | exit by opacity with a lift (never shrink, never sink) |
| `glide(o, t, a, b, from, to)` | moves along the disc surface (y fixed) or along a smooth arc through the air, never through another object |
| `labelAt(id, world, anchor?, t, a, b)` | pushes a `WorldLabel`: the hairline draws over 0–60% of [a, b], the text over 40–100% |

**Material rule for fades:**
- Every animated object gets its own material clone.
- Set `transparent = true` only while opacity < 1 (keeps sorting and depth correct).
- **Set `castShadow = false` while opacity < 0.98** (shadow maps ignore opacity, so a ghost would cast a full shadow). Use the object's contact blob instead, at `blob.opacity = 0.55·opacity`.

**Labels on the light panel:**
- ink type (`label-caps` 10.5–11 px, `--ink` at 72%) on an ink/30 hairline;
- at most 2 labels visible at once;
- labels keep 7% clear of the panel edges.

The **figure** (big number) is Jost 300, 56–80 px (desktop) / 40–52 px (phones), ink, with its unit in label-caps beneath. It sits fixed at the panel's top-left inset (24 px / 16 px) and enters with a mask rise (900 ms `arrive`) at its beat.

**Engine API** (`src/three/vignettes/index.ts`). It uses the same contract as `StoryModule`, so the label code and the capture pipeline carry over:

```ts
import type { WorldLabel } from "../story";
export interface Vignette {
  id: string;                                   // "crowd-home"
  duration: number;                             // seconds (1.5–3)
  root: THREE.Group;
  camera: { pos: [number, number, number]; target: [number, number, number]; fov: number;
            dolly?: { a: number; b: number; k: number } };   // optional push-in, k ≤ 0.04
  focus: [number, number, number, number];      // sun focus x, y, z, half-size
  update(t: number): void;                      // pure function of t ∈ [0, 1]
  labels?(t: number, out: WorldLabel[]): void;  // callouts; ids match MeiraItem.labels[].at
  dispose(): void;
}
export type VignetteFactory = (ctx: { renderer: THREE.WebGLRenderer; variant: "home" | "biz" }) => Vignette;
export const VIGNETTES: Record<MeiraItem["vignette"], VignetteFactory>;

// MeiraSection drives one stage:
export interface VignetteStage {
  show(key: string): Promise<void>;   // build (or reuse) + compileAsync, render t = 0
  play(onFrame?: (labels: ProjectedLabel[]) => void): void;   // rAF clock 0 → 1, then stops
  hold(): void;                       // jump to t = 1 (off-screen return, reduced motion capture)
  snapshot(ghost: HTMLCanvasElement): void;  // drawImage of the current frame (same task as render)
  resize(w: number, h: number): void;
  dispose(): void;                    // everything + renderer.dispose() + forceContextLoss()
}
```

Lab: `lab/vignettes.html?set=home&i=1&t=1&w=1200&h=1200` renders one frame and exposes `window.__svif.render(t)` and `grab()`, as the existing film lab does. The stills come from there.

### 4.2 New small clay builders (`vignettes/builders.ts`)

Sizes are in world units. Everything is rounded (RoundedBox r ≈ 3% of size, or a bevelled extrude), has one material where possible, and casts and receives shadows.

| Builder | Shape and material | Used in |
|---|---|---|
| `companyTile(glyph)` | Upright card 0.34 × 0.48 × 0.07 (r .035) on a foot 0.26 × 0.05 × 0.16. An embossed glyph (extrude .012, `clayShade`) on **both** faces. Glyphs: `roller`, `binder`, `cat-*` (simple category icons: drop, plug, window, key, chart, card, pen). | crowd, typecase |
| `couponTag()` | Rose card 0.30 × 0.19 × 0.012 with five semicircular notches along one edge (Shape holes), an embossed cream "%" glyph (extrude .006) and a slight lean of 8° | crowd, kept |
| `ruler(len = 4.2)` | Bar 4.2 × 0.08 × 0.36 in `PAL.chalk` with six raised notch ridges (0.02 × 0.02 × 0.22, `clayShade`) | timeline |
| `keyTag()` | Clay key: torus bow r .08, shank .22 and bit, lying flat, with a rose rounded tag on a short loop | timeline (home) |
| `certificate()` | Sheet 0.42 × 0.012 × 0.30 (paper) with three raised text bars and a rose round seal (r .07, h .01) | timeline (biz) |
| `calendarSlab()` | Slab 2.6 × 0.16 × 2.6 (`chalk`), 2×2 cells with raised 0.02 borders, numerals 1–4 as canvas decals (Jost 300, ink at 35%) | weeks |
| `icelandRelief()` | Extrude of the outline in §4.4 (depth 0.14, bevel 0.03 × 3 segments), `clay`; 11 pins (stem r .012 × .32 grows, then a rose head r .06 settles) | iceland |
| `bin()` | Lathe paper basket (top r .42, bottom .34, height .62, wall .025, torus rim) in `clayWarm`; two crumpled paper balls (Icosahedron detail 2, r .12, squashed) resting inside | kept |
| `fridge()` | RoundedBox 0.95 × 1.55 × 0.72 (r .06), a grooved freezer seam at y 1.0, a vertical handle 0.04 × 0.38 × 0.05 (`clayShade`) | kept (home) |
| `corkBoard()` | Board 1.0 × 0.75 × 0.05 with a speckled sand canvas texture and a `clayShade` frame, on a slim two-leg easel | kept (biz) |
| `magnet()` / `pushPin()` | Rose roof-mark magnet (extruded roof mark 0.12 wide, depth 0.03) / rose pin (head cylinder r .035) | kept |
| `adSheet()` | Paper 0.42 × 0.01 × 0.56 (cream `#f4efe6`) with three grey bars | kept |
| `phone()` | 0.36 × 0.03 × 0.72 (r .05) on a 22° wedge stand. Glass screen with a rose call disc (r .06) and a top bar. `rings()`: two rose torus rings (r .12, tube .006). | address |
| `listLaptop(rows, glyph)` | Laptop form (base 1.0 × 0.04 × 0.66, hinged lid 0.4) of our own (**do not edit bizprops**). The screen holds 6 rows: a glyph (roof mark or building) plus two bars. `row(i).setRose(k)`, `check(i)` (extruded rose tick, grows from the screen surface). | address |
| `openBooklet(left, right)` | Static: a cover slab 1.95 × 0.02 × 0.97 and two page planes with real page textures (p04/p05). Two loose page cards (0.9 × 0.006 × 0.9, p06/p07, rose edges) lie on the right page, offset +0.004 against z-fighting. | months |
| `invoiceSlip()` | Paper 0.40 × 0.008 × 0.56 with four grey bars and a rose total bar | months |
| `tray()` | 2.7 × 0.14 × 1.8 (r .05), walls 0.06, dividers giving 3×2 compartments, `chalk` | tray |
| Tray items | `pen()` (cylinder r .024 × .46 in stage-dark clay with a `clayShade` tip) + `rulerMini()`; `pageStack(n)` (top sheet = p04); `envelope()` (flap and a rose roof-mark seal); `easelBooklet(cover)` (`miniBooklet` on a two-leg easel); `listLaptop` (small); `speechBubbles()` (two extruded bubbles, one rose, offset 0.06 in z so they never intersect) | tray |
| `typeCase()` | Drawer 2.8 × 0.22 × 1.5 (walls .05), 2×4 compartments, `clayWarm` | typecase |
| Reused, not edited | `createHouse`, `createOffice`, `miniBooklet` (real covers p00 / biz-cover), `paintCan`, `tiles`, `lamp`, `armchair` (props.ts), `binders`, `bankCard`, `laptop`, `monitor` (bizprops.ts) | various |

### 4.3 Home storyboards (`t` is normalised; D is the duration)

#### H1 · `crowd` · "Af hverju virkar þetta?" · D = 2.8 s: THE selling point

**Idea at a glance:** many similar companies crowd around a new home. One of them carries a discount, a line runs from the door to it, and the rest fade. *"Yours is the one they call."*

**Set**
- **House:** `createHouse({ w: 1.25, d: 1.0, h: 0.78, roof: "gable", pitch: .62, chimney: true, door: PAL.rose, slot: true })` at (0, 0, −0.95), facing +z. Door slot at about (0, 0.31, −0.43).
- **Tiles:** seven identical `companyTile("roller")`. All tiles share **the same glyph**, which says "same trade, competing". They sit on an arc of radius 1.45 around the door point D = (0, 0, −0.45), at θ = −62°, −41°, −20°, 0°, +20°, +41°, +62° from +z. Each is rotated to face D. The glyph on both faces is visible from the camera.
- **Chosen tile:** #5 (θ = +20°). The `couponTag` stands on its camera-facing side, leaning against it.
- **Camera:** elevation 30°, azimuth +14°, target (0.1, 0.3, −0.15).

**Beats**

| t | Beat |
|---|---|
| 0.00–0.34 | Tiles `settle` (from +0.35, with fade) **from the outside in**: pairs (1, 7) at 0.00, (2, 6) at 0.06, (3, 5) at 0.12, then 4 at 0.18; each takes 0.16 (arrive). The house is there from the first frame. |
| 0.12–0.32 | Label "Mörg fyrirtæki" (anchor above tile 2) |
| 0.34–0.50 | The coupon `grow`s from the disc next to tile 5, with a 3° tilt settle |
| 0.46–0.70 | The other six `recede` to 0.3 opacity with a lift of .03 and no shadow. "Mörg fyrirtæki" fades out (0.46–0.56, leave). |
| 0.50–0.78 | Tile 5 and the coupon `glide` 0.22 inward along their own radius toward the door. The path is clear of the other tiles. |
| 0.58–0.86 | A DOM hairline draws from the door slot (anchor) to the coupon (label point), then "Tilboðið þitt" fades in with an 8 px rise (0.80–0.94) |
| 0.62–1.00 | Camera dolly-in 4% (glide), then hold |

**End frame:** the house at back centre. The chosen tile, with its rose coupon, stands out of the arc front-right. A hairline runs from the door to it, labelled "Tilboðið þitt". Six pale ghosts complete the arc. This frame is the best candidate for a social or share image of the selling point.

**Why it reads:** identical tiles mean competition; rose means the discount (the brand's one accent colour means "the thing that matters"); the line from the door means the call; the fade means the others lose.

#### H2 · `timeline` · "Hvenær berst bæklingurinn?" · D = 2.6 s

**Set**
- `ruler()` across the disc at z = 0.2, yaw −8°, with notches at x = −1.75, −1.05, −0.35, 0.35, 1.05, 1.75. Time reads left to right.
- **Camera:** elevation 34°, azimuth 0 (frontal, symmetric).

**Beats**

| t | Beat |
|---|---|
| 0.00–0.12 | The ruler fades in (breathe) |
| 0.08–0.24 | `keyTag` settles on notch 1. Label "Kaupin" (anchor the key, label under the ruler), 0.18–0.30. |
| 0.26–0.44 | `miniBooklet(p00, s = .42)` settles flat at notch 2, yaw 6°. "Nýji kaflinn" at 0.38–0.50. |
| 0.46–0.82 | Needs `grow` from base at notches 3–6, staggered 0.09: `paintCan` ×.42, `tiles` ×.40, `lamp` ×.38, `armchair` ×.36. "Framkvæmdir" (anchor between notches 4 and 5, label above) at 0.70–0.84. |
| 0.50–1.00 | Dolly 3%, then hold |

**End frame:** key, booklet, then the renovation objects. The booklet arrives before the needs.

#### H3 · `weeks` · "Hversu mörgum bæklingum er dreift?" · D = 2.4 s

**Set**
- `calendarSlab()` centred.
- In each of the four cells, a stack of 12 × `miniBooklet(p00, s = .6)` with a seeded ±2° yaw per copy.
- **Camera:** elevation 38°, azimuth +20°. No dolly.

**Beats**

| t | Beat |
|---|---|
| 0.00–0.10 | The slab fades in |
| 0.08–0.80 | Stacks build **cell by cell** (week 1 → 4): 0.08–0.26, 0.26–0.44, 0.44–0.62, 0.62–0.80. Each copy `settle`s from +0.22 in quick succession. |
| 0.10–0.40 | Figure **350–500** / "Á MÁNUÐI" rises in its mask (top-left) |
| 0.80–0.94 | "Í hverri viku" (anchor at the slab's front edge) |

**End frame:** four equal stacks on four week cells, with the big range above.

This is distinct from the story's print step: no machine, no single tall stack.

#### H4 · `kept` · "Þarf ég að bjóða afslátt?" · D = 2.6 s

**Set**
- `bin()` at (−1.15, 0, 0.15).
- `fridge()` at (1.0, 0, −0.35); its door face is at z ≈ 0.01.
- `adSheet()` at (−0.25, 0, 0.85) and `couponTag()` lying flat at (0.3, 0, 0.9).
- **Camera:** elevation 24°, azimuth −10°, target (0, 0.55, 0).

**Beats**

| t | Beat |
|---|---|
| 0.00–0.20 | The sheet and the coupon settle, with fade |
| 0.22–0.52 | The sheet lifts and follows a smooth arc (Catmull-Rom via (−0.7, 0.9, 0.5)) **into the bin's open top**, coming to rest inside on the paper balls with one corner above the rim. "Auglýsingu hent" (anchor the bin rim) at 0.46–0.58. |
| 0.40–0.74 | The coupon lifts, turns upright and settles **flat against the fridge door** at (1.0, 0.95, 0.016), offset by its thickness so the two never intersect |
| 0.70–0.84 | `magnet()` settles onto the coupon from the front (+0.12 in z), with fade. "Afsláttur geymdur" at 0.80–0.94. |
| 0.84–1.00 | Hold |

**End frame:** the plain ad in the bin on the left; the rose coupon held by the roof-mark magnet on the fridge on the right. This is the owner's "Auglýsingu er hent. Afsláttur er geymdur." as a picture.

#### H5 · `address` · "Þarf ég afsláttarkóða?" · D = 2.8 s

**Set**
- `phone()` on its stand at (−1.0, 0, 0.55).
- `listLaptop(6, "roof")` at (0.55, 0, −0.35), yaw −12°.
- **Camera:** elevation 26°, azimuth +12°.

**Beats**

| t | Beat |
|---|---|
| 0.00–0.10 | Everything fades in |
| 0.10–0.40 | Two rose rings expand from the call disc (scale 1 → 3, opacity .8 → 0, staggered .08); they are not looped. "Heimilisfangið" (anchor the phone's top) at 0.22–0.36. |
| 0.40–0.60 | A DOM hairline draws from the phone to row 4 of the screen |
| 0.56–0.68 | Row 4 turns rose (colour only, no motion) |
| 0.62–0.76 | `check(4)` grows from the screen surface. "Staðfest" at 0.78–0.92. |

**End frame:** the phone; a hairline to the laptop; the address row in rose with a tick.

#### H6 · `months` · "Hvernig er greitt?" · D = 2.6 s

**Set**
- `openBooklet(p04, p05)` at (−0.55, 0, 0.1), yaw −10°, with the two loose cards (p06/p07) on its right page.
- Invoice spot at (1.25, 0, 0.1).
- **Camera:** elevation 34°, azimuth +8°, target (0.3, 0.2, 0.1).

**Beats**

| t | Beat |
|---|---|
| 0.00–0.10 | Everything fades in |
| 0.10–0.36 | The two page cards lift +0.22 off the page (upward only) and fan (±6° roll, ±8° yaw), showing rose edges. "Eftir síðufjölda" at 0.30–0.44. |
| 0.40–0.82 | Three `invoiceSlip`s settle one per month (0.40, 0.54, 0.68), each from +0.25 with fade, offset (0.04, 0.008, −0.05) and yaw +4°. "Mánaðarlega" at 0.60–0.72. |
| 0.84–0.96 | "3 mánuðir í senn" (anchor the front of the pile) |

**End frame:** the pages you buy, lifted and rose-edged; three monthly invoices beside them.

#### H7 · `tray` · "Hvað er innifalið?" · D = 3.0 s

**Set**
- `tray()` centred.
- Compartments, back row: 1 pen + mini ruler, 2 `pageStack(4)`, 3 `envelope()`. Front row: 4 `easelBooklet(p00)`, 5 small `listLaptop`, 6 `speechBubbles()`.
- **Camera:** elevation 40°, azimuth +14°.

**Beats**

| t | Beat |
|---|---|
| 0.00–0.10 | The tray fades in |
| 0.08–0.68 | Items settle into their compartments in order 1 → 6, every 0.11, each taking 0.18 (arrive), from +0.3 with fade. Each lands on the compartment floor (y = 0.04) inside the walls. |
| at 0.36 | Label "Hönnun & prentun" (anchor between 1 and 2) |
| at 0.46 | "Dreifing" (3) |
| at 0.58 | "Þrívíddarmynd" (4) |
| at 0.80 | "Mánaðarlegt samtal" (6). The first label fades out at 0.62, so no more than two are visible at once until the hold. In the end frame all four sit around the tray rim. |
| 0.60–1.00 | Dolly 3%, then hold |

**End frame:** a full presentation tray; everything that's included, in one picture.

#### H8 · `typecase` · "Fá keppinautar mínir líka pláss?" · D = 2.6 s

**Set**
- `typeCase()` at (0, 0, −0.1), yaw −6°.
- Eight upright tiles (0.42 × 0.5 × 0.06), one per compartment. Seven are clay with different `cat-*` glyphs; one is rose (front row, second from left) with the roof-mark glyph.
- **Camera:** elevation 36°, azimuth +16°.

**Beats**

| t | Beat |
|---|---|
| 0.00–0.08 | The case fades in |
| 0.06–0.30 | Tiles `grow` in their compartments, raster order, staggered 0.03; the rose tile last (0.28–0.36). "Flokkurinn þinn" at 0.34–0.46. |
| 0.36–0.48 | A plain competitor tile settles on the disc in front of the rose slot at (−0.55, 0, 1.05) |
| 0.48–0.62 | It glides toward the case and **stops 0.08 short of the front wall** (z = 0.72): it never touches |
| 0.62–0.78 | It `fadeOut`s with a 0.12 lift. "Enginn keppinautur" (anchor where it stood) at 0.76–0.90. |

**End frame:** every slot holds exactly one tile, yours is rose, and the newcomer has gone.

### 4.4 Business storyboards (variants plus one new scene)

- **B1 `crowd` (office):**
  - The same set and beats as H1. The house becomes `createOffice({ w: 1.4, d: 1.0, floors: 2, style: "shop", door: PAL.rose, awning: null, slot: true, seg: 2 })` at 0.8 scale, at (0, 0, −0.95).
  - Glyph `binder`; label "Sérkjörin ykkar".
  - Keep the office plain (no "NÝTT" sign) so it doesn't quote business story step 01.
- **B2 `timeline` (biz):**
  - Notch 1: `certificate()` ("Skráning").
  - Notch 2: `miniBooklet(biz-cover)` ("Bæklingurinn").
  - Notches 3–6 grow, at 0.36–0.40 scale: `binders`, `bankCard`, `laptop`, `monitor` ("Fyrstu vikurnar").
- **B3 `iceland` (new), D = 2.8 s:**
  - **Set:** `icelandRelief()` replaces the disc. Camera elevation 52°, azimuth 0, fov 24.
  - 0.00–0.12: the relief fades in.
  - **Pins:** stems grow, then heads settle, Reykjavík first (0.08), then in a wave by distance from Reykjavík, 0.05 apart.
  - Figure **Um 250** / "Á MÁNUÐI" at 0.10–0.40. "Um allt land" (anchor over the north-east) at 0.75–0.90.
  - Dolly 3%, then hold.
  - The pins are illustrative: no per-town numbers are shown or claimed.
  - **Starter outline** (lon, lat; refine freely). Project with `x = (lon + 18.6)·cos(65°)·0.9`, `z = −(lat − 64.95)·0.9`, which gives about 4.2 × 2.85 units:
    ```
    Reykjanes −22.72,63.81 · Garðskagi −22.68,64.08 · Reykjavík −21.95,64.15 · Akranes −22.08,64.32 ·
    Öndverðarnes −24.05,64.88 · Stykkishólmur −22.73,65.07 · Breiðafj. inner −21.90,65.25 · Látrabjarg −24.53,65.50 ·
    Patreksfj. −24.00,65.60 · Ísafjörður −23.13,66.07 · Horn −22.40,66.45 · Hólmavík −21.68,65.70 ·
    Húnaflói inner −20.90,65.45 · Skagi −20.10,66.12 · Sauðárkrókur −19.64,65.75 · Siglufjörður −18.90,66.15 ·
    Akureyri −18.09,65.68 · Húsavík −17.35,66.05 · Rifstangi −16.20,66.54 · Langanes −14.53,66.38 ·
    Vopnafjörður −14.83,65.75 · Dalatangi −13.50,65.27 · Djúpivogur −14.28,64.66 · Höfn −15.20,64.25 ·
    Ingólfshöfði −16.64,63.80 · Dyrhólaey −19.12,63.40 · Landeyjar −20.20,63.55 · Þorlákshöfn −21.38,63.85 ·
    Grindavík −22.43,63.84 → close
    ```
  - **Pin towns:** Reykjavík, Reykjanesbær (−22.55, 64.00), Akranes, Borgarnes (−21.92, 64.54), Selfoss (−21.00, 63.93), Ísafjörður, Sauðárkrókur, Akureyri, Húsavík, Egilsstaðir (−14.40, 65.27), Höfn.
- **B4 `kept` (office):** the fridge becomes `corkBoard()` on its easel; the magnet becomes `pushPin()`; labels "Auglýsingu hent" · "Sérkjör geymd".
- **B5 `address` (biz):** `listLaptop(6, "building")`; labels "Nafn eða kennitala" · "Staðfest".
- **B6 `months`, B7 `tray`, B8 `typecase`:** as home. B7's easel booklet uses `biz-cover`; B8's glyphs come from business categories; B8's labels are "Flokkurinn ykkar" · "Enginn keppinautur".

**Build order** (highest value first): H1/B1 crowd → H4/B4 kept → H5/B5 address → H3 weeks → B3 iceland → H8/B8 typecase → H7/B7 tray → H2/B2 timeline → H6/B6 months.

Review every vignette in the lab at `t` = 0, .25, .5, .75 and 1. Look at the renders, compare each with the end-frame description above, and iterate until it reads at a glance at **350 px** (phone panel size).

---

## 5. Films: title cards rebuilt from the new stories

**Card system:** the same as before (research 01 §7, 04):
- Jost 300 cream on the dark stage, ink on the light scenes;
- one serif-italic accent;
- 1.0 s mask-in with `arrive`, a hold of at least 2.0 s, exit 0.4 s with `leave`;
- eyebrow `01 / 06 · Vandinn`.

**Rule:** at most 7 words per card. **Two deliberate exceptions**, both owner lines that must stay verbatim:
- the opening H1 (9 words);
- the 80% line (9 words).

### 5.1 Homeowner film (about 53 s; story steps get uneven time so two-card steps can breathe)

| Time (s) | Eyebrow | Card (`/` = line break, `*…*` = accent) | Words |
|---|---|---|---|
| 0.9–5.3 | SVIF · Nýji kaflinn | Við tengjum ykkur við / *alla nýja húseigendur* / á höfuðborgarsvæðinu. | 9 (owner, exception) |
| 6.9–10.4 | 01 / 06 · Vandinn | Um 80% nýrra húseigenda / *ráðast í framkvæmdir* / eftir húsakaup (corner: "Heimild: HIRI, Bandaríkin 2025") | 9 (owner, exception) |
| 10.9–14.4 | 01 / 06 · Vandinn | Nýju heimili fylgja / *ótal verkefni.* | 5 |
| 15.8–20.4 | 02 / 06 · Bæklingurinn | *Þess vegna* / bjuggum við til SVIF | 6 |
| 21.8–26.4 | 03 / 06 · Sérkjörin | Traust fyrirtæki með afslátt / *fyrir hvert verkefni* | 7 |
| 27.8–32.0 | 04 / 06 · Hönnun | Við *hönnum* / auglýsinguna þína | 4 |
| 33.4–37.6 | 05 / 06 · Prentun | Við *prentum* / bæklinginn (sub: 350–500 eintök á mánuði) | 3 + 4 |
| 39.0–42.5 | 06 / 06 · Dreifing | Og *sendum* vikulega / til allra nýrra húseigenda (map label in frame: Höfuðborgarsvæðið) | 7 |
| 43.0–46.5 | 06 / 06 · Dreifing | Fólk fær afsláttinn þinn / *þegar þörfin vaknar.* | 7 |
| 48.2–52.6 | svif.is | Bókaðu pláss í / *næsta bæklingi.* | 5 |

Step windows: 01 6.0–15.0 · 02 15.0–21.0 · 03 21.0–27.0 · 04 27.0–32.6 · 05 32.6–38.2 · 06 38.2–47.2; logo 47.6–53.0.

**VTT** (`svif-heimili.is.vtt`):

```
WEBVTT

00:00.000 --> 00:02.400
[Róleg píanótónlist]

00:00.900 --> 00:05.300
Við tengjum ykkur við
alla nýja húseigendur á höfuðborgarsvæðinu.

00:06.900 --> 00:10.400
Um 80% nýrra húseigenda
ráðast í framkvæmdir eftir húsakaup.

00:10.900 --> 00:14.400
Nýju heimili fylgja ótal verkefni.

00:15.800 --> 00:20.400
Þess vegna bjuggum við til SVIF.

00:21.800 --> 00:26.400
Traust fyrirtæki með afslátt
fyrir hvert verkefni.

00:27.800 --> 00:32.000
Við hönnum auglýsinguna þína.

00:33.400 --> 00:37.600
Við prentum bæklinginn.
350–500 eintök á mánuði.

00:39.000 --> 00:42.500
Og sendum vikulega
til allra nýrra húseigenda.

00:43.000 --> 00:46.500
Fólk fær afsláttinn þinn
þegar þörfin vaknar.

00:48.200 --> 00:52.600
Bókaðu pláss í næsta bæklingi.
svif.is
```

**Transcript** (`films.ts`, FILM_HEIMILI). Check every "scene" against the final render:

1. *Nýji kaflinn lendir á dökku sviði og opnast. Flett er hratt í gegnum allar síðurnar og svo lokast hann.* | Við tengjum ykkur við alla nýja húseigendur á höfuðborgarsvæðinu.
2. *Hús úr ljósum leir með skilti sem á stendur SELT. Í kringum það birtast tryggingar, málning, húsgögn, gluggar, gólfefni og rafmagn.* | Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup. Nýju heimili fylgja ótal verkefni.
3. *Hlutirnir dofna og Nýji kaflinn lendir á auða svæðinu og opnast. Flett er í gegnum nokkrar síður.* | Þess vegna bjuggum við til SVIF.
4. *Fjórir afsláttarmiðar lyftast upp úr bæklingnum og hver þeirra lendir hjá verkefninu sem hann á við.* | Traust fyrirtæki með afslátt fyrir hvert verkefni.
5. *Auglýsing verður til á síðu: hjálparlínur dragast og mynd, texti og afsláttarmiði falla á sinn stað.* | Við hönnum auglýsinguna þína.
6. *Prentvél úr leir. Prentuð eintök raðast í snyrtilegan stafla.* | Við prentum bæklinginn. 350–500 eintök á mánuði.
7. *Höfuðborgarsvæðið úr lofti. Sendibíll SVIF ekur um göturnar og eintök berast að dyrum nýrra eigenda. Það síðasta fer inn um lúguna.* | Og sendum vikulega til allra nýrra húseigenda. Fólk fær afsláttinn þinn þegar þörfin vaknar.
8. *Lokaspjald.* | Bókaðu pláss í næsta bæklingi. svif.is

### 5.2 Company film (about 43 s)

| Time (s) | Eyebrow | Card | Words |
|---|---|---|---|
| 0.9–5.3 | SVIF · Fyrir ný fyrirtæki | Við tengjum ykkur við / *öll ný fyrirtæki* / á Íslandi. | 9 (H1 parity, exception) |
| 6.9–10.4 | 01 / 04 · Ný fyrirtæki | Hundruð *nýrra fyrirtækja* / í hverjum mánuði | 5 |
| 10.9–14.4 | 01 / 04 · Ný fyrirtæki | Nýjum rekstri fylgja / *ótal verkefni.* | 5 |
| 15.8–19.3 | 02 / 04 · Bæklingurinn | Sérkjör frá þeim / *sem nýr rekstur þarf* | 7 |
| 19.8–23.3 | 02 / 04 · Bæklingurinn | Eitt fyrirtæki / *í hverjum flokki.* | 5 |
| 24.8–29.6 | 03 / 04 · Kerfið | Kerfið finnur / *nýskráð fyrirtæki* | 4 |
| 31.2–36.6 | 04 / 04 · Dreifing | Við *sendum* bæklinginn / til nýrra fyrirtækja (sub: Um 250 á mánuði, um allt land.) | 6 + 7 |
| 38.4–42.8 | svif.is | Bókið pláss í / *næsta bæklingi.* | 5 |

Step windows: 01 6.0–15.0 · 02 15.0–24.0 · 03 24.0–30.4 · 04 30.4–37.4; logo 37.8–43.0.

The end card changes from "Rétta fólkið á réttum tíma" to the booking line. The section that phrase belonged to is gone, and the two films should end the same way.

**VTT** (`svif-fyrirtaeki.is.vtt`):

```
WEBVTT

00:00.000 --> 00:02.400
[Róleg píanótónlist]

00:00.900 --> 00:05.300
Við tengjum ykkur við
öll ný fyrirtæki á Íslandi.

00:06.900 --> 00:10.400
Hundruð nýrra fyrirtækja í hverjum mánuði.

00:10.900 --> 00:14.400
Nýjum rekstri fylgja ótal verkefni.

00:15.800 --> 00:19.300
Sérkjör frá þeim sem nýr rekstur þarf.

00:19.800 --> 00:23.300
Eitt fyrirtæki í hverjum flokki.

00:24.800 --> 00:29.600
Kerfið finnur nýskráð fyrirtæki.

00:31.200 --> 00:36.600
Við sendum bæklinginn til nýrra fyrirtækja.
Um 250 á mánuði, um allt land.

00:38.400 --> 00:42.800
Bókið pláss í næsta bæklingi.
svif.is
```

**Transcript** (FILM_FYRIRTAEKI):

1. *Bæklingurinn lendir á dökku sviði og opnast. Flett er hratt í gegnum síðurnar og svo lokast hann.* | Við tengjum ykkur við öll ný fyrirtæki á Íslandi.
2. *Nýjar skrifstofur opna hver á eftir annarri og bókhald, tryggingar, vefsíða, banki, tölvur og hönnun birtast í kring.* | Hundruð nýrra fyrirtækja í hverjum mánuði. Nýjum rekstri fylgja ótal verkefni.
3. *Bæklingurinn opnast á síðu með flokkum sem lýsast upp hver á fætur öðrum.* | Sérkjör frá þeim sem nýr rekstur þarf. Eitt fyrirtæki í hverjum flokki.
4. *Perlulík kúla svífur yfir hverfinu og dregur fínar línur niður að nýskráðum fyrirtækjum, sem verða rósrauð.* | Kerfið finnur nýskráð fyrirtæki.
5. *Sendibíll SVIF ekur um göturnar og bæklingar berast nýju fyrirtækjunum. Sá síðasti fer í póstkassann á nýju skrifstofunni.* | Við sendum bæklinginn til nýrra fyrirtækja. Um 250 á mánuði, um allt land.
6. *Lokaspjald.* | Bókið pláss í næsta bæklingi. svif.is

Update `seconds` in `films.ts` to the real rendered length.

---

## 6. Meta and share text

| Route | Field | Text |
|---|---|---|
| `/` | title | SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda *(keep, 59 characters)* |
| `/` | description | Í hverri viku fá nýir húseigendur á höfuðborgarsvæðinu Nýja kaflann inn um lúguna: 350–500 heimili á mánuði. Bókaðu pláss fyrir fyrirtækið þitt. |
| `/` | og:description = twitter:description | Bæklingur með sérkjörum sem nýir húseigendur fá inn um lúguna. Sendur í hverri viku, 350–500 heimili á mánuði. |
| `/` | JSON-LD description | SVIF sendir Nýja kaflann í hverri viku til nýrra húseigenda á höfuðborgarsvæðinu, með sérkjörum frá völdum fyrirtækjum. |
| `/fyrirtaeki` | title | SVIF · Bæklingur til nýrra fyrirtækja *(keep)* |
| `/fyrirtaeki` | description | Nýstofnuð fyrirtæki um allt land fá bækling með sérkjörum á fyrstu vikum rekstrarins, um 250 á mánuði. Eitt fyrirtæki í hverjum flokki. |
| `/fyrirtaeki` | og:description = twitter:description | Bæklingur með sérkjörum til nýstofnaðra fyrirtækja um allt land. Um 250 eintök á mánuði, eitt fyrirtæki í hverjum flokki. |

Lengths: home description 144 characters, home og 110, JSON-LD 119, business description 135, business og 121 (all under 160).

Agreement check: *Sendur* is masculine, agreeing with *Bæklingur*; *um 250 á mánuði* is an appositive.

**No FAQPage JSON-LD:** Google has shown FAQ rich results only for authoritative government and health sites since 2023, so there is nothing to gain.

---

## 7. Section order, backgrounds and refinements (BIBLE-R2 §6)

**Home (/)**

| # | Section | Background | Header tone |
|---|---|---|---|
| 1 | Hero (booklet 50/50) | dark `stage-bg` | dark |
| 2 | Svona virkar það (pinned, 6 steps) | light clay world | light |
| 3 | **Meira um hugmyndina** (`#meira`, stepper) | dark `stage-bg`; the vignette sits in a **peach** panel | dark |
| 4 | Flokkað eftir *verkefnum heimilisins.* (`#fyrir-fyrirtaeki`) | **peach `#efe7da`**: use `PrintedPages tone="peach"` (shadow .30) | light |
| 5 | Business teaser (`#fyrirtaekjabaeklingur`) | **cream `#f6f5ec`** (was peach), so 4 and 5 don't merge | light |
| 6 | Bóka pláss (`#samband`) | dark | dark |
| 7 | Footer | `stage-deep` | dark |

**/fyrirtaeki:** Hero (dark) → story (light) → **Meira um hugmyndina, business** (dark, peach panel) → Flokkar (`#flokkar`, peach) → Bóka pláss (dark) → footer.

The page alternates light and dark at every section boundary except two: 4 → 5, where cream follows peach on purpose, and the booking section into the darker footer.

**Refinements I recommend:**

1. **Remove** `WhySection` and `FaqSection` from both routes. Their content now lives in the stepper (§3.4). Do not reuse `why-*.jpg` or the story stills in the stepper (BIBLE-R2 §5).
2. **Navigation:**
   - Home header: Svona virkar það (`#svona-virkar`) · **Spurt og svarað** (`#meira`) · Bæklingurinn (`/baeklingur`) · Ný fyrirtæki (`/fyrirtaeki`).
   - /fyrirtaeki: Svona virkar það · Spurt og svarað (`#meira`) · Flokkar · Nýji kaflinn (`/`).
   - /baeklingur: replace `/#af-hverju` and `/#spurningar` with `/#meira`.
3. **Alias anchors:** `<span id="af-hverju">` and `<span id="spurningar">` at the top of `#meira`, each with `scroll-margin-top`, so old links and shares still land in the right place. The e-mail templates and the flipbook link to neither anchor (checked).
4. **Deep links** `#spurning-1…8` (§2.2) are handy in sales e-mails, for example "see how payment works": `svif.is/#spurning-6`.
5. **Replace these known strings:**

   | File | Change |
   |---|---|
   | `index.tsx:130` | corner "Um 500 heimili á mánuði" → "350–500 heimili á mánuði" |
   | `index.tsx` | old FAQ (removed) |
   | `story-copy.ts:25` | "Örfá traust fyrirtæki…" → §3.2 |
   | `story-copy.ts:31–32` | the "Kerfið" step → §3.2 |
   | `films.ts:52, 56` | transcripts → §5 |
   | `public/svif/film/svif-heimili.is.vtt:19, 23–24` | captions → §5.1 VTT |

   After the edits, nothing should match `grep -rn "Örfá\|Um 500\|um 500" src public`.
6. **The stepper is not a second hero:** no FrameLines or corner labels, only the stage gradient, beam and grain. The light panel is the focal point.
7. **Quiet moments:** keep the categories section free of scroll-linked motion. After a pinned story and a stepper, the page needs a still breath (research 01 §3.9).
8. **Contact line** under the stepper ("Aðrar spurningar · 853 5147"). The FAQ's "ask us" path would otherwise disappear.

---

## 8. Flags for the owner (decisions made, risks recorded)

1. **"One company per category" and the printed contents page.** The flyer's contents page groups several advertisers under one heading. For example, *Gluggar & gler* lists Gardínur, Íspan, Gluggavinir and TME Gluggar; *Rafmagn & net* lists four. A careful reader could see a contradiction with item 08. Either confirm that each of these is its own category (for example window repair versus window manufacture), or define "flokkur" in item 08's answer.
2. **Privacy (persónuvernd).** Item 05 says advertisers see every home that received the booklet [E2]. Sharing the addresses of new homeowners with third parties is personal data under lög nr. 90/2018. Have the owner check the legal basis and the wording before launch.
3. **Three-month term.** Item 06's "Samningurinn er til þriggja mánaða í senn" is [E1]. Confirm it still holds now that payment is monthly and priced by pages. The derived reach figures (1.050–1.500 and about 750) depend on it.
4. **Business cadence and pricing.** "Weekly" and "price by pages" are confirmed for the homeowner booklet only. /fyrirtaeki therefore says no "vikulega", and B06 assumes the same pricing model.
5. **Timing.** "Á fyrstu vikunum eftir kaupin" (item 02) is the lead's reading of weekly distribution [L]. HMS notes a lag of several weeks before purchases reach the register (05 §2).
6. **One copy per home.** "350–500 eintök …, eitt fyrir hvert nýtt heimili" assumes copies equal homes [L].
7. **The AI orb is visual only.** Write no "gervigreind" or "AI" claim in the copy unless the owner confirms how the system works.
8. **Still open from 05 §9:** the name "Nýr rekstur"; the 80% source label; whether to keep the business H1's "öll ný fyrirtæki" next to "um 250 á mánuði".

---

## Sources

Measured live (9 Nov 2026; copies in `research/dl-06/`):

**Apple**
- MacBook Air overview, "Get the highlights" ScrollGallery: https://www.apple.com/macbook-air/
  - CSS: https://www.apple.com/v/macbook-air/z/built/styles/overview.built.css
  - CSS: https://www.apple.com/v/macbook-air/z/built/styles/main.built.css
  - JS: https://www.apple.com/v/macbook-air/z/built/scripts/main.built.js
- Apple Pay, "Ways to Pay" FadeGallery and "Get started" question cards: https://www.apple.com/apple-pay/
  - CSS: https://www.apple.com/v/apple-pay/w/built/styles/overview.built.css
  - JS: https://www.apple.com/v/apple-pay/w/built/scripts/overview/main.built.js
- iPhone, "Significant others" ImageAccordion: https://www.apple.com/iphone/
- Apple Card tiles (TileFlip, TriggerAnimation): https://www.apple.com/apple-card/

**Others**
- Stripe home ("What's happening" squeezy carousel, single canvas, sr-only live region): https://stripe.com/
- Linear home (card carousel, "1 / 84" counter): https://linear.app/
- Bang & Olufsen DK home (carousel region, timings): https://www.bang-olufsen.com/en/dk
- Aesop (blocked by a Cloudflare challenge): https://www.aesop.com/us/

Guidelines:
- W3C APG, Carousel pattern: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/
  - Tabbed example: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/examples/carousel-2-tablist/
- W3C APG, Tabs pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- W3C WAI tutorial, Carousels: functionality: https://www.w3.org/WAI/tutorials/carousels/functionality/
- WCAG 2.2 Understanding 2.5.1 Pointer Gestures: https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html
- WCAG 2.2 Understanding 2.2.2 Pause, Stop, Hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- NN/g, "Carousel Usability" (Pernice, 2013, reviewed 2026): https://www.nngroup.com/articles/designing-effective-carousels/
- Swiper API defaults (threshold, touchAngle, longSwipes, keyboard.onlyInViewport): https://swiperjs.com/swiper-api
- MDN, `hidden="until-found"`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden

Not used: it applies `content-visibility: hidden`, which breaks the grid-stack height technique.

**Internal:**
- `BIBLE-R2.md` §1–§7
- `user-feedback-r2.md`
- `BIBLE.md` §2, §3, §5
- `05-copy-audit.md` §0–§9
- `01-premium-web-motion.md` §2, §3, §5, §8, §9
- `02-premium-threejs.md` §1–§9
- Code read, not edited:
  - `svif/src/three/{core,story,anim,materials,palette,textures}.ts`
  - `svif/src/three/builders/{house,town,props,bizprops,office,mini,brochure}.ts`
  - `svif/src/components/{StageHero,WhySection,FaqSection,StoryChrome,Header,SiteFooter}.tsx`
  - `svif/src/components/story/StoryStage.tsx`
  - `svif/src/routes/{index,fyrirtaeki}.tsx`
  - `svif/src/content/story-copy.ts`
  - `svif/src/lib/{films,webgl}.ts`
- Flyer pages:
  - `svif/public/svif/kafli/p01.jpg` (contents)
  - `ref/coupons3.jpg`
  - `ref/flyer-sheet.webp`
