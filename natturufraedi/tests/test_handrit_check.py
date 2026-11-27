import pathlib
import re
import subprocess
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
CLI = str(ROOT / "tools" / "handrit_check.py")
FIX = ROOT / "tests" / "fixtures" / "handrit_good.md"
GOOD = FIX.read_text(encoding="utf-8")


def write(tmp_path, text):
    p = tmp_path / "kafli.md"
    p.write_text(text, encoding="utf-8")
    return str(p)


def append_voice(line):
    """Raddtexti is the last section, so appending puts the line in the voice copy."""
    return lambda t: t.rstrip("\n") + "\n" + line + "\n"


def drop_line(prefix):
    return lambda t: "".join(l for l in t.splitlines(keepends=True) if not l.startswith(prefix))


def voice_words(n):
    return lambda t: t.split("## Raddtexti")[0] + "## Raddtexti\n\n" + "orð " * n + "\n"


def fact_without_url(t):
    head = "## Staðreyndir og heimildir\n\n"
    return t.replace(head, head + "- Geysir er í Haukadal.\n")


def run(path):
    return subprocess.run([sys.executable, CLI, path], capture_output=True, text=True)


def test_good_fixture_is_clean():
    from handrit_check import check
    assert check(str(FIX)) == []


@pytest.mark.parametrize(
    "mutate, word",
    [
        (drop_line("## Skotlisti"), "Skotlisti"),
        (append_voice("Árið 1973 gaus hann."), "tölustaf"),
        (append_voice("Sápa, t.d. uppþvottalögur, virkar."), "skammstöfun"),
        (voice_words(120), "orðafjöldi"),
        (voice_words(240), "orðafjöldi"),
        (fact_without_url, "heimild"),
        (drop_line("| Bakhlaup"), "Bakhlaup"),
    ],
    ids=["no-skotlisti", "digit", "abbrev", "120-words", "240-words", "fact-no-url", "no-bakhlaup"],
)
def test_one_error_per_fault(tmp_path, mutate, word):
    from handrit_check import check
    bad = mutate(GOOD)
    assert bad != GOOD
    errs = check(write(tmp_path, bad))
    assert len(errs) == 1, errs
    assert word in errs[0]


@pytest.mark.parametrize(
    "abbr", ["t.d.", "o.s.frv.", "þ.e.", "km", "m.", "°C", "%", "ca.", "u.þ.b.", "kl.", "o.fl.", "skv.", "nr.", "ppm", "℃"]
)
def test_every_listed_abbreviation_is_caught(tmp_path, abbr):
    from handrit_check import check
    errs = check(write(tmp_path, append_voice(f"Hraunið fór hundrað {abbr} á dag.")(GOOD)))
    assert len(errs) == 1, errs
    assert "skammstöfun" in errs[0]


def test_subscript_digit_is_a_digit(tmp_path):
    from handrit_check import check
    errs = check(write(tmp_path, append_voice("Plöntur nota CO₂ og vatn.")(GOOD)))
    assert len(errs) == 1, errs
    assert "tölustaf" in errs[0]


def test_km_squared_is_digit_and_abbreviation(tmp_path):
    from handrit_check import check
    errs = check(write(tmp_path, append_voice("Eyjan stækkaði um tveir komma tveir km².")(GOOD)))
    assert len(errs) == 2, errs
    assert any("tölustaf" in e for e in errs)
    assert any("skammstöfun" in e and "km" in e for e in errs)


def test_ppm_is_an_abbreviation(tmp_path):
    from handrit_check import check
    errs = check(write(tmp_path, append_voice("Á skiltinu stendur fjögur hundruð og fimmtán ppm.")(GOOD)))
    assert len(errs) == 1, errs
    assert "skammstöfun" in errs[0] and "ppm" in errs[0]


def test_word_endings_are_not_abbreviations(tmp_path):
    """'m.' only as a word of its own: 'straum.' or 'BÚMM.' must pass."""
    from handrit_check import check
    assert check(write(tmp_path, append_voice("Hraunið rann í straum. BÚMM. Svo kom kakóið.")(GOOD))) == []


def test_tags_do_not_count_as_words():
    from handrit_check import word_count
    assert word_count("[excited] Ég sé [shouting] hraun... – BÚMM!") == 4


def test_raddtexti_is_the_voice_copy_stripped():
    from handrit_check import raddtexti
    text = raddtexti(str(FIX))
    first = re.search(r"## Raddtexti\n\n(.+)\n", GOOD).group(1)
    assert text.startswith(first)
    assert text == text.strip()
    assert "##" not in text and "|" not in text


def test_cli_exit_codes(tmp_path):
    assert run(str(FIX)).returncode == 0
    bad = write(tmp_path, drop_line("| Bakhlaup")(GOOD))
    r = run(bad)
    assert r.returncode == 1
    assert "Bakhlaup" in r.stdout
