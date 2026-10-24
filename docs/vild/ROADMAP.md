# VILD — roadmap

## Now (this repository)
- [x] Research: Takk, Júní, POS/eID/wallet/legal landscape, pitch film, design brief
- [x] Design system and brand tokens (`docs/vild/DESIGN.md`, `src/vild/theme.css`)
- [x] Marketing site, consumer app, merchant portal on the mock data layer
- [x] Backend live in Supabase project amiomcjvtdpnbyayreko (migrations, seed, vild-till, vild-pos-webhook, vild-eid, vild-wallet-pass deployed); app runs on it via .env
- [x] Capacitor packaging config, smoke-test harness

## Next 2 weeks
1. Merge PR #1 so the Lovable preview serves `/vild`.
2. Register with Kenni (or Auðkenni) and set the `EID_*` secrets (list in `supabase-vild/README.md`); test rafræn skilríki end to end.
3. Apple Developer + Pass Type ID certificate → live wallet pass with balance; Google Wallet issuer.
4. Twilio for SMS codes (Supabase phone auth); then turn off `demo_purchases_enabled`.
5. Domain `vild.is`, deploy the standalone build; App Store Connect + Play Console accounts.
6. Move the backend to a dedicated Supabase project when the org upgrades (re-run `supabase-vild/`).

## First chain
1. Pick the chain; ask which POS they run (Noona / Upsell / Resto / dk / LS / other).
2. Integrate: Noona HQ webhook → `vild-pos-webhook` (adapter exists), or the scan path with the
   portal's till flow for day one.
3. Pilot in 1–2 locations for 4 weeks: measure return rate, credit issued/redeemed, basket size.
4. Settlement run and the first invoice.

## Later
- Pooled balances across sectors (needs an EMI/bank partner), credit top-ups (e-money), referrals,
  birthday credit, "Söfnun" goals (film idea 3), English UI, NFC tap via a pass provider,
  Síminn Pay distribution partnership, admin console for the VILD operator.
