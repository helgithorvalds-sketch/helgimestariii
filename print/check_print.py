#!/usr/bin/env python3
"""Athugar hvort PDF sé í prentupplausn og með blæði (bleed).

Fyrir hverja síðu er skráð:
  * stærð síðu (MediaBox) og TrimBox/BleedBox í mm
  * hver mynd á síðunni með raunverulegri upplausn (DPI) miðað við
    stærðina sem hún er teiknuð í
  * hvort textinn sé vektor-texti eða rasteraður (aðeins mynd)

Notkun:
    python3 check_print.py input/SVIF_baeklingur_BLA.pdf [--min-dpi 300]
Skilar 1 ef einhver mynd er undir --min-dpi, annars 0.
"""
from __future__ import annotations

import argparse
import sys

import pymupdf

PT_PER_MM = 72 / 25.4


def mm(pt: float) -> float:
    return pt / PT_PER_MM


def fmt_rect(r: pymupdf.Rect | None) -> str:
    if r is None:
        return "-"
    return f"{mm(r.width):.1f} x {mm(r.height):.1f} mm"


def page_report(page: pymupdf.Page, min_dpi: float) -> tuple[bool, list[str]]:
    lines: list[str] = []
    ok = True
    media = page.mediabox
    trim = page.trimbox
    bleed = page.bleedbox
    lines.append(
        f"  MediaBox {fmt_rect(media)} | TrimBox {fmt_rect(trim)} | BleedBox {fmt_rect(bleed)}"
    )
    bleed_mm = (media.width - trim.width) / 2 / PT_PER_MM
    if abs(media.width - trim.width) < 0.5 and abs(media.height - trim.height) < 0.5:
        lines.append("  Blæði: EKKERT (TrimBox = MediaBox)")
    else:
        lines.append(f"  Blæði: ~{bleed_mm:.1f} mm á hverja hlið")

    text = page.get_text("text").strip()
    lines.append(
        "  Texti: vektor (" + str(len(text)) + " stafir)" if text else "  Texti: ENGINN vektor-texti (síðan er líklega bara mynd)"
    )

    infos = page.get_image_info(xrefs=True)
    if not infos:
        lines.append("  Myndir: engar")
    for info in infos:
        w_px, h_px = info["width"], info["height"]
        bbox = pymupdf.Rect(info["bbox"])
        if bbox.width <= 0 or bbox.height <= 0:
            continue
        dpi_x = w_px / (bbox.width / 72)
        dpi_y = h_px / (bbox.height / 72)
        dpi = min(dpi_x, dpi_y)
        flag = "OK " if dpi >= min_dpi - 1 else "LÁG"
        if dpi < min_dpi - 1:
            ok = False
        lines.append(
            f"  Mynd xref {info.get('xref')}: {w_px}x{h_px} px teiknuð í {fmt_rect(bbox)} -> {dpi:.0f} dpi [{flag}]"
        )
    return ok, lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdf", nargs="+")
    ap.add_argument("--min-dpi", type=float, default=300.0)
    args = ap.parse_args()

    all_ok = True
    for path in args.pdf:
        doc = pymupdf.open(path)
        print(f"== {path}: {doc.page_count} síður")
        worst = None
        for page in doc:
            ok, lines = page_report(page, args.min_dpi)
            all_ok &= ok
            print(f" Síða {page.number + 1}:")
            print("\n".join(lines))
            for info in page.get_image_info():
                bbox = pymupdf.Rect(info["bbox"])
                if bbox.width > 0:
                    d = info["width"] / (bbox.width / 72)
                    worst = d if worst is None else min(worst, d)
        if worst is not None:
            print(f" Lægsta upplausn í skjalinu: {worst:.0f} dpi (krafa: {args.min_dpi:.0f})")
        print()
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
