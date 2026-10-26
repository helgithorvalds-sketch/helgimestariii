# SVIF fyrir fyrirtæki: handrit að kynningarmyndbandi (52 sek.)

Sama heimur og SVIF-myndin fyrir nýja húseigendur (hvít „leir“-borg, SVIF-blár sem eini áherslulitur), en hraðari: allt er á 120 BPM takti. Hver kubbur, hvert orð, hver sending og hver flokkur lendir á slagi. Sagan er sú sama og í Kára-auglýsingunni („Fyrsti dagurinn“): verkefnin hrannast upp, svo kemur SVIF og leysir þau. Hér er það nýtt fyrirtæki en ekki nýtt heimili.

Myndavélin hreyfist samfellt innan hvers kafla og klippir aðeins á niðurslagi (16 s og 30 s). Á slögunum ýtir hún örlítið inn („punch“), eins og í VILD-myndinni.

| Tími | Slög | Kafli | Mynd | Texti á skjá |
|---|---|---|---|---|
| 0–4 s | 0–8 | 01 Fyrirtækin | Borgin rís í bylgjum á áttundapörtum, myndavélin svífur niður. | **Á hverjum degi verða til ný fyrirtæki.** |
| 4–8 s | 8–16 | 02 Nýr rekstur | Nýja skrifstofan; „OPIÐ“-skiltið poppar upp á slagi 12, eigandinn gengur upp að húsinu. | **Draumurinn er orðinn að rekstri.** |
| 8–14 s | 16–28 | 03 Verkefnin | Einn verkefnakubbur fellur á hvert slag og staflinn hækkar og vaggar: Bókhald, Vefsíða, Auglýsingar, Tryggingar, Bankaviðskipti, Sími og net, Tölvubúnaður, Merki og hönnun, Lögfræði, Launakerfi, Húsnæði, Prentun. | **En nýjum rekstri fylgja ótal verkefni.** |
| 14–16 s | 28–32 | 03 Verkefnin | Eitt orð á slagi, staflinn hristist, eigandinn hoppar; tónlistin stöðvast á „byrja?“. | **Hvar / á / að / byrja?** |
| 16–20 s | 32–40 | 04 Bæklingurinn | DROPP: bæklingurinn skellur inn, kubbarnir fljúga ofan í hann einn á hverjum áttundaparti. | **Þess vegna bjuggum við til SVIF.** Bæklingur fyrir ný fyrirtæki og eigendur þeirra. |
| 20–24 s | 40–48 | 04 Bæklingurinn | Bæklingurinn opnast: bókhald (25%) og vefsíða (15%), tilboðin lýsast upp á slagi 42 og 44. | **Bestu tilboðin frá traustum fyrirtækjum.** |
| 24–30 s | 48–60 | 05 Kerfið | Bæklingurinn rennur inn í SVIF-kerfið; línur teygja sig til nýrra fyrirtækja á sextándapörtum. | **Kerfið okkar finnur ný fyrirtæki og nýja eigendur.** |
| 30–38 s | 60–76 | 06 Dreifingin | Sendibíllinn ber bækling á eitt skráð lögheimili á hverju slagi; teljari upp í 250. | **Við sendum bæklinginn á skráð lögheimili.** / **Einmitt þegar þjónustuaðilar eru valdir.** |
| 38–46 s | 76–92 | 07 Flokkarnir | Bæklingurinn opnast aftur, einn flokkur lýsist upp á hverju slagi; svo fer hann inn um dyrnar. | **Eitt fyrirtæki í hverjum flokki.** / **Allt sem nýr rekstur þarf, á einum stað.** |
| 46–52 s | 92– | 08 SVIF | Myndavélin dregur sig upp yfir borgina, ný fyrirtæki kvikna á áttundapörtum. | **SVIF.** Fyrir ný fyrirtæki. Rétta fólkið, á réttu augnabliki. svif.is |

Engin fyrirtækjanöfn í bæklingnum. Tilboðin (25% af bókhaldi fyrsta árið, 15% af vefsíðu) eru dæmi og má breyta í `paintPages()`.

## Tónlist
Frumsamin í `audio/compose.py` (synthar úr `audio/dsp.py`, sömu og í VILD): 120 BPM í D-dúr, D–Bm–G–A. Grúvið byrjar þegar fyrirtækið opnar, verður þéttara meðan staflinn vex, dettur út í „Hvar á að byrja?“ (bara höggin og trommuþyrill), stoppar eins og segulband og springur út þegar bæklingurinn lendir. Hljóðin eru sett á nákvæmar tímasetningar úr myndinni (`audio/events.json`): viðarhögg í hækkandi tónstiga fyrir hvern kubb, popp þegar kubbur fer í bæklinginn, bjöllur þegar fyrirtæki finnast og flokkar lýsast upp, bank þegar bæklingur lendir á lögheimili. Engin „whoosh“-suðhljóð.

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
