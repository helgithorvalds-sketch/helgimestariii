# Hringiðan – Gjafabréf („Komdu þér vel fyrir“)

Endurhönnun á innflutningsgjöf Hringiðunnar sem **gjafabréf**: navy-blátt band efst með lógóinu vinstra megin og
„Gjafabréf“ í skrautskrift hægra megin, fjölskyldumynd út í kant í kósý stemningu þar sem mamman er í tölvunni og
pabbinn horfir á hana, krakkarnir með spjaldtölvu fyrir framan sófann, ávalur blár textaflötur og innsigli „3 mánuðir frítt“. Innblástur: uppsetning Sýn-póstsins
(eitt ríkjandi litaþema, stór ávöl form, stuttur og vinalegur texti). Lógó, litir, QR-kóði og tilboð Hringiðunnar halda sér.

## Skrár

| Skrá | Lýsing |
|---|---|
| `hringidan-gjafabref-ljosmynd.png` / `.jpg` | **Aðalútgáfa** – ljósmynd. 2000×2000. |
| `hringidan-gjafabref-2d.png` / `.jpg` | Sama gjafabréfs-rammi með flatri 2D teikningu. 2000×2000. |
| `hringidan-gjafakort.png` / `.jpg` | Gjafakort (25.000 kr.) í 1:1 eftir fyrirmynd með bláum borða og slaufu yfir íslenskt landslag, með alvöru Hringiðan-lógóinu. Gjafabréfsnúmer `HG-123456` er sýnishorn. |
| `eldri/` | Fyrri umferðir til viðmiðunar: `hringidan-kosy-*` (fyrsta umferð) og `hringidan-gjafabref-rammi-*` (útgáfa með skrautramma og mynd í spjaldi). |
| `src/` | Breytanlegar HTML/CSS skrár, leturgerðir (Raleway, Nunito, Great Vibes), lógó með gegnsæi, QR-kóði og myndir. |

## Texti

- Titill: *Gjafabréf* (Great Vibes skrautskrift)
- Yfirlína: *Til hamingju með nýja heimilið*
- Fyrirsögn: *Komdu þér vel fyrir. **Við sjáum um internetið.***
- Meginmál: *Þrír mánuðir af neti og farsíma – frítt. Innflutningsgjöf frá Hringiðunni sem sparar þér allt að 60 þúsund krónur.**
- Lágstemmd lína: *Engin stofngjöld · Persónuleg þjónusta síðan 1995*
- Innsigli: *3 mánuðir frítt*
- QR-spjald: *Til að nýta gjafabréfið: skannaðu kóðann eða farðu á hringidan.is/pontun · Sími 525 2400*
- Smáletur: 1 Gíg ljósleiðari 11.990 kr./mán. (+ aðgangsgjald Mílu eða Ljósleiðarans, um 4.000 kr./mán.),
  ótakmarkaður farsími 6.990 kr./mán. einn og sér en 3.490 kr./mán. með internettengingu.

## Verð sem smáletrið byggir á (athugað 11. nóv. 2026)

- hringidan.is: 1 Gíg 11.990 kr./mán., 2,5 Gíg 12.990, 5 Gíg 14.990, 10 Gíg 18.990; ótakmarkaður farsími 6.990 kr./mán.
  Verðið 3.490 kr. fyrir farsíma með internettengingu kemur frá Hringiðunni sjálfri, það sést ekki á vefnum.
- Aðgangsgjald: Hringiðan skráir 3.800 kr. (heimasíma-síða), Ljósleiðarinn 4.194 kr. (verðskrá frá 1. júlí 2026),
  Hringdu 3.990 kr., Sýn skráir Mílu á 5.390 kr. – „um 4.000 kr.“ er því hæfilegt.
- Athugið: pöntunarsíða Hringiðunnar (hringidan.is/pontun-internet) segir að verðið *innihaldi* aðgangsgjald.
  Það stangast á við orðalagið „+ aðgangsgjald“ og ætti að staðfesta við Hringiðuna.
- „Allt að 60 þúsund“: 1 Gíg (11.990) + farsími á fullu verði (6.990) × 3 = 56.940 kr.; með 2,5 Gíg = 59.940 kr.
  Ef farsíminn er reiknaður á 3.490 kr. verður sparnaðurinn 46.440 kr. nema aðgangsgjaldið sé líka gefið.

QR-kóðinn vísar á `https://hringidan.is/pontun/` (staðfest með afkóðun úr endanlegu myndunum).

## Gjafakortið (1:1)

Bakgrunnurinn (`src/giftbg.jpg`: landslag, borði, slaufa og hvít rönd) var búinn til með gervigreind án texta
og uppskalaður í 4K; allur texti, lógó, tákn og QR-kóði eru lagðir ofan á í HTML (`src/hringidan-gjafakort.html`).
Textinn fylgir fyrirmyndinni: „Tengir þig við meira“, „Góð tenging er góð gjöf“, „Að verðmæti: 25.000 kr.“,
„Gildir sem greiðsla fyrir vörur og þjónustu hjá Hringiðunni.“, þjónustutákn, gjafabréfsnúmer, gildistími,
„Alltaf nær þér“ og QR. Tvær stafsetningarvillur úr gervigreindarmyndinni voru lagaðar („Íslenskir innviðir“).

## Að breyta og endurrenndera

Textinn er í `src/hringidan-gjafabref-ljosmynd.html` og `src/hringidan-gjafabref-2d.html`.
Þarf Node og Playwright með Chromium:

```bash
cd auglysingar/hringidan/src
node render.cjs hringidan-gjafabref-ljosmynd.html ../hringidan-gjafabref-ljosmynd.png
node render.cjs hringidan-gjafabref-2d.html ../hringidan-gjafabref-2d.png
node render.cjs hringidan-gjafakort.html ../hringidan-gjafakort.png
```

Myndirnar (`src/photo_c.jpg`, `src/illu.png`) voru búnar til með gervigreind (Higgsfield) og uppskalaðar í 4K;
þeim má skipta út fyrir alvöru ljósmynd með því að yfirskrifa skrána og renndera aftur.
