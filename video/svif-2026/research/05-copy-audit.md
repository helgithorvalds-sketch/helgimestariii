# 05 · Copy audit and copy deck (Icelandic)

Scope: every visible or indexable Icelandic string in `src/routes/index.tsx`, `fyrirtaeki.tsx`, `baeklingur.tsx`,
`__root.tsx`, `src/components/*.tsx` (Header, FaqSection, BookingForm, BookingSection, StoryChrome, ContentsList,
StageHero, SiteFooter, PageLoader, SvifBits, VideoLightbox, StepVideo), `src/components/motion/scenes.tsx` +
`StepScene.tsx`, the 3D label and texture strings in `src/three/stories/*.ts` + `src/three/builders/*props.ts`,
`src/lib/email-templates/*.tsx` and `public/baeklingur/flettibok.html`.

**Snapshot:** files read at 01:30–01:40 UTC, 9 Nov 2026. `index.tsx` and `fyrirtaeki.tsx` were rewritten by the
motion agent while this audit ran. The deck below covers the **current** text. The owner's own wording comes from the
7 Nov build (`svif/.output/server/_ssr/routes-eZe7Ok3P.mjs`), which is the last version that still had it verbatim.

---

## 0. Must-fix list (in priority order)

1. **"Velkomstbæklingur" is still live** in `public/baeklingur/flettibok.html`: `<title>`, `meta description`,
   `og:title`, `og:description` (lines 6–9) and the visible header label `Velkomstbæklingur · 32 síður` (line 114).
   This page sits inside the /baeklingur iframe and opens on its own via "Opna í fullum skjá". The replacement text
   is in §5.
2. **The owner's verbatim lines have been overwritten** by the current build. Restore them:
   - Step 01 title lost its ending. Owner: **"Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup"**. Current:
     "…ráðast í framkvæmdir".
   - All four "Af hverju SVIF" cards were rewritten ("Rétt tímasetning", "Tilboð sem er geymt", "Þú ert fyrst í
     röðinni"). The owner's titles and bodies must stay. A one-line on-screen version is allowed only if the full
     owner text stays one tap away (§3.4).
   - The five home FAQ answers were cut to one or two lines. The owner's answers must stay, with grammar fixes only
     (§3.7).
3. **Grammar errors inside owner text.** Fix these (allowed under the "unless grammatically wrong" rule):
   - "Auglýsing er hent" → **"Auglýsingu er hent"**. *Henda* takes the dative, and the dative stays in the passive.
     The /fyrirtaeki copy already has it right.
   - "Venjulegar auglýsingar eru auðvelt að fletta framhjá" → **"Það er auðvelt að fletta framhjá venjulegum
     auglýsingum."** Neuter singular *auðvelt* cannot agree with the feminine plural subject, and *framhjá* takes the
     dative. The original is an English "tough"-construction calque.
   - "ræðum hvort þú **vilt**" → "hvort þú **viljir**". Indirect questions take the subjunctive, which the owner's
     own FAQ 4 already uses ("hvort þú viljir").
   - "leggjum við saman árangurinn" → "**tökum** við saman árangurinn". *Leggja saman* means adding numbers;
     *taka saman* means summing up.
   - "**Yfir** þriggja mánaða samning nær auglýsingin þín því **að rúmlega 1.500 heimilum**" → "**Á þriggja mánaða
     samningstíma** nær auglýsingin þín því **til um 1.500 heimila**". "Yfir" is a calque of English "over". The
     verb is *ná til* + genitive, and 500 × 3 is "um", not "rúmlega", 1.500.
4. **Fact risks** (details in §2):
   - "Nýir húseigendur eyða meiru fyrstu 6 mánuðina en næstu 5 ár á eftir" is **unsupported** in this form. Give the
     owner the safer line.
   - "…og heldur sig oftast við hana" (/fyrirtaeki, card 2) is **unsupported**. Drop it.
   - The 3D business booklet page prints **"8 FLOKKAR"**, but the page lists **14** categories. Remove the count or
     make the two agree.
5. **"Nýr rekstur" is a placeholder name** for the business brochure and appears in 8 places. Examples: the hero
   tagline, the BookingSection corner, the footer line, the 3D cover texture and the film. It needs the owner's
   approval before launch.
6. **E-mail flow bug that affects copy.** When an applicant gives only a phone number, `BookingForm` passes
   `helgithorvalds@gmail.com` as the e-mail. `booking-email.server.ts` then sends the customer's "Takk fyrir!"
   confirmation to the owner, with the reply-to set to the owner. Skip the confirmation when no e-mail was given.

---

## 1. House rules for every string (apply to the agents' future edits too)

- **Voice.** Write like the flyer: short declaratives in natural spoken Icelandic. The flyer's best line is the model:
  *"Nýju heimili fylgja ótal verkefni."* Let a line carry one idea. When the visual already shows a list, leave the
  list out of the text.
- **Banned (AI tells in Icelandic):**
  - *einmitt þegar*
  - *á þeim tímapunkti þegar* (a calque of "at the point when")
  - *í hvert sinn sem…* openers
  - *lausn/lausnir*
  - *raunverulegur* (except inside the owner's own sentence)
  - *hárréttur*, *einstakt tækifæri*
  - em-dash chains
  - "X, Y og Z" triplets that are rhythm rather than a real list
  - rhetorical questions in headings
  - exclamation marks
  - the possessive before the noun (*"þitt fyrirtæki"* → *"fyrirtækið þitt"*)
  - *"í fullum skjá"*
- **Address.** On the home page, use *þú* (the owner's value cards use *þig/þitt*). The owner's H1 *"Við tengjum
  ykkur við…"* stays as the one exception. On /fyrirtaeki, use *þið* throughout.
- **Names.** Write the company as "SVIF" in visible copy (as on the logo and flyer). "Svif" is fine only in
  `og:site_name`/schema. Inflect the brochure name: *Nýji kaflinn / Nýja kaflann / Nýja kaflanum / Nýja kaflans*. Every
  current use is correct. *Bæklingur* is masculine; *í næsta bæklingi* (dative) is correct everywhere now.
- **Numbers.** Use *um 500*, *um 250*, *1.500* (dot for thousands), *6 mánuðir*, *25%*.
- **Category lists.** Use "&" as the flyer's contents page does (*Gólf & flísar*). Use the same separator on both
  pages.
- **Length.** Headings ≤ 6 words where possible. At most one short body sentence. Many sections need none.

---

## 2. Fact-check

| Claim (where) | Verdict | Evidence | Safer wording |
|---|---|---|---|
| "Um 80% nýrra húseigenda ráðast í framkvæmdir (eftir húsakaup)" (home step 01, owner line) | **Weakly supported**: no Icelandic data. US data is higher (85–90%+), UK data is lower (44% in year 1, 64% within 2 years). "Improvements" in the US studies includes small DIY jobs. | HIRI: "85% of homebuyers make improvements to their homes within 12 months of buying a home" ([Hardware Retailing, Apr 2025, HIRI study](https://hardwareretailing.com/hiri-fast-facts-home-buyer-trends-in-2024/)). HIRI 2022: "more than 9 in 10 respondents who purchased homes in the last year have since undertaken home improvement projects" ([HIRI blog](https://hiri.org/blog/trends-home-buying-renovations)). UK: 44% renovate within the first year, 64% within two years ([Zoopla, Feb 2025, n=1,000](https://www.zoopla.co.uk/press/releases/a-renovation-obsessed-nation-two-thirds-of-homebuyers-renovate-a-home-within/)). I found no Icelandic survey. | Keep the owner's title, and add a small source label to the step (corner label or footnote): **"Heimild: HIRI, Bandaríkin 2025"**. If the owner wants no number: **"Flestir nýir húseigendur ráðast í framkvæmdir eftir húsakaup."** |
| "Nýir húseigendur eyða meiru fyrstu 6 mánuðina en næstu 5 ár á eftir." (home card 2, owner line) | **Unsupported as worded** | This is a marketing-industry claim with no primary study, and its versions contradict each other. "New residents spend more in their first six months in town than an established resident does over three years" (Welcomemat, via [Entrepreneur 2012](https://entrepreneur.com/growing-a-business/why-your-new-neighbors-may-hold-the-key-to-your-business/224915)). "Spend more on goods and services than non-movers do over a five-year period", in the first **three** months and with no source ([directmail.com](https://www.directmail.com/gamechanger2/directory/mailing_lists/newmoverslists/)). "Up to 20 times more in their first six months than existing homeowners" spend in two years ([Welcome Wagon](https://welcomewagon.com/new-mover-marketing/)). Every version compares movers with *established residents*, but the site compares the same people with their own next 5 years, which no source says. | **"Flestir nýir húseigendur breyta og bæta á fyrsta árinu."** (HIRI 85%, above.) Or: **"Nýir húseigendur eyða nær tvöfalt meiru í endurbætur en aðrir."** (Houzz 2022: recent buyers' median renovation spend "was nearly double that of renovating homeowners of all residency lengths", [Houzz](https://pro.houzz.com/pro-learn/blog/9-key-takeaways-from-the-2022-houzz--home-study)). The owner decides; both are grammatical. |
| "Hundruð nýrra fyrirtækja í hverjum mánuði" (/fyrirtaeki step 01) | **Supported** | Hagstofa Íslands: Q1 2025, "nýskráð 921 fyrirtæki í atvinnurekstri, þar af 783 einkahlutafélög" (≈ 307/month) ([Hagstofa Q1 2025](https://hagstofa.is/utgafur/frettasafn/fyrirtaeki/nyskraningar-og-gjaldthrot-fyrirtaekja-a-1-arsfjordungi-2025/)). Q3 2025: 806, of which 722 ehf. (≈ 269/month) ([Hagstofa Q3 2025](https://www.hagstofa.is/utgafur/frettasafn/fyrirtaeki/nyskraningar-og-gjaldthrot-fyrirtaekja-a-3-arsfjordungi-2025/)). | Keep. "Um 250 eintök á mánuði" fits under these counts. The old film line "til **allra** nýrra fyrirtækjaeigenda" overclaims, so drop "allra". |
| "Um 500 heimili á mánuði" on höfuðborgarsvæðið (hero facts, step 04, FAQ) | **Supported** as a delivery figure | HMS: residential kaupsamningar in the capital area went "úr 376 í 633" from Jan to Feb 2024 ([HMS mánaðarskýrsla apríl 2024, PDF](https://hms-web.cdn.prismic.io/hms-web/Zh_yFPPdc1huKlIt_HMS_M%C3%A1na%C3%B0arsk%C3%BDrsla_apr%C3%ADl2024.pdf)). Nationally, "um 1.000" a month in Aug–Sep 2024, with an average of 924 a month since 2017 and about 685 over 18 years. Capital-area listings taken off sale were 642 in Sep and 704 in Oct 2024 ([HMS mánaðarskýrsla nóv. 2024, PDF](https://hms-web.cdn.prismic.io/hms-web/Zz4Bi68jQArT1FNT_HMS_M%C3%A1na%C3%B0arsk%C3%BDrsla_n%C3%B3vember2024.pdf)). HMS's 2026 reports note fewer kaupsamningar than in previous years ([HMS júlí 2026](https://hms.is/skyrslur/manadarskyrsla-juli-2026); hms.is rate-limited further reads). Range: roughly 375–700 a month, seasonal. Kaupsamningar include investors and companies. | Keep "um 500". The owner's H1 "alla nýja húseigendur" and "um 500" can both stand as marketing, but never write "í hvert sinn sem heimili er selt". That line is gone now; keep it out. |
| "Við sjáum þegar kaup eru skráð" / legacy "Kerfið nemur ný fasteignakaup **um leið** og þau eru skráð" | **Weakly supported** | HMS: "Nokkurra vikna töf getur verið á því að þinglýstir kaupsamningar berist í Kaupskrá HMS" (Nov 2024 report, footnote 1). | **"Við sjáum þegar kaupsamningi er þinglýst…"**, without "um leið". |
| "Um leið og fyrirtæki er skráð vitum við af því." (/fyrirtaeki step 03) | **Unverified process claim** | I found no public feed of new registrations on skatturinn.is, where the register is a search tool ([Fyrirtækjaskrá](https://www.skatturinn.is/fyrirtaekjaskra/)). The real delay depends on SVIF's data source. | **"Við fylgjumst með nýskráningum, um allt land."**, or "jafnóðum" if the owner confirms a daily feed. |
| "Nýtt fyrirtæki velur sér þjónustu á fyrstu vikunum **og heldur sig oftast við hana**" (/fyrirtaeki card 2) | **Unsupported** (only UK banking evidence) | UK CMA 2016: "Only 4% of SMEs in GB had switched BCA provider in the last year", and "over half of start-up SMEs… went to their owner's PCA provider" ([CMA final report summary, §106](https://assets.publishing.service.gov.uk/media/57a8c0fb40f0b608a7000002/summary-of-final-report-retail-banking-investigation.pdf)). This covers banking only and is not Icelandic. | **"Flest er valið á fyrstu vikum rekstrarins."** |
| "8 FLOKKAR" (3D business booklet left page, `business.ts:525`) | **Inconsistent** | The page lists 14 categories. | Replace with "SÉRKJÖR" or drop it. Use "14 FLOKKAR" only if the list stays at 14. |
| "rúmlega 1.500 heimilum" (home FAQ 1, owner) | **Arithmetic** | um 500 × 3 = um 1.500 | **"um 1.500 heimila"** |

---

## 3. Copy deck: home (`/`)

Legend: **Keep** = no change. **Owner** = verbatim, do not edit. Visuals refer to the 3D story (`home.ts`), the
`/svif/story/*.jpg` stills and the printed pages in `/svif/kafli/`.

### 3.1 Meta (`index.tsx` head)

| Field | Current | Proposed |
|---|---|---|
| title | SVIF · Nýji kaflinn · auglýsingar heim til nýrra húseigenda | **Keep** (59 chars) |
| description | Nýir húseigendur á höfuðborgarsvæðinu fá Nýja kaflann inn um lúguna, með sérkjörum frá völdum fyrirtækjum. Bókaðu pláss fyrir þitt fyrirtæki. | …Bókaðu pláss fyrir **fyrirtækið þitt**. |
| og:description | Bæklingur í póstlúgu nýrra húseigenda á höfuðborgarsvæðinu. Auglýstu þar sem fólk var að kaupa. | **Bæklingur sem nýir húseigendur fá inn um lúguna. Auglýstu hjá þeim sem voru að kaupa.** ("þar sem fólk var að kaupa" reads as "where people were shopping".) |
| twitter:description | Bæklingur til nýrra húseigenda. Auglýsingin þín, þegar þörfin er mest. | Use the og:description, so there is one string to maintain. |
| JSON-LD description | Svif sendir bæklinginn Nýja kaflann heim til nýrra húseigenda… | **Keep** (name "SVIF"). |

### 3.2 Hero (dark stage, live 3D booklet)

| Element | Current | Proposed | Pair with |
|---|---|---|---|
| Tagline | SVIF · Nýji kaflinn | **Keep** | hairline draw |
| H1 | Við tengjum ykkur við *alla nýja húseigendur* á höfuðborgarsvæðinu. | **Owner, keep** | the booklet turning in light |
| Sub | Nýir húseigendur fá Nýja kaflann inn um lúguna, með sérkjörum frá völdum fyrirtækjum. (13 words) | **Nýir húseigendur fá Nýja kaflann inn um lúguna.** (7 words) Optional second line in tracked caps, straight from the cover: **SÉRKJÖR FRÁ TRAUSTUM FYRIRTÆKJUM** | the booklet: let the cover's own lettering do the talking |
| CTA 1 | Bóka pláss | **Keep** | |
| CTA 2 | Sjá hvernig | **Svona virkar það** (a full phrase that matches the section title; "Sjá hvernig" is a truncated calque of "See how") | |
| Facts row | Um 500 heimili á mánuði · Örfá fyrirtæki í hverjum flokki · Hannað, prentað og sent af SVIF | **Um 500 heimili á mánuði · Hannað, prentað og sent af SVIF** (drop the middle one: step 03 and the contents section say it already, and two items break the triplet) | roof-mark separators |
| Corners | Velkomin · 65°N · 19°W · Allt fyrir nýja húseigendur · Tilboð og afslættir | **Keep** (a deliberate echo of the printed cover; mark them `aria-hidden`) | |

### 3.3 "Svona virkar það" (pinned 3D story)

Header: eyebrow **"Frá sölu að póstlúgu"** (keep), title **"Svona virkar það."** (keep).
Chapter labels: make the definiteness consistent: Nýtt heimili · Bæklingurinn · Traust fyrirtæki · Kerfið ·
**Dreifingin** (currently "Dreifing"; /fyrirtaeki already uses "Dreifingin").

| # | Title | Line (≤ 14 words) | In-scene words (DOM callouts / textures) | Visual |
|---|---|---|---|---|
| 01 | Current: "Um 80% nýrra húseigenda ráðast í framkvæmdir". **Restore owner: "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup"** | Current: "Fyrstu mánuðina þarf að tryggja, mála, skipta um gólf og kaupa inn. Og velja hverjum á að treysta." (17 words, and the list repeats the callouts). **→ "Nýju heimili fylgja ótal verkefni."** (the flyer's own sentence, 4 words) | Six one-word callouts: **Tryggingar · Málning · Húsgögn · Gluggar · Gólfefni · Rafmagn** (keep). Optional: rename to the flyer's contents words so step 01 rhymes with step 02's contents page (Gólf, Gluggar, Eldhús, Rafmagn, Lagnir, Tryggingar). That needs a tap/kitchen prop instead of the armchair. Add a small source label "HIRI 2025" (see §2). | house; six objects rise on the plinth |
| 02 | **Owner, keep: "Þess vegna bjuggum við til SVIF"** | Current: "Nýji kaflinn kemur inn um lúguna með traustum fyrirtækjum fyrir hvert verkefni heimilisins." (14) **Keep**, or shorter: **"Traust fyrirtæki fyrir hvert verkefni heimilisins."** (6) | No DOM label. The cover texture reads NÝJI KAFLINN, and the spread shows the real contents page. | objects condense into the booklet, which lands and opens |
| 03 | "Örfá traust fyrirtæki í hverjum flokki" **Keep** | Current: "Hvert þeirra býður nýjum húseigendum sérkjör. Afslátt, fría úttekt eða betra verð." **→ "Hvert þeirra býður nýjum húseigendum sérkjör."** (the coupons show the offers) | Only the real coupon faces (Parki 25%, Ormsson 20%, Íspan 20%, Gardínur "Frí mátaka heim"). At most one callout: **Sérkjör**. Spell the eldvarnir advertiser **Maus** (the flyer), not "Mús" (bible §4a). | coupons fan above the booklet |
| 04 | "Kerfið finnur nýja húseigendur" **Keep** | Current: "Við sjáum þegar kaup eru skráð og sendum bæklinginn þangað. Hvergi annað." **→ "Við sjáum þegar kaupsamningi er þinglýst og sendum bæklinginn þangað. Hvergi annað."** (12; accurate verb, see §2) | Pins on the rose homes: **Nýr eigandi**. Counter: **Um 500 / á mánuði**. | town rises, rose homes, rings, pins |
| 05 | "Við hönnum, prentum og sendum" **Keep** (it mirrors the flyer's back page "Hannað, prentað og sent af SVIF") | Current: "Þú sendir merki, myndir og tilboð. Við gerum auglýsinguna og hún fer heim til nýrra eigenda." (16) **→ "Þú sendir merki og tilboð. Við sjáum um allt hitt."** (10) | Stations: **Hönnun · Prentun · Dreifing**. Final callout at the door slot: **Inn um lúguna**. | print stack; copies fly; the last one slides into this door |

Footer of the story: film button **"Horfa á myndbandið"** (keep). Add `meta="45 sek."` for parity with /fyrirtaeki
(use the real length). Lightbox label "Svona virkar SVIF": keep.

### 3.4 "Af hverju SVIF" (dark, four image cards)

Tagline **"Af hverju SVIF"** and title **"Rétta fólkið á réttum tíma."**: keep.

Pattern: each card shows the owner's **title** and a **one-line on-screen version**. Most of these lines are excerpts
of the owner's own words. A quiet "Meira" (+) toggle under the line opens the **full owner text** in place, using the
FAQ's height+opacity motion. Do not replace the owner's text.

| # | Title (owner, verbatim) | On-screen line | Full text (owner; grammar fixes in **bold**) | Pair with (existing still) |
|---|---|---|---|---|
| 1 | Þar sem eftirspurnin er | **Engin óþarfa dreifing.** (owner's first sentence) | Engin óþarfa dreifing. Bæklingurinn fer beint til nýrra húseigenda á þeim tímapunkti þegar þeir eru að koma sér fyrir, skipuleggja framkvæmdir og leita að þjónustu fyrir nýja heimilið sitt. *(grammatical; keep)* | `why-1.jpg`: one rose house with a pin among pale houses |
| 2 | Fullkomin tímasetning | Owner: "Nýir húseigendur eyða meiru fyrstu 6 mánuðina en næstu 5 ár á eftir." It is grammatical (*eyða* + dative *meiru*) but **unsupported**. Recommended: **"Flestir nýir húseigendur breyta og bæta á fyrsta árinu."** | Same as the line, or the owner's sentence if they accept the risk. | `why-2.jpg`: the paint can and armchair arriving at the house. Even better: a hairline 12-month ring that fills to ~85% |
| 3 | Afslátturinn gefur bæklingnum virði | **Auglýsingu er hent. Afsláttur er geymdur.** (condensed from the owner's own FAQ 5) | **Það er auðvelt að fletta framhjá venjulegum auglýsingum.** Með sérkjörum og afsláttum verður bæklingurinn hins vegar að einhverju sem nýir húseigendur hafa raunverulegan ávinning af því að geyma og skoða þegar þörfin kemur upp. | `why-3.jpg`: contents + coupon spread. Better: the perforated coupon page (`p29.jpg`) with one coupon lifting off along the tear line |
| 4 | Afslátturinn vinnur fyrir þig | **Fyrirtækið þitt er þegar komið inn á heimilið.** (owner's words) | Þegar þörfin fyrir pípara, málara, smið eða aðra þjónustu kemur upp, er fyrirtækið þitt þegar komið inn á heimilið. Nýi húseigandinn hefur séð tilboðið þitt og hefur ástæðu til að leita til þín fyrst. *(grammatical; keep. The comma after the fronted clause is allowed.)* | `why-4.jpg`: the booklet in the door slot |

### 3.5 Contents / categories (cream)

| Element | Current | Proposed | Pair with |
|---|---|---|---|
| Eyebrow | Fyrir fyrirtæki | **Flokkar** (same as /fyrirtaeki) | |
| Title | Flokkað eftir *verkefnum heimilisins.* | **Keep** (the flyer's phrase "flokkuð eftir verkefnum") | |
| Body | Örfá fyrirtæki í hverjum flokki, svo auglýsingin þín fái athygli. | **Drop.** Step 03 says it, and the list shows it. If one line must stay: **"Örfá í hverjum flokki."** | |
| List title | Úr efnisyfirliti Nýja kaflans | **Keep** | |
| Rows | Gólf & flísar bls. 4 · Gluggar & gler bls. 5 · Eldhús & tæki bls. 6 · Rafmagn & net bls. 8 · Eldvarnir bls. 12 · Þjónusta & filmur bls. 16 · Múr, málun & smíði bls. 18 · Bað & lagnir bls. 22 · Lásar & tryggingar bls. 26 | **Keep.** All nine match the printed contents page (`ref/page-1.jpg`). | printed pages p00 + p01. Make each row's hover/scroll highlight its block on the printed page, so the list *is* the explanation. |
| Alt texts | Forsíða Nýja kaflans · Efnisyfirlit Nýja kaflans: flokkar og blaðsíður | **Keep** | |

### 3.6 Business-brochure teaser (peach)

| Element | Current | Proposed | Pair with |
|---|---|---|---|
| Eyebrow | Nýtt · Fyrir ný fyrirtæki | **Keep** | |
| Title | Við tengjum ykkur líka við *öll ný fyrirtæki* á Íslandi. | **Keep** (it now matches /fyrirtaeki "á Íslandi") | |
| Body | Bæklingur með sérkjörum til nýrra fyrirtækjaeigenda, á fyrstu vikum rekstrarins. Eitt fyrirtæki í hverjum flokki. | **Sama hugmynd, fyrir nýstofnuð fyrirtæki. Eitt í hverjum flokki.** (9) | business cover in depth |
| Link | Fyrirtækjabæklingurinn → | **Keep** | |
| Alt | Forsíða fyrirtækjabæklingsins Nýr rekstur | "Forsíða fyrirtækjabæklingsins" until the name is approved | |

### 3.7 FAQ (home), with the owner's answers restored and fixes in **bold**

Chrome: keep the title "Algengar spurningar." and drop the eyebrow "Spurningar" (a duplicate), or change it to
"Spurt og svarað".

1. **Hvar og hversu oft er bæklingnum dreift?**
   Við byrjum á höfuðborgarsvæðinu og dreifum um 500 bæklingum á mánuði. **Á þriggja mánaða samningstíma** nær
   auglýsingin þín því **til um 1.500 heimila** þar sem eftirspurnin er mest. Við bætum stærstu þéttbýliskjörnum
   landsins við eftir því sem dreifingin stækkar.
2. **Hvað kostar að auglýsa?**
   Verð fer eftir stærð og staðsetningu auglýsingar**innar** í bæklingnum ásamt fjölda heimila í dreifingunni. Við
   bjóðum upp á þriggja mánaða samning: þú borgar fyrir hverja dreifingu og eftir þrjá mánuði höldum við samtal þar
   sem við metum árangurinn og ræðum hvort þú **viljir** halda áfram eða breyta plássinu.
3. **Hver hannar auglýsinguna?**
   Við gerum það með þér. Þú sendir okkur **merki**, myndir og helstu skilaboð**. Við** hönnum auglýsinguna svo hún
   passi við útlit bæklingsins og þú færð uppkast til samþykktar áður en farið er í prentun.
   *(The em-dash becomes a full stop. "logo" becomes "merki", which the site already uses elsewhere.)*
4. **Hver er uppsagnarfresturinn?**
   Þú gerir samning um þrjá mánuði í senn. Greiðsla fer fram fyrir hverja dreifingu og að þeim tíma loknum **tökum**
   við saman árangurinn og höfum samband til að athuga hvort þú viljir halda **samningnum** áfram eða breyta plássinu.
   *("áskriftinni" becomes "samningnum", the term used in every other answer. Owner question: the answer never states
   the notice period. If none applies beyond the 3-month term, add "Enginn uppsagnarfrestur er umfram það.")*
5. **Af hverju eru afslættir í bæklingnum?**
   Af því að þeir gefa bæklingnum virði. **Auglýsingu** er hent**, en** afsláttur sem fólk á eftir að nota er
   geymdur. Afslátturinn þinn tryggir að bæklingurinn lifi áfram á heimilinu og að hringt sé í þig þegar þörfin
   vaknar.

### 3.8 Booking section + form (dark), shared with /fyrirtaeki

| Element | Current | Proposed | Pair with |
|---|---|---|---|
| Tagline | Pláss í næsta bæklingi | **SVIF · Nýji kaflinn** (/fyrirtaeki: the business name). The current tagline repeats the title word for word. | |
| Title | Bóka pláss *í næsta bæklingi.* | **Keep** | |
| Body | Nafn fyrirtækis, kennitala og tilboðið. Við sjáum um restina. | **Við sjáum um restina.** (the form shows the three fields) | the form itself is the visual |
| Steps (hairline list) | Þú sendir umsókn · Við staðfestum pláss í flokknum · Þú færð próförk fyrir prentun | **Umsókn · Staðfesting · Próförk** (one word per step on the drawn hairline, numbered 01–03) | a hairline timeline with three ticks that fill as the form is completed |
| Corners | Pláss · {corner} · svif.is · 853 5147 | **Keep** | |
| Label 1 | Nafn fyrirtækis | **Keep** | |
| Label 2 | Kennitala (placeholder 000000-0000) | **Keep** | |
| Label 3 | Tilboð til nýrra húseigenda / Tilboð til nýrra fyrirtækja | **Keep** | |
| Placeholder 3 | t.d. 15% afsláttur af fyrsta verki, eða frí úttekt · t.d. fyrsti mánuður frír, eða 20% afsláttur | **t.d. 15% afsláttur af fyrsta verki eða frí úttekt** · **t.d. fyrsti mánuðurinn frír eða 20% afsláttur** (Icelandic puts no comma before "eða" here) | |
| Labels 4–5 | Netfang · Sími | **Keep** | |
| Helper | Netfang eða sími dugar. | **Keep** | |
| Error | Það tókst ekki að senda. Reyndu aftur eða hringdu í 853 5147. | **Keep** | |
| Button | Senda / Sendi | **Senda / Sendi…** (add the ellipsis; "Sendi" alone reads as a noun) | |
| Phone link | Eða hringdu í 853 5147 | **Keep** | |
| Success | Takk. · Við höfum samband innan tveggja virkra daga. · Liggur á? 853 5147 | **Keep** (it matches the e-mail promise) | |

### 3.9 Header, footer and chrome (shared)

| Element | Current | Proposed |
|---|---|---|
| Header nav (home) | Svona virkar það · Af hverju SVIF · Bæklingurinn · Ný fyrirtæki · Spurningar | **Keep** (optional: drop "Spurningar" to leave four) |
| Header CTA | Bóka pláss | **Keep** |
| Mobile menu | … · Sími 853 5147 | **Keep** |
| aria | SVIF, forsíða · Aðalvalmynd · Valmynd · Opna/Loka valmynd | **Keep** |
| Footer line (home) | Nýji kaflinn · bæklingur fyrir nýja húseigendur | **Keep** |
| Footer nav | Forsíða · Ný fyrirtæki · Bæklingurinn · 853 5147 | **Keep** |
| Footer base | Hannað, prentað og sent af SVIF · svif.is · 65°N · 19°W | **Keep** (the flyer's back page) |
| Loader | Nýji kaflinn · aria "Hleð síðu" | **Keep** |
| Lightbox | Loka | **Keep** |
| StepVideo | Hleð myndband | **Keep** (legacy) |
| 404 | Síðan fannst ekki · Síðan sem þú leitaðir að er ekki til eða hefur verið færð. · Á forsíðu | **Keep** |
| Error | Síðan hlóðst ekki · Eitthvað fór úrskeiðis hjá okkur. Prófaðu að endurhlaða eða fara á forsíðuna. · Reyna aftur · Á forsíðu | **Keep** |
| Alt "Svif" (logo, loader, footer) | Svif | **SVIF** |

---

## 4. Copy deck: /fyrirtaeki (current rewrite, 01:37 UTC)

### 4.1 Meta

| Field | Current | Proposed |
|---|---|---|
| title | SVIF fyrir ný fyrirtæki · bæklingur til nýrra fyrirtækjaeigenda (63 chars, "fyrirtæki…fyrirtækja-" twice) | **SVIF · Bæklingur til nýrra fyrirtækja** (37). Once the name is approved: **Nýr rekstur · SVIF · bæklingur til nýrra fyrirtækja** |
| description | Nýir fyrirtækjaeigendur um allt land fá bækling með sérkjörum frá völdum fyrirtækjum, á fyrstu vikum rekstrarins. Eitt fyrirtæki í hverjum flokki. | **Keep** |
| Header links | Svona virkar það · Af hverju SVIF · Flokkar · Spurningar · Nýji kaflinn | **Keep** |

### 4.2 Hero

| Element | Current | Proposed | Pair with |
|---|---|---|---|
| Tagline | SVIF · Nýr rekstur | Keep if the name is approved, otherwise **SVIF · Fyrir ný fyrirtæki** | |
| H1 | Við tengjum ykkur við *öll ný fyrirtæki* á Íslandi. | **Keep** | business booklet in light |
| Sub | Nýir fyrirtækjaeigendur fá bækling með sérkjörum frá völdum fyrirtækjum, á fyrstu vikum rekstrarins. (14) | **Nýstofnuð fyrirtæki fá bækling með sérkjörum á fyrstu vikunum.** (9) | |
| CTAs | Bóka pláss · Horfa á myndbandið (52 sek.) | **Keep** | |
| Corners | Velkomin · Fyrir ný fyrirtæki · Um 250 eintök á mánuði · Hannað, prentað og sent af SVIF | **Keep** | |

### 4.3 Story (eyebrow "Frá stofnun að póstkassa": keep; title "Svona virkar það.": keep)

| # | Chapter | Title | Line | In-scene words | Visual |
|---|---|---|---|---|---|
| 01 | Ný fyrirtæki | Hundruð nýrra fyrirtækja í hverjum mánuði (**keep**; supported) | Current: "Hvert þeirra þarf bókhald, tryggingar, banka, vefsíðu og búnað. Og velur það allt á fyrstu vikunum." **→ "Hvert þeirra velur sér þjónustu á fyrstu vikunum."** (the six callouts are the list) | **Bókhald · Tryggingar · Vefsíða · Banki · Tölvur · Hönnun** (keep) | new office rises; six objects with callouts |
| 02 | Bæklingurinn | Bæklingur fyrir nýja fyrirtækjaeigendur (keep) | "Eitt fyrirtæki í hverjum flokki. Auglýsingin ykkar stendur ein." **Keep** | Page texture: "EITT FYRIRTÆKI / Í HVERJUM FLOKKI" (keep). **Remove "8 FLOKKAR"** (§2). Category tiles: Bókhald, Tryggingar, Vefsíða, Banki, Tölvur, Hönnun, Lögfræði, Prentun, with one in rose. | booklet opens; one rose tile per category |
| 03 | Kerfið | Kerfið finnur nýskráð fyrirtæki (keep) | Current: "Um leið og fyrirtæki er skráð vitum við af því. Um allt land." **→ "Við fylgjumst með nýskráningum, um allt land."** ("jafnóðum" only if the source is daily) | Pins on the lit offices: **Nýskráð** | wide district; companies light up one by one |
| 04 | Dreifingin | Við hönnum, prentum og sendum (keep) | "Um 250 eintök á mánuði, á fyrstu vikum rekstrarins." **Keep** | **Hönnun · Prentun · Dreifing** · counter **Um 250 / á mánuði** | print stack; copies fly; the last one into the new office door |

### 4.4 "Af hverju SVIF" (/fyrirtaeki)

The title "Rétta fólkið *á réttu augnabliki.*" becomes **"Rétta fólkið *á réttum tíma.*"** (one phrase across the
site and both films).

| # | Current title / body | Proposed title / body |
|---|---|---|
| 1 | Þar sem eftirspurnin er / Bæklingurinn fer aðeins til nýrra fyrirtækjaeigenda. | Keep the title. **Engin óþarfa dreifing.** (parity with home) |
| 2 | Rétt tímasetning / Nýtt fyrirtæki velur sér þjónustu á fyrstu vikunum og heldur sig oftast við hana. | **Fullkomin tímasetning** (parity with home) / **Flest er valið á fyrstu vikum rekstrarins.** (the stickiness claim is unsupported) |
| 3 | Einn í hverjum flokki / Enginn samkeppnisaðili á næstu síðu. | **Eitt í hverjum flokki** (agrees with "Eitt fyrirtæki…" in the section heading; "Einn" implies *aðili*) / body **keep** |
| 4 | Tilboð sem er geymt / Sérkjörin gera bæklinginn að einhverju sem er geymt á skrifstofunni. | **Sérkjörin vinna fyrir ykkur** / **Auglýsingu er hent. Sérkjör eru geymd.** |

### 4.5 Categories

| Element | Current | Proposed |
|---|---|---|
| Eyebrow / title / body | Flokkar / Eitt fyrirtæki *í hverjum flokki.* / Hver flokkur er seldur einum aðila í einu. | **Keep** all three |
| List title | Flokkar í bæklingnum | **Keep** |
| Rows (14) | Bókhald og endurskoðun · Lögfræðiþjónusta · Tryggingar · Bankar og greiðslur · Vefsíður og hugbúnaður · Auglýsingar og hönnun · Prentun og merkingar · Tölvur og fjarskipti · Skrifstofuhúsnæði · Húsgögn og innréttingar · Ráðgjöf og ráðningar · Öryggi og eftirlit · Bílar og flutningar · Launakerfi | Same words with **"&"** as on home and the flyer: Bókhald & endurskoðun · Lögfræði · Tryggingar · Bankar & greiðslur · Vefsíður & hugbúnaður · Auglýsingar & hönnun · Prentun & merkingar · Tölvur & fjarskipti · Skrifstofuhúsnæði · Húsgögn & innréttingar · Ráðgjöf & ráðningar · Öryggi & eftirlit · Bílar & flutningar · Launakerfi. Optional visual: a status dot per row (rose = frátekið, hairline = laust), shown only if the data is real. |

### 4.6 FAQ (/fyrirtaeki): derived text, so shorter versions are fine; grammar check below

| Q | Current A | Verdict / proposed |
|---|---|---|
| Hverjir fá bæklinginn? | Eigendur nýskráðra fyrirtækja um allt land, á fyrstu vikum rekstrarins. Um 250 eintök á mánuði. | **Keep** |
| Hvað kostar að auglýsa? | Verðið fer eftir stærð og staðsetningu auglýsingar. Samningur er til þriggja mánaða og greitt fyrir hverja dreifingu. | Add the owner's review step: **"…Samningur er til þriggja mánaða og greitt er fyrir hverja dreifingu. Eftir þrjá mánuði metum við árangurinn saman."** |
| Er bara eitt fyrirtæki í hverjum flokki? | Já. Hver flokkur er seldur einum aðila í einu, svo enginn samkeppnisaðili er í bæklingnum. | **Keep** (a result clause, so the indicative is correct) |
| Hver hannar auglýsinguna? | Við gerum það. Þið sendið merki, myndir og skilaboð og fáið próförk til samþykktar fyrir prentun. | **Keep** |
| Af hverju eru sérkjör í bæklingnum? | Auglýsingu er hent, en sérkjör sem nýr rekstur á eftir að nota eru geymd. Þannig er bæklingurinn enn á borðinu þegar þörfin kemur. | **Keep** (correct dative) |
| *(missing)* | | Add the home question: **Hver er uppsagnarfresturinn?** "Samningurinn er til þriggja mánaða í senn. Að þeim loknum tökum við saman árangurinn og þið ákveðið framhaldið." |

### 4.7 Booking, footer, film

- BookingSection corner "Nýr rekstur" and footer line "Nýr rekstur · bæklingur fyrir ný fyrirtæki": both depend on
  the name. Fallback: **"Fyrir ný fyrirtæki"** and **"SVIF · bæklingur fyrir ný fyrirtæki"**.
- The form's `brochure="Fyrirtækjabæklingur"` is an internal key, so it is fine.
- Lightbox label "SVIF fyrir ný fyrirtæki, kynningarmyndband": keep.

---

## 5. /baeklingur and the flipbook

| Element | Current | Proposed |
|---|---|---|
| title | Skoðaðu bæklinginn – Nýji kaflinn · SVIF | **Nýji kaflinn · Flettu bæklingnum · SVIF** (or keep; both are fine) |
| description | Flettu í gegnum Nýja kaflann, bækling SVIF fyrir nýja húseigendur á höfuðborgarsvæðinu. | **Keep** |
| Header links | 7 links, including a self-link "Skoða bæklinginn", "Fyrir fyrirtæki" **and** "Fyrirtækjabæklingur", and "Af hverju Svif?" with a question mark | Use the home defaults with "/#" anchors: **Svona virkar það · Af hverju SVIF · Bæklingurinn · Ný fyrirtæki · Spurningar** |
| Header CTA | Bóka pláss í bæklingnum | **Bóka pláss** |
| Eyebrow / H1 | SVIF · Nýji kaflinn / Skoðaðu *bæklinginn.* | **Keep** |
| Body | Svona lítur Nýji kaflinn út þegar hann kemur inn um lúguna hjá nýjum húseigendum á höfuðborgarsvæðinu. Smelltu á bókina eða strjúktu til að fletta. | **Eins og hann kemur inn um lúguna.** (the flipbook already shows its own hint, so this one is a duplicate) |
| Corners | Nýji kaflinn · 2026 · Fyrir nýja húseigendur · svif.is | **Keep** |
| Full-screen link | Opna bæklinginn í fullum skjá | **Opna á öllum skjánum** |
| Page CTA | Bóka pláss í bæklingnum | **Bóka pláss** |
| iframe title | SVIF – Nýji kaflinn, bæklingur fyrir nýja húseigendur | **Keep** |
| `flettibok.html` `<title>`, `og:title` | SVIF – Velkomstbæklingur | **Nýji kaflinn · SVIF** |
| `flettibok.html` description, `og:description` | Flettu í gegnum velkomstbækling SVIF fyrir nýja húseigendur. | **Flettu í gegnum Nýja kaflann, bækling SVIF fyrir nýja húseigendur.** |
| `flettibok.html` header `.undir` | Velkomstbæklingur · 32 síður | **Nýji kaflinn · 32 síður** |
| Hint | Smelltu á bókina, strjúktu eða notaðu örvatakkana til að fletta | **Smelltu, strjúktu eða notaðu örvatakkana.** |
| Controls | Fyrri opna · Næsta opna · Byrja aftur · Forsíða / bls. 1 af 32 · 2D / 3D | **Keep** |
| Contents | Efnisyfirlit · 23 fyrirtæki · 24 auglýsingasíður | **Keep** |

---

## 6. Legacy 2D scenes (`motion/scenes.tsx`): only if kept as the no-WebGL fallback

No route imports them now (the 3D story uses posters). If they are kept, fix these:

- Captions are all triplets with middle dots, the exact rhythm the owner called AI-ish. Drop all four:
  - "Nýtt heimili · ný verkefni · nýir þjónustuaðilar"
  - "Hvert verkefni · traust fyrirtæki · allt í einum bæklingi"
  - "Traust fyrirtæki · raunverulegt tilboð · örfá í hverjum flokki" (also uses the banned *raunverulegt*)
  - "Kerfið nemur ný fasteignakaup um leið og þau eru skráð" (the "um leið" problem from §2)
- Scene 03 shows "Umsóknir / Ekkert tilboð" with greyed-out trades. That implies SVIF rejects advertisers, which the
  site never says. Drop it, or turn it into "Sérkjör" tags only.
- The rest are fine as one- or two-word labels: "80%", "nýrra húseigenda ráðast í framkvæmdir", "Efnisyfirlit", the
  INDEX rows (which match the flyer), "Nýr eigandi", "um 500 · ný heimili á mánuði", "Hönnun · Prentun · Dreifing".

---

## 7. E-mails (`src/lib/email-templates`)

**booking-confirmation** (to the applicant)

| Element | Current | Proposed |
|---|---|---|
| Subject | Umsóknin þín er komin til SVIF | **Keep** |
| Preview | Við höfum móttekið umsóknina þína hjá SVIF | **Umsóknin er komin til okkar.** |
| Heading | Takk fyrir! | **Takk.** (no exclamation mark; matches the on-site success state) |
| Greeting | Sæl(l) {name}, where name = the company name, giving "Sæl(l) Pípulagnir ehf.," | **Góðan daginn,** |
| Para 1 | Við höfum móttekið umsókn frá {company} um pláss í næsta bæklingi ({category}). | **Takk fyrir umsóknina um pláss í {Nýja kaflanum / fyrirtækjabæklingnum}.** (inflect per brochure) |
| Para 2 | Við höfum samband innan tveggja virkra daga, staðfestum hvort pláss sé laust í þínum flokki, sendum verðskrá og biðjum um logo og myndir fyrir próförk. | **Við höfum samband innan tveggja virkra daga og staðfestum hvort flokkurinn sé laus. Þá sendum við verðskrá og biðjum um merki og myndir fyrir próförkina.** |
| Footer | SVIF — Nýji kaflinn. Hannað, prentað og sent heim til nýrra húseigenda. (wrong for business bookings; uses an em-dash) | **SVIF · Hannað, prentað og sent · svif.is · 853 5147** |

**booking-notification** (internal): change the subject "Ný umsókn — {company}" to **"Ný umsókn: {company}"**. Drop
the "Tengiliður" row, because it always repeats the company name. Show **"Netfang: —"** when no e-mail was given,
instead of the owner's own address (see §0.6).

---

## 8. Films: on-screen words (cross-check with `03-old-film-audit.md` §4)

The film captions should reuse the site's step titles word for word, so that the site and films match by
construction. Review of the 03 draft:

- **"ÓTAL VERKEFNI / *fylgja nýjum rekstri.*"**: good (the flyer's idiom).
- **"*Hvar á að byrja?*"**: one question as a narrative beat is acceptable in film. Keep it to this single instance.
- **"UM ALLT LAND / *til allra nýrra fyrirtækjaeigenda.*"** → **"UM ALLT LAND / *um 250 á mánuði.*"** ("allra"
  overclaims, §2).
- **"ÞJÓNUSTAN ÞÍN / *hjá þeim sem þurfa hana.*"** → *"…hjá þeim sem þurfa á henni að halda."* or **"*þegar hennar er
  þörf.*"**
- **End card "Rétta fólkið, á réttu augnabliki."** → **"Rétta fólkið á réttum tíma."** (no comma; same wording as the
  site).
- **Homeowner film cards:**
  - "Nýju heimili fylgja ótal verkefni."
  - "Um 80% nýrra húseigenda ráðast í framkvæmdir eftir húsakaup"
  - "Þess vegna bjuggum við til SVIF"
  - "Örfá traust fyrirtæki í hverjum flokki"
  - "Kerfið finnur nýja húseigendur"
  - "Við hönnum, prentum og sendum"
  - end card: "SVIF · Nýji kaflinn · svif.is · 853 5147"

---

## 9. Open questions for the owner (copy-level)

1. Should the business brochure be called **"Nýr rekstur"**? It is on the 3D cover, the hero tagline, corners, the
   footer and the film.
2. **80%**: keep it with a small source label (HIRI 2025, US), or use "Flestir…" without a number?
3. **6 months vs 5 years**: replace it with "Flestir nýir húseigendur breyta og bæta á fyrsta árinu."?
4. FAQ "Hver er uppsagnarfresturinn?": what is the actual notice period after the 3-month term?
5. New-company data source: is it daily (so "jafnóðum" is true) or weekly?

---

## Sources

- HIRI via Hardware Retailing, "HIRI Fast Facts: Home Buyer Trends in 2024" (Apr 2025): https://hardwareretailing.com/hiri-fast-facts-home-buyer-trends-in-2024/
- HIRI, "Four Trends in Home Buying and Renovating From 2022": https://hiri.org/blog/trends-home-buying-renovations
- HIRI, Recent Home Buyer and Seller Study (landing page): https://www.hiri.org/research/recent-home-buyer-and-seller-study
- Zoopla press release, 7 Feb 2025: https://www.zoopla.co.uk/press/releases/a-renovation-obsessed-nation-two-thirds-of-homebuyers-renovate-a-home-within/
- Houzz, "9 Key Takeaways From the 2022 Houzz & Home Study": https://pro.houzz.com/pro-learn/blog/9-key-takeaways-from-the-2022-houzz--home-study
- Entrepreneur (Welcomemat data), 2012: https://entrepreneur.com/growing-a-business/why-your-new-neighbors-may-hold-the-key-to-your-business/224915
- Welcome Wagon, "Why Mover Marketing?": https://welcomewagon.com/new-mover-marketing/
- directmail.com, New Movers Lists: https://www.directmail.com/gamechanger2/directory/mailing_lists/newmoverslists/
- Hagstofa Íslands, Nýskráningar og gjaldþrot fyrirtækja á 1. ársfjórðungi 2025: https://hagstofa.is/utgafur/frettasafn/fyrirtaeki/nyskraningar-og-gjaldthrot-fyrirtaekja-a-1-arsfjordungi-2025/
- Hagstofa Íslands, … á 3. ársfjórðungi 2025: https://www.hagstofa.is/utgafur/frettasafn/fyrirtaeki/nyskraningar-og-gjaldthrot-fyrirtaekja-a-3-arsfjordungi-2025/
- HMS, Mánaðarskýrsla apríl 2024 (PDF): https://hms-web.cdn.prismic.io/hms-web/Zh_yFPPdc1huKlIt_HMS_M%C3%A1na%C3%B0arsk%C3%BDrsla_apr%C3%ADl2024.pdf
- HMS, Mánaðarskýrsla nóvember 2024 (PDF): https://hms-web.cdn.prismic.io/hms-web/Zz4Bi68jQArT1FNT_HMS_M%C3%A1na%C3%B0arsk%C3%BDrsla_n%C3%B3vember2024.pdf
- HMS, Mánaðarskýrsla júlí 2026 (title only; the site returned HTTP 429): https://hms.is/skyrslur/manadarskyrsla-juli-2026
- Skatturinn, Fyrirtækjaskrá: https://www.skatturinn.is/fyrirtaekjaskra/
- UK CMA, Retail banking market investigation, final report summary (Aug 2016), §106: https://assets.publishing.service.gov.uk/media/57a8c0fb40f0b608a7000002/summary-of-final-report-retail-banking-investigation.pdf
- Flyer reference: `scratchpad/ref/page-0.jpg`, `page-1.jpg`, `page-2.jpg`, `page-31.jpg` (voice and category names)
- Owner's original wording: `scratchpad/svif/.output/server/_ssr/routes-eZe7Ok3P.mjs` (build of 7 Nov 2026)
