# SVIF 2026: þrívíddarsögur, kvikmyndir og hljóðrás

Hér eru frumgögnin að nýju útliti svif.is (Lovable-verkefnið) og myndunum tveimur:

- **Svona virkar SVIF:** fyrir nýja húseigendur, 53 sek. (önnur umferð: vandinn fyrst, hönnun, prentun, sendibíllinn).
- **SVIF fyrir ný fyrirtæki:** 43 sek. (önnur umferð: kerfiskúlan, flokkarnir lýsast upp, sendibíllinn).

Allt er byggt á einni þrívíddarvél (three.js 0.186.1, án React-laga). Hver sena er hrein fall af framvindunni `g`. Sami kóði keyrir skrunsöguna á vefnum og ramma-nákvæma upptöku myndanna, svo vefur og myndir passa saman.

| Mappa | Innihald |
|---|---|
| `svif/src` | Afrit af kóða vefsins eins og hann var sendur í Lovable 9. nóv. 2026 (óbirt). Þrívíddin er í `svif/src/three`, sögusviðið í `svif/src/components/story` og hreyfikerfið í `svif/src/components/motion` og `svif/src/lib/scroll.ts`. |
| `svif/public/svif` | Áferðir sem senurnar nota: síður bæklingsins, afsláttarmiðar, veggspjöld og kyrrmyndir. |
| `lab/` | Vinnustofa: `story.html` (`?g=`, `?story=biz`), `film.html` (`?film=home\|biz&t=`), `film-specs.ts` (tímalínur myndanna, textaspjöld og hljóðatburðir), `collide.html` (árekstrarprófun), `vignette.html` (myndirnar í „Meira um hugmyndina"), `hero-*.html` (bæklingavélin og hausinn). |
| `film/` | Upptaka (`capture.cjs`), hljóðrás (`score.py` og `svif_dsp.py`), lokavinnsla (`finalize.sh`) og atburðalistar. |
| `film/out/` | Fullgæða útgáfur: H.264 1080p30, um 17 MB, og AV1 10-bita, um 6,5 MB. Þar eru líka veggspjöld, rammi 0 og texti (`.vtt`). |
| `tools/` | Skriftur fyrir veggspjöld, „af hverju“-myndir, yfirlitsblöð og skrunprófanir. |
| `research/` | Rannsóknir og hönnunarbiblían sem allt fylgir (`BIBLE.md`): hreyfing, þrívíddarútlit, kvikmyndagerð og hljóð, úttekt á gömlu myndinni og texta. |

## Keyrsla

Settu `node_modules` upp í `svif/` (`npm i`). Tengdu `lab/node_modules` við `svif/node_modules`. Playwright og ffmpeg (með libx264 og libsvtav1) þurfa að vera til staðar, og Python 3 með numpy, scipy og pedalboard.

```
cd lab && ../svif/node_modules/.bin/vite --config vite.config.mjs          # vinnustofa á :5199
OUT=../film/dist-home ../svif/node_modules/.bin/vite build --config vite.film.config.mjs
python3 -m http.server 5301 --directory ../film/dist-home                  # fryst útgáfa fyrir upptöku
cd ../film
BASE=http://127.0.0.1:5301 node capture.cjs home frames-home 0 1602         # 30 rammar/sek
python3 score.py --events home-events.json --duration 53.4 --out home-score.wav --mood home --lufs -16 --tp -1.5
./finalize.sh svif-heimili frames-home home-score.wav 4.0 30
```

Fyrirtækjamyndin er gerð á sama hátt. Þá er notað `film=biz`, `frames-biz` (1302 rammar), `biz-events.json`, `--mood biz` og lengdin 43,4.

## Athugið

- Lovable leyfir mest 10 MB á hverja skrá. H.264-útgáfurnar á vefnum eru því tveggja umferða kóðun á um 1,33 Mbit/s, um 9 MB hvor. AV1-útgáfan er fyrst í röðinni og spilast í nýlegum vöfrum.
- „NÝR REKSTUR“ er vinnuheiti á fyrirtækjabæklingnum og þarf samþykki.
