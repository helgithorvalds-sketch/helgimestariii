# Miðatorg — peer-to-peer ticket marketplace

Miðatorg lives under **`/midatorg`** in this app and is fully self-contained in this folder plus
`supabase-midatorg/` (its own Supabase project). Nothing in the Svif CRM depends on it, and the CRM
does not depend on it; the only shared touch points are one lazy route in `src/App.tsx` and a few
extra colour names in `tailwind.config.ts`.

## What it does

- **Market home** (`/midatorg`): every upcoming event as a market card with the lowest asking price,
  how far under face value it is, tickets for sale, people looking, and a price sparkline. Search,
  category chips, sorting, trending strip.
- **Event page** (`/midatorg/vidburdir/:id`): stat tiles, price history chart with the face-value
  ceiling, order book with "Til sölu" and "Óskað eftir" sides, buy dialog, alerts ("Láta mig vita").
- **Sell / want** (`/midatorg/selja`, `/midatorg/oska`): forms with event picker (or add an event
  manually), price capped at face value, private proof upload with duplicate detection.
- **Deals** (`/midatorg/vidskipti`): reservation timer, step-by-step no-escrow flow
  (reserved → paid → ticket sent → completed), realtime chat, proof download for the buyer, ratings,
  disputes, reports.
- **Account** (`/midatorg/eg`, `/midatorg/innskra`, `/midatorg/notendur/:id`): email login, magic
  link, password reset, phone verification (SMS OTP), profile, my listings/requests/alerts, ratings.
- **Admin** (`/midatorg/stjorn`): reports, users (ban, verification level), events (edit, delete,
  import from tix.is), disputes, settings.
- **About** (`/midatorg/um`), **notifications** (`/midatorg/tilkynningar`), Icelandic and English UI.

Product and architecture spec: `docs/midatorg-spec.md`. Visual spec: `docs/midatorg-design/DESIGN.md`.

## Running it

```sh
npm install
npm run dev            # then open http://localhost:8080/midatorg
npm run build          # production build (includes the CRM)
npx vitest run         # unit tests (src/midatorg/test)
npx eslint src/midatorg
```

Environment variables (already in `.env`):

```
VITE_MIDATORG_SUPABASE_URL=https://<project>.supabase.co
VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Backend setup, seed data, edge functions and the dashboard settings the owner must configure are
described in `supabase-midatorg/README.md`.

## Code map

```
MidatorgApp.tsx        root: theme scope, providers, routes
routes.tsx             route table with auth/admin guards
theme.css              design tokens scoped to .midatorg
lib/supabase.ts        Supabase client (separate project, own auth storage key)
lib/api/*              typed data access (one file per domain)
lib/queries.ts         react-query hooks and mutations
lib/auth.tsx           AuthProvider, useAuth, RequireAuth, RequireAdmin
lib/i18n/*             t() with is/en dictionaries per feature
lib/format.ts          ISK, dates, relative time, price deltas
lib/errors.ts          server error codes → translated messages
components/layout      AppShell, TopNav, Footer, MobileNav
components/common      badges, avatars, ratings, empty/error states, dialogs
components/market      home market cards, chips, search, sparkline
components/event       event header, stats, price chart, order book, buy dialog
components/forms       sell/want forms, event picker, proof upload
components/deals       deal stepper, guidance, actions, chat, rating
components/account     auth form, phone verify, profile, my lists
components/admin       admin tables and panels
pages/*                one file per route
test/*                 vitest suites
```

## Visual smoke tests

`e2e/midatorg/` contains a Playwright harness that serves the real seeded data from JSON fixtures
(so it runs even where the Supabase host is not reachable) and screenshots every page at 1440 and
390 px. See the comments at the top of `e2e/midatorg/smoke.mjs`.
