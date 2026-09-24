# Miðatorg — product & architecture spec (v1)

Miðatorg is a peer-to-peer ticket marketplace for Iceland. People list tickets they cannot use, other people
find them, reserve them, pay the seller directly (Aur / bank transfer), receive the ticket, and both sides rate
each other. The app never holds money in v1. Events come from tix.is (importer) plus manual additions.

Working name: **Miðatorg**. Route prefix: **`/midatorg`**. UI language: Icelandic first, English second.

## 1. Product principles

1. **Face value cap.** Asking price ≤ miðaverð (face value). Enforced in the database. Under tix.is terms,
   tickets resold above face value are cancelled; we keep people safe by never allowing it.
2. **No escrow in v1.** We connect people; payment happens between them. The deal room makes the steps explicit
   and keeps a record. Free for everyone; paid features (featured listings, priority alerts) come later.
3. **Trust ladder.** Email account → phone verified ("Staðfestur sími") → electronic ID ("Rafræn skilríki",
   later via Kenni/Auðkenni; admins can set it manually now). Ratings after completed deals. Report button
   everywhere a user or listing is shown. Bans.
4. **No dark patterns.** No fake urgency counters, no countdowns except the real reservation timer, no
   "41 people viewing". Demand is shown as real counts (tickets available, people looking, sold).
5. **Simple, light look.** White background, near-black text, one blue accent; cards like tix.is with the
   event image on top; plain lists for "Miðar til sölu" and "Óskað eftir". Spec in `docs/midatorg-design/DESIGN-v2.md`
   (the earlier dark direction in `DESIGN.md` is superseded but its component inventory and a11y rules still apply).

## 2. Placement in this repository

The repository also contains an unrelated CRM (Svif). Miðatorg is a self-contained module so it can be lifted
into its own repo later by copying one folder plus `supabase-midatorg/`.

```
src/midatorg/                 # the whole app (only imports @/components/ui/* and @/lib/utils from outside)
  MidatorgApp.tsx             # root: theme wrapper <div class="midatorg dark">, fonts, providers, <Routes>
  routes.tsx                  # route table (React.lazy pages)
  theme.css                   # scoped shadcn tokens from DESIGN.md (.midatorg { --background: … })
  lib/…                       # supabase client, types, api, queries, auth, i18n, format, errors
  components/…                # layout, common, market, event, forms, deals, account, admin
  pages/…                     # one file per route
  test/…                      # vitest
supabase-midatorg/            # migrations, seed, edge functions, README (separate Supabase project)
docs/midatorg-spec.md         # this file
```

`src/App.tsx` gets exactly one new line above the catch-all: `<Route path="/midatorg/*" element={<MidatorgApp />} />`
(lazy-loaded). Nothing else in the CRM changes.

Backend: its own Supabase project (env `VITE_MIDATORG_SUPABASE_URL`, `VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY`).
Client in `lib/supabase.ts` with `auth.storageKey = 'midatorg-auth'` so it never collides with the CRM client.

Theme: Tailwind `darkMode: ["class"]` is already on. The app root is `<div className="midatorg dark min-h-screen bg-background text-foreground">`
and `theme.css` redefines the shadcn CSS variables inside `.midatorg`. shadcn components then render dark
automatically. Fonts from DESIGN.md are injected with a `<link>` in `MidatorgApp` (do not edit `index.html`).

## 3. Data model (Supabase, all objects prefixed `mt_`)

Migrations: `supabase-midatorg/migrations/0001_schema.sql`, `0002_functions.sql` (read them — they are the truth).
Generated types: `src/midatorg/lib/database.types.ts`.

Tables: `mt_settings`, `mt_profiles`, `mt_venues`, `mt_events`, `mt_listings`, `mt_listing_proofs`,
`mt_requests`, `mt_deals`, `mt_messages`, `mt_ratings`, `mt_reports`, `mt_alerts`, `mt_notifications`,
`mt_price_snapshots`.
Views: `mt_event_stats` (aggregates per event), `mt_public_profiles` (profile + rating avg/count + sales/purchases),
`mt_events_market` (= mt_events columns + mt_event_stats columns; use this for lists and event pages).
RPCs (call with `supabase.rpc`):
- `mt_reserve_listing(p_listing_id uuid, p_quantity int) → mt_deals row`
- `mt_deal_transition(p_deal_id uuid, p_action text, p_reason text?) → mt_deals row`
  actions: `mark_paid` (buyer), `confirm_payment` (seller), `confirm_received` (buyer), `cancel` (either),
  `dispute` (either), `admin_complete`, `admin_cancel` (admin).
- `mt_rate_deal(p_deal_id uuid, p_score int, p_comment text?) → mt_ratings row`
- `mt_admin_set_ban(p_user uuid, p_banned bool, p_reason text?)`, `mt_admin_set_verification(p_user uuid, p_level)`
Storage: private bucket `mt-ticket-proofs` (path `<uid>/<listingId>.<ext>`), public bucket `mt-avatars` (path `<uid>/avatar.<ext>`).
Realtime: `mt_messages`, `mt_deals`, `mt_notifications` are in the publication (postgres_changes, RLS applies).

Direct client writes allowed by RLS + guard triggers:
- `mt_events` insert (manual event; trigger forces source='manual', created_by=me, status='upcoming').
- `mt_listings` insert (seller_id=me; trigger sets quantity_remaining/status/expires_at) and update of
  `asking_price, ticket_type, seat_info, notes, split_allowed` while active, or `status='cancelled'` when no open deals.
- `mt_listing_proofs` insert/delete (own), `mt_requests` insert/update (own; cancel only), `mt_messages` insert,
  `mt_reports` insert, `mt_alerts` all (own), `mt_notifications` update/delete (own), `mt_profiles` update
  (`display_name, avatar_url, bio` only).
Everything else goes through RPCs.

Error codes (raised as exception messages; PostgREST returns them in `error.message`): AUTH_REQUIRED, USER_BANNED,
NOT_OWNER, PHONE_REQUIRED, EVENT_NOT_FOUND, EVENT_NOT_UPCOMING, EVENT_IN_PAST, TOO_MANY_TICKETS, TOO_MANY_LISTINGS,
TOO_MANY_REQUESTS, REQUEST_EXISTS, IMMUTABLE_COLUMN, INVALID_STATUS_CHANGE, OPEN_DEALS, LISTING_NOT_ACTIVE,
LISTING_NOT_FOUND, LISTING_EXPIRED, OWN_LISTING, INVALID_QUANTITY, NOT_ENOUGH_TICKETS, SPLIT_NOT_ALLOWED,
ALREADY_RESERVED, TOO_MANY_RESERVATIONS, DEAL_NOT_FOUND, NOT_PARTY, NOT_ALLOWED, INVALID_TRANSITION,
RESERVATION_EXPIRED, UNKNOWN_ACTION, INVALID_SCORE, DEAL_NOT_COMPLETED, ALREADY_RATED.
Postgres codes: `23505` unique violation (duplicate proof file → DUPLICATE_PROOF; duplicate alert → ALERT_EXISTS),
`23514` check violation (e.g. price above face value → PRICE_ABOVE_FACE_VALUE). `lib/errors.ts` maps all of these
to i18n keys `errors.<CODE>` with a generic fallback.

## 4. Deal flow (no escrow)

```
reserved ──buyer: mark_paid──▶ paid_claimed ──seller: confirm_payment──▶ ticket_sent ──buyer: confirm_received──▶ completed
   │                              │                                          │
   └── cancel (either) ───────────┴──▶ cancelled        dispute (either) ◀───┴──▶ disputed ──admin──▶ completed | cancelled
   └── reservation timer runs out ──▶ expired (tickets go back on sale)
```

Reservation timer: `mt_settings.reservation_minutes` (30). The deal room shows the real remaining time.
Seller "confirm_payment" also means "I have sent the ticket": from that moment the buyer can download the seller's
uploaded proof file (if any) from the deal room, and the seller is reminded to transfer the ticket on tix.is
(name change via info@tix.is) or forward the PDF. Buyer confirms receipt → completed → both can rate once.

Stepper labels (is): 1 "Tekið frá" · 2 "Greitt" · 3 "Miðar sendir" · 4 "Lokið". Terminal badges: "Hætt við", "Rann út", "Ágreiningur".

Per-state guidance shown in the deal room (is):
- reserved, buyer: "Greiddu seljanda {upphæð} með Aur eða millifærslu og merktu svo „Ég hef greitt“." Seller: "Bíddu eftir greiðslu frá kaupanda. Þú getur spjallað hér að neðan."
- paid_claimed, seller: "Kaupandi segist hafa greitt {upphæð}. Athugaðu bankann/Aur, sendu miðana og staðfestu." Buyer: "Bíð eftir að seljandi staðfesti greiðslu og sendi miðana."
- ticket_sent, buyer: "Seljandi hefur sent miðana. Staðfestu móttöku þegar þú ert með þá." Seller: "Bíð eftir að kaupandi staðfesti móttöku."
- completed: "Viðskiptum lokið. Gefðu einkunn."
Always visible: amount = quantity × price_per_ticket, counterpart profile (name, rating, verification), "Tilkynna" link.

## 5. Routes & screens (all under `/midatorg`)

| Path | Page file | Auth | Content |
|---|---|---|---|
| `/` | `HomePage` | no | Market: search, category chips, sort (Dagsetning · Eftirspurn · Lægsta verð), trending strip, market card grid with infinite "Sýna fleiri", empty/loading states. Query params `q`, `flokkur`, `rada`. |
| `/vidburdir/:eventId` | `EventPage` | no (actions prompt login) | Hero image, title block, summary strip (Miðaverð · Lægsta verð · Til sölu · Óskað eftir), "Miðar til sölu" and "Óskað eftir" lists, CTAs (Kaupa miða · Selja miða · Ég vil kaupa · Láta mig vita), collapsible "Verðþróun" chart, how-it-works strip, tix.is link, report event link. Buy dialog: choose quantity → `mt_reserve_listing` → navigate to deal room. |
| `/selja` | `SellPage` | yes | Sell form. `?event=<id>` preselects. Event picker (search existing; "Bæta við viðburði" inline form for a manual event), quantity, ticket type, seat info, face value, asking price (validated ≤ face value with live delta), split allowed, notes, proof upload (PDF/PNG/JPG ≤10MB, sha256 in browser, duplicate detection). Success → event page with toast. |
| `/oska` | `WantPage` | yes | Want form: event picker, quantity, max price (optional), notes. Success → event page. |
| `/vidskipti` | `DealsPage` | yes | My deals, tabs Virk · Lokið · Öll, as buyer and as seller, with status badges and timers. |
| `/vidskipti/:dealId` | `DealRoomPage` | yes (party or admin) | Stepper, guidance text, amount, counterpart card, action buttons per role/state, cancel with reason, dispute with reason, proof download (buyer from ticket_sent), realtime chat, rating dialog after completion, report dialog. |
| `/eg` | `MyPage` | yes | Tabs: Yfirlit (profile form, verification card: email ✓, phone verify via SMS OTP, rafræn skilríki "væntanlegt"), Mínar sölur (listings with edit price / cancel / upload proof), Óskir (requests, cancel), Vaktanir (alerts with max price, remove), Einkunnir (ratings received). `?reset=1` opens set-new-password. |
| `/notendur/:userId` | `PublicProfilePage` | no | Name, avatar, verification badge, member since, rating avg/count, sales/purchases counts, ratings list (comments), active listings by this user, report user button. |
| `/innskra` | `LoginPage` | no | Tabs Innskrá · Nýskrá; email+password; "Senda innskráningartengil" (magic link); "Gleymt lykilorð". `?next=` redirect. Signup asks display name. |
| `/tilkynningar` | `NotificationsPage` | yes | Full list, mark all read; the TopNav bell shows unread count + dropdown (realtime). |
| `/um` | `AboutPage` | no | How it works, rules (face value cap, no escrow, verification), safety tips, contact, tix.is note. |
| `/stjorn` | `AdminPage` | admin | Tabs: Tilkynningar (reports: open/resolve/dismiss, jump to listing/user/deal), Notendur (search, ban/unban with reason, set verification level), Viðburðir (list/edit/delete, "Flytja inn frá tix.is" URL box → edge function `mt-fetch-tix-event`, "Keyra innflutning" → `mt-import-tix`), Ágreiningur (disputed deals with admin_complete/admin_cancel), Stillingar (mt_settings editor). |
| `*` | `NotFoundPage` | no | |

Guards: `RequireAuth` (redirects to `/midatorg/innskra?next=…`), `RequireAdmin`. Banned users see a banner and cannot list/request/message/reserve (server enforces; UI explains).

## 6. Shared building blocks (foundation)

`lib/supabase.ts` — `export const supabase = createClient<Database>(url, key, { auth: { storageKey: 'midatorg-auth', persistSession: true, autoRefreshToken: true } })`.

`lib/types.ts` — row aliases from `database.types.ts`: `Profile`, `PublicProfile`, `Venue`, `EventRow`, `MarketEvent` (row of `mt_events_market`),
`EventStats`, `Listing`, `ListingProof`, `TicketRequest`, `Deal`, `Message`, `Rating`, `Report`, `Alert`, `Notification`,
`PriceSnapshot`, enum unions (`DealStatus`, `ListingStatus`, `EventCategory`, `VerificationLevel`, …), and
`ListingWithSeller = Listing & { seller: PublicProfile }`, `RequestWithBuyer`, `DealWithContext = Deal & { event: EventRow; buyer: PublicProfile; seller: PublicProfile; listing: Listing }`.

`lib/format.ts` — `formatISK(n)` → "8.900 kr.", `formatDate(iso)` → "fös. 14. nóv.", `formatDateTime(iso)` → "fös. 14. nóv. · 20:00",
`formatRelative(iso)` → "eftir 3 daga" / "fyrir 2 klst.", `formatCountdown(msLeft)` → "24:59", `priceDelta(asking, face)` →
`{ pct: -10, kind: 'below' | 'at' }` and `formatDelta` → "−10% undir miðaverði" / "á miðaverði". date-fns with the `is` locale; en locale when English.

`lib/errors.ts` — `parseApiError(err): { code: string; message: string }` (see §3) and `useErrorToast()`.

`lib/auth.tsx` — `AuthProvider`, `useAuth()` → `{ session, user, profile, isAdmin, loading, signIn, signUp, signOut, sendMagicLink, resetPassword, updatePassword, startPhoneVerification(phone), verifyPhone(token), refreshProfile }`; `RequireAuth`, `RequireAdmin`.

`lib/i18n/` — `I18nProvider`, `useT()` → `t('home.title')`, `t('deal.amount', { amount })`, `useLocale()` → `['is'|'en', setLocale]`
persisted in localStorage `midatorg-locale`. Dictionaries per feature in `lib/i18n/dict/{common,home,event,forms,deals,account,admin,errors}.ts`,
each `export default { is: {...}, en: {...} }` with flat dotted keys; `index.tsx` merges them. **Each feature agent owns its own dict file.**

`lib/api/*.ts` — thin typed wrappers (throw on error):
- `events.ts`: `listMarketEvents({ q?, category?, sort?: 'date'|'demand'|'price', status?: 'upcoming', limit?, offset? })`,
  `getMarketEvent(id)`, `searchEvents(q, limit)`, `createManualEvent(input)`, `listPriceSnapshots(eventId, days)`,
  `listCompletedDealPrices(eventId)` (from `mt_event_stats` last_sold only; deals are private), `listVenues()`.
- `listings.ts`: `listEventListings(eventId)` → `ListingWithSeller[]` (two queries: listings, then `mt_public_profiles in (…)`),
  `createListing(input)`, `updateListing(id, patch)`, `cancelListing(id)`, `listMyListings()`, `listUserListings(userId)`,
  `uploadProof(listingId, file)` (sha256 via `crypto.subtle`, upload `<uid>/<listingId>.<ext>`, insert proof row; on 23505 → DUPLICATE_PROOF and remove the uploaded object),
  `getProofSignedUrl(listingId)`, `getMyProof(listingId)`.
- `requests.ts`: `listEventRequests(eventId)` → `RequestWithBuyer[]`, `createRequest`, `updateRequest`, `cancelRequest`, `listMyRequests()`.
- `deals.ts`: `reserveListing(listingId, qty)`, `transitionDeal(dealId, action, reason?)`, `listMyDeals()` → `DealWithContext[]`,
  `getDeal(id)` → `DealWithContext`, `subscribeDeal(id, onChange)` → unsubscribe fn.
- `messages.ts`: `listMessages(dealId)`, `sendMessage(dealId, body)`, `subscribeMessages(dealId, onInsert)`.
- `ratings.ts`: `rateDeal(dealId, score, comment?)`, `listRatingsForUser(userId)` (with rater public profile), `getMyRatingForDeal(dealId)`.
- `profiles.ts`: `getMyProfile()`, `updateMyProfile(patch)`, `getPublicProfile(id)`, `uploadAvatar(file)`.
- `alerts.ts`: `listMyAlerts()`, `upsertAlert(eventId, maxPrice|null)`, `removeAlert(eventId)`.
- `notifications.ts`: `listNotifications(limit)`, `markRead(id)`, `markAllRead()`, `subscribeNotifications(onInsert)`, `unreadCount()`.
- `reports.ts`: `createReport(input)`.
- `admin.ts`: `listReports(status)`, `resolveReport(id, status)`, `searchUsers(q)`, `setBan`, `setVerification`, `listAllEvents(q)`,
  `updateEvent(id, patch)`, `deleteEvent(id)`, `fetchTixEvent(url)` (functions.invoke 'mt-fetch-tix-event'), `runTixImport()` (functions.invoke 'mt-import-tix'),
  `listDisputes()`, `getSettings()`, `setSetting(key, value)`.

`lib/queries.ts` — react-query hooks over the api with stable keys: `['mt','events',params]`, `['mt','event',id]`, `['mt','listings',eventId]`,
`['mt','requests',eventId]`, `['mt','deals']`, `['mt','deal',id]`, `['mt','messages',dealId]`, `['mt','me']`, `['mt','notifications']`, … plus mutation hooks that invalidate the right keys.

Layout: `components/layout/AppShell` (TopNav + `<Outlet/>` + Footer + MobileNav), `TopNav` (wordmark, search, nav links, Selja miða, bell with `NotificationsMenu`, avatar menu, locale toggle),
`Footer`, `MobileNav` (bottom bar ≤ md: Markaður · Selja · Viðskipti · Ég).
Common: `VerifiedBadge(level)`, `RatingStars(value, count?)`, `UserAvatar(profile, size)`, `PriceDelta(asking, face)`, `CategoryBadge`, `EmptyState(icon,title,body,action?)`,
`PageSkeleton`, `ErrorState(error, retry)`, `ConfirmDialog`, `ReportDialog` (used by event, deal, profile), `LocaleToggle`, `Countdown(until)`.

## 7. Feature ownership (parallel build — each agent only creates/edits files it owns)

| Agent | Owns | Consumes |
|---|---|---|
| home | `pages/HomePage.tsx`, `components/market/*` (MarketCard, MarketGrid, CategoryChips, SortMenu), `i18n/dict/home.ts`, `test/home.test.tsx` | foundation |
| event | `pages/EventPage.tsx`, `components/event/*` (EventHeader, StatsRow, StatTile, PriceChart, OrderBook, SellRow, WantRow, BuyDialog, AlertButton, HowItWorks), `i18n/dict/event.ts`, `test/event.test.tsx` | foundation |
| forms | `pages/SellPage.tsx`, `pages/WantPage.tsx`, `components/forms/*` (EventPicker, ManualEventForm, ProofUpload, PriceInput, QuantityInput, ListingForm, RequestForm), `i18n/dict/forms.ts`, `test/forms.test.tsx` | foundation |
| deals | `pages/DealsPage.tsx`, `pages/DealRoomPage.tsx`, `components/deals/*` (DealCard, DealStepper, DealGuidance, DealActions, DealChat, RatingDialog, ProofDownload), `i18n/dict/deals.ts`, `test/deals.test.tsx` | foundation |
| account | `pages/LoginPage.tsx`, `pages/MyPage.tsx`, `pages/PublicProfilePage.tsx`, `components/account/*` (AuthForm, PhoneVerifyCard, ProfileForm, VerificationCard, MyListingsList, MyRequestsList, MyAlertsList, RatingsList), `i18n/dict/account.ts`, `test/account.test.tsx` | foundation, `components/market/MarketCard` |
| admin | `pages/AdminPage.tsx`, `pages/AboutPage.tsx`, `pages/NotificationsPage.tsx`, `components/admin/*` (ReportsTable, UsersTable, EventsTable, DisputesTable, ImportPanel, SettingsPanel), `i18n/dict/admin.ts`, `test/admin.test.tsx` | foundation |
| backend-functions | `supabase-midatorg/functions/mt-import-tix/*`, `supabase-midatorg/functions/mt-fetch-tix-event/*`, `supabase-midatorg/README.md`, cron SQL for the importer | migrations |

`MarketCard` props contract: `({ event: MarketEvent, sparkline?: number[], compact?: boolean }) => JSX` (the sparkline prop is accepted for compatibility and ignored in the light design).
`ReportDialog` props (foundation): `({ open, onOpenChange, target: { userId?: string; listingId?: string; dealId?: string }, contextLabel?: string })`.

## 8. Conventions

- TypeScript strict, no `any` in new code. React 18, react-router v6, react-query v5, react-hook-form + zod for forms, shadcn/ui components from `@/components/ui/*`, lucide-react icons only (no emoji), Recharts for charts, date-fns for dates, sonner `toast` for feedback.
- All user-visible strings through `t()`; both `is` and `en` provided. Icelandic copy is the primary and must read naturally (þ/ð/æ/ö, proper declension).
- Every list has loading (skeleton), empty (EmptyState with a helpful action) and error (ErrorState with retry) states.
- Mobile first: works at 390px; cards stack; order book becomes tabs; sticky bottom CTA on event page; tap targets ≥ 44px.
- Accessibility: real buttons/links/inputs with labels, focus rings, aria-labels on icon buttons, colour never the only signal.
- Prices always via `formatISK`. Dates via `formatDate*`. Never hand-format.
- Never fabricate numbers. If stats are null show "—".
- Keep the CRM untouched. Do not edit files outside `src/midatorg/`, `docs/`, `supabase-midatorg/`, `e2e/midatorg/` and the single route line in `src/App.tsx` (foundation only).
- Run `npx tsc -p tsconfig.app.json --noEmit` and `npx vitest run` before finishing; ESLint errors that already exist in the CRM are not yours, but new files must be lint-clean (`npx eslint src/midatorg`).

## 9. Backend functions (Deno, deployed with the Supabase MCP tool)

- `mt-import-tix` (verify_jwt true; callable with the anon key by cron or by an admin from the UI): walks tix.is category pages
  (`https://tix.is/is/category/{music,theater,sports,festival,courses}`), collects `/is/event/<id>/` links, fetches each event page
  (cap 60 per run, skip ids already imported unless older than 24h), parses schema.org JSON-LD `Event` (name, startDate, endDate,
  location.name/address, image, offers.price/lowPrice/highPrice, url, eventStatus) with og: tag fallbacks, maps category
  (music→tonleikar, theater→leikhus, sports→ithrottir, festival→hatidir, courses→annad), and calls `mt_import_events(jsonb)` with the service role.
  Returns `{ scanned, inserted, updated, errors: [...] }`. Logs are structured, never dump HTML.
- `mt-fetch-tix-event` (verify_jwt true; admin only, checked via the caller's profile): body `{ url }`, only `tix.is` hosts,
  parses one event page the same way, imports it, returns `{ eventId }`.
- Cron: `mt-import-tix` runs every 6 hours via pg_cron + pg_net, posting to the function with the anon key **and** the `x-mt-cron-secret` header read from `mt_settings.cron_secret` (migration 0008); the function rejects anonymous calls without the matching secret. Admins trigger it from the admin page with their own JWT.

Note: the build sandbox cannot reach tix.is, so the parser is written defensively and verified by unit tests on fixture HTML; a real run is triggered from the admin page once deployed.

## 10. Testing

- vitest: `lib/format`, `lib/errors`, `priceDelta`, form validation schemas, MarketCard/StatTile/OrderBook rendering with fixtures, DealStepper state mapping, i18n key parity (every `is` key exists in `en` and vice versa).
- Playwright E2E (`e2e/midatorg/*.spec.ts`, run against `vite preview` + the live Supabase project with two test users created by SQL): sign in, browse, create listing, create request, reserve, chat, mark paid, confirm payment, confirm received, rate; admin resolves a report. Screenshots saved to `e2e/midatorg/screenshots/`.
