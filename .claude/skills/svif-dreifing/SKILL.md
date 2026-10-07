---
name: svif-dreifing
description: SVIF bæklingadreifing til nýrra húseigenda (Nýtt Heimili / Heimsent). Kóðinn og stöðuskrárnar eru EKKI í þessu repo-i heldur í helgithorvalds-sketch/lead-gen-cloud (nytt-heimili/). Nota þegar Helgi nefnir bæklinga, Póstdreifingu, Harald, heimilisföng, íbúðanúmer, útgáfu vikunnar, kvótann (75–76 á viku), kaupskrá HMS, biðröðina eða vill senda út/laga lista.
---

# SVIF-dreifing — byrjaðu hér

1. Tengdu repo-ið: `mcp__claude-code-remote__add_repo` → owner `helgithorvalds-sketch`,
   repo `lead-gen-cloud`, access `push`; klónaðu í `/home/user/lead-gen-cloud` og kallaðu
   `register_repo_root`.
2. Lestu og fylgdu `/home/user/lead-gen-cloud/.claude/skills/baeklingar/SKILL.md` —
   það er handbókin (ferli, reglur, skrár, workflow-verkefni, mánudagsathugun).

## Það sem má aldrei klikka

- **Ekkert fer til Haralds nema Helgi sendi það sjálfur.** Allt til Póstdreifingar
  verður fyrst DRÖG í Gmail (kerfið: IMAP-drög á mánudögum; lota: `create_draft`) —
  aldrei `send_message` á haraldurb@postdreifing.is.
- Fjölbýli fer ALDREI til Póstdreifingar án íbúðarnúmers („Hraunbær 158, íbúð 0301").
  Númerið er í FEPILOG-dálki kaupskrár HMS og `nytt-heimili/ibudir.py` setur það á.
- Listinn verður að vera læsilegur: Excel + PDF fylgja alltaf CSV-skránni
  (`nytt-heimili/utflutningur.py`), pósttextinn er númeraður listi.
- Hús sem er selt ófullbúið/óbyggt (FULLBUID=0) bíður ~7 mánuði í biðröðinni;
  fullgerð nýbygging ~6 vikur. Daglegi pósturinn merkir þau ⏳.
- Vikulegi listinn (~76) verður til sjálfkrafa á mánudögum í GitHub Actions
  (`nytt-heimili.yml`) og lendir í Drögum hjá Helga; hann sendir, Haraldur dreifir á laugardegi.
- Þetta skýjaumhverfi kemst ekki á HMS — allt sem þarf kaupskrána keyrir sem
  `workflow_dispatch` (`verkefni`: `utgafa_prufa` / `utgafa` / `laga_ibudir`) eða í
  Higgsfield-sandkassanum.

## Tengiliðir

- Póstdreifing: Haraldur Björnsson, haraldurb@postdreifing.is, s. 585 8303. Reikningur
  eftir hverja dreifingu, greiðist innan vikunnar.
- Helgi: helgithorvalds@gmail.com, SVIF, s. 853 5147.
