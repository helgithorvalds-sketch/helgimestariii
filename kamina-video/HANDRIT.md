# Reykrör fyrir kamínu – leiðbeiningamyndband fyrir Augnablikk (102 sek.), útgáfa 3

Ein samfelld myndavélarhreyfing, engin klipp. Fullbúið hvítt hús sýnt sem **sneiðmynd** eins og á arkitektateikningu: húsið er skorið í gegn rétt hjá kamínunni, sárið er skástrikað og afskorni hlutinn stendur eftir sem byggingarlínur. Þakið er heilt (sléttjárn) og raunverulegt gat er sagað í það. Inni: stofa með kamínu, sófa, hægindastól og plöntum; eldhús og borðstofa; svefnherbergi. Litir og merki Augnablikk: appelsínugulur `#c84d28` fyrir mælingar og fókus, dökkblár `#21223f` fyrir texta, merkið (orðmerki efst, kamínuvélmennið í lokin) úr upprunalegu SVG-skránum.

**Mælingarnar haldast á skjánum** út mælingakaflann og sjást allar saman í lok skrefs 5 (hverfa fyrir skref 8).

**Hlutirnir koma tilbúnir:** hólkurinn er þegar festur í plötuna og rörið er skorið með kraganum á. Skref 6–8 sýna fullbúnu hlutina með skýringum, engin smíði er sýnd.

**Ekkert fer í gegnum annað:** allt lyftist beint upp, fer yfir í öruggri hæð og kemur beint niður. Mænisbúturinn lyftist og rennur til hliðar á meðan platan fer undir hann, og leggst svo aftur.

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
| 44–52 s | Smíði 6 | Tilbúinn hólkur í plötu á búkka í þakhalla, með skýringum. | **Einangrunarhólkurinn smíðaður.** |
| 52–61 s | Smíði 7 | Tilbúið rör með kraga, lengdin (4,44 m) málsett á það. | **Rörið skorið í rétta lengd.** |
| 61–68 s | Smíði 8 (valfrjálst) | Trekkspjald og samtengi sýnd sem „draugur“ ofan á kamínunni. | **Trekkspjald.** |
| 68–74 s | Uppsetning A | Hringsög sker í kringum stýripunktinn, tappinn fer úr. | **Gat sagað í þakið.** |
| 74–80 s | Uppsetning A | Mænisbútur lyftist, hólkurinn með plötunni kemur beint niður í gatið, mænirinn leggst yfir plötuna. | **Hólkurinn settur í gatið.** |
| 80–88 s | Uppsetning B | Rörið lyftist, réttist og rennur niður í gegnum hólkinn ofan í kamínuna. | **Rörinu rennt í gegnum hólkinn.** |
| 88–94 s | Uppsetning C | Kastventillinn sest ofan á rörið. | **Kastventillinn settur ofan á.** |
| 94–102 s | Tilbúið | Eldur kviknar, reykur úr kastventli, myndavélin dregur sig út. | **Tilbúið.** |

Málin (3,37 m, 0,29 m, 30°, 1,85 m, ≈4,4 m) eru dæmi reiknuð út frá líkaninu, ekki raunmál.

## Opið
- Endurgjöfin í Google-skjalinu var ekki aðgengileg (krefst innskráningar).

## Skrár
- `kamina.src.html`: hreyfimyndin (Three.js) með `__WM__`/`__LG__` í stað merkjanna; `kamina.html` er sama skrá með merkjunum innfelldum (base64).
- `capture.mjs`: `node capture.mjs út.mp4 0 102 30`, `frames:<mappa> t1 t2 …`, `events:events.json`.
- `music.py`: `python3 music.py events.json music.wav` (hljóðin hitta atburðina í myndinni).
