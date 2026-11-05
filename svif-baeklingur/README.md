# SVIF bæklingur – útgáfa 3. nóv. 2026

32 síður, heftaður, 194 x 194 mm, 3 mm blæði (200 x 200 mm skjöl með T## Uppsetning

1 forsíða · 2 yfirlit · 3 afsláttarmiðar (kynning, gamli hringurinn) · 4–24 auglýsingar (bestu afslættirnir
fremst; Gluggavinir og TME Gluggar saman á 14–15, Gardínur og Fagafl 16–17, HK Lagnir og MS Lagnir 20–21,
Lásar og VÍS 22–23) · 25–27 laust auglýsingapláss · 28 Af hverju SVIF · 29 afsláttarmiðar ·
30 auð síða (bakhlið miðanna) · 31 Kærar þakkir með öllum 20 fyrirtækjunum · 32 bakkápa.
Steindi, Heit gólf og MJ Lausnir eru farin út. TME, Fagafl (útgáfa 2) og MS Lagnir koma af greininni
claude/adoring-heisenberg-mywx1q (auglysingar/), gerðar úr PDF í 300 dpi með speglaðri 3 mm blæðingu (`sidur/nyjar/`).

## Á vefnum

Flettibókin er á https://svif.is/baeklingur (Lovable-verkefnið „Svif“, skráin public/baeklingur/flettibok.html).
`embed.py` býr til sjálfstæða HTML-skrá með síðunum innbyggðum úr `vefur/flettibok_src.html` + síðumyndum.

## Afsláttarmiðar (bls. 29, hægri síða, kjölur vinstra megin)

* Parki, Íspan, Ormsson og Maus, 92 x 50 mm hver, 2 x 2 neðst á síðunni, þétt saman og út í kant.
* Rifgötun í heilum línum: lóðréttar 10 mm og 102 mm frá kili, láréttar 94 mm og 144 mm frá efri brún.
* Miðablaðið (bls. 29–30) er ekki kápublaðið, svo kápan rifnar ekki með.
* Íspan-merkið í réttum lit (dökkblátt #004785 og grænblátt #008c9a), eins og í auglýsingunni.

## Aðrar breytingar

* MJ Lausnir farnar út; yfirlit með nýjum blaðsíðutölum.
* Hvíti ramminn tekinn af auglýsingunum (KORA, Maus x2, HK Lagnir, Gardínur, Steindi x2, Heit gólf, VÍS).

 16–17).

## Smíði

```sh
python3 fonts.py                 # sækir letur (Fraunces, Jost, Montserrat, Open Sans, Archivo Black)
python3 midar2.py                # miðasíða 2x2, auð síða, Kærar þakkir, laus pláss
node render.js midar2_framhlid.html raw.pdf - && python3 boxes.py raw.pdf sidur/midar2_framhlid.pdf
python3 ring.py 600 -17 1700 4 && node shot.js ring.html out/ring_3x.png 3   # hringurinn á bls. 3
python3 ring6.py && node shot.js ring6.html out/ring6_3x.png 3   # hringurinn á bls. 3, gamli stíllinn
python3 build_svif_pages.py      # yfirlit.html + afslaettir.html úr hönnunarartifactinu
python3 raster794.py yfirlit.html sidur/yfirlit.jpg   # 300 dpi mynd, eins og upprunalegu síðurnar
python3 unframe.py in.jpg out.jpg  # tekur hvíta rammann af auglýsingasíðu
python3 assemble_all.py          # setur bæklinginn saman
```

Lokaskjölin eru í artifactinu „SVIF PDF“ (https://claude.ai/artifact/QxDjcwAYxAVfvZp95XsJ8o)
og 3D flettibókin í „SVIF flettibók 28“ (https://claude.ai/artifact/RTQihiKvmPMbYpubq86Qqh).

## Á eftir að staðfesta

* Ormsson: 20% er tillaga, ekki staðfest.
* Gildistími 31.12.2026 á öllum miðum er tillaga.
* Staðsetning rifgötunar á eftir að fá samþykki Litlaprent.
