# VILD — product specification (v1)

VILD is an Icelandic loyalty platform for restaurant chains (first) and other sectors (later).
Guests pay full price. A share of the price comes back as **inneign** (credit, 1 kr = 1 kr) that is
spendable only at the chain that gave it. The chain gives up margin on a future visit instead of cash
today, and the guest has a reason to come back. The reference product is Hagar's Takk
(`docs/vild/research/takk.md`); the pitch is in `docs/vild/research/pitch-film-and-fagkaup.md`.

## 1. Principles

1. **Inneign, ekki afsláttur.** The word "afsláttur" does not appear in the product. A 50% discount on a
   3.000 kr. pizza costs the restaurant 1.500 kr. in cash; 1.500 kr. of inneign costs it the ingredients
   of the next pizza (≈ 30% margin → ≈ 450 kr.) and brings the guest back.
2. **One chain per sector.** Each sector (Veitingastaðir, Kaffihús, Eldsneyti, Fagvörur, …) has exactly
   one partner chain. Credit is a *pocket* per sector: "Hádegið · Lúna · 2.340 kr." Exclusivity is the
   sales argument to chains and keeps the credit a closed-loop instrument (legal, §7).
3. **Real krónur.** No invented currency. 1 kr. earned = 1 kr. spent. Credit never becomes cash, is
   never sold for cash, is non-transferable and expires 24 months after it was earned.
4. **The phone is the card.** Identification at the till is a wallet pass (Apple Wallet / Google Wallet)
   with a QR/Aztec code, then NFC tap on terminals that support it. Never kennitala at the till.
5. **Simple for the chain.** One number to set (the default percentage), optional exceptions per
   category/product, optional time-boxed campaigns. It is live in the app the moment it is saved.
6. **Icelandic first.** þú, `1.500 kr.`, `fös. 14. nóv.`, rafræn skilríki. English later.

## 2. Actors

- **Guest** (consumer app, iOS/Android via Capacitor, same code on the web).
- **Chain** (merchant portal: owner, manager, staff).
- **Cashier** (the chain's POS, or the till flow inside the portal / a phone when the POS cannot integrate).
- **VILD operator** (admin: onboard chains, settlements, support) — not built in v1 beyond SQL.

## 3. Core flows

### 3.1 Sign-up and login
Rafræn skilríki (OIDC through Kenni or Auðkenni) binds the account to a verified person once; daily
login uses the device session (and later passkeys). Phone-number + SMS code is the fallback and the
demo path. Onboarding: 4 slides → wallet pass offer → home.

### 3.2 Earning
1. Guest shows the VILD card (QR on the Kort tab or the wallet pass) before paying.
2. POS identifies the guest (scan → `vild-till /lookup`, or the POS webhook carries the token).
3. Guest pays full price with any tender.
4. POS posts the receipt (`vild-pos-webhook`) → `vild_record_purchase` computes credit per line with
   the chain's rules at the time of purchase, writes the ledger, answers the amounts for the receipt.
5. Push "Þú fékkst +1.495 kr. í inneign hjá Lúnu." The wallet pass balance updates.

### 3.3 Spending
Guest toggles "Nota inneign við næstu kaup" (default on) and shows the card. The whole available
balance is applied up to the purchase total; the rest is paid normally. No credit is earned on the
part paid with credit (same rule as Takk). The ledger writes `spend` then `earn` for the same receipt.

### 3.4 Rules (merchant)
`reward_rules`: scope merchant | category | product; `rate_pct` or `fixed_amount`; optional window
(weekdays, hours, date range). Resolution: product > category > merchant; inside a scope a time-boxed
rule beats an always-on one; then the newest. Implemented identically in `src/vild/data/seed.ts`
(`creditFor`) and `supabase-vild/migrations/0002_functions.sql` (`vild_credit_for`).

### 3.5 Expiry and settlement
Earn rows carry `expires_at = occurred_at + 24 months`; an hourly job writes `expire` rows FIFO.
Monthly settlement per chain: issued, redeemed, expired, outstanding, platform fee. The chain's
accountant books outstanding credit as a contract liability (IFRS 15 material right).

## 4. Surfaces

| Surface | Route | Built in |
|---|---|---|
| Marketing site | `/vild`, `/vild/fyrir-veitingastadi`, `/vild/um-vild`, `/vild/spurningar`, `/vild/skilmalar`, `/vild/personuvernd` | `src/vild/site` |
| Consumer app | `/vild/app/*` (Heim · Staðir · Kort · Yfirlit · Ég) | `src/vild/app` |
| Merchant portal | `/vild/fyrirtaeki/*` (Yfirlit · Inneign · Vörur · Herferðir · Staðir · Kassakerfi · Uppgjör · Teymi · Stillingar) | `src/vild/merchant` |
| Backend | Supabase project (Postgres, RLS, RPC, edge functions) | `supabase-vild/` |
| Native shell | Capacitor (iOS, Android) | `capacitor.config.ts`, `vite.vild.config.ts`, `docs/vild/NATIVE.md` |

The app is mounted at `/vild` inside this repository's CRM build so it previews on the Lovable URL;
`npm run build:vild` produces the standalone bundle at `/`.

## 5. Data model (summary; the migrations are the truth)

sectors · merchants (one per sector) · locations · products · reward_rules · offers · profiles ·
wallet_tokens · purchases · purchase_items · ledger (append-only, running `balance_after`) ·
pockets (view) · pos_connections · pos_events · merchant_users · settlements · eid_sessions ·
pass_registrations. Types: `src/vild/lib/types.ts`.

## 6. Non-functional

- Performance: first screen < 1 s on a mid-range phone over 4G; animate transform/opacity only;
  map lazy-loaded; images ≤ 150 KB.
- Accessibility: WCAG AA; 44 px targets; reduced motion honoured; `lang="is"`.
- Privacy: kennitala stored once, hashed for lookups, never shown to cashiers; purchase history only
  at partner chains; deletion in-app; retention per terms.
- Security: RLS everywhere; ledger writes only through security-definer RPCs; POS webhooks
  authenticated with per-connection API key + HMAC; wallet QR tokens valid 60 s; pass tokens revocable.

## 7. Legal position (see `docs/vild/research/tech-landscape.md` §E)

Per-chain, earned-only, non-cashable credit falls under the "limited network" exclusion of the
e-money act (17/2013 art. 2(a)) and the payment-services act (114/2021 art. 2 items 11–12). Above
EUR 1m of redemptions in 12 months per instrument, notify Seðlabanki (art. 38). A pooled cross-chain
balance or selling credit for cash would change this and need an EMI/bank partner. Get a bindandi álit
from Skatturinn on VAT timing (VAT on the money actually received at each sale) before launch.

## 8. Out of scope for v1

Pooled balances across chains, selling credit, in-app ordering/payment, English UI, games/events,
referrals. Each is a known follow-up in `docs/vild/ROADMAP.md`.
