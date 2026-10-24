# VILD — Design research brief

For: senior product designer + front-end lead
Scope: consumer app (iOS/Android via React + Capacitor), marketing site, merchant portal
Date: 2026-10-23
Status: research synthesis, opinionated. Where a claim comes from a source it is linked inline. Where it is a recommendation or from direct product familiarity it is marked as such and should be verified on-device before it becomes a spec.

---

## 0. Position in one paragraph

VILD is credit, not discount. The whole design should express one idea: *money that comes back and waits for you at the same place.* That gives us a natural visual grammar (a balance that grows; a place you return to) and a natural tone (calm, specific, Icelandic, no hype). The founder's bar — "$15,000 website and app, no AI slop" — is really a bar about **decisions**: every colour, typeface, radius, section and sentence must be chosen for VILD rather than defaulted. Section 1 gives the audit for that. The single biggest risk for this brand is that "green fintech app with a mint accent" is itself a crowded template (Wise's accent is a near-identical lime, Cash App just went fluorescent green). Section 4 shows how to use the mint so VILD reads as *VILD* and not as "the green one".

---

## 1. "Why does it look AI-generated?" — tells, inverse signals, audit checklist

### 1.1 The named tells (2025–2026 writing)

The pattern is consistent across the sources. Models return the statistical median of their training data, and the median web page since ~2019 is a Tailwind-default page ([dev.to / Alan West](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)). Tailwind's creator posted a semi-apologetic tweet in August 2025 about making `bg-indigo-500` the default button colour five years earlier ([same](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)).

**Colour**
- Indigo/purple-to-blue or purple-to-cyan gradient — called "the single loudest AI tell in 2026" ([925 Studios](https://www.925studios.co/blog/ai-slop-design-tells); [SmoothUI](https://smoothui.dev/blog/ai-design-slop)).
- Primary hue anywhere in the ~200–290° blue-indigo band; pure `#fff`/`#000` backgrounds; flat neutrals with no hue ([Sailop, 7 dimensions](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)).
- Gradient *text* in the hero; gradient behind the headline and on the "Get Started" button ([dev.to](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p); [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells)).
- Glassmorphism with neon glow, for no reason ([SmoothUI](https://smoothui.dev/blog/ai-design-slop)).

**Typography**
- Inter alone, or `system-ui`, or no font declared; Geist is the "new runner-up" default ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design); search summary of [vibecodekit](https://vibecodekit.dev/ai-slop-design)). Inter is a good typeface; the tell is *unchosen* Inter ([925 Studios](https://www.925studios.co/blog/ai-slop-design-tells)).
- `font-weight: 700` on every heading, one line-height for everything, fixed letter-spacing across all sizes ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design); [Apple-design skill notes](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).

**Layout and components**
- Centred hero + two buttons + glow; three equal feature cards with matching icons and equal sentence lengths; 50/50 splits; identical section padding; `max-w-7xl` everywhere ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated); [Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)).
- "Six identical cards in a row, each with an icon, a heading, two lines of text" ([SmoothUI](https://smoothui.dev/blog/ai-design-slop)).
- Bento grid reached for by default; the same card style (rounded, bordered, light shadow) used for *everything*; pill badges; blurred modal overlays ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)).
- ~0.5rem radius on everything; subtle low-opacity box shadows on every card ([dev.to](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)).
- Section sequence navbar → hero → features → testimonials/"trusted by" logos → pricing → CTA → footer, in that order, every time ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design); [21st.dev](https://21st.dev/blog/website-not-look-ai-generated)).
- Strict 4px grid with uniform gaps and no rhythm ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)). (Note: I disagree with Sailop's fix of "off-grid values like 5px/14px/22px" — a rhythm *is* a grid; see 1.2.)

**Imagery and icons**
- Thin-line generic icons (Lucide named as overused), interchangeable, one on top of each card; emoji as icons; abstract floating blobs; "3D person floating with geometric shapes"; fake dashboards; smiling stock team photo; logos of companies that are not customers ([925 Studios](https://www.925studios.co/blog/ai-slop-design-tells); [21st.dev](https://21st.dev/blog/website-not-look-ai-generated); search summaries).

**Motion**
- `transition-all duration-300 ease-in-out` on every element; a bounce/scale on every hover; no `prefers-reduced-motion` handling ([Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design); [SmoothUI](https://smoothui.dev/blog/ai-design-slop)).

**Copy**
- Weightless headlines that say nothing about who it's for: "Build faster. Ship smarter.", "Transform your workflow with powerful, intuitive tools." The test: cover the logo; if the copy works on a competitor's site, it isn't yours ([925 Studios](https://www.925studios.co/blog/ai-slop-design-tells); [21st.dev](https://21st.dev/blog/website-not-look-ai-generated)).
- Uniformly positive, unfalsifiable feature claims; no numbers, names, dates or screenshots; fake stats ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated)).

**Craft gaps (the quieter tells)**
- Missing focus states, contrast that fails WCAG, empty/error states never designed ([SmoothUI](https://smoothui.dev/blog/ai-design-slop)). CHI 2025 research cited there found AI assistants systematically generate inaccessible markup.

### 1.2 What signals "designed by a good human studio"

Opinionated synthesis (sources where applicable):

1. **One decided accent, neutrals derived from it.** Start from one deliberate colour and derive the neutrals from it; tint the off-white ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated); [Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)). For VILD: deep green is the ink, mint is the *event*, everything else is warm-grey.
2. **Typographic hierarchy that does the work shadows and cards do in slop.** Two or three sizes with real contrast (e.g. 56/17/13 on web, 34/17/13 on mobile), weight varied per level, tighter line-height and negative tracking on display sizes, near-zero tracking on body ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/): display `letter-spacing: -0.02em`, `line-height: 1.05`; body `100%/1.5`).
3. **Specific copy.** Names, numbers, places. "Þú fékkst 420 kr. til baka hjá Brauð & Co" beats any adjective.
4. **Real product, real photography.** A screenshot or a 20-second loop of the actual product is the single highest-impact change ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated)). For VILD, real Icelandic restaurants, real receipts, real light.
5. **Deliberate asymmetry, used once.** Break the symmetry once per page (off-centre hero, a 5fr/3fr split, one section that leaves the rhythm) ([21st.dev](https://21st.dev/blog/website-not-look-ai-generated); [Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)).
6. **Restraint with surfaces.** Not everything is a card. Use hairlines, whitespace and type to separate; cards only for things that are *objects* (a receipt, a place, a balance).
7. **A spacing rhythm, not a flat grid.** Keep 4/8px tokens, but give sections a scale (e.g. 24/40/64/96/160) and vary hero-to-content ratio. Rhythm is the point; off-grid numbers are not.
8. **Bespoke or at least curated icons.** A single-weight, single-family icon set with VILD-specific glyphs for the three concepts that matter (inneign, staður, kvittun). Never emoji in UI.
9. **Motion that explains.** Every animation should answer "where did this come from / where did it go". Press feedback on pointer-down; gestures that carry velocity; no decorative loops ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/); [Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
10. **Editorial layouts on the marketing site.** Large type, one image per section, text that runs in a measured column (60–72 characters), numbers set large as typographic objects.
11. **Real data in screenshots.** Icelandic names, Icelandic amounts ("1.250 kr."), real-looking dates ("14. júlí").
12. **Consistency across surfaces.** Same tokens, same radius scale, same icon weight across app, site and merchant portal; AI tools lose brand context between prompts, studios don't ([925 Studios](https://www.925studios.co/blog/ai-slop-design-tells)).
13. **States designed:** empty, loading, error, offline, first-run, zero-balance, "no places near you".

### 1.3 Audit checklist (run on every screen/page before merge)

Colour
- [ ] No hue between 200° and 290° used as a primary or gradient.
- [ ] No gradient text. No gradient on buttons. At most one gradient per product and it must mean something (we propose zero).
- [ ] No glassmorphism except the native-style translucent tab bar / toolbar, and that only with `prefers-reduced-transparency` fallback.
- [ ] Page background is tinted paper (`#F6F7F4`), not `#FFFFFF`; dark mode is tinted (`#0B1210`), not `#000`.
- [ ] Mint `#B5F7A1` covers ≤ ~10% of the viewport and appears in exactly one "money moment" per screen.
- [ ] All text passes WCAG AA (4.5:1 body, 3:1 ≥ 24px/19px bold). Numbers in §4.

Type
- [ ] Typeface is one of the chosen pairings (§4), never Inter/Geist/Poppins/Roboto as a visible UI face.
- [ ] Display sizes use negative tracking and tight leading; body uses 0 tracking and 1.4–1.5 leading.
- [ ] Headings vary in weight by level; not all 700.
- [ ] Tabular figures on every balance/amount (`font-variant-numeric: tabular-nums`).
- [ ] Þ Ð Æ Ö Ý render correctly at all weights in use (test string in §4).

Layout
- [ ] No three-equal-cards feature row. No six-card grid. No bento-for-the-sake-of-it.
- [ ] Section order on the site does not match hero→features→testimonials→CTA.
- [ ] One deliberate asymmetry per page; otherwise calm.
- [ ] Not every element is a card; cards reserved for objects (balance, place, receipt, offer).
- [ ] One radius scale (e.g. 6 / 12 / 20 / full) and each element uses the right step; buttons are not fully pill-shaped unless the whole system is.
- [ ] Shadows: at most two levels, hand-tuned, tinted toward the brand green, never the Tailwind default.
- [ ] Max-width chosen (we suggest 1120px content, 1440px bleed), not `max-w-7xl` by reflex.

Imagery and icons
- [ ] Only real product screenshots with real Icelandic data; no fake dashboards.
- [ ] Only real photography (commissioned) of real partner restaurants; no stock, no 3D illustration, no floating blobs.
- [ ] One icon family, one stroke weight, no emoji.
- [ ] Partner logos shown only for signed partners.

Motion
- [ ] No `transition: all`. Only `transform` and `opacity` animate.
- [ ] No hover-scale on cards. Hover = colour/underline/arrow shift. Press = scale 0.97 on pointer-down.
- [ ] Durations ≤ 300ms for UI, ≤ 400ms for sheets/page; springs per §3.
- [ ] `prefers-reduced-motion` handled (fades instead of moves; counters snap).
- [ ] Every animation can be interrupted and starts from the live value.

Copy
- [ ] Cover-the-logo test passes on every headline.
- [ ] No "seamless", "effortless", "snjall", "byltingarkennt", "frábær", "einfalt og þægilegt" as the claim; specific verbs and numbers instead.
- [ ] Every number on the site is real and sourced (partner count, average credit, etc.).
- [ ] Never the word "afsláttur".

Craft
- [ ] Focus-visible styles exist and look designed.
- [ ] Empty, loading, error, offline states designed and reviewed.
- [ ] Safe areas respected on iPhone with Dynamic Island and on Android gesture nav.
- [ ] Icelandic formatting: `1.500 kr.`, `14. júlí`, `10,5%`.

---

## 2. Reference apps (what to steal, what to avoid)

Format: home screen · balance · offers/places · navigation · motion signature. Claims from sources are linked; items marked *(product familiarity — verify on device)* should be checked with a screen recording before being cited in a spec.

**Revolut.** Revolut 10 put accounts and cards on Home with user-added widgets, custom themes/backgrounds and cleaner account switching ([Revolut press](https://www.revolut.com/news/revolut_launches_revolut_10_as_it_targets_primary_accounts_and_passes_35m_customers_worldwide); [IBS](https://ibsintelligence.com/ibsi-news/revolut-announces-major-overhaul-of-primary-app-account)). Balance is a large display number over a horizontally paged account card. Shops cashback has been migrated to opt-in RevPoints in several markets (AU terms 8 Oct 2025, NZ 15 Jan 2026) and lives under a "RevPoints" bottom-menu item ([Revolut AU legal](https://www.revolut.com/en-AU/legal/shops/); [Revolut help DE](https://help.revolut.com/de-CH/help/revpoints/question-shop/)). Lesson: the "points" abstraction is a step away from money; VILD's advantage is that 1 króna = 1 króna, so show *krónur*, not points.

**Monzo.** Home is an activity feed plus "Spotlights" (balances, bills, spending, budgets) and an "Edit layout" control for accounts/pots ([Monzo blog, Nov 2023](https://monzo.com/blog/the-new-and-improved-home-screen)). Tab bar has changed repeatedly (Home/Payments/Help → a new Grow tab) ([Monzo community](https://community.monzo.com/t/we-re-launching-grow-tab-sign-up-for-early-access/190853)); users called the redesign cluttered and the card-swipe animation "jarring" ([community thread](https://community.monzo.com/t/were-working-on-a-new-look-for-the-monzo-app/65333?page=241)). Lesson: a feed of *events* ("you earned 230 kr. at X") is the right home for a cashback app; don't over-widget it.

**Wise.** Minimalist, near-monochrome UI with bright accents and subtle animation; returning users see horizontally scrollable currency cards; critique: too many promotional cards push the core action (Send) below the fold ([Pratt critique, Sept 2025](https://ixd.prattsi.org/2025/09/design-critique-wise-ios-app/)). Note Wise's accent lime is visually adjacent to our mint — avoid a "big lime rectangle at the top" composition or we read as Wise.

**Cash App (Nov 2025 design language).** Brighter "Hyper Neon Green", custom typeface Cash Sans with a refined type scale, 650+ geometric icons, custom micro-animations paired with haptics, expressive 3D imagery ([Abduzeedo](https://www.abduzeedo.com/cash-apps-new-design-language-and-ai-assistant-moneybot); [Design Compass](https://designcompass.org/en/2025/12/03/cash-apps-new-design-language-and-ai-moneybot/)). Home is an amount keypad *(familiarity)*. Lesson: micro-animation + haptic as a single "feel" token is the bar; the 3D imagery is the part we should not copy.

**Klarna.** Balance account + cashback (Aug 2024): cashback earned in the Klarna app lands in Balance, rate varies by retailer up to ~10%, funded by merchants ([TechCrunch](https://techcrunch.com/2024/08/15/klarna-takes-on-banking-with-new-savings-cash-back-offerings)). Lesson: "earnings land in a balance you can spend" is the exact VILD mechanic, so study how Klarna visualises the deposit event.

**Lunar (DK).** 5.0 (Dec 2024): customisable home with pinned accounts and data widgets, account cards with wallpapers, redesigned Wallet uniting accounts, cards, goals and SAS EuroBonus points ([Crowdfund Insider](https://www.crowdfundinsider.com/2024/12/234492-nordic-challenger-bank-lunar-launches-update-to-hyper-personalize-banking/)). Lesson: a "Wallet" that holds money *and* loyalty is becoming the Nordic default mental model.

**Vipps / MobilePay (NO/DK/FI).** 2026 redesign (1% rollout, ~130k users): tidier home with fewer buttons, a top area collecting things needing action, profile/settings top-right, and a new "Lommebok/Wallet" tab holding cards, loyalty cards and — deliberately — the balance, moved because users dislike their balance lighting up in front of others ([Tek.no](https://www.tek.no/nyheter/nyhet/i/JOLdMb/vipps-faar-nytt-utseende); [Ritzau](https://via.ritzau.dk/pressemeddelelse/15101045/mobilepay-far-nyt-design)). Lesson for VILD: **balance privacy** — offer tap-to-reveal or a blurred balance when the app opens in public (at the counter).

**Swish (SE).** Payment flow first; favourites on the start page (7.5), a "Tillsammans" tab for splitting (7.7), design adjusted for iOS "Liquid Glass" (7.8, June 2025) ([App Store SE](https://apps.apple.com/se/app/swish-betalningar/id563204724)). Lesson: the Swedish pattern of adapting to the OS material rather than fighting it.

**Starbucks.** Dashboard shows Stars balance and progress to the next reward; order ahead, scan-to-pay, gift cards; tiers Green/Gold/Reserve ([App Store](https://apps.apple.com/us/app/starbucks/id331177714); [Android Central, 2016 dashboard](https://androidcentral.com/starbucks-app-gets-revamped-dashboard-new-starbucks-rewards-program)). Tabs Home / Scan / Order / Gift / Offers *(familiarity)*. Lesson: the "progress to next reward" ring is the strongest loyalty motif in the category; VILD's equivalent is "inneign that is spendable now" — show *that* number big, with a small "safnað í þessum mánuði" line beneath.

**Chipotle Rewards (April 2026 redesign).** Centralised rewards hub: points balance, offers and redemption progress in one place, enhanced points tracker, interactive challenges, "favourite reward" tracking ([Finviz/press](https://finviz.com/news/343996/chipotle-relaunches-rewards-with-rewards-on-repeat-delivering-more-value-without-trade-offs); [APKMirror notes](https://apkmirror.com/apk/chipotle-mexican-grill/chipotle/chipotle-10-1-0-release)). Lesson: one hub screen for "my money with you" rather than scattering it.

**Sweetgreen.** 2022 iOS redesign made challenges and rewards reachable from the nav bar ([QSR](https://www.qsrmagazine.com/news/sweetgreen-roll-out-app-redesign-ios-devices/)). Strong photography of actual food; the aesthetic reference for "premium casual" imagery.

**McDonald's.** No credible 2025 redesign coverage found. Pattern *(familiarity)*: Deals tab + points, big promotional tiles; dense, coupon-like. Use as the anti-reference for density.

**Too Good To Go.** Discover feed with a consistent card (store, rating, pickup window, distance, struck-through value vs price *(familiarity)*); pickup via bottom sheet with order ID and swipe-to-verify; clear "Picked up / not confirmed" outcome states; critique: no vendor-status feedback while waiting, order history buried under Profile ([Pratt critique, Feb 2026](https://ixd.prattsi.org/2026/02/design-critique-too-good-to-go-mobile-app/)). Lesson: a *swipe-to-confirm* at the counter is a good physical gesture for "nýta inneign".

**Wolt.** Replaced multi-tab nav with a floating universal search/browse button at the bottom, profile top-left, activity hub top-right, basket always visible at the bottom; animations and gestures guide between sections ([Wolt press](https://press.wolt.com/en-WW/259625-wolt-app-updated-a-new-way-to-discover-everything-around-you/)). Lesson: fewer tabs, one hero action, gestures for orientation.

**Lidl Plus.** App-only loyalty: rotating coupons, spend-threshold perks (free bakery item, 10% off next shop at £250) ([LatestDeals](https://latestdeals.co.uk/guides/shopping/lidl-plus-how-does-the-loyalty-scheme-work)); 2026 German test of a cashback-style coupon that only arrives on the *following* purchase, mirroring Rewe/Penny ([mobiflip](https://www.mobiflip.de/lidl-plus-fuehrt-cashback-nach-rewe-vorbild-ein/amp/)). Lesson: "value arrives next visit" is the VILD mechanic; Lidl's coupon UI is the thing to avoid (it looks like a coupon book).

**Tesco Clubcard.** 1 point per £1, 150 points = £1.50, i.e. ~1% ([Choose](https://www.choose.co.uk/money/guide/best-supermarket-loyalty-scheme/)). Points → vouchers → spend. Three conversions is two too many; VILD has zero.

**Coop (DK).** Earn "bonus" on purchases and pay with it at the register; digital receipts; Scan & Pay; 900+ stores push local deals ([App Store](https://apps.apple.com/lu/app/coop-scan-pay-app-offers/id698632628)). Lesson: *pay with bonus at the till* and *digital receipt* in the same app — the receipt is where VILD can show "þú fékkst X kr. til baka".

**Takk (IS — the model to differentiate from).** Hagar's loyalty app: buy Takk-marked products at Bónus/Hagkaup/Eldum rétt, earn "Takk krónur (tkr)", 1 tkr = 1 kr., spend in Bónus/Hagkaup stores only; sections: Takk vörur, Topp tilboð, Kvittanir, Viðburðir, Skemmtun (games/prizes, Oct 2025); 1.8/5 from 6 ratings ([App Store](https://apps.apple.com/us/app/takk/id6745477799)). Site: hero "Fáðu Takk krónur til baka", "Svona virkar Takk" in three steps, long FAQ, contact form; no merchant section; logo assets suggest a purple brand ([takkkronur.is](https://takkkronur.is)). Their FAQ calls Takk krónur "afslættir" — a framing slip we will not make. Differentiators for VILD: restaurants not groceries; green not purple; no games tab; a merchant path on the site.

**Aur / Klink (IS).** Up to 10% back in "Klink" at partner merchants in a "Markaðstorg"; the site itself uses the word "vildarkerfi" for the rewards programme ([aur.is](https://www.aur.is/)). Reference for Icelandic vocabulary in the wild.

**Landsbankinn Aukakrónur (IS).** Describes the mechanic as "Aukakrónur eru inneign sem þú safnar", "Hver Aukakróna jafngildir einni íslenskri krónu", balance phrased as "hvað þú átt mikið af Aukakrónum", offers as "Aukakrónutilboð", partners as "Samstarfsaðilar"; app path Kort › Aukakrónur › Aðgerðir ([landsbankinn.is/aukakronur](https://www.landsbankinn.is/aukakronur)). This is the best Icelandic precedent for the word **inneign** meaning cashback credit.

### 2.1 Patterns to adopt (opinionated)

- Home = one big spendable number + one feed of events. (Monzo feed, Starbucks number.)
- Balance privacy: blur-until-tap option. (Vipps 2026.)
- "Staðir" as a map-plus-list with distance and "opið núna"; card shows the credit rate as "+8% í inneign". (TGTG card discipline.)
- Spend flow: swipe-to-confirm with a haptic success. (TGTG pickup.)
- Receipt object with the credit line highlighted in mint. (Coop.)
- Tabs: 4 max. Proposed: **Heim · Staðir · Færslur · Ég**. (Wolt's lesson: fewer tabs, one hero action.)

---

## 3. Motion and interaction for a React/Capacitor app that must feel native

### 3.1 The physics vocabulary

Apple specifies springs as *damping ratio* + *response* (seconds), not stiffness/damping. Shipped Apple values: move/reposition damping 1.0, response 0.4; rotation 0.8/0.4; drawers/sheets 0.8/0.3. Default UI springs are critically damped (1.0, response 0.3–0.4); momentum springs after a flick/drag ~0.8 ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/) — community reproduction of Apple's guidance; verify against WWDC "Designing Fluid Interfaces" before treating as canon).

Motion (ex-Framer Motion) exposes both duration-based springs (`duration`, `bounce`) and physics springs (`stiffness`, `damping`, `mass`); physics springs inherit gesture velocity, duration springs do not but can compile to pure CSS ([motion.dev transitions](https://motion.dev/docs/react-transitions)). Default `bounce` is 0.25 — too bouncy for UI; set it explicitly.

Conversion (ω = 2π / response; damping = 2·ζ·√(k·m), m = 1):

| Use | Apple (ζ, response) | Motion duration form | Motion physics form |
|---|---|---|---|
| Default UI move (tab content, list reorder, card settle) | 1.0, 0.40 | `{ type:'spring', bounce:0, visualDuration:0.4 }` | `{ stiffness:247, damping:31, mass:1 }` |
| Snappy UI (toggles, chips, segmented control) | 1.0, 0.30 | `{ type:'spring', bounce:0, visualDuration:0.3 }` | `{ stiffness:439, damping:42 }` |
| Sheet open/close, drag release | 0.8, 0.30 | `{ type:'spring', bounce:0.2, visualDuration:0.3 }` | `{ stiffness:439, damping:34 }` |
| Flick / throw (carousel, swipe-to-dismiss) | 0.8, 0.40 | `{ type:'spring', bounce:0.2, visualDuration:0.4, velocity }` | `{ stiffness:247, damping:25, velocity }` |

Always pass release velocity into the spring; Motion takes px/s directly ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).

### 3.2 Durations and easing (non-spring)

- Keep UI animations under ~300 ms; a 500 ms entrance on a frequently used control is a known annoyance ([Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
- Press feedback: `transform: scale(0.97)`, `transition: transform 100ms ease-out`, triggered on **pointer-down**, not release ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- Enter: ease-out, 200–250 ms. Exit: ease-in, 150–200 ms (exits faster than enters).
- Recommended curves: `cubic-bezier(0.2, 0, 0, 1)` (Material "emphasized decelerate" feel) for enters; `cubic-bezier(0.3, 0, 1, 1)` for exits; `[0.22, 1, 0.36, 1]` (ease-out-quint) for number counters. Reversible transitions mirror the control points ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- Don't animate keyboard-initiated actions and don't animate things seen 50 times a day ([Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
- No overshoot on menus or anything that "just faded in"; overshoot only after a physical gesture ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).

### 3.3 Shared-element transitions (card → detail)

- Motion `layoutId`: give the card and the detail hero the same `layoutId` (e.g. `place-${id}`); wrap the detail in `AnimatePresence` so the reverse plays on unmount. The two elements must both be in the tree during the transition ([motion.dev layout animations](https://motion.dev/docs/react-layout-animations)).
- It works best when the detail is an *overlay* (modal route) rather than a hard route swap. For true route changes, the View Transitions API snapshots and crossfades — acceptable for web, but the layout-projection approach feels more native in-app.
- Only animate `transform`/`opacity`-equivalent properties; layout animations should be bounding-box projections, not animated width/height.
- Pitfalls: images must have fixed aspect ratios in both states; text should crossfade, not scale (set `layout="position"` on text nodes); keep the detail's hero the same radius scale as the card.

### 3.4 Bottom sheets

- Use [Vaul](https://vaul.emilkowal.ski/) (React drawer): `Drawer.Root` supports `snapPoints`, `activeSnapPoint`, `fadeFromIndex`, `snapToSequentialPoint`, `dismissible`, `handleOnly`, `modal`, `direction`, `repositionInputs` (default true), plus `Drawer.Handle` ([Vaul API](https://vaul.emilkowal.ski/api)). It also offers background scaling (`shouldScaleBackground`) in older docs — treat as optional; iOS 18+ no longer scales the background by default *(familiarity)*.
- Drag handle: 36×5 px, radius full, neutral at 30–40% opacity, 8 px from the top edge *(convention)*.
- Rubber-banding past the edge: `offset = overshoot * dimension * 0.55 / (dimension + 0.55 * |overshoot|)`; resist progressively, never hard-stop ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- Dismiss decision: by velocity sign at release, with ~10 px movement hysteresis before committing to a direction ([same](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- Momentum projection for flicks: `project(v) = (v/1000) * d / (1 - d)` with `d ≈ 0.998` (or 0.99 for snappier), then snap to the nearest snap point ([same](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).

### 3.5 Pull-to-refresh

- Build your own (touch tracking on the scroll container) or skip it; native overscroll in WKWebView is unreliable. CSS `overscroll-behavior: none` only works from Safari 16 ([Ionic forum](https://forum.ionicframework.com/t/how-to-prevent-bounce-elastic-scroll-in-ios-prior-to-v16/235561)) and several reports say WKWebView still bounces unless `scrollView.bounces`/`alwaysBounceVertical` are set natively ([Capacitor issue mirror](https://lightrun.com/answers/ionic-team-capacitor-bug-wkwebview-bouncing-issue-on-ios-16); [Base44 feedback](https://feedback.base44.com/p/disable-rubber-band-bounce-scrolling-in-ios-wkwebview-wrapper)).
- Recommendation: disable native bounce on the root webview, make each tab's content its own scroll container, and implement pull-to-refresh with the rubber-band formula above, a 64 px trigger threshold and a Light haptic on trigger. Spinner replaced by the VILD mark drawing in (one bespoke animation, ≤ 600 ms loop).

### 3.6 Number counters for balances

- `animate(from, to, { duration: 0.6, ease: [0.22,1,0.36,1], onUpdate })` from `motion`; `onUpdate` works with single-value animations ([motion.dev animate](https://motion.dev/docs/animate)). Render with `Intl.NumberFormat('is-IS')` and `font-variant-numeric: tabular-nums` so digits don't jitter.
- Animate only on **change** (a new credit arrives), never on mount or tab switch. Show the delta as a mint chip ("+420 kr.") that rises 8 px and fades, synchronised with a `notification({type:'SUCCESS'})` haptic.
- Under reduced motion, counters snap.

### 3.7 Skeletons and loading

- Skeletons match the final layout exactly (same heights, radii); only show if load > ~200 ms; shimmer 1.4 s linear loop, low contrast (paper → hairline); never shimmer under reduced motion. Skeleton screens are explicitly in the "keep" category for reduced motion as they aid understanding, but the shimmer itself is decorative ([web.dev](https://web.dev/articles/prefers-reduced-motion)).
- Replace skeleton → content with a 150 ms opacity crossfade, no slide.

### 3.8 Haptics (Capacitor)

`@capacitor/haptics`: `impact({style: Light|Medium|Heavy})`, `notification({type: Success|Warning|Error})`, `selectionStart/Changed/End`, `vibrate` ([Capacitor Haptics](https://capacitorjs.com/docs/apis/haptics)). Proposed mapping — and nothing else:

| Event | Haptic |
|---|---|
| Tab change, sheet reaches snap point | `impact Light` |
| Toggle / segmented control | `selectionChanged` |
| Credit earned confirmation, spend confirmed | `notification Success` |
| Destructive confirm (log out, remove card) | `impact Medium` |
| Error state | `notification Error` |

Rule: a haptic always coincides with a visible state change; never on plain taps.

### 3.9 Safe areas, keyboard, viewport

- `<meta name="viewport" content="viewport-fit=cover">`; pad with `env(safe-area-inset-*)`. Insets are only exposed when `viewport-fit=cover` is set ([WebKit bug 190771](https://bugs.webkit.org/show_bug.cgi?id=190771)); Capacitor's iOS `contentInset` defaults to `"never"`, which is what you want for full-bleed ([Capacitor config](https://capacitorjs.com/docs/config)). Removing `contentInset: automatic`/`clipToBounds` fixed letterboxing for one team ([Ionic forum](https://forum.ionicframework.com/t/app-doesnt-extend-to-full-screen-use-safe-area-inset-for-notch/213384)).
- Keyboard: `@capacitor/keyboard` resize modes `native` (default, resizes the whole webview, affects `vh`), `body`, `none`; listen to `keyboardWillShow` (gives `keyboardHeight`) ([Capacitor Keyboard](https://capacitorjs.com/docs/apis/keyboard)). Recommendation: `resize: 'none'` + manual bottom padding from `keyboardWillShow`, so the tab bar and sheets animate with the keyboard instead of jumping.
- Known WebKit issue (May 2025): a blank scrollable strip equal to the home-indicator inset persists at the bottom in some layouts; `100dvh` and `-webkit-fill-available` don't fix it ([WebKit bug 292603](https://bugs.webkit.org/show_bug.cgi?id=292603)). Use a fixed root with inner scroll containers rather than relying on `100dvh`.

### 3.10 120 Hz reality check

WKWebView `requestAnimationFrame` is still throttled to 60 Hz on ProMotion iPhones; Safari can unlock 120 Hz via a feature flag but that flag does not reach WKWebView ([WebKit bug 294338](https://bugs.webkit.org/show_bug.cgi?id=294338); [Apple dev forums](https://developer.apple.com/forums/thread/773222)). Implications:
- Design for a rock-solid 60, not 120. Any frame > 16 ms will be visible.
- JS-driven springs (Motion's `useSpring`, gesture-driven values) run on rAF → main thread. Keep gesture handlers tiny; no React re-renders per frame (use motion values, not state).
- For non-gesture animations prefer WAAPI/CSS (Motion's hybrid `animate` compiles to these where possible), which keep running if the main thread hiccups ([Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
- Animate only `transform` and `opacity`; `will-change` only where motion is imminent ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)). Never animate `height`, `padding`, `box-shadow`, `filter: blur` on lists.
- Avoid layout thrash: batch reads before writes; never read `getBoundingClientRect` inside a gesture frame after a write.
- Android: Chromium WebView does hit 90/120 Hz; test on a mid-range Android, which is the real floor.

### 3.11 Reduced motion and related preferences

- CSS: wrap motion in `@media (prefers-reduced-motion: no-preference)`; under `reduce`, replace slides/springs with `opacity 200ms ease` cross-fades and drop overshoot ([web.dev](https://web.dev/articles/prefers-reduced-motion); [Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- JS: `window.matchMedia('(prefers-reduced-motion: reduce)')` + `change` listener; Motion's `useReducedMotion` hook disables positional movement while keeping opacity ([web.dev](https://web.dev/articles/prefers-reduced-motion); [Emil Kowalski](https://emilkowal.ski/ui/great-animations)).
- Also honour `prefers-reduced-transparency` (solid tab bar, no backdrop blur) and `prefers-contrast: more` (near-solid surfaces, contrasting border) ([Apple-design skill](https://www.ui-skills.com/skills/emilkowalski/apple-design/)).
- Shimmer, counters, parallax, ambient loops: off under reduce.

---

## 4. Typography and colour

### 4.1 Icelandic glyph coverage — the facts

Every font on Google Fonts must ship the GF Latin Core glyph set, and that set includes Þ þ Ð ð Æ æ Ö Ý ý (verified in [googlefonts/glyphsets GF_Latin_Core.nam](https://raw.githubusercontent.com/googlefonts/glyphsets/main/data/results/nam/GF_Latin_Core.nam)). So *coverage* is not the question; *drawing quality* is. Þ with a bowl that sits too low, Ð with a crossbar that collides with the counter, and ð with a weak ascender are common failures in geometric sans faces. Test every candidate at 13 / 17 / 34 / 56 px, regular and the heaviest weight in use, with:

```
Þú átt 1.500 kr. í inneign hjá Ísbúð Vesturbæjar — Ðð Ææ Öö Ýý Áá Éé Íí Óó Úú
```

Google Fonts metadata (subsets confirm latin + latin-ext): Jost (wght 100–900, Owen Earl, 2020) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/jost/METADATA.pb)); Outfit (100–900, 2021) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/METADATA.pb)); Urbanist (100–900, 2021) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/urbanist/METADATA.pb)); Manrope (200–800, 2019) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/METADATA.pb)); Instrument Sans (wght 400–700, wdth 75–100, 2023) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/METADATA.pb)); Schibsted Grotesk (400–900, Bakken & Bæck, 2023) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/schibstedgrotesk/METADATA.pb)); Bricolage Grotesque (wght 200–800, wdth, opsz 12–96, 2023) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/METADATA.pb)); Fraunces (serif, wght 100–900, opsz 9–144, SOFT, WONK, 2020) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/METADATA.pb)); Geist (100–900, Vercel, 2024) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/geist/METADATA.pb)); Inter Tight (100–900, 2022) ([meta](https://raw.githubusercontent.com/google/fonts/main/ofl/intertight/METADATA.pb)).

### 4.2 Wordmark vs. UI type — the key decision

The wordmark (thin geometric, wide tracking) is a **logo asset (SVG)**, not live text. Do not set UI in Jost Light with +0.1em tracking; that is how "green AI template" happens. The UI face should be a cousin of the wordmark, not a clone: same era of geometry, but sturdier, with real tabular figures.

### 4.3 Three candidate pairings

**A. "Nordic grotesk" — Schibsted Grotesk (display) + Manrope (UI/body/numbers).** Schibsted was drawn by Bakken & Bæck for the Norwegian media group; it has Nordic credibility and a slightly warm, non-generic skeleton. Manrope is semi-geometric, so it harmonises with the wordmark, and its 200–800 range covers a light eyebrow weight. Risk: Manrope is common in startup UIs; mitigate by never using it above 24 px. **Recommended default.**

**B. "Geometric but grown-up" — Jost (display, 400–500 only, tracking −0.01 to −0.02em) + Instrument Sans (UI).** Keeps the Futura lineage of the wordmark in headlines; Instrument Sans gives a crisp, slightly condensed UI with a width axis (useful for dense amounts in tables). Risk: Jost at light weights in UI looks like a 2016 Squarespace template; hold the line on weight.

**C. "Editorial" — Bricolage Grotesque (display, opsz on) + Manrope (UI).** Bricolage has character (ink traps, a lively "g") and an optical-size axis so it stays readable small; this pairing gives the marketing site a magazine feel that no AI template produces. Risk: too much personality for a money balance; use it on the site and in onboarding, not on the home screen numbers.

Considered and rejected as primary: Inter / Inter Tight / Geist (the three most-cited "default" faces), Poppins and Outfit (Outfit's round geometry pushes toward "playful SaaS"), Urbanist (fine, but anonymous). Fraunces: keep as an optional *display-only* serif for the site's manifesto section ("Af hverju inneign en ekki afsláttur") if pairing C feels too much; its SOFT/WONK axes at 0 give a quiet serif. Do not put a serif in the app.

Figures: set balances with `font-feature-settings: "tnum" 1` and verify the chosen face actually has tabular numerals (Jost does per its README: "tabular and proportional numbers" ([Jost GitHub](https://github.com/aaronbell/Jost)); verify Manrope/Instrument Sans in the glyph viewer).

Type scale (mobile): 34/40 display (balance), 24/30 title, 17/24 body, 15/20 secondary, 13/16 caption, 11/14 eyebrow (uppercase, +0.06em — the one place wide tracking is allowed, as a nod to the wordmark). Web: add 56/60 and 72/76 for the hero, tracking −0.02em.

### 4.4 Palette

Brand constants: deep green `#0E5A3C`, mint `#B5F7A1`. Contrast ratios below were computed (WCAG 2.x relative luminance). AA = 4.5:1 body, 3:1 large text / UI components.

**Light mode**

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `paper` | `#F6F7F4` | page background (tinted, not white) | — |
| `surface` | `#FFFFFF` | cards, sheets | — |
| `hairline` | `#E3E7E2` | 1 px dividers, input borders | — |
| `ink` | `#1C2420` | primary text | 14.8:1 on paper |
| `ink-muted` | `#5B6660` | secondary text | 5.6:1 on paper, 6.0:1 on white |
| `green-900` | `#0E5A3C` | brand ink: headlines, primary buttons, active tab, links on mint | 8.3:1 on white, 7.7:1 on paper, 6.6:1 on mint |
| `green-700` | `#167A52` | links, secondary actions, icons | 5.3:1 on white |
| `mint-300` | `#B5F7A1` | *the money moment*: balance surface, earned chip, wordmark ground | not for text on light |
| `mint-100` | `#EEF9E8` | tinted rows/sections (e.g. receipt credit line) | green-900 on it 7.6:1 |
| `success` | `#167A52` | reuse green-700 | 5.3:1 |
| `warning` | `#8A5A00` | amber text | 5.9:1 on white |
| `danger` | `#B3261E` | error text/icons (not `#E53935`, which fails at 4.2:1) | 6.5:1 on white |

**Dark mode** (mint becomes the ink-level accent; deep green becomes a surface)

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `bg` | `#0B1210` | page | — |
| `surface` | `#121A16` | cards | — |
| `raised` | `#1C2620` | sheets, inputs (pair with hairline; 1.14:1 vs surface is layering only) | — |
| `hairline` | `#263129` | dividers | — |
| `ink` | `#F2F5F1` | primary text | 16.1:1 on surface |
| `ink-muted` | `#A3B0A8` | secondary text | 7.9:1 on surface |
| `mint-300` | `#B5F7A1` | accent text, active tab, primary button fill (ink `#0B1210` on it: 15.1:1) | 14.2:1 on surface |
| `green-900` | `#0E5A3C` | brand surface (balance card ground) with mint text | mint on it 6.6:1 |
| `success` | `#7EDB86` | | 10.4:1 |
| `warning` | `#F4B942` | | 10.0:1 |
| `danger` | `#FF6B6B` | | 6.4:1 |

Rules that keep mint from becoming "green AI template":
1. **Mint is an event, not a theme.** It appears where money appears: the balance card ground (light) or balance digits (dark), the "+420 kr." chip, the credit line on a receipt, the "Nýta inneign" confirm. Nowhere else. Tab bar, buttons (light mode), headers: deep green and paper.
2. **Never a mint gradient, never mint-to-green gradient, never mint glow.** Flat fills only.
3. **Mint next to deep green, not next to white.** Mint on white at large areas looks like a highlighter; mint inside green-900 (as in the wordmark) looks like a brand.
4. **Budget: ≤ 10% of any screen, ≤ 1 mint object per screen.** Marketing site: ≤ 1 mint section per page.
5. **Neutrals carry a green cast** (paper `#F6F7F4`, muted `#5B6660`) so the UI feels designed from the brand rather than Tailwind grey + a green button ([Sailop's "tinted neutral ramp"](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design)).
6. **Photography does the colour work.** Real food and real rooms bring reds, browns, steel; the UI stays green/paper, so mint pops when it appears.
7. One radius scale: 6 (chips, inputs), 12 (cards), 20 (sheets, balance card), full (avatars, pills — pills only for status, never for buttons).
8. Shadows tinted toward green-900 at low alpha (`0 1px 2px rgba(14,90,60,.06), 0 8px 24px rgba(14,90,60,.08)`), two levels only.

---

## 5. Marketing website

### 5.1 What the Nordic references actually do

- **vipps.no** — top-level **Privat / Bedrift** tabs (Bedrift goes to a separate business site), a real photo hero, headline "Hei, vi er Vipps 🧡", a 14-card feature grid, news, help, app badges ([vipps.no](https://www.vipps.no/)). Good: the clean audience split and photography. Bad: 14 flat cards is a wall.
- **mobilepay.dk** — H1 "Vi har gjort betaling meget, meget nemt", social proof in the hero (4.6 m users, 200,000 shops), Privat/Virksomhed switch repeated in the hero, nine feature tiles, scam-awareness sections, news ([mobilepay.dk](https://www.mobilepay.dk/)). Good: numbers in the hero, plain Danish. Bad: emoji-in-headings is drifting into template territory.
- **lunar.app** — phone-number sign-up form *in the hero* with QR, Trustpilot 4.4 / App Store 4.7 beside the CTA, long single-feature sections each ending in one link, four pricing tiers, reviews, FAQ, Personal/Business toggle ([lunar.app](https://www.lunar.app/)). Good: conversion mechanics. Bad: the dreamy illustrated card-in-clouds hero is exactly the 3D-illustration tell.
- **swish.nu** — "För en enklare vardag sedan 2012" ([swish.nu](https://www.swish.nu/); JS-rendered, structure not fetchable). The line is a model of specific, unhyped copy: a date instead of an adjective.
- **takkkronur.is** — hero + badges, "Svona virkar Takk" (3 steps), detailed how-it-works with partner logos, ~20-question FAQ, contact form, footer with kennitala/VSK; no merchant path ([takkkronur.is](https://takkkronur.is)).
- **noona.is** — "Bókaðu tíma í allt, núna.", 31-tile category grid, "Upplifunin er best í appinu" + QR + 4.8 from 11K ratings, two business cards ("Noona fyrir veitingastaði" → Noona HQ), city browser ([noona.is](https://noona.is/)). Good: the business split via two product cards and the rating-with-count social proof. Bad: geo-IP header showed "Council Bluffs, United States"; "Appi ársins 2023 🏆"; "bestu", "frábær".
- **aur.is** — "Vertu með allt á einum stað í Aur appinu", "100.000 Íslendingar nota Aur mánaðarlega", feature blocks each ending in "Sjá nánar", Klink up to 10% back ([aur.is](https://www.aur.is/)). Good: one real number. Bad: generic structure, no imagery alt text.
- **indo.is** — "Ekki banki. Ekkert bull.", hand-drawn illustration throughout, four alternating feature blocks, a long screenshot walkthrough, "indó orðabók" (a glossary — nice touch), kennitala/bankanúmer in the footer ([indo.is](https://www.indo.is/)). Good: a *voice*; the glossary. Bad: zero photography; illustration-only is its own template now.
- **kass.is** — redirects to Íslandsbanki's "Kass kvatt": the app closed 30 April 2024 after eight years ([islandsbanki.is](https://www.islandsbanki.is/is/frett/kass-appid-kvatt)). Lesson: a loyalty/payments app in Iceland has to be worth keeping on the phone.
- **ordr.is** — returned 503 on every fetch; the company is Norwegian (Oslo, 2019) QR ordering/payment for bars and restaurants ([TechCrunch 2021](https://techcrunch.com/2021/05/18/pandemic-helps-ordrs-simple-pos-platform-for-bars-and-restaurants-raise-12m)). Relevant as a merchant-portal UX reference once reachable.

What Icelandic sites do well: universal *þú*, imperative headlines ("Bókaðu", "Sækja appið"), app badges + QR, trust via rafræn skilríki, kennitala in the footer (expected; include it). What they do badly: hype adjectives, emoji in headings, feature-block monotony, no merchant path (Takk), Takk's own FAQ calling the credit "afslættir", illustration-only or no photography, and English-default geo detection.

### 5.2 Recommended structure

Two audiences, one site, **no toggle in the hero**. The homepage is for consumers; a persistent nav item "Fyrir veitingastaði" leads to a page built like a sales page. (Vipps/MobilePay/Lunar all route business to a separate surface; Noona does it with two product cards. We do it with one nav item and one section near the end of the home page.)

Nav: `VILD` · Staðir · Svona virkar VILD · Spurt og svarað · **Fyrir veitingastaði** · [Sækja appið]

**Home**

1. **Hero** (asymmetric: text left 5fr, phone right 3fr; real photo of a real partner restaurant behind the phone, not a gradient).
   H1: *"Þú borgar fullt verð. Hluti kemur til baka."*
   Sub: *"VILD skilar þér inneign hjá veitingastaðnum í hverri heimsókn. Þú notar hana næst."*
   CTA: [Sækja appið] + App Store / Google Play badges. Beside it, one real number once we have it: *"4,8 ★ · 2.300 umsagnir"* — never invented.
2. **The number** (editorial, full-bleed paper). One line of large type: *"Meðalinneign eftir þrjár heimsóknir: 1.280 kr."* — only once measured. Until then, this section is cut, not faked.
3. **Svona virkar VILD** (three steps, but *not* three equal cards: a numbered vertical list with one real screenshot per step, screenshots with real data).
   1. *Sæktu appið og skráðu þig með rafrænum skilríkjum.*
   2. *Borgaðu eins og venjulega.* (sub: *Þú þarft ekki að sýna neitt við kassann — tengdu kortið einu sinni.* — only if the mechanic is card-linked; otherwise *Skannaðu kóðann við kassann.*)
   3. *Inneignin bíður þín næst.*
4. **Staðir** — live list of partner restaurants (logo + name + rate "+8% í inneign"), map embed, "Sjá alla staði". Real data or nothing.
5. **Af hverju inneign en ekki afsláttur** — the manifesto, 3–4 short paragraphs, measured column, optional serif display. Copy direction: *"Afsláttur lækkar verðið einu sinni. Inneign fylgir þér." / "Staðurinn fær fullt verð. Þú færð hluta til baka. Báðir græða á því að þú komir aftur."*
6. **Kvittunin** — one large product shot: a VILD receipt with the credit line in mint. Caption: *"Hver kvittun sýnir nákvæmlega hvað kom til baka."*
7. **Fyrir veitingastaði** (one section, dark green ground, the only mint-free dark section): *"Fáðu gestina aftur — án þess að lækka verðið."* CTA: [Skoða VILD fyrir staði] → merchant page.
8. **Spurt og svarað** — 8–10 questions, Takk-style thoroughness: expiry (*"Rennur inneignin út?"*), partial payments, refunds (*"Hvað gerist ef ég skila?"*), privacy, kennitala.
9. **Footer** — VILD ehf., kennitala, VSK-númer, address, Skilmálar, Persónuvernd, Hafa samband, badges. No social wall of icons unless the accounts are active.

**Fyrir veitingastaði (merchant page)** — built like Lunar's conversion page, not like the home page:
1. Hero: *"Gestir sem koma aftur."* Sub: *"VILD gefur gestum inneign hjá þér, ekki afslátt. Þú heldur verðinu — þeir koma aftur."* CTA: [Bóka kynningu] (Calendly-style) + [Hafa samband].
2. How it works for the merchant (3 steps: *Tengjum kassann · Þú velur hlutfallið · Þú sérð hverjir koma aftur*).
3. **The economics**, as a worked example with real numbers in a table (*"10% afsláttur vs. 10% inneign: hvað gerist við 1.000 kr. reikning?"*), not a feature grid.
4. Merchant portal screenshots (real UI: "Yfirlit", "Færslur", "Gestir", "Uppgjör").
5. Pricing, plainly (*"Engin fastagjöld. X% af nýttri inneign."* — whatever the real model is).
6. Signed partner logos + one named quote with a photo (named owner, named place).
7. FAQ for merchants (uppgjör, VSK handling, returns, integration with Dineout/Noona/POS).
8. Form: name, place, phone, "Hvaða kassakerfi notið þið?"

**Site craft**: 1120 px content column; type per §4; motion limited to scroll-reveal fades (opacity + 8 px translate, 250 ms, once) and the one hero phone loop (real recording, 15–20 s, muted, paused under reduced motion). No parallax. No cursor effects.

---

## 6. Icelandic UX copy conventions

### 6.1 Address

Use **þú** everywhere. Þérun (formal *þér*) is effectively extinct in Icelandic consumer and government UI; the Ísland.is handbook's own example is "Eftir innskráningu velur þú **Staðfesta tölvupóstfang**…" ([Ísland.is handbók](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki)), and Noona, Aur and indó all use þú/imperatives ([noona.is](https://noona.is/); [aur.is](https://www.aur.is/); [indo.is](https://www.indo.is/)). Imperatives for actions (*Sæktu, Skráðu þig, Nýttu*), second person for state (*Þú átt 1.500 kr.*).

### 6.2 Numbers, currency, dates, time

- Thousands with a period, decimals with a comma; the Ísland.is guide accepts "1.000 eða 1 000" and shows currency as **"1.234,56 kr."** and percentages as **"10,2%"** ([Ísland.is handbók](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki)). ICU `is_IS` agrees: grouping ".", decimal "," ([localeplanet is_IS](https://www.localeplanet.com/icu/is_IS/index.html)).
- Write **"1.500 kr."** (space, lowercase, period) after the amount; never "kr 1500", never "ISK" in Icelandic UI (ISK is for the English locale). Krónur are whole numbers in practice — never show ",00".
- Dates: long form **"14. júlí 2025"** (number, period, space, month, optional year) and never "14.júlí"; avoid dash ranges because screen readers mangle them — write **"18. til 21. ágúst"** and **"milli kl. 10 og 16"** ([Ísland.is handbók](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki)). Short numeric form in ICU is non-padded **"18.1.2026"** (`d.M.y`) ([localeplanet](https://www.localeplanet.com/icu/is_IS/index.html)); in a transaction list prefer "18. jan." for scannability.
- Time: 24-hour, **"kl. 12:30"**. Month names lowercase. Weekdays lowercase ("mánudagur").
- Avoid abbreviations in UI; screen readers read "skv. 1. mgr." as nonsense ([Ísland.is handbók](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki)). Exception: "kr." and "kl." are universally understood.
- No ALL CAPS in running text; bold sparingly ([same](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki)). (Our uppercase eyebrows are 11 px labels, acceptable; mark them `text-transform` so screen readers get the normal case.)
- Implementation: `Intl.NumberFormat('is-IS', { maximumFractionDigits: 0 })` + append " kr."; verify the environment's ICU puts the symbol *after* the number (older ICU data placed "kr." after; some Rails data placed it before) ([search summary of ICU/Rails locale data](https://www.localeplanet.com/icu/is_IS/index.html)).

### 6.3 Standard app vocabulary

| Concept | Use | Notes |
|---|---|---|
| Log in / sign up | **Innskráning** / **Nýskráning** (nouns, nav); buttons: **Skrá inn** / **Skrá mig** | "Skrá þig með rafrænum skilríkjum" for the Auðkenni flow ([island.is](https://island.is/s/stafraent-island/innskraninga-thjonusta/innskraning-med-rafraenum-skilrikjum-leidbeiningar)) |
| Home | **Heim** (tab) or **Yfirlit** | Yfirlit = "overview"; banks use it for the accounts overview |
| Places | **Staðir** | "Veitingastaðir" when precision matters; "Nálægt þér", "Opið núna" |
| Offers | **Tilboð** | Takk uses "Topp tilboð"; Landsbankinn "Aukakrónutilboð" |
| Transactions / history | **Færslur** (bank term) or **Kvittanir** (Takk) | Use *Færslur* for the list, *Kvittun* for the object |
| Settings | **Stillingar** | confirmed in Ísland.is app guidance ([island.is](https://island.is/s/stafraent-island/innskraninga-thjonusta/innskraning-med-rafraenum-skilrikjum-leidbeiningar)) |
| My pages / profile | **Mínar síður** (web), **Ég** (tab) | "Mínar síður" is the web convention for logged-in areas; in a tab bar "Ég" or "Prófíll" |
| Notifications | **Tilkynningar** | |
| Terms / privacy | **Skilmálar** / **Persónuvernd** | footer standard ([takkkronur.is](https://takkkronur.is)) |
| Contact / help | **Hafa samband** / **Hjálp** / **Spurt og svarað** | |
| Partners | **Samstarfsaðilar** / **Samstarfsstaðir** | Landsbankinn uses the former |
| Confirm / cancel / back / save | **Staðfesta** / **Hætta við** / **Til baka** / **Vista** | |
| Get the app | **Sækja appið** | Noona, Aur both use it |
| Earn / use | **safna** / **nýta** (also *nota*) | Landsbankinn: "inneign sem þú safnar"; "Þú notar Aukakrónur" |
| Balance | **Inneign** / **Inneignin þín** | |

### 6.4 Naming the cashback — without "afsláttur"

Evidence from Icelandic precedents: Landsbankinn defines Aukakrónur as **"inneign sem þú safnar"** and equates 1 Aukakróna = 1 króna ([landsbankinn.is](https://www.landsbankinn.is/aukakronur)); Takk's hero is **"Fáðu Takk krónur til baka"** and its verbs are *safna* / *áunnið* ([takkkronur.is](https://takkkronur.is)); Aur calls its scheme a **"vildarkerfi"** and the currency "Klink" ([aur.is](https://www.aur.is/)); Icelandair uses **"vildarpunktar"** and, for points-as-payment, **"vildarpunktaendurgreiðsla"** ([icelandair.com](https://www.icelandair.com/is-is/flug/kynning/vildarpunktaendurgreidsla/)).

Assessment of the candidates:

- **inneign** — "credit / balance owed to you". Neutral, precise, already the bank-sanctioned word for exactly this mechanic. **Use as the system noun.** Balance: *"Inneignin þín"*; event: *"Þú fékkst 420 kr. í inneign"*; action: *"Nýta inneign"*.
- **krónur til baka** — "krónur back". Plain, friendly, the best *explanatory* phrase for marketing ("Hluti kemur til baka"). Takk already owns "X krónur til baka" as a hero line, so don't make it the headline; use it in body copy.
- **endurgreiðsla** — "refund / reimbursement". Implies something was wrong (returns, tax, insurance) or is institutional. Avoid in UI except for actual refunds (*"Endurgreiðsla vegna skila"*).
- **söfnun** — "collecting/saving". Good as a *process* word (*"Söfnun í þessum mánuði: 1.280 kr."*), weak as the noun for the money itself.
- **sjóður** — "fund". Sounds like a pension or a grant. Avoid.
- **VILD-krónur / vildarkrónur** — a branded currency like Takk krónur / Aukakrónur / Klink. *Vildarkrónur* reads as a generic compound ("loyalty krónur") and will be heard as a cousin of *vildarpunktar*; it also invites the question "how much is a vildarkróna worth?", which Takk and Landsbankinn each have to answer in an FAQ. Because VILD's advantage is that it is *real krónur*, **do not invent a currency**. Say krónur. Reserve "VILD" for the system: *"VILD-inneign"* when disambiguation is needed (e.g. on a receipt line), otherwise just *inneign*.

Proposed microcopy set:
- Home balance label: **Inneignin þín** · amount **1.500 kr.** · sub **hjá 3 stöðum**
- Per-place: **Inneign hjá Brauð & Co: 420 kr.**
- Earned event: **+420 kr. í inneign** · *Brauð & Co · 14. júlí*
- Rate on a place card: **+8% í inneign** (never "8% afsláttur", never "8% cashback")
- Spend action: **Nýta inneign** → sheet **Nýta 420 kr. hjá Brauð & Co?** → swipe **Renndu til að staðfesta** → **Inneign nýtt. Góða máltíð.**
- Empty state: **Engin inneign enn. Fyrsta heimsóknin skilar henni.**
- Expiry (if any): **Inneignin gildir í 12 mánuði frá síðustu heimsókn.**
- Marketing one-liner: **Þú borgar fullt verð. Hluti kemur til baka.**

### 6.5 What "vild" means to an Icelander

- Etymology: Old Norse *vild* (f.) = "will, liking, benevolence; favour, grace; reputation", from Proto-Germanic *wiliþō (same root as *vili*, "will") ([Wiktionary, Old Norse vild](https://en.wiktionary.org/wiki/vild)).
- Modern usage (language knowledge, not sourced): the bare noun is rare, but it lives in three places every Icelander knows:
  1. **"að vild" / "eftir vild"** — "at will, as you please": *"borðaðu að vild"* is the standard restaurant phrase for all-you-can-eat / help yourself. This is a gift for a restaurant brand: *VILD* literally evokes "as much as you like, at your pleasure".
  2. **vildar-** compounds for loyalty: *vildarkerfi* (loyalty scheme), *vildarkjör* (preferential terms), *vildarklúbbur* (loyalty club), *vildarvinur* (loyal customer), *vildarpunktar* (Icelandair's points). Aur uses *vildarkerfi* on its homepage ([aur.is](https://www.aur.is/)); Icelandair's programme is now "Icelandair Saga Club" in Icelandic as well, but the currency is still *Vildarpunktar* ([mbl.is, Oct 2026](https://www.mbl.is/ferdalog/frettir/2026/10/15/icelandair_og_southwest_auka_samstarf/)). I could not find a source confirming the older "Vildarklúbbur Icelandair" name; treat it as historical/informal.
  3. **velvild / góðvild** — goodwill, kindness.
- Implication: the name is read instantly as "loyalty/favour" (category-correct) *and* carries "at your pleasure" (warm). Lean on both in copy: the manifesto can open with *"Að vild."* as a two-word headline; the merchant page can use *vildarvinir* for repeat guests. Avoid *vildarkjör* (sounds like airline tiers) and avoid stacking *vildar-* compounds in UI, which would read as corporate.
- Dictionary verification: the Árnastofnun online dictionaries did not return entries via fetch ([islenskordabok.arnastofnun.is](https://islenskordabok.arnastofnun.is/)); have a native copywriter confirm the entry text for *vild* and *vildarkjör* before printing an etymology on the site.

---

## 7. Open items to verify before spec

1. On-device screen recordings of Revolut, Wise, Starbucks, TGTG, Klarna, Vipps (beta) for exact tab labels and the balance/earned animations — the sources above describe features, not frames.
2. Þ/Ð/ð drawing quality in Schibsted Grotesk, Manrope, Instrument Sans, Jost at 13 px and 34 px on an iPhone (render the test string).
3. Tabular-figure support in Manrope and Instrument Sans (glyph viewer).
4. Whether `shouldScaleBackground` is still in Vaul's current API (the API page fetched did not list it).
5. Current WKWebView frame-rate status on iOS 26 (one anecdotal 120 fps report on the WebKit bug; assume 60).
6. Native copy review of every Icelandic string above; and legal review of "inneign" vs the actual accounting treatment (is it a liability on the merchant or on VILD? — that determines whether "hjá Brauð & Co" is literally true).
7. ordr.is was unreachable (503) during research; re-fetch for merchant-portal reference.

---

## Sources (all cited inline above)

AI-slop tells: [925 Studios](https://www.925studios.co/blog/ai-slop-design-tells) · [SmoothUI](https://smoothui.dev/blog/ai-design-slop) · [Sailop](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design) · [dev.to / indigo-500](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p) · [21st.dev](https://21st.dev/blog/website-not-look-ai-generated) · [dev.to / sangrokjung](https://dev.to/sangrokjung/why-every-ai-generated-landing-page-looks-the-same-and-how-to-fix-it-1kmo) · [vibecodekit](https://vibecodekit.dev/ai-slop-design)
Apps: [Revolut 10](https://www.revolut.com/news/revolut_launches_revolut_10_as_it_targets_primary_accounts_and_passes_35m_customers_worldwide) · [Revolut Shops AU terms](https://www.revolut.com/en-AU/legal/shops/) · [Revolut help RevPoints](https://help.revolut.com/de-CH/help/revpoints/question-shop/) · [Monzo home](https://monzo.com/blog/the-new-and-improved-home-screen) · [Monzo Grow tab](https://community.monzo.com/t/we-re-launching-grow-tab-sign-up-for-early-access/190853) · [Wise critique](https://ixd.prattsi.org/2025/09/design-critique-wise-ios-app/) · [Cash App / Abduzeedo](https://www.abduzeedo.com/cash-apps-new-design-language-and-ai-assistant-moneybot) · [Cash App / Design Compass](https://designcompass.org/en/2025/12/03/cash-apps-new-design-language-and-ai-moneybot/) · [Klarna / TechCrunch](https://techcrunch.com/2024/08/15/klarna-takes-on-banking-with-new-savings-cash-back-offerings) · [Lunar 5.0](https://www.crowdfundinsider.com/2024/12/234492-nordic-challenger-bank-lunar-launches-update-to-hyper-personalize-banking/) · [Vipps redesign / Tek.no](https://www.tek.no/nyheter/nyhet/i/JOLdMb/vipps-faar-nytt-utseende) · [MobilePay redesign / Ritzau](https://via.ritzau.dk/pressemeddelelse/15101045/mobilepay-far-nyt-design) · [Swish App Store](https://apps.apple.com/se/app/swish-betalningar/id563204724) · [Starbucks App Store](https://apps.apple.com/us/app/starbucks/id331177714) · [Starbucks dashboard 2016](https://androidcentral.com/starbucks-app-gets-revamped-dashboard-new-starbucks-rewards-program) · [Chipotle 2026](https://finviz.com/news/343996/chipotle-relaunches-rewards-with-rewards-on-repeat-delivering-more-value-without-trade-offs) · [Sweetgreen](https://www.qsrmagazine.com/news/sweetgreen-roll-out-app-redesign-ios-devices/) · [TGTG critique](https://ixd.prattsi.org/2026/02/design-critique-too-good-to-go-mobile-app/) · [Wolt](https://press.wolt.com/en-WW/259625-wolt-app-updated-a-new-way-to-discover-everything-around-you/) · [Lidl Plus](https://latestdeals.co.uk/guides/shopping/lidl-plus-how-does-the-loyalty-scheme-work) · [Lidl cashback test](https://www.mobiflip.de/lidl-plus-fuehrt-cashback-nach-rewe-vorbild-ein/amp/) · [Clubcard](https://www.choose.co.uk/money/guide/best-supermarket-loyalty-scheme/) · [Coop DK](https://apps.apple.com/lu/app/coop-scan-pay-app-offers/id698632628) · [Takk App Store](https://apps.apple.com/us/app/takk/id6745477799) · [takkkronur.is](https://takkkronur.is) · [Aukakrónur](https://www.landsbankinn.is/aukakronur) · [aur.is](https://www.aur.is/)
Motion: [Apple-design skill (Emil Kowalski)](https://www.ui-skills.com/skills/emilkowalski/apple-design/) · [Emil Kowalski, great animations](https://emilkowal.ski/ui/great-animations) · [Motion transitions](https://motion.dev/docs/react-transitions) · [Motion animate](https://motion.dev/docs/animate) · [Motion layout](https://motion.dev/docs/react-layout-animations) · [Vaul](https://vaul.emilkowal.ski/api) · [Capacitor Haptics](https://capacitorjs.com/docs/apis/haptics) · [Capacitor Keyboard](https://capacitorjs.com/docs/apis/keyboard) · [Capacitor config](https://capacitorjs.com/docs/config) · [web.dev reduced motion](https://web.dev/articles/prefers-reduced-motion) · [WebKit 294338 (120Hz)](https://bugs.webkit.org/show_bug.cgi?id=294338) · [Apple forums WKWebView 120Hz](https://developer.apple.com/forums/thread/773222) · [WebKit 292603](https://bugs.webkit.org/show_bug.cgi?id=292603) · [WebKit 190771](https://bugs.webkit.org/show_bug.cgi?id=190771) · [Ionic safe-area](https://forum.ionicframework.com/t/app-doesnt-extend-to-full-screen-use-safe-area-inset-for-notch/213384) · [Ionic bounce](https://forum.ionicframework.com/t/how-to-prevent-bounce-elastic-scroll-in-ios-prior-to-v16/235561)
Type: [GF Latin Core](https://raw.githubusercontent.com/googlefonts/glyphsets/main/data/results/nam/GF_Latin_Core.nam) · Google Fonts METADATA for [Jost](https://raw.githubusercontent.com/google/fonts/main/ofl/jost/METADATA.pb), [Outfit](https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/METADATA.pb), [Urbanist](https://raw.githubusercontent.com/google/fonts/main/ofl/urbanist/METADATA.pb), [Manrope](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/METADATA.pb), [Instrument Sans](https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/METADATA.pb), [Schibsted Grotesk](https://raw.githubusercontent.com/google/fonts/main/ofl/schibstedgrotesk/METADATA.pb), [Bricolage Grotesque](https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/METADATA.pb), [Fraunces](https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/METADATA.pb), [Geist](https://raw.githubusercontent.com/google/fonts/main/ofl/geist/METADATA.pb), [Inter Tight](https://raw.githubusercontent.com/google/fonts/main/ofl/intertight/METADATA.pb) · [Jost GitHub](https://github.com/aaronbell/Jost)
Sites and Icelandic: [vipps.no](https://www.vipps.no/) · [mobilepay.dk](https://www.mobilepay.dk/) · [lunar.app](https://www.lunar.app/) · [swish.nu](https://www.swish.nu/) · [noona.is](https://noona.is/) · [indo.is](https://www.indo.is/) · [Kass closure](https://www.islandsbanki.is/is/frett/kass-appid-kvatt) · [Ordr / TechCrunch](https://techcrunch.com/2021/05/18/pandemic-helps-ordrs-simple-pos-platform-for-bars-and-restaurants-raise-12m) · [Ísland.is handbók: stafsetning og greinarmerki](https://island.is/handbaekur/handbok-efnisstefnunnar/stafsetning-og-greinarmerki) · [Ísland.is rafræn skilríki](https://island.is/s/stafraent-island/innskraninga-thjonusta/innskraning-med-rafraenum-skilrikjum-leidbeiningar) · [ICU is_IS](https://www.localeplanet.com/icu/is_IS/index.html) · [Wiktionary vild](https://en.wiktionary.org/wiki/vild) · [Icelandair vildarpunktaendurgreiðsla](https://www.icelandair.com/is-is/flug/kynning/vildarpunktaendurgreidsla/) · [mbl.is Saga Club](https://www.mbl.is/ferdalog/frettir/2026/10/15/icelandair_og_southwest_auka_samstarf/)
