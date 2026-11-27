# Gísla saga ep. 1 (Version A) - sound timeline. Every anchor is the START of a Whisper word in
# public/gisla/timeline.json (absolute seconds in the 80 s narration), as listed in ep01/atburdir.md.
# Every sound effect starts on its anchor word; the score's bar grid is locked to "Noregi" (bar 1) at 96 bpm.
import json
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TL_PATH = os.path.join(ROOT, "public", "gisla", "timeline.json")
VOICE_PATH = os.path.join(ROOT, "public", "gisla", "voice_master.wav")

FPS = 30
DUR = 80.0
TL = json.load(open(TL_PATH, encoding="utf-8"))
WORDS = TL["words"]
BLOCKS = TL["blocks"]


def _n(s):
    s = unicodedata.normalize("NFC", s).lower()
    return re.sub(r"[^\wáéíóúýþæöð]", "", s)


def W(block, word, nth=0):
    """start time of the nth Whisper word in `block` whose normalised text starts with `word`"""
    hits = [w for w in WORDS if w["block"] == block and _n(w["w"]).startswith(_n(word))]
    if len(hits) <= nth:
        raise KeyError((block, word))
    return float(hits[nth]["s"])


def WE(block, word, nth=0):
    hits = [w for w in WORDS if w["block"] == block and _n(w["w"]).startswith(_n(word))]
    return float(hits[nth]["e"])


# ---------------------------------------------------------------- anchors (atburdir.md "Sound" column)
A = {
    "mysu": W(1, "mysu"), "gisli1": W(1, "gísli"), "noregi": W(1, "noregi"),
    "pabba": W(2, "pabba"), "thordisi": W(2, "þórdísi"), "thorkeli": W(2, "þorkeli"), "bardur": W(2, "bárður"),
    "drepur": W(2, "drepur"),
    "fussi": W(3, "fússi"), "skeggja": W(3, "hólmgöngu"), "trestyttur": W(3, "tréstyttur"),
    "montar": W(4, "montar"), "heggur": W(4, "heggur"), "trefaeti": W(4, "tréfæti"),
    "nott": W(5, "nótt"), "sextiu": W(5, "sextíu"), "kveikja": W(5, "kveikja"), "sefur": W(5, "sefur"),
    "kerin": W(6, "kerin"), "eldinn": W(6, "eldinn"), "sinni": W(6, "sinni"), "thrisvar": W(6, "þrisvar"),
    "brjota": W(7, "brjóta"), "sleppa": W(7, "sleppa"), "sur": W(7, "súr,"), "sursson": W(7, "súrsson"),
    "sigla": W(8, "sigla"), "islands": W(8, "íslands"), "fostbr": W(8, "fóstbræðralag"), "kippir": W(8, "kippir"),
}
END_CARD = 78.5          # frame 2355: freeze + "Framhald..." -> single low boom
BLOCK_START = {b["block"]: float(b["start"]) for b in BLOCKS}
BLOCK_END = {b["block"]: float(b["start"]) + float(b["dur"]) for b in BLOCKS}

# ---------------------------------------------------------------- music grid: 96 bpm, bar 1 downbeat on "Noregi"
Q = 0.625                # quarter note (s)
BAR = 4 * Q              # 2.5 s
T0 = A["noregi"]         # bar 1 = 8.665; bar 25 = 68.665 lands on "Súrsson" (68.655)


def bar(b, beat=0.0):
    return T0 + (b - 1) * BAR + beat * Q


def fr(t):
    return t * FPS


def speech_words():
    return [(float(w["s"]), float(w["e"])) for w in WORDS]
