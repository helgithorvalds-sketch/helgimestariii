"""794 px síða -> 300 dpi mynd (2291 px, 194 mm) með speglaðri 3 mm blæðingu (2361 px), eins og upprunalegu síðurnar."""
import sys, subprocess, os
from PIL import Image, ImageOps
D = os.path.dirname(os.path.abspath(__file__))
TRIM, BL = 2291, 35
def raster(html, out):
    png = out + '.tmp.png'
    subprocess.run(['node', os.path.join(D, 'render794.js'), html, '-', png, str(TRIM / 794)], check=True)
    inner = Image.open(png).convert('RGB').resize((TRIM, TRIM), Image.LANCZOS); os.remove(png)
    o = Image.new('RGB', (TRIM + 2 * BL, TRIM + 2 * BL)); o.paste(inner, (BL, BL))
    o.paste(ImageOps.mirror(inner.crop((0, 0, BL, TRIM))), (0, BL)); o.paste(ImageOps.mirror(inner.crop((TRIM - BL, 0, TRIM, TRIM))), (TRIM + BL, BL))
    o.paste(ImageOps.flip(o.crop((0, BL, TRIM + 2 * BL, 2 * BL))), (0, 0)); o.paste(ImageOps.flip(o.crop((0, TRIM, TRIM + 2 * BL, TRIM + BL))), (0, TRIM + BL))
    o.save(out, quality=92, dpi=(300, 300)); print(out, o.size)
if __name__ == '__main__':
    raster(sys.argv[1], sys.argv[2])
