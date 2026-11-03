"""Tekur hvíta 6 mm rammann af auglýsingasíðum: sker innri flötinn, skalar í 194 mm (300 dpi) og speglar 3 mm blæði."""
import sys, numpy as np
from PIL import Image, ImageOps
TRIM = 2291; BL = 35  # px við 300 dpi (194 mm, 3 mm)
def inner_box(a):
    n = a.shape[0]; m = n // 2
    def edge(line):
        k = 0
        while k < len(line) and line[k] >= 248: k += 1
        return k
    band = slice(m - 400, m + 400)
    L = edge(a[band, :].min(axis=0)); R = edge(a[band, ::-1].min(axis=0))
    T = edge(a[:, band].min(axis=1)); Bt = edge(a[::-1, band].min(axis=1))
    return L, T, n - R, n - Bt
def unframe(src, dst, box=None):
    im = Image.open(src).convert('RGB'); a = np.asarray(im.convert('L'))
    L, T, R, B = box or inner_box(a)
    inner = im.crop((L, T, R, B)).resize((TRIM, TRIM), Image.LANCZOS)
    out = Image.new('RGB', (TRIM + 2 * BL, TRIM + 2 * BL)); out.paste(inner, (BL, BL))
    out.paste(ImageOps.mirror(inner.crop((0, 0, BL, TRIM))), (0, BL)); out.paste(ImageOps.mirror(inner.crop((TRIM - BL, 0, TRIM, TRIM))), (TRIM + BL, BL))
    top = out.crop((0, BL, TRIM + 2 * BL, 2 * BL)); bot = out.crop((0, TRIM, TRIM + 2 * BL, TRIM + BL))
    out.paste(ImageOps.flip(top), (0, 0)); out.paste(ImageOps.flip(bot), (0, TRIM + BL))
    out.save(dst, quality=90, dpi=(300, 300)); print(src, '->', dst, (L, T, R, B), f'{(R-L)}x{(B-T)}')
if __name__ == '__main__':
    unframe(*sys.argv[1:3])
