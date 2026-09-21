# SVIF – kynning fyrir Frumkvöðlasjóð Íslandsbanka 2026

- `SVIF-kynning-Frumkvodlasjodur-2026.pdf` – 14 glæru kynningin á PDF (16:9).
- `svif-kynning.html` – heimildaskrá glæranna. Breyta texta/tölum hér og renderа aftur.
- `render.mjs` – býr til PDF og skjámyndir af hverri glæru með Playwright/Chromium.

Renderа aftur:

```sh
cd docs/svif-kynning
node render.mjs   # krefst playwright + chromium (sjá executablePath í skránni)
```
