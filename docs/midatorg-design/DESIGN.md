# Miðatorg — implementation spec (DESIGN.md)

**Chosen direction:** `terminal` (panel aggregate 22 / nordic 18 / editorial 18), with grafts from the other two.

## 1. The idea

Every event on tix.is is a tiny market, so the home page is a dense grid of market cards that each lead with one number (the lowest asking price and how far it sits under face value) and the event page is a calm trading terminal: five stat tiles, a step-line price chart with the face-value ceiling drawn on it, and a two-sided list of people selling and people wanting. It borrows Polymarket's look (near-black canvas, 1px borders, hierarchy by colour saturation, tabular numbers) but speaks plain Icelandic to concert-goers, never holds money, caps prices at miðaverð, and uses no urgency tricks.

Reference mockups (self-contained HTML, open in a browser at 1440 and 390):

- `docs/midatorg-design/mockup-home.html` — market home
- `docs/midatorg-design/mockup-event.html` — event page
- (rendered screenshots live in the design session, not in the repo)

Grafts adopted from the losing directions: amber want-side colour (nordic), cap sentence directly under the event CTAs and a trust box that explains the Staðfestur badge (nordic), row detail "saman eða sitt í hvoru lagi" / "hvaða sæti sem er" (nordic), "Sýna sem töflu" chart fallback (nordic), step-function price line with dashed labelled face-value ceiling and endpoint price label (editorial), numbered trending strip (editorial, but with delta-vs-face-value, not 7-day change), nav/section tagline "Verð aldrei hærra en miðaverð · Engin þóknun · Greitt beint á milli fólks" (editorial), "Uppselt á tix.is" chip and "ekki frá endursöluaðilum" sentence (editorial), dative sort options (editorial).

Fixes applied to the winner: JetBrains Mono removed from prices, dates and counts (Inter tabular figures instead; mono kept only for axis ticks, the `/` kbd hint and step numerals); blue no longer does quadruple duty (bid side is amber, verified is light blue, primary/chart are blue); only one coloured button per card ("Ég á miða" is a neutral outline); "Virkur markaður" pill replaced with "Uppselt á tix.is"; trader vocabulary replaced (Tilboðabók → Skráningar, Býður → Hámarksverð, Efri mörk → Hámarksverð skv. tix.is, chart caption in plain words); tap targets raised (card buttons 34px desktop / 40px phone, order-book buttons 34px, chips 34px, range buttons 32px); sort control kept on phones; prices wrapped as one unit; solid placeholder tiles instead of gradients; one `ask`/`bid` button variant instead of tinted + solid pairs.

## 2. Tokens (shadcn/ui CSS variables, HSL triplets)

Put these on `:root` (the app is dark-only; `color-scheme: dark`). Hex equivalents are what the mockups use.

```css
:root {
  --background:            220 29% 6%;     /* #0B0E14 canvas */
  --foreground:            220 32% 92%;    /* #E6EAF2 */
  --card:                  222 27% 10%;    /* #12161F card / panel */
  --card-foreground:       220 32% 92%;    /* #E6EAF2 */
  --popover:               221 25% 12%;    /* #181D28 */
  --popover-foreground:    220 32% 92%;    /* #E6EAF2 */
  --primary:               221 83% 53%;    /* #2563EB blue, buttons + chart only, never body text */
  --primary-foreground:    0 0% 100%;      /* #FFFFFF */
  --secondary:             221 25% 12%;    /* #181D28 raised neutral fill (outline/secondary buttons on hover) */
  --secondary-foreground:  220 32% 92%;    /* #E6EAF2 */
  --muted:                 221 25% 12%;    /* #181D28 */
  --muted-foreground:      218 15% 60%;    /* #8A95A8 captions, labels */
  --accent:                222 26% 15%;    /* #1C2230 hover row / menu item */
  --accent-foreground:     220 32% 92%;    /* #E6EAF2 */
  --destructive:           0 72% 51%;      /* #DC2626 */
  --destructive-foreground:0 0% 100%;      /* #FFFFFF (4.83:1) */
  --border:                220 23% 18%;    /* #232A38 */
  --input:                 220 23% 18%;    /* #232A38 */
  --ring:                  217 91% 60%;    /* #3B82F6 */
  --radius:                0.5rem;         /* 8px */

  /* custom */
  --ask:                   146 69% 39%;    /* #1FA85A sell side: "Kaupa", "Til sölu" */
  --ask-foreground:        220 29% 6%;     /* #0B0E14 ink on solid ask */
  --bid:                   36 77% 61%;     /* #E8AB4E want side: "Selja til", "Óskað eftir", "Láta vita", waitlist headline */
  --bid-foreground:        220 29% 6%;     /* #0B0E14 ink on solid bid */
  --up:                    146 69% 39%;    /* #1FA85A price below face value (good for buyer) */
  --down:                  0 84% 60%;      /* #EF4444 price above face value / rising (text only) */
  --verified:              213 100% 74%;   /* #7CB8FF Staðfestur badge */
  --surface-2:             221 25% 12%;    /* #181D28 raised panel, tooltip, pressed segment */
  --chart-line:            221 83% 53%;    /* #2563EB */
  --chart-fill:            221 83% 53%;    /* used at 10% alpha: hsl(var(--chart-line) / 0.10) */

  /* event placeholder tiles (solid, initials on top) */
  --ph-1: 227 51% 35%;  /* #2B3F86 */  --ph-2: 308 40% 30%;  /* #6B2E63 */
  --ph-3: 358 41% 38%;  /* #8A3A3C */  --ph-4: 163 59% 26%;  /* #1B6A54 */
  --ph-5: 33 67% 30%;   /* #7F5119 */  --ph-6: 199 54% 31%;  /* #245E78 */
}
```

Tailwind config: map `ask`, `bid`, `up`, `down`, `verified`, `surface-2`, `chart-line`, `chart-fill` and `ph-1..6` as extra colours using the `hsl(var(--x) / <alpha-value>)` pattern so `bg-ask/10`, `border-ask/35`, `text-bid`, `bg-bid/10`, `fill-chart-fill/10` work.

Contrast (WCAG, computed):

| Pair | Ratio |
|---|---|
| foreground on background | 16.02 |
| foreground on card | 15.01 |
| foreground on surface-2 | 13.99 |
| muted-foreground on background | 6.39 |
| muted-foreground on card | 5.99 |
| muted-foreground on surface-2 | 5.58 |
| muted-foreground on ask 9% depth row | 5.37 |
| muted-foreground on bid 9% depth row | 5.17 |
| primary-foreground on primary | 5.17 |
| ask text on card / on ask 10% tint | 5.87 / 5.16 |
| bid text on card / on bid 10% tint | 8.93 / 7.53 |
| ask-foreground on solid ask; bid-foreground on solid bid | 6.26; 9.54 |
| up on card; down on card; down on background | 5.87; 4.81; 5.13 |
| verified on card / on verified 9% tint | 8.75 / 7.46 |
| destructive-foreground on destructive | 4.83 |
| foreground on ph-1..6 | 8.07 / 7.93 / 6.33 / 5.38 / 5.63 / 5.91 |

Rules that keep this true: `--primary` is a fill colour, never text on card (3.50:1); links are foreground with an underline. `--down` is text/stroke only, never a fill with white text (use `--destructive` for that). Never place muted-foreground on a tint stronger than 10%.

## 3. Typography

Two typefaces, both from Google Fonts:

- **Inter** 400 / 500 / 600 / 700 — everything, including every number.
- **JetBrains Mono** 400 / 500 — only chart axis ticks, the `/` keyboard hint, and step numerals. Never for prices, dates, counts or copy.

`html { font-feature-settings: "tnum" 1, "cv11" 1, "ss01" 1; }` and every number container gets `tabular-nums` (Tailwind `tabular-nums`). Prices format as `8.900 kr.` (dot thousands, space, `kr.`); dates as `fös. 14. nóv. · 20:00`; decimals with a comma (`4,9`). Wrap a full price in a `whitespace-nowrap` span so `kr.` never orphans.

| Role | Size / weight / tracking | Colour |
|---|---|---|
| Headline number (card price, waitlist count, chart current price) | 24px / 600 / −0.02em, line-height 1 | foreground (waitlist count: bid) |
| Stat tile value | 22px / 600 / −0.02em | foreground |
| Event H1 | 26px (22px phone) / 700 / −0.025em, lh 1.2 | foreground |
| Section H1 ("Markaðurinn") | 18px / 700 / −0.02em | foreground |
| Panel / column heading | 14px / 600 | foreground |
| Card title | 14px / 600, lh 1.3, clamp 2 lines | foreground |
| Body / row text | 13–14px / 400–500, lh 1.45 | foreground |
| Caption, meta, delta | 12–12.5px / 400–500 | muted-foreground (delta: up / down / muted) |
| Eyebrow label ("LÆGSTA VERÐ", table headers, category tag) | 11px / 500–600 / +0.05em uppercase | muted-foreground |
| Unit after a number ("kr." in a headline, "manns", "miðar") | 15px (headline) or 13px (stat) / 500, 5px gap | muted-foreground |

Minimum rendered font size is 11px; minimum body text is 13px.

## 4. Spacing, radius, border, shadow, states

- Base spacing 4px. Card padding 14px; panel body 14px; panel header 12px 14px; grid gap 12px (cards) / 8px (stat tiles, trending); container max 1400px with 24px gutters (16px at phone).
- Radii: `--radius` 8px for buttons, inputs, thumbnails; 10px for cards and panels; 6–7px for small buttons and chips-in-tables; 999px for category chips; 4px for badges and tags.
- Borders: every surface is `1px solid hsl(var(--border))`. No shadows on panels. The only shadows: the sticky nav uses `backdrop-blur` with `bg-background/90`; the pressed range segment uses `inset 0 0 0 1px border`.
- Hover: cards and trending items lighten their border toward muted-foreground (`border-color: color-mix(border 65%, muted-foreground)`); neutral buttons take `bg-surface-2`; `ask`/`bid` buttons go solid (`bg-ask text-ask-foreground`); primary lightens 14% toward white; links go from muted underline to foreground underline.
- Focus: `:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px }` everywhere, including cards' title links and table buttons.
- Active/pressed chip: `bg-foreground text-background`. Pressed range segment: `bg-surface-2 text-foreground`.
- Disabled: 50% opacity, `cursor-not-allowed`, no hover change.
- Transitions 120ms on background and border colour only; no motion on layout, no skeleton shimmer faster than 1.2s.

## 5. Components

Classes are described in words; each maps to Tailwind utilities on a shadcn/ui primitive.

**TopNav** (`<header>` sticky, 56px, border-b, `bg-background/90 backdrop-blur`). Left: wordmark = 24px primary rounded square with a white ticket icon + "Miðatorg" 17px/700. Centre: SearchField (flex 1, max 520px). Right: Button primary "Selja miða" (links to Sell form) and Button ghost "Innskrá". Signed in: replace "Innskrá" with Avatar + name as a DropdownMenu (Mínar skráningar · Mín kaup · Stillingar · Útskrá). Phone (≤640): row wraps; wordmark and actions on line 1, search full-width on line 2.

**SearchField** (`<form role="search">`): `<label class="sr-only" for="q">Leita að viðburði, listamanni eða stað</label>`, `<input type="search">` 36px tall, card bg, border, 8px radius, 36px left padding for a 16px search icon, 44px right padding for a `<kbd>/</kbd>` hint (mono 11px, bg background, border). Placeholder is muted-foreground. Use shadcn Command for results: groups Viðburðir / Listamenn / Staðir; each result row = thumb + title + venue·date + lowest price.

**CategoryChips** (`role="group" aria-label="Flokkar"`, horizontally scrollable, hidden scrollbar): shadcn Toggle-style `<button aria-pressed>` 34px tall, pill, card bg, border, muted text; pressed = foreground bg / background text. Optional count in mono 11px at 75% opacity. Order: Allt · Tónleikar · Leikhús · Íþróttir · Hátíðir · Uppistand. Right of the row: "Raða eftir" + shadcn Select (34px) with dative options: Vinsældum · Lægsta verði · Mestum afslætti · Dagsetningu · Eftirspurn. On phone the label becomes sr-only, the select stays (max 132px), chips scroll beneath.

**TrendingStrip** (`<section aria-labelledby>` heading "Vinsælt núna" as 12px uppercase eyebrow with a 6px ask-coloured dot): 5-column grid of `<a>` items (card bg, border, 8px radius, 8px 10px padding). Item = mono ordinal `01`–`05` (muted 11px) · 30px thumb · title 12.5px/600 ellipsis + subtitle 11.5px muted ellipsis · right value stack (12.5px/600 + 11px sub). Value is either price + delta vs face value in `up` colour, or a demand number + "vilja kaupa" / "á biðlista" in `bid`. Never show 7-day change here (a red arrow reads as "above face value"). Phone: horizontal scroll rail, items 236px wide, next item peeks.

**MarketCard** (`<article>`; card bg, border, 10px radius, 14px padding, column flex, 12px gap; `min-width: 0`). Structure:
1. Head: 44px Avatar-style thumb (solid `ph-n`, 2 initials, aria-hidden) + title block: `<h2>` 14px/600 clamp-2 with the link, `<p>` meta "Venue · date" 12px muted nowrap-ellipsis.
2. Main (flex, items-end, space-between): left = eyebrow "LÆGSTA VERÐ", headline price 24px, delta line (`up`: "−17% undir miðaverði"; muted: "±0% á miðaverði"; `down`: "+5% yfir miðaverði" is impossible by rule, only shown in admin); right = Sparkline 96×32 inline SVG, step-after path, 1.5px stroke, 12% area fill, end dot; stroke = `up` when price < face, muted when flat.
3. Actions: 2-column grid, 6px gap: Button `ask` size sm "Kaupa" (→ event page, sell column) and Button outline sm "Ég á miða" (→ Sell form prefilled). 34px tall, 40px on phone.
4. Foot (border-t, 10px padding-top, `mt-auto`): "**7** til sölu · **23** vilja kaupa" (bold numbers, tabular) left; category eyebrow right.

States (one component, modifier props):
- `hasListings` — as above.
- `waitlist` (no listings, N want): eyebrow "Á BIÐLISTA"; headline = demand count in `bid` colour with unit "manns"; line "Engir miðar til sölu — miðaverð 14.900 kr." (price nowrap); sparkline slot shows a dashed border-coloured rule; actions = Button `bid` sm with bell icon "Láta vita" + outline "Ég á miða". Foot "0 til sölu · 41 vilja kaupa". If N = 0 the headline is "Enginn á biðlista" in muted at 15px and the same buttons.
- `past` (event date passed): whole card at 60% opacity except title; eyebrow "LOKIÐ"; headline = last sold price muted, delta replaced by "seldist síðast 9.900 kr."; no buttons; foot shows "15 seldir". Not focusable actions; the title link still opens the event (read-only).
- Loading: same box with three muted blocks (thumb, two title lines, one 24px number) in `bg-surface-2` pulse.
Real-data rules: title clamps to 2 lines, meta to 1; every card in a row keeps equal height via the `mt-auto` foot; the grid is `repeat(4, minmax(0,1fr))` → 3 ≤1240px → 2 ≤900px → 1 ≤640px; an orphan last card is just a card.

**StatTile** (card bg, border, 10px radius, 12px 14px padding): label 12px muted with an optional 7px square swatch (`ask` for Til sölu, `bid` for Vilja kaupa), value 22px/600 tabular with optional 13px muted unit, third line 12px muted (delta component when relevant) nowrap-ellipsis. Five tiles: Lægsta verð (delta line) · Miðaverð ("Hámark skv. tix.is") · Til sölu (N miðar, "frá 4 seljendum") · Vilja kaupa (N manns, "hæsta boð 11.900 kr.") · Seldir (N miðar, "síðustu 30 daga"). Grid 5 → 3 ≤1100 → 2 ≤640 with the last tile spanning 2 columns. Empty market: Lægsta verð shows "—" and the third line "engir miðar til sölu".

**PriceChart** (panel): header row "Lægsta söluverð" + "uppfært fyrir 4 mín." muted; second row: current price 26px, change chip (`up` arrow + "−2.000 kr. (−16,8%)" + muted "síðasta mánuð"), range selector right (segmented group of three `<button aria-pressed>` 32px: 1V · 1M · Allt; pressed = surface-2 bg). Recharts `ResponsiveContainer` height 250 (214 phone) with `ComposedChart`: `Area type="stepAfter"` with `fill=hsl(var(--chart-line))` `fillOpacity=0.10` no stroke, plus `Line type="stepAfter"` stroke `--chart-line` 2px no dots except `activeDot r=5` and a final dot (r=4, surface stroke); `CartesianGrid` horizontal only, stroke `--border`; `YAxis orientation="right"` ticks mono 11px muted, formatted `9.000`; `XAxis` 5 ticks (3 on phone) `25. ágú.` style; `ReferenceLine y={face}` dashed `3 4` muted with label "Miðaverð 11.900 kr. (hámark)" top-left in Inter 11px; `Tooltip` with a custom content box (surface-2 bg, border, 6px radius) showing "sun. 13. sep. · 4 til sölu" (muted 11px) and "10.400 kr. −13% undir miðaverði" (12px/600 + muted); crosshair = `Tooltip cursor` dashed muted. An endpoint `LabelList`/custom label "9.900 kr." (12px/600 foreground) sits above the last point. Y domain = [face×0.75 rounded down to 1.000, face×1.05]; the ceiling line must always be inside the plot. Footer row: "Lægsta verð sem var til sölu hvern dag" and "Verð fer aldrei yfir miðaverð, 11.900 kr.". Under it a `<details>` "Sýna sem töflu" with a real table (Dagur · Lægsta verð · Miðað við miðaverð). Empty data: plot area shows a centred muted "Engin sölusaga enn" with the ceiling line still drawn. Loading: surface-2 rectangle pulse.

**OrderBook** (panel "Skráningar" + "7 miðar til sölu · 23 vilja kaupa"): two columns split by a 1px border, stacked ≤760px (sell column first). Each column: head row (8px square swatch `ask`/`bid`, "Til sölu" / "Óskað eftir" 13px/600, muted count "4 skráningar" / "6 af 12 óskum", right "Lægsta verð efst" text or "Sjá allar" link), then a real `<table>` (shadcn Table, `table-fixed`, `<colgroup>` widths: qty 74, price 136/110, action 86/96) with uppercase 11px headers.
- **SellRow** (`<tr class="ask" style="--depth:29%">`): background `linear-gradient(90deg, hsl(var(--ask)/0.09) var(--depth), transparent var(--depth))` where depth = cumulative tickets ÷ total; cells: who (name 13px/600 + Badge Staðfestur when verified; second line RatingStars or "Nýr notandi", "·", section + row nowrap; third optional detail "saman eða sitt í hvoru lagi" / "aðeins saman", hidden on phone), qty ("2 miðar" nowrap), price right-aligned (13px/600 + delta line 11.5px, the words "undir miðaverði" hidden on phone), action Button `ask` sm "Kaupa" (full cell width). Hover: row `bg-ask/4`.
- **WantRow** (`<tr class="bid">`): same, tint from `--bid`; who = name + badge + rating + optional "hvaða sæti sem er" / "helst salur"; qty; price cell = muted 11px "Hámark" above "11.900 kr."; action Button `bid` sm "Selja til".
- Column footers (12px muted, icon 14px): sell "Þú semur um afhendingu í spjalli eftir að þú pantar."; want "Átt þú miða? Seldu beint til þeirra sem bíða."
- Empty sell column: single row spanning all columns: "Engir miðar til sölu núna. 23 manns bíða." + Button `bid` sm "Láta vita". Empty want column: "Enginn hefur óskað eftir miða enn." + Button `bid` sm "Ég vil kaupa".
- Trust bar at the panel bottom (surface-2 at 60%, border-t, shield icon in `verified`): "**Verð má aldrei fara yfir miðaverð (11.900 kr.).** Þannig haldast miðarnir gildir samkvæmt skilmálum tix.is. Seljendur með [Staðfestur] merki hafa staðfest símanúmer eða rafræn skilríki. Lesa reglurnar."

**Badge** (18px tall, 4px radius, 11px/600, 0 6px 0 4px padding, icon 11px): `Staðfestur` (check icon, `text-verified bg-verified/9`); `Nýtt` (`text-foreground bg-surface-2 border`) for a listing under 24h old; `Undir miðaverði` (`text-up bg-up/9`); `Á miðaverði` (`text-muted-foreground bg-surface-2`). Inline text form (the delta line) uses the same colours without the pill. `Nýr notandi` is plain muted 11px text, not a badge. Also `<span class="tag">` eyebrow tags for category and "Uppselt á tix.is": 20px, 1px border, 11px uppercase +0.06em muted.

**Buttons** (shadcn Button; 36px default, `sm` 34px, `xs` 30px; 13px/600; 8px radius (7px sm, 6px xs); 14px horizontal padding; icon 15px, 6px gap; `whitespace-nowrap`):
- `primary` — `bg-primary text-primary-foreground`; hover 14% lighter. One per screen region (nav "Selja miða", event "Selja miða á þennan viðburð", form submits).
- `secondary` (= outline) — `bg-card border-border text-foreground`; hover `bg-surface-2` and lighter border. "Ég á miða", "Láta mig vita", cancel actions.
- `ghost` — transparent; hover `bg-surface-2`. Nav "Innskrá", table row menus.
- `ask` — `bg-ask/10 text-ask border-ask/35`; hover solid `bg-ask text-ask-foreground`. Only "Kaupa".
- `bid` — `bg-bid/10 text-bid border-bid/35`; hover solid. Only "Selja til", "Ég vil kaupa", "Láta vita".
- `danger` — `bg-destructive text-destructive-foreground`; hover 10% darker. "Hætta við skráningu", "Tilkynna", admin removals; always behind a confirm Dialog.
Phone: card and CTA buttons stretch (`flex-1`) and are 40px tall.

**RatingStars**: one filled star icon (12px, foreground) + "4,9" (foreground, tabular) + "(12)" muted, 12px, 4px gaps; `aria-label="Einkunn 4,9 af 5 úr 12 viðskiptum"`. Under 3 ratings show "Nýr notandi" muted instead. Profile page uses five 16px stars (filled foreground / empty border-colour) plus the number.

**Avatar**: square, 8px radius (12px at 72px), solid `ph-n` chosen by hashing the id, 2 initials in foreground 700; sizes 30 / 44 / 72px. Users get the same component with a circle. No photos in v1.

**EventHeader**: breadcrumb (12px muted, chevrons): Markaðurinn › Tónleikar › title. Row: 72px Avatar (56px phone) · title block (tag row: category + "Uppselt á tix.is"; H1; meta row: venue 500 foreground, date muted tabular, "Sjá á tix.is" underlined link with external icon) · CTA stack right-aligned (Button primary "Selja miða á þennan viðburð" with tag icon, Button `bid` "Ég vil kaupa", Button secondary with bell "Láta mig vita") and beneath it the cap sentence (shield icon in `verified`, 12.5px muted, price in foreground 500, right-aligned; left-aligned and full-width ≤760px). If the buyer already follows the event the bell button reads "Fylgist með" (pressed state, secondary with `aria-pressed=true`).

**HowItWorksStrip** (panel "Hvernig virkar þetta?"): three rows separated by borders: 24px round numeral (mono 12px, surface-2 bg, border) + 13px/600 heading + 12.5px muted text. 1 Panta — "Þú pantar miða hjá seljanda og skráningin er frátekin fyrir þig í 30 mínútur." 2 Greiða seljanda — "Þið spjallið í appinu og þú greiðir beint með Aur eða millifærslu. Miðatorg geymir aldrei peninga." 3 Staðfesta og gefa einkunn — "Seljandi flytur miðann á tix.is, þið staðfestið bæði og gefið hvort öðru einkunn." In the event sidebar on desktop; full-width under the order book ≤1100px.

**Footer** (border-t, 48px top margin, 12px muted): left "© 2026 Miðatorg · Ókeypis að nota. Við geymum aldrei greiðslur – verð fara aldrei yfir miðaverð. Miðatorg er ekki tengt tix.is." right links Um Miðatorg · Reglur · Hafa samband (separators muted). Stacks on phone.

### Screens not mocked (same system)

**Sell form** ("Selja miða", route `/selja`): single centred panel, max 640px. Steps as a vertical stepper (numerals like HowItWorks): 1 Viðburður — SearchField/Command to pick a tix.is event; a selected event renders as a compact MarketCard head (thumb, title, venue·date) with "Breyta". 2 Miðar — shadcn Form: Fjöldi (Select 1–8), Svæði (Input "Svalir A"), Röð/sæti (Input, optional), "Má selja sitt í hvoru lagi" (Switch), Verð á miða (Input with `kr.` suffix, tabular; helper "Miðaverð er 11.900 kr. — hærra verð er ekki leyft"; the input turns `border-destructive` with message "Verð má ekki vera hærra en miðaverð" if exceeded; a live delta chip shows "−17% undir miðaverði"). 3 Afhending — RadioGroup: "Flyt miðann á tix.is" (default) / "Sendi PDF/QR í spjalli"; and Greiðsla: Checkbox group Aur · Millifærsla. 4 Staðfesting — summary StatTile row (Verð · Fjöldi · Miðaverð) and Button primary "Skrá miða til sölu"; below it a muted line "Skráningin sést strax í Skráningum. Þú getur eytt henni hvenær sem er." Phone-verification gate: if the user lacks a verified phone, a surface-2 notice at the top: "Staðfestu símanúmer áður en þú skráir miða" with Button secondary "Staðfesta".

**Want form** ("Ég vil kaupa", route `/oska`): same shell, two steps: Viðburður; Ósk — Fjöldi (Select), Hámarksverð á miða (Input, capped at face value, same validation), Svæði (Select: Hvaða sæti sem er / Salur / Svalir), "Láta mig vita þegar miði undir hámarki skráist" (Switch, on). Submit Button `bid` "Skrá ósk". Result card explains: "Seljendur sjá óskina þína í Skráningum og geta selt beint til þín."

**Deal room** (route `/vidskipti/:id`, after a buyer presses Kaupa on a SellRow): two-column layout (`minmax(0,1fr) 340px`, stacked ≤900px).
- Left panel "Viðskipti": header with both parties (Avatar + name + RatingStars + Badge) and the listing summary (event title, section/row, "2 miðar · 9.900 kr./miði · samtals 19.800 kr." in tabular 600).
- Status stepper (horizontal on desktop, vertical on phone; 5 steps, 24px numerals: done = `bg-ask text-ask-foreground` with check, current = `border-primary text-foreground`, upcoming = muted): Pantað → Greitt → Miði afhentur → Staðfest → Einkunn gefin. Under it one sentence for the current step, e.g. "Greiddu seljanda 19.800 kr. með Aur eða millifærslu og merktu svo við hér." Reservation timer is shown once as plain text "Frátekið til 14:32" in muted; it never counts down visibly, never turns red, never pulses.
- Action buttons, exactly the ones relevant to the viewer and step: buyer: Button primary "Ég hef greitt" → later "Ég er með miðann"; seller: Button primary "Greiðsla móttekin" → "Miði afhentur"; both: Button secondary "Hætta við" (danger only inside the confirm dialog "Hætta við viðskipti?") and ghost "Tilkynna vandamál". After both confirm: RatingStars input (five 24px star buttons, `aria-label`) + optional Textarea + Button primary "Senda einkunn".
- Right panel: chat (shadcn ScrollArea; bubbles: own = `bg-primary/15 border-primary/30`, other = `bg-surface-2 border`, 13px, timestamps 11px muted; system messages centred 12px muted, e.g. "Guðrún staðfesti greiðslu · 14:05"). Composer: Textarea 1–4 rows + Button primary icon "Senda". A pinned surface-2 note at the top: "Greiðsla fer beint á milli ykkar. Miðatorg geymir aldrei peninga. Deildu aldrei innskráningu á tix.is."
- Trust bar (same as OrderBook) at the bottom with the cap sentence and Staðfestur explanation.

**Profile page** (`/notandi/:id`): header = 72px Avatar, name 26px/700, Badge Staðfestur (or muted "Ekki staðfestur"), RatingStars (large), "Meðlimur síðan jan. 2026" muted. StatTile row: Viðskipti · Seldir miðar · Keyptir miðar · Einkunn (4,9). Tabs (shadcn Tabs, underline style: active tab foreground with 2px primary underline): Skráningar (list of the user's SellRows, in a table without the depth tint) · Óskir (WantRows) · Umsagnir (list: reviewer Avatar 30px + name + RatingStars + date + text, bordered rows). Own profile adds a "Stillingar" panel: Netfang (verified check), Símanúmer (Button secondary "Staðfesta símanúmer"), Rafræn skilríki (Button secondary "Staðfesta með rafrænum skilríkjum" — enables the Staðfestur badge), Greiðsluleiðir (Aur handle, bank account shown masked).

**Login page** (`/innskra`): centred panel 400px on the canvas, wordmark on top. Form: Netfang (Input type email, label above, 36px), Button primary full-width "Senda innskráningarhlekk" (passwordless email link; helper "Við sendum þér hlekk sem gildir í 15 mínútur."). Below a muted line "Nýr á Miðatorgi? Sami hlekkur býr til aðgang." Then a border-t and a 3-item trust list (shield icons in `verified`): Verð aldrei hærra en miðaverð · Engin þóknun · Greitt beint á milli fólks. After submit: same panel with a check icon and "Hlekkur sendur á helgi@dæmi.is" + ghost "Senda aftur". Errors: field `border-destructive` + 12px `text-down` message; a general error is an Alert panel with `border-destructive/40`.

**Admin table** (`/stjorn`, staff only): full-width panel with a toolbar (SearchField, Select "Staða": Allar · Virkar · Í viðskiptum · Lokið · Tilkynntar; Select "Flokkur"; date range Popover) and a shadcn DataTable: columns Viðburður (thumb + title + date) · Seljandi (Avatar 30 + name + badge) · Fjöldi · Verð/miða (tabular, delta chip; a value above face value renders in `text-down` with Badge "Yfir miðaverði" — the only place `down` appears on a price) · Staða (Badge: Virk = up tint, Í viðskiptum = primary tint, Lokið = muted, Tilkynnt = destructive tint) · Skráð (date) · Aðgerðir (ghost icon button → DropdownMenu: Skoða · Fela · Fjarlægja (danger, confirm) · Banna notanda (danger, confirm)). Rows 44px, zebra via `bg-surface-2/40` on hover only, sticky header, pagination "1–50 af 1.284" with ghost prev/next. Bulk select via Checkbox column; bulk bar appears above the table in surface-2.

## 6. Responsive rules (390px)

- Container gutter 16px; no element may exceed the viewport (`document.scrollWidth === 390`). Only two containers scroll horizontally, both with `scrollbar-width: none` and the next item peeking: CategoryChips and TrendingStrip.
- TopNav wraps: wordmark + Selja miða + Innskrá on line 1, search full-width on line 2 (36px).
- Chips 34px; sort Select stays visible (label sr-only, max 132px).
- Market grid 1 column; MarketCard buttons 40px tall; section subtitle and tagline drop to their own lines.
- StatTiles 2 columns, the fifth tile spans both.
- EventHeader wraps: thumb + title on top, CTA stack full-width (primary alone on a line, the two others share a row), cap sentence left-aligned under them.
- Chart 214px tall, 3 x-ticks, y-axis still right; range buttons 32px.
- OrderBook stacks; the sell column comes first; "Seljandi · sæti" header shortens to "Seljandi"; the delta words "undir miðaverði" hide (percentage stays); row detail lines hide; cell padding 9px 6px; buttons stay 34px and full cell width.
- Sidebar panels (Hvernig virkar þetta, Nýleg viðskipti, Um viðburðinn) move below the order book in that order.
- Deal room: chat below the stepper; composer sticks to the bottom of the viewport.
- Tap targets: every button, chip, select and input ≥ 34px tall (cards 40px); inline text links are exempt but get 4px vertical padding.

## 7. Empty, loading, error states and the no-dark-patterns rule

- **Empty home** (filter with no events): one full-width panel "Engir viðburðir í þessum flokki" + ghost "Sýna allt". Search with no hits: "Ekkert fannst fyrir „x“" + secondary "Biðja um viðburð" (opens a form; we add events from tix.is manually).
- **Empty card / book / chart**: specified in the components above (waitlist state, empty column rows, "Engin sölusaga enn"). The face-value ceiling is always drawn, even with no data.
- **Loading**: skeletons keep the exact box of the component (card, tile, chart, table rows) in `bg-surface-2` with a 1.2s pulse; never a spinner over content; numbers are never faked with placeholder digits. Live values that update (lowest price, counts) change in place without animation.
- **Errors**: inline field errors in `text-down` 12px under the field with `aria-describedby`; page-level errors as an Alert panel (card bg, `border-destructive/40`, icon `text-down`) with one plain sentence and one retry Button secondary, e.g. "Náði ekki sambandi við Miðatorg. Reyndu aftur." A failed action button returns to its idle label, never stays disabled.
- **Stale data**: "uppfært fyrir 4 mín." captions are real timestamps; over 30 minutes old they read "uppfært kl. 13:02".
- **No dark patterns** (hard rule): no countdown timers, no "N manns skoða núna", no fake scarcity, no pre-ticked notification boxes, no red or pulsing urgency colours, no confirm-shaming copy. The only time-bound state (a 30-minute reservation) is shown as a static "Frátekið til 14:32" and its expiry as a neutral notice. Waitlist and demand counts are real numbers or absent. `down` red appears only for prices above face value (which the product forbids for users) and rising trends in admin, never as urgency. Cancelling, unsubscribing and deleting a listing are one click away with a plain confirm dialog and no guilt copy.
