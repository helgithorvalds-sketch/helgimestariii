# SVIF design bible (v1, binding for every build agent)

Goal from the owner: "super premium, Apple quality, luxurious not futuristic, 3D-ish, crisp, slick, smooth,
less text, every explanation has a visual, professional, not AI-ish." Everything below serves that.

Full motion research with sources: `research/01-premium-web-motion.md` (READ §0, §2, §3, §5, §8, §9 before
touching motion). This file is the short, binding version plus the 3D look, storyboards and copy deck.

## 1. Palette and type (already in `src/styles.css`, keep)
- cream #f6f5ec · peach #efe7da · chalk #e1daca · sand #c1b6a4 · rose #b29079 · roseDeep #9a7a64
- dark stage #4a4438 → stageDeep #2e2a24 · ink #2a2420. White type on dark = cream #f6f5ec (never #fff).
- Type: Jost 300 uppercase, wide tracking (`display-caps`), Instrument Serif italic for ONE accent phrase
  per heading (`display-accent`), Inter for body. Labels: tracked caps 10–11px on a 1px hairline.
- Rhythm of sections (light / dark alternation, "a bit darker but not too dark"):
  Hero = dark stage with white type and the live 3D booklet → Story = light clay world →
  Af hverju = dark stage, white type → Fyrir fyrirtæki = cream → Bæklingur fyrir fyrirtæki = peach →
  FAQ = cream → Samband/form = dark stage, white type → footer.

## 2. Motion tokens (binding; implement in `src/components/motion/tokens.ts`)
Easings (cubic-bezier):
- arrive  .19,1,.22,1   – content entering (masks, curtains, blocks)
- settle  .165,.84,.44,1 – paragraphs, small UI
- glide   .65,0,.35,1    – scrubbed / camera / hairline draws
- curtain .76,0,.24,1    – clip-path wipes
- breathe .45,0,.55,1    – opacity cross-fades (poster→video)
- leave   .5,0,.75,0     – exits (opacity only)
Durations: mask line 1000ms (90ms line stagger, accent +150ms) · block fade-up 800ms, 16px rise ·
curtain 1200ms with inner image scale 1.08→1 over 1600ms · hairline draw 1200ms · hover 200ms · press 120ms ·
exits 400ms. Max total stagger in a group 500ms. CTAs never animate in (they are simply there).
Banned: blur-in, springs/bounce/overshoot on content, scale-pop chips, idle bobbing/floating, spinning
turntables, count-up numbers (one DigitRoll on a hero figure allowed), replay buttons, marquee tickers,
slide-in-from-side, typewriter, gradient text, glows, parallax > 8%.
Reveal trigger: one shared IntersectionObserver, rootMargin bottom -14%, once. No-JS / reduced-motion =
content visible (`html.js` gate). Reduced motion: opacity cross-fades 400ms only, end-frames of scenes.
Scroll: Lenis 1.3.26 root, lerp 0.09, syncTouch false, smoothWheel true; remove `scroll-behavior: smooth`;
stop Lenis while the video lightbox is open. Anchor links via lenis.scrollTo with offset -80, duration 1.4, glide.
Header: hides on scroll down after 120px, shows on scroll up (transform only, 400ms settle); inverts to cream
type over dark sections via `data-header="dark"` on sections.

## 3. The 3D look (engine in `src/three/`, vanilla three 0.186.1, no R3F)
Warm greige clay architectural model, AgX tone mapping, soft sun from upper-left, RoomEnvironment fill at
0.38, contact-shadow blobs, rounded geometry, ONE accent colour (rose) for "the thing that matters" (found
houses, the booklet's highlight). Real printed pages of Nýji kaflinn as textures. Camera: long lens (fov 28–32),
moves only in the first 60% of each step (glide), then holds still (dwell). No idle motion. Labels = tracked
caps on a drawn hairline callout (DOM overlay, projected from world points).
Scenes are pure functions of a global progress g ∈ [0, steps]; the same function drives scroll scrubbing on the
site AND frame-exact film capture (so films and site match by construction).

## 4. Storyboards
### 4a. Home story ("Svona virkar það", 5 steps, pinned) — DONE in `src/three/stories/home.ts`
0 Nýtt heimili: the house; a plinth slides in, six objects rise in a row with callouts
  (Tryggingar, Málning, Húsgögn, Gluggar, Gólfefni, Rafmagn).
1 Bæklingurinn: the objects fly into Nýji kaflinn which lands and opens on the real spread.
2 Traust fyrirtæki: pages turn, four real coupons (Parki, Ormsson, Íspan, Mús) fan above the booklet.
3 Kerfið: the town rises around the house; new-owner homes turn rose, a ring opens under each, pins rise.
4 Dreifing: a print stack builds, copies fly to the found homes, the last one slides into this door's slot.

### 4b. Business story (/fyrirtaeki, 4 steps, pinned) — `src/three/stories/business.ts`
0 Ný fyrirtæki: a quiet clay street of office/shop buildings; one new office rises (rose door/awning).
  A plinth slides in, six objects rise with callouts: Bókhald (ledger), Tryggingar (shield), Vefsíða (screen),
  Banki (card), Tölvur (laptop), Hönnun (pen + swatch).
1 Bæklingurinn: objects condense into the NÝR REKSTUR booklet (`/svif/kafli/biz-cover.jpg`), it opens; a page of
  category tiles lifts slightly, ONE tile per category, one highlighted rose = "eitt fyrirtæki í hverjum flokki".
2 Kerfið: the street pulls back to a wide district; newly registered companies light up one by one
  (rose roof/door + ring + pin), same vocabulary as the home story.
3 Dreifingin: a print stack, copies fly out to the lit offices; the last slides into the new office's door.

### 4c. Films (rendered from the same scenes, 25 fps, 1920×1080, H.264 + poster)
Homeowner film (~45 s) = the home story played through with title cards in the site's type (white Jost on the
dark stage between scenes, ink on the light scenes), dwell holds ≥ 2 s, dissolves through #2e2a24.
Company film (~52 s, beats from `oldvideo-src/.../HANDRIT.md`) = business story + the same card system.
Warm, quiet soundtrack (felt piano / soft pads, no EDM risers), −14 LUFS, sound events on landings.

## 5. Copy rules (binding)
Icelandic, plain, confident, short. No em-dash flourishes (max one per page), no "raunverulegt/raunverulegur",
no triplet rhythm ("X, Y og Z" lists only when they are real lists), no rhetorical questions, no exclamation marks,
no "lausn/lausnir", no "einstakt tækifæri", no superlatives we can't prove. Every claim must be one we already
make on the current site (80% framkvæmdir, um 500 heimili á mánuði, um 250 ný fyrirtæki á mánuði,
6 mánuðir vs 5 ár). Headings ≤ 8 words, body ≤ 2 short sentences. Keep the owner's own lines verbatim:
"Við tengjum ykkur við alla nýja húseigendur á höfuðborgarsvæðinu." and "Þess vegna bjuggum við til SVIF".

## 6. Copy deck — home (`src/routes/index.tsx`)
Hero (dark): tagline "SVIF · Nýji kaflinn". H1 (keep). Sub: "Nýir húseigendur fá Nýja kaflann inn um lúguna,
með sérkjörum frá völdum fyrirtækjum." CTAs: "Bóka pláss" (solid) · "Sjá hvernig" (outline).
Facts row: "Um 500 heimili á mánuði" · "Örfá fyrirtæki í hverjum flokki" · "Hannað, prentað og sent af SVIF".
Story eyebrow "Frá sölu að póstlúgu", title "Svona virkar það."
 01 Nýtt heimili — "Um 80% nýrra húseigenda ráðast í framkvæmdir" — "Fyrstu mánuðina þarf að tryggja, mála,
    skipta um gólf og kaupa inn. Og velja hverjum á að treysta."
 02 Bæklingurinn — "Þess vegna bjuggum við til SVIF" — "Nýji kaflinn kemur inn um lúguna með traustum
    fyrirtækjum fyrir hvert verkefni heimilisins."
 03 Traust fyrirtæki — "Örfá traust fyrirtæki í hverjum flokki" — "Hvert þeirra býður nýjum húseigendum
    sérkjör. Afslátt, fría úttekt eða betra verð."
 04 Kerfið — "Kerfið finnur nýja húseigendur" — "Við sjáum þegar kaup eru skráð og sendum bæklinginn
    þangað. Hvergi annað."
 05 Dreifing — "Við hönnum, prentum og sendum" — "Þú sendir merki, myndir og tilboð. Við gerum auglýsinguna
    og hún fer heim til nýrra eigenda."
 Film button under the story: "Horfa á myndbandið" (1 line, hairline style, not a fat pill).
Af hverju SVIF (dark), 4 visual cards (image above, title, one line):
 "Þar sem eftirspurnin er" — "Bæklingurinn fer aðeins til þeirra sem voru að kaupa."
 "Rétt tímasetning" — "Nýir húseigendur eyða meiru fyrstu 6 mánuðina en næstu 5 ár á eftir."
 "Tilboð sem er geymt" — "Sérkjörin gera bæklinginn að einhverju sem fólk geymir."
 "Þú ert fyrst í röðinni" — "Þegar þörfin kemur hefur nýi eigandinn þegar séð tilboðið þitt."
Form section (dark): "Bóka pláss í næsta bæklingi" — fields: Nafn fyrirtækis, Kennitala, Tilboð (+ netfang/sími
as already built). Button "Senda". Success: "Takk. Við höfum samband innan tveggja virkra daga." (only if the
current site already promises a response time; otherwise "Takk. Við höfum samband fljótlega.")

## 7. Copy deck — /fyrirtaeki
Hero: tagline "SVIF · Nýr rekstur". H1: "Við tengjum ykkur við *öll ný fyrirtæki* á Íslandi." Sub: "Nýir
fyrirtækjaeigendur fá bækling með sérkjörum frá völdum fyrirtækjum, á fyrstu vikum rekstrarins."
Story (order changed to match the home logic):
 01 Ný fyrirtæki — "Hundruð nýrra fyrirtækja í hverjum mánuði" — "Hvert þeirra þarf bókhald, tryggingar,
    banka, vefsíðu og búnað. Og velur það allt á fyrstu vikunum."
 02 Bæklingurinn — "Bæklingur fyrir nýja fyrirtækjaeigendur" — "Eitt fyrirtæki í hverjum flokki. Auglýsingin
    ykkar stendur ein."
 03 Kerfið — "Kerfið finnur nýskráð fyrirtæki" — "Um leið og fyrirtæki er skráð vitum við af því. Um allt land."
 04 Dreifingin — "Við hönnum, prentum og sendum" — "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins."
NOTE: "NÝR REKSTUR" is a placeholder name for the business brochure; keep it but it is flagged to the owner.

## 8. File ownership during the parallel build (do not edit files you don't own)
- `src/three/**`, `src/components/story/**`, `lab/**` → 3D/story owner (lead + business-story agent:
  business agent owns ONLY `src/three/stories/business.ts`, `src/three/builders/office.ts`,
  `src/three/builders/bizprops.ts`, `lab/biz.*`).
- Everything else in `src/` (routes, components, styles, motion) → motion-system agent.
- The motion agent mounts the story/hero via the provided components only:
  `import { HomeStorySection } from "@/components/story/HomeStorySection"`,
  `import { BusinessStorySection } from "@/components/story/BusinessStorySection"`,
  `import { HeroBooklet } from "@/components/story/HeroBooklet"` (all exist as stubs; props documented there).
