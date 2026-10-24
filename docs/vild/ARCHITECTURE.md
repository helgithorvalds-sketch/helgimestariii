# VILD — architecture: POS, wallet, electronic ID, money

This is the synthesis of `docs/vild/research/tech-landscape.md` into decisions. Every decision names
its fallback.

```
          ┌──────────────┐  OIDC (Kenni / Auðkenni)   ┌──────────────┐
          │  Guest app   │◄──────────────────────────►│  eID provider │
          │ (Capacitor)  │                            └──────────────┘
          └──────┬───────┘
      QR / NFC   │  Supabase JS (RLS)            APNs / FCM pushes, pass updates
                 ▼                                         ▲
┌────────────┐  ┌──────────────────────────────────────────┴──┐   ┌─────────────────┐
│ Chain POS  │─►│  Supabase: Postgres + RLS + RPC + functions   │◄──│ Merchant portal │
│ (Noona …)  │  │  vild-pos-webhook · vild-till · vild-eid      │   │ (web)           │
└────────────┘  │  vild-wallet-pass · vild-noona-sync           │   └─────────────────┘
                └───────────────────────────────────────────────┘
```

## 1. Identifying the guest at the till

| Phase | Mechanism | Needs | Status |
|---|---|---|---|
| 1 | **QR / Aztec on the Kort tab and in a wallet pass** (`storeCard`, live balance, Google Wallet loyalty object). Cashier scans with the POS's 2D scanner or the portal's till flow. | Pass Type ID certificate; Google Wallet issuer account. No Apple approval. | Built (functions + app), certs pending |
| 2 | **POS integration**: receipt flows automatically; voucher/credit validated by API. Noona HQ first (OAuth app + webhooks + credit wallets), then Upsell/Resto/dk/LS by partnership. | Vendor agreements | Generic webhook + Noona adapter built; vendor confirmation pending |
| 3 | **NFC tap** (Apple VAS + Google Smart Tap) via a certified pass provider (PassEntry, PassKit) on VAS-capable terminals (Straumur/Adyen is the best bet). | Provider contract, terminal + POS support | Not built; design allows it (pass serial = customer id) |

Card-linked offers (Visa/Fidel) and open banking (PSD2 AIS) are **not** used: no Icelandic coverage,
licensing burden, and a Persónuvernd risk out of proportion for a loyalty app.

## 2. The POS contract (generic receipt)

`POST /functions/v1/vild-pos-webhook` with `x-vild-api-key` and `x-vild-signature` (HMAC-SHA256 of
the raw body with the connection secret). Body:

```json
{
  "external_id": "LUNA-LAUG-2026-10-23-000421",
  "location_id": "l_laugavegur",
  "occurred_at": "2026-10-23T12:41:10Z",
  "customer": { "wallet_token": "VILD-7F3A-Q1ZK" },
  "items": [{ "sku": "p_margherita", "name": "Margherita", "qty": 1, "unit_price": 2990 }],
  "total": 2990,
  "tender": { "credit_requested": true }
}
```

Response: `{ applied, to_pay, earned, balance_after }` for the receipt. Idempotent on
`(connection, external_id)`. Adapters map vendor payloads to this shape (`adapters/noona.ts`).

## 3. Electronic ID

OpenID Connect authorization code + PKCE through **Kenni** (passkeys for repeat login, no Auðkenni
setup fee) or Auðkenni directly (108.000 kr. setup, 17.000 kr./month, ~10 kr. per authentication).
The edge function `vild-eid` holds the client secret, verifies the id_token with the provider's JWKS,
and stores kennitala once (unique, check digit validated, hashed for lookups). Ísland.is login is not
available to private companies. Authenticate with eID once per device, not per session.

## 4. Wallet passes

- Apple: `vild-wallet-pass` builds and signs a `.pkpass` (storeCard: holder, balance per pocket, QR),
  implements the pass web service (register/unregister/updates/log) and pushes empty APNs
  notifications on ledger changes so the balance on the pass stays live.
- Google: a loyalty class/object and a signed "Save to Google Wallet" JWT.
- The pass barcode carries a per-user pass token (revocable); the Kort tab shows a 60-second
  rotating token. Both resolve through `vild_resolve_wallet_token`.

## 5. Money, VAT, accounting

Credit is a claim on the chain, not money. VILD never holds funds. VAT is due on the consideration
actually received at each sale (full price when earning; the money part when redeeming) — confirm with
a bindandi álit. The chain books outstanding credit as a contract liability. VILD invoices the chain a
platform fee monthly from the settlement table. The EUR 1m/12-month notification threshold
(Act 114/2021 art. 38) is tracked per chain.

## 6. Mobile stack

Capacitor over the existing React/Vite bundle (one codebase for web, iOS, Android). Native pieces:
wallet pass add (`capacitor-pass-to-wallet` / Capawesome wallet plugin), push, haptics, deep links
for the eID return. React Native was Takk's choice; for VILD's screen types the web view is
indistinguishable and keeps the Supabase code unchanged. See `docs/vild/NATIVE.md`.

## 7. Decisions still open

1. Kenni vs Auðkenni direct (price at 10k/50k MAU).
2. First POS: Noona HQ (API) vs the chain's actual vendor — ask the chain first.
3. Pass provider for NFC (PassEntry quoted £199–200+/month) vs own Apple NFC certificate.
4. Platform fee model: % of issued credit vs flat SaaS per location.
5. Who signs the first chain: Gleðipinnar (10 brands, one POS decision) is the highest-leverage conversation.
