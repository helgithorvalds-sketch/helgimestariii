# SVIF round 3 — binding brief (read with BIBLE-R2.md and BIBLE.md; where they differ, THIS file wins)

Owner's verbatim notes: research/user-feedback-r3.md. He likes the look, the booklet flips and the business
animations ("quite solid"). Round 3 = three changes: (1) the hero flip direction, (2) the "Svona virkar það" stories
become a step-by-step PLAYER instead of a scroll-scrubbed pin, (3) "Meira um hugmyndina" is redesigned (text inside a
bigger visual) with a new item list and clearer, more 3D animations. Same look, same tokens, same rules as before
(nothing passes through anything; luxurious, calm, crisp).

## 1. Hero booklet (both pages)
Flip from the BACK to the FRONT: the booklet arrives already open at the back (every sheet turned, the last spread
showing), settles, then the pages turn back one after another from the last to the first (free edges trailing, about
0.1 s apart), the front cover closes last, and it rests closed, front cover up. Total ≈ 5 s, once per load. No more
"left half swings back in one block". Same for the business hero. Reduced motion / no WebGL: the closed still.

## 2. "Svona virkar það" = a step-by-step player (both pages)
No scroll pinning and no scroll scrubbing any more. The section is one screen-tall stage (fixed header "SVONA VIRKAR
ÞAÐ · frá sölu að póstlúgu" / "· frá stofnun að póstkassa", the step's large title + one line centred above the scene,
the 3D scene centred below, exactly as now) plus PLAYER CONTROLS, like a chaptered video:
- When the section comes into view it shows the first step's opening frame with a clear start control ("Spila" with the
  running time, e.g. "6 skref · 45 sek."). Nothing plays until the visitor starts it.
- Playing: each step plays its own animation (time-based; the same scene code, g driven by time instead of scroll),
  holds while its title is read, then the next step follows automatically, like a video. At the end it rests on the last
  step with "Spila aftur".
- Chapter bar at the bottom: one chip per step (number + chapter name on desktop, numbers on phones) with a thin
  progress fill for the playing step; click a chip to jump to that step (a short dip to the stage colour, then that step
  plays from its start); ‹ › previous/next; play/pause; keyboard ←/→/space when the player has focus.
- Pauses when it scrolls out of view, resumes when back if it was playing. Phones: same player (canvas on top,
  controls reachable). Reduced motion: no autoplay; the chips switch between the pre-rendered step stills.
- Step timing ≈ the films' step windows (home ≈ 45 s total, business ≈ 31 s).
- The owner's Lovable wheel pacing (src/lib/scroll.ts, src/lib/scroll-input.ts + test, AGENTS.md) stays untouched; with
  no pinned track it simply does nothing. Keep StoryStage's `paced` prop accepted.

## 3. "Meira um hugmyndina" — redesign (both pages)
Layout: the visual becomes BIG and wide (spread out, like a video frame across the content width) and the text sits
INSIDE it (number, question title, short answer overlaid on the panel's calm top-left area); controls (‹ 01–06 ›) at the
panel's bottom edge. Text and visual are always read together. Phones: the panel is taller, text overlaid at its top,
scene below, controls under it. All overlay labels/lines stay clear of 3D text and printed pages (no hairline across the
coupon/ad text).
Items, HOME (6, in this order):
 1 Af hverju virkar þetta? — NEW, clear 3D animation: a new home; around it many companies of the SAME trade
   (painters: e.g. little clay painter shops or painter vans with a paint-roller/paint-can sign — real 3D objects, NOT
   flat boxes with logos) all competing; Nýji kaflinn arrives through the letterbox; the one with the offer in the
   booklet lights rose and is chosen (a hairline from the home to it), the others fade back.
 2 Hversu mörgum bæklingum er dreift? — the clay relief map of Iceland (the business one, adapted): the capital area lit
   (350–500 á mánuði), plus Norðurland (Akureyri) and Suðurland marked as coming ("Væntanlegt") in a quieter style.
   Copy: "Við byrjum á höfuðborgarsvæðinu og bætum fleiri landshlutum við." (owner's own round-1 idea).
 3 Hvenær er dreift? — the calendar animation (the booklets stacking on the same weekday every week): "Í hverri viku."
 4 Þarf ég að bjóða afslátt? — keep the animation; fix the label lines that cross 3D text.
 5 Hvað er innifalið í verðinu? — the tray, but the "3D mock-up" becomes a DIGITAL copy ("rafrænt eintak": the booklet
   on a laptop/tablet screen) next to the printed copy sent to you; answer ends "Greitt er mánaðarlega."
 6 Fá keppinautar mínir líka pláss? — "Nei. Aðeins eitt fyrirtæki í hverjum flokki." Rebuilt in real 3D (no flat
   boxes with logos): e.g. the open booklet's category spots each holding one 3D trade object (paint can, window,
   lamp, armchair, tiles, shield…); a second paint can (a competitor) arrives, finds the spot taken and steps back/fades.
 DELETED: "Hvenær berst bæklingurinn?" (timeline), "Þarf ég afsláttarkóða?", "Hvernig er greitt?" (folded into 5).
Items, BUSINESS (6, same order, same changes): 1 why (many accounting firms / banks etc. as real 3D offices or vans
competing for a new company; the business booklet arrives; the one with the offer is chosen) · 2 how many (the Iceland
map as now, "Um 250 á mánuði, um allt land") · 3 when (the calendar, business variant, "Í hverri viku") · 4 discount
(keep, fix lines) · 5 included (digital copy, monthly payment) · 6 competitors (3D rebuild with business objects).
The two pages' animations must not look like copies of each other where the subject differs.

## 4. Copy
- Remove every "three-month contract" claim ("Samningurinn er til þriggja mánaða…", "Á þremur mánuðum nær…") everywhere.
  Payment is monthly ("Greitt er mánaðarlega.").
- No "afsláttarkóði" item. No "þrívíddarmynd" (3D mock-up) in what's included: "rafrænt eintak af bæklingnum".
- Native-quality Icelandic, BIBLE §5 rules.
