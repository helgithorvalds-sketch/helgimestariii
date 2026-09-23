# Miðatorg — design v2: simple, light, professional

This supersedes the dark "terminal" look in DESIGN.md. Keep DESIGN.md's component inventory and
responsive/a11y rules, but apply the tokens, tone and simplifications below. The goal: an app a
first-time visitor understands in five seconds. Think tix.is / a clean ticket site, not Polymarket.

## 1. Tokens (shadcn CSS variables, HSL triplets, scoped to `.midatorg`; light only, no `.dark`)

```css
.midatorg {
  --background:             0 0% 100%;      /* #FFFFFF */
  --foreground:             222 47% 9%;     /* #0F172A near-black text */
  --card:                   0 0% 100%;      /* #FFFFFF */
  --card-foreground:        222 47% 9%;
  --popover:                0 0% 100%;
  --popover-foreground:     222 47% 9%;
  --primary:                221 83% 53%;    /* #2563EB blue: buttons, links, active tabs */
  --primary-foreground:     0 0% 100%;
  --secondary:              214 32% 96%;    /* #F1F5F9 light grey fill */
  --secondary-foreground:   222 47% 9%;
  --muted:                  214 32% 96%;    /* #F1F5F9 */
  --muted-foreground:       215 16% 40%;    /* #57657A captions (7.0:1 on white) */
  --accent:                 214 95% 96%;    /* #EBF2FF light blue hover / selected */
  --accent-foreground:      221 83% 40%;    /* #1D4ED8 */
  --destructive:            0 72% 45%;      /* #C22626 */
  --destructive-foreground: 0 0% 100%;
  --border:                 214 20% 89%;    /* #DDE3EA */
  --input:                  214 20% 89%;
  --ring:                   221 83% 53%;
  --radius:                 0.75rem;        /* 12px, friendlier than 8px */

  /* semantic (kept for compatibility with existing classes) */
  --ask:                    221 83% 53%;    /* sell side now uses the same blue */
  --ask-foreground:         0 0% 100%;
  --bid:                    221 83% 53%;    /* wanted side: blue outline instead of amber */
  --bid-foreground:         0 0% 100%;
  --up:                     152 60% 32%;    /* #21804F "undir miðaverði" text on white (5.6:1) */
  --down:                   0 72% 45%;      /* only for errors/over face value */
  --verified:               221 83% 40%;    /* #1D4ED8 badge text on light-blue fill */
  --surface-2:              214 32% 97%;    /* #F4F7FA raised panel */
  --chart-line:             221 83% 53%;
  --chart-fill:             221 83% 53%;    /* at 8% alpha */
  --ph-1: 221 60% 92%; --ph-2: 262 50% 92%; --ph-3: 0 50% 93%;   /* soft placeholder tiles */
  --ph-4: 160 45% 92%; --ph-5: 35 70% 92%;  --ph-6: 199 60% 92%;
}
```

Placeholder tiles use dark text (`text-foreground/70`) on these soft fills. No gradients.

## 2. Type and spacing

Inter only. Body 15px (16px on ≥ md), captions 13px, card title 16px semibold, page title 26–30px
bold, section titles 18–20px semibold. Line height 1.45. Tabular numerals for prices. No monospace.
Spacing scale 8/12/16/24/32. Cards: 1px `border-border`, `rounded-xl`, white, hover: `shadow-md` and
`border-primary/40`. Buttons: 40px tall (44 on phones), `rounded-lg`, primary = solid blue,
secondary = white with border, ghost = text blue. Focus ring 2px blue offset 2px.

## 3. Home (market)

- TopNav (white, 1px bottom border, sticky): wordmark "Miðatorg" (blue), search input, "Selja miða"
  primary button, "Innskrá" or avatar menu, bell, IS/EN. No keyboard hints, no eyebrow labels.
- Below the nav: a one-line intro on first visit, "Kauptu og seldu miða á viðburði á tix.is — beint á
  milli fólks, aldrei yfir miðaverði." and category tabs (Allt · Tónleikar · Leikhús · Íþróttir ·
  Hátíðir · Uppistand · Annað) as pills; sort as a small select ("Næst á dagskrá", "Mest eftirspurn",
  "Lægsta verð"). Remove the trending strip and the "N til sölu · M vilja kaupa" legend in the header.
- Grid: 1 column (phone) / 2 (sm) / 3 (lg) / 4 (xl). Card = tix.is style:
  image 3:2 on top (`object-cover`, rounded top; placeholder tile with initials if none) with a small
  white category chip in the corner; title (2 lines max); "fim. 8. jan. · Harpa" muted; bottom row:
  left "Frá 9.900 kr." in semibold (or "Engir miðar til sölu" muted) and, when under face value, a
  small green "−17% undir miðaverði"; right "3 til sölu · 5 vilja kaupa" muted 13px. Whole card is
  the link. No buttons on the card, no sparkline.
- "Sýna fleiri" secondary button centred. Empty state: "Engir viðburðir fundust" with a clear-search
  action.

## 4. Event page

- Header: image (16:9, max height 360px, rounded), then title, category chip, date/time, venue and
  city, "Sjá viðburð á tix.is ↗" link. Three buttons in a row (stack on phone): "Kaupa miða" (primary,
  scrolls to the list / opens the first listing), "Selja miða" (secondary), "Ég vil kaupa" (secondary);
  "Láta mig vita" as a ghost button with a bell.
- Summary strip: four plain facts in a bordered row: Miðaverð · Lægsta verð · Til sölu · Vilja kaupa.
  Nothing else (drop "Seldir" from the strip; show "15 miðar seldir hér" as a muted sentence under it).
- "Miðar til sölu" (h2): rows in a white bordered list: avatar + name + rating (★ 4,9) + "Staðfestur"
  chip, "2 miðar · Svalir A", price "9.900 kr. á miða" with small green delta, "Kaupa" primary button
  (secondary "Skoða" when the viewer is the seller). Empty: "Engir miðar til sölu núna. Vilt þú láta
  vita þegar miðar koma?" + button.
- "Óskað eftir" (h2): rows: name, "vantar 2 miða", "hámark 10.000 kr.", "Selja til" secondary button.
- "Verðþróun" (h2, optional section, collapsed by default on phones): the existing chart in blue with
  the face-value line, plain caption "Lægsta verð sem var til sölu hvern dag". No range buttons' mono
  styling; simple pill toggles.
- "Hvernig virkar þetta?" three numbered steps in plain words, and the sentence "Verð má aldrei fara
  yfir miðaverð svo miðarnir haldi gildi sínu hjá tix.is."
- Sticky bottom bar on phones with "Kaupa miða" and "Selja miða".

## 5. Everything else

Deal room, forms, account, admin, about and notifications keep their structure; the theme does the
work. Replace jargon: "Skráningar" → "Miðar", "Tilboðabók" → never, "Hámarksverð skv. tix.is" →
"Miðaverð", "Frátekt" is fine, "Ágreiningur" is fine. Stepper: blue for done/current, grey for the
rest. Chat bubbles: light grey for the other party, light blue for me. Tables (admin) are plain with
zebra rows.

## 6. Do not

No dark mode, no gradients, no mono fonts, no emoji, no urgency counters, no more than one accent
colour, no eyebrow/uppercase labels except tiny chips.
