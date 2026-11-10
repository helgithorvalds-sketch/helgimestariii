# Hringiðan – „Komdu þér vel fyrir“ (kósý útgáfa af innflutningsgjöf)

Endurhönnun á auglýsingunni „Sparaðu allt að 56.940 kr.“ með hlýrri og heimilislegri stemningu,
innblásin af uppsetningu Sýn-póstsins (eitt ríkjandi litaþema, stór ávöl form, mynd sem rennur inn í
ávalan flöt, stuttur og vinalegur texti). Lógó, litir, tilboð, QR-kóði og smáletur Hringiðunnar halda sér.

## Skrár

| Skrá | Lýsing |
|---|---|
| `hringidan-kosy-ljosmynd.png` / `.jpg` | Útgáfa 1 – ljósmynd af fjölskyldu á og fyrir framan sófa, blár flötur að neðan. 2000×2000. |
| `hringidan-kosy-2d.png` / `.jpg` | Útgáfa 2 – flöt 2D teikning á dökkbláum grunni, rjómalitur flötur að neðan. 2000×2000. |
| `src/` | Breytanlegar HTML/CSS skrár, leturgerðir, lógó með gegnsæi, QR-kóði og myndir. |

## Texti

- Yfirlína: *Til hamingju með nýja heimilið*
- Fyrirsögn: *Komdu þér vel fyrir. **Við sjáum um netið.***
- Meginmál: *Þrír heilir mánuðir af neti og farsíma – frítt. Innflutningsgjöf frá Hringiðunni sem sparar þér allt að 56.940 kr.**
- Merki: *3 mánuðir frítt*
- Smáletur og skilmálar óbreyttir frá upprunalegu auglýsingunni.

QR-kóðinn er endurgerður í hárri upplausn og vísar á `https://hringidan.is/pontun/` (sama slóð og í upprunalegu auglýsingunni, staðfest með afkóðun).

## Að breyta og endurrenndera

Textinn er í `src/hringidan-kosy-ljosmynd.html` og `src/hringidan-kosy-2d.html`, útlit í `src/content.css`.
Til að búa til nýja PNG-mynd (þarf Node og Playwright með Chromium):

```bash
cd auglysingar/hringidan/src
node render.cjs hringidan-kosy-ljosmynd.html ../hringidan-kosy-ljosmynd.png
node render.cjs hringidan-kosy-2d.html ../hringidan-kosy-2d.png
```

Myndirnar (`src/photo.jpg`, `src/illu.png`) voru búnar til með gervigreind (Higgsfield) og uppskalaðar í 4K;
þær má skipta út fyrir alvöru ljósmynd með því að yfirskrifa skrána og renndera aftur.
