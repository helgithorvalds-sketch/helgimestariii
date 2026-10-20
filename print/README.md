# Prentskjöl fyrir SVIF bæklinginn

Verkfæri til að svara kröfum prentsmiðjunnar (Litlaprent): **3 mm blæði á öllum
köntum** og **prentupplausn (300 dpi)**. Bæklingurinn er 194 x 194 mm, 28 síður.

## Uppsetning

```sh
pip install -r print/requirements.txt
```

## 1. Athuga upplausn og blæði

```sh
python3 print/check_print.py print/input/SVIF_baeklingur_BLA.pdf print/input/SVIF_baeklingur_BEIGE.pdf
```

Skrifar fyrir hverja síðu stærð, TrimBox/BleedBox og raunverulega dpi hverrar
myndar. Myndir undir 300 dpi eru merktar `LÁG`. Ef síða hefur engan vektor-texta
er hún bara ein mynd og upplausnin ræðst alfarið af henni.

## 2. Bæta við 3 mm blæði

```sh
python3 print/add_bleed.py print/input/SVIF_baeklingur_BLA.pdf \
    print/output/SVIF_baeklingur_BLA_PRENT_200mm_3mm_bleed.pdf --expect-mm 194
```

Útkoman er 200 x 200 mm með TrimBox 194 x 194 mm og BleedBox = MediaBox.

* `--mode mirror` (sjálfgefið): hönnunin helst óbreytt, 3 mm rönd speglast út
  fyrir skurðlínu.
* `--mode scale`: síðan stækkuð um 3 mm á hlið; ystu 3 mm skerast af.

## Upplausn

Blæði lagar ekki pixlun. Ef `check_print.py` sýnir síður undir 300 dpi þarf að
flytja bæklinginn út aftur úr upprunaforritinu í 300 dpi (eða sem vektor-PDF),
og keyra svo `add_bleed.py` á nýja skjalið. Fyrir 194 mm síðu þarf hver síðu-mynd
að vera a.m.k. 2291 x 2291 px (2362 x 2362 px með blæði).

## 3. Síður sem eru bara mynd (eins og SVIF-skjölin frá 19.10.)

Ef hver síða er ein JPEG-mynd (1100 x 1100 px = 144 dpi) er ferlið:

```sh
# a) taka síðumyndirnar út og búa til 300 dpi útgáfu með Lanczos + 3 mm blæði
python3 print/raster_print.py print/input/SVIF_baeklingur_BLA.pdf \
    print/output/SVIF_baeklingur_BLA_PRENT_194mm_3mm_bleed.pdf --dump-dir /tmp/orig_BLA

# b) (valfrjálst) AI-skerping á texta: Real-ESRGAN (realesr-general-x4v3) á CPU,
#    ~15 s á síðu. Þarf: pip install torch --index-url https://download.pytorch.org/whl/cpu
curl -sSL -o /tmp/realesr-general-x4v3.pth \
    https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
python3 print/ai_upscale.py /tmp/orig_BLA /tmp/ai_BLA 2292 /tmp/realesr-general-x4v3.pth

# c) blanda: AI aðeins á skörpum brúnum (texti, línur), Lanczos annars staðar,
#    svo fín mynstur (rúðunet) og ljósmyndir haldist eins og í hönnuninni
python3 print/blend_upscale.py /tmp/orig_BLA /tmp/ai_BLA /tmp/blend_BLA

# d) lokaskjal með blæði úr blönduðu myndunum
python3 print/raster_print.py print/input/SVIF_baeklingur_BLA.pdf \
    print/output/SVIF_baeklingur_BLA_PRENT_194mm_3mm_bleed.pdf --upscaled-dir /tmp/blend_BLA
```

Athugið: þetta gerir skjalið prenthæft (300 dpi, blæði) en upprunaleg skerpa
er áfram takmörkuð af 144 dpi útflutningnum. Besta lausnin til framtíðar er að
flytja bæklinginn út sem PDF með vektor-texta eða myndir í 300 dpi (2362 px
fyrir 200 mm síðu með blæði).

## 4. Vektor-síður úr hönnunarartifactinu (beige)

SVIF-síðurnar sex í beige-útgáfunni (kápa T1, Yfirlit, Afslaettir, UmSvif,
Midar, Bak) eru til sem HTML í Claude-artifactinu „SVIF Flyer Concepts"
(https://claude.ai/artifact/GKE6k2o2NJa4d3kyzDPnyf). `print/vector/` render-ar þær
sem vektor-PDF með Playwright/Chromium:

```sh
python3 print/vector/build_rest.py      # býr til HTML úr .dc.html + blobs (sjá prep.py)
node print/vector/render.js pages/T1.html pdf/T1.pdf   # 194 x 194 mm, texti vektor
python3 print/add_bleed.py pdf/T1.pdf pdf/T1_bleed.pdf --expect-mm 194
python3 print/assemble.py raster.pdf out.pdf 1=pdf/T1_bleed.pdf 2=...
```

Afsláttarmiðarnir sex eru til sem 871 px PNG í sama artifacti; `vector/find_coupons.py`
finnur staðsetningu þeirra á bláu afsláttarmiðasíðunni og `vector/composite_coupons.py`
límir þá yfir í 300 dpi útgáfunni.

## 5. Afsláttarmiðahringurinn (síða 3)

Hringurinn í bókinni var lítil mynd (hver miði ~250 px). `vector/ring.py` beygir
871 px miðana sex utan um sívalning með CSS 3D og `vector/shot.js` render-ar hann í
þrefaldri upplausn með gegnsæjum bakgrunni. `vector/build_ring_pages.py` setur hann
inn í beige Afslaettir-síðuna og í endurgerða bláa síðu (`vector/Afsl_BLA_src.html`,
vektor-texti, sama útlit og í bókinni).
