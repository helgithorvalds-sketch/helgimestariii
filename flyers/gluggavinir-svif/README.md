# Gluggavinir – SVIF auglýsing (3 útfærslur)

Tvær útfærslur (A og B) af 1:1 auglýsingu Gluggavina fyrir SVIF-bæklinginn.

- Stærð: 194 × 194 mm skorið + 3 mm bleed á allar hliðar = 200 × 200 mm skjal.
- Öryggissvæði: 5 mm innan við skurðlínu (allt efni sem skiptir máli er innan þess).
- Hönnunin er sett upp í 800 × 800 CSS-px (4 px = 1 mm). PNG er rennt út í 2362 × 2362 px (300 dpi), PDF í 200 × 200 mm með vektortexta.
- Letur: Carmen Sans (vefletur Gluggavina, sótt af gluggavinir.is við útkeyrslu). Litir: appelsínugult `#FF6600`, svart `#0C0D0E`, dökkblátt `#324A6D`, grátt `#F1F1F1`.
- Myndir: forsíðumynd gluggavinir.is (MFM4105), uppskölluð í 4K með Higgsfield. Myndirnar eru ekki í repo-inu; `render.js` býst við þeim í `assets/` (sjá slóðir hér að neðan).

## Skrár

| Skrá | Útfærsla |
| --- | --- |
| `flyer-a.html` | A – Appelsínugult tilboð: ljósmynd efst, stórt 10% merki, gátlisti og símanúmer. |
| `flyer-b.html` | B – Skáborði: ljósmynd með skáskornum neðri kanti, appelsínugulur borði með 10% afslætti. |
| `base.css` | Sameiginlegt grunn-CSS (stærðir, letur, prentreglur). |
| `render.js` | Playwright-skrifta sem rennir út PNG (300 dpi) og PDF fyrir a,b,c. |

## Keyrsla

```bash
mkdir -p fonts assets out
for w in Heavy Bold Medium Regular; do
  curl -sL "https://gluggavinir.is/wp-content/uploads/2026/05/CarmenSans-$w.woff2" -o fonts/CarmenSans-$w.woff2
done
curl -sL https://gluggavinir.is/wp-content/uploads/2026/05/Gluggavinir_Logo_V.1_b-scaled.png -o assets/gluggavinir_logo.png
curl -sL https://gluggavinir.is/wp-content/uploads/2026/09/TME_Gluggar_Logo_V.3_b.png -o assets/tme_gluggar_logo.png
# hero_4k.jpg: 4K uppsköluð útgáfa af MFM4105 (sjá Higgsfield-slóð í samantekt verkefnisins)
npm i playwright && npx playwright install chromium
node render.js a,b        # skrifar out/flyer-{a,b}.png og .pdf
```

## Tilboðstexti (frá Tommi, 2. okt. 2026)

- Heildarþjónusta á einum stað, allt innifalið: mæling (með ábyrgð), ráðgjöf um efnisval, pöntun, ísetning (TME Gluggar), förgun, frágangur og þrif.
- Frí mæling og tilboð.
- 10% afsláttur af gluggum og ísetningu þegar hvort tveggja er tekið saman í pakka.

## Tilbúnar prentskrár (Higgsfield-geymsla)

| | PNG 2362×2362 px (300 dpi, með bleed) | PDF 200×200 mm (vektor) |
| --- | --- | --- |
| A | https://d2ol7oe51mr4n9.cloudfront.net/user_34vsSReFkdGCAGhtasiRFYvLczn/2963f33f-234c-419b-b236-38c19c72b6c4.png | https://d2ol7oe51mr4n9.cloudfront.net/user_34vsSReFkdGCAGhtasiRFYvLczn/1b05efbe-ca06-4dcb-b198-f02c621d9e59.pdf |
| B | https://d2ol7oe51mr4n9.cloudfront.net/user_34vsSReFkdGCAGhtasiRFYvLczn/c8f8e6d1-1d8e-4981-9739-6c75ee14fa81.png | https://d2ol7oe51mr4n9.cloudfront.net/user_34vsSReFkdGCAGhtasiRFYvLczn/b1f7fd1d-22fd-4365-9eb0-25e120c283f9.pdf |

Hero-myndin uppsköluð í 4K (4096×2737 PNG): https://d8j0ntlcm91z4.cloudfront.net/user_34vsSReFkdGCAGhtasiRFYvLczn/hf_20261005_140554_0c5e7b04-1ca7-44ce-b49d-5bea8bb1b61e.png
(vistist sem `assets/hero_4k.jpg` með `convert hero.png -quality 90 assets/hero_4k.jpg`)

Hönnunarstriga (Claude Design) með báðum útfærslum: https://claude.ai/artifact/FYf6xW4sfCH6vM8RhxcZ69
