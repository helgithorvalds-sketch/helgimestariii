# SVIF – handrit að kynningarmyndbandi (64 sek.), útgáfa 2

Ein samfelld myndavélarhreyfing í gegnum hvíta „leir“-borg, SVIF-blár sem eini áherslulitur. Engin klipp. Bókin er teiknuð í stíl SVIF-forsíðunnar (rúðustrikaður pappír, línuteiknuð hús, SVIF-merkið með þakinu yfir I-inu).

| Tími | Kafli | Mynd | Texti á skjá |
|---|---|---|---|
| 0–6 s | 01 Heimilið | Borgin rís upp úr grunnplötunni, myndavélin svífur niður að einu húsi sem stendur eitt á sinni lóð. | **Á hverjum degi fær einhver lyklana að nýju heimili.** |
| 6–14 s | 02 Verkefnin | „SELT“-skilti, blár hringur púlsar, nýju eigendurnir ganga inn með kassa. Verkefnin svífa upp í kringum húsið: Tryggingar, Internet, Rafmagn, Málun, Viðhald, Hitakerfi, Framkvæmdir, Gólfefni, Flutningar, Þrif, Garðurinn. | **En nýju heimili fylgja ótal verkefni.** |
| 14–22 s | 03 Bókin | SVIF-bókin birtist fyrir framan húsið og verkefnin fljúga inn í hana. Bókin lyftist svo upp og rennur inn í SVIF-kerfið. | **Þess vegna bjuggum við til SVIF.** Bók fyrir nýja húseigendur, með öllu sem nýtt heimili þarf. |
| 22–30 s | 04 Kerfið | Kerfið kviknar, bláar línur teygja sig út til heimila þar sem fólk var að kaupa og hvert heimili kviknar blátt. | **Kerfið okkar finnur heimilin þar sem fólk var að kaupa.** |
| 30–44 s | 05 Dreifingin | Sendibíll ekur rólega um göturnar og ber bók á hvert blátt heimili. Teljari: 1.200–1.500 bækur á þriggja mánaða tímabili. | **Við berum SVIF heim til nýrra húseigenda.** / **Beint inn um lúguna, á réttum tíma.** |
| 44–56 s | 06 Flokkarnir | Síðasta bókin lyftist upp og opnast; flokkarnir lýsast upp einn af öðrum. Bókin lokast og fer inn í húsið. | **Eitt fyrirtæki í hverjum flokki.** / **Allt sem nýtt heimili þarf, á einum stað.** |
| 56–64 s | 07 SVIF | Myndavélin dregur sig upp yfir alla borgina, fleiri heimili kvikna. | **SVIF.** Rétta fólkið, á réttu augnabliki. svif.is |

## Tónlist
Frumsamin með `music.py`: rólegt, bjart píanó- og „pad“-lag í D-dúr, 96 BPM. Létt „whoosh“ við hverja senuskiptingu og fínlegir klukkuhljómar þegar heimilin kvikna.

## Skrár
- `svif-motion.html`: hreyfimyndin sjálf (Three.js), spilanleg í vafra með tímalínu og hljóði.
- `capture.mjs`: tekur myndina upp ramma fyrir ramma, `node capture.mjs út.mp4 0 64 30`.
- `music.py` / `music.mp3`: tónlistin.
