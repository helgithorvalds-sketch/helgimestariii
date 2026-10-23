# VILD

Inneign í stað afsláttar. An Icelandic loyalty platform for restaurant chains: guests pay full price,
a share comes back as credit at the same chain.

| Document | What |
|---|---|
| `SPEC.md` | Product specification: principles, flows, surfaces, data, legal position |
| `DESIGN.md` | Design system and build rules (tokens, type, motion, copy, the "generated?" checklist) |
| `ARCHITECTURE.md` | POS, wallet passes, electronic ID, money; the POS receipt contract |
| `BACKEND.md` | Pointer to `supabase-vild/README.md` and the purchase data-flow |
| `NATIVE.md` | Capacitor packaging and store checklist |
| `ROADMAP.md` | What is done, what is next, the first chain |
| `JUNI-BRIEF.md` | How to brief Júní |
| `research/takk.md` | Takk (Hagar) — website, app, business model, terms |
| `research/juni.md` | Júní — who they are, how they work, their design language |
| `research/tech-landscape.md` | Icelandic POS vendors, acquirers, wallets, eID, legal, app stores |
| `research/design-brief.md` | What looks generated vs designed; references; motion; type; Icelandic copy |
| `research/pitch-film-and-fagkaup.md` | The pitch film scene by scene; Fagkaup |

## Run it

```sh
npm install
npm run dev                # CRM + VILD at http://localhost:8080/vild
npm run dev:vild           # standalone VILD at http://127.0.0.1:8090/
npm run test:vild          # vitest
npm run smoke:vild         # Playwright screenshots of every route → e2e/vild/screenshots/
```

Demo accounts (mock data, persisted in the browser): consumer — any 7-digit phone, code `123456`,
or "Rafræn skilríki"; merchant — `johanna@luna.is` with any password.

## Code map

```
src/vild/
  VildApp.tsx        root (theme scope, fonts, auth)      routes.tsx     route table
  theme.css          tokens scoped to .vild              main.tsx       standalone entry
  lib/               types, format, paths, motion, haptics, auth, queries
  data/              api.ts (interface), mock.ts, seed.ts, supabase.ts, index.ts
  components/kit     Button, Chip, CreditTag, AnimatedNumber, Sheet, ProductImage, bits
  components/brand   Wordmark, CoinMark, LoopMark
  site/              marketing website                    app/           consumer app
  merchant/          merchant portal                      test/          vitest
supabase-vild/       migrations, seed, edge functions, README
e2e/vild/            smoke.mjs screenshot harness
public/vild/         icons, manifest, product photos (Unsplash, free licence)
```
