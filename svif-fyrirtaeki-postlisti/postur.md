# Tölvupóstur til fyrirtækja: SVIF fyrir ný fyrirtæki

Sami póstur á öll fyrirtæki (ekkert sérsniðið, svo ekkert geti farið úrskeiðis), sendur úr Gmail Helga
(helgithorvalds@gmail.com), hreinn texti, engin viðhengi, einn tengill: svif.is/fyrirtaeki (kynningarsíðan með myndbandinu).

**Efnislína:** `SVIF – bæklingur fyrir nýstofnuð fyrirtæki`

```
Hæhæ,

Helgi Már heiti ég og stend á bak við fyrirtækið SVIF.

Við vorum nýlega að skoða fyrirtækið ykkar og sáum að það gæti mögulega hentað mjög vel fyrir
nýtt markaðsverkefni sem við höfum verið að vinna að.

Þegar fólk stofnar nýtt fyrirtæki þarf það að huga að ótal hlutum, hvort sem það er að finna
tryggingar, bókhald, vefsíðu, auglýsingastofu eða aðra þjónustu sem þarf til að koma rekstrinum
af stað.

Þess vegna höfum við sett saman sérstakan bækling fyrir nýja fyrirtækjaeigendur þar sem fyrirtæki
kynna þjónustu sína og bjóða upp á afslætti. Bæklingurinn er sendur beint til nýrra
fyrirtækjaeigenda um allt land, einmitt þegar þeir eru að leita að þjónustu sem getur hjálpað þeim
að koma rekstrinum af stað. Við sendum um 250 bæklinga á mánuði.

Hér er stutt myndband sem útskýrir verkefnið og hvernig þetta virkar á innan við mínútu:

Nánari upplýsingar og kynningarmyndband: https://svif.is/fyrirtaeki

Upphaflega vorum við með bækling til nýrra húseigenda og eftir lofandi niðurstöður þar teljum við
rökrétt að miðla auglýsingum einnig til nýrra fyrirtækjaeigenda.

Mig langaði því að athuga hvort þetta væri eitthvað sem þið hefðuð áhuga á að skoða nánar. Það væri
frábært að fá stutt svar, hvort sem það er já eða nei. Ef þetta er ekki eitthvað fyrir ykkur er það
auðvitað ekkert mál, þá vitum við það og höfum ekki frekar samband vegna þessa.

Bestu kveðjur,
Helgi Már Þorvaldsson
SVIF
853 5147
helgithorvalds@gmail.com
```

Textinn er Helga; aðeins stafsetning var lagfærð (upphaflega, rökrétt, fyrirtækjaeigenda, húseigenda).

## Myndbandið

Síðan `svif.is/fyrirtaeki` er kynningarsíða fyrirtækjabæklingsins í sama útliti og forsíða svif.is, með myndbandinu (SVIF fyrir fyrirtæki, 52 sek.) efst. Skráin sjálf
(`video/svif-fyrirtaeki/SVIF-fyrirtaeki-web.mp4`, 15 MB) er sótt af jsDelivr-dreifineti úr þessu opinbera
repo-i, en viðtakandinn sér aðeins svif.is-slóðina.

## Hverjum er sent

Fyrsta val er markaðsstjóri (netfang fundið á vef fyrirtækisins), svo framkvæmdastjóri eða eigandi,
svo nafngreindur lögmaður/endurskoðandi úr félagatali, svo sölustjóri, og að lokum almennt netfang
fyrirtækisins. Hvert netfang er skráð með slóðinni þar sem það fannst og MX-færsla lénsins er staðfest.
Netföng sem eru giskuð eru ekki notuð.

## Sending

Pósturinn er sendur einn í einu gegnum Gmail, í lotum yfir nokkra daga, svo Gmail flokki hann ekki sem
fjöldapóst. Hver sending er skráð í `postlisti.csv` (dagsetning og message id).
