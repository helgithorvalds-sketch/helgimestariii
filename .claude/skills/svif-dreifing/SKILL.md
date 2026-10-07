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

- Fjölbýli fer ALDREI til Póstdreifingar án íbúðarnúmers („Hraunbær 158, íbúð 0301").
  Númerið er í FEPILOG-dálki kaupskrár HMS og `nytt-heimili/ibudir.py` setur það á.
- Vikulegi listinn (~76) fer sjálfkrafa á mánudögum til haraldurb@postdreifing.is úr
  GitHub Actions (`nytt-heimili.yml`), Helgi í cc. Dreift á laugardegi.
- Þetta skýjaumhverfi kemst ekki á HMS — allt sem þarf kaupskrána keyrir sem
  `workflow_dispatch` (`verkefni`: `utgafa_prufa` / `utgafa` / `laga_ibudir`) eða í
  Higgsfield-sandkassanum.

## Tengiliðir

- Póstdreifing: Haraldur Björnsson, haraldurb@postdreifing.is, s. 585 8303. Reikningur
  eftir hverja dreifingu, greiðist innan vikunnar.
- Helgi: helgithorvalds@gmail.com, SVIF, s. 853 5147.
