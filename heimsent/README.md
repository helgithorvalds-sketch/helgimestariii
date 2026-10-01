# SVIF Heimsent v2

Útsendingarkerfi SVIF-bæklingsins: finnur nýja húseigendur í kaupskrá HMS, metur líkur á framkvæmdum,
**áætlar afhendingardag** og skilar vikulegum lista fyrir Póstdreifingu með íbúðarnúmerum.

Allt er í einni skrá, `heimsent.py`, og þarf aðeins Python 3.8+. `openpyxl` er valkvætt (fyrir XLSX).

## Hvað er nýtt miðað við gamla kerfið

| Vandamál áður | Lausn núna |
|---|---|
| Bæklingur sendur 2 vikum eftir kaupsamning, oft áður en fólk flutti inn | Áætlaður afhendingardag = kaupsamningur + 10 vikur (notað), + 12 vikur (fullbúin nýbygging), + 9 mánuðir (selt ófullbúið). Ekkert fer út fyrir þann dag. |
| Nýbyggingar og fokhelt húsnæði fengu einkunn A og fóru strax út | Fullbúnar nýbyggingar eru ekki markhópur (E). Ófullbúið bíður í 9 mánuði og er merkt „afhending óviss“. |
| Verktakar/fjárfestar sem kaupa margar íbúðir í einu | Margar eignir á sama skjalanúmeri eða sama húsnúmeri sama dag = verktakakaup, sleppt. |
| Heilar byggingar (t.d. 2.262 m², 82 herbergi) | Allt yfir 500 m² eða 12 herbergi er sleppt. |
| „Til húseiganda“ gengur ekki í fjölbýli | Íbúðarnúmer (hæð + íbúð) úr kaupskrá sett á allar íbúðir: „Álfheimar 54, íbúð 0302“. |
| Sama eign kom aftur og aftur á lista | Ein færsla á hvert fastanúmer, og `state/sent.json` tryggir að ekkert er sent tvisvar. |
| Ónothæfir samningar, atvinnuhúsnæði, sumarhús, bílskúrar | Sleppt með skýringu í samantekt. |

## Einkunnir

A/B/C fá bækling, D/E/F ekki.

- **A** eldra sérbýli (byggt ≤ 1989) eða selt ófullbúið sérbýli
- **B** sérbýli '90–'09, stór eldri íbúð (≥ 90 m², byggt ≤ 1984), selt ófullbúið fjölbýli
- **C** nýrra sérbýli (2010+), lítil eldri íbúð (< 90 m², byggt ≤ 1984)
- **D** fjölbýli '85–'99
- **E** fjölbýli 2000+, nýbygging, byggingarár óskráð
- **F** ónothæfur samningur, ekki íbúðarhúsnæði, verktakakaup, heil bygging, geymsla

Röðun innan útgáfu: stig = grunnstig einkunnar (A 100, B 80, C 60) mínus 0,3 stig fyrir hvern dag frá áætlaðri
afhendingu, svo nýfluttir fá forgang. Eign dettur út 150 dögum eftir áætlaða afhendingu.

## Notkun

```bash
# Vikuleg útgáfa (laugardagur): prufukeyrsla fyrst, svo --commit þegar listinn fer til Póstdreifingar
python3 heimsent.py run --count 150 --date 2026-10-03
python3 heimsent.py run --count 150 --date 2026-10-03 --commit

# Hvað verður tilbúið næstu vikur, staða biðraðar
python3 heimsent.py preview
python3 heimsent.py status

# Daglegur póstur: ný kaup síðan síðast með einkunn og áætlaðri afhendingu
python3 heimsent.py daily

# Akureyri
python3 heimsent.py run --region akureyri --count 40 --date 2026-10-03
```

Úttak fer í `out/`:

- `utgafa_DAGS.csv` og `.xlsx` – listinn fyrir Póstdreifingu (Nafn, Heimilisfang með íbúð, Póstnúmer, Staður, …)
- `utgafa_DAGS_samantekt.txt` – fjöldi eftir einkunn, hvað verður tilbúið næstu vikur, hverju var sleppt og af hverju
- `mat_DAGS.csv` (með `--debug-csv`) – mat á öllum eignum síðustu 14 mánaða með stöðu og ástæðu

Staða er í `state/`:

- `sent.json` – allt sem hefur verið sent (fastanúmer, dagsetning, heimilisfang). **Ekki eyða.**
- `seen.json` – hvað daglegi pósturinn hefur séð
- `kaupskra.csv` – eintak af kaupskrá, endurnýjað sjálfkrafa eftir 20 klst

## Stillingar

Allar reglur eru efst í `heimsent.py` í `CFG` og má yfirskrifa á skipanalínu:

```bash
python3 heimsent.py run --count 75 --delivery-days 84 --max-days-after-delivery 120
python3 heimsent.py run --count 75 --include-new-builds true     # fullbúnar nýbyggingar fá C
python3 heimsent.py run --count 75 --send-grades AB               # bara A og B
```

## Tenging við daglegu/vikulegu verkefnin

Verkefnið sem sendi „Nýtt Heimili“ og „Heimsent ÚTGÁFA“ póstana á að keyra þessar skipanir í staðinn og senda
`out/utgafa_DAGS.csv` (eða `.xlsx`) og samantektina með póstinum. Kaupskráin er sótt sjálfkrafa frá HMS.
