# Miðatorg

Miðar á tónleika og viðburði á Íslandi, manna á milli — aldrei yfir upprunalegu verði.

One codebase, three ways to use it:

| | Where | How it is built |
|---|---|---|
| **Website** | `https://midatorg.lovable.app` (Lovable project *Miðatorg*) | Lovable builds and hosts `npm run build` |
| **iPhone app** | App Store, bundle id `is.midatorg.app` | `npm run app:ios` → Xcode → App Store Connect |
| **Android app** | Google Play, package `is.midatorg.app` | `npm run app:android` → Android Studio → Play Console |

The apps are the website's build wrapped with [Capacitor](https://capacitorjs.com), plus phone-only
features: push notifications, the share sheet, deep links back from electronic ID. See
[docs/APP-STORE.md](docs/APP-STORE.md).

## Stack

Vite · React 18 · TypeScript · Tailwind · shadcn/ui · react-router · TanStack Query · Supabase
(own project `qiylxtybmlzvoadvbnca`) · Leaflet + OpenStreetMap · Capacitor 8.

## Run it

```sh
npm install
npm run dev          # http://localhost:8080
npm test             # unit tests (vitest)
npm run lint
npm run typecheck
npm run build        # production build in dist/
```

Visual smoke test with a mocked backend (Playwright + Chromium, screenshots in `e2e/midatorg/screenshots/`):

```sh
node e2e/midatorg/smoke.mjs --build
```

## Where things are

| Path | What |
|---|---|
| `src/pages/` | One file per route (`/`, `/kort`, `/vidburdir/:id`, `/selja`, `/vidskipti`, `/eg`, `/stjorn`, `/skilmalar`, `/personuvernd` …) |
| `src/components/` | Feature components (`market`, `map`, `event`, `forms`, `deals`, `account`, `admin`, `layout`) and `ui/` (shadcn) |
| `src/lib/` | Supabase client, API calls, react-query hooks, auth, i18n (`is` / `en`), SEO, phone-app glue |
| `src/content/legal.ts` | Terms and privacy policy (fill in the operator details before launch) |
| `supabase-midatorg/` | Database migrations, edge functions and the backend README |
| `ios/`, `android/`, `capacitor.config.ts`, `resources/` | Phone apps |
| `docs/` | Product spec, design notes, App Store guide |

## Before launch

1. Supabase Auth settings (Site URL, redirect URLs, SMTP, e-mail templates): `supabase-midatorg/README.md`.
2. Operator name, kennitala, address and e-mail in `src/content/legal.ts`, and a contact e-mail in
   `src/pages/AboutPage.tsx` (`CONTACT_EMAIL`).
3. Remove the demo data (`supabase-midatorg/seed/README.md`).
4. Electronic ID provider and push keys when ready (backend README).
