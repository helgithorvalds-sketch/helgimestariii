# Miðatorg backend (Supabase)

Miðatorg runs on its own Supabase project, separate from the CRM:

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

## Seed data (`seed/`)

`seed/seed.sql` loads demo venues, events, listings, requests, completed deals, ratings and price
history. `seed/test_users.sql` creates two password-login test accounts (see the file for the
emails and passwords). `seed/README.md` has the SQL that removes all of it — run that before launch.

## Edge functions (`functions/`)

| Function | Auth | Purpose |
|---|---|---|
| `mt-import-tix` | JWT + cron secret, or an admin | Reads tix.is category pages, imports up to 60 events per run (worker memory limit) |
| `mt-fetch-tix-event` | admin | Imports one tix.is event URL from the admin page |
| `mt-eid` | own (see below) | Electronic ID via OpenID Connect |

`mt-eid` is deployed from `functions/mt-eid/bundle.ts`, a single-file bundle of `index.ts`, `helpers.ts`
and the parts of `_shared/edge.ts` it uses. Edit the sources, regenerate the bundle, redeploy.
Helper tests: `node --experimental-strip-types --test supabase-midatorg/functions/mt-eid/helpers_test.mjs`.

## Settings you must configure in the Supabase dashboard

1. **Auth → URL configuration.** Site URL `https://helgimestariii.lovable.app/midatorg`. Add redirect URLs
   `https://helgimestariii.lovable.app/midatorg/**` and your own domain later. Magic links, email
   confirmation and password reset return there.
2. **Auth → Email.** For real users, set up SMTP (e.g. Resend) so emails do not hit Supabase's low
   built-in limit. While testing you can turn off "Confirm email".
3. **Auth → Phone.** Enable the phone provider with Twilio (or MessageBird/Vonage) if you want SMS
   verification. Until then the app shows a clear "not enabled yet" message.
4. **Auth → Leaked password protection.** Turn it on (security advisor recommendation).

## Making someone an admin

Before they sign up: add their email to the `admin_emails` setting (Admin → Stillingar, or SQL:
`update mt_settings set value = '["you@example.com"]' where key = 'admin_emails';`).
After signup: `update mt_profiles set role = 'admin' where id = '<user id>';`

## Rafræn skilríki (electronic ID)

Ísland.is login is only available to public bodies, so a private company uses the same electronic ID
through an identity provider. The integration is plain OpenID Connect (authorization code + PKCE) and
works with **Kenni** (kenni.is, no setup fee), **Auðkenni** directly, or **Signicat / Dokobit**.

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
   | `EID_APP_ORIGIN` | `https://helgimestariii.lovable.app` (or your domain) |
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

`/midatorg` opens on a map of Iceland (Leaflet + OpenStreetMap tiles). Positions come from
`mt_venues.lat/lng` (hand-placed for known venues in `0009`), else the town in the event's city or venue
name (`mt_places`). Events that match nothing are listed under "Staðsetning óþekkt". To place a new venue:
`update mt_venues set lat = 64.14, lng = -21.93, geocode_source = 'curated' where name = '…';`

OpenStreetMap's public tiles are fine for testing and low traffic. For production traffic, use a tile
provider with a key (e.g. MapTiler or Stadia) and set `VITE_MIDATORG_TILE_URL` and
`VITE_MIDATORG_TILE_ATTRIBUTION` in the app's environment.
