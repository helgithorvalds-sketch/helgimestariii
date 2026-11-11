# SVIF bæklingur – útgáfa 11. nóv. 2026

32 síður, heftaður, 194 x 194 mm, 3 mm blæði (200 x 200 mm skjöl með TrimBox/BleedBox), 300 dpi.

## Uppsetning

| Bls. | Efni |
|---|---|
| 1 | Forsíða („Nýji kaflinn“) |
| 2 | Yfirlit – kaflar, fyrirtæki og blaðsíðutöl (23 fyrirtæki) |
| 3 | Afsláttarmiðar (kynning, gamli hringurinn, vísar á bls. 29) |
| 4–5 | Parki · Gardínur |
| 6–7 | HTH · Ormsson AEG |
| 8–9 | Straumlind · Hringiðan |
| 10–11 | Ísorka · Íspan |
| 12–13 | Maus (opna) |
| 14–15 | Gluggavinir · TME Gluggar |
| 16–17 | Sticker · KORA |
| 18–19 | Litamálun · Múrbúðin |
| 20–21 | Fagafl · RÓM Verk |
| 22–23 | HK Lagnir · Lásar.is |
| 24–25 | Steindi („Sláum í gegn“) · Heit gólf |
| 26–27 | MS Lagnir · VÍS |
| 28 | Af hverju SVIF |
| 29 | Afsláttarmiðar (rifnir úr) – hægri síða |
| 30 | Auð síða (bakhlið miðanna) |
| 31 | Kærar þakkir – öll 23 fyrirtækin í stafrófsröð |
| 32 | Bakkápa („Til hamingju“) |

Nýjustu auglýsingar (11. nóv.): Hringiðan (Gjafabréf), Fagafl og MS Lagnir, 2000 px ferningar í `auglysingar/` → `adprep.py`
(→ 2361 px með speglaðri blæðingu). `a4_to_square.py` er til vara ef auglýsing berst í A4 (full hæð, litir framlengdir út í kant).

Tveggja síðna auglýsingar byrja á sléttri síðu (vinstri). Miðasíðan er oddatölusíða (hægri) með auða bakhlið,
ekki á kápublaðinu. MJ Lausnir er farið út; hvíti ramminn er farinn af öllum auglýsingum (`unframe.py`).

## Útlit

Forsíða og bakkápa eru prentmyndirnar af greininni `claude/kind-dirac-lm09hh` (`design/svif-forsida/prent/`).
`dokk.py` gerir Yfirlit, Kærar þakkir og auðu síðuna í sama dökka útliti (Inter, hornlínur, kornóttur grunnur),
`darkdc.py` + `build_dark_pages.py` setja Afsláttarmiða-kynninguna og Af hverju SVIF í sama útlit.
Allar SVIF-síður eru rastaðar í 300 dpi (`raster794.py` / `render.js` + 3,125x) til að forðast rendur í litstiglum.

## Afsláttarmiðar

* Bls. 3: hringurinn með beige-hvítum miðum. Miðarnir eru rendraðir í 8x (`coupshot.js` úr `midar3_stakir.html`) og
  sívalningsvörpunin reiknuð í numpy (`ring_np.py`, sama rúmfræði og `ring6.py`) – Chrome 3D gaf óskýran/tröppóttan texta.
* Bls. 29: Parki, Íspan, Ormsson og Maus í litum hvers fyrirtækis (`midasida_thema.py`, `ring_theme.py`),
  92 x 50 mm hver, 2 x 2 neðst á síðunni, þétt saman og út í kant.
* Rifgötun í heilum línum: lóðréttar 10 mm og 102 mm frá kili, láréttar 94 mm og 144 mm frá efri brún.
* Stakar miðamyndir fyrir tölvupósta: https://svif.is/baeklingur/midar/svif_afslattarmidi_{parki,ispan,ormsson,maus}.jpg

## Á vefnum

Flettibókin er á https://svif.is/baeklingur (Lovable-verkefnið „Svif“, skráin public/baeklingur/flettibok.html).
`embed.py` býr til sjálfstæða HTML-skrá (`public_flett/baeklingur.html`, ~5 MB) úr `flett/index.html` + 32 síðumyndum
(1100 px, úr TrimBox prent-PDF-sins). Skráin er afrituð óbreytt yfir með MD5-athugun og síðan birt með deploy.
3D-mockup: `SVIF_baeklingur_3D_mockup.jpg` (`mockup/mockup.html`, forsíða + opna 28–29).

## Smíði

```sh
python3 fonts.py                 # sækir letur
python3 dokk.py                  # d_yfirlit, d_thakkir, d_aud (HTML) → render.js + 3.125 → out/*.jpg
python3 build_dark_pages.py      # afslaettir_dark.html, umsvif_dark.html
python3 raster794.py afslaettir_dark.html out/afslaettir_dark.jpg
python3 midar3.py && python3 midasida_thema.py   # miðar (hringur + bls. 29)
node coupshot.js midar3_stakir.html out/ring6 8 && python3 ring_np.py 6   # hringurinn á bls. 3 → out/ring_crop.png
python3 assemble_all.py          # out/SVIF_baeklingur_prent.pdf (< 20 MB) og _skodun.pdf
python3 embed.py                 # public_flett/baeklingur.html fyrir svif.is
```

Lokaskjölin eru í artifactinu „SVIF PDF“ (https://claude.ai/artifact/QxDjcwAYxAVfvZp95XsJ8o)
og 3D flettibókin í https://claude.ai/artifact/RTQihiKvmPMbYpubq86Qqh.

## Á eftir að staðfesta

* Ormsson: 20% er tillaga, ekki staðfest.
* Gildistími 31.12.2026 á öllum miðum er tillaga.
* Staðsetning rifgötunar á eftir að fá samþykki Litlaprent.
