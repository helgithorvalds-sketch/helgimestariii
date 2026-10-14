# Aurbjörg – kynningarmyndband (~41 s, 1920×1080)

- `aurbjorg-is.mp4` – íslensk útgáfa
- `aurbjorg-en.mp4` – English version

## Uppbygging
| Tími | Sena | Efni |
|---|---|---|
| 0–4 s | Merki | Aurbjörg-merkið + „Fjármálalausn sem sparar þér tíma og peninga“ |
| 4–10 s | Vandamálið | Fjármál heimilisins á víð og dreif (lán, laun, rafmagn, fasteign, lífeyrir, bankareikningar) |
| 10–15 s | Vandamálið | Verðbólga 5,90 % (+0,30) og stýrivextir 8,00 % (+0,25) |
| 15–23 s | Vandamálið | Vextir óbundinna bankareikninga: 7,76 / 7,66 / 7,12 / 6,80 / 5,70 % → 2,06 prósentustiga munur, dæmi: 103.000 kr./ári á 5 m.kr. |
| 23–26 s | Viðsnúningur | „Aurbjörg finnur tækifæri í fjármálum heimilisins“ |
| 26–32 s | Lausnin | Allt á einum stað: Lánskjaravaktin, Dagleg fjármál, Rafmagn, Bankareikningar, Lífeyrisbestun, Verðmat |
| 32–37 s | Árangur | 1.500.000 kr. (Sindri), 15 % / ~50.000 kr. á ári (Anna), 5 % (Sigga) – úr umsögnum á síðunni |
| 37–41 s | CTA | „Komdu í áskrift“ · aurbjorg.is |

Allar tölur, textar, merki og tákn eru tekin af aurbjorg.is (markaðsgögn október 2026).
Eina reiknaða talan er dæmið 5.000.000 kr. × 2,06 % = 103.000 kr.
Litir: `#2C98FF` (merki), `#0a1e44` / `#143a85` (navy). Letur: Inter.

## Endurgera
```bash
python3 music.py                       # býr til music.wav (tónlist samin í kóða, engin leyfismál)
node render.cjs is aurbjorg-is-silent.mp4
ffmpeg -i aurbjorg-is-silent.mp4 -i music.wav -c:v copy -c:a aac -b:a 192k -shortest aurbjorg-is.mp4
```
`index.html` spilar líka hreyfimyndina beint í vafra (`?lang=en` fyrir ensku).
Textar eru í `COPY` og tímalínan í `S` / `render(t)` í `index.html`.
