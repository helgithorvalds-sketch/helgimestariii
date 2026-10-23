# Brief for Júní — VILD

Júní designed and built Takk (React Native + NestJS/GraphQL, middleware to Hagar's systems). This
brief is written the way they work (`docs/vild/research/juni.md` §2 and §6): goal and KPI first,
users available, a design sprint as the first engagement, integrations listed, a clear decision on
design-only vs design-and-build.

## 1. What VILD is (two sentences)
Inneign í stað afsláttar fyrir veitingakeðjur: gesturinn borgar fullt verð, hluti kemur til baka sem
inneign hjá sömu keðju, og inneignin bíður næst. Ein keðja í hverjum geira, byrjað í veitingageiranum.

## 2. Goal and KPIs
- Launch with one chain in Q1; 10.000 members in 90 days (Takk: 20k in 4 days with Hagar's reach).
- Return rate within 30 days ≥ 45% for members vs the chain's baseline.
- Redemption rate 55–75% of issued credit; average credit per visit ≥ 300 kr.
- App Store rating ≥ 4.3 (Takk: 3.1 — the complaints were small amounts, an extra step at the till, privacy).

## 3. What exists (this repository)
- Brand tokens and a working design system (`docs/vild/DESIGN.md`), a pitch film, a wordmark.
- Working prototype of the site, the app and the merchant portal on demo data (`/vild`).
- Backend design and code (Supabase), POS contract, wallet pass and eID functions.
- Research on Takk, the POS market, legal position.

## 4. What we want from Júní
**Phase 1 — Hönnunarsprettur (4 days):** challenge = "the moment at the till" (identify + pay + see
the credit land) and the home screen. Figma prototype; usability test with ≥5 guests and ≥3 cashiers.
**Phase 2 — Design system + app design in Figma** (onboarding → daily use), merchant portal key
screens (Inneign picker, Kassakerfi), site. Deliver tokens that map to ours.
**Phase 3 (decide after 1):** design-only (we build on the existing React/Capacitor code) or
design-and-build (their React Native stack). Our preference: design-only; we keep one codebase.

## 5. Integrations they should know about
Rafræn skilríki (Kenni/Auðkenni OIDC), Apple/Google Wallet passes (storeCard with live balance,
later NFC via PassEntry), POS webhooks (Noona HQ first), push, Supabase backend, Capacitor shell.

## 6. Constraints
Icelandic only in v1; the word "afsláttur" is banned; WCAG AA; ISO 27001-grade handling of
kennitala (Júní is certified); no purple, no copy of Takk's layout.

## 7. Questions for the first meeting
Who is our commercial owner (Arndís or Andri)? Did they design the Takk brand mark or only the app?
What did Takk's usability tests say about the till step? Can they introduce PassEntry?
Fixed price for the sprint and a range for phase 2.
