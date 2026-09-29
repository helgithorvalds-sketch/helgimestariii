# Miðatorg in the App Store and Google Play

The website and the apps are the same code. `npm run build` makes the website; Capacitor copies that
build into a native iOS and Android shell (`ios/`, `android/`) and adds what only a phone app can do.

## What is already done

- Capacitor 8 projects for iOS and Android, app id `is.midatorg.app`, name *Miðatorg*
- App icon and splash screen in every size (generated from `resources/icon.png` and `resources/splash.png`)
- Phone-only features, which Apple wants to see in an app that also exists as a website (guideline 4.2):
  - push notifications for price alerts and deal updates (off until the Apple / Firebase keys exist — see
    `supabase-midatorg/README.md`)
  - the native share sheet on event pages
  - electronic ID opens in an in-app browser and returns to the app (`is.midatorg.app://`)
  - sign-in with the 6-digit e-mail code, so e-mail links do not throw people out of the app
  - Android back button, status bar and splash handling
- In-app account deletion (Mín síða → Eyða aðgangi), which Apple requires (guideline 5.1.1(v))
- Terms (`/skilmalar`) and privacy policy (`/personuvernd`) pages, which both stores require

## What you need

| | Apple (iPhone) | Google (Android) |
|---|---|---|
| Account | [Apple Developer Program](https://developer.apple.com/programs/), USD 99 a year. As a company you need a D-U-N-S number (free, can take a few days). | [Google Play Console](https://play.google.com/console), USD 25 once. |
| Computer | A Mac with Xcode — or a cloud Mac build (Codemagic, Ionic Appflow, GitHub Actions macOS runners). | Any computer with Android Studio. |
| Review | Usually 1–3 days. | New personal accounts must first run a closed test (at the time of writing: 12 testers for 14 days). A company account avoids that. |

## Build and upload — iPhone

```sh
npm install
npm run app:ios          # builds the website, copies it into ios/, opens Xcode
```

In Xcode: select the *App* target → *Signing & Capabilities* → choose your team; add the *Push
Notifications* capability; set the version under *General*. Then *Product → Archive → Distribute App →
App Store Connect*.

In [App Store Connect](https://appstoreconnect.apple.com): create the app (bundle id `is.midatorg.app`),
then fill in:

- screenshots (6.9" iPhone at least; take them in the simulator)
- description, keywords (`miðar, tónleikar, tix, endursala, viðburðir`), support URL
  `https://midatorg.lovable.app/um#samband`, privacy policy URL `https://midatorg.lovable.app/personuvernd`
- App Privacy: e-mail, name, phone, user content (messages, photos), identifiers (push token); used for
  app functionality, linked to the user, not used for tracking
- **Review notes: a test account** (e-mail + password) with a listing and a deal, so the reviewer can try
  everything. Mention that payments happen between users outside the app (no in-app purchases).

## Build and upload — Android

```sh
npm install
npm run app:android      # builds the website, copies it into android/, opens Android Studio
```

For push, put Firebase's `google-services.json` in `android/app/`. In Android Studio: *Build → Generate
Signed App Bundle*, create an upload key (keep it safe), build the `.aab`, and upload it in Play Console
(internal testing first). Fill in the store listing, content rating, the Data safety form (same answers
as Apple's privacy section) and the privacy policy URL.

## Every later update

Website changes go live when Lovable publishes. The apps pick up the same changes with:

```sh
npm run app:build        # build + copy into both native projects
```

then a new archive / app bundle with a higher version number.

## Links that open the app

`is.midatorg.app://app/<path>` always opens the app. To make ordinary `https://midatorg.lovable.app/…`
links open it too (Universal Links / App Links), host `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` on the website with your Apple Team ID and Android signing certificate
fingerprint — best done once the app has its own domain.
