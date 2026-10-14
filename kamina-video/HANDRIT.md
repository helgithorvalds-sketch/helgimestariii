# Reykrör fyrir kamínu – handrit að leiðbeiningamyndbandi fyrir Augnablik (102 sek.), útgáfa 2

Ein samfelld myndavélarhreyfing, engin klipp. Fullbúið hvítt „leir“-hús á teikningarblaði (eins og viðmiðunarmynd 2): viðarklæðning, gluggar með körmum, þakrennur, pallur, bíll í innkeyrslu. Inni eru herbergi: stofa með kamínu, sófa, hægindastól, bókahillu og plöntum; eldhús og borðstofa; svefnherbergi. Glerframhlið og opinn kafli í þakinu (viðarsperrur og lektur undir gleri) sýna leiðina frá kamínu upp úr þaki. Hlutirnir eru í raunlitum (svört kamína og rör, stálhólkur og plata) og blár litur Augnabliks (`#0a8ff0`, merkið fer úr `#05CAFF` í `#1b46c9`) er notaður fyrir mælingar, merkingar og það sem er í fókus. Merki Augnabliks (augað með „play“-þríhyrningi) er efst til vinstri og á lokaspjaldinu.

**Ekkert birtist úr engu:** rörið, kraginn, hólkurinn með plötunni og kastventillinn liggja tilbúin við húsið frá fyrsta ramma og eru færð á sinn stað. Tappinn sem sagaður er úr þakinu og afskurðurinn af rörinu verða eftir á jörðinni.

| Tími | Skref | Mynd | Texti á skjá |
|---|---|---|---|
| 0–6 s | Inngangur | Myndavélin svífur að húsinu. | **Svona er reykrör sett upp fyrir kamínu.** Frá fyrstu mælingu að kastventli, skref fyrir skref. |
| 6–11 s | Undirbúningur | Kamínan og hlutirnir við húsið eru merktir. | **Kamínan er komin á sinn endanlega stað.** |
| 11–19 s | Mæling 1 | Lóðlína frá lofti niður í miðju kamínunnar, borað upp í gegnum þakið, stýripunktur kemur upp. | **Lóðlína frá miðju kamínunnar upp í loft.** |
| 19–25 s | Mæling 2 | Málsetning frá kamínu upp í þak, og þykkt þaksins sér. | **Mælt frá kamínunni upp í þak.** Munið að taka þykkt þaksins með. |
| 25–30 s | Mæling 3 | Hallabogi á gaflinum: 30°. | **Þakhallinn mældur.** |
| 30–36 s | Mæling 4 | Málsetning eftir þakinu frá mæni að stýripunkti. | **Mælt frá mæni niður að miðjupunktinum.** |
| 36–44 s | Mæling 5 | Lárétt lína frá mæni, „draugur“ af rörinu, lengdin. | **Lengd reykrörsins mæld.** |
| 44–52 s | Smíði 6 | Hólkurinn fer í plötuna sem liggur í þakhalla á búkka; festingar lýsast. | **Einangrunarhólkurinn smíðaður.** |
| 52–61 s | Smíði 7 | Rörið skorið (neistar), afskurðurinn rennur frá, kraginn fer á og er soðinn. | **Rörið skorið í rétta lengd.** |
| 61–68 s | Smíði 8 (valfrjálst) | Trekkspjald og samtengi sýnd sem „draugur“ ofan á kamínunni. | **Trekkspjald.** |
| 68–74 s | Uppsetning A | Hringsög sker í kringum stýripunktinn, tappinn fer úr. | **Gat sagað í þakið.** |
| 74–80 s | Uppsetning A | Hólkurinn með plötunni flýgur upp og sest í gatið, festingar lýsast. | **Hólkurinn settur í gatið.** |
| 80–88 s | Uppsetning B | Rörið lyftist, réttist og rennur niður í gegnum hólkinn ofan í kamínuna. | **Rörinu rennt í gegnum hólkinn.** |
| 88–94 s | Uppsetning C | Kastventillinn sest ofan á rörið. | **Kastventillinn settur ofan á.** |
| 94–102 s | Tilbúið | Eldur kviknar, reykur úr kastventli, myndavélin dregur sig út. | **Tilbúið.** |

Málin (3,37 m, 0,29 m, 30°, 1,85 m, ≈4,4 m) eru dæmi reiknuð út frá líkaninu, ekki raunmál.

## Opið
- Merkið er endurteiknað sem SVG eftir merkinu á augnablik.is; skipta má út fyrir upprunalegu skrána ef hún fæst.
- Endurgjöfin í Google-skjalinu var ekki aðgengileg (krefst innskráningar).

## Skrár
- `kamina.html`: hreyfimyndin (Three.js), spilanleg í vafra.
- `capture.mjs`: `node capture.mjs út.mp4 0 102 30`, `frames:<mappa> t1 t2 …`, `events:events.json`.
- `music.py`: `python3 music.py events.json music.wav` (hljóðin hitta atburðina í myndinni).
