# Gluggavinir – SVIF auglýsing (3 útfærslur)

Þrjár útfærslur af 1:1 auglýsingu Gluggavina fyrir SVIF-bæklinginn.

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
| `flyer-c.html` | C – Dökkblátt premium: mynd í ávölu spjaldi, risastórt 10% í appelsínugulu. |
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
node render.js a,b,c      # skrifar out/flyer-{a,b,c}.png og .pdf
```

## Tilboðstexti (frá Tommi, 2. okt. 2026)

- Heildarþjónusta á einum stað, allt innifalið: mæling (með ábyrgð), ráðgjöf um efnisval, pöntun, ísetning (TME Gluggar), förgun, frágangur og þrif.
- Frí mæling og tilboð.
- 10% afsláttur af gluggum og ísetningu þegar hvort tveggja er tekið saman í pakka.
