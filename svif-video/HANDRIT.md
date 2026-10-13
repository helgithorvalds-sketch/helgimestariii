# SVIF – handrit að kynningarmyndbandi (64 sek.)

Ein samfelld myndavélarhreyfing í gegnum hvíta „leir“-borg (í anda viðmiðunarmyndarinnar), með SVIF-bláum lit sem eina áherslulitnum. Engin klipp: hver sena rennur yfir í þá næstu.

| Tími | Kafli | Mynd | Texti á skjá | Tillaga að talsetningu |
|---|---|---|---|---|
| 0–6 s | 01 Heimilið | Borgin rís upp úr grunnplötunni, myndavélin svífur niður að einu húsi. | **Á hverjum degi fær einhver lyklana að nýju heimili.** | „Á hverjum degi fær einhver á höfuðborgarsvæðinu lyklana að nýju heimili.“ |
| 6–11 s | 01 Heimilið | „SELT“-skilti sprettur upp, blár hringur púlsar undir húsinu, nýju eigendurnir ganga að dyrunum með kassa. | **Til hamingju. Nú byrjar vinnan.** | „Til hamingju. En nú byrjar vinnan.“ |
| 11–18 s | 02 Verkefnin | Myndavélin hringsólar um húsið, verkefnin svífa upp: Framkvæmdir, Viðhald, Málun, **Hitakerfi** (blátt), Gólfefni … | **Allt þarf að gerast í einu.** | „Framkvæmdir, viðhald, hitakerfi. Allt sem fylgir því að koma sér almennilega fyrir, á sama tíma.“ |
| 18–26 s | 03 Kerfið | Myndavélin lyftir sér yfir borgina. Bláir hringir kvikna á heimilum þar sem fólk var að kaupa og línur tengjast SVIF-kerfinu. Teljari: ný kaup greind. | **Við finnum heimilin þar sem fólk var að kaupa.** | „Kerfið okkar greinir ný fasteignakaup og finnur heimilin þar sem fólk var að kaupa.“ |
| 26–35 s | 04 Dreifingin | Myndavélin eltir sendibíl um göturnar; bæklingar fljúga að hverju merktu heimili. Teljari upp í 1.200–1.500. | **SVIF berst beint inn um lúguna.** Í samstarfi við Póstdreifingu. | „Í samstarfi við Póstdreifingu berst SVIF beint heim: 1.200 til 1.500 bæklingar á þremur mánuðum.“ |
| 35–43 s | 05 Bæklingurinn | Síðasti bæklingurinn lyftist upp, stækkar og opnast. Reiturinn **Hitalausnir – Laust** glóir. | **Eitt fyrirtæki í hverjum flokki.** / **Flokkur hitalausna er enn laus.** | „Eitt fyrirtæki í hverjum flokki. Og flokkur hitalausna er enn laus.“ |
| 43–50 s | 06 Sértilboð | Grá, venjuleg auglýsing dettur út úr mynd. „−15%“-stimpill smellur á SVIF. | **Auglýsingu er hent. Sértilboð er geymt.** | „Venjulegri auglýsingu er hent. Sértilboð er geymt þar til þörfin kemur.“ |
| 50–57 s | 07 Verð | Bæklingurinn lokast og svífur aftur inn í húsið; myndavélin dregur sig upp. Verðspjald: 1 síða 70.000 kr., 2 síður 100.000 kr. á mánuði, allt innifalið. | **Allt frá hönnun til dreifingar.** | „Hönnun, 3D-sýnishorn, prentun og dreifing: allt innifalið, frá 70.000 krónum á mánuði.“ |
| 57–64 s | 08 SVIF | Öll borgin, heimili kvikna eitt af öðru. Lokaspjald. | **SVIF.** Rétta fólkið, á réttu augnabliki. svif.is · 853 5147 | „SVIF. Rétta fólkið, á réttu augnabliki.“ |

## Tónlist og hljóð (tillaga)
Myndbandið er án hljóðs. Rólegt, bjart „ambient/minimal piano“ lag um 100 BPM passar taktinum. Létt „whoosh“ við 6 s (fókus á húsið), 19 s (lyfting), 34 s (bæklingurinn) og 50 s (útdráttur), og mjúkt „pop“ þegar hringirnir kvikna.

## Skrár
- `svif-motion.html`: hreyfimyndin sjálf (Three.js), spilanleg í vafra með tímalínu.
- `capture.mjs`: tekur myndina upp ramma fyrir ramma í 1920×1080 / 30 fps MP4.
  `node capture.mjs svif.mp4 0 64 30`
