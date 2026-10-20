#!/usr/bin/env python3
"""Býr til prentskjal úr PDF þar sem hver síða er ein mynd (t.d. 144 dpi útflutningur).

Hver síða er: tekin út sem upprunalega myndin -> stækkuð í 300 dpi (Lanczos +
væg skerping) -> 3 mm blæði speglað út fyrir skurðlínu -> sett á 200 x 200 mm
síðu með TrimBox 194 x 194 mm.

    python3 raster_print.py input/SVIF_baeklingur_BLA.pdf output/SVIF_baeklingur_BLA_PRENT.pdf

Valkostir: --upscaled-dir MAPPA notar áður stækkaðar myndir (t.d. úr AI-upscaler)
sem heita 01.png, 02.png ... í stað Lanczos.
"""
from __future__ import annotations

import argparse
import io
import os
import sys

import pymupdf
from PIL import Image, ImageFilter, ImageOps

PT_PER_MM = 72 / 25.4


def page_image(doc: pymupdf.Document, pno: int) -> Image.Image:
    infos = doc[pno].get_image_info(xrefs=True)
    if len(infos) == 1:
        data = doc.extract_image(infos[0]["xref"])
        return Image.open(io.BytesIO(data["image"])).convert("RGB")
    # fallback: render the page
    pix = doc[pno].get_pixmap(dpi=300, alpha=False)
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")


def upscale(img: Image.Image, size: int, sharpen: bool) -> Image.Image:
    out = img.resize((size, size), Image.LANCZOS)
    if sharpen:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=2))
    return out


def with_bleed(img: Image.Image, b: int) -> Image.Image:
    w, h = img.size
    canvas = Image.new("RGB", (w + 2 * b, h + 2 * b))
    canvas.paste(img, (b, b))
    canvas.paste(ImageOps.mirror(img.crop((0, 0, b, h))), (0, b))
    canvas.paste(ImageOps.mirror(img.crop((w - b, 0, w, h))), (w + b, b))
    canvas.paste(ImageOps.flip(img.crop((0, 0, w, b))), (b, 0))
    canvas.paste(ImageOps.flip(img.crop((0, h - b, w, h))), (b, h + b))
    for (cx, cy), (px, py) in {
        (0, 0): (0, 0),
        (w - b, 0): (w + b, 0),
        (0, h - b): (0, h + b),
        (w - b, h - b): (w + b, h + b),
    }.items():
        canvas.paste(ImageOps.flip(ImageOps.mirror(img.crop((cx, cy, cx + b, cy + b)))), (px, py))
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--trim-mm", type=float, default=194.0)
    ap.add_argument("--bleed-mm", type=float, default=3.0)
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--jpeg-quality", type=int, default=90)
    ap.add_argument("--no-sharpen", action="store_true")
    ap.add_argument("--upscaled-dir", default=None)
    ap.add_argument("--dump-dir", default=None, help="vista upprunalegu síðumyndirnar sem 01.png ...")
    args = ap.parse_args()

    trim_px = round(args.trim_mm / 25.4 * args.dpi)
    bleed_px = round(args.bleed_mm / 25.4 * args.dpi)
    page_mm = args.trim_mm + 2 * args.bleed_mm
    page_pt = page_mm * PT_PER_MM
    bleed_pt = args.bleed_mm * PT_PER_MM

    src = pymupdf.open(args.src)
    out = pymupdf.open()
    for pno in range(src.page_count):
        orig = page_image(src, pno)
        if args.dump_dir:
            os.makedirs(args.dump_dir, exist_ok=True)
            orig.save(os.path.join(args.dump_dir, f"{pno + 1:02d}.png"))
        if args.upscaled_dir:
            up = Image.open(os.path.join(args.upscaled_dir, f"{pno + 1:02d}.png")).convert("RGB")
            if up.size != (trim_px, trim_px):
                up = up.resize((trim_px, trim_px), Image.LANCZOS)
        else:
            up = upscale(orig, trim_px, not args.no_sharpen)
        full = with_bleed(up, bleed_px)
        buf = io.BytesIO()
        full.save(buf, format="JPEG", quality=args.jpeg_quality, subsampling=0, optimize=True)
        page = out.new_page(width=page_pt, height=page_pt)
        page.insert_image(page.rect, stream=buf.getvalue(), keep_proportion=False)
        page.set_cropbox(page.rect)
        page.set_bleedbox(page.rect)
        page.set_trimbox(pymupdf.Rect(bleed_pt, bleed_pt, page_pt - bleed_pt, page_pt - bleed_pt))
        print(f"síða {pno + 1:2d}: {orig.size[0]}px -> {full.size[0]}px ({args.dpi} dpi í {page_mm:.0f} mm)", file=sys.stderr)

    out.set_metadata({"title": os.path.splitext(os.path.basename(args.dst))[0]})
    out.save(args.dst, garbage=3, deflate=True)
    print(f"{args.dst}: {out.page_count} síður, {page_mm:.0f} x {page_mm:.0f} mm, TrimBox {args.trim_mm:.0f} mm, {os.path.getsize(args.dst) / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
