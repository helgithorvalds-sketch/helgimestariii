import sys, pymupdf
src, dst = sys.argv[1:3]
d = pymupdf.open(src); assert d.page_count == 1, d.page_count
pg = d[0]; r = pg.rect; b = 3 * 72 / 25.4
pg.set_bleedbox(r); pg.set_trimbox(pymupdf.Rect(b, b, r.width - b, r.height - b))
d.save(dst, garbage=3, deflate=True); print(dst, r)
