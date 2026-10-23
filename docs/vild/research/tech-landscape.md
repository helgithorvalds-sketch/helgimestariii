# VILD — Technical & Partnership Landscape (Iceland)

Research date: 23 October 2026. Scope: POS systems, card-linked/payment-side integration, Apple/Google Wallet, Icelandic eID, legal/financial treatment of closed-loop credit, and app distribution for a TAKK-style "krónur til baka" app for restaurant chains.

Method: web search (Icelandic + English) and direct reads of vendor, regulator and statute pages. Every fact carries a URL. Where I could not verify something, it is marked **[unverified]** or **[inference]**. Althingi.is blocks automated fetches (Cloudflare); statute quotes come from the University of Iceland mirror (lagasafn.hi.is), which has the same text with some character-encoding damage.

---

## Executive summary (the five things that matter)

1. **TAKK is not a QR app — it is an NFC wallet pass tapped on the payment terminal.** Hagar's TAKK (launched 14 Jan 2026, ~60k members by April 2026) uses PassEntry's "PassTap" module: a loyalty pass in Apple Wallet / Google Wallet that the customer taps on the card terminal, integrated into Hagar's existing POS (LS Central at Bónus). Earning and redemption happen in the same card transaction. The app itself was built by Júní (React Native + NestJS/GraphQL). Login is via rafræn skilríki. This is the bar VILD is being compared to. Sources: [takkkronur.is](https://www.takkkronur.is/), [RTIH on PassEntry/Hagar](https://retailtechinnovationhub.com/home/2026/3/31/icelandic-retailer-hagar-connects-with-passentry-for-launch-of-takk-digital-loyalty-programme), [Júní case](https://www.juni.is/verkefni/takk), [Hagar Q4 2025/26](https://www.hagar.is/um-haga/frettir/tilkynningar/stjornendauppgjor-haga-2025-26-og-uppgjor-4-arsfjordungs/).

2. **The Icelandic restaurant POS market has consolidated around a few cloud vendors, and the one with a public API is Noona (ex-SalesCloud, now owned by Síminn/Síminn Pay).** Upsell (Subway, Serrano, Te & Kaffi, 50+ restaurants), Resto, Dineout, dk POS and Noona/SalesCloud are the realistic targets. Only Noona publishes a developer portal with OAuth, webhooks and "Credit wallets"/"Vouchers" resources ([docs.noona.is](https://docs.noona.is/)). dk has a REST API for the accounting layer, not the till ([dk vefþjónustur](https://www.dk.is/vefthjonustur)). Upsell and Resto publish no API.

3. **Card-linked detection via acquirers or banks is not a viable primary path in Iceland.** Teya, Rapyd and Straumur (Adyen) expose terminal-integration APIs to the *merchant's POS*, not transaction feeds to third parties. Visa Offers Platform / Fidel-style card-linking has no confirmed Icelandic coverage (Fidel's live markets exclude Iceland). PSD2 AIS access via Enable Banking covers Arion, Íslandsbanki, Landsbankinn, Kvika and indó, but requires an AISP licence/agent status and continuous user consent, and Persónuvernd's kennitala/necessity tests make bank-transaction surveillance for loyalty a hard sell.

4. **The cheapest credible "pay/identify with your phone" flow for a startup in 2026 is: wallet pass with QR/barcode first (no Apple approval needed), NFC (Apple VAS + Google Smart Tap) second via a certified pass provider (PassEntry, PassKit, etc.) once a chain's terminals and POS support VAS.** Apple's NFC certificate is discretionary and takes 4+ weeks; it also requires VAS-certified terminals *and* POS software that supports "VAS Only"/"Payment and VAS" modes ([Apple loyalty passes](https://developer.apple.com/wallet/loyalty-passes/)).

5. **Closed-loop credit (inneign) spent only at the issuing chain's restaurants is outside the e-money and payment-services acts under the "limited network" exclusion — but only while VILD is single-chain-per-balance.** Act 17/2013 art. 2(a) and Act 114/2021 art. 2 items 11–12 exclude instruments usable only at the issuer's premises or within a limited network under a commercial agreement; above EUR 1m/12 months you must notify the FME (now Seðlabanki) under art. 38 ([lagasafn.hi.is/2013017](https://lagasafn.hi.is/2013017.html), [lagasafn.hi.is/2021114](https://lagasafn.hi.is/2021114.html)). A pooled, cross-chain balance would likely need an EMI/bank partner. TAKK krónur are not sold for cash (earned only), which also keeps them outside the e-money definition ("issued on receipt of funds"). For the merchant, earned credit is a deferred discount (IFRS 15 material right / contract liability), not revenue; VAT is on the actual consideration at redemption.

---

## A. Icelandic POS systems ("kassakerfi") for restaurants and chains

### A.1 Vendor map (who is still standing in 2026)

| Vendor | What it is | Ownership / status | Public API? | Loyalty features | Payment terminals |
|---|---|---|---|---|---|
| **Noona HQ (formerly SalesCloud)** | Cloud POS for service businesses + separate restaurant POS, bookings, kiosks, QR ordering | Noona Labs acquired SalesCloud 27 Feb 2024 (SalesCloud had ~300 customers, SaltPay/Teya had invested 500m ISK in 2022). Síminn bought Noona Iceland Dec 2024; **Síminn Pay runs it**. salescloud.is now redirects to noona.app. | **Yes** — [docs.noona.is](https://docs.noona.is/): OAuth 2.0 HQ API with Companies, Customers, Sales, Transactions, Products, Payments, Vouchers, Promocodes, **Credit wallets**, Webhooks; app marketplace. | "Vildarkerfi" listed under Customers | Teya terminals via "Connect terminal" ([Teya help](https://help.teya.com/hc/is/articles/43101911872529-Tenging-vi%C3%B0-Noona)) |
| **Upsell** | Android/Sunmi restaurant POS, online ordering, kiosks, KDS, chain mode ("tuttugu staðir sem hegða sér eins og einn") | Independent, Icelandic | No public API found; "Samþættingar" page exists but no developer docs | Vildarkerfi + gift cards + upsell listed under "Auka sölu" | Teya, Rapyd, Landsbankinn, Verifone; Wolt and AHA delivery |
| **Resto** | Icelandic restaurant POS, KDS, kiosk, QR ordering, Tap to Pay (via Adyen) | Independent | No public API; integrations: Teya, Adyen, dk, Regla, Payday, Apaleo, Mews, Easytable, Origo | None mentioned; "customer account"/house account only | Adyen (Tap to Pay), Teya |
| **Dineout** | Reservations marketplace + POS, ordering; Nova owns 20% | Dineout ehf, Reykjavík | Not found | — | — |
| **dk POS (Windows) / dk POS App** | POS tied to dk accounting | dk hugbúnaður | REST API for the accounting layer (dk Plus: invoices, orders, stock; Swagger at api.dkplus.is), **not** a till/loyalty API | None documented | Card-company web service for settlement import; Straumur lists dk as a supported POS |
| **Regla** | Cloud accounting + POS/kitchen | Joined Finago | Not researched in depth | — | Straumur lists Regla |
| **LS Retail / LS Central** | Enterprise retail/hospitality ERP-POS (Microsoft Dynamics 365 BC) | HQ Kópavogur; Axcel agreed to buy from Aptos Dec 2025 | Yes (BC APIs), enterprise-grade | Full loyalty/member management built in | LS Pay (Teya, others) |
| **Straumur "Posi"** | Adyen-based terminals with a built-in menu feature; connects to dk, LS Pay, SmartPOS (Wise), Regla | Kvika subsidiary | Terminal API = Adyen Terminal API (cloud or local) | — | Adyen |
| **Tölvulistinn, Lightspeed, Yess, Tokenwise, Tilboð, Sunday, Smartpay** | Searched; no meaningful Icelandic restaurant footprint found for any of these names as POS vendors **[unverified]** | | | | |
| **Ordr (ordr.is)** | Could not find an Icelandic "ordr.is" POS; results point to Norwegian Ordr (ordr.tech/ordr.menu) with no Iceland presence **[unverified]** | | | | |

Sources: [Noona kaupir SalesCloud (mbl)](https://www.mbl.is/vidskipti/frettir/2024/02/27/noona_kaupir_salescloud/), [Síminn kaupir Noona](https://www.siminn.is/frettir/siminn-kaupir-noona-a-islandi), [Noona er allt í eigu Símans (mbl)](https://www.mbl.is/vidskipti/frettir/2024/12/11/noona_er_allt_i_eigu_simans/), [Salescloud verður Noona](https://noona.app/hq/is-is/salescloud/), [SalesCloud fær 500m frá Saltpay (DV)](https://www.dv.is/eyjan/2022/02/04/salescloud-faer-500-milljon-krona-fjarmognun-fra-saltpay), [Upsell kassakerfi](https://upsell.is/vorur/kassakerfi), [Upsell EN](https://upsell.is/en), [Resto](https://resto.is/en), [Dineout solutions](https://www.dineout.is/solutions/is), [Dineout/Nova](https://arcticstartup.com/dineout-gets-investment-from-nova/), [dk POS](https://www.dk.is/vorur/lausnir/kassakerfi), [dk vefþjónustur](https://www.dk.is/vefthjonustur), [Straumur posar](https://www.straumur.is/posar), [Straumur POS docs](https://skjolun.straumur.is/pos/overview), [LS Retail/Bónus](https://www.lsretail.com/customers/bonus), [Noona docs webhooks](https://docs.noona.is/docs/webhooks), [Noona HQ API](https://docs.noona.is/docs/hq).

Pricing data points: Resto 39,000 ISK/venue/month + 2,500 ISK per extra device (ex VAT) ([resto.is](https://resto.is/en)). Noona/Upsell: quote-based.

### A.2 Which chains use what (findable evidence only)

| Chain | Evidence |
|---|---|
| Subway Ísland, Serrano, Te & Kaffi | Named as Upsell customers on upsell.is ("Subway, Te og kaffi, Serrano and 50+ restaurants") — vendor claim ([upsell.is/en](https://upsell.is/en)) |
| Bónus (Hagar) | LS Central since 1996 via partner NVL; self-scanning 2022 with Zebra/Datema ([LS Retail](https://www.lsretail.com/customers/bonus), [Datema](https://www.datemaretail.com/articles/bonus-selfscanning)) |
| Domino's Ísland (Pizza Pizza ehf) | Own ordering app built by Stokkur (package id `is.stokkur.dominos`); third-party listings mention a rewards program **[unverified]** ([Google Play](https://play.google.com/store/apps/details?id=is.stokkur.dominos)) |
| Hamborgarafabrikkan, Saffran, Shake&Pizza, Aktu Taktu, Blackbox, American Style, Eldsmiðjan, Pítan, Roadhouse, Keiluhöllin | All part of **Gleðipinnar** group (Samkeppniseftirlitið approved 2025) — one procurement decision covers ~10 brands; POS vendor not public ([veitingageirinn.is](https://veitingageirinn.is/gledipinnar-fa-graent-ljos-fra-samkeppniseftirlitinu/)) |
| Gló | Closed; Saffran took over venues, brand lives on ([veitingageirinn.is](https://veitingageirinn.is/veitingastadurinn-glo-haettir-starfsemi/)) |
| Lemon | Operated by Djús ehf; **Hagar owns 49%**; Lemon mini and Grill 66 run inside Hagar-owned Olís stations; Lemon and Grill 66 already appear as offer partners inside TAKK ([Hagar ársskýrsla 2022](https://www.hagar.is/arsskyrsla-2022/um-haga/), [SKE 25/2021](https://en.samkeppni.is/media/akvardanir-2021/Akvordun_Hagar-Lemon_25_2021.pdf), [takkkronur.is](https://www.takkkronur.is/)) |
| KFC Ísland, Metro, Hlöllabátar, Aktu Taktu | No POS information found **[unverified]** |

### A.3 How third-party loyalty hooks into Icelandic tills today

- **NFC pass tap on the card terminal (TAKK model).** Customer taps the wallet pass on the payment terminal (self-checkout: tap the "Takk" logo on screen, hold phone to terminal; staffed: cashier activates Takk, customer taps). Earning posts to the app "within a few minutes"; redemption is chosen in the payment menu ("Greiða með Takk krónum") and confirmed on the terminal; 1 tkr = 1 ISK; two-year expiry; no earning on the part paid with inneignarnóta. ([takkkronur.is](https://www.takkkronur.is/)). PassEntry: "tap to pay, tap to earn, tap to redeem"; ">15% of Iceland's adult population joined within five days" ([RTIH](https://retailtechinnovationhub.com/home/2026/3/31/icelandic-retailer-hagar-connects-with-passentry-for-launch-of-takk-digital-loyalty-programme)).
- **Terminal integration APIs (POS ↔ terminal), not loyalty APIs.** Teya POSLink (cloud) has endpoints such as `GET /poslink/v3/payment-requests/{id}/receipt-text`, store/terminal configs, ePOS registration ([ex_teya PR #45](https://github.com/sgerrand/ex_teya/pull/45), [docs.teya.com](https://docs.teya.com/)); Rapyd/Valitor "POS CloudLink" ([specs.valitor.is](https://specs.valitor.is/)); Straumur = Adyen Terminal API cloud/local, test access via posar@straumur.is ([skjolun.straumur.is/pos/overview](https://skjolun.straumur.is/pos/overview)). None of these documents a loyalty/VAS field for third parties; Adyen's Terminal API does support VAS/loyalty data in `PaymentRequest` **[inference from Adyen docs; not verified for Straumur]**.
- **POS-native customer lookup / QR scan.** Noona HQ API: Customers, Sales, Transactions, Vouchers, Promocodes, Credit wallets; webhooks created per app with read scopes (e.g. `customer.created` needs `customers:read`) ([docs.noona.is/docs/webhooks](https://docs.noona.is/docs/webhooks)). Exact event list and whether sale line items are exposed is not on the public landing pages **[unverified — ask Noona]**.
- **Phone-number lookup.** Common in Icelandic consumer apps (Netgíró, Domino's requires Icelandic phone number). No POS vendor documents it as a loyalty identifier **[unverified]**.

### A.4 What this means for VILD

- Build the **ledger and identification layer independent of any POS**, then integrate per chain in this priority: (1) Noona HQ API (OAuth app + webhooks on sales/transactions, write to Credit wallets or Vouchers) because it is the only documented API and Síminn Pay now owns it; (2) Upsell (partner conversation — they already claim a vildarkerfi and serve Subway/Serrano); (3) Resto; (4) LS Central/dk for the larger groups. Expect bespoke, commercial partnership work for every one of them.
- Treat Gleðipinnar (10 brands, one owner) and Upsell's customer list as the two highest-leverage conversations.
- Hagar is already extending TAKK into restaurants it part-owns (Lemon, Grill 66). Expect Hagar/Olís to be a competitor, not a partner.
- Don't promise automatic earning on day one. A credible MVP is: QR/barcode wallet pass or in-app code shown at the till, cashier scans/enters it, POS (or a VILD web console for the cashier) posts the receipt total to VILD, VILD credits the balance. Redemption = VILD-issued single-use voucher code the POS accepts as a tender/discount.

---

## B. Card-linked offers and payment-side integration

### B.1 Acquirers / PSPs

| Provider | Status | Developer surface | Transaction webhooks for third parties? |
|---|---|---|---|
| **Teya** (ex SaltPay/Borgun) | Acquired Borgun 2020; rebranded 2023 | [docs.teya.com](https://docs.teya.com/): POSLink API, ePOS SDK (apps on the terminal), Online Payments API, hosted checkout, payment links; webhooks configured in Business Portal for the *merchant's* transactions ([Teya help](https://help.teya.com/hc/en-gb/articles/47742512702353-Build-a-custom-integration-with-Teya)) | Only to the merchant's own integration. No published card-linked loyalty product; Teya blog talks about loyalty at tap but documents no API ([Teya blog](https://www.teya.com/blog/loyalty-programs-pos)) |
| **Rapyd** (ex Valitor, ex Korta) | Valitor bought from Arion 2021/22 for ~$100m; Iceland is Rapyd's "European hub"; Tap to Pay extended to Iceland 2025 | [specs.valitor.is](https://specs.valitor.is/): ValitorPay, Hosted Checkout, POS CloudLink, Boarding, Reconciliation, Reports; Rapyd global API | Reconciliation/reports exist for partners (ISO/PayFac), not consumer-consented card linking **[inference]** |
| **Straumur** (Kvika) | Launched 2023 with Valitor's former sales agents; processing on Adyen; "99.999% uptime"; Apple Pay/Google Pay added without new integration | [skjolun.straumur.is](https://skjolun.straumur.is/): Payment Gateway, Hosted Checkout, Payment Links, Webhooks (Authorization event), POS = Adyen Terminal API; developers@straumur.is | Merchant-scoped only |
| **Síminn Pay** | Wallet app with merchant offers, Léttkaup BNPL, parking; now owns Noona Iceland; bought Greiðslumiðlun Íslands 2026; loan book 4.2bn ISK | No public API found | Offers are in-app (2-for-1 etc.), i.e. a **potential distribution partner** rather than a data source ([Google Play](https://play.google.com/store/apps/details?id=is.siminn.siminnpay), [Síminn Q2 2026](https://www.globenewswire.com/news-release/2026/08/19/3347872/0/is/s%C3%ADminn-hf-afkoma-annars-%C3%A1rsfj%C3%B3r%C3%B0ungs-2026.html)) |
| **Aur / Netgíró** (Kvika) | Merger reviewed by Samkeppniseftirlitið (decision 9/2025) | Netgíró merchant checkout (phone number + app confirm) | None public |
| **Kass** | Appears only in 2018-era market lists; current status not confirmed **[unverified]** | — | — |

Sources: [Rapyd/Valitor (Finextra)](https://www.finextra.com/newsarticle/38393/rapyd-to-acquire-icelands-valitor-for-100-million), [Globes](https://en.globes.co.il/en/article-rapyd-buys-icelandic-payment-solutions-co-valitor-1001376747), [Straumur/Kvika](https://kvika.is/frettir/nyr-straumur-i-grei%C3%B0slumi%C3%B0lun/), [Straumur FAQ](https://www.straumur.is/algengar-spurningar), [SKE 9/2025 Netgíró–Aur](https://en.samkeppni.is/media/akvardanir-2025/Akvordun-9-2025.pdf).

### B.2 Card-network card-linked offers

- **Visa Offers Platform (VOP)**: near-real-time VisaNet authorization/settlement stream; Users API (enroll consented cardholders), Merchants API, transaction subscriptions; "can only be provided to Customers operating their program based on explicit cardholder consents" ([developer.visa.com/capabilities/vop](https://developer.visa.com/capabilities/vop)). Access is via Visa partnership, typically through an aggregator; no Icelandic deployment found.
- **Mastercard**: developer catalogue lists a "Personalized Card Linked Offers" API; the "Enhanced Transaction Data"/loyalty pages could not be fetched (404) **[unverified]** ([Mastercard API index](https://static.developer.mastercard.com/content/mcapi/home/index.html)).
- **Fidel API** (the usual aggregator for Visa/MC/Amex card linking): live markets are US, UK, Ireland, Canada, Sweden, Norway, Finland (Denmark on one blog), **Iceland not listed** ([docs.fidel.uk](https://docs.fidel.uk)).

### B.3 Open banking (PSD2 AIS) in Iceland

- PSD2 fully effective in Iceland 1 May 2022. Enable Banking covers **Arion, Íslandsbanki, Landsbankinn, Kvika, indó**; all redirect flows except indó (decoupled push approval); auth via SIM eID or Auðkenni app; Arion requires the end-user's ID up front; Landsbankinn savings accounts are not reachable ([Enable Banking Iceland](https://enablebanking.com/docs/markets/is/)). Landsbankinn runs its own developer portal (PSD2 AIS/PIS, data APIs, legacy B2B) ([developers.landsbankinn.is](https://developers.landsbankinn.is/)) — JS-rendered, so contents not verified here.
- Tink, GoCardless/Nordigen, Neonomics: **no confirmed Icelandic bank coverage** **[unverified]**.
- Using AIS to detect restaurant purchases requires: an AISP licence (or operating as agent of one, e.g. Enable Banking's licence), 90/180-day re-consent cycles, and merchant-name matching on bank transaction strings — fragile for card transactions that settle under acquirer descriptors.

### B.4 Data-protection constraints (Persónuvernd / GDPR)

- Act 90/2018 art. 13: kennitala may be used only when it has a legitimate purpose (málefnalegur tilgangur) **and** is necessary for secure identification; Persónuvernd can prohibit or order its use ([Act 90/2018](https://www.althingi.is/lagas/156a/2018090.html), [Persónuvernd guidance](https://island.is/s/personuvernd/notkun-kennitalna)).
- Persónuvernd's own examples: asking for kennitala in cash transactions "may be considered unjustified"; the purpose test fails unless name, address or customer number are insufficient; store-credit-note case ended with the retailer dropping kennitala for name+address+photo ID ([Kennitölur á inneignarnótum](https://island.is/s/personuvernd/ymis-bref/167)); IKEA was allowed kennitala for special-order goods because they were not ordinary cash sales ([IKEA decision](https://island.is/s/personuvernd/urskurdir-akvardanir-og-alit/1177)).
- Bank-transaction scraping for loyalty is "profiling" of financial data; lawful basis would have to be explicit consent, and data minimisation (GDPR art. 5(1)(c)) argues against pulling full account history to find burger purchases. No Persónuvernd decision on vildarkerfi was found **[gap]**.

### B.5 What this means for VILD

- **Do not build on card-linking or open banking in Iceland.** No acquirer offers consumer-consented transaction feeds to third parties, Visa/Fidel have no Icelandic footprint, and AIS brings licensing, re-consent friction and a Persónuvernd risk profile that is disproportionate for a loyalty app.
- The payment side is still useful in two narrower ways: (1) **Straumur/Adyen terminals** are the most promising for *VAS* (Adyen is on Apple's certified VAS POS list), so chains on Straumur are the best NFC candidates; (2) **Síminn Pay** (owner of Noona) is a plausible distribution/co-marketing partner, not a data partner.
- Identification should be by VILD's own customer ID (pass serial / QR), never by kennitala at the till; use rafræn skilríki only at signup to bind the account to a verified person (that is a defensible "secure identification" purpose, same as TAKK).

---

## C. Apple Wallet / Google Wallet

### C.1 Apple Pay (payments inside the VILD app or web)

- Apple Pay launched in Iceland May 2019 (Arion, Landsbankinn first); Íslandsbanki, Kvika and sparisjóðir are now listed by Apple ([Apple participating banks](https://support.apple.com/en-us/109516), [MacRumors 2019](https://www.macrumors.com/2019/05/08/apple-pay-launches-in-iceland/)).
- Requirements: Apple Developer Program (organization), a **Merchant ID** (never expires, reusable), a **Payment Processing Certificate** (expires after 25 months) created from the PSP's CSR, separate test/live merchant IDs, HTTPS/TLS 1.2+, domain verification for Apple Pay on the Web ([Apple: managing payment processing certificates](https://developer.apple.com/documentation/appstoreconnectapi/managing-payment-processing-certificates), [Adyen Apple Pay cert](https://docs.adyen.com/payment-methods/apple-pay/apple-pay-certificate/web.json)).
- PSPs with Icelandic acquiring that advertise Apple Pay/Google Pay: Straumur (via Adyen, "without new integration work") ([Straumur FAQ](https://www.straumur.is/algengar-spurningar)); Rapyd supports Apple Pay in general but Iceland enablement is account-dependent **[unverified]**; Teya hosted checkout documentation seen does not mention Apple Pay **[unverified]**.
- Relevance: VILD itself does not need to take payments for the core loop (customers pay the restaurant). Apple Pay matters only if VILD sells top-ups or gift credit — see section E before doing that.

### C.2 PassKit / Wallet passes (the identification layer)

- Pass = signed `.pkpass` bundle (pass.json + images + manifest + signature) signed with a **Pass Type ID certificate** from your developer account; expired cert → existing passes keep working but no new passes/updates; revoked → passes stop working ([Apple Wallet get started](https://developer.apple.com/wallet/get-started/)).
- `storeCard` style is the right type for a balance card: shows balance field, barcode (QR/Aztec/PDF417/Code128), back-of-pass fields, location/time-based lock-screen relevance.
- **Live balance / push updates**: pass.json carries `webServiceURL` + per-pass `authenticationToken` (≥16 chars); your server implements register-device, get-serial-numbers (`passesUpdatedSince`), get-latest-pass (`If-Modified-Since`), unregister and log endpoints; on balance change send an **empty APNs push** (topic = pass type ID, auth with the Pass Type ID cert) and the device re-fetches the pass ([Apple: adding a web service to update passes](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes)). (The Apple doc page did not render for me; the endpoint list above is from the well-known spec — verify against the live doc.)
- Users can add passes from the app, email or web without installing the app; "Add to Apple Wallet" badge guidelines apply.
- **NFC passes (Apple VAS)**: require an **NFC certificate** requested via the PassKit contact form; Apple reviews use case at its discretion (loyalty, membership, tickets, coupons approved; access control not), minimum ~4 weeks reported; the `nfc` dictionary (message + `encryptionPublicKey`, ECC P-256) is ignored by devices if the pass is not VAS-signed ([Apple loyalty passes](https://developer.apple.com/wallet/loyalty-passes/), [Apple forum thread](https://developer.apple.com/forums/thread/769877), [PassKit help](https://help.passkit.com/en/articles/10552911-getting-your-nfc-credentials), [Instacart note on 4-week minimum](https://docs.instacart.com/storefront/enhance_your_storefront/loyalty_programs/loyalty_integrators/passkit)).
- Apple's three mandatory certified components for VAS loyalty: (1) the passes (you or a pass provider), (2) **VAS-certified terminals** that already accept Apple Pay, (3) **POS software supporting "VAS Only" and "Payment and VAS" modes**. Modes: One-tap (loyalty appended to payment), Two-tap (identify, then pay updated amount), Rewards-only. Certified pass providers include Airship, Passcreator, **PassEntry**, PassKit, Paytronix, Punchh; certified POS/payment providers include **Adyen**, Verifone Flex, Square, NCR ([Apple loyalty passes](https://developer.apple.com/wallet/loyalty-passes/)).

### C.3 Google Wallet

- Google Wallet Passes API: issuer account + business profile review before production publishing; pass classes/objects created server-side with a service account; loyalty class supports balance/points fields and update via API; Capacitor/Ionic guidance confirms backend creates the object and the app presents a save link/JWT ([Ionic digital passes](https://ionic.io/docs/tutorials/integrations/digitial-passes/introduction)). (Google's prerequisites page returned 404 for my fetch; details are from secondary sources **[verify]**.)
- **Smart Tap** = Google's NFC protocol; requires passes configured for Smart Tap, a collector ID and key pair, and a Smart Tap-capable terminal from a listed provider (Ingenico, PAX, Verifone, Sunmi, Castles, NEXGO, Zebra, etc.); terminal providers must be certified; generally described as more open than Apple (no discretionary entitlement) ([Google Smart Tap overview](https://developers.google.com/wallet/smart-tap/introduction/overview), [Passcreator guide](https://www.passcreator.com/en/blog/what-you-need-to-know-about-nfc-passes-in-apple-and-google-wallet)).
- Apple and Google NFC credentials are separate; support on one does not imply the other.

### C.4 Pass-provider route (what TAKK did)

- PassEntry: no-code dashboard + API, webhooks on scans, Verifone one-tap/two-tap flows, barcode (QR/Aztec/Code128/PDF417) and NFC; pricing: 14-day trial, Pilot £199/month (500 passes), Custom from £200/month, Enterprise by quote; "NFC access can be requested once a plan is live" ([passentry.com/pricing](https://www.passentry.com/pricing), [passentry.com/verifone](https://www.passentry.com/verifone)). PassTap specifics (how Hagar's POS consumes the tap) are not public **[unverified]**.
- Alternatives on Apple's certified list: PassKit (passkit.com), Passcreator, Airship.

### C.5 Realistic "identify/pay with your phone" flow for a startup in 2026

1. **Phase 1 (0–3 months, no approvals):** Apple `storeCard` + Google loyalty pass with QR/Aztec barcode encoding a rotating or static VILD customer token; live balance via APNs/Google API updates; cashier scans with the POS's existing 2D scanner (or VILD's cashier web app on a phone). Redemption: in-app "Nota inneign" generates a single-use voucher code the cashier enters as a tender/discount; VILD debits on confirmation webhook (Noona) or on cashier confirmation.
2. **Phase 2 (per chain, 2–6 months):** POS integration so the receipt total flows to VILD automatically and the voucher is validated via API (Noona first).
3. **Phase 3 (NFC):** Only where the chain's terminals are VAS/Smart Tap capable (Straumur/Adyen is the best bet; Teya and Rapyd terminal VAS status unknown **[ask]**) and the POS vendor will support "Payment and VAS". Go through a certified pass provider (PassEntry/PassKit) rather than seeking your own Apple NFC certificate initially — the provider already holds VAS credentials and reader relationships.
4. **Do not** attempt to issue a payment card or Apple Pay card for the balance — that is e-money (section E) and requires an issuer/BIN sponsor.

---

## D. Electronic ID (rafræn skilríki)

### D.1 Auðkenni (issuer of Icelandic eID)

- Auðkenni issues SIM-based eID, the Auðkenni app (Auðkennisappið) and smart cards; it is the trust service provider all resellers depend on ([audkenni.is](https://www.audkenni.is/upplysingar/rafraen-skilriki)).
- Integration for service providers: three authentication methods; Auðkenni recommends **CIBA** (OIDC backchannel, user enters kennitala, approves in app/SIM) with JWS-signed requests; Postman collections and demo code available; tech docs on Confluence ([Auðkenni docs](https://audkenni.atlassian.net/wiki/spaces/DOC/overview)). Signicat describes the Auðkenni app as supporting OIDC, SAML 2.0 and REST ([Signicat](https://developer.signicat.com/identity-methods/audkenni-app/)).
- **Price list for service providers (valid from 1 March 2026, ex VAT)**: setup 108,000 ISK (includes 2 h setup help, device certificates for a year, first two months' fee); **monthly fee 17,000 ISK**; authentications ("stöðufyrirspurnir") 10.4 ISK each, first 100/month free, discounts to 3.6 ISK above 2m/month; signatures 119 ISK each falling to 83 ISK at volume; optional 110,000 ISK/month tier for small customers wanting tier-5 service levels ([Auðkenni gjaldskrá](https://www.audkenni.is/upplysingar/gjaldskra/thjonustuveitendur-verd)). Service-level description published separately ([Þjónustustigslýsing](https://app.audkenni.is/upplysingar/thjonustuveitendur/thjonustustigslysing)).
- Worked example: 50,000 logins/month ≈ 17,000 + (50,000 × ~10.4 × discount) ≈ 17,000 + ~480,000 ISK/month if every login re-authenticates — so **authenticate with eID once at signup/re-verification and use passkeys/biometrics for daily login**.

### D.2 island.is login (IAS)

- Ísland.is "Innskráning fyrir alla" is available only to A-part public bodies not in competitive activity and municipalities; **private companies and ohf in competition are explicitly excluded**; the old service closed to new registrations May 2023 and shut 1 Sept 2024 (Íslykill login gone). Stafrænt Ísland refers private companies to Auðkenni, Dokobit, Kenni, Origo, Signet, Taktikal and Vettvangur ([island.is innskráningarþjónusta](https://island.is/innskraningarthjonusta), [terms](https://island.is/s/stafraent-island/innskraning-fyrir-alla-terms-and-conditions-stefnur-og-skilmalar-1), [closure notice](https://island.is/frett/eldri-innskraningarthjonusta-island-is-lokar)).

### D.3 Resellers / simpler onboarding

| Provider | What you get | Pricing signal |
|---|---|---|
| **Kenni (kenni.is)** — Aranja Ventures | OIDC/OAuth2 service: first login with rafræn skilríki, then **passkeys** for cheap biometric re-login; developer portal developers.kenni.is; Next-Auth, C#, Java examples; customers RÚV, Lyf og Heilsa, VR, Fons Juris | Subscription; passkey logins cheaper than eID logins; prices not public ([kenni.is](https://www.kenni.is/)) |
| **Dokobit (Signicat)** | eID login + QES; Iceland QES 143–165 ISK + Auðkenni TSP fee per signature; older sheet: setup 45,000 ISK, tiers from 7,500 ISK/month | ([Dokobit Iceland pricing PDF](https://www.dokobit.com/wp-content/uploads/2021/05/Dokobit-E-Signing-Solutions-Pricing-for-Iceland.pdf), [Signicat acquires Dokobit](https://www.signicat.com/press-releases/signicat-acquires-dokobit)) |
| **Signicat** | Auðkenni app + SIM via Signicat's OIDC broker; enterprise pricing, not public | ([developer.signicat.com](https://developer.signicat.com/identity-methods/audkenni-app/)) |
| **Taktikal** | Icelandic: eID authentication API (SIM + app), signatures, SmartFlows onboarding, KYC/AML; customers Sjóvá, TM, Vörður, HR, KPMG | Pricing page /verd, not public ([taktikal.is](https://taktikal.is/)) |
| **Criipto** | Searched; no Icelandic eID method confirmed **[unverified]** | |

### D.4 Legal requirements around kennitala

- Any eID login returns the kennitala. Store it only if you can defend necessity (fraud prevention, one-account-per-person, age gating) under Act 90/2018 art. 13; otherwise hash it or keep it in a restricted table and use an internal customer ID everywhere else (pass serial, QR, POS lookups). Never print it on receipts or show it to cashiers. Persónuvernd's test is stricter than GDPR's general rules (see B.4).
- TAKK precedent: membership requires rafræn skilríki ("Anyone with rafræn skilríki can become a member") ([takkkronur.is](https://www.takkkronur.is/)). Apple's guideline 4.8 explicitly exempts apps using "a government or industry-backed … electronic ID" from the Sign-in-with-Apple requirement (see F).

### D.5 What this means for VILD

- Use **Kenni** (or Taktikal) for the pilot: OIDC drop-in, passkeys for repeat logins, no Auðkenni contract or 108,000 ISK setup until volumes justify going direct. Supabase Auth supports generic OIDC providers, so VILD can add Kenni as a provider without a custom auth server **[inference]**.
- Budget: assume ~15–20 ISK per eID authentication through a reseller **[estimate]** and design the flow so eID is hit once per device, not per session.
- Keep kennitala out of the POS integration entirely.

---

## E. Legal / financial treatment of closed-loop credit ("inneign")

### E.1 E-money and payment-services law

- **Act 17/2013 on e-money** defines rafeyrir as "peningaleg verðmæti, á formi kröfu á útgefanda sem er geymd á rafrænum miðli … gefin út í skiptum fyrir fjármuni, í þeim tilgangi að framkvæma greiðslu" and accepted by parties other than the issuer; issuers must redeem at par on demand; EMI initial capital ≥ EUR 350,000; funds must be safeguarded ([Act 17/2013](https://www.althingi.is/lagas/nuna/2013017.html), mirror [lagasafn.hi.is/2013017](https://lagasafn.hi.is/2013017.html)).
- **Exclusion (art. 2(a))**: the act does not apply to monetary value stored on instruments usable only to buy goods/services at the issuer's premises or, under a commercial agreement with the issuer, within a limited network of service providers or for a limited range of goods and services ("innan afmarkaðs þjónustukerfis þjónustuveitenda" / "takmarkað svið vara og þjónustu").
- **Act 114/2021 on payment services, art. 2 items 11–12** mirror PSD2 art. 3(k): instruments usable only at the issuer's premises / within a limited network under a commercial agreement, or for a limited range of goods and services. **Art. 38**: a provider relying on items 11–12 must notify Fjármálaeftirlitið (now within Seðlabanki Íslands) once total payments in the preceding 12 months exceed **EUR 1 million**, describing the service; the supervisor decides with reasons whether it qualifies; if not, it must prohibit the activity, with a 30-day window to file a licence application ([Act 114/2021](https://www.althingi.is/lagas/nuna/2021114.html), mirror [lagasafn.hi.is/2021114](https://lagasafn.hi.is/2021114.html), [bill 991/151 explanatory notes](https://www.althingi.is/altext/151/s/0991.html)).
- Two additional reasons VILD-style credit is outside e-money: (i) it is **earned, not issued "in exchange for funds"** (no top-ups); (ii) it is a claim against the restaurant chain that honours it, redeemable only in that chain's goods, with no cash-out.
- **Where it flips**: selling top-ups or gift credit for cash, letting balances move between unrelated chains (a "VILD-wide" wallet), or cash redemption. A multi-chain balance funded by VILD rather than by each chain looks like a general-purpose stored-value instrument; above EUR 1m/12 months you are in art. 38 notification territory and likely need an EMI/bank partner (e.g. Kvika/Straumur, Síminn Pay which already runs a regulated loan book, or an EU EMI passported into Iceland). The AML act also treats instruments usable only in Iceland up to EUR 500 differently ([Act 140/2018](https://www.althingi.is/altext/stjt/2018.140.html)) — relevant only if VILD ever sells credit.

### E.2 VAT (virðisaukaskattur)

- Tax base (skattverð) is the total consideration excluding VAT; **unconditional discounts given at delivery are deducted from the tax base; discounts conditional on something not fulfilled at delivery are not**; card-payment discounts registered at the till count as unconditional (VAT Act 50/1988 art. 7(2)(5)) ([lagasafn.hi.is/1988050](https://lagasafn.hi.is/1988050.html)). Rates 24% and 11% (restaurant food is 11%) ([Skatturinn VSK](https://www.skatturinn.is/atvinnurekstur/virdisaukaskattur/)).
- Implication **[inference, confirm with Skatturinn/accountant]**: at the **earning** sale, VAT is on the full price paid (the credit is a conditional future benefit, not a discount on that sale). At the **redemption** sale, the amount settled with inneign reduces the consideration actually received, so VAT is due on the cash portion only — economically the same as a discount at that later sale. Iceland is outside the EU VAT directive, so the 2016/1065 single/multi-purpose voucher rules do not apply directly; Skatturinn's only gift-card ruling found is ákvarðandi bréf 943/2000 (whether selling gift cards is exempt payment intermediation) — dated and not conclusive ([Skatturinn 943/2000](https://www.skatturinn.is/fagadilar/akvardandi-bref/obeinir-skattar/nr/901)). **Get a written ruling (bindandi álit) before launch.**
- If VILD charges chains a fee (SaaS or % of credit issued), that fee is a 24% taxable service.

### E.3 Accounting for the merchant

- Under IFRS 15 (B39–B43) loyalty credit is a **material right**: part of the first sale's transaction price is deferred as a contract liability and recognised when credit is redeemed or expires (breakage estimated from redemption patterns) ([IFRS Community](https://ifrscommunity.com/?p=2407), [BDO](https://www.bdo.co.uk/en-gb/insights/business-edge/business-edge-2017/ifrs-15-in-the-spotlight)). Icelandic SMEs reporting under ársreikningalög follow similar substance (provision for outstanding credit). Hagar does not disclose Takk accounting in its results ([Hagar Q4](https://www.hagar.is/um-haga/frettir/tilkynningar/stjornendauppgjor-haga-2025-26-og-uppgjor-4-arsfjordungs/)).
- VILD must therefore give every chain a monthly statement: credit issued, redeemed, expired, outstanding, by location — this is the product's accounting deliverable.

### E.4 Consumer law: gift cards, credit notes, expiry

- **No statute sets validity periods** for gjafabréf/inneignarnótur. The 2000 "Verklagsreglur um skilarétt, gjafabréf og inneignarnótur" (voluntary) say 4 years, never shorter than 1 year, and shorter terms must be stated at issue ([verklagsreglur](https://www.althingi.is/altext/140/02/r27154011.sgml), [Neytendastofa skilaréttur](https://www.neytendastofa.is/fyrirtaeki/orettmaetir-vidskiptahaettir/skilarettur/), [Neytendasamtökin](https://ns.is/malaflokkar/skilarettur-gjafabref-og-inneignarnotur/)).
- General limitation period for claims is **4 years** (Act 150/2007); deposits and *e-money* claims are 20 years; contracting out of limitation is void ([Act 150/2007](https://www.althingi.is/lagas/nuna/2007150.html)). Earned loyalty credit is a contractual benefit, not a purchased claim, so a shorter contractual expiry (TAKK: 2 years) is market practice — but state it clearly in terms and in-app (Act 57/2005 on unfair commercial practices and Neytendastofa oversight apply) **[inference]**.
- Lög um neytendasamninga 16/2016 (distance/off-premises contracts) govern VILD's own consumer terms, withdrawal rights for anything sold in-app, and pre-contract information duties; they do not regulate loyalty credit itself.

### E.5 What this means for VILD

- Structure v1 as **per-chain, earned-only, non-transferable, non-cashable credit** with each chain as issuer/obligor and VILD as the platform operator. Write this into the chain contract and the consumer terms.
- Track 12-month redemption volume per chain against the EUR 1m threshold; plan the art. 38 notification to Seðlabanki before any chain approaches it.
- Get a bindandi álit from Skatturinn on VAT at earning vs redemption, and a short legal memo from a fjármálaréttur lawyer on the limited-network position — both before signing the first chain.
- Default expiry: 24 months rolling from earn date (matches TAKK), with a 30-day in-app warning.

---

## F. App distribution and mobile stack

### F.1 Store requirements

- **Apple Developer Program**: USD 99/year; organizations need a D-U-N-S number, legal entity (no DBAs), domain email, functional public website, and an Account Holder with authority to bind the company ([Apple enrol](https://developer.apple.com/programs/enroll/)).
- **Google Play**: USD 25 one-time; organization accounts need D-U-N-S; **personal accounts created after 13 Nov 2023 must run a closed test with ≥12 testers opted in for 14 continuous days before production** — organization accounts avoid this ([Google Play closed testing](https://support.google.com/googleplay/android-developer/answer/14151465)).
- **App Review (Nov 2025 guidelines)**: 3.1.1 — digital gift cards/vouchers redeemable for *digital* goods must use IAP; 3.1.3(e) — purchases of physical goods/services consumed outside the app **must not** use IAP (Apple Pay/cards instead); loyalty credit for restaurant food is physical-goods territory, so no IAP; 4.8 — Sign in with Apple-equivalent is required only if you offer third-party/social login, and is **not required when the app "uses a government or industry-backed citizen identification system or electronic ID"** (rafræn skilríki qualifies) or exclusively your own account system; 5.1.1(v) — must offer in-app account deletion; privacy policy and data-retention statements mandatory ([Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)).
- Practical: an app whose only function is an account + barcode risks a 4.2 "minimum functionality" note; ship offers, store finder, transaction history and wallet-pass issuance in v1.

### F.2 Capacitor vs React Native vs Expo for a React + Vite + Supabase team

| | Capacitor | React Native (bare) | Expo |
|---|---|---|---|
| Reuse of existing React/Vite/Supabase code | ~100% (same bundle; add plugins) | Rewrite UI to RN primitives | Rewrite UI to RN primitives |
| Wallet passes | `capacitor-pass-to-wallet` (Apple), Capawesome wallet plugin (Apple + Google) ([Ionic tutorial](https://ionic.io/docs/tutorials/integrations/digitial-passes/apple-wallet-passes/adding), [capawesome](https://capawesome.io/docs/sdks/capacitor/wallet/)) | react-native-wallet libs | expo modules / community |
| Push (balance updates) | Capacitor Push plugin + FCM/APNs | RN Firebase | expo-notifications |
| OIDC redirect (Kenni/Auðkenni) | Universal/App Links + `@capacitor/browser`; Supabase handles PKCE | Deep links | expo-auth-session |
| OTA updates | Capgo / Ionic Appflow | CodePush successors | EAS Update |
| Native feel / animation-heavy UI | Adequate for a loyalty app; cold start slightly slower | Best | Best |
| TAKK's choice | — | React Native (Júní) | — |

Sources: [didof.dev Expo vs Capacitor](https://didof.dev/blog/expo-vs-capacitor/), [PkgPulse 2026](https://www.pkgpulse.com/guides/react-native-vs-expo-vs-capacitor-cross-platform-mobile-2026), [Wanilla](https://wanilla.co/blog/capacitor-vs-react-native/), [Bret Cameron](https://www.bretcameron.com/blog/react-native-vs-capacitor-why-i-use-both).

**Recommendation: Capacitor.** VILD's screens are forms, lists, a barcode/QR card and a balance — exactly the category where web-view performance is indistinguishable from native. It lets the same Vite build serve the web app (cashier console, marketing site) and both stores, keeps Supabase auth/realtime code unchanged, and the only native pieces (wallet pass add, push, biometrics, deep-link return from eID) all have maintained plugins. Re-evaluate Expo only if VILD later needs NFC *reading* in the app (Capacitor NFC plugins exist but are weaker) or heavy gesture/animation UI. Budget 2–3 weeks for store setup, plugins, deep links and review.

---

## Open questions to resolve with vendors (ask list)

1. Noona: webhook event list for sales/transactions, whether sale line items and tender types are exposed, and whether a third-party app can post a credit-wallet debit/credit or voucher redemption at the till.
2. Upsell and Resto: any partner API; whether their tills can accept an external voucher code as a tender; which terminals they run (VAS-capable?).
3. Teya and Rapyd Iceland: are their terminals Apple VAS / Google Smart Tap certified in Iceland, and will their POSLink/CloudLink pass VAS data to the POS?
4. PassEntry: PassTap architecture and pricing for a multi-merchant platform; terminal/PSP coverage in Iceland beyond Hagar.
5. Kenni and Taktikal: per-authentication pricing and passkey pricing at 10k/50k/200k MAU.
6. Skatturinn: bindandi álit on VAT timing for earned credit; Seðlabanki: confirmation of the limited-network reading for per-chain credit operated by a third-party platform.
7. Gleðipinnar: which POS the group uses (one answer covers ~10 brands).

## Sources not reachable during this research

- althingi.is (Cloudflare challenge) — used lagasafn.hi.is mirror instead.
- developers.landsbankinn.is (JS-rendered), Google Wallet prerequisites page, Mastercard card-linked offers product page, mbl.is Takk article (403) — facts from these are marked unverified or taken from secondary sources.
