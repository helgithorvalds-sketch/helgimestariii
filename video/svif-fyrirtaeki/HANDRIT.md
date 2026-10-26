# SVIF fyrir fyrirtæki: handrit að kynningarmyndbandi (52 sek.)

Sama heimur og SVIF-myndin fyrir nýja húseigendur (hvít „leir“-borg, SVIF-blár sem eini áherslulitur), en hraðari: allt er á 120 BPM takti. Sagan er sú sama og í Kára-auglýsingunni („Fyrsti dagurinn“): verkefnin hrannast upp, svo kemur SVIF og leysir þau. Hér er það nýtt fyrirtæki en ekki nýtt heimili.

Fyrri hlutinn keyrir fast á taktinum: kubbarnir falla á hverju slagi, staflinn vaggar og myndavélin ýtir inn á slögunum. Frá bæklingnum og áfram er rólegra: myndavélin líður samfellt, grúvið er jafnt og hljóðin færri. Klippt er aðeins á niðurslagi (16 s og 30 s).

Aðeins fyrirtækjahús eru auðkennd (búðargluggi, skyggni og skilti sem verða SVIF-blá þegar kerfið finnur þau), og fá í einu.

| Tími | Kafli | Mynd | Texti á skjá |
|---|---|---|---|
| 0–4 s | 01 Fyrirtækin | Borgin rís í bylgjum á áttundapörtum, myndavélin svífur niður. | **Á hverjum degi verða til ný fyrirtæki.** |
| 4–8 s | 02 Nýr rekstur | Nýja skrifstofan; „OPIÐ“-skiltið poppar upp, eigandinn gengur upp að húsinu. | **Draumurinn er orðinn að rekstri.** |
| 8–12 s | 03 Verkefnin | Einn verkefnakubbur fellur á hvert slag og staflinn hækkar og vaggar: Bókhald, Vefsíða, Auglýsingar, Tryggingar, Bankaviðskipti, Sími og net, Tölvubúnaður, Merki og hönnun, Lögfræði, Launakerfi, Húsnæði, Prentun. | **En nýjum rekstri fylgja ótal verkefni.** |
| 12.5–16 s | 03 Verkefnin | Staflinn stendur, grúvið þynnist. | **Hvar á að byrja?** |
| 16–20 s | 04 Bæklingurinn | Bæklingurinn birtist og allir kubbarnir fljúga ofan í hann nánast í einu („ding-ding-ding…“). | **Þess vegna bjuggum við til SVIF.** Bækling sem hjálpar nýjum fyrirtækjum að fara vel af stað. |
| 20–24 s | 04 Bæklingurinn | Bæklingurinn opnast: bókhald (25%) og vefsíða (15%). | **Við finnum traust fyrirtæki.** Fyrirtæki sem bjóða nýjum fyrirtækjaeigendum sérkjör á sinni þjónustu. |
| 24–30 s | 05 Kerfið | Bæklingurinn rennur inn í SVIF-kerfið; línur teygja sig til nýrra fyrirtækja. | **Kerfið okkar finnur ný fyrirtæki og nýja eigendur.** |
| 30–38 s | 06 Dreifingin | Sendibíllinn ber bækling til nýju fyrirtækjanna; teljari upp í 250. | **Við sendum bæklinginn til allra nýrra fyrirtækjaeigenda.** Um allt land. / **Svo þú getir kynnt þjónustuna þína fyrir þeim sem þurfa á henni að halda.** |
| 38–46 s | 07 Flokkarnir | Bæklingurinn opnast aftur, einn flokkur lýsist upp í einu; svo fer hann inn um dyrnar. | **Eitt fyrirtæki í hverjum flokki.** / **Allt sem nýr rekstur þarf, á einum stað.** |
| 46–52 s | 08 SVIF | Myndavélin dregur sig upp yfir borgina, nokkur ný fyrirtæki kvikna. | **SVIF.** Fyrir ný fyrirtæki. Rétta fólkið, á réttu augnabliki. svif.is |

Engin fyrirtækjanöfn í bæklingnum. Tilboðin (25% af bókhaldi fyrsta árið, 15% af vefsíðu) eru dæmi og má breyta í `paintPages()`.

## Tónlist
Frumsamin í `audio/compose.py` (synthar úr `audio/dsp.py`, sömu og í VILD): 120 BPM í D-dúr, D–Bm–G–A. Grúvið byrjar þegar fyrirtækið opnar og verður þéttara meðan staflinn vex, þynnist undir „Hvar á að byrja?“ og kemur aftur, jafnt og hlýtt, þegar bæklingurinn birtist. Hljóðin eru sett á nákvæmar tímasetningar úr myndinni (`audio/events.json`): viðarhögg í hækkandi tónstiga fyrir hvern kubb, hröð hækkandi bjölluruna þegar kubbarnir fara í bæklinginn, mjúkar bjöllur þegar fyrirtæki finnast og flokkar lýsast upp, bank þegar bæklingur berst. Engin „whoosh“-suðhljóð.

## Gerð
```
npm i
node capture.mjs frames:<mappa> 10 16.6 21      # skoða staka ramma
node capture.mjs events:audio/events.json         # tímasetningar hljóða úr myndinni
python3 audio/compose.py                          # tónlist + hljóð -> audio/out/mix.wav (numpy, scipy, pedalboard)
node capture.mjs out/seg0.mp4 0 17.3333333 30 & node capture.mjs out/seg1.mp4 17.3333333 34.6666667 30 & node capture.mjs out/seg2.mp4 34.6666667 52 30 &
./finalize.sh                                     # sameinar, -14 LUFS, SVIF-fyrirtaeki.mp4 + litla útgáfan + music.mp3
```
`svif-fyrirtaeki.html` er hreyfimyndin sjálf (Three.js) og er spilanleg í vafra með `music.mp3` við hliðina. Leturgerðirnar í `fonts/` eru Google Fonts (SIL Open Font License) og eru aðeins notaðar við upptöku.
