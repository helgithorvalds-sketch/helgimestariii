---
name: svif-rutina-1
description: „SVIF rútína 1" — SVIF bæklingadreifing til nýrra húseigenda. 76 bestu húsin valin vikulega úr kaupskrá HMS (nýbyggingar með, ófullbúið bíður afhendingar), íbúðarnúmer á hverja fjölbýlisíbúð, listinn verður DRÖG í Gmail Helga til Póstdreifingar (Haraldur) sem CSV + Excel + PDF og Helgi sendir sjálfur. Kóðinn og stöðuskrárnar eru EKKI í þessu repo-i heldur í helgithorvalds-sketch/lead-gen-cloud (nytt-heimili/). Nota þegar Helgi nefnir SVIF rútínu 1, bæklinga, Póstdreifingu, Harald, heimilisföng, íbúðanúmer, útgáfu vikunnar, kvótann (76), nýbyggingar, kaupskrá HMS, biðröðina eða vill senda út/laga lista.
---

# SVIF rútína 1 — byrjaðu hér

1. Tengdu repo-ið: `mcp__claude-code-remote__add_repo` → owner `helgithorvalds-sketch`,
   repo `lead-gen-cloud`, access `push`; klónaðu í `/home/user/lead-gen-cloud` og kallaðu
   `register_repo_root`.
2. Lestu og fylgdu `/home/user/lead-gen-cloud/.claude/skills/svif-rutina-1/SKILL.md` —
   það er handbókin (reglurnar 1–13, ferlið, skrár, workflow-verkefni, mánudagsathugun).

## Reglurnar í stuttu máli (allt sem Helgi samdi um 7.10.2026)

1. **76 bestu húsin í viku hverri** (`VIKUKVOTI = 76`), stigahæstu fyrst: A > B > C > F
   (nýbygging) > D > E; G aldrei. Vanti framboð flyst afgangurinn yfir á næstu viku.
2. **Nýbyggingar og hús í byggingu eru með** — fyrirtækin í bæklingnum hjálpa fólki að
   byggja og innrétta.
3. **Ófullbúið/óbyggt hús bíður afhendingar:** FULLBUID=0 → ~7 mánuðir í biðröðinni
   (vinkona Helga fékk húsið 7 mánuðum eftir samning); fullgerð nýbygging ~6 vikur. Daglegi
   pósturinn merkir þau ⏳ með áætlaðri dagsetningu.
4. **Fjölbýli fer ALDREI til Póstdreifingar án íbúðarnúmers** („Hraunbær 158, íbúð 0301",
   úr FEPILOG-dálki kaupskrár, `nytt-heimili/ibudir.py`). Vanti númer bíður íbúðin;
   listi með galla stöðvar útgáfuna.
5. **Ekkert fer til Haralds nema Helgi sendi það sjálfur.** Allt til Póstdreifingar verður
   fyrst DRÖG í Gmail (kerfið: IMAP-drög á mánudögum; lota: `mcp__Gmail__create_draft`) —
   aldrei `send_message` á haraldurb@postdreifing.is.
6. **Listinn er læsilegur:** Excel + PDF fylgja alltaf CSV-skránni
   (`nytt-heimili/utflutningur.py`), pósttextinn er númeraður listi með íbúð og póstnúmeri.
7. **Ein íbúð einu sinni** (60 daga hvíld), **bókað fyrst, drög svo**, **aldrei tvær útgáfur
   sama dag**, **hlé** (`utgafa_hle_til`) stöðvar allt.
8. **Ein bein leið:** kaupskrá HMS → GitHub Actions (`nytt-heimili.yml`, „SVIF rútína 1")
   á mánudögum → drög í Gmail Helga → Helgi sendir → Haraldur dreifir á laugardegi.
   Mánudagsroutine í Claude með sama nafni staðfestir að drögin séu til og minnir Helga.
9. Þetta skýjaumhverfi kemst ekki á HMS — allt sem þarf kaupskrána keyrir sem
   workflow-verkefni (`nytt-heimili/keyra.txt` + push: `utgafa_prufa` / `utgafa` /
   `laga_ibudir` / `postdreifing_aftur` / `drog_prufa`) eða í Higgsfield-sandkassanum.
10. Allt handvirkt endar með commit + push á `main` í lead-gen-cloud (`git pull --ff-only` fyrst).

## Tengiliðir

- Póstdreifing: Haraldur Björnsson, haraldurb@postdreifing.is, s. 585 8303. Reikningur
  eftir hverja dreifingu, greiðist innan vikunnar.
- Helgi: helgithorvalds@gmail.com, SVIF, s. 853 5147.
