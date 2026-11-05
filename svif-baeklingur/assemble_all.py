"""Setur saman SVIF bæklinginn (28 síður, 200 x 200 mm með 3 mm blæði) í nýrri röð."""
import pymupdf, os, sys
D = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(D, '..', 'full')
img = lambda i: os.path.join(F, f'img-{i:03d}.jpg')
ad = lambda i: os.path.join(D, 'out', 'ads', f'p{i:02d}.jpg')
pdf = lambda n: os.path.join(D, 'out', n + '.pdf')
ny = lambda n: os.path.join(D, 'out', 'ads', n + '.jpg')
PAGES = [  # (heiti, uppruni) – 32 síður, heftaður
    ('Forsíða', ny('kapa_fram')), ('Yfirlit', os.path.join(D,'out','yfirlit.jpg')), ('Afsláttarmiðar (kynning)', os.path.join(D,'out','afslaettir.jpg')),
    ('Straumlind', img(4)), ('Ísorka', img(13)), ('Parki', img(5)), ('Íspan', img(6)), ('Sticker', img(7)), ('KORA', ad(8)),
    ('HTH', img(9)), ('Ormsson AEG', img(10)), ('Maus', ad(11)), ('Maus', ad(12)), ('Gluggavinir', img(17)), ('TME Gluggar', ny('tme')),
    ('Gardínur', ad(20)), ('Fagafl', ny('fagafl')), ('Litamálun', img(18)), ('Múrbúðin', img(19)), ('HK Lagnir', ad(15)), ('MS Lagnir', ny('mslagnir')),
    ('Lásar.is', img(16)), ('VÍS', ad(25)), ('RÓM Verk', img(23)),
    ('Laust auglýsingapláss 1', os.path.join(D,'out','d_laust1.jpg')), ('Laust auglýsingapláss 2', os.path.join(D,'out','d_laust2.jpg')), ('Laust auglýsingapláss 3', os.path.join(D,'out','d_laust3.jpg')),
    ('Af hverju SVIF', img(3)), ('Afsláttarmiðar', os.path.join(D,'out','midar2_framhlid.jpg')), ('Auð síða (bakhlið miðanna)', os.path.join(D,'out','d_aud.jpg')),
    ('Kærar þakkir', os.path.join(D,'out','d_thakkir.jpg')), ('Bakkápa', ny('kapa_bak')),
]
assert len(PAGES) % 4 == 0 and len(PAGES) == 32
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
