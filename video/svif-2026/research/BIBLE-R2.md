# SVIF round 2 — binding brief (read with BIBLE.md; where they differ, THIS file wins)

The owner reviewed the delivered site and liked the look and the 3D story ("I really like the animation, I think it
looks really good"). Round 2 is about CLARITY (a newcomer must understand the idea instantly), LAYOUT (50/50, centred,
symmetric, bigger type) and POLISH (nothing passes through floors or through other objects, page turns flawless).
Verbatim feedback: research/user-feedback-r2.md (read it). Everything below is the lead's binding interpretation.

## 1. Global rules (new)
- **No interpenetration, ever.** No object may pass through the ground, the plinth, another object or the booklet at
  any g. Allowed entrances: (a) settle from slightly above (≤ 0.6 units) with fade-in (material opacity) and ease-out;
  (b) grow from the base (scale.y from ~0 with the pivot at the ground — reads as being built, not as rising through
  the floor); (c) camera reveal. Allowed exits: fade (opacity) with a small lift, or camera moving away. NEVER rise
  up through the ground or sink into it, never shrink into another object.
- **Symmetry.** Story scenes are composed centred in the frame (house/office on the vertical centre line). No more
  sideways frame shift for a side copy column.
- **Titles are always visible, large and close to the visual.** Never a small caption far from the 3D.
- **Facts (owner, round 2):** 350–500 homes per month on the capital area (höfuðborgarsvæðið); distribution is
  WEEKLY (important); payment is monthly and the price depends on how many pages you buy; discounts are not
  mandatory but highly recommended; no coupon codes needed (the SVIF system shows the company every home that got the
  booklet; when people call they mention their address and the company confirms it in the system); what's included:
  a 3D mock-up of the flyer, a copy of the flyer sent to the company, design, printing, shipping, access to the
  system, and a monthly conversation to improve the ad and go over the results; competitors: ONE company per category.
  Business flyer: hundreds of new companies are started every month; ~250 copies a month across Iceland (site's
  existing figure). Do not write "Örfá (traust) fyrirtæki í hverjum flokki" anywhere any more.
- Keep the owner's own lines where they still fit: "Við tengjum ykkur við *alla nýja húseigendur* á
  höfuðborgarsvæðinu.", "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup", "Þess vegna bjuggum við til
  SVIF".

## 2. Hero (both pages)
- 50/50: text block in the LEFT half, the booklet in the RIGHT half, both vertically centred between the frame's top
  and bottom label rows. Bigger type (H1 noticeably larger, sub larger, CTAs larger), tighter, intentional spacing
  between the corner labels (Velkomin / 65°N · 19°W / 350–500 heimili á mánuði / Hannað, prentað og sent af SVIF),
  the tagline, H1, sub and CTAs. Phones: text on top, booklet below, both centred.
- Booklet load animation (time-based, plays once on load, ≈ 4.5–5.5 s): arrives and settles → the cover opens → it
  riffles through ALL the pages fast (real pages: /baeklingur/sidur/p00–p31.webp, use 512 px copies) → closes →
  rests closed, cover up. That end state is final. NO scroll-linked opening any more. Pointer tilt ≤ 2.5° may stay.
  Reduced motion / no WebGL: the closed booklet still. Business hero: same with the business booklet (cover
  biz-cover.jpg; its inner pages drawn in the flyer style: categories, offers as examples without company names).

## 3. Home story ("Svona virkar það") — 6 steps, problem first
Layout (pinned stage): a FIXED header at the top of the stage that never moves while scrolling: "SVONA VIRKAR ÞAÐ"
with the accent "frá sölu að póstlúgu" + the step counter (01 / 06). Directly under it, centred: the step TITLE,
large (display caps with one serif-italic accent), then ONE short line. The 3D scene fills the space below, centred
and symmetric. Phones: same order (header, title, line, scene), all centred. The current eyebrow/title block that
scrolls away above the stage goes away (it lives in the stage now).
 01 Vandinn — show the PROBLEM: a house that was just sold (a clay "SELT" sign at the path, a key ring / moving boxes)
    and everything the new owners now need appears around it (tryggingar, málning, húsgögn, gluggar, gólfefni,
    rafmagn) — callouts as now. Title (owner): "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup".
    Line: the problem in plain words (e.g. they need many services at once and don't know whom to trust).
 02 Lausnin — "Þess vegna bjuggum við til SVIF": the booklet arrives. The objects must NOT shrink into it or pass
    through it: they fade out gracefully (or settle away) while the booklet lands in the clear space; it opens and
    turns 2–3 real pages with a flawless page turn (no flicker, no z-fighting, no clipping, paper bend, the turned
    leaf lands flat on the left stack, soft shadow under the turning leaf).
 03 Sérkjör — trustworthy companies giving discounts to the people who need their services right now: the real
    coupons lift out of the booklet (Parki, Ormsson, Íspan, Maus) — ideally each lands next to the need it solves.
 04 Hönnun — "Við hönnum": an ad being designed on a page — hairline layout guides draw, image/text/coupon blocks
    snap into place, the finished real ad page resolves.
 05 Prentun — "Við prentum": a sleek clay press (or stack feeding) — printed copies build a neat stack.
 06 Dreifing — "Og sendum til allra nýrra húseigenda á höfuðborgarsvæðinu, í hverri viku": aerial of the capital-area
    clay town; a SVIF delivery van drives the streets and copies arc to the new owners' doors (rose homes), ending on
    this house's door with the booklet half-way through the slot. Line about the benefit: they get your discount
    right when they need your service. NO "kerfið finnur…" step on the home page.
The title must MATCH the animation in every step.

## 4. Business story (/fyrirtaeki) — 4 steps
 01 Hundruð nýrra fyrirtækja á mánuði — several new offices open (one after another, "Nýtt" signs/rose doors) and
    the needs rise (bókhald, tryggingar, vefsíða, banki, tölvur, hönnun): they need all of it, now.
 02 Bæklingurinn — a booklet with discounts from the companies new owners need; on its category page the categories
    light up ONE AFTER ANOTHER (Bókhald → Tryggingar → Vefsíða → Banki → …), each briefly lifting in rose — "eitt
    fyrirtæki í hverjum flokki".
 03 Kerfið — here the system IS shown: an "AI" system orb (premium, not sci-fi: a pearl/glass sphere with a soft
    living inner light, hovering over the district) sends hairline arcs down to newly registered companies one by one;
    each gets a small "NÝTT FYRIRTÆKI" label and lights rose; a quiet counter ticks up (DigitRoll-style). Pulses may
    travel along the arcs, subtly.
 04 Dreifingin — zoom to the SVIF delivery van driving through the streets to the new companies; booklets delivered;
    end on the new office's door slot.
Same layout as §3 (fixed header "SVONA VIRKAR ÞAÐ · frá stofnun að póstkassa", large centred title, one line, centred
scene).

## 5. "Meira um hugmyndina" (replaces "Rétta fólkið á réttum tíma" + the FAQ, on BOTH pages)
A stepper of reasons and common questions: one item at a time, arrows (prev/next), dots/numbers, keyboard (←/→),
swipe on touch, accessible (tabs/tabpanel or carousel pattern with aria-live). Desktop 50/50: text left (number,
question/reason as a large title, 1–3 short sentences), visual right. Each item has its OWN new visual — a small 3D
clay vignette in the site's look that ANIMATES when the item becomes active (≈ 1.5–3 s, then holds still), with crisp
DOM overlays for numbers/labels. Do NOT reuse the story's scenes or stills. Reduced motion / no WebGL: a pre-rendered
end-frame still per item. Dark section (cream type), the vignette in a light rounded panel.
Home items (order): 1 Af hverju virkar þetta (THE selling point: many companies compete for new homeowners; a
discount in their hands at the right moment makes yours the one they call) · 2 Rétt tímasetning (arrives in the
first weeks after the purchase, weekly) · 3 Hversu mörgum er dreift (350–500 á mánuði, vikulega) · 4 Þarf afslátt
(no, but highly recommended) · 5 Þarf afsláttarkóða (no — the system, address confirmation) · 6 Hvernig er greitt
(monthly, by pages) · 7 Hvað er innifalið (list) · 8 Leyfið þið samkeppnisaðila (no — one per category).
Business items: the same set adapted (new companies; ~250 a month across Iceland; confirmation by company name /
kennitala; one per category).

## 6. Sections and order
Home: Hero (dark) → Svona virkar það (pinned) → Meira um hugmyndina (dark stepper) → Flokkað eftir verkefnum
heimilisins (background = the peach of the business teaser, #efe7da) → business teaser (switch to cream so the two
don't merge) → Bóka pláss (dark) → footer. The old FAQ section is removed (its useful answers move into the stepper).
/fyrirtaeki: Hero (dark) → story → Meira um hugmyndina (business) → Flokkar (peach) → Bóka pláss (dark) → footer.

## 7. Films
After the stories are rebuilt, both films are re-rendered from the new stories with the new copy (lead does this).
