# Straumlind: storyboard (v2)

A 95-second, 16:9 (1920×1080, 60 fps) motion-graphics explainer for **Straumlind**, an Icelandic electricity retailer. It answers one question: how can the same electricity cost up to 19% less?

- **Structure:** a short opening states the claim. Then the main question card appears ("Hvernig er það hægt?"), followed by four chapters. Each chapter opens with a question card and is answered on screen. The third chapter has four numbered reasons and a recap.
- **Tempo:** 120 BPM. One beat is 0.5 s and one bar is 2 s. Every cut, pop, count and stamp lands on a beat or half beat. The music is built from the same timeline, so the hits line up exactly.
- **Look:** white clay models on a cool, light studio floor with soft contact shadows, and flat 2D type and infographics on top.
  - Cyan from the Straumlind bolt (`#00BDD0`) stands for electricity and data.
  - Orange (`#FF7800`) stands for Straumlind and the savings.
  - Deep navy (`#0B3446`, from the wordmark `#00506E`) is used for type and the darker cards.
  - Type is Montserrat, Straumlind's own typeface.
- **Reading and watching at once:** headlines sit in a fixed column on the left, never more than about 600 px from the object they describe. Labels are pinned right next to their object. Only one thing moves at a time where the eye has to read.
- **Scene changes:** within a chapter, each set sinks back into the floor and the next one is built from an empty floor. Chapter cards are reached through a colour iris out of an object, or by the previous card sliding up.
- **Professional rather than bubbly:** springs are tighter than in the Gleðipeningar film (less overshoot), the palette is restrained, and motion lands precisely on the grid.
- **No overlaps:** nothing passes through anything, labels never cover each other or the headline, and lines are checked against buildings (see the rule in `.claude/skills/myndbandagerd`).

## Question cards

| Card | Colour | Text | English |
| --- | --- | --- | --- |
| Main question | navy, giant cyan "?" | Spurningin / Hvernig er það hægt? | The question / How is that possible? |
| Kafli 1 | cyan | Er þetta sama rafmagnið? | Is it the same electricity? |
| Kafli 2 | navy | Hvernig getur orkan verið ódýrari? | How can the energy be cheaper? |
| Kafli 3 | orange | Hvað þýðir það fyrir þig? | What does it mean for you? |
| Kafli 4 | cyan | Hvernig skipti ég? | How do I switch? |

## Script

Beat *n* is at *n* × 0.5 s.

| Time | Beats | Scene | Picture | On-screen text (Icelandic) | Sound |
| --- | --- | --- | --- | --- | --- |
| 0:00 | 0–16 | **Opening: the city** | Empty floor. Cyan road lines draw out from the centre, and blocks of white clay buildings pop up in waves on every half beat. A substation pops up in the middle, and power lines arc out to the homes, lighting each one on the off-beats. On beat 8 the camera starts to glide in, then dives towards one house. Navy floods out of its door. | STRAUMLIND (logo) / **Sama rafmagn.** / **Allt að 19% ódýrara.** (19 counts up) / *miðað við almennt verð stærsta raforkusalans* | Filtered intro and riser; the beat drops on 8 as "19%" lands; pops; counter ticks |
| 0:08 | 16–20 | **Main question** | Navy card with a giant cyan "?". | Spurningin / **Hvernig er það hægt?** | Impact, half-time breath |
| 0:10 | 20–24 | **Kafli 1** | The navy card slides up and reveals the cyan card. | Kafli 1 / **Er þetta sama rafmagnið?** | Impact |
| 0:12 | 24–40 | **Same power, same lines** | A hydro power station pops up, then four pylons on the half beats, with wires drawing and cyan current flowing. A substation and three identical houses follow, and the current reaches all three. Seller tags pop up over the houses on the half beats. A light panel wipes across to the bill. | **Já. Nákvæmlega það sama.** / labels: *Sama virkjun* · *Sömu línur* · *Sama dreifiveita* / tags: *Raforkusali A* · *Raforkusali B* · *Straumlind* / **Það eina sem breytist er hver selur þér orkuna.** | Pops per pylon, current hum, tag ticks |
| 0:20 | 40–52 | **The bill** | The bill fills the right half of the frame and splits into two pieces, each with an info card pinned beside it. The top piece (⅔, grey) is transmission and distribution, and the bottom piece (⅓, cyan) is the energy. The energy piece glows orange and the "Hér getur þú sparað." pill pops up next to it. Navy floods out of the energy piece. | **Reikningurinn er í tveimur hlutum.** / *Flutningur og dreifing · um ⅔ · sama hjá öllum* / *Orkan · um ⅓ · hér keppa raforkusalar* / **Hér getur þú sparað.** | Paper, split "clack", stab on the orange outline |
| 0:26 | 52–56 | **Kafli 2** | Navy card. | Kafli 2 / **Hvernig getur orkan verið ódýrari?** | Impact, half-time |
| 0:28 | 56–68 | **Reason 1: lean** | A traditional energy company stacks up block by block on the beats: power plants, headquarters, a large staff, overhead. Next to it, a single "Hugbúnaður" (software) block pops up and eight Straumlind experts land on it on the half beats. | Ástæða 1 / **Engar virkjanir. Lítil yfirbygging.** / labels: *Hefðbundið orkufyrirtæki* · *Straumlind · 8 sérfræðingar*; blocks: *Virkjanir*, *Höfuðstöðvar*, *Stórt starfslið*, *Yfirbygging*, *Hugbúnaður* / Straumlind kaupir orkuna í heildsölu og heldur rekstrinum léttum. | Stack thumps rising in pitch, eight light pops |
| 0:34 | 68–80 | **Reason 2: forecast** | A week of hourly use (168 bars, Monday to Sunday printed on the plate) rises in a wave. The orb above (Straumlind's software) sweeps a beam across the week and draws the cyan forecast line. | Ástæða 2 / **Gervigreind spáir fyrir um notkunina.** / Fyrir allar 168 klukkustundir næstu viku. / labels: *Notkun*, *Spá*, *Hugbúnaður Straumlindar* | Wave of ticks, line "draw" swell |
| 0:40 | 80–92 | **Reason 3: balance** | A clay balance scale with the pans "Keypt" (bought) and "Notað" (used). Blocks drop in on the beats: three bought, four used, so the scale tips and an orange "Jöfnunarorka" block has to be added. On beat 88 the forecast is right: the orange block turns cyan, the scale levels exactly and a "Jafnvægi" tick pops up over the pivot. | Ástæða 3 / **Jafnvægi, hverja klukkustund.** / Misræmi milli spár og notkunar er rukkað sem jöfnunarorka. / Nákvæm spá heldur kostnaðinum niðri. | Block thocks, tilt creak, "level" chime |
| 0:46 | 92–100 | **Reason 4: automation** | A phone in the middle approves an electronic ID. Four task chips around it get a cyan tick, one per half beat. | Ástæða 4 / **Sjálfvirkni í stað handavinnu.** / chips: *Skráning* · *Reikningar* · *Greiðslur* · *Mínar síður* / Minni handavinna þýðir minni kostnað. | Beep, four ticks |
| 0:50 | 100–108 | **Recap** | Four reason tiles slide in on the beats and fly into a large orange price tag that pops up on beat 104 and swings from its hole: 10,54 kr. á kílóvattstund. Orange floods out of the tag. | **Lægri kostnaður. Lægra verð.** / tiles: *Engar virkjanir* · *Lítil yfirbygging* · *Nákvæm spá* · *Sjálfvirkni* | Four slams, coin chime on the tag |
| 0:54 | 108–112 | **Kafli 3** | Orange card. | Kafli 3 / **Hvað þýðir það fyrir þig?** | Impact; the lead melody enters after it |
| 0:56 | 112–128 | **The price** | 3D bar chart of the three largest sellers and Straumlind. The bars rise one per beat, and Straumlind lands with a hit. Names and prices are printed on the plate in front of each bar. The average line draws behind the bars, and a bracket grows from Straumlind's bar up to it with "14%" beside the bar top. On beat 122.5 the line rises to the largest seller's price, the bracket stretches and the number turns to "19%". | **Verð á kílóvattstund.** / Almennt verð til heimila, með vsk. / *Meðaltal þriggja stærstu 12,19 kr.* / **14%** lægra en meðaltal þriggja stærstu / *Stærsti raforkusalinn 12,97 kr.* / **19%** lægra en almennt verð stærsta raforkusalans / source line | Rulers per bar, hit on Straumlind, stab |
| 1:04 | 128–148 | **Your home** | Two identical houses, each with a yearly energy-cost counter underneath that ticks up with the other. The orange savings pill pops up between them. Night falls: the windows light up, the other house leaves, the moon comes up, and an electric car pulls in to the Straumlind house and plugs in, with the night price above it. | **Sama heimili. Sama notkun.** / 4.500 kWst á ári, eins og í venjulegri íbúð. / *Stærsti raforkusalinn 58.365 kr.* · *Straumlind 47.430 kr.* / **10.935 kr. minna á ári** / → **Hladdu bílinn á nóttunni.** / Næturverð frá kl. 23 til 07. / pill: *7,03 kr./kWst* | Counter, coin cascade; night: filtered groove, plug "click" |
| 1:14 | 148–156 | **Across the country** | The city from the opening rebuilds at night: windows light up warm in a wave out from the substation, with a cyan ring on every home. The camera dives to one home and cyan floods out of it. | **Heimili og fyrirtæki um allt land hafa skipt.** / Akureyri og Vestmannaeyjar völdu Straumlind eftir útboð. | Pop cloud, swell |
| 1:18 | 156–160 | **Kafli 4** | Cyan card. | Kafli 4 / **Hvernig skipti ég?** | Impact |
| 1:20 | 160–174 | **Switching** | A phone on the right. Three numbered steps pop up on the left, one per beat, and the phone screen follows each step. A one-minute dial completes, then three ticks. | 1 Skráðu þig með rafrænum skilríkjum. / 2 Straumlind lætur núverandi raforkusala vita. / 3 Þú fylgist með á Mínum síðum. / **Tekur eina mínútu.** / Ókeypis. Engin binding. Rafmagnið fer aldrei af. | Beep, ticks, notification chime |
| 1:27 | 174–190 | **End card** | The two halves of the bolt slide straight in from the sides (they never intersect) and lock on beat 176. Then the mark turns slowly as one piece. | STRAUMLIND / **Sama rafmagn, bara ódýrara.** / straumlind.is | Final hit; the chord holds under the card and fades with the picture |

## On-screen text with English gloss

| Icelandic | English |
| --- | --- |
| Sama rafmagn. Allt að 19% ódýrara. | Same electricity. Up to 19% cheaper. |
| miðað við almennt verð stærsta raforkusalans | compared with the general price of the largest seller |
| Hvernig er það hægt? | How is that possible? |
| Er þetta sama rafmagnið? Já. Nákvæmlega það sama. | Is it the same electricity? Yes. Exactly the same. |
| Sama virkjun · Sömu línur · Sama dreifiveita | Same power plant · Same lines · Same distribution utility |
| Það eina sem breytist er hver selur þér orkuna. | The only thing that changes is who sells you the energy. |
| Reikningurinn er í tveimur hlutum. Flutningur og dreifing, um ⅔, sama hjá öllum. Orkan, um ⅓, hér keppa raforkusalar. Hér getur þú sparað. | The bill has two parts. Transmission and distribution, about ⅔, the same for everyone. The energy, about ⅓, where sellers compete. This is where you can save. |
| Hvernig getur orkan verið ódýrari? | How can the energy be cheaper? |
| Ástæða 1: Engar virkjanir. Lítil yfirbygging. Straumlind kaupir orkuna í heildsölu og heldur rekstrinum léttum. | Reason 1: No power plants. Small overhead. Straumlind buys the energy wholesale and keeps the business lean. |
| Ástæða 2: Gervigreind spáir fyrir um notkunina. Fyrir allar 168 klukkustundir næstu viku. | Reason 2: AI forecasts the usage. For all 168 hours of next week. |
| Ástæða 3: Jafnvægi, hverja klukkustund. Misræmi milli spár og notkunar er rukkað sem jöfnunarorka. Nákvæm spá heldur kostnaðinum niðri. | Reason 3: Balance, every hour. Any mismatch between forecast and use is charged as balancing energy. An accurate forecast keeps that cost down. |
| Ástæða 4: Sjálfvirkni í stað handavinnu. Minni handavinna þýðir minni kostnað. | Reason 4: Automation instead of manual work. Less manual work means lower cost. |
| Lægri kostnaður. Lægra verð. | Lower cost. Lower price. |
| Hvað þýðir það fyrir þig? | What does it mean for you? |
| Verð á kílóvattstund. 14% lægra en meðaltal þriggja stærstu. 19% lægra en almennt verð stærsta raforkusalans. | Price per kilowatt-hour. 14% lower than the average of the three largest. 19% lower than the largest seller's general price. |
| Sama heimili. Sama notkun. 10.935 kr. minna á ári. | Same home. Same use. 10,935 kr. less a year. |
| Hladdu bílinn á nóttunni. Næturverð frá kl. 23 til 07. 7,03 kr./kWst. | Charge the car at night. Night rate from 23:00 to 07:00. 7.03 kr./kWh. |
| Heimili og fyrirtæki um allt land hafa skipt. Akureyri og Vestmannaeyjar völdu Straumlind eftir útboð. | Homes and businesses across the country have switched. Akureyri and Vestmannaeyjar chose Straumlind after public tenders. |
| Hvernig skipti ég? Skráðu þig með rafrænum skilríkjum. Straumlind lætur núverandi raforkusala vita. Þú fylgist með á Mínum síðum. Tekur eina mínútu. Ókeypis. Engin binding. Rafmagnið fer aldrei af. | How do I switch? Sign up with electronic ID. Straumlind notifies your current seller. You follow it on My Pages. Takes one minute. Free. No lock-in. The power never goes off. |
| Sama rafmagn, bara ódýrara. | Same electricity, just cheaper. (Straumlind's slogan) |

## Facts used (sources, checked 14 and 20 October 2026)

| Fact | Source |
| --- | --- |
| Straumlind: 10,54 kr./kWst general price, 7,03 kr./kWst at night (23–07), with VAT | straumlind.is (live), straumlind.is/vorur |
| Orkusalan 12,97, HS Orka 12,18, Orka náttúrunnar 11,41 kr./kWst, general household price with VAT. The three largest sellers hold about 65% of the market. | orkusalan.is/verdskra, hsorka.is, on.is, aurbjorg.is/rafmagn |
| 18,7% below Orkusalan, shown as "allt að 19%". 13,5% below the average of the three (12,19), shown as "14%". | calculated from the prices above |
| Energy is about ⅓ of the bill; transmission and distribution (about ⅔) cost the same whatever seller you use. | straumlind.is/frodleikur, Straumlind FAQ |
| 4.500 kWst a year: 58.365 kr. against 47.430 kr. for the energy, 10.935 kr. less | calculated from the prices above |
| No power plants, wholesale buying, own software, AI and automation, small overhead, 8 staff | straumlind.is (about Straumlind, team page) |
| The order for all 168 hours of the coming week is sent the week before; any mismatch is billed as balancing energy ("jöfnunarorka"); Straumlind describes itself as a balance scale | straumlind.is/frodleikur/hulunni-svipt-af-algengum-mytum-um-raforkusala |
| Akureyri and Vestmannaeyjar became customers in 2024 after tenders where Straumlind's bid was the most favourable | straumlind.is/frodleikur/annall-2024 |
| Switching is free, takes about a minute with electronic ID, Straumlind notifies the old seller, no lock-in | straumlind.is, /spurtogsvarad, /samningur |

**Not used:**
- **"Cheaper than everyone":** Straumlind is not the cheapest seller in Iceland. Four offers are lower.
- **Revenue figures:** removed at the client's request.
- **Customer numbers:** not public.

The weekly use curve and the balance-scale amounts are illustrations, not measured data.
