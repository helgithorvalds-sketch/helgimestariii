#!/usr/bin/env python3
"""Checks a chapter script (handrit) before its voice is generated.

Usage: handrit_check.py <md>...  -> prints each file's errors (or OK and its word count); exit 1 on any error.

File format, headings in this order:
    # Kafli NN – <titill>
    ## Staðreyndir og heimildir   one bullet per fact: "<fact> — <https://…>"
    ## Handrit                    table | Taktur | Lína |
    ## Skotlisti                  table | # | Á skjá | Persóna – tilfinning | Yfirlag |
    ## Raddtexti                  the exact voice copy ([audio tags] allowed)
"""
import re
import sys

SECTIONS = ["Staðreyndir og heimildir", "Handrit", "Skotlisti", "Raddtexti"]
BEATS = ["Krókur", "Sögusvið", "Stigmögnun", "Spurningin", "Vendipunktur", "Afleiðing", "Bakhlaup"]
ABBREVIATIONS = ["t.d.", "o.s.frv.", "þ.e.", "km", "m.", "°C", "%", "ca.", "u.þ.b."]
SKOTLISTI_COLS = ["#", "Á skjá", "Persóna – tilfinning", "Yfirlag"]
MIN_WORDS, MAX_WORDS = 150, 230  # 60–90 s at the measured 2.56 words/s
WORDS_PER_S = 2.56

TITLE = re.compile(r"^# Kafli \d{2} – \S.*$")
TAG = re.compile(r"\[[^\]]*\]")
URL = re.compile(r"https?://\S+")


def _abbr_pattern(a: str) -> re.Pattern:
    """A listed abbreviation as a word of its own ('m.' must not match the end of 'straum.')."""
    left = r"(?<!\w)" if a[0].isalnum() else ""
    right = r"(?!\w)" if a[-1].isalnum() else ""
    return re.compile(left + re.escape(a) + right, re.IGNORECASE)


ABBR_PATTERNS = [(a, _abbr_pattern(a)) for a in ABBREVIATIONS]


def _sections(text: str) -> tuple[list[str], dict[str, str]]:
    """Level-2 headings in file order, and each one's body (up to the next level-2 heading)."""
    order, body, cur = [], {}, None
    for line in text.splitlines():
        if line.startswith("## "):
            cur = line[3:].strip()
            order.append(cur)
            body[cur] = ""
        elif cur is not None:
            body[cur] += line + "\n"
    return order, body


def _first_table(body: str) -> list[list[str]]:
    """Rows (header first, separator dropped) of the first Markdown table in a section."""
    rows, started = [], False
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("|"):
            started = True
            cells = [c.strip() for c in s.strip("|").split("|")]
            if not all(re.fullmatch(r":?-+:?", c) for c in cells):
                rows.append(cells)
        elif started:
            break
    return rows


def word_count(voice: str) -> int:
    """Spoken words: [tags] removed, tokens without a letter or digit (–, ...) not counted."""
    return sum(1 for tok in TAG.sub(" ", voice).split() if re.search(r"\w", tok))


def raddtexti(path: str) -> str:
    """The Raddtexti section's text, stripped: exactly what the voice engine reads."""
    with open(path, encoding="utf-8") as f:
        _, body = _sections(f.read())
    return body.get("Raddtexti", "").strip()


def check(path: str) -> list[str]:
    """Icelandic error messages for the script at path; empty when it is OK."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    errs: list[str] = []

    first = next((l for l in text.splitlines() if l.strip()), "")
    if not TITLE.match(first):
        errs.append("Fyrsta lína á að vera „# Kafli NN – titill“.")

    order, body = _sections(text)
    for s in SECTIONS:
        if s not in body:
            errs.append(f"Hluta vantar: „## {s}“.")
    found = [s for s in order if s in SECTIONS]
    if found != [s for s in SECTIONS if s in found]:
        errs.append("Hlutarnir eru í rangri röð; röðin á að vera: " + ", ".join(SECTIONS) + ".")

    if "Staðreyndir og heimildir" in body:
        facts = [l.strip() for l in body["Staðreyndir og heimildir"].splitlines() if l.strip().startswith("- ")]
        if not facts:
            errs.append("Engar staðreyndir: hver staðreynd er punktur með heimild (slóð).")
        for fact in facts:
            if not URL.search(fact):
                errs.append(f"Staðreynd án heimildar (vantar slóð): {fact[2:]}")

    if "Handrit" in body:
        rows = _first_table(body["Handrit"])
        if not rows or rows[0][:2] != ["Taktur", "Lína"]:
            errs.append("Handrit vantar töfluna | Taktur | Lína |.")
        else:
            beats = [r[0].strip("* ") for r in rows[1:]]
            for b in BEATS:
                if not any(x.startswith(b) for x in beats):
                    errs.append(f"Taktur vantar í Handrit: {b}.")

    if "Skotlisti" in body:
        rows = _first_table(body["Skotlisti"])
        if len(rows) < 2 or rows[0][:4] != SKOTLISTI_COLS:
            errs.append("Skotlisti vantar töfluna | " + " | ".join(SKOTLISTI_COLS) + " | með minnst einni línu.")

    if "Raddtexti" in body:
        voice = TAG.sub(" ", raddtexti(path))
        digits = re.findall(r"\S*\d\S*", voice)
        if digits:
            errs.append("Raddtexti má ekki innihalda tölustafi (skrifaðu tölur með orðum): " + ", ".join(digits))
        abbrs = [a for a, p in ABBR_PATTERNS if p.search(voice)]
        if abbrs:
            errs.append("Raddtexti má ekki innihalda skammstöfun (skrifaðu fullum stöfum): " + ", ".join(abbrs))
        n = word_count(voice)
        if not MIN_WORDS <= n <= MAX_WORDS:
            errs.append(f"Raddtexti: orðafjöldi {n} er utan marka {MIN_WORDS}–{MAX_WORDS} (60–90 s).")
    return errs


def main(argv: list[str]) -> int:
    bad = False
    for p in argv:
        errs = check(p)
        if errs:
            bad = True
            for e in errs:
                print(f"{p}: {e}")
        else:
            n = word_count(raddtexti(p))
            print(f"{p}: OK – {n} orð, um {n / WORDS_PER_S:.0f} s")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
