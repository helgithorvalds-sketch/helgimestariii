# SVIF – handrit að kynningarmyndbandi (70 sek.), útgáfa 3

Ein samfelld myndavélarhreyfing í gegnum hvíta „leir“-borg með útlínum, svölum, gangbrautum og ljósastaurum, SVIF-blár sem eini áherslulitur. Engin klipp. Bókin er teiknuð í stíl SVIF-forsíðunnar (rúðustrikaður pappír, línuteiknuð hús, SVIF-merkið með þakinu yfir I-inu).

| Tími | Kafli | Mynd | Texti á skjá |
|---|---|---|---|
| 0–6 s | 01 Heimilið | Borgin rís upp úr grunnplötunni, myndavélin svífur niður að einu húsi sem stendur eitt á sinni lóð. | **Á hverjum degi fær einhver lyklana að nýju heimili.** |
| 6–14 s | 02 Verkefnin | „SELT“-skilti, blár hringur púlsar, nýju eigendurnir ganga inn með kassa. Verkefnin svífa upp í kringum húsið: Tryggingar, Internet, Rafmagn, Málun, Viðhald, Hitakerfi, Framkvæmdir, Gólfefni, Flutningar, Þrif, Garðurinn. | **En nýju heimili fylgja ótal verkefni.** |
| 14–19 s | 03 Bókin | SVIF-bókin birtist fyrir framan húsið og verkefnin fljúga inn í hana. | **Þess vegna bjuggum við til SVIF.** Bók fyrir nýja húseigendur. |
| 19–26 s | 03 Bókin | Bókin opnast: tvö tilboð, teiknuð í línustíl bókarinnar (10% af gluggum og ísetningu, 20% af gleri). Tilboðsspjöldin lýsast upp hvort á eftir öðru. | **Bestu tilboðin frá traustum fyrirtækjum.** |
| 26–36 s | 04 Kerfið | Bókin lokast, lyftist og rennur inn í SVIF-kerfið. Bláar línur teygja sig til heimila þar sem fólk var að kaupa. | **Kerfið okkar finnur heimilin þar sem fólk var að kaupa.** |
| 36–50 s | 05 Dreifingin | Sendibíll ekur rólega um göturnar og ber bók á hvert blátt heimili. Teljari: 400+ bækur í hverjum mánuði. | **Við berum bókina heim til nýrra húseigenda.** / **Beint inn um lúguna, á réttum tíma.** |
| 50–62 s | 06 Flokkarnir | Síðasta bókin lyftist upp og opnast; flokkarnir lýsast upp einn af öðrum. | **Eitt fyrirtæki í hverjum flokki.** / **Allt sem nýir húseigendur þurfa, á einum stað.** |
| 62–70 s | 07 SVIF | Myndavélin dregur sig upp yfir borgina. | **SVIF.** Rétta fólkið, á réttu augnabliki. svif.is |

## Tónlist
Frumsamin með `music.py`: rólegt, bjart píanó- og „pad“-lag í D-dúr, 96 BPM. Hljóðin eru sett á nákvæmar tímasetningar úr myndinni (`events.json`): mjúkir tónar í stað „whoosh“ við senuskipti, kringlótt „plopp“ þegar verkefnin lenda í bókinni, og bjölluhljómur nákvæmlega þegar heimili, tilboð eða flokkar lýsast upp.

## Skrár
- `svif-motion.html`: hreyfimyndin sjálf (Three.js), spilanleg í vafra með tímalínu og hljóði.
- `capture.mjs`: tekur myndina upp ramma fyrir ramma, `node capture.mjs út.mp4 0 64 30`.
- `music.py` / `music.mp3`: tónlistin. `node capture.mjs events:events.json` og svo `python3 music.py events.json music.wav`.
