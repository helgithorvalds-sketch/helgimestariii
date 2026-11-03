# SVIF bæklingur – útgáfa 3. nóv. 2026

28 síður, 194 x 194 mm, 3 mm blæði (200 x 200 mm skjöl með TrimBox).

## Breytingar frá 26. okt.

* **Afsláttarmiðar (bls. 26):** aðeins Parki, Íspan, Ormsson og Maus. Miðarnir ná út í ytri
  skurðbrún og inn að rifgötuninni við kjöl, enginn spássía til hliðanna.
* **Rifgötun:** heilar línur þvert yfir síðuna (svo prentsmiðjan geti keyrt þær í gegn):
  láréttar 34, 74, 114 og 154 mm frá efri skurðbrún; lóðrétt 10 mm frá kili.
* **Ekki á kápublaðinu:** miðarnir eru á bls. 26 (vinstri síða, kjölur hægra megin) og bakhlið
  þeirra á bls. 25 (skilmálar). VÍS er innan á bakkápu (bls. 27).
* **Íspan-merkið** er í réttum lit (dökkblátt #004785 og grænblátt #008c9a) eins og í auglýsingunni.
* **MJ Lausnir** fara út. Yfirlit (bls. 2) með nýjum blaðsíðutölum, 19 fyrirtæki.
* **Hvíti ramminn** tekinn af öllum auglýsingum sem höfðu hann (KORA, Maus x2, HK Lagnir,
  Gardínur, Steindi x2, Heit gólf, VÍS).
* Steindi-auglýsingarnar standa saman á opnu (bls. 20–21) og Gluggavinir og Gardínur saman (bls. 16–17).

## Smíði

```sh
python3 fonts.py                 # sækir letur (Fraunces, Jost, Montserrat, Open Sans, Archivo Black)
python3 midar.py                 # midar_framhlid.html + midar_bakhlid.html
node render.js midar_framhlid.html raw.pdf preview.png 3.94 && python3 boxes.py raw.pdf sidur/midar_framhlid.pdf
python3 ring.py 600 -17 1700 4 && node shot.js ring.html out/ring_3x.png 3   # hringurinn á bls. 3
python3 build_svif_pages.py      # yfirlit.html + afslaettir.html úr hönnunarartifactinu
python3 unframe.py in.jpg out.jpg  # tekur hvíta rammann af auglýsingasíðu
python3 assemble_all.py          # setur bæklinginn saman
```

Lokaskjölin eru í artifactinu „SVIF PDF“ (https://claude.ai/artifact/QxDjcwAYxAVfvZp95XsJ8o)
og 3D flettibókin í „SVIF flettibók 28“ (https://claude.ai/artifact/RTQihiKvmPMbYpubq86Qqh).

## Á eftir að staðfesta

* Ormsson: 20% er tillaga, ekki staðfest.
* Gildistími 31.12.2026 á öllum miðum er tillaga.
* Staðsetning rifgötunar á eftir að fá samþykki Litlaprent.
