# Verkefnastjórnun — product film · design spec

Made with the **video-shotcraft** skill (https://github.com/Vincentwei1021/video-shotcraft), **autonomous free-creation mode**
(the request was "make the best animation you can in a short amount of time", so the agent decided direction,
shot mapping and storyboard without stage-by-stage sign-off).

## 0 · Product brief

| | |
|---|---|
| Product | **Verkefnastjórnun** ("project management") — the internal sales-pipeline CRM in this repo (Vite + React + shadcn + Supabase). |
| What it does | Tracks companies a web studio pitches to through stages **Tölvupóstur sendur → Skráð → Vill sýnishorn → Lokið → Greitt** (e-mail sent → registered → wants a preview → finished → paid), with sub-columns per stage, a "still to call" list, scheduled calls (Í dag / Á morgun / Síðar), tasks and prices. |
| Audience / use | The owner/team — a short showcase film of the tool. |
| Language | Icelandic on-screen copy (the product UI is Icelandic). |
| Format | 1920×1080, 30 fps, 25 s (750 f), H.264 MP4; delivered with BGM and without BGM (SFX kept); audio mastered to −16 LUFS. |
| Data | **No real customer data.** The app was run against a fake Supabase host intercepted in Playwright and fed 29 fictional Icelandic companies (`capture/mock-data.mjs`). Names, owners, prices and call times are invented. |

### Requirement → execution decisions

| Requirement | Decision |
|---|---|
| Show the real product | Real page captures of the running app (`capture/capture.mjs`): full board at 2×, empty backplate, per-card cut-outs, `layout.json` bboxes, 4× hero card. |
| Must-show features | (1) the company card with next call — hero; (2) the stage pipeline with sub-columns — deal; (3) the call list — stack; (4) brand. |
| Visual language from the product | Colours/fonts from `src/index.css`, `tailwind.config.ts`, `index.html` (see tokens). Dark "theatre" shots use the app's own `.dark` tokens. |
| Capture tweaks | (1) The header title is truncated because the nav buttons overflow; capture sets `flex-shrink:0` on the logo/title block so "Verkefnastjórnun" is readable. (2) CSS transitions are disabled during capture so cut-outs/backplates are clean. (3) Playwright's Chromium lacks Icelandic number data, so `toLocaleString('is-IS')` is mapped to de-DE separators (identical to real Chrome: "219.000 kr."). Textures are the full 2310 px document width, cropped to the top 2300 px used by the shots. |

## 1 · Visual direction (chosen) — "Navy stage, product white"

Motion personality: B2B "professional trust" preset blended with "friendly small-business" (the tuned demo
parameters are kept; landings that need a bounce keep y1 > 1).

| Token | Value | Source |
|---|---|---|
| Background | `#fafbfd` + radial primary/accent washes | `--background 215 35% 98.5%`, body gradients |
| Ink | `#0f1729` | `--foreground` |
| Muted | `#65758b` | `--muted-foreground` |
| Primary / accent | `#2463eb` / dark-mode `#3c83f6` | `--primary` |
| Stage colours | e-mail `#2f79ee` · registered `#0da2e7` · preview `#f9911a` · finished `#24a86a` · paid `#1da54f` | `--stage-*` |
| Dark stage | `#090e1a` / `#111827` | `.dark --background / --card` |
| Display face | Plus Jakarta Sans 800 (300 for the light second line) | `h1–h4` in index.css |
| Text face | Inter 600 caps with 0.12–0.16em tracking for kickers/labels (product badge style), ≥32 px (aesthetic rule Q11) | body font |

Re-skin rules applied to every demo: amber/champagne → primary blue; warm black → app navy; tungsten → cool white;
serif/mono → Plus Jakarta Sans / Inter; video-shotcraft mark → the app's briefcase mark (cropped from `src/assets/logo.png`).
Styleframe step skipped: the product has a strict existing design system (tokens above), which the pipeline allows.

## 2 · Feature → shot mapping

| Feature | Shot card (Gallery name) | Demo source used |
|---|---|---|
| Brand | `brand-ink-open` | `demos/typography/brand-ink-open/BrandInkOpen.tsx` |
| Company card + next call (atomic unit) | `spotlight-hero-card` | `demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx` |
| Breathing card / value line | `paper-title-card` | `demos/typography/paper-title-card/PaperTitleCard.tsx` |
| Pipeline stages with sub-columns | `deck-deal-flyin` | `demos/ui-entrance/deck-deal-flyin/DeckDealFlyin.tsx` |
| "Á eftir að hringja" call list | `list-stack-press` | `demos/ui-entrance/list-stack-press/ListStackPress.tsx` |
| Finale | `outro-group-photo-launch` | `demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx` |

Skeleton: `references/sequences/promo-energy-arc.md` (low brand open → single hero → breather → feature climb → peak outro).

## 3 · Storyboard (final)

BGM `house-vibez.mp3` (Mixkit, ≈122 BPM measured, first beat ≈0.04 s, beat ≈14.75 f). Shot lengths were changed by
holds/rests only (hero +5 f, title +4 f, deal +12 f, call stack +15 f rest) so every cut sits on a beat.

| # | Frames | Shot | What the viewer sees | Copy | SFX |
|---|---|---|---|---|---|
| 1 | 0–104 | brand-ink-open | Blue crosshair draws, the briefcase mark presses in, "Verkefnastjórnun" letterpresses glyph by glyph, kicker types out, ≥30 f hold, lifts away | VERKEFNI · SÍMTÖL · SALA | — |
| 2 | 104–281 (b7) | spotlight-hero-card | Board in the dark; lamp switches on, hunts 3 stations, locks on the expanded card **Ljósmyndastofa Lóu** (owner, website, *Næsta símtal … Í dag*, 219,000 kr.); push to a side angle, card lifts, blue beam runs two laps, 3D note lands with it, card reseats | Hvert símtal, / **á hreinu.** | lamp, woosh, reseat |
| 3 | 281–340 (b19) | paper-title-card | Words press onto the app background, accent word in blue italic, rule, 27 rolls in | Frá fyrsta pósti / til *greiðslu.* · 27 FYRIRTÆKI SAMTALS | swoosh |
| 4 | 340–502 (b23) | deck-deal-flyin | Pile of real company cards on a navy table → lights spread → 19 cards dealt (accelerating) into their real (empty) slots in Vill sýnishorn / Lokið / Greitt → camera rises to a runway overhead, 40 f+ hold | Sýnishorn. Lokið. / Greitt. · 19 FLOKKUÐ FYRIRTÆKI | 4 deals + swoosh |
| 5 | 502–605 (b34) | list-stack-press | Real "Á eftir að hringja" rows fly up and stack, each landing presses the stack, names get highlighted, counter (in the empty left margin) rolls 0→5, glaze, 15 f still rest | Á EFTIR AÐ HRINGJA · 5 · AF 11 Á LISTANUM | 5 paper slides |
| 6 | 605–750 (b41) | outro-group-photo-launch | Starts on the call-stack's last framing (continuous move); nav, hero card, paid/finished/registered/e-mail cards, a call row and the VILL SÝNISHORN badge fly in around the mark + wordmark (impact on b44), rule, tagline, fade to navy | Verkefnastjórnun · SÖLUFERLIÐ Á EINUM STAÐ | swoosh, riser → impact → shimmer |

No tagline repeats: kicker, hero note, title card, deal title and outro tagline are all different lines.

## 4 · Audio pipeline

Picture is rendered by Remotion; the soundtrack is mixed separately (`scripts/mix-audio.py`) from the same cue table
(`src/sfx.ts` + `src/timeline.ts`, exported by `scripts/export-cues.ts`). Reason: Remotion frame retries during the render
shifted every later SFX by 4 frames; the offline mix is sample-exact (measured ≤0.07 f on all cues with
`scripts/check-sfx.py`). Both versions share one gain (music version mastered to −16 LUFS, −1.5 dBFS peak).
