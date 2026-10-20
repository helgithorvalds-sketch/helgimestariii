#!/usr/bin/env python3
"""Bætir 3 mm blæði (bleed) við PDF sem er sett upp í lokastærð án blæðis.

Dæmi (194 x 194 mm bæklingur -> 200 x 200 mm með 3 mm blæði á öllum köntum):
    python3 add_bleed.py input/SVIF_baeklingur_BLA.pdf output/SVIF_baeklingur_BLA_PRENT_3mm_bleed.pdf

Tvær aðferðir (--mode):
  mirror  (sjálfgefið) Síðan er sett óbreytt í miðjuna og 3 mm rönd speglast út
          fyrir skurðlínuna. Ekkert af hönnuninni skerðist og skurðstærðin helst
          nákvæmlega 194 x 194 mm. Speglaða röndin er rasteruð í --dpi.
  scale   Síðan er stækkuð um 3 mm á hverja hlið (194 -> 200 mm) svo að ystu
          3 mm af hönnuninni lenda í blæðinu og eru skornir af. Allt helst vektor.
          Hentar þegar ekkert mikilvægt er alveg úti í kanti.

Skjalið fær rétta MediaBox/BleedBox/TrimBox svo prentsmiðjan sjái skurðlínuna.
"""
from __future__ import annotations

import argparse
import io
import sys

import pymupdf
from PIL import Image, ImageOps

PT_PER_MM = 72 / 25.4


def strip_pixmap(src: pymupdf.Page, clip: pymupdf.Rect, dpi: int) -> Image.Image:
    pix = src.get_pixmap(clip=clip, dpi=dpi, alpha=False)
    return Image.open(io.BytesIO(pix.tobytes("png")))


def png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def add_mirror_bleed(out: pymupdf.Document, src_doc: pymupdf.Document, pno: int, bleed_pt: float, dpi: int) -> None:
    src = src_doc[pno]
    tw, th = src.rect.width, src.rect.height
    page = out.new_page(width=tw + 2 * bleed_pt, height=th + 2 * bleed_pt)
    inner = pymupdf.Rect(bleed_pt, bleed_pt, bleed_pt + tw, bleed_pt + th)

    # Edge strips of the source, mirrored outward.
    b = bleed_pt
    edges = {
        "left": (pymupdf.Rect(0, 0, b, th), pymupdf.Rect(0, b, b, b + th), ImageOps.mirror),
        "right": (pymupdf.Rect(tw - b, 0, tw, th), pymupdf.Rect(b + tw, b, 2 * b + tw, b + th), ImageOps.mirror),
        "top": (pymupdf.Rect(0, 0, tw, b), pymupdf.Rect(b, 0, b + tw, b), ImageOps.flip),
        "bottom": (pymupdf.Rect(0, th - b, tw, th), pymupdf.Rect(b, b + th, b + tw, 2 * b + th), ImageOps.flip),
    }
    for clip, target, op in edges.values():
        page.insert_image(target, stream=png_bytes(op(strip_pixmap(src, clip, dpi))), keep_proportion=False)

    # Corners: mirrored in both directions.
    corners = {
        "tl": (pymupdf.Rect(0, 0, b, b), pymupdf.Rect(0, 0, b, b)),
        "tr": (pymupdf.Rect(tw - b, 0, tw, b), pymupdf.Rect(b + tw, 0, 2 * b + tw, b)),
        "bl": (pymupdf.Rect(0, th - b, b, th), pymupdf.Rect(0, b + th, b, 2 * b + th)),
        "br": (pymupdf.Rect(tw - b, th - b, tw, th), pymupdf.Rect(b + tw, b + th, 2 * b + tw, 2 * b + th)),
    }
    for clip, target in corners.values():
        img = ImageOps.flip(ImageOps.mirror(strip_pixmap(src, clip, dpi)))
        page.insert_image(target, stream=png_bytes(img), keep_proportion=False)

    # Original page content on top, untouched (vectors stay vectors).
    page.show_pdf_page(inner, src_doc, pno)
    set_boxes(page, bleed_pt)


def add_scale_bleed(out: pymupdf.Document, src_doc: pymupdf.Document, pno: int, bleed_pt: float) -> None:
    src = src_doc[pno]
    tw, th = src.rect.width, src.rect.height
    page = out.new_page(width=tw + 2 * bleed_pt, height=th + 2 * bleed_pt)
    page.show_pdf_page(page.rect, src_doc, pno)  # scales page up to fill the bleed
    set_boxes(page, bleed_pt)


def set_boxes(page: pymupdf.Page, bleed_pt: float) -> None:
    media = page.rect
    page.set_mediabox(media)
    page.set_cropbox(media)
    page.set_bleedbox(media)
    page.set_trimbox(pymupdf.Rect(bleed_pt, bleed_pt, media.width - bleed_pt, media.height - bleed_pt))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--bleed-mm", type=float, default=3.0)
    ap.add_argument("--mode", choices=["mirror", "scale"], default="mirror")
    ap.add_argument("--dpi", type=int, default=300, help="upplausn speglaðra randa (mirror)")
    ap.add_argument("--expect-mm", type=float, default=None, help="t.d. 194: stoppar ef síður eru ekki í þeirri stærð")
    args = ap.parse_args()

    src_doc = pymupdf.open(args.src)
    bleed_pt = args.bleed_mm * PT_PER_MM
    out = pymupdf.open()

    for pno in range(src_doc.page_count):
        page = src_doc[pno]
        w_mm, h_mm = page.rect.width / PT_PER_MM, page.rect.height / PT_PER_MM
        if args.expect_mm and (abs(w_mm - args.expect_mm) > 0.5 or abs(h_mm - args.expect_mm) > 0.5):
            print(f"Síða {pno + 1} er {w_mm:.1f} x {h_mm:.1f} mm, ekki {args.expect_mm} mm", file=sys.stderr)
            return 2
        if page.rotation:
            page.remove_rotation()
        if args.mode == "mirror":
            add_mirror_bleed(out, src_doc, pno, bleed_pt, args.dpi)
        else:
            add_scale_bleed(out, src_doc, pno, bleed_pt)

    out.save(args.dst, garbage=3, deflate=True)
    first = out[0]
    print(
        f"{args.dst}: {out.page_count} síður, {first.rect.width / PT_PER_MM:.1f} x {first.rect.height / PT_PER_MM:.1f} mm "
        f"með {args.bleed_mm} mm blæði ({args.mode}), TrimBox {first.trimbox.width / PT_PER_MM:.1f} mm"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
