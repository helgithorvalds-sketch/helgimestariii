# SVIF fyrir fyrirtæki: póstlisti og kynningarpóstur

Listi yfir íslensk fyrirtæki sem selja nýjum fyrirtækjum þjónustu (bókhald, lögfræði, auglýsingar, vefur,
tryggingar, tölvur, fjarskipti, prentun, húsnæði, ráðgjöf o.s.frv.), með netfangi réttrar manneskju hjá hverju
þeirra, og pósturinn sem er sendur þeim til að kynna bæklinginn og myndbandið.

| Skrá | Hvað |
|---|---|
| `postlisti.csv` / `postlisti.xlsx` | Listinn sjálfur: fyrirtæki, flokkur, vefur, netfang, tengiliður, titill, hvernig netfangið var staðfest, kveðja, og dálkar fyrir sendingu og svör |
| `postur.md` | Pósturinn (texti, efnislína, breytur) |
| `scripts/registries.py` | Sækir lögmenn (lmfi.is) og löggilta endurskoðendur (fle.is) úr opinberum félagatölum |
| `scripts/build_list.py` | Sameinar félagatölin og flokkaleitina í einn fyrirtækjalista |
| `scripts/contacts.py` | Les vef hvers fyrirtækis (forsíðu, starfsfólk, um okkur, hafa samband), finnur netföng og titla, velur markaðsstjóra > framkvæmdastjóra/eiganda > sölustjóra > almennt netfang, staðfestir MX-færslu |
| `scripts/render.mjs` | Teiknar síður í Chromium fyrir vefi sem sýna netföng aðeins með JavaScript |
| `scripts/finalize_list.py` | Velur endanlegt netfang, setur inn kveðju og orðalag eftir flokki, býr til `postlisti.csv` |
| `scripts/greeting.py` | „Sæll Jón,“ / „Sæl Anna,“ / „Góðan daginn,“ eftir nafni |

## Hvernig netföngin voru fundin og staðfest

- Öll netföng koma annaðhvort af vef fyrirtækisins sjálfs (slóðin er skráð í dálknum `stadfesting`) eða úr
  opinberu félagatali (Lögmannafélag Íslands, Félag löggiltra endurskoðenda). Ekkert netfang er giskað.
- Lén hvers netfangs er flett upp (MX-færsla) til að staðfesta að það taki við pósti. Ekki var hægt að
  staðfesta einstök pósthólf með SMTP héðan.
- ja.is, 1819.is og keldan.is voru ekki notuð (lokuð fyrir sjálfvirkum lestri). Vefir sem hafna sjálfvirkum
  lestri eru merktir í `athugasemd` og þarf að fletta upp handvirkt.

## Sending

Einn póstur á fyrirtæki, sendur úr Gmail Helga, einn í einu og í lotum (sjá `postur.md`). Gmail leyfir
500 pósta á dag á venjulegum reikningi; til að halda orðspori reikningsins er mælt með 100–150 á dag.
