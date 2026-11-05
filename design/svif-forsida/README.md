# Svif – new cover and back page (5 concepts)

Square (1:1) cover and back page concepts for the Svif welcome booklet sent to new homeowners.
Each concept has a front, a back, a mockup on a wooden table and an overview board in `final/`.

| # | Concept | Headline (front) | Back page | Based on |
|---|---------|------------------|-----------|----------|
| 01 | Nýr kafli | NÝR KAFLI | "Til hamingju" in script, short welcome text, QR code to svif.is | Reference 2 (blurred hallway, four-corner text) |
| 02 | Heima er best | heima / ER BEST. | "Til hamingju með nýja heimilið." | Reference 1 (sunlit room, serif headline, line + icon + arrow) |
| 03 | Velkomin heim | Velkomin *heim.* | "Allt fyrir nýja heimilið": the categories in the booklet | Reference 2 in Svif's own lavender and ink colours |
| 04 | Til hamingju | Til hamingju *með nýja heimilið.* | "Geymdu hann. *Hann borgar sig.*" | Reference 1 photo cut into the house shape from the Svif logo |
| 05 | Fyrsti kafli | Nýja *heimilið* | "Næstu kaflar": a table of contents | Reference 1 as an ink-blue duotone, laid out like the first page of a book |

## Round 2 – Nýji kaflinn, Heima, and beige paper

Changes after feedback: thinner title fonts, broken frame lines near the edges (not a full frame), a line with the logo or house below the title, a brighter Heima photo, and "Nýji kaflinn" instead of "Nýr kafli".

| # | Front | What changed |
|---|-------|--------------|
| A1 | NÝJI KAFLINN | Thin sans (Inter 200). Broken frame lines. Svif logo inside the line under the title. svif.is at the bottom. |
| A2 | nýji kaflinn | Same serif as "heima". Line with house and arrow, vertical side text, broken frame lines. |
| B1 | heima / ER BEST. | Brighter photo, broken frame lines, line with house and arrow. |
| B2 | heima / ER BEST. | Closer to the sunbeam, brighter. Logo inside the line, text in the corners. |
| C1 | heima (beige) | Beige paper with the photo inset, bleeding off the right and bottom (Torrance reference). |
| C2 | NÝJI KAFLINN (beige) | Beige paper, vertical title in the margin, photo bleeding off the top and right (Torrance reference). |

Files: `final/v2-*-front.jpg`, `-back.jpg`, `-mockup.jpg` (C1 and C2 on beige paper, the rest on wood) and `-board.jpg`.

Note: standard Icelandic spelling is "nýi kaflinn". "Nýji" is the spoken form. Search and replace in `designs/v2-*.html` to change it.

```bash
node tools/mockup.cjs 1.5 v2-c1-heima-beige:beige   # ":beige" = beige paper surface
```

## Brand (from svif.is)

- Colours: ink `#232046`, lavender `#eaeaf4`, cornflower `#8fa3dc`, primary `#5b74c4`
- Fonts: Instrument Serif (headlines), Inter (small caps, body text), Archivo, plus Barlow (concept 02, as in reference 1) and Pinyon Script (concept 01 back, as the "Curated" script in reference 2). All are Google Fonts, stored in `fonts/`.
- Logo: `src/logo-white.png`, `src/logo-white-roof.png` and `src/logo-ink.png` are recoloured from the logo on svif.is.

## Files

- `final/*-front.jpg`, `*-back.jpg`: 2400 × 2400 px (20 × 20 cm at 300 dpi), JPEG quality 95
- `final/*-mockup.jpg`: front and back lying on a table, 2400 × 1800 px
- `final/*-board.jpg`: front, back and mockup on one sheet, for comparing concepts

## Notes before printing

- The photos are the two reference images. Their text was removed with inpainting and they were upscaled about 2× (concept 01 and 03: about 3×). They are fine on screen and for proofs. For print, use the original high-resolution photos, or photos you have the rights to. The reference images likely belong to other people.
- The table in the mockups is a generated wood texture, not a photo.
- No bleed has been added. Add 3 mm bleed when you set up the print file.
- The QR codes point to https://svif.is.

## Re-render

```bash
cd design/svif-forsida
node tools/render.cjs designs/d2-heima.html final/d2-heima 2.4
node tools/mockup.cjs 1.5 d2-heima
node tools/board.cjs d2-heima
```

The text is plain HTML in `designs/*.html`, so headlines and copy can be edited and re-rendered.
