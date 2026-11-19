"""Step 4 of the formula: run every sentence of the voice script through GreynirCorrect."""
import json, sys
from pathlib import Path
from reynir_correct import check_single

here = Path(__file__).parent
script = json.loads((here / "script.json").read_text())
out, flagged = [], 0
for s in script["sentences"]:
    sent = check_single(s["text"])
    anns = [f"{a.code}: {a.text}" + (f" -> {a.suggest}" if a.suggest else "") for a in sent.annotations] if sent else ["(gat ekki þáttað)"]
    flagged += bool(anns)
    out.append(f"{s['id']:>4}  {s['text']}" + "".join(f"\n        ! {a}" for a in anns))
report = "\n".join(out) + f"\n\n{flagged} af {len(script['sentences'])} setningum með athugasemd.\n"
(here / "qa" / "greynircorrect.txt").write_text(report)
print(report)
