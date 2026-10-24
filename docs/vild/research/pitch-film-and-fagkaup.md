# Research: VILD presentation video and Fagkaup

Date: 2026-10-23. Working files are under
`/tmp/claude-0/-home-user-helgimestariii/da13251d-4995-5005-9478-c83f554f6de9/scratchpad/research/`.

## Task 1: https://tinyurl.com/vild-kynning

### Where the link goes

- `https://tinyurl.com/vild-kynning` -> HTTP 301 -> **`https://cdn.jsdelivr.net/gh/helgithorvalds-sketch/helgimestariii@4881feddfdbeaba27f1a24411ba4329d7a65aca4/video/gledipeningar/vild-web.mp4`** (HTTP 200, `video/mp4`, 18,615,673 bytes).
- Host: **jsDelivr CDN** serving a raw file from the GitHub repo `helgithorvalds-sketch/helgimestariii` (the user's own repo, the same one as this working directory) pinned to commit `4881fedd...`. It is not YouTube/Vimeo/Drive/Loom; it is a direct MP4, so there is no page title, description, uploader profile, view count or captions track. `yt-dlp` was not needed (direct download via curl).
- Commit `4881fedd` (2026-10-23 11:18 UTC) message: "Add the VILD v2 film, its web version and the updated storyboard sheet". The folder `video/gledipeningar/` holds `vild.mp4` (75 MB master, 60 fps), `vild-web.mp4` (18.6 MB web version), `README.md`, `STORYBOARD.md`, `storyboard/storyboard.html` + `storyboard.png` + 26 key-frame JPGs, plus the Three.js/Python source that renders the film. The folder name and `src/brand.js` (a "gleðipeningar" wordmark in Figtree 800) show the concept was earlier called *Gleðipeningar*; v2 is branded **VILD / Vildarpeningar**. The local checkout (branch `claude/inspiring-archimedes-w1amk1`) does not contain this folder or commit; everything was fetched from GitHub/jsDelivr.

### File facts (ffprobe)

- Duration **156.01 s (2:36)**, 1920x1080, H.264, 30 fps (web version; master is 60 fps), AAC stereo 48 kHz, ~955 kbit/s, encoder Lavf60.16 (FFmpeg). No title/description metadata tags.
- Audio: mean -15.4 dB, peak -1.7 dB. Per the project README the film has **no voiceover**; the soundtrack is a synthesised 110 BPM score plus sound effects generated in Python. So there is no transcript to produce; whisper/faster-whisper are not installed and were not installed (no speech to transcribe anyway). The full on-screen text is in the storyboard below.

### What the film is (from README.md and STORYBOARD.md in the same commit)

A 156-second, five-chapter motion-graphics pitch for **VILD**, a credit-back loyalty app ("Vildarpeningar") for restaurant and bar chains. The first four chapters use **Takk krónur** (Hagar's app for Bónus, Hagkaup and Eldum rétt; 65,000 members per Hagar, Sept 2026; 1 tkr = 1 kr.) to explain the mechanism and its weakness (thin grocery margins), then chapter 5 "drops" into VILD: the same mechanism for restaurants/bars where ~30% margins give three times the room to give credit back. The restaurant numbers are illustrative.

Look: soft "clay" 3D (Three.js) with flat 2D infographics on top. Chapters 1-4 live on a lilac studio floor in Takk purple; from the VILD drop at 1:10 the world turns green. Typeface **Figtree** throughout (bold, tight tracking for headlines; small caps-style tracked labels for eyebrows). Every cut lands on a 110 BPM beat; each chapter opens with a colour "iris" flood and a card.

Brand tokens (from STORYBOARD.md, storyboard.html and src/brand.js):

| Token | Value |
| --- | --- |
| Takk purple | `#691FE7` (coin/pills), ink `#18003E`, spark `#836FFF` / `#B9A2FF` |
| VILD light green | `#B4FF9B` |
| VILD dark green (text, end-card mark) | `#0C5C3B` |
| Credit-amount accent yellow | `#FFD24D` (deep `#F2B705`) |
| Discount/"cost" pink | magenta-pink (e.g. the 5.000 kr. "Kostar" figure) |
| Chapter cards | Kafli 1 lavender, Kafli 2 pink, Kafli 3 purple, Kafli 4 ink, Kafli 5 + Hugmynd 1-3 light green |

VILD marks: (a) a **coin logo**, a light-green coin with an inner ring and a bold V, with offset shadow, used on the 3D coin, app icon and notifications; (b) the **end-card mark**, a circular arrow wrapping a V (dark green `#0C5C3B`) with a thin, widely letter-spaced `V I L D` wordmark below. Both were redrawn as vectors "from the brand artwork supplied for this pitch".

### Scene list with on-screen text (storyboard, 26 scenes)

| Time | Scene | On-screen text (Icelandic) |
| --- | --- | --- |
| 0:00 | Takk coin falls/spins | Vildarkerfi Haga / Takk krónur |
| 0:04 | Counter rolls to 65.000 while clay people pop up | 65.000 manns hafa þegar skráð sig í Takk, í Bónus, Hagkaup og Eldum rétt |
| 0:09 | Kafli 1 card (lavender) | Af hverju? |
| 0:11 | Reason 1, pink "0 kr." tag | Ástæða 1: Það kostar ekkert að vera með. |
| 0:14 | Reason 2, tag flips into Takk coin | Ástæða 2: Engin áhætta. Þú getur bara grætt. |
| 0:17 | Reason 3, people enter a store | Ástæða 3: Það dregur fólk í búðina. |
| 0:22 | Kafli 2 card (pink) | Hvernig virkar Takk? |
| 0:24 | Phone taps terminal, coins fly into app | Þú verslar. / Í stað afsláttar færðu inneign til baka. / Beint inn í appið. |
| 0:31 | Kafli 3 card (purple) | Afsláttur eða inneign? |
| 0:33 | Three shops, silver "kr" coins leak next door | Afsláttur: Keypt fyrir 10.000 kr. með 50% afslætti. 5.000 kr. sparast, og þær má nota hvar sem er. 5.000 kr. sem fyrirtækið sér aldrei aftur. |
| 0:37 | Other shops vanish, Takk coins return | Inneign: Keypt fyrir 10.000 kr. með 50% til baka. 5.000 kr. inneign, sem má bara nota hjá þér. Peningarnir haldast í keðjunni. |
| 0:41 | Two bar rows: discount vs credit cost | Hvað kostar það fyrirtækið að gefa 5.000 kr.? ... Afsláttur kostar peninga. Inneign kostar bara vöruna. |
| 0:50 | Two lanes in/out of store | Inneign fær fólk til að koma aftur. / Inn · Út |
| 0:57 | Kafli 4 card (ink) | Hver er gallinn? |
| 0:59 | Butter; margin bar | Matvara / Þunn álagning. Smjör · 400 kr. Innkaupsverð 360 kr. Álagning ~10% = 40 kr. +20 kr. helmingur álagningarinnar til baka. 20 krónur skipta litlu. Lítil ástæða til að opna appið. |
| 1:08 | Kafli 5 card (light green), riser | Hugmyndin |
| 1:10 | DROP: VILD coin slams in, wordmark draws | VILD / Vildarpeningar fyrir veitingastaði. / Hvað ef veitingastaðir gerðu það sama og Takk? |
| 1:14 | Margin bars on mint | Álagning: Matvöruverslun ~10% / Veitingastaður & bar ~30% / Þrisvar sinnum meira svigrúm til að gefa til baka. |
| 1:19 | Offer tags slam in | Hádegistilboð / Þriðjudagstilboð / Happy hour / 2 fyrir 1 / Og þeir eru nú þegar með tilboð. |
| 1:23 | Butter vs dinner, coin stack | Takk · matvara: +20 kr. · VILD · veitingastaður: Kvöldverður fyrir tvo 8.000 kr., álagning ~30% 2.400 kr., helmingur til baka +1.200 kr. / Sami ávinningur. Án gallans. |
| 1:32 | Hugmynd 1 card | Inneign í stað afsláttar |
| 1:34 | Three sandwiches, two boards | Ein samloka kostar 3.000 kr. / 50% afsláttur: gesturinn borgar 4.500 kr. / 50% til baka sem inneign: 6.000 kr., viku seinna þriðja frítt |
| 1:51 | Punch, forest green | Sömu 3 samlokur. 6.000 kr. í stað 4.500 kr. 1.500 kr. meiri hagnaður. Og gesturinn kom aftur. |
| 1:56 | Hugmynd 2 card | Djamm í kvöld |
| 1:58 | Emerald bar, drinks slide | Föstudagskvöld / Eytt 50.000 kr. / Til baka · 16% (+8.000 kr.) |
| 2:02 | Dawn-green bedroom, phone lock screen | Laugardagsmorgunn / VILD: Þú fékkst inneign frá barnum. +8.000 kr. / Inneignin bíður. 8.000 kr. á barnum. Kíkirðu í kvöld? Bóka borð |
| 2:07 | VILD coin with +8.000 kr. pill | Daginn eftir / Að vakna með 8.000 kr. inneign gefur ástæðu til að koma aftur strax... / Afsláttur gleymist um leið. Inneign bíður, og togar fólk aftur. |
| 2:13 | Hugmynd 3 card | Söfnun |
| 2:15 | Vertical meter fills over visits | Hver heimsókn fyllir mælinn. Markmið 25.000 kr. · Flöskuborð / Drykkir 60.000 kr. +5.000 / Afmæli 90.000 kr. +7.500 / Jólahlaðborð 150.000 kr. +12.500 / Opnað! Flöskuborð í boði hússins, eftir 300.000 kr. í viðskiptum |
| 2:26 | Close, mint | Inneign fær fólk inn. Og heldur því í keðjunni. |
| 2:31 | End card | VILD (circular-arrow mark + thin wordmark) |

### Extracted frames (every 10 s, 960px wide PNGs)

Saved in `/tmp/claude-0/-home-user-helgimestariii/da13251d-4995-5005-9478-c83f554f6de9/scratchpad/research/video-frames/frame_000.png` ... `frame_015.png`.

| Frame | t | What it shows |
| --- | --- | --- |
| 000 | 0:00 | Flat saturated purple (#5B2BE0-ish) background. Huge white bold Figtree number "34.500" (counter mid-roll toward 65.000) left; a cluster of ~30 small clay people in white, lilac, navy, pink, yellow with brown heads, top-down, right. |
| 001 | 0:10 | Pale lilac/white studio background. Small purple pill "Ástæða 2", dark-ink headline "Engin áhætta." Right: a large glossy purple 3D coin (#691FE7) with a white lowercase "t" + four-point spark (Takk mark), soft contact shadow. |
| 002 | 0:20 | Lilac studio. Headline "Þú verslar." A clay card terminal showing "6.480 kr." with contactless waves; a phone with the Takk app: purple card "Takk kortið •••• 2120", "Takk krónur 1.000 tkr", list rows Hagkaup / Bónus / Eldum rétt. |
| 003 | 0:30 | White pill "Afsláttur"; headline "Keypt fyrir 10.000 kr. með 50% afslætti." Purple subhead "5.000 kr. sparast, og þær má nota hvar sem er." Three clay shops: pink, purple (yours, with a "t" sign), mint; shoppers carry silver "kr" coins. |
| 004 | 0:40 | Infographic on lilac: "Hvað kostar það fyrirtækið að gefa 5.000 kr.?" Row 1 "Afsláttur": purple bar "Greitt 5.000 kr." + dashed pink empty half; right in pink: "KOSTAR 5.000 kr. í peningum, sem má eyða hvar sem er". Row 2 "Inneign": full purple bar "Fullt verð greitt · 10.000 kr." |
| 005 | 0:50 | "Inneign fær fólk til að koma aftur." Isometric purple-awning shop with two lanes of clay people carrying Takk coins, labels "INN" and "ÚT". |
| 006 | 1:00 | Eyebrow "MATVARA", headline "Þunn álagning." Bar "Smjör · 400 kr." (Innkaupsverð 360 kr., Álagning ~10% = 40 kr.), Takk coin "+20 kr. helmingur álagningarinnar til baka", "20 krónur skipta litlu." Right: clay butter on a striped cloth and board. |
| 007 | 1:10 | Transition: pale mint-green background (world has turned green). Eyebrow "ÁLAGNING", dark-green "Matvöruverslun" with lilac bar "~10%", "Veitingastaður & bar" (bar not yet drawn). |
| 008 | 1:20 | Split comparison on mint: left pill "Takk · matvara" with butter and a tiny Takk coin, table Smjör 400 kr. / Álagning ~10% 40 kr. / Helmingur til baka +20 kr.; right dark-green pill "VILD · veitingastaður" with a clay burger on a plate. |
| 009 | 1:30 | Mint. "Ein samloka kostar 3.000 kr." Clay triangular sandwich with white price bubble "3.000 kr." |
| 010 | 1:40 | Two boards. Left pill "50% afsláttur": three sandwiches at 1.500 kr., "GESTURINN BORGAR 4.500 kr." Right dark-green pill "50% til baka sem inneign": 3.000 / 3.000 / yellow "Frítt", "GESTURINN BORGAR 6.000 kr.", green pill "Inneign 0 kr." with VILD coin icon. |
| 011 | 1:50 | Forest-green full-bleed slide, centred white/yellow/light-green type: "Sömu 3 samlokur." / "6.000 kr. í stað 4.500 kr." (yellow) / "1.500 kr. meiri hagnaður. Og gesturinn kom aftur." (light green). Small VILD coin icon below. |
| 012 | 2:00 | Dawn-green bedroom: clay sleeper in bed, nightstand, lamp, clock, phone showing 10:12 with a green VILD notification. Eyebrow "LAUGARDAGSMORGUNN"; notification card "VILD: Þú fékkst inneign frá barnum." Huge dark-green "+8.000 kr." on a yellow marker; second dark-green card "Inneignin bíður. 8.000 kr. á barnum. Kíkirðu í kvöld?" with yellow "Bóka borð" button. |
| 013 | 2:10 | Flat light-green (#B4FF9B) chapter card: eyebrow with VILD coin icon "KAFLI 5 · HUGMYNDIN", "Hugmynd 3" / "Söfnun" in dark green. |
| 014 | 2:20 | Mint. Left: vertical meter filled green-to-yellow. Eyebrow "OPNAÐ!", "Flöskuborð í boði hússins." "eftir 300.000 kr. í viðskiptum". Right: round table with ice bucket, champagne bottle with sparkler, four flutes. |
| 015 | 2:30 | End card: flat light-green field, dark-green circular-arrow-around-V mark, thin widely spaced "V I L D" wordmark beneath. |

## Task 2: Fagkaup (https://fagkaup.is/)

**What it is.** Fagkaup ehf. (kt. 670169-5459, Klettagarðar 25, 104 Reykjavík) is an Icelandic holding/trading group for the construction, infrastructure and utilities trades: "Heildstæðar lausnir fyrir bygginga-, innviða- og veituiðnaðinn", tagline "Við erum fagfólk" / "Frá fagfólki til fagfólks". It became the parent company in 2018 and took the Fagkaup name in 2021; the oldest unit, Fossberg, dates from 1927, and the site claims 98+ years, 320 staff and 20 branches in the capital area, Fjarðabyggð, Reykjanesbær, Grundartangi, Selfoss and Akureyri. Revenue was about ISK 25.6 bn in 2024 with ~1.4 bn profit. Sources: https://www.fagkaup.is/ , https://www.fagkaup.is/um-fagkaup , https://vb.is/frettir/fagkaup-kaupir-johann-olafsson-co/ .

**Ownership and management.** Owned equally by the married couple Bogi Þór Siguroddsson (stjórnarformaður/eigandi) and Linda Björk Ólafsdóttir, who bought the constituent companies between 2003 and 2016. CEO (forstjóri) is Haraldur Líndal Pétursson; unit heads include Óskar Davíð Gústavsson (Johan Rönning / S. Guðjónsson), Róbert Ísleifsson (Vatn og veitur / Ísleifur), Þórður M. Kristinsson (Sindri) and Guðmundur Hannesson (Áltak). Recent M&A: Hagblikk merged in, K. Þorsteinsson & Co. acquired, 70% of DS Lausnir, and Jóhann Ólafsson & Co. (approved by the Competition Authority). Sources: https://www.fagkaup.is/um-fagkaup , https://vb.is/frettir/fagkaup-ad-kaupa-70-i-ds-lausnum/ , https://vb.is/frettir/hagblikk-ad-renna-inn-i-fagkaup/ , https://vb.is/frettir/fagkaup-ad-kaupa-k-thorsteinsson-co/ , https://legalnetlink.net/news/landslog-merger-of-fagkaup-and-johann-olafsson-co-approved-by-icelands-competition-authority .

**What it sells / categories.** Fagkaup itself is not a shop; fagkaup.is has no product navigation (only Um Fagkaup, Staðsetningar, Skilmálar og stefnur, Mínar síður, Hafa samband, Laus störf, Reikningsviðskipti). Products are sold through its operating brands: Johan Rönning (electrical wholesale, est. 1933), Sindri and Fossberg (tools, machines, compressors, fastenings), Vatn & veitur (pipes, fittings, press systems), Áltak (exterior cladding and substructures), KH Vinnuföt (workwear, safety footwear, gloves), Ísleifur (bathroom/kitchen fixtures, est. 1921), S. Guðjónsson (industrial lighting, 1958), Hagblikk (spiral ducts, ventilation), DS Lausnir (construction and truck cranes, sale and rental), K. Þorsteinsson & Co. (building goods, 1949) and Varma & Vélaverk. Sources: https://www.fagkaup.is/ , https://www.ronning.is/fagkaup-reykjav%C3%ADk .

**Branding.** The site is a Next.js/Vercel build with Prismic CMS. The typeface is a custom/licensed sans **"Halisa"** (self-hosted Light/Regular/Bold woff2, CSS var `--font-halisa`), with Tailwind. Colour tokens are an almost entirely warm-neutral greyscale ramp plus one accent: `--color-fag-red: #eb2331` (Fagkaup red), `--color-fag-1..12`: #fff, #f6f5f4, #edebe9, #e3e0dd, #dad6d2, #c8c2bc, #675a51, #50463f, #39322d, #2d2824, #221e1b, #171412 (near-black). Logo: `https://fagkaup.cdn.prismic.io/fagkaup/aKw3rWGNHVfTORAG_fagkaup-logo.svg`. Each subsidiary keeps its own brand (e.g. Rönning). Source: https://www.fagkaup.is/ and its stylesheet `/_next/static/css/40d24f10fd066927.css`.

**App and loyalty.** There is **no consumer loyalty programme** (no vildarkerfi/klúbbur/points) anywhere on fagkaup.is or in the press. "Mínar síður" (https://minar.fagkaup.is/, "Fagkaup - Innskráning") is a B2B customer portal for account customers (reikningsviðskipti, reikningar). Fagkaup ehf. does publish **three self-service apps** on the App Store/Google Play, one per brand: "Johan Rönning" (Shopping, v1.2.8, May 2024; "Með sjálfsafgreiðsluappi Johan Rönning getur þú verslað í reikning, séð þín kjör og ... skráð tilvísun fyrir verkefnið"; works only in selected stores; v1.1.4 added list and discount prices according to the customer's terms), "Sindri sjálfsafgreiðsla" (Business) and "Vatn og veitur" (Shopping). These are trade-account scan-and-go tools, not loyalty apps. Sources: https://apps.apple.com/az/developer/fagkaup/id1677120813 , https://apps.apple.com/us/app/johan-r%C3%B6nning/id6446281904 , https://apps.apple.com/us/app/sindri-sj%C3%A1lfsafgrei%C3%B0sla/id6502372612 , https://apps.apple.com/us/app/vatn-og-veitur/id6478665948 , https://play.google.com/store/apps/details?id=is.fagkaup.fagkaup .
