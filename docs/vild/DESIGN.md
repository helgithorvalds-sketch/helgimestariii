# VILD — design system and build rules

This is the contract every screen in `src/vild/` follows. Read it before writing a component.
Brand facts come from the logo (mint `#B4FF9B`, green `#0C5C3B`) and the pitch film
(`tinyurl.com/vild-kynning`: Figtree, marker-yellow amounts, white pills, dark-green pills, clay 3D).
Competitive reference: Takk (takkkronur.is) — see `docs/vild/research/takk.md`. We match its clarity;
we do not copy its purple world, its showman imagery, its layout or its copy.

## 1. Idea in one line

> Þú borgar fullt verð. Hluti kemur til baka sem inneign hjá sömu keðju. Inneignin bíður þín næst.

Never say **afsláttur** (discount) in product copy. The words are **inneign**, **krónur til baka**,
**til baka**, **safna**, **nýta inneign**. One VILD-króna equals one króna. Credit is per chain
("pocket"): it only works where it was earned.

## 2. Tokens (`src/vild/theme.css`, scoped to `.vild`)

| Token | Value | Use |
|---|---|---|
| mint-300 | `#B4FF9B` | brand surfaces: hero bands, balance card, selected states, the coin |
| mint-100 / mint-50 | `#D2FFC2` / `#E8FFE0` | soft chips, hover fills, tinted sections |
| green-500 | `#0C5C3B` | primary buttons, links, eyebrow text, the V |
| green-600 / 700 / 900 | `#0A4A30` / `#083B27` / `#072B1D` | hover, pressed, dark hero / wallet card |
| ink | `#111814` | body text, dark pills |
| muted-foreground | `#596660` | captions (6.9:1 on white) |
| surface-2 / secondary | `#F6F8F4` / `#F3F6F1` | page sections, input fills |
| border | `#E0E5DE` | 1px hairlines |
| yellow | `#FFD24D` (ink `#593F05`) | **only** for credit amounts: "+1.495 kr." tags and markers |
| destructive | `#B8322A` | errors |

Radii: cards 16px (`rounded-2xl`), buttons 12px, sheets 22px, chips 999. Nothing above 24px except pills.
Shadows: `var(--shadow-sm|md|lg)` only. No glow, no coloured shadows, no glassmorphism, no gradients
except a 1-stop mint→white wash on the marketing hero if needed.

Utility classes: `.vild-eyebrow` (tracked small caps, green), `.vild-marker` (yellow marker behind an
amount), `.vild-num` (tabular figures), `.vild-wordmark`, `.vild-dark` (dark surface tokens), `.no-scrollbar`.

## 3. Type

**Figtree** for everything (loaded by `VildApp.tsx`). Jost 300 only inside `<Wordmark/>`.

| Role | Size / weight / tracking |
|---|---|
| Display (site hero) | 44–72px / 800 / -0.03em, line-height 1.02 |
| H1 (app page title) | 28px / 800 / -0.025em |
| H2 (section) | 19–22px / 700 / -0.02em |
| Balance | 40–48px / 800 / -0.03em, tabular |
| Body | 15px / 400, line-height 1.5 (16px on ≥ md) |
| Caption | 13px / 500, muted |
| Eyebrow | 11px / 600 / 0.14em uppercase green |
| Button | 15px / 600 |

Icelandic typography: thousands with a dot (`1.500 kr.`), decimals with a comma, dates `fös. 14. nóv.`,
times `12:40`, typographic minus `−`, `kr.` with the dot. Use `lib/format.ts` for all of it.

## 4. Layout rhythm

- Spacing scale 4/8/12/16/20/24/32/48/64. Page gutter 16px on phones (`px-4`), 24px on tablets, content max 1120px on the site.
- App screens are a single column, max width 480px centred on desktop inside a phone-like frame? **No**: on desktop the app simply stays a 480px column centred on `surface-2`; no fake phone bezel.
- Tab bar: 5 tabs, 64px + safe-area, white, 1px top hairline, active tab in green with a 4px mint dot under the icon? **No dots**: active = green icon + label 600, inactive = muted. Centre tab is **Kort** (the wallet card) and is visually the same size as the others.
- Lists: rows 56–64px, hairline dividers inside white cards; never card-inside-card more than one level.
- Horizontal carousels: snap, 16px gutter, cards 150–168px wide, `no-scrollbar`.

## 5. Components (`src/vild/components/kit`)

`Button` (primary / mint / secondary / ghost / dark / destructive; sm md lg; `loading`; `full`),
`Chip`, `ChipButton`, `CreditTag` ("+1.495 kr."), `AnimatedNumber`, `Sheet` (bottom sheet, drag to
close, dialog on desktop), `ProductImage` (tinted placeholder + initials, never a broken image),
`SectionHeader`, `Card`, `Skeleton`, `EmptyState`, `ErrorState`, `Row`. Brand: `Wordmark`, `CoinMark`,
`CoinMarkDark`, `LoopMark`. Use these; add new shared pieces to the kit, not inline copies.
shadcn primitives from `@/components/ui/*` are fine for inputs, switches, selects, tabs, tooltips.

## 6. Motion (`src/vild/lib/motion.ts`)

- Page enter: `pageVariants` (8px rise + fade, 240ms ease-out). Exit 160ms. Wrap route content in `<motion.div variants={pageVariants} initial="initial" animate="enter" exit="exit">`.
- Lists: `staggerParent(0.04)` + `fadeUp` on the first screenful only (max 8 children); below the fold nothing animates on scroll except the marketing site's `whileInView` once.
- Press: `whileTap={tap}` (0.98) on cards and buttons. No hover-scale on cards. Hover = border/background change only.
- Sheets: `spring` (420/36). Balance: `AnimatedNumber` counts on change.
- Shared element: product card → product page uses `layoutId={`product-${id}`}` on the image.
- Only transform/opacity are animated. Never animate height/width/box-shadow in lists. Respect `prefers-reduced-motion` (theme.css kills transitions; `prefersReducedMotion()` for JS loops).
- Loading: skeletons with the final layout, no spinners in content (spinners only inside buttons).
- Haptics: `haptic('light')` on tab change and successful actions (no-op on web).

## 7. Copy

Icelandic, informal **þú**, short sentences, concrete numbers. Headlines are statements, not slogans:
"Borgaðu fullt verð. Fáðu hluta til baka." not "Upplifðu framtíð vildarkerfa".
Banned: "óaðfinnanlegt", "einfalt og þægilegt", "byltingarkennt", "upplifun", "lausn", "snjallt",
exclamation marks in UI, emoji anywhere, Lorem ipsum, fake testimonials, fake press logos, fake
member counts. Buttons are verbs: "Skrá mig", "Sækja appið", "Nýta inneign", "Vista". Empty states say
what to do next. Errors say what happened and what to try. Use `errorMessage()` from `data/api.ts`.

Vocabulary: Inneign · Krónur til baka · Staðir · Kort · Yfirlit · Ég · Innskráning · Rafræn skilríki ·
Símanúmer · Staðfestingarkóði · Keðja · Vasi (pocket, e.g. "Hádegið") · Tilboð · Herferð (campaign,
merchant side) · Kassakerfi · Uppgjör · Teymi · Stillingar.

## 8. "Does it look generated?" checklist (audit before you finish)

Reject your own work if it has: a hero with centred text + two centred buttons + three centred feature
cards with icons; gradient text; purple/blue gradients; glass cards; floating blobs; 3-column icon grids
with one-line blurbs; every card with a drop shadow and hover-scale; rounded-3xl on everything; emoji
as icons; "bento" grids of nothing; copy that could describe any product; identical card sizes
everywhere; stock 3D illustrations; a testimonial carousel; fake "trusted by" logos; a footer with
40 links. Icons: lucide only, 1.75px stroke, 20px in rows, 24px in tabs, never coloured circles with
icons as decoration except in `Row`/`EmptyState` where the kit does it.

Aim for: one strong type hierarchy; real product photos (`/vild/img/products/*.jpg`); the mint used in
big calm fields; the yellow only on amounts; asymmetric editorial layouts on the site (text column +
one big image/phone, not three equal columns); concrete numbers everywhere; generous whitespace with
tight internal spacing; hairlines not shadows; one accent.

## 9. Accessibility

Contrast AA (green on mint 6.9:1, ink on white 17:1, muted 6.9:1, yellow-ink on yellow 8.6:1).
Touch targets ≥ 44px. Every icon-only button has `aria-label`. Focus visible (keyboard only).
`aria-live="polite"` on balances that change. Reduced motion honoured. `lang="is"` is set by the root.

## 10. Data

Never fetch directly; use hooks from `src/vild/lib/queries.ts` (react-query over `data/api.ts`).
The mock (`data/mock.ts`) is the default; it persists to localStorage. Demo login: any 7-digit phone,
code `123456`; electronic ID completes instantly. Merchant login: `johanna@luna.is` / any 4+ chars.
Types in `src/vild/lib/types.ts`. Seed in `src/vild/data/seed.ts` (chain "Lúna", 9 places, 15 products,
rules, offers). Routes in `src/vild/routes.tsx`; paths in `src/vild/lib/paths.ts` — always
`href(paths.x)` for links (the module is mounted at `/vild`).

## 11. Definition of done for a screen

- `npx eslint src/vild` clean, `npx tsc -p tsconfig.app.json --noEmit` clean (strict is off, but no `any` creep).
- Loading, empty and error states exist.
- Works at 360px wide without horizontal scroll, and at 1440px.
- Dark hero/wallet surfaces use `.vild-dark`, nothing hard-coded white-on-green except via tokens.
- A vitest file renders the page with the mock api (see `src/vild/test/`).
