# SVIF · Fyrir nýbakaða foreldra: explainer video (design)

Approved by Helgi on 26 Nov 2026.

## Intent
An ad aimed at new parents and the people around them (grandparents, friends). It shows how many things
a new parent has to sort out, folds them all into one booklet of discounts, explains that a relative orders it
with a simple form, and makes it clear that printing, assembly and delivery are all free.

## Goals
- Same look as the SVIF fyrirtæki video: white clay 3D world, logo top left, chapter bar top right,
  small label + big headline + subtitle bottom left. Accents in baby pink and blue.
- Every object builds from 0 to 100 (grows, extrudes, draws, types). Nothing pops in.
- Scenes flow into each other with no hard cuts. Cuts and big moves land on the beat (~110 BPM).
- Icelandic on-screen text.

## Non-goals / anti-goals
- No real company names; categories only. Discount numbers are examples.
- No real personal data in the order form (made-up kennitala).
- No final booklet cover design yet: a placeholder that is easy to swap.

## Storyboard (~2:30)
1. Pregnant figure (pink) on a round platform with rings. „Það er barn á leiðinni.“
2. 48 category tiles build up around her; the camera pulls back until they cover the floor. „Hvar á að byrja?“
3. The fold: tiles click together into one sheet, the sheet folds in half like a map, one fold per beat;
   a cover wraps the stack and it becomes the booklet.
4. The booklet opens on example discount pages (bílstólar, barnavagnar, ungbarnasund, nýburamyndataka).
   „Allt sem nýbakaðir foreldrar þurfa, á einum stað.“
5. Who orders: amma, afi, vinir or the parents. A pink/blue/white order page builds itself, fields fill
   (nafn, kennitala, heimilisfang), the cursor clicks „Senda“.
6. Xiaomi-style transition: the form bursts into floating objects that regroup into each step while the
   background colour shifts: printer („Við prentum. Frítt.“), assembly („Við setjum saman. Frítt.“),
   van to a house („Við sendum heim. Frítt.“).
7. The booklet comes through the door, everything else fades, the booklet moves left; right side:
   Prentun 0 kr · Samsetning 0 kr · Sending 0 kr → „Alveg frítt.“
8. End card: SVIF · Fyrir nýbakaða foreldra. „Allt á einum stað. Frítt.“

## Approaches considered
- three.js rendered frame by frame in headless Chromium, composited with full-HD 2D text, piped to ffmpeg (chosen:
  fast enough on this 4-core CPU machine, deterministic, full control).
- Blender (Cycles) via Python: best lighting but ~20 s/frame on CPU, i.e. a day of rendering. Rejected.
- 2.5D CSS/Remotion: cannot do the fold and the clay world convincingly. Rejected.

## Builder's calls
- Music: original track generated with ElevenLabs, scene changes on bar lines.
- Source lives in `video/foreldrar/` so it survives the session.
