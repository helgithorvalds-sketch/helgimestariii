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
