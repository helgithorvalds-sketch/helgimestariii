"""Setur saman SVIF bæklinginn (28 síður, 200 x 200 mm með 3 mm blæði) í nýrri röð."""
import pymupdf, os, sys
D = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(D, '..', 'full')
img = lambda i: os.path.join(F, f'img-{i:03d}.jpg')
ad = lambda i: os.path.join(D, 'out', 'ads', f'p{i:02d}.jpg')
pdf = lambda n: os.path.join(D, 'out', n + '.pdf')
ny = lambda n: os.path.join(D, 'out', 'ads', n + '.jpg')
PAGES = [  # (heiti, uppruni) – 29 síður (endanlegur síðufjöldi ákveðinn síðar)
    ('Forsíða', ny('kapa_fram')), ('Yfirlit', os.path.join(D,'out','d_yfirlit.jpg')), ('Afsláttarmiðar (kynning)', os.path.join(D,'out','afslaettir_dark.jpg')),
    ('Parki', img(5)), ('Gardínur', ad(20)), ('HTH', img(9)), ('Ormsson AEG', img(10)), ('Straumlind', img(4)), ('Ísorka', img(13)),
    ('Íspan', img(6)), ('Sticker', img(7)), ('Maus', ad(11)), ('Maus', ad(12)), ('Gluggavinir', img(17)), ('TME Gluggar', ny('tme')),
    ('KORA', ad(8)), ('Litamálun', ny('litamalun')), ('Múrbúðin', img(19)), ('Fagafl', ny('fagafl')), ('HK Lagnir', ad(15)), ('MS Lagnir', ny('mslagnir')),
    ('Lásar.is', img(16)), ('VÍS', ad(25)),
    ('Af hverju SVIF', os.path.join(D,'out','umsvif_dark.jpg')), ('Afsláttarmiðar', os.path.join(D,'out','midar_thema_framhlid.jpg')), ('Auð síða (bakhlið miðanna)', os.path.join(D,'out','d_aud.jpg')),
    ('RÓM Verk', img(23)), ('Kærar þakkir', os.path.join(D,'out','d_thakkir.jpg')), ('Bakkápa', ny('kapa_bak')),
]
assert len(PAGES) == 29
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
