# Júní (juni.is) — research report for the VILD team

Date: 2026-10-23. Prepared for the VILD product team ahead of working with Júní.

Legend used throughout:
- **[V]** = verified directly on a page I fetched (URL given).
- **[S]** = from a search-engine summary / third-party page I could not open in full; treat as probable, not certain.
- **[I]** = my inference from what I saw (screenshots, CSS, copy); not stated by Júní.

Source material I actually read: every page linked from juni.is (home, /verkefni, /thjonusta, /um-okkur, /blogg, /velkomin-i-juniversinn, /juno, all 23 project pages, all 7 blog posts), the site's compiled CSS, Júní's Prismic-hosted case-study screenshots (Takk, Olís app, forseti.is, Hagkaup), the Takk App Store listing, takkkronur.is and its CSS, forseti.is and its CSS, Awwwards, Vísir, Víkurfréttir, Hagar.is, SVEF, LinkedIn company page (via fetch), Dribbble, Clutch summaries.

---

## 0. Executive summary (what matters for VILD)

1. **Júní is not a pure design studio.** It is a ~26-person Reykjavík + Stockholm "stafræn vöru-, hönnunar- og tæknistofa" (digital product, design and tech agency) that does strategy/consulting, UX/UI/brand design *and* full-stack engineering. For Takk they designed the app from scratch **and** built the React Native app, the NestJS/GraphQL middleware and the payment/points flow with Hagar's tech team. [V]
2. **Takk is the closest analogue to VILD and it is theirs.** Hagar (Bónus, Hagkaup, Eldum rétt) launched Takk on 14 Jan 2026; ~65,000 members by June 2026. Júní's own case study and 7 real screenshots are described in detail in §5. The pattern language (5-tab bottom bar, big balance "speech-bubble" card, partner-coloured product cards, bottom sheets with drag handle, 3D coin/sparkle motifs, wallet-card onboarding, rafræn skilríki login) is directly reusable as a reference for a restaurant cashback app. [V]
3. **They are Figma-native and design-system-minded.** Figma appears in almost every project's "Tæknistakkur"; they built design systems for Íslandsstofa, Nemendagrunnur, the Olís app; use Storybook + Framer Motion on the web. Their published process: 4-day design sprint (hönnunarsprettur), usability interviews with ≥5 users (NN/g rule), 2-week sprints with dailies, Slack, Asana/Notion, GitHub, demos at sprint end. [V]
4. **Their house style (juni.is)**: Founders Grotesk (light body / semibold display) + Founders Grotesk Mono + an italic serif accent (Orelo Standard), warm off-white background `#f0ede8`, dark teal ink `#22353b`, acid-lime underline accent `#d3fa61`, orange `#f1511e` and sky blue `#6eabc0` gradients, oversized display type, a 12-column grid, 3D props, hand-drawn SVG underlines, playful "Júnívers" copy. **Client work does not look like juni.is** — they adapt hard to each brand (forseti.is is cream/burgundy/gold serif; Olís is green/yellow bold; Takk is lavender/purple rounded grotesk). [V] + [I]
5. **Who you will deal with**: Arndís Thorarensen (co-founder/owner, listed as framkvæmdastjóri on the site; press says she moved to board chair with Andri Úlfarsson as MD — conflicting, see §1.3), Guðmundur Bjarni Sigurðsson (hönnunarstjóri / design director, founder of Kosmos & Kaos, the design half of the merger), James (tæknistjóri/CTO), Áslaug Adda Maríusdóttir (rekstrarstjóri). Designers on staff: Jón Kári Eldon, Salena Kauffman, Tinna Hallsdóttir, Júlía Runólfsdóttir (on leave). [V]
6. **Awards are real but mostly web awards**: Ísland.is (opinber vefur 2020; verkefni ársins, opinber vefur og aðgengilegasti vefur 2021), Visit Iceland (Skift top-10 best designed tourism sites 2022), forseti.is (Awwwards Honorable Mention, 6 May 2026), many Íslensku vefverðlaunin nominations. Nothing found for Takk itself, nothing concrete under FÍT or Hönnunarverðlaun Íslands. [V]/[S]
7. **Not verified as clients**: Nova, Dominos, N1 (N1 is a direct competitor of Olís/Hagar, so unlikely). Verified past clients include Arion banki (2019 site; many Dribbble shots), Íslandsbanki (analysis 2020), Síminn (analysis 2022), Icelandair (system 2021 + ran their first project accelerator), Vodafone (2012), WOW air, Bláa Lónið, Kringlan (web + app 2019), Apótekarinn (app 2022), Lyf & Heilsa, Orkuveita Reykjavíkur, Veitur, ON. [V]

---

## 1. Who they are

### 1.1 Identity and positioning [V]
- Name: **Júní** (legal entity Júní ehf., kennitala 700919-2260 — an Icelandic kennitala for a company encodes its registration date, so the entity was registered in **September 2019** [I]). On LinkedIn they call themselves "Júní digital": *"an A-Z digital agency that believes in the bottom-line value of design."* (https://is.linkedin.com/company/juni-ehf)
- Site tagline: *"Júní — stafræn vöru-, hönnunar- og tæknistofa"* — *"Júní er stafræn vöru-, hönnunar- og tæknistofa í Reykjavík og Stokkhólmi. Við hjálpum fyrirtækjum og stofnunum að hanna, forrita og þróa stafrænar þjónustur, vefi, öpp, kerfi og AI-lausnir sem skila mælanlegum árangri."* (https://www.juni.is/)
- Page `<title>`: *"Júní – Við hönnum og forritum stafrænar lausnir sem skila árangri"* (we design AND code).
- Offices: **Bolholt 8, 105 Reykjavík** and **Sankt Paulsgatan 25, 118 48 Stockholm**. Contact: hallo@juni.is, tel. 561-1020 (the services page also shows 560-1020). Social: linkedin.com/company/juni-ehf, instagram.com/juniehf, facebook.com/juniehf, dribbble.com/kosmosandkaos (profile renamed "Júní digital").
- Key figures on the homepage ("Júní í hnotskurn"): **Stofnað 2010 · 26 starfsmenn · 100+ verðlaun · 400+ kláruð verkefni**. (LinkedIn says 23 employees / 11-50.) The "100+ awards" is their own claim; I could verify roughly a dozen.
- "Um okkur" fun stats: 16 ár í rekstri, 4 kaffivélar, kynjahlutfall 56/44, 4 tungumál, meðalaldur 35 ára, 2 skrifstofuhundar (one is Toggi, who "writes" blog posts and is credited as "Markaðshundur"). (https://www.juni.is/um-okkur)
- **ISO 27001** information-security certification from SBcert (Sweden), announced ~Sept/Oct 2026; process took about six months. Relevant for VILD because a cashback app handles payment/identity data. (https://www.juni.is/blogg/hvað-er-þetta-iso-27001-eiginlega)
- LinkedIn post ~Nov 2025: named "Fyrirmyndarfyrirtæki" (model company) in operation for 2025 [S — from the LinkedIn page fetch; could not open the underlying source].

### 1.2 History [V]/[S]
- The "founded 2010" date belongs to **Kosmos & Kaos**, a Reykjavík web/digital design studio founded 2010 and owned by **Guðmundur Bjarni Sigurðsson** (Keflavík native; bought out the other shareholders in 2016 per Vísir [S]). By Aug 2019 K&K had 15 staff across Reykjavík and a new Stockholm office (WeWork), MD Inga Birna Ragnarsdóttir, and clients Arion banki, VÍS, Vodafone, Orkuveita Reykjavíkur, Gagnaveita Reykjavíkur, Orka náttúrunnar, Íslandsstofa. (https://www.vf.is/vidskipti/kosmos---kaos-opnar-skrifstofu-i%CC%81-stokkho%CC%81lmi — Víkurfréttir, 31 Aug 2019) [V]
- Kosmos & Kaos then **merged with Parallel ráðgjöf** (a consulting firm owned by **Arndís Thorarensen** and **Þórhildur Gunnarsdóttir**) under the new name **Júní**, with ~24 staff. (Viðskiptablaðið "Parallel og Kosmos & Kaos sameinast", https://vb.is/frettir/parallel-og-kosmos-kaos-sameinast/ — vb.is blocks fetches, so this is [S]; the Sept-2019 kennitala and the "16 years in business from 2010" framing are consistent with a late-2019 merger [I].)
- This explains the three-legged "Sporbrautin" offer: Parallel brought **ráðgjöf** (strategy/PM consulting; e.g. they ran Icelandair's first project accelerator and did "greining" for Íslandsbanki, LSR, Lífeyrissjóður verslunarmanna, Síminn), K&K brought **hönnun + forritun**. [I]
- Old Dribbble profile (dribbble.com/kosmosandkaos, now "Júní digital") still shows K&K-era shots: Arion Bank front page/loans/app pages/corporate signup, Vodafone app and front page, Nespresso e-commerce, Sjóvá corporate site, Almenni, Sýn annual report, Promote Iceland intro animation, "Carbon footprint calculator" (Visit Iceland). [V]

### 1.3 People [V unless noted]
From https://www.juni.is/um-okkur (listed order, titles as shown):
- **Arndís** (Thorarensen) — Framkvæmdarstjóri (MD), arndis@juni.is. Co-founder and co-owner (Vísir, 24 Sept 2024: *"Arndís Thorarensen, framkvæmdastjóri og meðeigandi Júní"*).
- **Áslaug** Adda Maríusdóttir — Rekstrarstjóri (operations), aslaug@juni.is; authored the ISO 27001 post.
- **Guðmundur** Bjarni Sigurðsson — Hönnunarstjóri (design director), gummisig@juni.is. Founder of Kosmos & Kaos; authors the design-sprint and AI blog posts; speaks at SVEF events (21 Oct 2026, "Vefþróun og gervigreind", with Jón Kári Eldon). Lead designer on Endurmenntun HÍ site and Basalt per LinkedIn posts [S].
- **James** — Tæknistjóri (CTO), james@juni.is (photographed with the ISO certificate).
- Designers: **Jón Kári** Eldon (hönnuður; hired 2023-ish per vb.is), **Salena** Kauffman (hönnuður), **Tinna** Hallsdóttir (hönnuður; wrote the usability-research post), **Júlía** Runólfsdóttir (hönnuður, í fæðingarorlofi; read.cv says "Senior Designer at Júní").
- Developers: Albína (leave), Arna, Helgi, Hilmar Ævar Hilmarsson, Jón Lorange (wrote the AEO/GEO post), Jón Ingi, Kristleifur, Kristján Albert, Kormákur, Tumi.
- Project managers: Atli, Fanney Þóra Vilhjálmsdóttir, Yuliya (gæða- & verkefnastjóri = QA + PM).
- Marianie (umsjón skrifstofu), Þorgeir ("Markaðshundur").
- **Conflict to be aware of:** Viðskiptablaðið ("Andri nýr framkvæmdastjóri Júní", https://vb.is/folk/andri-nyr-framkvaemdastjori-juni/ [S], undated in search results) says **Andri Úlfarsson** (joined June 2024 from Toyota, aðstoðarframkvæmdastjóri from Sept 2024 — Vísir [V]) has taken over as MD and Arndís moved to board chair + strategic adviser to clients. The live "Um okkur" page still lists Arndís as MD and does not list Andri at all. Either the site is stale or Andri has since left. **Ask who your commercial owner is on day one.**

### 1.4 Clients and projects — verified list [V]
Featured case studies at https://www.juni.is/verkefni (each has its own page):

| Project | Client | Júní role | Stack |
|---|---|---|---|
| Takk appið | Hagar | App hönnun, forritun (design + build + middleware + payment flow) | React Native, NestJS – GraphQL API |
| Hagkaup.is vefverslun | Hagkaup (Hagar) | consulting/PM, user research, design, front+back-end, CMS choice, hosting | Figma, React, Next.js, TS, Cypress, Jest, Prismic, Netlify functions |
| Bananar B2B vefverslun | Hagar | ráðgjöf, hönnun, framendaforritun (with Hagar IT) | TS, React, Sanity, Next.js, Tailwind, Figma |
| Olís appið | Hagar/Olís | ráðgjöf, hönnunarkerfi, hönnun (built by **Enum**) | — |
| Olís vefur | Olís | ráðgjöf, hönnun (coded in-house at Olís) | Figma, React, Next.js, Tailwind, Framer Motion, Prismic |
| Forseti.is | Embætti forseta Íslands | ráðgjöf, hönnun, forritun | Next.js, React, TS, Tailwind, Sanity, Algolia, Radix UI, Framer Motion, React Hook Form, Neon |
| Nemendagrunnur | MMS | ráðgjöf, hönnun, forritun (design system, OneRoster standard; with Apró) | Figma, React, Next.js, Tailwind, Framer Motion, Prismic |
| Vegir okkar allra | Fjármála- og efnahagsráðuneytið | ráðgjöf, hönnun, forritun, mörkun (scrollytelling; with Aton JL) | Prismic, Figma, Next.js, Storybook, Framer Motion, Tailwind |
| Borgarleikhúsið | Borgarleikhúsið | ráðgjöf/greining, hreyfihönnun, framendaforritun, hönnun (Tix integration) | TS, React, Sanity, Next.js, Tailwind, Figma |
| 360 Hotel | 360 Hotel | ráðgjöf, hönnun, forritun | Figma, React, Next.js, Sanity, Vercel, Mailchimp, Resend, Mapbox |
| Harpa.is | Harpa ohf. | design + front/back-end (nominated opinber vefur 2021) | Figma, React, TS, Next.js, Prismic, Sanity |
| Íslensk verðbréf (iv.is) | Íslensk verðbréf hf. | rebrand + site in ~1 month | Prismic, Next.js, Tailwind, Figma |
| Borgarsögusafn | Reykjavíkurborg | full stack, design, graphic design (won 2022 city tender with Listasafn) | Strapi, Figma, Next.js, Storybook, Framer Motion, Tailwind |
| Listasafn Reykjavíkur | Reykjavíkurborg | rebrand, web design, motion, front-end, shop | Strapi, Shopify, Figma, Next.js, TS, Storybook, Framer Motion, Tailwind |
| Basalt arkitektar | Basalt | design + build in Framer | Framer, Figma |
| Auðkenni | Auðkenni | back-end, app development, consulting, PM, rebrand, design | Sanity, Figma, Next.js, TS, Storybook, Framer Motion, Tailwind |
| Þórkatla | Fasteignafélagið Þórkatla | logo, brand, site in Framer at speed | Framer, Figma |
| Ísland.is | Stafrænt Ísland | back/front-end, search, consulting, design system, CMS, PM, design (one of 20 teams/14 firms; with Advania) | Next.js, NestJS, GraphQL, Elasticsearch, Kubernetes, AWS, Contentful |
| Map of Iceland | Íslandsstofa | design, build, consulting, branding | Figma, Leaflet, React, Next.js, GraphQL, Prismic, Framer Motion, Mapbox, Maptiler |
| Íslandsstofa.is | Íslandsstofa | ráðgjöf, hönnun, forritun, mörkun — logo refresh (with Oscar Bjarnason), palette, typography, **design system**; illustrations by Cirkus | Gatsby, TS, React, Tailwind, Prismic, Netlify, Figma |
| Visit Iceland | Íslandsstofa | ráðgjöf, mörkun, hönnun, forritun (Skift top-10 2022) | React, TS, Gatsby, AWS, Sass, Netlify, Prismic, Figma, Photoshop, Illustrator |
| Controlant.com | Controlant | ráðgjöf, mörkun ("friendly tech"), hönnun, forritun | Next.js, TS, React, Tailwind, Contentful, Netlify, Figma |

"Eldri verkefni" table (year / client / type / role): 2023 Bláa Lónið (kerfi), 2017 Eik, 2022 Samtök iðnaðarins (orkuskipti.is), 2014 Orka náttúrunnar, **2019 Arion banki (vefsíða, hönnun + forritun)**, 2014 Ljósleiðarinn, **2020 Íslandsbanki (greining/ráðgjöf)**, **2021 Icelandair (kerfi)**, 2021 Veitur, 2016 Orkuveita Reykjavíkur, 2019 Lyf & Heilsa (vefverslun), 2022 Apótekarinn (app: ráðgjöf, mörkun, app hönnun, app forritun), 2014 Reykjanesbær, 2022 LSR, 2023 Lífeyrissjóður verslunarmanna, 2019 Kringlan (vefverslun) + 2019 Kringlan (app), **2022 Síminn (greining/ráðgjöf)**, 2024 Veigar (vefverslun), 2012 Bláa lónið, 2014 WOW air, 2012 Vodafone.
Logo wall on /thjonusta: atNorth, Virk, Íslandsstofa, Hagar, Stafrænt Ísland, Sjúkratryggingar, Harpa, Controlant, Efnahags- og fjármálaráðuneytið, UNICEF, Borgarleikhúsið, Auðkenni, Visit Iceland, Háskóli Íslands, MMS, Hagkaup. LinkedIn also mentions Endurmenntun HÍ (new site 2026) and the national electoral endorsement system (Landskjörstjórn + Stafrænt Ísland + Þjóðskrá). [V]

**Not found anywhere:** Nova, Domino's, N1. [V — absence]

### 1.5 Awards and recognition
- **Ísland.is** — Íslensku vefverðlaunin: opinber vefur ársins 2020; verkefni ársins + opinber vefur + aðgengilegasti vefur 2021 (stated on https://www.juni.is/verkefni/stafraent-island). Júní is one of many vendors on Ísland.is; nominated jointly with Advania. [V — their claim]
- **Visit Iceland** — Skift "10 Best Designed Tourism Websites in the World 2022" (Júní's page; corroborated by a Japanese trade report listing Visit Iceland first) [V]/[S].
- **forseti.is** — Awwwards Honorable Mention, 6 May 2026, agency "Júní Digital", listed colours #571C2B / #95791A, tags Storytelling, Gallery, Timeline, Q&A (https://www.awwwards.com/sites/the-presidency-of-iceland) [V]. LinkedIn also claims a "Web Excellence Awards" win in Government & Public Sector [S].
- **Harpa.is** — nominated opinber vefur ársins 2021 [V, their page].
- **Íslensku vefverðlaunin nominations announced 11 Mar 2024** (Vísir): juni.is itself (fyrirtækjavefur, meðalstór), islandsstofa.is, Vegir okkar allra (markaðsvefur), Ísland.is (opinber), Stafræn stæðiskort (stafræn lausn + samfélagsvefur, credited "Júní Digital"), Ísland.is appið (app ársins; Aranja + Enum + Júní). (https://www.visir.is/g/20242540865d/...) [V]. I could not find the 2024 winners list (SVEF has no winners page for that year).
- **Borgarsögusafn** — nominated opinber vefur ársins 2024 (SVEF tilnefningar) [S]; the Um okkur page captions a photo *"Júní vann til verðlaun fyrir Borgarsögusafn með Borgarsögusafni"* [V] — award unnamed.
- **Borgarleikhúsið** page shows "Verðlaun: Já" with KPIs (+10% miðasala, −31% símtöl í þjónustuver, −23% biðtími) [V]; award unnamed.
- The /verkefni page ends with a logo row "Verðlaun og viðurkenningar": Íslensku vefverðlaunin, **FÍT**, Awwwards, Behance [V] — but I found no FÍT entry, no Hönnunarverðlaun Íslands entry, and no Lúðurinn entry naming Júní. In the April 2023 web-awards winners list no Júní project won [V].
- **Takk**: no award found. [V — absence]

---

## 2. How they work

### 2.1 The offer — "Sporbrautin" [V] (https://www.juni.is/thjonusta)
*"Sporbrautin er þrennt í einu: sérsniðin ráðgjöf á heimsmælikvarða, tímalaus fegurð í hönnun og stafræn kraftaverk í forritun."*
1. **Ráðgjöf** — stefnumótun, forgangsröðun og ákvarðanataka, UI/UX prófanir, breytingastjórnun; they list Scrum, Kanban, Lean, Agile, ferlagreiningar, vinnustofur, sviðsmyndagreiningar.
2. **Hönnun** ("Sérhannaðir alheimar") — vefhönnun, app hönnun, **hönnunarsprettir**, notendaupplifun og nytsemisprófanir, **mörkun** (branding). Their line: *"Við byrjum alltaf á því að gefa ímyndunaraflinu lausan tauminn, en beislum það svo með áreiðanlegri og gagnrýninni aðferðafræði. Við ítrum og prófum og potum og skoðum allan pakkann – sem tryggir fullkominn samhljóm milli aðgengileika og fegurðar."*
3. **Forritun** ("Forrituð kraftaverk") — kerfishögun, tæknileg nálgun, verksvið.

### 2.2 Process, as they describe it
- **Hönnunarsprettur (4-day design sprint)** (https://www.juni.is/blogg/honnunarsprettur) [V]: Day 1 "sjá stóru myndina" — define challenges, goals, first user-flow draft, sketching, team vote. Day 2 "ákvörðun tekin" — review sketches, vote, detailed step-by-step user flow, storyboard. Day 3 — prototype (1–2 people do most; copy and imagery). Day 4 — user testing. Pitched as the way to de-risk a product idea "á aðeins fjórum dögum". **This is the obvious first engagement to buy for VILD.**
- **Usability research** (https://www.juni.is/blogg/hannad-fyrir-folk-af-hverju-nytsemisrannsoknir-skipta-mali, by Tinna Hallsdóttir) [V]: one-on-one moderated sessions with a Figma prototype, scripted tasks, a note-taker (designer or PM), audio + screen recording, **≥5 users early and again later** (explicit NN/g "85% of problems" citation), 45–60 min each, recruit for fit (e.g. EV owners for a charging product) and diversity; surveys for breadth; output = **report + slide deck** used to prioritise and persuade stakeholders. Mantra: *"ákvarðanir sem byggjast á gögnum en ekki giski."*
- **Delivery cadence** (Nemendagrunnur page) [V]: 2-week sprints prioritised in **Asana**, daily stand-ups, issues resolved on **Slack**, demo to stakeholders at sprint end; design in **Figma** with a design system; **Notion** for documentation; **GitHub** for version control. Harpa: weekly sprints with a weekly status meeting (client testimonial). Forseti: a defined "samskipta- og fundarstruktur (stöðufundir)". Hagkaup and Icelandair: **"verkefnahraðall"** (project accelerator) where business + tech teams work to a shared goal in a fixed window; Júní facilitated Icelandair's first one and trained staff in cross-functional teamwork (Bogi Nils Bogason testimonial on the careers page).
- **Consulting deliverables named**: þarfagreining, project staffing help, data analysis, prioritisation of work packages, preparing decision meetings for executives (Hagkaup, Auðkenni pages). [V]
- **Design deliverables named**: user flows, storyboards, Figma prototypes, usability reports/decks, design systems (Íslandsstofa, Nemendagrunnur, Olís app), brand identities (logo, palette, type, image style — Íslandsstofa, Auðkenni, Þórkatla, Íslensk verðbréf, Controlant), motion design (Framer Motion, 3D), CMS content guidelines and staff training (Borgarleikhúsið, 360 Hotel). [V]
- **Engineering**: they build. Preferred web stack is Next.js/React/TypeScript/Tailwind + headless CMS (Sanity, Prismic, Contentful, Strapi) + Storybook + Framer Motion, hosted on Netlify/Vercel/AWS; Framer for fast marketing sites. Mobile: **React Native** with a **NestJS GraphQL** backend (Takk). They care about scaling (Netlify functions/Lambda for Hagkaup's spiky traffic), locked test environments, automated release pipelines, WCAG, SEO/AEO. [V]
- **Partners seen on their projects**: Enum (built the Olís app Júní designed; also Ísland.is app with Aranja), Olís in-house devs (coded the Olís site Júní designed), Advania (Ísland.is), Apró (Nemendagrunnur), Aton JL (ad agency, Vegir okkar allra), Cirkus (illustration/animation, Íslandsstofa), Oscar Bjarnason (logo, Íslandsstofa), photographer Snorri Þór Tryggvason (Map of Iceland base map), Tix (ticketing), Hagar's own IT team (Takk, Bananar). So "design-only, someone else builds" is a mode they are comfortable in. [V]
- **AI stance** (Guðmundur's post, https://www.juni.is/blogg/gervigreind-hja-juni) [V]: AI is used daily in design (exploring ideas, copy, imagery) and code, but they explicitly reject "gervigreindar slor" (AI slop) — *"Gervigreind mun aldrei koma í staðinn fyrir góðan smekk"* — and cite Dieter Rams' ten principles. They sell **Júnó**, a model-agnostic (Gemini today) assistant with "generative UI" that returns JSON rendered as React components, connectable to Sanity/Payload/Notion/SharePoint/Excel/PDF. (https://www.juni.is/juno)

---

## 3. Their design language

### 3.1 The juni.is house style (verified from CSS + rendered assets)
- **Typography** [V, from `/_next/static/css/…css` and `/fonts/`]: 
  - **Founders Grotesk Light** (weight 300) is the default `html` font for body copy; **Founders Grotesk Semibold** for headings; **Founders Grotesk Mono Medium** for labels/mono; **Orelo Standard** (italic and demibold italic — a high-contrast display serif) as an accent, mixed mid-word with the grotesk (the OG image sets "STAFRÆNAR LAUSNIR MORGU*NDAGSINS*" with the last half of the word in italic serif).
  - Display sizes are huge and fluid: `clamp(9rem, 40vw, 44rem)`, `clamp(60px, 8vw, 128px)`, `11vw`/`12vw` headings; tight leading (`line-height: .8–1.1`) on display, 1.5–1.7 on body. Body ~19px.
- **Colour** [V]: `body { background: #f0ede8 }` (warm off-white), text `#22353b` (dark teal-charcoal), accent **acid lime `#d3fa61`** used as a 5px hand-drawn SVG underline (`.acid-underline`) and as outlined type, **orange `#f1511e`** (red underline, gradient end), **sky blue `#6eabc0`** (gradient start), soft neutrals `#faf7ee`, `#e4edf0`, `#d9d6cf`. The hero gradient is `linear-gradient(138deg, #6eabc0 → rgba(255,241,215,.2) → #f1511e)`; their 404 and Júnó pages use soft radial colour-wash backgrounds (lime/blue/peach). Overall: warm paper + ink + one acid highlight. [V]
- **Layout** [V]: Tailwind; `grid-template-columns: repeat(12, …)` on desktop, 2/3/4-column sub-grids, container widths 1024/1280/1536px and `max-width: 80rem`; generous section gaps (2–3rem, up to 15rem). Project cards in a 2-up grid with big thumbnails; an "Eldri verkefni" table; a logo wall; a testimonial block repeated on multiple pages.
- **Motion** [V]: count-up stat counters (the "0 → 2010 / 26 / 100+ / 400+" artefacts in the HTML are the counter start states), `@keyframes cube-spin, fade-in, hypnotize, modal-flip, move-bg, juno-hero-curtain-reveal`; backdrop-blur panels; ease-in-out transitions. Heavy use of **Framer Motion** in client work.
- **Imagery** [V]: a floating **3D rock/stone** ("þetta er 3d steinn") and 3D props; a daisy on the OG image; studio **portraits on plain white** for every team member with unusually descriptive alt texts (accessibility is a habit); candid office/party photos; "Júní smiley eftir Shoplifter" (an art piece by Shoplifter/Hrafnhildur Arnardóttir in the office). Stickers: "A small sticker with a fun message to spice up our text", "Artsy icons". Icons are custom and minimal.
- **Tone of voice (Icelandic)** [V]: playful, confident, informal "við/þú", cosmic metaphor ("Júnívers", "Sporbrautin", "Sérhannaðir alheimar", "forritar næstu sólarupprás"), jokes in UI chrome ("Easter egg" list items, "Gífurlega vinsæl umsókn", "Markaðshundur", a blog post written by the dog). CTAs: "Henda á okkur línu", "Sláðu á þráðinn", "Hvaða snilld ert þú með í huga?". Case-study copy, by contrast, is structured and sober: *Um verkefnið og markmið þess → Áskoranir → Lausnin → Útkoman*, with named KPIs and a client testimonial.
- **Website structure** [V]: Home (hero statement → featured 4 projects → "Mestu máli skiptir hið mannlega" team band → stats → testimonial) · Verkefni (grid + older-projects table + awards logos) · Þjónusta (three pillars with expandable sub-lists + logo wall + contact) · Um okkur (manifesto → staff grid → fun stats → photo gallery) · Blogg (tag filter Allt/Forritun/Ráðgjöf/Hönnun) · careers page · Júnó. Footer: contact, latest blog post, both addresses, kennitala.

### 3.2 How they design for clients — recurring habits [I from case studies and screenshots]
1. **They subordinate their own style to the brand.** forseti.is: cream `#faf7f0`-ish background, deep burgundy `#571C2B`, gold `#95791A` hairlines, a licensed serif "Serrif" (regular/bold/italic + condensed light) for display with **DM Sans** for UI, large pull-quote hero with a portrait, IS/EN toggle, thin gold rule under the nav. Olís app: solid brand green + yellow, heavy Clan/Roboto-style grotesk, hard-edged yellow stat tiles with drop shadow, product cards on green with a yellow stripe. Takk: lavender/purple, rounded geometric grotesk, soft shadows, 3D coins. Harpa: "brútalismi á fágaðan hátt", hexagon (quasi-brick) motif in image masks and layout. Listasafn: 3D spinning logo and a drag-and-throw "boltaland" at the page foot. 360 Hotel: big imagery, a dark-mode section, "hógværar og smekklegar animationar". Controlant: "friendly tech", in-house illustrations. Íslandsstofa: dark mode + light mode in one design system. [V]
2. **Typography is treated as a brand decision** — Auðkenni ("eftir að hafa valið nýjar leturgerðir…"), Íslensk verðbréf ("Nýtt letur, uppfært merki"), 360 Hotel (a whole "Typography" section: "falleg og karaktersterk en jafnframt auðlæsileg"), Ísland.is ("Tekið er mið af aðgengi við val á letri, litum, orðum"). Expect them to propose a typeface pair for VILD rather than default to Inter. [V]
3. **Whitespace and hierarchy**: large display headline, short lead paragraph, then modular content blocks; product/offer cards with a single strong number. On mobile, one primary number per screen (Takk balance; Olís "4/10", "−7 kr"). [I]
4. **Photography over illustration for retail**, illustration/3D for brand moments (3D coins and sparkle in Takk, 3D road in Vegir okkar allra, 3D logo in Listasafn, 3D rock on juni.is, illustrations by Cirkus for Íslandsstofa). [V]
5. **Iconography**: custom, geometric, often derived from a logo motif (Takk's four-point sparkle ✦ and four-petal "flower" tiles; Olís's house/percent/pin/car/hamburger set in brand green). [V from screenshots]
6. **Motion**: scroll-driven storytelling (Vegir okkar allra "skrunsaga"), micro-interactions via Framer Motion, "litir, tákn og hreyfingar bjóða notanda velkominn" (Olís app). They explicitly warn against motion that "truflar eða hægir á vefnum" (360). [V]
7. **Accessibility** is a default claim on almost every page (WCAG AA, third-party audits on Ísland.is, descriptive alt text on their own site). [V]
8. **Mobile app patterns** (Takk + Olís + Apótekarinn/Kringlan history): 5-tab bottom bar, greeting with first name in the header ("Takk Sóley", "Góðan dag Gunnar Sprocket"), a hero balance/benefit card, horizontal offer carousels with "Skoða allt →", segmented pill filters per partner brand, bottom sheets with a drag handle for product/offer detail, full-width pill primary button, Apple/Google Wallet pass as a core step of onboarding, pager-dot onboarding ending in a tilted 3D card. [V]

---

## 4. Concrete case-study notes (for pattern-mining)

- **Hagkaup.is** [V]: user research at the start of the cosmetics launch, usability tests during build; "einfaldleiki, fágun og framúrskarandi þjónusta"; goal that online feels like being in the store. Mobile screenshot: top black promo bar, orange HAGKAUP wordmark centred, hamburger left / bag right, slide-in menu with a search field, uppercase category list with chevrons, orange underline on the active section, icons for recent/account/wishlist. Tech: Netlify + functions middleware, Prismic, Cypress/Jest, locked test environments and automated releases.
- **Olís app** [V, 3 screenshots]: Home = full-bleed photo hero with a diagonal cut, "Góðan dag / Gunnar Sprocket", two yellow tiles "Vinahópssöfnun 4/10" and "Þinn afsláttur −7 kr", "Tilboð →" carousel (green cards, yellow stripe, product cut-outs, name + price/percent), tabs Heim · Tilboð · Stöðvar · Glans · Meira. Stations = light grey map with brand-coloured pins (Olís green O, ÓB yellow, Grill 66 red) and clusters ("+3"). Wallet = green screen "Bæta korti við símaveski", card mock with a key-fob image, black "Add to Apple Wallet" button, "Sleppa" skip link. Júní designed; **Enum** built.
- **forseti.is** [V]: goals = "nútímaleg framsetning og virðuleiki", storytelling rooted in Icelandic saga tradition, plain-language ("einfalt mál") routes for younger users, FAQ to cut office workload, live feed/video/podcast/Instagram embeds, easy CMS (Sanity). Awwwards HM.
- **Borgarleikhúsið** [V]: KPIs +10% ticket sales, −31% calls, −23% wait; Tix integration, LiveChat, cross-sell (tickets, season passes, dining); they wrote content-entry guidelines so the design survives real content.
- **Íslandsstofa design system** [V]: built so sub-sites (Visit Iceland, Outhorse your email, Horses of Iceland, Meet in Reykjavík) could be spun up fast; light + dark modes; used across all marketing.
- **Nemendagrunnur** [V]: dashboards for school admissions, filters/search, OneRoster standard for interoperability — evidence they can do dense admin UIs, not just consumer apps.
- **Vegir okkar allra** [V]: scrollytelling explainer with 3D hero, charts, video; done with ad agency Aton JL.
- **Þórkatla / Basalt** [V]: Framer builds when speed matters; the Þórkatla knot logo rationale shows they write proper brand narratives.
- **Íslensk verðbréf** [V]: rebrand + merged site in "rétt rúman mánuð" with one accountable owner — relevant if VILD wants a fast timeline.

---

## 5. Takk — everything from Júní's side (https://www.juni.is/verkefni/takk) [V]

**Page metadata**: title "Takk appið frá Högum – Forritun og hönnun vildarapps | Júní"; Viðskiptavinur: Hagar; Okkar hlutverk: **App hönnun, Forritun**; Tæknistakkur: **React Native, NestJS – GraphQL API**; "Heimsækja" link → https://apps.apple.com/us/app/takk/id6745477799.

**Their copy, in full (paraphrased closely):**
- *Um verkefnið og markmið þess*: "Takk appið er nútímaleg lausn fyrir verslanir Haga sem vilja umbuna tryggum viðskiptavinum með einföldum og aðgengilegum hætti. Kerfið gerir notendum kleift að safna Takk-krónum við kaup á ýmsum vörum ásamt því að geta tekið þátt í keppnum, nýtt sérstök tilboð og fengið sérsniðin meðmæli sem byggð eru út frá kauphegðun notandans."
- *Náið samstarf*: "Verkefnið byggir á sterkri samþættingu milli kerfa. Júní þróaði **miðlag** sem tengir vildarkerfið meðal annars við efnis- og vörustjórnunarkerfi … Unnið var náið með tækniteymi Haga til að útfæra **greiðsluflæði** vildarkerfisins. Þetta tryggir að þegar kaup eru staðfest fá notendur rétt magn af Takk-krónum og að söfnun og nýting punkta virki örugglega í öllum greiðslustigum, hvort sem um er að ræða greiðslu í gegnum netverslun eða búð."
- *Hönnun og notendaupplifun í fremsta flokki*: "Á hönnunarsviðinu **leiddi Júní uppbyggingu appsins frá grunni**. Júní mótaði bæði UI og UX þannig að notendaupplifunin væri einföld, nákvæm og ánægjuleg — frá fyrstu uppsetningu (onboarding) til daglegrar notkunar þar sem auðvelt er að fylgjast með Takk-krónum og nýta sér tilboð."
- *Aðgengileg og skemmtileg nálgun*: "Kjarnaupplifun appsins var skipulögð kringum lykilatriði: **heimaskjá með yfirliti yfir stöðu króna, auðvelt aðgengi að tilboðum og viðburðum, skýrt upplýsingaskipulag og rökrétt notendaflæði** … Hönnun var prófuð og ýtruð í nánu samstarfi við teymi Haga. Með notendaprófunum, endurgjöf og hraðri útfærslu breytinga…"
- Outcome line: "traust, notendavæn og sveigjanleg lausn sem eykur tryggð viðskiptavina og bætir kaupupplifunina … samstilltu kerfi fyrir vöru- og viðskiptagögn, öruggu greiðsluflæði og faglegri hönnun".
- Testimonial (Eiður Eiðsson, framkvæmdastjóri stafrænnar þróunar og UT hjá Högum): long-term partner on takk app, hagkaup.is, olis.is, bananar.is and apps; "lausnamiðaður og sveigjanlegur samstarfsaðili … skilja þarfir og kröfur notenda en um leið meðvituð um flækjustig innviða".
- LinkedIn (~Jan 2026): "Launched the app for the Takk loyalty community, with app design and backend work done in partnership with Hagar." [S]

**Screens on the page (I downloaded and viewed them; Prismic asset names in brackets):**
1. **Home** [takk-screen1]: iPhone frame, header "Takk Sóley" in white on a lavender→violet radial gradient; five **3D purple coins** stamped "tkr" and ✦ tumbling around the top; a white **speech-bubble-shaped balance card** ("Þín inneign" small purple label, "**16.965 tkr.**" huge in violet, with a circular ✦ badge hanging off the lower-left corner and "Safnað frá upphafi 32.400 tkr." beneath); three white pill chips carrying the partner wordmarks **HAGKAUP · BÓNUS · ELDUM RÉTT**; a dismissible card "Hvernig **virkar** Takk?" where "virkar" sits in a violet pill (× to dismiss); section "Takk í dag" with "Skoða allt →"; two product cards (white rounded 24px, product photo, a **corner tag "70 tkr. til baka"** coloured **orange for Hagkaup and yellow for Bónus**); bottom tab bar (frosted, rounded top) **Heim (t-logo) · Takk vörur (✦ in circle) · Önnur tilboð (dots) · Viðburðir & leikir (sparkles) · Mitt Takk (coin stack)**, active in violet, inactive grey.
2. **Mitt Takk** [Takk–MittTakk]: same bubble balance card on a lavender glow; a profile row (initials avatar "SU", name, email, chevron); a "Stillingar" row with a violet ✦ icon; a 2×2 grid of tiles with **four-petal flower icons** in violet (Kvittanir), pink (Skilmálar), orange, green.
3. **Kvittanir** [Takk–MittTakk-Kvittanir]: "← Mitt Takk" back, title, "tkr" badge top right; receipt rows: retailer chip (orange H, Bónus pig, Olís O, Eldum rétt pot), store name, date/time "2.2.2025, 15:10", lavender pills "**+ 489 tkr.**" / "**− 229 tkr.**", total "31.580 kr." (note: Olís receipts appear — the loyalty graph spans Hagar's fuel brand too; also note the mock dates are 2025, i.e. pre-launch design).
4. **Takk vörur › Bónus** [Vöruyfirlit bonus]: **page background switches to Bónus pale yellow**; segmented pills (Bónus active in yellow); category headers "Grænmeti", "Börnin"; product cards with "70 tkr. til baka" yellow tag + "BÓNUS" corner label; name, "650 gr. - 614 kr. / kg", "279kr."
5. **Product bottom sheet** [Vöruyfirlit bonys]: drag handle, large product image, Bónus corner tag, a white card with "Verð 279kr." (violet) · pink flower icon · "tkr. til baka 19 tkr."; name, unit price, description "Iceberg Salat er ferskt og gott salat. Það er líka vegan og bara geggjað." (casual tone).
6. **Partner offer sheet** [2-1]: page blurred behind; Lemon photo with a green "2f1" bubble + ✦; "2f1 af stóru Kombó", "Alla virka daga á milli 16–18"; full-width **lavender pill button "Nýta tilboð"**.
7. **Onboarding, step 6/6** [Junicard]: "takk" wordmark pill, six pager dots, headline "Takk kortið þitt tilbúið til notkunar!", body "Nú getur þú safnað Takk krónum þegar þú verslar í Hagkaup, Bónus og Eldum rétt. Kíktu á Takk tilboðin í appinu!", a **tilted 3D dark-purple wallet card** (TAKK KRÓNU INNEIGN 36.530, NAFN Sóley Uggadóttir, contactless symbol, coins), white pill CTA "**Klára ferlið**".
8. An "Ellipse" asset = the purple radial glow used as a background layer.

**Typography/colour of Takk** [I + V]: the app uses a rounded geometric grotesk; takkkronur.is (Next.js) loads **"Matter"** (Displaay, weights 300–800) and **"Solar"** (400/600) and uses `#691fe7` violet, `#18003e` near-black purple, lavenders `#dbc7ff / #e9dffa / #f0ebf7`. The app screenshots match this palette, so I infer the app shares the Matter/Solar system. Icelandic number formatting everywhere ("16.965 tkr.", "279kr.", "614 kr. / kg"). Who created the Takk **brand** (wordmark, coin, sparkle) is not credited anywhere; Júní's page claims the app UI/UX "frá grunni" but does not claim the brand identity, and takkkronur.is has no credits. [V — absence]

**Market facts** [V]: Hagar launched Takk 14 Jan 2026 (hagar.is); sign-up = download, log in with **rafræn skilríki**, add the Takk card to the phone wallet; earn tkr on "Takk merktar vörur" in Bónus/Hagkaup/Eldum rétt, spend in Bónus/Hagkaup stores (not online); weekly "Takk tilboð" also shown on electronic shelf labels; partner offers Glans, Grill 66, Lemon; events and games. ~60k "Takkarar" by April 2026, ~65k by June 2026 [S]. v1.0 on the App Store 11 Jan 2026, v1.4 on 13 Oct 2026 added a **"Skemmtun" tab** (games and prizes), "Vinningarnir þínir", redesigned receipts; developer "Hagar hf"; US App Store shows 1.8★ from only 6 ratings (tiny, US-store sample); Google Play has ~28 reviews. Criticism (Heimildin [S]): discounts seen as small; privacy terms (Hagar looks up postal code and gender from kennitala). Lesson for VILD: be ready for "lækkið bara verðið" pushback and be transparent about data.

---

## 6. How to brief Júní well and match their bar in your prototype

**What they respond to (from their own case-study structure)** [I]:
1. **Business goal + KPI** up front. Every case study has "markmið" and, where possible, numbers (ticket sales, call reduction, membership). Give VILD's: e.g. restaurants onboarded, active members, redemption rate, repeat-visit lift, cost per acquired member.
2. **Users and research access.** They will want ≥5 real users for interviews (both diners and restaurant staff/owners) and a recruit plan; tell them who you can get into a room. Their blog literally says "erfiðast er að finna rétta fólkið".
3. **Scope the first step as a hönnunarsprettur** (4 days: flows → vote → Figma prototype → testing) and ask for the output as a usability report + deck plus a clickable Figma prototype. That is a product they already sell.
4. **Brand**: say whether VILD has a mörkun already or whether you are buying it. They do logo/type/palette/image-style work (Þórkatla, Auðkenni, Íslensk verðbréf) and will otherwise ask for brand assets.
5. **Integrations and constraints**: POS/receipt data source, payment flow (they did Takk's "greiðsluflæði" with Hagar's team), identity (rafræn skilríki), Apple/Google Wallet passes, push notifications, partner content management (they built a middleware connecting loyalty to content/product management for Takk — VILD's restaurant-offer CMS is the analogue), analytics, GDPR/persónuvernd. Mention ISO 27001 expectations.
6. **Build or hand-off?** Decide whether they design only (then expect them to want a design system in Figma + Storybook and a partner like Enum) or design + build (React Native + NestJS/GraphQL is their proven combo).
7. **Cadence**: offer a weekly stöðufundur with a decision-maker present and 2-week sprints with demos; they repeatedly praise clients for "skilvirkir ákvörðunartökufundir".
8. **Timeline reality**: they did a rebrand + site in ~1 month (Íslensk verðbréf) and Þórkatla "á mettíma", but Takk was a multi-month platform build with Hagar's team.

**Matching their quality bar in your own prototype** [I, derived from the Takk/Olís/juni.is evidence]:
- Pick a **real typeface pair** and commit (they ship licensed fonts: Founders Grotesk + Orelo for themselves, Matter + Solar for Takk, Serrif + DM Sans for forseti). A rounded geometric grotesk with good Icelandic diacritics (ð, þ, æ, ö) is the Takk register; test "Þín inneign", "Nýta tilboð", "Kvittanir" at display sizes.
- **One hero number per screen**, set very large (Takk: ~56–64pt balance) inside a distinctive container (speech-bubble card), with a secondary stat in small caps-ish label style ("Safnað frá upphafi").
- **Partner colour-coding**: tag colour and even page background shift to the partner brand (Bónus yellow page, orange Hagkaup tags). For VILD, give each restaurant a tag colour/logo chip and keep VILD's own colour for the chrome.
- **Card system**: 20–24px radii, white on tinted background, soft wide shadows, a corner "X kr. til baka" tag, image-first.
- **Bottom sheets** with a drag handle for product/offer detail, blurred page behind, one full-width pill CTA ("Nýta tilboð").
- **5-tab bottom bar** with custom icons derived from the logo motif; frosted/translucent bar with rounded top corners.
- **Onboarding** as 5–6 dot-paged steps ending in a wallet-card reveal and a single "Klára ferlið" button; e-ID login as step 1.
- **Receipts/history list** with retailer chip, date/time, +/− pills in the brand tint, total on the right.
- **3D accent objects** (coins, sparkle, card) rendered in the brand colour, used sparingly on the home header and onboarding only; everything else flat.
- **Icelandic microcopy**: friendly, second person, short ("Fáðu Takk krónur til baka", "Skoða allt", "Nýta tilboð", "Klára ferlið"), product descriptions allowed to be cheeky ("bara geggjað"), numbers with a period thousands separator and "kr." suffix.
- **Accessibility**: contrast on lavender/violet text, descriptive alt text, 44px targets — they will check.
- Keep the rest of the UI **quiet**: their stated philosophy is "fullkominn samhljóm milli aðgengileika og fegurðar" and "láta minna fara fyrir mörkuninni og láta virkni njóta sín" (Borgarsögusafn).
- Avoid generic AI-looking output; Guðmundur's post is explicit that "gervigreind kemur aldrei í staðinn fyrir góðan smekk".

---

## 7. Open questions / things I could not verify
- Exact merger date and ownership split (vb.is is behind Cloudflare; Vísir only covers Andri's 2024 hire). Current MD: Arndís (site) vs Andri (press).
- Who designed the Takk **brand identity** (logo, coins, sparkle) — Júní claims UI/UX and build, not the mark.
- Any Takk app usage/NPS data beyond member counts.
- FÍT / Hönnunarverðlaun Íslands / Lúðurinn entries for Júní — none found.
- Instagram (@juniehf) content — rate-limited; LinkedIn personal profiles blocked.
- "Web Excellence Awards" for forseti.is — only via LinkedIn post summary.

## 8. Source URLs
- https://www.juni.is/ · /verkefni · /thjonusta · /um-okkur · /blogg · /velkomin-i-juniversinn · /juno
- https://www.juni.is/verkefni/takk · /verkefni/olisapp · /verkefni/olisvefur · /verkefni/hagkaup · /verkefni/bananar · /verkefni/forseti · /verkefni/nemendagrunnur · /verkefni/vegir-okkar-allra · /verkefni/borgarleikhusid · /verkefni/360hotel · /verkefni/harpa · /verkefni/islensk-verdbref · /verkefni/borgarsogusafn · /verkefni/listasafn-reykjavikur · /verkefni/basalt · /verkefni/audkenni · /verkefni/þorkatla · /verkefni/stafraent-island · /verkefni/map-of-iceland · /verkefni/islandsstofa · /verkefni/visit-iceland · /verkefni/controlant
- https://www.juni.is/blogg/honnunarsprettur · /blogg/hannad-fyrir-folk-af-hverju-nytsemisrannsoknir-skipta-mali · /blogg/gervigreind-hja-juni · /blogg/hallo-heimur-juno · /blogg/aeo-geo-optimisation · /blogg/hvað-er-þetta-iso-27001-eiginlega
- Takk screenshots (Prismic): https://images.prismic.io/juni-verse/aXzDfgIvOtkhCH40_takk-screen1.png, …aXd7FQIvOtkhB8Aj_Takk–MittTakk.png, …aXd6kgIvOtkhB7_-_Takk–MittTakk-Kvittanir.png, …aXd7TgIvOtkhB8As_Takk–Vöruyfirlitbonys.png, …aXd7TgIvOtkhB8Au_Takk–Vöruyfirlitbonu.png, …aXy4AwIvOtkhCHst_2-1.png, …aYB_dN0YXLCxVQcG_Junicard.png
- https://is.linkedin.com/company/juni-ehf · https://dribbble.com/kosmosandkaos · https://read.cv/juliarunolfs
- https://www.visir.is/g/20242625690d/andri-adstodarframkvaemdastjori-juni · https://vb.is/folk/andri-nyr-framkvaemdastjori-juni/ · https://vb.is/folk/nyir-starfsmenn-radnir-til-juni/ · https://vb.is/frettir/parallel-og-kosmos-kaos-sameinast/
- https://www.vf.is/vidskipti/kosmos---kaos-opnar-skrifstofu-i%CC%81-stokkho%CC%81lmi · https://www.visir.is/g/2016967489d/gudmundur-bjarni-eignast-alla-hluti-i-kosmos-og-kaos
- https://www.awwwards.com/sites/the-presidency-of-iceland · https://www.forseti.is/
- https://www.visir.is/g/20242540865d/tilnefningar-til-islensku-vefverdlaunanna · https://www.visir.is/g/20232398060d/thau-hlutu-islensku-vefverdlaunin-i-ar · https://www.svef.is/winners/tilnefningar-2024/ · https://www.svef.is/verdlaun/verdlaunahafar-2025/
- https://www.hagar.is/um-haga/frettir/almennar-frettir/hagar-gefa-ut-vildarkerfid-takk/ · https://apps.apple.com/us/app/takk/id6745477799 · https://play.google.com/store/apps/details?id=is.hagar.takk · https://www.takkkronur.is/ · https://www.mbl.is/matur/frettir/2026/06/29/65_000_manns_hafa_skrad_sig_i_takk/ · https://heimildin.is/grein/26171/netverjar-oanaegdir-med-takk-kronur-laekkid-bara-verdid/
- https://skift.com/?p=500545 (Skift 2022 list) · https://clutch.co/is/agencies/digital-design
