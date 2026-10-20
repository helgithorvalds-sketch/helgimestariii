"""Locate the six coupon images inside the blue coupon page (1100 px) by template matching."""
import sys
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

S = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad'
A = f'{S}/artifact-files/7c048a51-64ed-4bec-ad90-a88fa82fd87a'
COUPONS = {
    'parki': '02e741525dffbe020971d365776c0272',
    'ispan': 'd4eae0f4fac226050fe3beecf5f30ece',
    'ormsson': '307eeab15a8c755222a1741eb161dcb9',
    'sticker': '18e5e26f5e3d49be1210f89b2ba8acc1',
    'gardinur': '0668342c47ced951dd8f19cbfbb58c0c',
    'maus': 'af583834be7c7b30faff32f36a3d027b',
}


def ncc(page, tpl):
    """normalized cross-correlation of grayscale float arrays (valid mode)."""
    tpl = tpl - tpl.mean()
    tpl /= (np.linalg.norm(tpl) + 1e-6)
    ones = np.ones_like(tpl)
    num = fftconvolve(page, tpl[::-1, ::-1], mode='valid')
    s1 = fftconvolve(page, ones, mode='valid')
    s2 = fftconvolve(page * page, ones, mode='valid')
    n = tpl.size
    var = s2 - s1 * s1 / n
    var[var < 1e-6] = 1e-6
    return num / np.sqrt(var)


def main(page_path):
    page = np.asarray(Image.open(page_path).convert('L'), dtype=np.float32)
    results = {}
    for name, bid in COUPONS.items():
        im = Image.open(f'{A}/{bid}.png').convert('RGB')
        # flatten alpha onto white was done by convert; coupon aspect ~2.07
        best = None
        for w in range(380, 560, 6):
            h = round(w * im.height / im.width)
            tpl = np.asarray(im.resize((w, h), Image.LANCZOS).convert('L'), dtype=np.float32)
            c = ncc(page, tpl)
            y, x = np.unravel_index(np.argmax(c), c.shape)
            score = c[y, x]
            if best is None or score > best[0]:
                best = (float(score), int(x), int(y), w, h)
        results[name] = best
        print(name, best, flush=True)
    return results


if __name__ == '__main__':
    main(sys.argv[1])
