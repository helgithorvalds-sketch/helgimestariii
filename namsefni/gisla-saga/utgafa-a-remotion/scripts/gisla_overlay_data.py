# Builds src/videos/gisla/overlay/data.ts for the GislaOverlay composition (Gísla saga ep. 1, Version A).
#  - aligns the AUTHORED text (timeline.json blocks[].text) to Whisper's word times (words[]) character by character,
#    so spelling differences (sínir/synir), merges (Innistanda) and splits (Hólmgöngu / -Skeggja) all resolve;
#  - chunks the captions into 1-3 word groups (DP over phrase rules, <= 16 chars unless one word);
#  - measures every caption / card string with the real font (Atkinson Hyperlegible Next @ wght 800/700)
#    so the TSX can fit long single words inside the safe zone;
#  - schedules the name cards (max two on screen, two slots) and the block-6 counter stamps.
# Run: python -I scripts/gisla_overlay_data.py   (needs fontTools; uses the scratchpad venv)
import json
import os
import re
import sys
import unicodedata
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TL = os.path.join(ROOT, "public", "gisla", "timeline.json")
FONT = os.path.join(ROOT, "public", "gisla", "overlay", "AtkinsonHyperlegibleNext-var.woff2")
OUT = os.path.join(ROOT, "src", "videos", "gisla", "overlay", "data.ts")
FPS = 30

CAP_PX = 84            # caption font size at 1080 wide
CAP_MAXW = 780         # max caption width (px) before the line is scaled down (centre 530 -> 140..920, safe zone ends at 950)
NAME_PX = 58
LS = 0.5               # caption letter-spacing (px), must match Captions.tsx
ROLE_PX = 32

# ---------------------------------------------------------------- cast (serian.md)
CAST = {
    "gisli": dict(name="Gísli", color="#2E6FD8", role="hetjan"),
    "thorbjorn": dict(name="Þorbjörn", color="#8A8F98", role="pabbi"),
    "thordis": dict(name="Þórdís", color="#8E4FC2", role="systir Gísla"),
    "thorkell": dict(name="Þorkell", color="#E8962E", role="bróðir Gísla"),
    "bardur": dict(name="Bárður", color="#E8C930", role="nágranni"),
    "skeggi": dict(name="Hólmgöngu-Skeggi", color="#7A4A2A", role="einvígismaður"),
}
# caption words that are a character name (normalised, no punctuation) -> cast id
NAMEWORDS = {
    "gísli": "gisli", "gísla": "gisli", "súrsson": "gisli",
    "pabba": "thorbjorn", "pabbinn": "thorbjorn", "þorbjörn": "thorbjorn",
    "þórdísi": "thordis", "þórdís": "thordis",
    "þorkeli": "thorkell", "þorkell": "thorkell",
    "bárður": "bardur", "bárðar": "bardur",
    "hólmgöngu-skeggja": "skeggi", "skeggi": "skeggi", "skeggja": "skeggi",
}

FUNC = {"á", "í", "af", "til", "með", "við", "að", "og", "en", "sem", "um", "er", "þar", "þegar", "svo", "eftir",
        "upp", "frá", "ekki", "einu", "þau", "hans", "sín", "sig", "sér", "var", "fer", "tvö", "heldur", "þetta",
        "ætla", "honum", "okkar", "koma", "lætur", "býr"}
STARTERS = {"og", "en", "sem", "svo", "þegar", "þar", "heldur", "síðan"}
KEEP_TOGETHER = [("Þorbjörn", "súr,"), ("Gísli", "Súrsson."), ("súrri", "mysu."), ("súrri", "mysu,"), ("miðja", "nótt"),
                 ("sextíu", "menn"), ("fjórir", "menn"), ("tvö", "ker"), ("ekki", "einu"), ("einu", "sinni"),
                 ("hetjan", "okkar"), ("frægasti", "útlagi"), ("bænum", "Stokkum")]


def norm(s):
    s = unicodedata.normalize("NFC", s).lower()
    return re.sub(r"[^\wáéíóúýþæöð]", "", s).replace("_", "")


def core(w):
    return re.sub(r"[^\w\-áéíóúýþæöðÁÉÍÓÚÝÞÆÖÐ]", "", w).lower()


# ---------------------------------------------------------------- alignment
def align_block(text, words):
    toks = text.split()
    A = "".join(norm(t) for t in toks)
    B = ""
    owner = []                      # per char of B: (word index, pos in word, word len)
    for wi, w in enumerate(words):
        n = norm(w["w"])
        for k in range(len(n)):
            owner.append((wi, k, len(n)))
        B += n

    def tchar(j, end=False):
        wi, k, L = owner[j]
        w = words[wi]
        return w["s"] + (w["e"] - w["s"]) * ((k + (1 if end else 0)) / L)

    # char map A -> B
    amap = [None] * len(A)
    if len(A) == len(B):
        amap = list(range(len(A)))
    else:
        sm = SequenceMatcher(None, A, B, autojunk=False)
        for a, b, size in sm.get_matching_blocks():
            for k in range(size):
                amap[a + k] = b + k
        known = [i for i, v in enumerate(amap) if v is not None]
        for i in range(len(A)):
            if amap[i] is None:
                lo = max([k for k in known if k < i], default=None)
                hi = min([k for k in known if k > i], default=None)
                if lo is None:
                    amap[i] = amap[hi]
                elif hi is None:
                    amap[i] = amap[lo]
                else:
                    amap[i] = round(amap[lo] + (amap[hi] - amap[lo]) * (i - lo) / (hi - lo))
    out = []
    pos = 0
    for t in toks:
        n = len(norm(t))
        a, b = pos, pos + n - 1
        out.append(dict(text=t, s=round(tchar(amap[a]), 3), e=round(tchar(amap[b], True), 3)))
        pos += n
    return out


# ---------------------------------------------------------------- font metrics
def font_measure():
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont
    base = TTFont(FONT)
    inst = {}
    for wg in (700, 800):
        f = instantiateVariableFont(TTFont(FONT), {"wght": wg})
        inst[wg] = (f.getBestCmap(), f["hmtx"], f["head"].unitsPerEm)

    def width(s, px, wg=800):
        cm, hm, upm = inst[wg]
        tot = 0
        for ch in s:
            g = cm.get(ord(ch))
            if g is None:
                raise SystemExit(f"missing glyph {ch!r}")
            tot += hm[g][0]
        return tot / upm * px
    return width


# ---------------------------------------------------------------- chunking
def is_punct_end(w):
    return bool(re.search(r"[,.;:!?…]$", w))


def chunk_block(ws):
    n = len(ws)
    INF = 1e9
    best = [INF] * (n + 1)
    back = [0] * (n + 1)
    best[0] = 0

    def cost(i, j):          # words i..j-1
        grp = ws[i:j]
        k = len(grp)
        txt = " ".join(w["text"] for w in grp)
        if k > 3:
            return INF
        if k > 1 and len(txt) > 16:
            return INF
        for a in range(k - 1):
            if is_punct_end(grp[a]["text"]):
                return INF
            if grp[a + 1]["s"] - grp[a]["e"] > 0.35:
                return INF
        c = 1.0
        last = grp[-1]["text"]
        if not is_punct_end(last) and core(last) in FUNC and j < n:
            c += 2.0
        if k == 1 and len(core(last)) <= 4:
            c += 1.6
        dur = grp[-1]["e"] - grp[0]["s"]
        if dur < 0.45:
            c += 1.0
        if dur > 1.6:
            c += 0.6
        if k == 3:
            c += 0.35
        if j < n:
            nxt = ws[j]["text"]
            if (last, nxt) in KEEP_TOGETHER:
                c += 3.0
            if core(nxt) in STARTERS or is_punct_end(last):
                c -= 0.3
        if i > 0 and (ws[i - 1]["text"], grp[0]["text"]) in KEEP_TOGETHER:
            c += 0.0  # counted once above
        return c

    for j in range(1, n + 1):
        for i in range(max(0, j - 3), j):
            v = best[i] + cost(i, j)
            if v < best[j]:
                best[j], back[j] = v, i
    out = []
    j = n
    while j > 0:
        i = back[j]
        out.append((i, j))
        j = i
    return out[::-1]


def lum(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def mix(hexc, other, t):
    a = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(a, b))


def lifted(hexc, minlum=0.2):
    """same hue, lifted toward white until it reads on a near-black outline (contrast >= ~5:1)"""
    t = 0.0
    c = hexc
    while lum(c) < minlum and t < 0.8:
        t += 0.02
        c = mix(hexc, "#FFFFFF", t)
    return c


def main():
    tl = json.load(open(TL, encoding="utf-8"))
    width = font_measure()
    blocks = tl["blocks"]
    allw = []
    chunks = []
    for b in blocks:
        bw = [w for w in tl["words"] if w["block"] == b["block"]]
        al = align_block(b["text"], bw)
        prev = None
        for k, w in enumerate(al):
            c = core(w["text"])
            cid = NAMEWORDS.get(c)
            if c == "súr" and prev == "þorbjörn":
                cid = "thorbjorn"
            if c == "súrsson" and prev != "gísli":
                cid = None
            w["cast"] = cid
            w["block"] = b["block"]
            prev = c
        allw += al
        for (i, j) in chunk_block(al):
            grp = al[i:j]
            chunks.append(dict(block=b["block"], words=grp))

    # chunk timing: show from first word start (1 frame lead) to next chunk start (hard swap) or last word end + hold
    for k, c in enumerate(chunks):
        s0 = c["words"][0]["s"]
        e0 = c["words"][-1]["e"]
        f0 = int(round(s0 * FPS)) - 1
        nxt = chunks[k + 1]["words"][0]["s"] if k + 1 < len(chunks) else None
        if nxt is not None and nxt - e0 < 0.7:
            f1 = int(round(nxt * FPS)) - 1
        else:
            f1 = int(round((e0 + 0.45) * FPS))
            if nxt is not None:
                f1 = min(f1, int(round(nxt * FPS)) - 2)
        c["from"], c["to"] = f0, max(f1, f0 + 8)
        if nxt is not None:
            c["to"] = min(c["to"], int(round(nxt * FPS)) - 1)
        txt = " ".join(w["text"] for w in c["words"])
        c["text"] = txt
        wpx = width(txt, CAP_PX)
        c["w"] = round(wpx, 1)
        # x offset (from the chunk's left edge) and width of every word, for the name underline bars
        x = 0.0
        for i, w in enumerate(c["words"]):
            ww = width(w["text"].rstrip(",.;:!?…"), CAP_PX) + LS * len(w["text"].rstrip(",.;:!?…"))
            w["x"], w["ww"] = round(x, 1), round(ww, 1)
            x += width(w["text"] + (" " if i < len(c["words"]) - 1 else ""), CAP_PX) + LS * (len(w["text"]) + 1)
        c["w"] = round(x, 1)
        c["scale"] = round(min(1.0, CAP_MAXW / c["w"]), 4)
    for k in range(len(chunks) - 1):
        assert chunks[k]["to"] <= chunks[k + 1]["from"], (chunks[k]["text"], chunks[k + 1]["text"])

    # ---------------- name cards
    def wt(block, word_core, nth=0):
        hits = [w for w in allw if w["block"] == block and core(w["text"]) == word_core]
        return hits[nth]["s"]

    HOLD = 75                     # 2.5 s
    IN = 6                        # slide/pop frames; lands 1 frame before the word
    cards = []

    def card(cid, t_word, name=None, upd=None):
        f = int(round(t_word * FPS))
        d = dict(id=cid, name=name or CAST[cid]["name"], role=CAST[cid]["role"], color=CAST[cid]["color"],
                 inFrom=f - IN - 1, land=f - 1, out=f - 1 + HOLD)
        if upd:
            suf, t_upd = upd
            fu = int(round(t_upd * FPS))
            d["suffix"] = suf
            d["suffixLand"] = fu - 1
            d["out"] = fu - 1 + HOLD
        cards.append(d)

    card("gisli", wt(1, "gísli"))
    card("thorbjorn", wt(2, "pabba"))
    card("thordis", wt(2, "þórdísi"))
    card("thorkell", wt(2, "þorkeli"))
    card("bardur", wt(2, "bárður"))
    card("skeggi", wt(3, "hólmgöngu-skeggja"))
    card("thorbjorn", wt(7, "þorbjörn"), "Þorbjörn", ("SÚR", wt(7, "súr")))
    card("gisli", wt(7, "gísli"), "Gísli", ("SÚRSSON", wt(7, "súrsson")))

    # slots: max two cards; a new card takes a free slot, else the oldest leaves just before it lands
    OUTF = 6
    slots = [None, None]
    for c in cards:
        free = [i for i in (0, 1) if slots[i] is None or slots[i]["out"] + OUTF <= c["inFrom"]]
        if free:
            s = free[0]
        else:
            s = min((0, 1), key=lambda i: slots[i]["out"])
            slots[s]["out"] = c["inFrom"] - OUTF
        c["slot"] = s
        slots[s] = c
    for c in cards:
        c["nameW"] = round(width(c["name"], NAME_PX, 800) + (width(" " + c.get("suffix", ""), NAME_PX, 800) if c.get("suffix") else 0), 1)
        c["baseNameW"] = round(width(c["name"], NAME_PX, 800), 1)
        c["roleW"] = round(width(c["role"], ROLE_PX, 700), 1)
        c["textColor"] = lifted(c["color"], 0.32)          # role line on the dark plate
        c["sufColor"] = lifted(c["color"], 0.45)           # the new nickname stamp (SÚR / SÚRSSON)
    # a slot-1 card moves up into slot 0 once slot 0 empties (and nothing else wants slot 0 before it leaves)
    for c in cards:
        if c["slot"] != 1:
            continue
        top = [o for o in cards if o["slot"] == 0 and o["inFrom"] < c["inFrom"] < o["out"] + OUTF]
        if not top:
            continue
        free_at = max(o["out"] + OUTF for o in top)
        if "suffixLand" in c:
            free_at = max(free_at, c["suffixLand"] + 10)     # never move while the nickname stamps on
        clash = [o for o in cards if o["slot"] == 0 and free_at <= o["inFrom"] < c["out"]]
        if not clash and free_at < c["out"] - 12:
            c["promote"] = free_at

    # ---------------- block-6 counter
    stamps = []
    for k, (wc, nth) in enumerate([("eldinn", 0), ("sinni", 0), ("þrisvar", 0)]):
        f = int(round(wt(6, wc) * FPS))
        stamps.append(dict(n=k + 1, land=f - 1, word=wc))
    stampEnd = int(round((wt(6, "þrisvar") + 1.7) * FPS))

    # caption fill per character: own hue, lifted so it reads on the near-black outline (grey needs more lift to read as "lit")
    capl = lambda k, c, m: lifted(c, m + (0.1 if k == "thorbjorn" else 0.0))
    castText = {k: dict(color=v["color"], text=capl(k, v["color"], 0.32), dim=mix(capl(k, v["color"], 0.25), "#000000", 0.12))
                for k, v in CAST.items()}

    # ---------------- write
    lines = ["// GENERATED by scripts/gisla_overlay_data.py from public/gisla/timeline.json - do not edit by hand.",
             "// Captions use the AUTHORED text (blocks[].text) aligned char-by-char onto Whisper's word times.",
             "/* eslint-disable */",
             f"export const CAP_PX = {CAP_PX};",
             f"export const NAME_PX = {NAME_PX};",
             f"export const ROLE_PX = {ROLE_PX};",
             "export type CastId = " + " | ".join(f'"{k}"' for k in CAST) + ";",
             "export type Word = {text: string; s: number; e: number; cast: CastId | null; x: number; ww: number};",
             "export type Chunk = {block: number; from: number; to: number; text: string; w: number; scale: number; words: Word[]};",
             "export type Card = {id: CastId; name: string; role: string; color: string; textColor: string; sufColor: string; inFrom: number;"
             " land: number; out: number; slot: number; promote?: number; nameW: number; baseNameW: number; roleW: number; suffix?: string;"
             " suffixLand?: number};",
             "export type Stamp = {n: number; land: number; word: string};",
             "export const CAST: Record<CastId, {color: string; text: string; dim: string}> = " + json.dumps(castText, ensure_ascii=False) + ";",
             ]
    cj = []
    for c in chunks:
        cj.append(dict(block=c["block"], **{"from": c["from"]}, to=c["to"], text=c["text"], w=c["w"], scale=c["scale"],
                       words=[dict(text=w["text"], s=w["s"], e=w["e"], cast=w["cast"], x=w["x"], ww=w["ww"]) for w in c["words"]]))
    lines.append("export const CHUNKS: Chunk[] = " + json.dumps(cj, ensure_ascii=False) + ";")
    keys = ["id", "name", "role", "color", "textColor", "sufColor", "inFrom", "land", "out", "slot", "promote", "nameW", "baseNameW", "roleW",
            "suffix", "suffixLand"]
    lines.append("export const CARDS: Card[] = " + json.dumps([{k: c[k] for k in keys if k in c} for c in cards], ensure_ascii=False) + ";")
    lines.append("export const STAMPS: Stamp[] = " + json.dumps(stamps, ensure_ascii=False) + ";")
    lines.append(f"export const STAMP_END = {stampEnd};")
    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")

    # report
    for c in chunks:
        print(f"B{c['block']} f{c['from']:5d}-{c['to']:5d}  {c['text']:<22} w={c['w']:6.1f} sc={c['scale']:.2f}  " +
              " ".join(f"{w['text']}@{w['s']:.2f}" + (f"[{w['cast']}]" if w['cast'] else "") for w in c["words"]))
    for c in cards:
        print("card", c["id"], c["name"], c.get("suffix", ""), "slot", c["slot"], "in", c["inFrom"], "land", c["land"],
              "upd", c.get("suffixLand"), "out", c["out"], "promote", c.get("promote"), "nameW", c["nameW"], "text", c["textColor"])
    print("stamps", stamps, "end", stampEnd)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
