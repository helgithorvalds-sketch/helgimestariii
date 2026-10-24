# VILD — packaging for the App Store and Google Play (Capacitor)

The consumer app is the same React code that runs at `/vild/app`. Capacitor wraps the standalone
build (`dist-vild/`) in native iOS and Android shells.

## One-time setup (on a Mac with Xcode 16+ and Android Studio)

```sh
npm install                      # @capacitor/core, cli, ios, android, haptics are already in package.json
npm run build:vild               # vite build --config vite.vild.config.ts → dist-vild/
npx cap add ios                  # creates ios/ (git-ignored; commit it when the project is real)
npx cap add android              # creates android/
npx cap sync
npx cap open ios                 # Xcode: set team, bundle id is.vild.app, add capabilities (Wallet, Push, Associated Domains)
```

`capacitor.config.ts`: appId `is.vild.app`, appName `VILD`, webDir `dist-vild`, splash mint, keyboard resize body.

## Environment

The standalone build reads `VITE_VILD_DATA` (`mock` for demos, `supabase` for production),
`VITE_VILD_SUPABASE_URL`, `VITE_VILD_SUPABASE_PUBLISHABLE_KEY`, optional `VITE_VILD_TILE_URL`.
`VITE_VILD_BASE` is forced to `""` by the config so routes live at `/`.

## Native pieces to wire (plugins)

| Feature | Plugin | Notes |
|---|---|---|
| Haptics | `@capacitor/haptics` (installed; `src/vild/lib/haptics.ts` already calls it lazily) | no-op on web |
| Push (balance updates) | `@capacitor/push-notifications` + FCM/APNs | register token → `vild_profiles.push_token` (add column) |
| Apple Wallet pass | `capacitor-pass-to-wallet` | fetch `/functions/v1/vild-wallet-pass/pass` as base64 → `addToWallet` |
| Google Wallet | `@capawesome/capacitor-wallet` or open the save URL from `/google-save-url` | |
| Electronic ID return | Universal Links / App Links for `https://vild.is/app/eg/skilriki` | the eID callback redirects there with `?eid=ok` |
| Status bar / safe areas | `@capacitor/status-bar`; CSS uses `env(safe-area-inset-*)` already | `viewport-fit=cover` is in `vild-app.html` |
| Geolocation (nearest place) | browser API works in the web view; `@capacitor/geolocation` for precise permissions | |

## Store checklist

- Apple Developer Program (organization; D-U-N-S for the company). Bundle id `is.vild.app`.
- App Review: no IAP (credit is for physical goods, guideline 3.1.3(e)); Sign in with Apple not
  required because login is rafræn skilríki (4.8); in-app account deletion exists (5.1.1(v)); privacy
  policy URL = `/vild/personuvernd`; privacy nutrition labels: name, phone, email, purchase history.
- "Supports Wallet" capability once the pass is live.
- Screenshots 6.7" and 6.1" from the real app; copy from the site hero.
- Google Play: organization account (avoids the 12-tester closed-test rule), Data safety form.
- Both: `Þ Ð Æ Ö` render in Figtree (Latin Extended) — verify on device.

## Local testing without a Mac

`npm run dev:vild` serves the standalone app at `http://127.0.0.1:8090/` — open it on a phone on the
same network (`--host`) or add it to the home screen as a PWA (`public/vild/manifest.webmanifest`).
