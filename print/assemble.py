#!/usr/bin/env python3
"""Skiptir út síðum í rasteruðu prentskjali fyrir vektor-síður (báðar með blæði).

    python3 assemble.py raster.pdf out.pdf 1=T1_bleed.pdf 2=Yfirlit_bleed.pdf ...

Síðunúmer eru 1-miðuð. Vektor-síðan verður að vera í sömu stærð (200 x 200 mm)
og með sömu Trim/Bleed-boxum, t.d. úr add_bleed.py.
"""
import sys

import pymupdf


def main() -> int:
    src, dst, *pairs = sys.argv[1:]
    doc = pymupdf.open(src)
    for pair in pairs:
        n, path = pair.split('=', 1)
        pno = int(n) - 1
        rep = pymupdf.open(path)
        doc.insert_pdf(rep, from_page=0, to_page=0, start_at=pno)
        doc.delete_page(pno + 1)
        # keep boxes identical to the raster pages
        page = doc[pno]
        media = page.rect
        page.set_cropbox(media)
        page.set_bleedbox(media)
        b = 3.0 * 72 / 25.4
        page.set_trimbox(pymupdf.Rect(b, b, media.width - b, media.height - b))
        print(f'síða {n} <- {path.split("/")[-1]}')
    doc.save(dst, garbage=3, deflate=True)
    print(f'{dst}: {doc.page_count} síður')
    return 0


if __name__ == '__main__':
    sys.exit(main())
