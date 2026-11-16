"""Setur saman SVIF bæklinginn í 21 x 21 cm: 32 síður, 216 x 216 mm (210 x 210 mm skurður + 3 mm blæðing), 300 dpi.
Síðurnar koma úr build210.py (out210/pNN.jpg, 2550 x 2550 px). TrimBox = skurður, BleedBox = öll síðan."""
import io, os, sys, pymupdf
from PIL import Image
import build210 as b2
D = os.path.dirname(os.path.abspath(__file__))
PT = b2.N * 72 / 300; BT = b2.BL * 72 / 300            # 612 pt síða, 8,4 pt blæðing
def build(out, px=None, q=None):
    doc = pymupdf.open()
    for nr, name, *_ in b2.JOBS:
        src = b2.out(nr); pg = doc.new_page(width=PT, height=PT)
        if px or q:
            im = Image.open(src).convert('RGB')
            if px: im = im.resize((px, px), Image.LANCZOS)
            buf = io.BytesIO(); im.save(buf, 'JPEG', quality=q or 85, dpi=(300, 300)); pg.insert_image(pg.rect, stream=buf.getvalue())
        else:
            pg.insert_image(pg.rect, filename=src)
        pg.set_bleedbox(pg.rect); pg.set_trimbox(pymupdf.Rect(BT, BT, PT - BT, PT - BT))
    doc.set_metadata({'title': 'SVIF bæklingur 21 x 21 cm', 'author': 'SVIF'})
    doc.save(out, garbage=3, deflate=True); print(out, doc.page_count, round(os.path.getsize(out) / 1e6, 1), 'MB')
if __name__ == '__main__':
    q = int(sys.argv[1]) if len(sys.argv) > 1 else None
    build(os.path.join(D, 'out', 'SVIF_baeklingur_prent_21x21.pdf'), q=q)
    build(os.path.join(D, 'out', 'SVIF_baeklingur_skodun_21x21.pdf'), px=1100, q=80)
