"""Auglýsingamynd (ferningur) -> 2361 px síða: 2291 px skurður (194 mm @ 300 dpi) + 35 px spegluð blæðing."""
import sys
from PIL import Image, ImageOps
TRIM, BL = 2291, 35
def prep(im, out):
    im = im.convert('RGB')
    if im.width != im.height:
        s = min(im.size); im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width - s) // 2 + s, (im.height - s) // 2 + s))
    inner = im.resize((TRIM, TRIM), Image.LANCZOS)
    o = Image.new('RGB', (TRIM + 2 * BL, TRIM + 2 * BL)); o.paste(inner, (BL, BL))
    o.paste(ImageOps.mirror(inner.crop((0, 0, BL, TRIM))), (0, BL)); o.paste(ImageOps.mirror(inner.crop((TRIM - BL, 0, TRIM, TRIM))), (TRIM + BL, BL))
    o.paste(ImageOps.flip(o.crop((0, BL, TRIM + 2 * BL, 2 * BL))), (0, 0)); o.paste(ImageOps.flip(o.crop((0, TRIM, TRIM + 2 * BL, TRIM + BL))), (0, TRIM + BL))
    o.save(out, quality=85, dpi=(300, 300)); print(out, o.size)
if __name__ == '__main__':
    prep(Image.open(sys.argv[1]), sys.argv[2])
