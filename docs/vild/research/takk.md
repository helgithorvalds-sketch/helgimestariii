# TAKK (Takk krónur) — competitive research for VILD

Research date: 2026-10-23. Sources were fetched live; raw HTML/CSS/screenshots are saved under `/tmp/claude-0/-home-user-helgimestariii/da13251d-4995-5005-9478-c83f554f6de9/scratchpad/research/raw/` (site HTML, both CSS bundles, skilmálar, App Store + Play listings, Júní case study, Hagar press releases, screenshots in `raw/shots/`).

Legend used throughout:
- **[V]** = verified directly on the cited page / in the HTML / in a screenshot.
- **[I]** = my inference from the evidence; not stated by Hagar or a vendor.
- **[P]** = reported by press / third party, not independently verified.

---

## 0. One-paragraph summary

Takk is Hagar hf.'s group loyalty scheme, launched 14 Jan 2026 (app v1.0 published 11 Jan). Members sign in with **rafræn skilríki** (phone number or kennitala), get a **digital "Takk kort" as an NFC pass in Apple Wallet / Google Wallet** (issued by **PassEntry**, PassTap module), and **tap the phone on the payment terminal (posi)** at Bónus/Hagkaup before paying. Cashback is paid as **"Takk krónur" (tkr), 1 tkr = 1 ISK**, earned **per product** (a fixed tkr amount on weekly "Takk vörur", e.g. "70 tkr til baka") plus **fixed % categories at Hagkaup** (1.5 % / 3 % / 5 % / 15 %) and limited-time "Topp tilboð". tkr are spent **only at physical tills** of Bónus and Hagkaup (not online), by tapping the phone again; the full balance is applied and the rest paid by card. tkr expire **2 years** after being earned, are non-transferable and never cash. The consumer app was designed and built by **Júní** (React Native + NestJS/GraphQL); the marketing site is Next.js + Tailwind + Prismic. ~60–65k+ members by mid/late 2026. Public reception is mixed: iOS 3.1★ (38), Android 2.8★ (29); criticism centres on small discounts, an extra checkout step, and privacy (kennitala → Þjóðskrá lookups).

---

## 1. Website — https://www.takkkronur.is/

### 1.1 Tech & structure [V]
- Next.js (App Router, `/_next/static/chunks/app/[locale]/(home)/page…`), locales `is` (default, `<html lang="is">`) and `en` (`/en`). Content from **Prismic** (repo `project-takk`, images on `images.prismic.io/project-takk/…`). Slice names visible in markup: `data-slice-type="website_how_it_works" data-slice-variation="three_steps_with_video"`.
- Tailwind CSS v4 (oklch tokens, `--spacing`), Base UI components (`data-base-ui-click-trigger`), `data-scroll-behavior="smooth"`.
- Third parties: Google Tag Manager `GTM-K7DHMWWQ`, CookieHub (`cdn.cookiehub.eu`), Facebook Pixel (`connect.facebook.net`), `gstatic.com` (reCAPTCHA on the contact form [I]), Vimeo player.
- `<title>Takk</title>`, `<meta name="description" content="Fáðu Takk krónur til baka">`, `<meta name="apple-itunes-app" content="app-id=6745477799">` (iOS Smart App Banner), OG image `…/aWdimgIvOtkhBfLX_meta-image-takk.png` (campaign still: a showman in a dark suit on a stage with purple curtains and spotlights).
- Only two routes exist: `/` and `/skilmalar` (+ `/en` variants). There is **no** "for companies / fyrir fyrirtæki" page, no store list page, no product list on the web. A deep-link landing page exists in the i18n bundle (`appLink`: "Opna Takk", "Opna appið...", "Vísa þér í Takk", "Sæktu Takk appið til að halda áfram", "Reyna að opna app", "Sækja í App Store", "Sækja í Google Play", "Eða skannaðu með símanum") — [I] used for QR codes / shared offer links that open the app or fall back to the stores.

### 1.2 Design tokens [V] (from `/_next/static/css/f46739a4b612cb7e.css` and `e1a55006780eefdf.css`)
```css
:root{
  --color-dark-purple:#18003e;   /* footer bg, headline text on light */
  --color-purple:#691fe7;        /* brand purple: logo, buttons, tkr */
  --color-white:#fff;
  --color-light-purple:#f0ebf7;  /* page/section background */
  --color-light-purple-rgb:240,235,247;
  --color-lavender:#dbc7ff;      /* accents */
  --color-lilac:#e9dffa;         /* card backgrounds */
}
```
Also used from Tailwind defaults: `purple-700` (button hover), `emerald-600` (success), `amber-600`, `red-500` (`.text--error`), `gray-100/500`.

Typography: two self-hosted woff2 families —
- **Solar** (400, 600) → headings (`.font-solar`, `--font-solar`). Geometric, rounded, chunky display face; the app's "Fáðu Takk krónur til baka!" headline and "takk" wordmark share this look.
- **Matter** (300/400/500/600/700/800 + italics) → body (`--font-matter`). Clean grotesk.
Type scale classes seen: `text-6xl` (H1 ≈ 3.75rem), `text-5xl/4xl/[40px]` (H2/H3), `text-xl`, `text-sm`. Weights `font-medium/semibold/bold`.

Shapes & motion: pill buttons (`rounded-full`), cards `rounded-2xl`, hero bottom `rounded-b-[60px]`, footer top `rounded-t-[5rem]`/`[80px]` (big scalloped dark-purple footer). Scroll-reveal class `fade-up`; FAQ accordion animates `grid-rows-[0fr]→[1fr]` with `opacity` (`duration-300 ease-in-out`). Language selector is a pill with a globe icon, hover `bg-[rgba(var(--color-light-purple-rgb),0.5)]`. Header is `absolute` over the hero; logo swaps `LogoWhite.svg` (mobile, over photo) → `LogoPurple.svg` (≥1024px). Logo files: `/images/LogoWhite.svg`, `/images/LogoPurple.svg`, `/images/LogoDarkPurple.svg`. Wordmark is lowercase "takk" with a sparkle/"✦" replacing the t-crossbar, inside a purple rounded pill (see app icon).

Imagery: campaign photography of the "Takk showman" (middle-aged man, glasses, dark suit, retro mic, purple velvet curtain, spotlights) — desktop hero `aM1kaZ5xUNkB06Pg_Hero.avif` (3189×2126), mobile `aWd0FwIvOtkhBfaF_takk-mobile-main-image-v2.jpg`. 3D purple "tkr" coins and four-point sparkles are the recurring icon language (coins also appear on the Wallet card and app home).

Animation: the three "Svona virkar Takk" steps each play a **Lottie** JSON from Prismic (`Takk_kennslumyndband_01_notext.json` 17 KB, `…_02_notext.json` 68 KB, `…_03_notext.json` 24 KB) with a placeholder "Loading animation..."; a separate combined mobile Lottie (`Takk_kennslumyndband_mobile.json`, 472 KB). The "Hvernig virkar Takk" section embeds a **Vimeo** video (id 1129156619, title "Fáðu Takk krónur tilbaka", 22 s, uploaded 2025-10-21, `autoplay=1&loop=1&muted=1`).

### 1.3 Sections in order, with verbatim Icelandic copy [V]

Sidebar menu (hamburger): `Sækja appið` · `Svona virkar Takk` · `Algengar spurningar` · `Hafa samband` (+ `Sími`, `Netfang`). Language selector: `Íslenska` / `Enska` ("Velja tungumál").

**1) Hero** (full viewport `h-svh`, photo background, left-aligned text)
- H1: **„Fáðu Takk krónur til baka“** (Prismic marks "til baka" as `strong`)
- H2/subhead: „Takk er skemmtilegt vildarsamfélag þar sem þú safnar Takk krónum þegar þú verslar Takk vörur í Hagkaup, Bónus og Eldum rétt.“
- CTAs: App Store badge → `https://apps.apple.com/is/app/takk/id6745477799`; Google Play badge → `https://play.google.com/store/apps/details?id=is.hagar.takk`.

**2) „Svona virkar Takk“** (strong on "virkar") — three steps, each with a Lottie:
1. **Sæktu Takk appið í símann** — „Þú bætir Takk kortinu við veskið í símanum þínum áður en þú verslar hjá Hagkaup, Bónus og Eldum rétt.“
2. **Fáðu Takk krónur til baka** — „Þegar þú verslar Takk vörur hjá Hagkaup, Bónus og Eldum rétt safnar þú Takk krónum inn á Takk kortið þitt. Þú einfaldlega auðkennir þig á posa með Takk kortinu þínu áður en þú greiðir.“
3. **Notaðu Takk krónur til að versla** — „Þú getur notað Takk krónurnar þegar þú verslar hjá Hagkaup og Bónus. Ein Takk króna jafngildir einni íslenskri krónu í verðgildi þegar hún er notuð í verslun.“

**3) „Hvernig virkar Takk“** — Vimeo explainer (autoplay, muted, looped).

**4) „Þú færð meira til baka með“** + Takk logo, then paragraph:
„Takk er skemmtilegt vildarsamfélag í appi. Vildarvinir geta safnað afslætti sem við köllum Takk krónur (tkr) þegar þeir versla Takk vörur hjá Bónus, Hagkaup og Eldum rétt. Takk krónurnar geta þeir svo notað næst þegar þeir versla hjá Hagkaup og Bónus. Í appinu má líka finna fjölda spennandi tilboða hjá samstarfsaðilum, þar á meðal Glans, Lemon og Grill 66. Að auki er hægt að skrá sig á skemmtilega viðburði og taka þátt í fjölbreyttum leikjum.“
Partner presentation: three logos only — **Hagkaup**, **Bónus**, **Eldum rétt** — each linking out to `hagkaup.is`, `bonus.is`, `eldumrett.is`. No store map, no store list, no partner directory on the web.

**5) „Algengar spurningar“** — accordion (all Q/A verbatim):
- **Hvað er Takk?** „Takk er skemmtilegt vildarsamfélag í appi þar sem þú færð einfaldlega meira til baka. Þú safnar Takk krónum (tkr) þegar þú verslar Takk merktar vörur í Bónus, Hagkaup og Eldum rétt sem þú getur síðan notað í næstu búðarferð. Í Takk appinu er einnig að finna fjölbreytt tilboð, til dæmis hjá Lemon, Grill 66 og Glans, auk skemmtilegra leikja og viðburða.“
- **Hvernig sæki ég Takk appið?** „Þú einfaldlega sækir Takk appið í App store eða Play store.“
- **Hvað eru Takk krónur (tkr)?** „Afslættir í vildarsamfélaginu eru kallaðir Takk krónur (tkr) og vildarvinir geta áunnið sér (tkr) þegar Takk vörur eru verslaðar hjá Hagkaup, Bónus og Eldum rétt. Ein Takk króna (tkr) jafngildir einni íslenskri krónu (ISK) í verðgildi þegar hún er notuð í verslunum Bónus og Hagkaup.“
- **Hvað eru Takk vörur?** „Takk vörur koma inn vikulega og þú safnar Takk krónum af þeim. Gildistími tilboða stendur á vörunni í appinu.“
- **Eru vörur eða vöruflokkar í verslunum sem eru alltaf með Takk krónu söfnun?** „Já, í Hagkaup er föst söfnun Takk króna á eftirfarandi vöruflokkum og vörum. Líka þegar önnur afsláttartilboð eru hjá Hagkaup eins og Tax free dagar og Heilsudagar. Þú safnar: 1,5% til baka í Takk krónum af allri snyrtivöru · 1,5% til baka í Takk krónum af allri sérvöru · 3% til baka í Takk krónum af vítamínum og fæðubótarefnum · 15% til baka í Takk krónum af Refnum · 5% til baka í Takk krónum af Skálinni og Salatbarnum · 3% til baka í Takk krónum af eldgrilluðum kjúkling. Myndu að skrá þig inn á kassa áður en þú greiðir og þú færð einfaldlega meira til baka!“
- **Hvernig safna ég Takk krónum í verslun?** „Í verslun auðkennir þú þig á posa með Takk kortinu þínu við kaup á Takk merktum vörum. Takk kortið færðu í veskið í símanum þínum úr Takk appinu. Sjálfsafgreiðslukassar: Í verslunum Bónus og Hagkaups eru skýrar leiðbeiningar á kössunum en skrefin eru eftirfarandi; 1.) Þú smellir á Takk merkið á kassa ("Innskrá"). Þetta má gera hvenær sem er í kaupferlinu fyrir greiðslu. 2.) Þú leggur símann að posanum og skráir þig þannig inn með Takk kortinu þínu. Kassi með starfsmanni: 1.) Starfsmaður virkjar Takk á posa. 2.) Þú leggur símann að posanum og skráir þig þannig inn með Takk kortinu þínu.“
- **Hvernig safna ég Takk krónum í netverslun?** „Í netverslunum þarft þú að tengja Takk aðganginn þinn einu sinni við notandann þinn á Hagkaup.is og Eldumrett.is með rafrænum skilríkjum; 1.) Þú sækir Takk appið og skráir þig inn í Takk 2.) Þú smellir á Takk merkið upp í hægra horni vefsíðunnar og velur "Tengja Takk aðgang" 3.) Þú auðkennir þig með rafrænum skilríkjum og þá hefur þú tengt aðganginn þinn. Athuga að þetta þarftu einungis að gera einu sinni…“
- **Hvernig nota ég Takk krónurnar mínar?** „Þú getur notað Takk krónurnar þínar á sjálfsafgreiðslu- og beltakössum í verslunum Bónus og Hagkaup. Ekki er hægt að nota Takk krónur í netverslunum Hagkaups og Eldum rétt. Sjálfsafgreiðslukassar: 1.) Þú smellir á Takk merkið á kassa ("Innskrá") og skráir þig inn í Takk. 2.) Þú velur "Greiða með Takk krónum" í greiðsluvalmynd og smellir á "Greiða". 3.) Þú leggur símann að posanum og staðfestir Takk krónu notkunina. Kassi með starfsmanni: 1.) Starfsmaður virkjar Takk á posa. 2.) Þú leggur símann að posanum og skráir þig inn með Takk kortinu þínu. 3.) Þú lætur starfsmann vita að þú viljir nota Takk krónur. 4.) Þú leggur símann að posanum og staðfestir Takk krónu notkunina. Athugið að; -Ef valið er að nota Takk krónur er öll upphæðin greidd með Takk krónum en ef innistæða er ekki nægileg eru eftirstöðvar greiddar með greiðslukorti eða öðrum greiðslumáta. Dæmi: Vara kostar 1.000 kr, Takk meðlimur á 500 tkr → eftirstöðvar til greiðslu 500 kr. -Ef greitt er með Takk krónum að hluta og greiðslukorti að hluta, þá safnast Takk krónur einungis af þeirri upphæð sem greidd var með greiðslukorti.“
- **Fæ ég Takk krónurnar mínar strax í appið?** „Það getur tekið nokkrar mínútur fyrir Takk krónur og kvittanir að skila sér í appið eftir kaup í verslun. Í netverslun skila Takk krónurnar og kvittunin sér þegar þú hefur fengið vörurnar afhentar.“
- **Geta allir verið meðlimir í Takk?** „Allir með rafræn skilríki geta gerst meðlimir í Takk.“
- **Hvernig fæ ég Takk kortið í símann minn?** „Þegar þú skráir þig inn í Takk appið er þér boðið upp á að vista Takk kortið í veskið í símanum þínum (e. Wallet). Einnig er hægt að fara í "Mitt Takk" í appinu og þar undir stillingar er hægt að smella á "virkja passa". Takk kortið er aðeins rafrænt og notað til auðkenningar í verslunum við söfnun og notkun á Takk krónum.“
- **Í hvaða verslunum get ég safnað Takk krónum?** „Auðkenndir Takk meðlimir geta safnað Takk krónum í öllum verslunum Bónus, Hagkaup og hjá Eldum rétt.“
- **Hvar get ég séð hvað ég á margar Takk krónur?** „Í Takk appinu má sjá yfirlit yfir stöðu á Takk krónum ásamt söfnun Takk króna frá upphafi. Einnig má sjá kvittanir og söfnun Takk króna niður á verslanir undir „Mitt Takk“ í appinu.“
- **Get ég safnað Takk krónum í netverslunum?** „…sjá meðlimir Takk krónurnar sem safnast í appinu eftir að varan hefur verið afhent.“
- **Hvar sé ég hvaða vörur safna Takk krónum?** „Í Takk appinu sérðu strax hvaða vörur safna Takk krónum. Í verslunum finnur þú Takk vörur merktar á rafrænum hillumiðum, þar sem þú sérð nákvæmlega hversu margar Takk krónur þú færð til baka.“
- **Safnast alltaf Takk krónur af Takk merktum vörum?** „Já, hinsvegar ef Takk krónur eru notaðar að hluta og greiðslukort að hluta, þá safnast einungis af þeirri upphæð sem greidd var með greiðslukorti. Takk krónur safnast ekki af þeim hluta sem greitt er með inneignarnótu. Dæmi: Ef karfan inniheldur 200 tkr og helmingur upphæðarinnar er greidd með greiðslukorti þá safnast 100 tkr. af þeim kaupum.“
- **Hvenær koma inn nýjar Takk vörur í appið?** „Í hverri viku koma inn nýjar Takk vörur í appið og flest tilboð eru virk í 1-2 vikur. Gildistími tilboða stendur á vöruspjöldunum í appinu.“
- **Hvað ef ég get ekki auðkennt mig í appinu?** „Þú þarft að vera með rafræn skilríki til að geta auðkennt þig og notað appið…“
- **Fyrnast Takk krónur?** „Takk krónur fyrnast tveimur árum eftir söfnun.“
- **Get ég skilað Takk vöru?** „Sömu skilaferlar gilda um Takk vörur og um aðrar vörur.“
- Button after accordion: purple pill **„Fleiri spurningar“** with arrow circle (expands more Q&As) [I].

**6) „Hafa samband“** — form fields: `Nafn`, `Tölvupóstfang`, `Símanúmer`, `Hvað málið varðar` (select: `Söfnun og notkun á Takk krónum` / `Tæknileg aðstoð` / `Annað`), `Erindið`, button `Senda`. Success: „Takk fyrir þig. Við höfum samband innan tveggja virkra daga.“ Error: „Úbbs! Eitthvað fór úrskeiðis. Vinsamlegast reyndu aftur. Takk!“ Validation: „Nauðsynlegt“, „Ógilt netfang“.

**7) Footer** (`bg-dark-purple rounded-t-[5rem] text-white`): Takk logo; `Heimilisfang` Holtavegur 10 - Holtagörðum, 104 Reykjavík; `Netfang` takk@takkkronur.is; `Kennitala` 670203-2120; `Vsk númer` 78874; „2025 © Allur réttur áskilinn.“; link `Skilmálar` → `/skilmalar`; socials Facebook (`facebook.com/people/Takk/61582109428013/`), Instagram (`instagram.com/takk_kronur/`), YouTube (`youtube.com/@Takk_kronur`).

### 1.4 How "krónur til baka" per product is shown
- **Website: not at all** — no product grid on the web; only the category percentages in the FAQ. [V]
- **App:** every product card carries a badge "**70 tkr. til baka**" (large number + small "tkr. / til baka" stacked), coloured by store (Hagkaup orange `#F28C28`-ish, Bónus yellow, Eldum rétt green) [V, screenshots]. Detail sheet shows "Verð 279kr." left, flower icon centre, "tkr. til baka 19 tkr." right. [V]
- **In store:** rafrænir hillumiðar (ESL) show the exact tkr per product; self-checkout screens have a Takk "Innskrá" button. [V, FAQ + Hagar PR]

### 1.5 English version [V]
`/en` is a full translation (H1 "Get Takk Krónur back", "This is how Takk works", "You get more back with", "Frequently asked questions"). Same structure.

---

## 2. The app

### 2.1 Identity & listings [V]
- iOS: "Takk" by **Hagar hf**, id 6745477799, https://apps.apple.com/is/app/takk/id6745477799 . Subtitle line "Fáðu Takk krónur til baka". Category Shopping (ranked **No. 3 Shopping, Iceland** at capture). **3.1★ from 38 ratings**. Free, no IAP. Age 4+. 71.4 MB. iOS 15.6+ (iPhone/iPad/iPod; Mac M1 "Designed for iPad. Not verified for macOS."; visionOS 1.0). Language listed: English only. Copyright "© Hagar hf (c) 2025". "Supports: Wallet". Privacy policy URL = https://www.takkkronur.is/skilmalar . Developer page id1812429143.
- Android: package **`is.hagar.takk`**, https://play.google.com/store/apps/details?id=is.hagar.takk . **2.8★ (29 reviews; phone 2.7/28)**, **10K+ downloads**, PEGI 3, "Updated on Oct 21, 2026". Developer: Hagar hf., dev.apple@hagar.is, Holtavegi 10, 104 Reykjavik, +354 693 5514; support email takk@takkkronur.is.
- App icon: purple (`#691fe7`) rounded square with white lowercase "takk" wordmark. [V]

### 2.2 Store description (verbatim, iOS = Play) [V]
„Takk er skemmtilegt vildarsamfélag í appi þar sem þú færð einfaldlega meira til baka.
Þú safnar Takk krónum (tkr) þegar þú verslar Takk merktar vörur í Bónus, Hagkaup og Eldum rétt. Þú getur notað Takk krónurnar í verslunum Bónus og Hagkaups. Í appinu finnur þú líka tilboð, leiki og viðburði.
Í Takk appinu getur þú:
- Skoðað Takk vörur sem gefa Takk krónur í Bónus, Hagkaup og Eldum rétt.
- Fylgst með Topp tilboðum sem gefa mestu söfnunina
- Fengið Takk krónur af allri snyrtivöru og sérvöru í Hagkaup líkt og vítamínum og fæðubótarefnum, leikföngum, búsáhöldum, fatnaði, skóm ofl.
- Fylgst með stöðunni á Takk krónum og skoðað kvittanir.
- Notað Takk krónur í verslunum Bónus og Hagkaups, en ekki í netverslun.
- Skoðað tilboð meðal annars hjá Glans, Grill 66 og Lemon.
- Fundið viðburði og tekið þátt í skemmtilegum leikjum.
- Stýrt tilkynningum, skoðað skilmála og óskað eftir aðstoð.
Ein Takk króna jafngildir einni íslenskri krónu þegar hún er notuð í verslunum Bónus og Hagkaups.“
English block begins: "Takk is a fun loyalty community that gives you more back."

### 2.3 Release-note history [V, App Store "Version History"]
| Version | Date | Notes |
|---|---|---|
| 1.0 | 11 Jan (2026) | initial release (3 days before public launch on 14 Jan) |
| 1.1 | 14 Jan | "Updated images in app store." |
| 1.4 | 13 Oct (2026) | „Hvað er nýtt í Takk: -Skemmtun: Nýr flipi með leikjum og vinningum. Taktu þátt í leikjum beint í appinu og eigðu möguleika á að vinna fjölbreytta vinninga. -Vinningarnir þínir: Allir vinningar á einum stað, með upplýsingum um hvar og hvernig á að sækja þá. -Uppfærðar kvittanir: Kvittanir hafa fengið nýtt útlit og sýna nú upplýsingar á skýrari hátt. -Lagfæringar: Endurbætur á viðburðum og innskráningu, auk ýmissa annarra endurbóta.“ (Play's English calls the tab "Events and games".) |
| 1.4.1 | ~22 Oct 2026 ("1 day ago") | "Bug fix in settings / New update screen" |
Versions 1.2/1.3 are not listed on the public page (Apple only shows a subset). [I]

### 2.4 Onboarding & login [V unless noted]
- Login is **rafræn skilríki only** — FAQ: „Allir með rafræn skilríki geta gerst meðlimir í Takk.“ Terms: identifier is „að þínu vali annað hvort farsímanúmerið þitt eða kennitala til að auðkenna aðgang þinn að Takk með rafrænum skilríkjum“ → i.e. both Auðkenni **SIM/app-based e-ID by phone number** and **Auðkennisappið by kennitala** are supported. No email/password, no social login.
- The app collects **name, phone number, email** in-app (terms) and uses kennitala to derive **birthday, postal code, age band** (and fetches **gender** from Þjóðskrá). Optional self-declared demographics: „fjölskyldustærð, kyn, gæludýraeign eða áhugamál“ for personalised offers.
- Terms acceptance is an in-app checkbox „Samþykkja skilmála“.
- Onboarding is a paged flow (6 pager dots in Júní's screenshot). Final screen: logo pill, dots, **„Takk kortið þitt tilbúið til notkunar!“** / „Nú getur þú safnað Takk krónum þegar þú verslar í Hagkaup, Bónus og Eldum rétt. Kíktu á Takk tilboðin í appinu!“, a large tilted dark-purple card mock, button **„Klára ferlið“**.
- During login the user is prompted to add the Takk card to Wallet; can also be done later under Mitt Takk → Stillingar → „virkja passa“.
- The Wallet card (Apple Wallet / Google Wallet pass) is **dark purple (#18003e-ish)**, "takk" outline logo top-left, 3D tkr coins + sparkle graphic, "Fáðu krónur til baka", `NAFN` + full name, NFC waves icon bottom-right, and on the pass itself a live field **„TAKK KRÓNU INNEIGN 36.530“** (balance pushed to the pass). [V screenshot; live-updating balance is a PassEntry feature → I]

### 2.5 Earning mechanics
- **In store (Bónus, Hagkaup):** tap the Takk "Innskrá" icon on the self-checkout screen (any time before payment) or ask the cashier to "virkja Takk á posa", then **hold the phone to the payment terminal** → the NFC Wallet pass identifies the member. Then pay normally with any card/cash. [V FAQ]
- PassEntry's version [P, vendor press release 31 Mar 2026]: "When a customer taps their phone at a payment terminal, loyalty is triggered instantly—no apps to open or QR codes to scan. Security is driven by the phone's own biometrics… Rewards are earned and redeemed in real time during checkout… The entire experience runs directly on the payment terminals - whether manned or self-serve." Passes are "secure NFC-enabled passes" in Apple Wallet and Google Wallet; PassTap "integrates seamlessly with Hagar's existing point-of-sale infrastructure".
- **Not card-linked** — no payment-card registration anywhere in app, site or terms; earning requires the explicit pass tap and is independent of how you pay. [V by absence + FAQ]
- **Online (hagkaup.is, eldumrett.is):** one-time account link via the Takk logo top-right on the site → "Tengja Takk aðgang" → rafræn skilríki. tkr are credited **after delivery**. [V FAQ + hagkaup.is/grein/takk-i-vefverslun]
- Latency: "nokkrar mínútur" for tkr and the receipt to appear in the app after in-store purchase. [V]
- Push notification example: **„Til hamingju! Þú safnaðir 463 Takk krónum“** (App Store screenshot). [V]
- Sept 2026 PR says Takk now also covers „völdum þjónustuþáttum hjá Olís“; the Kvittanir mock already shows Olís rows (+278 tkr). [V]

### 2.6 Spending mechanics [V FAQ]
- Only at **physical tills** (sjálfsafgreiðslu- og beltakassar) in Bónus and Hagkaup; **not** online, not at Eldum rétt, not at partners.
- Self-checkout: Innskrá (tap) → choose **„Greiða með Takk krónum“** in the payment menu → „Greiða“ → tap phone again to confirm. Staffed till: tap, tell cashier, tap again to confirm.
- **All-or-nothing balance application:** „Ef valið er að nota Takk krónur er öll upphæðin greidd með Takk krónum en ef innistæða er ekki nægileg eru eftirstöðvar greiddar með greiðslukorti.“ No "choose amount" UI is described. [V + I]
- The portion paid with tkr (or inneignarnóta) earns nothing.
- No spending via the app itself, no in-app payment, no Apple Pay — the pass is identification only ("Takk kortið er aðeins rafrænt og notað til auðkenningar"). [V]

### 2.7 Information architecture (from Júní case-study screenshots + store screenshots) [V]
Bottom tab bar (5 tabs, icons are sparkle/coin glyphs, active = purple):
`Heim` · `Takk vörur` · `Önnur tilboð` · `Viðburðir & leikir` · `Mitt Takk`
(v1.4 added a games/prizes tab called **„Skemmtun“** — [I] it probably replaced/renamed "Viðburðir & leikir".)

**Heim (home)**
- Top: purple gradient header with greeting **„Takk Sóley“** (first name), floating 3D "tkr" coins and sparkles.
- Balance "speech-bubble" card: label `Þín inneign`, huge **„16.965 tkr.“** in brand purple, below it `Safnað frá upphafi 32.400 tkr.` with a sparkle tail.
- Store filter pills: `HAGKAUP` · `BÓNUS` · `ELDUM RÉTT` (brand wordmarks).
- Dismissible helper card **„Hvernig virkar Takk?“** (word "virkar" highlighted in a purple pill) with an ✕.
- Section **„Takk í dag“** with `Skoða allt →` — horizontal carousel of product cards: top-right badge "**70 tkr. til baka**" in store colour, product photo, bottom-left store tab (e.g. "BÓNUS"), product name, brand/sub-line ("Bakarí Hagkaups", "Driscolls"), price "499 kr.".
- Júní also mentions „sérsniðin meðmæli sem byggð eru út frá kauphegðun notandans“ (personalised recommendations) [V Júní; whether live → I].

**Takk vörur**
- Header "Takk vörur"; store pills (`HAGKAUP` / `BÓNUS` / `ELDUM RÉTT`), selected pill filled in the store's colour (Bónus = yellow) and the **whole screen background tints to the store colour** (pale yellow for Bónus).
- Per-store sections with `Skoða allt →`, then category groups ("Grænmeti", "Börnin") of cards (e.g. "Iceberg jöklasalat 650 gr. - 614 kr. / kg 279kr." with "70 tkr. til baka"; "Laukur í neti"; Libero nappies; Nestlé Min Grøt; "Berjablanda Driscolls 779 kr. 69 tkr"; "Vitamín Heilsu 679kr. 23 tkr"). Promo banners inside ("20 Grill-vörur" Hagkaup grill campaign).
- Product detail = bottom sheet: large product photo, store tab, stat card `Verð 279kr.` | flower icon | `tkr. til baka 19 tkr.`, name, unit price, short description.

**Önnur tilboð**
- Section **„Einstök tilboð“** — partner offers as cards with a green badge: "2f1 af réttum" (Eldum rétt "2f1 af Réttum vikunnar / Eldum rétt vikuseðill"), "70 tkr. til baka" ("Tilbúið til eldunar / Tilbúnir réttir"), "20% afsláttur af Páskaborgaranum / Sérstakur páskaborgari á tilboði" (Grill 66 [I]), Lemon "2f1 af stóru Kombó / Alla virka daga á milli 16–18".
- Offer detail sheet: image with "2f1" badge, partner logo tab, title, condition line, big button **„Nýta tilboð“** (redeem; [I] shows a code/timer for staff).

**Viðburðir (& leikir)**
- Grouped by store ("Hagkaup", "Bónus"); event card with photo, date chip "28. mars, 18:00", title "Takkleikar", location pin "Bónus", teaser "Takkleikar Bónus verða haldnir í Bónus Holtagörðum …". Sign-up stored (terms: event registration, reminders).
- Games (leikir) with prizes; v1.4: "Vinningarnir þínir — Allir vinningar á einum stað, með upplýsingum um hvar og hvernig á að sækja þá."

**Mitt Takk**
- Same balance bubble; profile row (initials avatar "SU", name, email, chevron); row `Stillingar` (sparkle icon); 2×2 tiles with four-petal flower icons: **Kvittanir** (purple), **Skilmálar** (pink), **Tilkynningar** (orange), **Spurt og svarað** (green). Settings contain "virkja passa", notification controls, account deletion („Stillingar“ per terms).
- **Kvittanir**: list rows — store avatar (orange "H", Bónus pig, Olís "O", Eldum rétt pot), store name, "2.2.2025, 15:10", chips **„+ 489 tkr.“** / **„- 229 tkr.“**, basket total "31.580 kr.". A "tkr" chip top-right. (v1.4 redesigned receipts.)

**Gamification:** games with prizes, events ("Takkleikar"), weekly product drops, "Topp tilboð", birthday offers („frekari afslætti eða tengd tilboð þann dag“), running lifetime total "Safnað frá upphafi", congratulatory pushes. No tiers/levels/streaks are evidenced. Members are nicknamed **„Takkarar“** / „vildarvinir“.

### 2.8 Visual language of the app [V]
Light lavender background (#f0ebf7-ish), white rounded cards (~24 px radius), brand purple for numbers/active states, dark-purple for the Wallet card, store colours for badges (Hagkaup orange, Bónus yellow, Eldum rétt green, Lemon lime, partner green "2f1"), four-petal flower & four-point sparkle iconography, 3D coins. Headline font = Solar-like rounded display; body = Matter-like grotesk.

### 2.9 User reviews (verbatim) [V]
- iOS, 14 Jan: „Það bað enginn um þetta. Lækkið bara verðið ef þið viljið gera eitthvað fyrir viðskipavini. Ok bæ!“
- iOS, 18 Jan: „…Núna loksins komið app til að gefa Högum ókeypis gögn um kauphegðun hvers einasta einstaklings á landinu í skiptum fyrir að fá að borga óuppsprengt "Takk" verð…“
- iOS, 28 Feb: „Lengir afgreiðsluna - vont að þurfa að bæta skrefi við afgreiðsluferlið - mjög lítil hagræðing. Eyddi þessu ut eftir 3 skipti af 15-35þus kr innkaupum og samtals 3-400kr uppsafnaðann afslátt“
- iOS, 7 Mar: „Lélegasta afsláttar Kort sem eg hef verið með … Afsláttar vörur eru heldur ekki merktar i búðum“
- Android, 1 Feb (10 helpful): „Hugmyndin er sniðug og ekki ólík útfærslum sem ég er vanur erlendis eins og td í Albert Heijn í Hollandi en að tengja þetta kennitölu og rafrænum skilríkjum er fáránlegt … Auk þess er skelfilegt að "takk kortið" bætist við sem kort í "wallet" í símanum en er ekki strikamerki sem hægt er að scanna með sjálfsafgreiðslukassanum.“
- Android, 11 Feb: "can't sign in"; 27 Aug: "you can't sign in with electronic id it just get stuck on the autenthicating screen".
Take-aways for VILD: e-ID login reliability, checkout friction, visibility of what earns, and privacy framing are the pain points.

---

## 3. Business model

### 3.1 Partners [V]
- **Earn + spend:** Bónus, Hagkaup (all stores nationwide).
- **Earn only:** Eldum rétt (meal-kit, online). Olís: „völdum þjónustuþáttum hjá Olís“ since Sept 2026 (Hagar PR). Receipts mock shows Olís.
- **Offers only (no tkr):** Glans (Hagar's car wash), Lemon, Grill 66 (Olís-owned). Bónus/Hagkaup pages also list Olís among offer partners.
- Not involved (as of today): Zara, Stórkaup, Aðföng, Bananar, SMS (Faroe). Terms allow any company to join/leave at any time without notice.
- **Suppliers co-fund:** Hagar, 8 Sept 2026: „aukinn áhugi birgja á samstarfi við Takk hefur skapað tækifæri til að sækja enn sterkari Takk tilboð“ → Takk offers are largely supplier-funded trade promotions [V quote; I on funding split]. Hagar also launched **„Hagar miðlar“** (retail media: in-store screens/ESL ads for suppliers) in April 2026 — Takk + retail media together form the data/monetisation stack [V Hagar Q4 release; I on linkage].

### 3.2 Reward structure [V]
- **Per product, fixed tkr amount** (not %): "Takk vörur" rotate weekly, "flest tilboð eru virk í 1-2 vikur", expiry printed on the card. Observed amounts: 19, 20, 23, 69, 70 tkr on items priced 279–779 kr (≈ 3–25 %). Over **2,000** Takk products at any time (Sept 2026).
- **Topp tilboð:** six per chain at a time, 1–2 weeks, "veglega söfnun", highlighted in app and store.
- **Fixed category % at Hagkaup only** (stack with Tax Free / Heilsudagar): 1.5 % snyrtivara, 1.5 % sérvara (leikföng, búsáhöld, fatnaður, skór), 3 % vítamín & fæðubótarefni, 15 % Refurinn (Hagkaup's in-store eatery), 5 % Skálin & Salatbarinn, 3 % eldgrillaður kjúklingur.
- Occasional blanket campaigns, e.g. **20 % tkr back on all cosmetics 28–29 Mar 2026** (hagkaup.is/grein/takk-free-dagar-mars).
- **Basket-level?** No — earning is per product; the only basket-level rule is proportional reduction when part of the basket is paid with tkr/inneignarnóta.
- **1 tkr = 1 ISK**, no cash-out, no transfer, all-balance redemption, 2-year expiry (day after two years from earning).

### 3.3 Traction [P/V]
- 20,000 sign-ups in 4 days (Heimildin, 11 Feb 2026); PassEntry: ">15 % of Iceland's adult population within five days", "41,000+ passes downloaded in month one, 94 % active pass rate" (passentry.com per search snippet, not opened).
- „Takkarar eru nú orðnir tæplega 60 þúsund“ (Hagar FY 2025/26 results, 16 Apr 2026); „um 65.000 manns“ (mbl.is 29 Jun 2026); „Yfir 65 þúsund“ (RÚV 24 Sept 2026); Q2 2026/27 (15 Oct 2026): „Vildarfélögum í Takk heldur áfram að fjölga“ (no number).
- Hagar frames Takk as a data/CRM asset: „gerir það okkur kleift að skilja betur þarfir viðskiptavina og sníða þjónustu og vöruval“ (Finnur Oddsson); RÚV: Sesselía Birgisdóttir — „Þetta er standardinn í dag“; no differential pricing, but „til stendur að klæðskerasníða markaðsskilaboð“.

### 3.4 Marketing [V/P]
National campaign (print, digital, OOH, TV) with the "showman" character; YouTube @Takk_kronur, Instagram @takk_kronur, Facebook page; in-store ESL labelling + self-checkout prompt; "Opnunartilboð Takk eru sérlega vegleg".

---

## 4. Tech & vendors

| Layer | Vendor / tech | Evidence |
|---|---|---|
| Consumer app design + build | **Júní** (juni.is, Reykjavík/Stockholm) — "App hönnun, Forritun"; stack **React Native, NestJS – GraphQL API**; built a middle layer linking the loyalty engine to „efnis- og vörustjórnunarkerfi“ (CMS + PIM); co-designed the "greiðsluflæði vildarkerfisins" with Hagar's tech team so points are awarded correctly for in-store and online purchases; user-tested with Hagar. Júní also built hagkaup.is, olis.is, bananar.is. Testimonial by Eiður Eiðsson, "Framkvæmdastjóri stafrænnar þróunar og upplýsingatækni hjá Högum". | https://www.juni.is/verkefni/takk [V] |
| Wallet pass + terminal tap | **PassEntry** (London) **PassTap™** — NFC passes in Apple Wallet & Google Wallet, "direct payment-reader integrations", "integrates seamlessly with Hagar's existing point-of-sale infrastructure"; PassEntry also powers Hagar's earlier **Olís** fuel loyalty (search snippet) and Icelandic clients Blue Lagoon, Sky Lagoon, Blue Car Rental, Arctic Adventures, TourDesk. | natlawreview.com press release 31 Mar 2026; retailtechinnovationhub.com 31 Mar 2026 [P] |
| Loyalty ledger / rules engine | Not disclosed. [I] Likely Hagar in-house or PassEntry "Loyalty" module + Júní middleware; Hagar's "tækniteymi" owns the payment-flow integration. |
| POS / payment terminals | Not disclosed. The pass is read by the **payment terminal** (posi) itself, not a separate scanner, and the self-checkout UI has a Takk "Innskrá" button → deep POS integration on both the SCO software and the PED. No acquirer (Valitor/Rapyd/Teya/Straumur) is named anywhere. [V absence; I] |
| Card-linking | **None.** |
| Website | Next.js (App Router, i18n), Tailwind v4, Base UI, Lottie, Vimeo, **Prismic** CMS (`project-takk`), GTM, CookieHub, Meta Pixel. Likely built by Júní too (same Prismic pattern as juni.is `juni-verse`) [I]. |
| Online shops | hagkaup.is and eldumrett.is expose a "Tengja Takk aðgang" e-ID link flow; tkr credited post-delivery. |
| Public API | None found (no developer docs, no partner portal). PassEntry has a public API (docs.passentry.com) but that is the vendor's, not Takk's. |
| Analytics / privacy labels | iOS: Contact info (name, email, phone), User ID, Device ID, product-interaction usage data, crash/perf diagnostics — linked to identity, used for marketing, analytics and functionality. Play: "may share Personal info with third parties", encrypted in transit, deletion on request. |

---

## 5. Terms & privacy (https://www.takkkronur.is/skilmalar) — version 1.1, gildir frá 1. janúar 2026 [V]

Key rules, verbatim where useful:
- Controller: „Við erum Hagar hf., Holtavegi 10, Holtagörðum, 104 Reykjavík.“ Service „einungis veitt á Íslandi“.
- Mechanism: „Til þess að nota vildarkerfið er smáforritið notað til að bæta við korti í veski í snjalltækinu og því framvísað þegar greitt er fyrir vöru.“
- Legal basis: **consent** only — „Við byggjum alla okkar vinnslu persónuupplýsinga um þig á samþykki þínu sem þú veitir með því að velja „Samþykkja skilmála““.
- Data: contact info (name, phone, email), identifier (phone number or kennitala via e-ID), birthday (for birthday offers), optional demographics, **purchase history** (every identified in-store purchase + linked web purchases: „hvaða vörur þú keyptir, hvar, hvenær og á hvaða verði“), usage analytics, device diagnostics. Pseudonymised: random ID, **postal code looked up from Þjóðskrá by kennitala**, **gender from Þjóðskrá**, age band (≥5 years) — „til að fá innsýn í kauphegðun hópa fólks“.
- Sharing: to participating companies „í þeim tilgangi að þau geti framkvæmt þær afsláttarfærslur“, and to processors under DPAs.
- Retention: while account is active; then until tkr expire; then bookkeeping law „minnst 7 ár en ekki lengur en í 10 ár“; kennitala not kept after processing.
- Deletion: in-app under „Stillingar“ or by email; „Aðgangur eyðist ekki við það eitt að fjarlægja smáforritið“; personal data erased within 3 months. Deleting the account forfeits all tkr.
- tkr nature: „hafa ekkert sjálfstætt gildi fyrir utan vildarkerfið og er hvorki framseljanleg né hægt að fá greidda út í peningum eða nota sem neins konar greiðslumiðil.“
- No earning on tkr/inneignarnótu-paid portion: „Tkr. safnast ekki af þeim hluta af kaupum sem tkr. eða inneignarnótur eru notaðar í.“
- Expiry: „sérhver tkr. rennur út og verður verðlaus með öllu daginn eftir að tvö ár hafa liðið frá því að þeirra var aflað.“
- Account is personal: „Þú mátt ekki leyfa öðrum að nýta smáforritið þitt eða vildarkjör þín … óheimilt að skrá þig með smáforriti þínu fyrir viðskiptum sem aðrir eiga við okkur.“
- Hagar may change or shut down the scheme „án þess að tilkynna það sérstaklega“ and cancel earned benefits; partners may join/leave without notice.
- No liability for misuse of your account by others; user must report unauthorised use „án tafar“.
- Returns: handled like any other product (website FAQ); terms contain no refund clause.
- Reverse-engineering / copying the app prohibited.
- Rights: access, rectification, erasure, portability, restriction, objection (lög nr. 90/2018, 17., 20., 21. gr.); complaints to Persónuvernd (Laugavegi 166, 105 Reykjavík, postur@personuvernd.is).
- Law & venue: íslensk lög; héraðsdómur Reykjavíkur. Contact: takk@takkkronur.is.
- Changes notified via SMS/email and must be re-accepted in-app.

---

## 6. App Store / Play screenshots (described) [V]

iOS (5 shown, 460×996 captured), all on light lavender background with purple "takk" logo pill at top and a bold black Solar headline above a tilted iPhone mock:
1. **„Fáðu Takk krónur til baka!“** — home screen (greeting "Takk Sóley", 3D coins, balance 16.965 tkr., Safnað frá upphafi 32.400 tkr., "Takk í dag" cards Croissant 499 kr. 20 tkr / Berjablanda 779 kr. 70 tkr) with a push banner „Til hamingju! Þú safnaðir 463 Takk krónum“.
2. **„Takk kortið fer beint í símann“** — the dark-purple Wallet pass (name Sóley Uggadóttir, NFC icon).
3. **„Notaðu Takk krónurnar“** — Mitt Takk screen.
4. **„Fáðu einstök tilboð“** — Önnur tilboð (Eldum rétt 2f1, 70 tkr, Páskaborgari 20 %).
5. **„Fylgstu með viðburðum“** — Viðburðir (Takkleikar, 28. mars 18:00).
Play adds **„Safnaðu Takk krónum hjá Bónus, Hagkaup og Eldum rétt“** — Takk vörur screen (Berjablanda 69 tkr, Vitamín 23 tkr, "20 Grill-vörur" banner). iPad screenshots exist (`ipad-01…07.png`).

---

## 7. Press & third-party coverage (chronological)
- 14 Jan 2026 — Hagar PR „Hagar gefa út vildarkerfið Takk“ (hagar.is; mirrored by DV, vb.is, mbl.is „Hagar stofna sinn eigin vildarklúbb“, akureyri.net 19 Jan). Quotes Sesselía Birgisdóttir (forstöðumaður viðskiptavildar, upplifunar og miðlunar) and Finnur Oddsson (forstjóri).
- 14 Jan 2026 — bonus.is „Vertu með í Takk!“ and hagkaup.is „Vertu með í Takk!“ (same copy; list partners „Glans, Lemon, Olís og Grill66“).
- 11 Feb 2026 — Heimildin „Netverjar óánægðir með Takk krónur: „Lækkið bara verðið““ — 20k sign-ups in 4 days, #1 in both stores; complaints: „lítill sem enginn afsláttur“ (Vertu á verði member) and Þjóðskrá lookups.
- 31 Mar 2026 — PassEntry press release (EIN Presswire / natlawreview.com) and RTIH article.
- 16 Apr 2026 — Hagar FY 2025/26: „Takkarar … tæplega 60 þúsund“, „töluvert umfram það sem gert var ráð fyrir“.
- 29 Jun 2026 — mbl.is „65.000 manns hafa skráð sig í Takk“ (403 to fetch; per snippet: savings vary with how well people follow offers).
- 3–8 Sept 2026 — mbl/DV/Vísir/hagar.is „Meira til baka með Takk í Bónus og Hagkaup“: fixed Hagkaup categories, Topp tilboð (6 per chain, 1–2 weeks), 2,000+ Takk products, Olís services.
- 24 Sept 2026 — RÚV „Vildarkerfi sem safna upplýsingum um kúnnann eru krafa nútímans“ (podcast „Þetta nútímalíf“ with Sesselía, Valdimar Sigurðsson (HR) and Þórarinn Stefánsson (Neytendasamtökin)).
- 15 Oct 2026 — Hagar Q2 2026/27: members still growing; „nýjar útfærslur skapa fleiri tækifæri“.

---

## 8. Implications / cribs for VILD (restaurant cashback) — [I]
1. **Identity:** rafræn skilríki-only login gave Takk instant KYC-grade identity and kennitala-based demographics, but it is the #1 login complaint and a privacy lightning rod. Consider e-ID as an option, not the only path.
2. **Earn trigger:** Takk's tap-the-pass-on-the-PED model needs deep POS/PED integration (PassEntry PassTap + Hagar's own POS). For independent restaurants with heterogeneous POS, a card-linked or QR/receipt model will be far cheaper — but note Takk deliberately avoided QR ("no QR codes to scan") and users still complained about an extra step.
3. **Wallet pass with live balance** is a strong retention surface (lock-screen relevance, no app open). PassEntry/Google Wallet/Apple Wallet pass with a `balance` field is replicable.
4. **Unit of value:** "1 tkr = 1 kr" and whole-number "70 tkr til baka" badges are simpler than percentages; Takk mixes fixed-amount per product with % categories. Expiry 24 months; all-balance redemption; no earn on the redeemed portion.
5. **Content cadence:** weekly drops, 1–2 week validity, "Topp tilboð" (6 at a time) — a predictable merchandising rhythm worth copying for restaurants (e.g. "Réttur vikunnar").
6. **Partner offers tier:** non-cashback partner deals (2f1, time-windowed "Alla virka daga á milli 16–18", "Nýta tilboð" button) sit in a separate tab — directly transferable to restaurant happy-hour mechanics.
7. **Store-tinted UI:** selecting a merchant recolours the screen and badges in the merchant's brand colour — a cheap way to make a multi-merchant app feel co-branded.
8. **Trust copy:** Takk's FAQ is explicit on timing ("nokkrar mínútur"), partial payment maths, and what does not earn. Reviews show people churn when the expected value is unclear ("3-400 kr af 15-35 þús kr innkaupum"); set expectations on earn rates up front.
