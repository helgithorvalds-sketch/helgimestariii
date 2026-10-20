import sys, os, glob
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def blend(orig_path, ai_path, out_path, target=2292, thr=28, dil=3):
    o = Image.open(orig_path).convert('RGB')
    lz = o.resize((target, target), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 55, 2))
    ai = Image.open(ai_path).convert('RGB')
    g = np.asarray(lz.convert('L'), dtype=np.float32)
    sx = ndimage.sobel(g, axis=1); sy = ndimage.sobel(g, axis=0)
    mag = np.hypot(sx, sy) / 8.0
    mask = mag > thr
    mask = ndimage.binary_dilation(mask, iterations=dil)
    m = ndimage.gaussian_filter(mask.astype(np.float32), 1.5)[..., None]
    out = np.asarray(lz, dtype=np.float32) * (1 - m) + np.asarray(ai, dtype=np.float32) * m
    Image.fromarray(out.round().clip(0, 255).astype(np.uint8)).save(out_path)
    return mask.mean()

if __name__ == '__main__':
    src, aid, dst = sys.argv[1:4]
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.png'))):
        n = os.path.basename(f)
        a = os.path.join(aid, n)
        if not os.path.exists(a):
            print('missing', a); continue
        cov = blend(f, a, os.path.join(dst, n))
        print(n, f'AI coverage {cov*100:.0f}%', flush=True)
