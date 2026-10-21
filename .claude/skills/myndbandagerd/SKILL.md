---
name: myndbandagerd
description: Myndbandagerð – býr til fagleg, samfelld 3D kynningar-/útskýringarmyndbönd (motion design) fyrir SVIF eða sambærileg verkefni, sem HTML/Three.js hreyfimynd sem er tekin upp ramma fyrir ramma í 1080p MP4 með frumsaminni tónlist og hljóðum samstilltum við myndina. Notaðu þegar notandinn biður um myndband, kynningarmyndband, „Claude motion“, hreyfimynd, explainer, auglýsingamyndband eða að uppfæra SVIF-myndbandið.
---

# Myndbandagerð

Þetta skill lýsir því hvernig SVIF-kynningarmyndbandið var búið til og hvaða smekk og reglur notandinn (Helgi Már, SVIF) hefur sett. Fylgdu þessu þegar búið er til nýtt myndband eða það gamla uppfært.

Sniðmát: `template/` í þessari möppu (afrit af `svif-video/` í repo-inu). Nýjasta útgáfan býr alltaf í `svif-video/`.

## 1. Stíll og fagurfræði (það sem notandanum líkar)

- **Ein samfelld myndavélarhreyfing, engin klipp.** Hver sena rennur yfir í þá næstu (borg → hús → bók → kerfi → dreifing → bók opnast → lokamynd).
- **Hvít „leir“-borg** (white clay, isometric-tilfinning, eins og arkitektalíkan) með **einum áherslulit: SVIF-bláum `#1f55ff`**. Ljósblár `#8ea2ea` fyrir þakið í merkinu.
- **Skarpt, ekki „hrátt“:** fínar útlínur á byggingum (EdgesGeometry), þakbrúnir, sökklar, svalir, loftnet, gangbrautir, ljósastaurar, hvassir skuggar og upptaka með 1,5× supersampling. Notandinn kvartaði þegar borgin var of hrá.
- **Bláir púlsandi hringir** (radar) undir heimilum sem eru „fundin“, eins og í viðmiðunarmyndinni. Hringir mega **ekki** liggja undir öðrum húsum: aðalhúsið stendur eitt á sinni lóð með garði.
- **Leturgerðir:** Bricolage Grotesque (fyrirsagnir), Instrument Sans (texti), Unbounded 900 fyrir SVIF-merkið með **þaki yfir I-inu**.
- **Skjátextar** neðst til vinstri, orð birtast eitt af öðru með blur/lyftingu; lítill „eyebrow“ í bláu, kaflavísir efst til hægri.
- **2D efni inni í 3D-heiminum** (bókin, auglýsingar) er teiknað á canvas í **línustíl SVIF-bókarinnar**: rúðustrikaður pappír, þunnur rammi, línuteiknuð hús/hlutir, blá áhersla.

### Ekkert má skarast eða fara í gegnum annað (regla notandans)

Notandanum finnst það „glitch“ þegar hlutir fara í gegnum hvorn annan eða merkingar lenda ofan á hvor annarri. Athugaðu þetta í **hverjum** yfirlitsramma áður en tekið er upp:

- **Hreyfing:** tveir hlutir mega aldrei fara í gegnum hvorn annan á leið sinni. Dæmi: helmingar Straumlind-eldingarinnar renna beint inn frá hliðunum. Það virkar því hver lína appelsínugula helmingsins liggur vinstra megin við þann bláa. Enginn snúningur og ekkert „overshoot“ (`eout`, ekki `eback`) þegar hlutir mætast. Ef hreyfing á að vera skemmtilegri, snúðu öllum samsetta hlutnum eftir að hann hefur læst saman.
- **Línur og rafmagnslínur:** reiknaðu ferilinn og prófaðu hvern punkt á honum gegn kössum bygginganna (`SOLIDS`). Notaðu bara línur sem sleppa við allt. Línur sem renna eftir gólfi fara fyrir framan fætur eða standa, ekki í gegnum þá.
- **Fletir sem skarast blikka (z-fighting):** staflaðu hlutum (lok ofan á súlu) í stað þess að láta þá ganga inn í hvorn annan.
- **Merkingar (HTML-pillur) mega ekki lenda á hvor annarri, á línum eða á skjátextanum.**
  - Þegar súlur eru þéttar, skrifaðu nafn og gildi á gólfplötuna fyrir framan hverja súlu. Hafðu myndavélina nógu hátt (um 30–35°) til að það sé læsilegt.
  - Viðmiðunarlínur (t.d. meðaltal) fara **fyrir aftan** súlurnar og merkingin þeirra við enda línunnar, laus við stóru töluna.
  - Merkingar sem eru festar í 3D-punkt fara af skjánum þegar myndavélin færist nær. Láttu þær hverfa áður en það gerist.
- **Skuggar:** skuggi sem fellur bak við texta á lokaspjaldi lítur út eins og strik í gegnum orðin. Slökktu á skugganum (`castShadow=false`).
- Ekki setja tvennt á sama stað á skjánum á sama tíma: stóra talan, merkingar og skjátexti eiga hvert sitt svæði.

## 2. Orðalag og innihald (reglur notandans)

- Allt á **íslensku**, náttúrulegt mál.
- **Þetta er BÓK, ekki bæklingur eða flyer.** Segðu „bók“ / „bókina“. Aldrei „velkomin-bók“ eða „velkomin-bæklingur“.
- Þegar verið er að dreifa: „Við berum **bókina** heim …“ (ekki „SVIF“, því það hljómar eins og fyrirtækinu sé dreift).
- **Ekki nefna nöfn fyrirtækja** sem auglýsa í bókinni. Sýna aðeins kjarnann: afsláttinn og hvað er í boði.
- Ekki sýna netfang eða símanúmer í lokin, aðeins **svif.is**.
- Ekki útskýra „auglýsingu er hent“ eða afsláttarrökin sérstaklega.
- Hitalausnir voru bara dæmi í tölvupósti: **ekki** segja að flokkur sé „laus“.
- Dreifingartala: **„400+ bækur í hverjum mánuði“** (ekki „á þriggja mánaða tímabili“).
- Samþykktar setningar:
  - „Á hverjum degi fær einhver lyklana að nýju heimili.“
  - „En nýju heimili fylgja ótal verkefni.“ (verkefni: Tryggingar, Internet, Rafmagn, Málun, Viðhald, Hitakerfi, Framkvæmdir, Gólfefni, Flutningar, Þrif, Garðurinn)
  - „Þess vegna bjuggum við til SVIF.“ / „Bók fyrir nýja húseigendur.“
  - „Bestu tilboðin frá traustum fyrirtækjum.“
  - „Kerfið okkar finnur heimilin þar sem fólk var að kaupa.“
  - „Við berum bókina heim til nýrra húseigenda.“ / „Í samstarfi við Póstdreifingu.“
  - „Beint inn um lúguna, á réttum tíma.“
  - „Eitt fyrirtæki í hverjum flokki.“
  - „Allt sem nýir húseigendur þurfa, á einum stað.“
  - Lokaspjald: „SVIF.“ / „Rétta fólkið, á réttu augnabliki.“ / „svif.is“

## 3. Söguþráður (núverandi útgáfa, 70 sek.)

| Tími | Sena |
|---|---|
| 0–6 | Borgin rís upp úr grunnplötu, myndavél svífur niður að einu húsi. |
| 6–14 | „SELT“-skilti, eigendur ganga inn með kassa, verkefnin svífa upp í kringum húsið. |
| 14–19 | Bókin birtist og **verkefnin fljúga inn í hana**. |
| 19–26 | **Bókin opnast** og sýnir 1–2 tilboð í línustíl (spjöldin lýsast upp hvort á eftir öðru). |
| 26–36 | Bókin lokast og **rennur inn í SVIF-kerfið** (hnöttinn); bláar línur teygja sig út til heimila sem kvikna. |
| 36–50 | Sendibíll ekur **rólega og mjúkt** og ber bók á hvert blátt heimili; teljari 400+. |
| 50–62 | Síðasta bókin lyftist og opnast, flokkarnir lýsast upp einn af öðrum; bókin fer inn í húsið. |
| 62–70 | Myndavél dregur sig upp yfir borgina, lokaspjald. |

Allar tímasetningar eru í hlutnum `TL` og `KEYS` (myndavél) í `svif-motion.html`.

## 4. Hljóð og tónlist

- Frumsamin í `music.py` (numpy): rólegt, bjart píanó/pad í D-dúr, 96 BPM, ekkert öfgafullt.
- **Engin „whoosh“/hávaða-hljóð** (notandanum fannst þau eins og sandpappír). Senuskipti nota mjúka tónbólgu („bloom“).
- **Hljóðin verða að hitta myndina nákvæmlega:** síðan skilar öllum atburðum með `window.__events()`. Flyttu þá út og búðu til tónlistina út frá þeim:
  ```
  node capture.mjs events:events.json
  python3 music.py events.json music.wav
  ```
  Bjölluhljómur þegar flokkur/tilboð/heimili lýsist upp, „plopp“ þegar verkefni lendir í bókinni, mjúkt bank þegar bók lendir á heimili.
- Ég get ekki hlustað á hljóð: segðu notandanum alltaf að hlusta sjálfur.

## 5. Tæknilegt vinnuferli

1. `cd svif-video && npm i` (three@0.169.0, playwright-core). Chromium er í `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
2. Breyta `svif-motion.html`. Allt ræðst af `render(t)` sem er ákveðið út frá tíma (engin uppsöfnuð staða), svo hægt er að taka upp hvaða ramma sem er.
   - Notaðu `rand()` aðeins fyrir uppröðun borgarinnar; ný smáatriði nota `rd()`, svo borgin breytist ekki og samþykktar myndavélarhreyfingar haldist.
   - Bókin: `leftPivot.rotation.y = Math.PI*(1-open)` svo kápan opnist **í átt að áhorfanda** (neikvætt horn lætur hana fara í gegnum bókina, sem var „buggy“ opnunin).
   - Hafðu bókina kyrra og myndavélina stöðuga áður en hún opnast.
3. **Skoða ramma áður en tekið er upp:** `node capture.mjs frames:<mappa> 9.5 21.6 40 54` og raða saman með ffmpeg `hstack/vstack` til að skoða.
4. **Full upptaka** í þremur samhliða hlutum (um 30–50 mín.):
   ```
   node capture.mjs seg0.mp4 0 23.4 30 & node capture.mjs seg1.mp4 23.4 46.7 30 & node capture.mjs seg2.mp4 46.7 70 30 &
   ```
   Ef breyting snertir bara einn hluta, endurræstu aðeins þann hluta. Bíddu eftir `pgrep -f '^node capture.mjs'` (ekki `pgrep -f capture.mjs`, því það finnur bið-lykkjuna sjálfa). Ekki nota `pkill -f` með mynstri sem passar við eigin skipun.
5. Sameina og bæta við hljóði:
   ```
   ffmpeg -f concat -safe 0 -i list.txt -c copy silent.mp4
   ffmpeg -i silent.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart SVIF-kynning.mp4
   ffmpeg -i SVIF-kynning.mp4 -c:v libx264 -b:v 3000k -maxrate 3500k -bufsize 7000k -c:a aac -b:a 160k SVIF-kynning-litil.mp4
   ```
   Senda **litlu útgáfuna** (undir 30 MB) til notandans; sú stóra fer í repo.
6. Uppfæra gagnvirku útgáfuna (artifact, sama slóð): `svif-motion.html` með `music.mp3` sem fylgiskrá. Slóð: https://claude.ai/artifact/29iKekSHZFGnUvZyQYVta4
7. Uppfæra `HANDRIT.md`, commit og push á vinnugreinina.

## 5b. Önnur myndbönd sem hafa verið gerð
- `svif-video/` (SVIF, ein samfelld taka).
- `kamina-video/` (Augnablik, leiðbeiningar).
- `straumlind-video/` (Straumlind v1, 81 sek.). v2 (95 sek., spurt og svarað, faglegri) er í `video/straumlind/`.
  - Hraðari, í köflum. Hver kafli byrjar á tómri plötu og byggist upp (`rise()` með glugga per kafla).
  - Staðreyndir í `DATA` efst og heimildir í `HANDRIT.md`.
  - Athugaðu alltaf fullyrðingar notandans: „20% ódýrari en allir“ stóðst ekki og var leiðrétt í „allt að 19%“ miðað við stærsta raforkusalann.
  - Notandinn vildi ekki veltutölur í myndbandinu.

## 5c. Einingavélin (v2): `video/straumlind/` og `video/gledipeningar/`

Nýrri myndböndin nota sömu vél: Three.js-senur yfir CSS-bakgrunni með DOM-texta ofan á. Notaðu hana fyrir ný myndbönd frekar en eina stóra HTML-skrá.

- **Uppbygging:**
  - Hver sena er `src/scenes/sNN_*.js` með `{id, from, to, setup(ctx,S), update(lt,t,S)}` og er skráð í `src/scenes/index.js`.
  - Allur rammi ræðst af `window.seek(t)`.
  - Allar tölur á skjánum koma úr `src/data.js` (aldrei harðkóðaðar í senum).
- **Taktnet:**
  - 120 BPM, `b(n) = n*0.5 s`.
  - Allt sem birtist, poppar, telur eða stimplar lendir á slagi eða hálfslagi.
  - Hljóðmerki eru skráð með `cue(t, nafn, {gain, pitch, dur})` í senunni sjálfri.
  - `node scripts/meta.mjs` skrifar `out/meta.json` og `python3 audio/compose.py` semur tónlist og hljóð út frá því. Hljóðin hitta því alltaf myndina.
- **Spurt og svarað (það sem notandinn bað um):**
  - Opnun með fullyrðingunni.
  - Stórt spurningaspjald („Hvernig er það hægt?“), svo kaflaspjöld sem hvert er spurning (`src/scenes/chapter.js`, iris út úr hlut eða spjald sem rennur upp).
  - Hver kafli svarar sinni spurningu með texta og hreyfimynd saman.
  - Ástæður eru númeraðar („Ástæða 1–4“) og dregnar saman í lokin á kaflanum.
- **Auga og texti:**
  - Fyrirsögn í fastri dálkstöðu vinstra megin (x 140–950, y 100–520).
  - 3D-efnið er hægra megin eða í neðra beltinu.
  - Merkingar eru festar við hlutinn sinn með `pin()`/`updateLabel()`.
  - Aðeins eitt hreyfist í einu þar sem þarf að lesa.
- **Faglegt frekar en „bubbly“:** stífari gormar (minna overshoot) en í Gleðipeningum, aðhaldssöm litapalletta og hreyfing nákvæmlega á taktnetinu.
- **Lýsing á hvítum leir:**
  - Of mikið umhverfisljós gerir hvítan leir flatan og hvítbrenndan. Notaðu hemi 0.42, key 1.65 og envIntensity 0.45.
  - Í `enableKeyShadow` þarf `shadow.camera.updateProjectionMatrix()`, annars fá stórar senur enga skugga.
- **Yfirferð fyrir upptöku:**
  - Fyrst kyrrmyndir: `node scripts/still.mjs out/stills <sek…>` og `scripts/sheet.sh out/sN.jpg …`. Athugaðu skörun í hverri senu.
  - Svo hreyfimynd með hljóði í lágri rammatíðni: `node scripts/preview.mjs --fps=4 --workers=4`.
  - Loks full upptaka og frágangur:
    ```
    node scripts/render.mjs --workers=4
    node scripts/finalize.mjs --out=out/<nafn>.mp4
    ```
    `finalize.mjs` stillir hljóðið á -14 LUFS.
- **Lengd tónlistar:** `DUR` í `compose.py` er jafnt lengd myndarinnar. Lokahljómurinn heldur undir lokaspjaldinu og fjarar út með myndinni. Annars klippir `-shortest` hljóðið eða spjaldið verður þögult.

## 6. Samskipti við notandann

- Notandinn skrifar oft á íslensku eða ensku með raddinnslætti; svaraðu á sama máli og notandinn notar.
- Notandinn vill sjá niðurstöðu fljótt: sýndu stutta yfirlitsramma og sendu myndbandið þegar það er tilbúið.
- Áhorfendur myndbandsins eru markaðsfólk og fyrirtæki: faglegt, rólegt og „award-winning“ útlit, en ekki minnast á það í myndbandinu sjálfu.
