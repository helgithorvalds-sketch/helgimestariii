"""Setur saman SVIF bæklinginn (28 síður, 200 x 200 mm með 3 mm blæði) í nýrri röð."""
import pymupdf, os, sys
D = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(D, '..', 'full')
img = lambda i: os.path.join(F, f'img-{i:03d}.jpg')
ad = lambda i: os.path.join(D, 'out', 'ads', f'p{i:02d}.jpg')
pdf = lambda n: os.path.join(D, 'out', n + '.pdf')
PAGES = [  # (heiti, uppruni)
    ('Forsíða', img(0)), ('Yfirlit', pdf('yfirlit')), ('Afsláttarmiðar (kynning)', pdf('afslaettir')), ('Af hverju SVIF', img(3)),
    ('Straumlind', img(4)), ('Parki', img(5)), ('Íspan', img(6)), ('Sticker', img(7)), ('KORA', ad(8)), ('HTH', img(9)),
    ('Ormsson AEG', img(10)), ('Maus', ad(11)), ('Maus', ad(12)), ('Ísorka', img(13)), ('HK Lagnir', ad(15)),
    ('Gluggavinir', img(17)), ('Gardínur', ad(20)), ('Litamálun', img(18)), ('Múrbúðin', img(19)), ('Steindi', ad(21)),
    ('Steindi', ad(22)), ('Lásar.is', img(16)), ('RÓM Verk', img(23)), ('Heit gólf', ad(24)), ('Afsláttarmiðar, bakhlið', pdf('midar_bakhlid')),
    ('Afsláttarmiðar', pdf('midar_framhlid')), ('VÍS', ad(25)), ('Bakkápa', img(27)),
]
assert len(PAGES) == 28
SZ = 200 * 72 / 25.4; b = 3 * 72 / 25.4
def build(out, quality=None, px=None):
    doc = pymupdf.open()
    for name, src in PAGES:
        if src.endswith('.pdf'):
            s = pymupdf.open(src); r = s[0].rect
            assert abs(r.width - SZ) < 1, (src, r)
            pg = doc.new_page(width=SZ, height=SZ); pg.show_pdf_page(pg.rect, s, 0)
        else:
            pg = doc.new_page(width=SZ, height=SZ)
            if px:
                from PIL import Image; import io
                im = Image.open(src).convert('RGB').resize((px, px), Image.LANCZOS); buf = io.BytesIO(); im.save(buf, 'JPEG', quality=quality or 85)
                pg.insert_image(pg.rect, stream=buf.getvalue())
            else:
                pg.insert_image(pg.rect, filename=src)
        pg.set_bleedbox(pg.rect); pg.set_trimbox(pymupdf.Rect(b, b, SZ - b, SZ - b))
    doc.set_metadata({'title': 'SVIF bæklingur', 'author': 'SVIF'})
    doc.save(out, garbage=3, deflate=True); print(out, doc.page_count, round(os.path.getsize(out) / 1e6, 1), 'MB')
if __name__ == '__main__':
    build(os.path.join(D, 'out', 'SVIF_baeklingur_prent.pdf'))
    build(os.path.join(D, 'out', 'SVIF_baeklingur_skodun.pdf'), quality=80, px=1100)
    for i, (n, _) in enumerate(PAGES): print(i + 1, n)
