# Miðatorg backend (Supabase)

Miðatorg runs on its own Supabase project:

| | |
|---|---|
| Project ref | `qiylxtybmlzvoadvbnca` (name `midatorg`, region eu-west-1) |
| API URL | `https://qiylxtybmlzvoadvbnca.supabase.co` |
| App env vars | `VITE_MIDATORG_SUPABASE_URL`, `VITE_MIDATORG_SUPABASE_PUBLISHABLE_KEY` (in the repo's `.env`) |

Everything below is already applied to that project. The files are the source of truth if you ever
need to rebuild it (Supabase SQL editor, or `supabase db push` with the CLI).

## Migrations (`migrations/`, applied in order)

| File | What it does |
|---|---|
| `0001_schema.sql` | Tables (`mt_*`), row level security, guard triggers, notification triggers, stats views |
| `0002_functions.sql` | RPCs: reserve, deal transitions, ratings, expiry, price snapshots, importer entry point; storage bucket; realtime; cron |
| `0003_market_view_avatars.sql` | `mt_events_market` view, avatar bucket |
| `0004_advisor_fixes.sql`, `0005_rpc_public_revoke.sql` | Function grants and `search_path` hardening |
| `0006_import_cron.sql` | pg_net + cron job that runs the tix.is importer every 6 hours |
| `0007_import_events_status_cast.sql` | Importer fix |
| `0008_security_fixes.sql` | Settings/profiles no longer world-readable, proof access rules, cron secret, manual-event limits, URL validation |
| `0009_venue_coordinates.sql` | Map: venue coordinates, `mt_places` (towns), `map_lat`/`map_lng` on `mt_events_market` |
| `0010_eid.sql` | Electronic ID: profile columns, `mt_eid_sessions`, `mt_eid_apply`, `eid_enabled` setting |
| `0011_popularity_standalone.sql` | tix.is signals (`tix_availability`, `tix_rank`, `mt_set_tix_signals`), `watchers` in the stats, notification links without `/midatorg`, importer every 3 hours |
| `0012_sms_switch.sql` | `sms_enabled` setting (phone verification hidden until an SMS provider exists) |
| `0013_push.sql` | Push notifications: `mt_push_tokens`, `mt_register_push_token`, trigger behind `push_enabled` |

## Seed data (`seed/`)

`seed/seed.sql` loads demo venues, events, listings, requests, completed deals, ratings and price
history. `seed/test_users.sql` creates two password-login test accounts (see the file for the
emails and passwords). `seed/README.md` has the SQL that removes all of it — run that before launch.

## Edge functions (`functions/`)

| Function | Auth | Purpose |
|---|---|---|
| `mt-import-tix` | JWT + cron secret, or an admin | Every 3 hours: reads the tix.is front page (order = popularity, "Uppselt" chips) and category pages, imports up to 60 event pages per run, never-seen events first |
| `mt-fetch-tix-event` | admin | Imports one tix.is event URL from the admin page |
| `mt-eid` | own (see below) | Electronic ID via OpenID Connect |
| `mt-sitemap` | public | XML sitemap of the public pages and every upcoming event (robots.txt points here) |
| `mt-push` | cron secret | Sends a notification to the owner's phones (APNs for iOS, FCM for Android) |

`mt-eid` is deployed from `functions/mt-eid/bundle.ts`, a single-file bundle of `index.ts`, `helpers.ts`
and the parts of `_shared/edge.ts` it uses. Edit the sources, regenerate the bundle, redeploy.
Helper tests: `node --experimental-strip-types --test supabase-midatorg/functions/mt-eid/helpers_test.mjs`.

## Settings you must configure in the Supabase dashboard

These are the causes of the login problems found on 28 Sept 2026 — the auth log showed every
confirmation link going back to `http://localhost:3000`, and Supabase's built-in mailer only delivers
to the project's own team members.

1. **Authentication → URL Configuration.**
   - Site URL: `https://midatorg.lovable.app` (or your own domain once it is connected).
   - Redirect URLs — add all of these:
     `https://midatorg.lovable.app/**`, `https://id-preview--ec969959-1e3b-44a5-b1cb-fead2da2d8b3.lovable.app/**`,
     `http://localhost:8080/**`, and later `https://<your-domain>/**`.
2. **Authentication → Emails → SMTP Settings.** Connect a real mail service, otherwise nobody but you
   gets the e-mails. Resend is simplest (free tier 3,000 e-mails a month): create an account, verify a
   domain you own, then enter host `smtp.resend.com`, port `465`, user `resend`, password = the API key,
   sender e.g. `midatorg@yourdomain.is`. Until then you can switch off **Confirm email** under
   Authentication → Sign In / Providers → Email so sign-ups work without an e-mail.
3. **Authentication → Emails → Templates.** Add the 6-digit code so people can sign in inside the phone
   app without the link opening a browser. In both **Confirm signup** and **Magic Link**, add a line such as
   `<p>Kóðinn þinn: <strong>{{ .Token }}</strong></p>`. The app has a "sláðu inn kóðann" field for it.
4. **Authentication → Sign In / Providers → Phone.** Only if you want SMS verification: connect Twilio
   (or MessageBird/Vonage), then turn on **Stjórnborð → Stillingar → Staðfesting síma með SMS**.
5. **Authentication → Attack Protection.** Turn on leaked password protection.

## Making someone an admin

Before they sign up: add their email to the `admin_emails` setting (Admin → Stillingar, or SQL:
`update mt_settings set value = '["you@example.com"]' where key = 'admin_emails';`).
After signup: `update mt_profiles set role = 'admin' where id = '<user id>';`

## Rafræn skilríki (electronic ID)

Ísland.is login is only available to public bodies, so a private company uses the same electronic ID
through an identity provider. The integration is plain OpenID Connect (authorization code + PKCE) and
works with **Kenni** (kenni.is), **Auðkenni** directly, or **Signicat / Dokobit**. The phone apps send
`app=1` and are brought back with `is.midatorg.app://app/eg?eid=…`.

1. Create an account with the provider and register an application:
   - Redirect URL: `https://qiylxtybmlzvoadvbnca.supabase.co/functions/v1/mt-eid/callback`
   - Ask for a scope/claim that returns the **kennitala** and the **name**.
2. In Supabase → **Edge Functions → Secrets**, add:

   | Secret | Value |
   |---|---|
   | `EID_ISSUER` | the issuer URL from the provider (its `/.well-known/openid-configuration` must load) |
   | `EID_CLIENT_ID` | client id |
   | `EID_CLIENT_SECRET` | client secret (leave out for a public client) |
   | `EID_REDIRECT_URL` | `https://qiylxtybmlzvoadvbnca.supabase.co/functions/v1/mt-eid/callback` |
   | `EID_APP_ORIGIN` | `https://midatorg.lovable.app` (or your domain) |
   | `EID_SCOPES` | optional; default `openid profile national_id` — use the provider's scope names |
   | `EID_ID_CLAIM` | optional; claim names to try for the kennitala, default `national_id,kennitala,ssn,nationalId` |
   | `EID_NAME_CLAIM` | optional; default `name` |

3. In the app: **Stjórnborð → Stillingar → Staðfesting með rafrænum skilríkjum** → on.
4. Test: on **Mín síða**, press "Staðfesta með rafrænum skilríkjum", sign in on your phone, and you
   come back with the "Staðfestur" badge (verification level `eid`).

What is stored: kennitala (unique, check digit validated, owner and admins only, never shown on public
profiles), the name from the provider, the time and the provider host. Tokens are never stored or logged.
Until the secrets exist, the function answers `EID_NOT_CONFIGURED` and the app shows "Væntanlegt".

## Map

`/` opens on a map of Iceland (Leaflet + OpenStreetMap tiles). Positions come from
`mt_venues.lat/lng` (hand-placed for known venues in `0009`), else the town in the event's city or venue
name (`mt_places`). Events that match nothing are listed under "Staðsetning óþekkt". To place a new venue:
`update mt_venues set lat = 64.14, lng = -21.93, geocode_source = 'curated' where name = '…';`

OpenStreetMap's public tiles are fine for testing and low traffic. For production traffic, use a tile
provider with a key (e.g. MapTiler or Stadia) and set `VITE_MIDATORG_TILE_URL` and
`VITE_MIDATORG_TILE_ATTRIBUTION` in the app's environment.

## Push notifications (phone apps)

Every row in `mt_notifications` (new tickets at your price, deal updates, messages) can also go to the
user's phone. It is off until the keys exist:

1. **Apple:** in the Apple Developer account → Certificates, IDs & Profiles → Keys, create a key with
   *Apple Push Notifications service*. Download the `.p8`. Secrets for `mt-push`: `APNS_KEY_ID`,
   `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (the file contents), optionally `APNS_BUNDLE_ID`
   (default `is.midatorg.app`) and `APNS_SANDBOX=true` for development builds.
2. **Android:** create a Firebase project, add an Android app `is.midatorg.app`, put its
   `google-services.json` in `android/app/`, and create a service account key (Project settings →
   Service accounts). Secret: `FCM_SERVICE_ACCOUNT` = the JSON on one line.
3. Turn on **Stjórnborð → Stillingar → Tilkynningar í síma (push)**.
