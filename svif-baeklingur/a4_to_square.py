"""A4-auglýsing (PDF) -> ferningur: full hæð, litir ystu dálka framlengdir út í kant. Notkun: a4_to_square.py inn.pdf ut.png [hvít_rönd_efst_px]"""
import sys, pymupdf, numpy as np
from PIL import Image
TRIM = 2291
doc = pymupdf.open(sys.argv[1]); p = doc[0]
z = 4000 / p.rect.height; pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
ad = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
a = np.asarray(ad.convert('L')).mean(axis=1); top = int(np.argmax(a < 200))   # hvít prentrönd efst skorin burt
ad = ad.crop((0, top, ad.width, ad.height))
ad = ad.resize((round(ad.width * TRIM / ad.height), TRIM), Image.LANCZOS)
a = np.asarray(ad); w = ad.width; x0 = (TRIM - w) // 2
canvas = np.zeros((TRIM, TRIM, 3), np.uint8)
canvas[:, :x0] = np.median(a[:, :12, :], axis=1).astype(np.uint8)[:, None, :]
canvas[:, x0 + w:] = np.median(a[:, -12:, :], axis=1).astype(np.uint8)[:, None, :]
canvas[:, x0:x0 + w] = a
Image.fromarray(canvas).save(sys.argv[2]); print('skorið efst', top, 'px @4000; auglýsing', ad.size, 'x0', x0)
