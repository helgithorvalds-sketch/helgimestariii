"""SVIF bæklingur í 21 x 21 cm: 210 x 210 mm að skurði, 3 mm blæðing, 300 dpi.
Hver síða verður 2550 x 2550 px (2480 px skurður + 35 px blæðing hvoru megin).
- SVIF-síður og kápa: endurrendraðar úr HTML í fullri upplausn (skarpur texti).
- Auglýsingar: skurðsvæðið (2291 px) skalað í 2480 px; frumskrár notaðar þar sem þær eru stærri.
- Miðasíða (bls. 29): miðar 100 x 54 mm, rifgötun 10 og 110 mm frá kili, 102 og 156 mm frá efri brún.
"""
import os, subprocess, sys
from PIL import Image, ImageOps
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(D)
O = os.path.join(D, 'out210'); os.makedirs(O, exist_ok=True)
TRIM, BL = 2480, 35; N = TRIM + 2 * BL; K = 210 / 194
def bleed(inner, out, q=88):
    inner = inner.convert('RGB'); assert inner.size == (TRIM, TRIM), inner.size
    o = Image.new('RGB', (N, N)); o.paste(inner, (BL, BL))
    o.paste(ImageOps.mirror(inner.crop((0, 0, BL, TRIM))), (0, BL)); o.paste(ImageOps.mirror(inner.crop((TRIM - BL, 0, TRIM, TRIM))), (TRIM + BL, BL))
    o.paste(ImageOps.flip(o.crop((0, BL, N, 2 * BL))), (0, 0)); o.paste(ImageOps.flip(o.crop((0, TRIM, N, TRIM + BL))), (0, TRIM + BL))
    o.save(out, quality=q, dpi=(300, 300)); return out
def from_page2361(src, out):            # gömul 2361 px síða (194 mm + 3 mm blæðing): skurðsvæðið skalað upp
    im = Image.open(src).convert('RGB'); assert im.size == (2361, 2361), (src, im.size)
    return bleed(im.crop((35, 35, 2326, 2326)).resize((TRIM, TRIM), Image.LANCZOS), out)
def from_square(src, out):              # ferningsauglýsing (frumskrá) beint í 2480 px
    im = Image.open(src).convert('RGB'); s = min(im.size)
    im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width - s) // 2 + s, (im.height - s) // 2 + s))
    return bleed(im.resize((TRIM, TRIM), Image.LANCZOS), out)
def crop_center(png, out, q=88):        # rendruð síða með blæðingu stærri en N: miðjuskorin í N
    im = Image.open(png).convert('RGB'); w = im.size[0]; o = (w - N) / 2
    assert 0 <= o < 6, (png, im.size)
    x = int(round(o)); im.crop((x, x, x + N, x + N)).save(out, quality=q, dpi=(300, 300)); os.remove(png); return out
def render200(html, out):               # 200 mm HTML-síða (194 + 2 x 3 mm): 194 mm -> 2480 px
    png = out + '.tmp.png'; dsf = TRIM / 194 * 200 / (round(200 / 25.4 * 96))
    subprocess.run(['node', os.path.join(D, 'render.js'), html, '-', png, f'{dsf:.6f}'], check=True)
    return crop_center(png, out)
def render794(html, out):               # 794 px HTML-síða = 194 mm skurður: -> 2480 px + spegluð blæðing
    png = out + '.tmp.png'
    subprocess.run(['node', os.path.join(D, 'render794.js'), html, '-', png, f'{TRIM / 794:.6f}'], check=True)
    im = Image.open(png).convert('RGB').resize((TRIM, TRIM), Image.LANCZOS); os.remove(png); return bleed(im, out)

def midasida210(out):
    """Bls. 29: sama hönnun, en málin valin svo að eftir skölun 194 -> 210 mm verði miðarnir 100 x 54 mm
    og rifgötunin á sléttum tölum: 10 og 110 mm frá kili, 102 og 156 mm frá efri brún."""
    import midar2 as m2
    m2.SPINE = 10 / K; m2.W = 100 / K; m2.H = 54 / K
    m2.X0 = m2.B + m2.SPINE; m2.X1 = m2.X0 + m2.W; m2.Y0 = m2.B + 102 / K; m2.Y1 = m2.Y0 + m2.H
    assert abs(m2.X0 + 2 * m2.W - 197) < 1e-9 and abs(m2.Y0 + 2 * m2.H - 197) < 1e-9
    src = open(os.path.join(D, 'midasida_thema.py'), encoding='utf-8').read().replace("'midar_thema_framhlid.html'", "'midar_thema_framhlid_210.html'")
    assert 'midar_thema_framhlid_210.html' in src
    exec(compile(src, 'midasida_thema.py', 'exec'), {'__name__': '__main__', '__file__': os.path.join(D, 'midasida_thema.py')})
    return render200(os.path.join(D, 'midar_thema_framhlid_210.html'), out)

def kapa210(out_front, out_back):
    """Forsíða og bakkápa úr upprunalegu HTML-skránni (1000 px = skurður, 15 px blæðing): 1000 px -> 2480 px."""
    F = os.path.join(S, 'forsida', 'design', 'svif-forsida')
    pre = os.path.join(O, 'kapa')
    subprocess.run(['node', os.path.join(F, 'tools', 'render.cjs'), os.path.join(F, 'designs', 'v4-svif-2026-prent.html'), pre, f'{TRIM / 1000:.4f}'], check=True)
    for side, out in (('front', out_front), ('back', out_back)):
        png = f'{pre}-{side}.png'; Image.open(f'{pre}-{side}.jpg').save(png); os.remove(f'{pre}-{side}.jpg'); crop_center(png, out)

A = os.path.join(D, 'out'); ads = os.path.join(A, 'ads'); full = os.path.join(S, 'full'); NY = os.path.join(S, 'nyjar_augl'); IM = os.path.join(os.path.dirname(S), 'images')
fp = lambda i: os.path.join(full, f'img-{i:03d}.jpg'); ap = lambda n: os.path.join(ads, n + '.jpg')
JOBS = [  # (nr, heiti, aðferð, uppruni)
    (1, 'Forsíða', 'kapa', None), (2, 'Yfirlit', 'r200', 'd_yfirlit.html'), (3, 'Afsláttarmiðar (kynning)', 'r794', 'afslaettir_dark.html'),
    (4, 'Parki', 'p', ap('parki')), (5, 'Gardínur', 'p', ap('p20')), (6, 'HTH', 'p', fp(9)), (7, 'Ormsson AEG', 'p', fp(10)),
    (8, 'Straumlind', 'p', fp(4)), (9, 'Hringiðan', 'sq', os.path.join(NY, 'hringidan.webp')), (10, 'Ísorka', 'p', ap('isorka')),
    (11, 'Íspan', 'p', fp(6)), (12, 'Maus', 'p', ap('p11')), (13, 'Maus', 'p', ap('p12')), (14, 'Gluggavinir', 'p', fp(17)),
    (15, 'TME Gluggar', 'sq', os.path.join(IM, '5.webp')), (16, 'Sticker', 'p', ap('sticker')), (17, 'KORA', 'p', ap('p08')),
    (18, 'Litamálun', 'sq', os.path.join(IM, '4.webp')), (19, 'Múrbúðin', 'p', ap('murbudin')), (20, 'Fagafl', 'sq', os.path.join(NY, 'fagafl.webp')),
    (21, 'RÓM Verk', 'p', fp(23)), (22, 'HK Lagnir', 'p', ap('p15')), (23, 'Lásar.is', 'p', fp(16)), (24, 'Steindi', 'p', ap('p21')),
    (25, 'Heit gólf', 'p', ap('p24')), (26, 'MS Lagnir', 'sq', os.path.join(NY, 'mslagnir.webp')), (27, 'VÍS', 'p', ap('p25')),
    (28, 'Af hverju SVIF', 'r794', 'umsvif_dark.html'), (29, 'Afsláttarmiðar', 'midar', None), (30, 'Auð síða (bakhlið miðanna)', 'r200', 'd_aud.html'),
    (31, 'Kærar þakkir', 'r200', 'd_thakkir.html'), (32, 'Bakkápa', 'kapa', None),
]
assert [j[0] for j in JOBS] == list(range(1, 33))
out = lambda nr: os.path.join(O, f'p{nr:02d}.jpg')

if __name__ == '__main__':
    only = set(int(a) for a in sys.argv[1:]) or set(range(1, 33))
    if 1 in only or 32 in only: kapa210(out(1), out(32))
    for nr, name, how, src in JOBS:
        if nr not in only or how == 'kapa': continue
        f = {'p': lambda: from_page2361(src, out(nr)), 'sq': lambda: from_square(src, out(nr)),
             'r200': lambda: render200(os.path.join(D, src), out(nr)), 'r794': lambda: render794(os.path.join(D, src), out(nr)),
             'midar': lambda: midasida210(out(nr))}[how]
        f(); print(f'{nr:2d} {name:28s} {how:5s} ->', Image.open(out(nr)).size)
