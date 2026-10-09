# Sticker.is – SVIF auglýsing

Auglýsing fyrir Sticker ehf (sticker.is) í SVIF-bæklinginn. Stærð 19,4 × 19,4 cm (1:1).

- `sticker-svif.html` – hönnunin sjálf (opnast í vafra, prentast beint í 194 × 194 mm)
- `sticker-svif.pdf` – prentskjal
- `sticker-svif.png` – forsýning, 2202 × 2202 px (≈ 288 dpi)

## Það sem þarf að staðfesta við Kristófer (sticker@sticker.is)

- **Afsláttarkóði** – Kristófer er ekki búinn að setja hann upp. Settur sem `SVIF25` til bráðabirgða.
- **Afsláttarprósenta** – sett sem 25% (sama og október-tilboðið á sticker.is). Breyta ef annað verður.
- **Mynd** – Kristófer sendi IMG_0913.JPG í tölvupósti 8. okt. Hún náðist ekki niður hér; myndin í auglýsingunni er af sticker.is. Skipta má út með því að setja myndina í `assets/` og breyta `src` á `.hero img`.

Afsláttur og kóði eru breytanleg efst í `sticker-svif.html`:

```css
--discount: "25%";
--code: "SVIF25";
```

## Upplýsingar sem notaðar eru

| | |
|---|---|
| Fyrirtæki | Sticker ehf, kt. 530721-1160 |
| Sími | 775 2945 |
| Netfang | sticker@sticker.is |
| Heimilisfang | Álfhella 7, 221 Hafnarfjörður |
| Vefur | sticker.is · Instagram @sticker.is · Facebook /stickericeland |
| Slagorð | „Gæði og góð þjónusta“ |
| Litir | Teal #57BDBD (lógó), dökkur #151515, hvítur |
| Letur | Cabin (fyrirsagnir) og Karla (meginmál) – sömu leturgerðir og á sticker.is |
| Þjónusta | Sandblástursfilmur (80+ mynstur, nöfn/heimilisfang), sólar- og privacy-filmur, filmur á sturtugler, vegglímmiðar, bílamerkingar |
| Ferli | Frí mæling og ráðgjöf → sýnishorn → uppsetning innan viku; verð innifela uppsetningu |

## Endurgera PNG/PDF

```sh
node render.mjs <mappa> <úttak-án-endingar>   # notar Playwright + Chromium
```
