# VILD backend (Supabase)

Customers pay full price at a partner chain, earn credit ("inneign", 1 kr = 1 kr) by the chain's
rules and spend it only at that chain. This directory is the whole backend: Postgres schema with
row-level security, SQL functions (the ledger), Deno edge functions (POS webhook, cashier till,
electronic ID, wallet passes) and the demo seed. Nothing is applied yet — there is no VILD project
(the org is on the free tier with two active projects). Everything is written to be applied as-is.

```
                 ┌──────────────────────────────────────────────────────────────┐
                 │                        Supabase (eu-west-1)                   │
  consumer app   │  Auth (phone OTP, password)     Postgres                       │
  /vild/app ────▶│  PostgREST + RLS  ──────────▶  vild_* tables, views, RPCs     │
  merchant portal│                                 vild_ledger (append-only)     │
  /vild/fyrirtaeki                                 pg_cron: expiry, settlements │
                 │  Edge functions (Deno)                                         │
   POS / chain ─▶│  vild-pos-webhook ──┐                                          │
   middleware    │  vild-till ─────────┼──▶ vild_record_purchase (service role)   │
   cashier phone │  vild-eid  ◀────────┼──▶ Kenni / Auðkenni (OIDC + PKCE)        │
   Apple/Google ◀│  vild-wallet-pass ──┘    APNs push, .pkpass, Google save link  │
   Wallet        │  vild-noona-sync ─────▶ Noona HQ API (products)  [unverified]  │
                 └──────────────────────────────────────────────────────────────┘
```

## Layout

| Path | What |
|---|---|
| `migrations/0001_schema.sql` | Tables (`vild_*`), guard triggers, views, RLS, grants. Every table has a comment. |
| `migrations/0002_functions.sql` | Rule engine `vild_credit_for`, tokens, `vild_redeem_quote`, `vild_record_purchase`, expiry, stats, merchant RPCs, settlements, threshold report, realtime, cron, storage buckets. |
| `migrations/0003_eid.sql` | `vild_eid_sessions`, `vild_kennitala_valid`, `vild_eid_apply`. |
| `seed/` | Demo catalogue (mirrors `src/vild/data/seed.ts`), test-user instructions, cleanup. |
| `functions/` | Edge functions + `deno.json`. Each `index.ts` starts with its routes, auth and secrets. |
| `test/` | `local_db.sh` applies everything to a throw-away Postgres 16 cluster and runs `assertions.sql`. |
| `sql_lint.mjs` | Static checks on the SQL (balanced `$$`, parentheses, comments, RLS, prefix) + object listing. |

Frontend side: `src/vild/data/supabase.ts` (`SupabaseApi implements VildApi`),
`src/vild/data/database.types.ts`, and `VITE_VILD_DATA=supabase` in `src/vild/data/index.ts`.

## 1. Create the project

1. supabase.com → the org is on the free tier with two active projects. Either **pause one**
   (Project → Settings → General → Pause project) or upgrade the org to Pro. Then **New project**:
   name `vild`, region **West EU (Ireland) `eu-west-1`**, a strong database password (keep it, the
   CLI needs it).
2. Note the project ref, the API URL (`https://<ref>.supabase.co`) and the keys under Settings →
   API: the **publishable/anon** key goes into the app's `.env`
   (`VITE_VILD_SUPABASE_URL`, `VITE_VILD_SUPABASE_PUBLISHABLE_KEY`); the **service role** key is
   never put in the app — the edge functions get it injected automatically.
3. Enable the extensions the migrations use: Database → Extensions → `pg_cron`, `pg_net`
   (`pgcrypto` is on by default). The migrations skip the cron/realtime/storage blocks when these are
   missing, so the order does not matter, but enable them before `0002` to get the schedules.

## 2. Apply the migrations

Either the SQL editor (paste `0001`, run; `0002`, run; `0003`, run) or the CLI:

```sh
supabase login
supabase link --project-ref <ref>
# copy the files into the CLI's migration folder with timestamps, then push
mkdir -p supabase/migrations
cp supabase-vild/migrations/0001_schema.sql    supabase/migrations/20261023000001_vild_schema.sql
cp supabase-vild/migrations/0002_functions.sql supabase/migrations/20261023000002_vild_functions.sql
cp supabase-vild/migrations/0003_eid.sql       supabase/migrations/20261023000003_vild_eid.sql
supabase db push
```

(The repo's `supabase/` folder belongs to the CRM project `qkgwyewjpwsehuwnpcje`; link to the VILD
ref before pushing, or use a separate checkout. Do not push the CRM migrations to VILD.)

Then the seed: SQL editor → paste `seed/seed.sql` → run. Follow `seed/test_users.sql` for the demo
accounts. `seed/README.md` has the cleanup for launch.

Local dry run (no project needed, needs Postgres 16 binaries): `bash supabase-vild/test/local_db.sh`.

## 3. Deploy the edge functions

```sh
cd supabase-vild/functions
supabase functions deploy vild-pos-webhook --no-verify-jwt --project-ref <ref>
supabase functions deploy vild-wallet-pass --no-verify-jwt --project-ref <ref>
supabase functions deploy vild-eid         --no-verify-jwt --project-ref <ref>
supabase functions deploy vild-till        --project-ref <ref>
supabase functions deploy vild-noona-sync  --project-ref <ref>
```

Why `--no-verify-jwt` on three of them: the gateway otherwise rejects any request without a
Supabase JWT, and those callers have none — the POS (API key + HMAC instead), Apple's devices
(`Authorization: ApplePass <token>`), and the eID provider redirecting a bare browser to
`/callback`. Each of those functions authenticates on its own (see the header comment in its
`index.ts`). `vild-till` and `vild-noona-sync` are only called by signed-in users, so the gateway
check stays on. If you deploy from the Supabase dashboard instead, the per-function "Verify JWT"
switch is the same setting. The CLI reads `functions/deno.json` for the import map.

## 4. Secrets (Edge Functions → Secrets)

| Secret | Used by | Value |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | all | injected by the platform |
| `EID_ISSUER` | vild-eid | the OIDC issuer URL (Kenni: from the developer portal; `/.well-known/openid-configuration` must resolve) |
| `EID_CLIENT_ID`, `EID_CLIENT_SECRET` | vild-eid | app registration at the provider (secret optional for a public client) |
| `EID_REDIRECT_URL` | vild-eid | `https://<ref>.supabase.co/functions/v1/vild-eid/callback` — register it at the provider |
| `EID_APP_ORIGIN` | vild-eid, vild-wallet-pass | `https://helgimestariii.lovable.app` (or the production domain) |
| `EID_SCOPES`, `EID_ID_CLAIM`, `EID_NAME_CLAIM` | vild-eid | optional; defaults `openid profile national_id` / `national_id,kennitala,ssn,nationalId` / `name` |
| `PASS_TYPE_ID` | vild-wallet-pass | e.g. `pass.is.vild.card` (Apple Developer → Identifiers → Pass Type IDs) |
| `APPLE_TEAM_ID` | vild-wallet-pass | the 10-character team id |
| `PASS_CERT_PEM`, `PASS_KEY_PEM`, `PASS_KEY_PASSWORD` | vild-wallet-pass | the Pass Type ID certificate and its private key as PEM (`openssl pkcs12 -in Certificates.p12 -clcerts -nokeys` / `-nocerts`); password only if the key is encrypted |
| `WWDR_PEM` | vild-wallet-pass | Apple Worldwide Developer Relations G4 intermediate, PEM |
| `PASS_WEB_SERVICE_URL` | vild-wallet-pass | optional; default `${SUPABASE_URL}/functions/v1/vild-wallet-pass` |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_PEM` | vild-wallet-pass | APNs auth key (.p8) for pass update pushes; `APNS_SANDBOX=true` for the sandbox host |
| `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SA_JSON` | vild-wallet-pass | Google Wallet issuer id + service-account JSON; `PASS_ORIGINS` = comma list of app origins |
| `NOONA_*` | — | not read directly: Noona credentials live per connection in `vild_pos_connections.config` (`client_id`, `client_secret`, `company_id`, optional `base_url`), set through `vild_set_pos_connection` |

Multi-line PEMs can be pasted with literal `\n`; the functions unescape them.

## 5. Dashboard settings

- **Auth → Providers → Phone**: enable, Twilio (Verify or Messaging Service). Add a *test OTP*
  `+3546661234 → 123456` while developing so the demo number works without SMS.
- **Auth → Providers → Email**: on, "Confirm email" off for the merchant test accounts (or set up
  SMTP); merchant accounts are created by an admin, not self-service.
- **Auth → URL configuration**: Site URL `https://helgimestariii.lovable.app/vild`; redirect URLs
  `https://helgimestariii.lovable.app/vild/**` and the production domain.
- **Auth → Leaked password protection**: on.
- **Database → Extensions**: `pg_cron`, `pg_net`.
- **Storage**: the migration creates `vild-product-images` (public) and `vild-merchant-assets`
  (private); objects live under `<merchant_id>/…` and the policies key off that folder.

## 6. How a POS vendor integrates

The chain's owner creates a connection in the portal (RPC `vild_set_pos_connection`) and receives
**once** an API key `vk_…` and a webhook secret. The POS posts every identified receipt:

```sh
BODY='{"external_id":"R-2026-10-23-1042","location_id":"l_laugavegur","occurred_at":"2026-10-23T12:31:00Z",
       "receipt_no":"1042","customer":{"wallet_token":"VILD-7F3A-9Q2K"},
       "items":[{"product_id":"p_margherita","qty":1},{"sku":"COLA33","qty":2,"unit_price":490}],
       "total":3970,"tender":{"credit_requested":true}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')
curl -X POST "https://<ref>.supabase.co/functions/v1/vild-pos-webhook" \
  -H "content-type: application/json" \
  -H "x-vild-api-key: $API_KEY" \
  -H "x-vild-signature: sha256=$SIG" \
  --data-binary "$BODY"
# → {"purchase_id":"…","applied":500,"earned":1245,"balance_after":1245,"receipt_no":"1042","duplicate":false}
```

- `external_id` is the POS receipt id: a redelivery with the same body answers 200 `duplicate:true`
  with the original result; the same id with a different body is 409.
- `customer` is either the scanned token (`VILD-XXXX-XXXX` from the app, 60 s, one charge; or
  `VILDP-…` from the wallet pass, reusable) or a `vild_customer_id` the chain stored earlier.
- Items map by `product_id` (VILD id), `sku` (`vild_products.external_sku`) or free text + price.
  Credit is computed per line at `occurred_at` with the chain's rules; `applied` is the credit
  used, `earned` the new credit (on the money part only), `balance_after` the guest's new balance —
  print all three on the receipt.
- Signature: `HMAC-SHA256(secret, raw body)` hex, `sha256=` prefix (or `t=<unix>,v1=<hex>` over
  `<t>.<body>`, 5-minute tolerance). Invalid key or signature → 401, invalid receipt → 422.
- Noona HQ: deploy nothing extra; a connection with `vendor = 'noona'` (or `?vendor=noona`) routes
  through `functions/vild-pos-webhook/adapters/noona.ts`, whose field assumptions are listed in the
  file and are **unverified** until the Noona developer call. `vild-noona-sync` pulls the catalogue
  into `vild_products.external_sku` (same caveat).

## 7. The cashier scan path (no POS integration)

1. Guest opens **Kort**: the app calls `vild_issue_wallet_token` → `VILD-7F3A-9Q2K` as a QR
   (60 s, the app refreshes it every 45 s). The wallet pass shows the long-lived `VILDP-…` token.
2. Cashier (signed in to the merchant app as staff of that chain) scans it: `POST vild-till/lookup
   {token}` → first name + balance at this chain. Nothing else about the guest is returned.
3. `POST vild-till/charge {token, location_id, amount | items, use_credit}` → `vild_record_purchase`
   with `source = 'till'`; answer `{applied, earned, balance_after, to_pay}`. The QR token is
   consumed; a replay with the same `idempotency_key` returns the same result.
4. The app's realtime subscription on `vild_ledger` (RLS-filtered) updates the balance; the pass
   gets an APNs push from the sweep (below).

The in-app "Prófa kaup" demo uses `POST vild-till/demo` with the guest's own JWT. It only works
while `vild_settings.demo_purchases_enabled = true` — set it to `false` before launch.

## 8. The ledger, expiry and settlement

- `vild_ledger` is append-only (triggers reject update/delete). Balances are `sum(amount)` per
  (user, merchant) — `vild_pockets`. `balance_after` is written under an advisory lock per pocket.
- Order of operations in `vild_record_purchase` (same as the mock): spend first,
  `min(balance, total)` if the guest asked; then earn `round(credit_at_full_price × money_part / total)`.
  No credit on the part paid with credit (Takk terms §5).
- **Expiry rule**: credit expires 24 months after it was earned (`vild_settings.expiry_months`).
  Consumption is FIFO by expiry: every positive row is a lot, spends/expiries consume the
  soonest-expiring lots first (`vild_lots`). Hourly `vild_expire_credit` writes one `expire` row per
  pocket for lots past their date. The app shows the soonest-expiring lot ("rennur út …"); add a
  30-day warning there.
- **Monthly statement**: `vild_close_settlements()` runs on the 1st (cron) and writes one
  `vild_settlements` row per chain for the previous month — credit issued, redeemed, expired, and
  VILD's fee (`platform_fee_pct`). The chain books outstanding credit as a liability (IFRS 15
  material right). Ad-hoc, for any period:

  ```sql
  select merchant_id,
         sum(amount) filter (where amount > 0)              as issued,
         -sum(amount) filter (where kind = 'spend')         as redeemed,
         -sum(amount) filter (where kind = 'expire')        as expired,
         sum(amount)                                        as net_change
  from public.vild_ledger
  where created_at >= '2026-10-01' and created_at < '2026-11-01'
  group by merchant_id;
  -- outstanding liability right now: select merchant_id, sum(balance) from vild_pockets group by 1;
  ```

- **EUR 1m notification (Act 114/2021 art. 38)**: the limited-network exemption must be notified
  to Seðlabanki Íslands once payments with the instrument exceed EUR 1m in 12 months.
  `select * from vild_threshold_report()` (service role) lists redeemed volume per chain, in ISK and
  EUR at `vild_settings.eur_isk_rate`, with an `above_threshold` flag. Check it monthly; the credit
  stays outside e-money law only while it is earned (never sold), per-chain and non-cashable.

## 9. Wallet pass updates

A ledger insert bumps `vild_pass_secrets.pass_updated_at` (trigger). Apple devices learn about it
through an empty APNs push → `POST vild-wallet-pass/push-updates` sends one to every registration
behind. Schedule it every minute with pg_cron + pg_net once the project exists (needs the project
URL and the cron secret, which is why it is not in the migration):

```sql
select cron.schedule('vild-pass-push', '* * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/vild-wallet-pass/push-updates',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-vild-cron-secret', (select value #>> '{}' from public.vild_settings where key = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
$$);
```

Google Wallet objects are not updated after save in this version (the link carries the balance at
creation; the app is the live view). Until the Apple certificates exist, `GET /pass` answers
`503 PASS_NOT_CONFIGURED` and the app hides the button.

## 10. Security checklist

- RLS on every table; internal tables (`vild_settings`, `vild_wallet_tokens`, `vild_pass_*`,
  `vild_pos_connections`, `vild_pos_events`, `vild_eid_sessions`) have no policies and no grants
  for `anon`/`authenticated`. `test/assertions.sql` checks a consumer cannot read another user,
  write the ledger, issue a token for someone else or call the internal RPCs.
- The kennitala never leaves Postgres: not in any view, not at the till (`vild_resolve_wallet_token`
  returns a first name and balances), not in logs (`log()` redacts), not in the pass. It is written
  only by `vild_eid_apply` after jose verified the id_token (issuer, audience, signature, nonce).
- Tokens: the QR token is random (32 chars alphabet, 8 chars), 60 s, one charge; the pass token is
  a per-user secret rotated on demand; OIDC state is single-use with PKCE S256. None derive from
  the user id or phone.
- Ledger append-only; balance_after under an advisory lock; purchases idempotent on
  (merchant, external_id); webhook events idempotent on (connection, external_id) with a body hash.
- Webhook auth = API key (stored hashed) + HMAC over the raw body; the secret is stored in clear
  because an HMAC cannot be checked against a hash — the table is service-role only.
- `vild_is_service_role()` trusts only the JWT claim, never `current_user`, so security-definer
  guard triggers cannot be bypassed from inside other definer functions.
- Guard triggers restore the `vild.internal` flag they set, so an auth trigger cannot leave a
  transaction in "internal" mode.
- Merchant users write only their own chain's rules/venues/offers/team (`vild_is_merchant_user`,
  owner > manager > staff); the last owner cannot be removed; roles change only by an owner.
- Before launch: `demo_purchases_enabled = false`, remove the seed (`seed/README.md`), rotate
  `cron_secret`, run Supabase's security advisor.
