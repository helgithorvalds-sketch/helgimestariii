# Tölvupóstur til fyrirtækja: SVIF fyrir ný fyrirtæki

Einn póstur á hvert fyrirtæki, sendur úr Gmail Helga (helgithorvalds@gmail.com), hreinn texti, engin viðhengi,
tveir tenglar (myndbandið og svif.is). Nafn viðtakanda og flokkur fyrirtækisins eru sett inn sjálfkrafa.

**Efnislína:** `SVIF – bæklingur fyrir nýstofnuð fyrirtæki`

```
{kveðja}

Ég heiti Helgi Már og stend á bak við SVIF. Hingað til höfum við tengt nýja húseigendur við
fyrirtæki sem hjálpa þeim að koma sér fyrir, og nú erum við að fara af stað með sama verkefni
fyrir ný fyrirtæki og eigendur þeirra.

Hugmyndin er einföld: kerfið okkar finnur nýstofnuð fyrirtæki um leið og þau verða til og við
sendum eigendum þeirra bækling þar sem traust fyrirtæki kynna þjónustu sína, einmitt á þeim
tímapunkti sem þau eru að velja sér {þjónusta} og annað sem nýr rekstur þarf. Eitt fyrirtæki
er í hverjum flokki og við sendum um 250 bæklinga á mánuði, um allt land.

Þetta stutta myndband útskýrir verkefnið á innan við mínútu:
{myndband}

Nánar um SVIF: https://svif.is

Gætuð þið látið mig vita hvort þetta sé eitthvað sem {fyrirtæki} hefði áhuga á að skoða nánar?
Stutt já eða nei dugar. Nei er líka alveg í lagi, þá vitum við það og ónáðum ykkur ekki frekar.

Bestu kveðjur,
Helgi Már Þorvaldsson
SVIF
853 5147
helgithorvalds@gmail.com
```

## Breytur

| Breyta | Gildi |
|---|---|
| `{kveðja}` | `Sæll Jón,` / `Sæl Anna,` þegar nafn tengiliðar er þekkt (kyn ráðið af -son/-dóttir eða nafnalista), annars `Góðan daginn,` |
| `{þjónusta}` | orðalag eftir flokki fyrirtækisins, t.d. „bókhaldsstofu“, „auglýsingastofu“, „vefsíðu“, „tryggingar“, „tölvubúnað“, „lögfræðiþjónustu“ |
| `{fyrirtæki}` | nafn fyrirtækisins eins og það birtist á vef þess (án ehf./hf.) |
| `{myndband}` | https://cdn.jsdelivr.net/gh/helgithorvalds-sketch/helgimestariii@6215875e041668557347987523727639f9355d77/video/svif-fyrirtaeki/SVIF-fyrirtaeki-web.mp4 |

## Hverjum er sent

Fyrsta val er markaðsstjóri (netfang fundið á vef fyrirtækisins), svo framkvæmdastjóri eða eigandi,
svo sölustjóri, og að lokum almennt netfang fyrirtækisins. Hvert netfang er skráð með slóðinni
þar sem það fannst og MX-færsla lénsins er staðfest. Netföng sem eru giskuð eru ekki notuð.

## Sending

Pósturinn er sendur einn í einu gegnum Gmail, hægt og í lotum (sjá README), svo Gmail flokki hann
ekki sem fjöldapóst. Hver sending er skráð í `postlisti.csv` (dagsetning og message id).
