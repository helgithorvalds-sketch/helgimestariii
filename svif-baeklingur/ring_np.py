"""Hringurinn á bls. 3 reiknaður í numpy (sama rúmfræði og ring6.py / CSS 3D), með bilinear sýnatöku
úr háupplausnar miðamyndum og supersampling – skarpur texti, engar tröppur.
Notkun: python3 ring_np.py [S]   (S = ofursýnatökustuðull, sjálfgefið 6) -> out/ring_crop.png
"""
import math, os, sys
import numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
ORDER = ['parki', 'ispan', 'sticker', 'ormsson', 'gardinur', 'maus']
W, GAP = 400.0, 400.0 * 0.06
TILT, YAW, PERSP = -10.0, -8.0, 1800.0
STAGE = (1100, 760); CX, CY = 550.0, 380.0; OX, OY = 550.0, 304.0   # ring-origin, perspective-origin (50% 40%)
S = int(sys.argv[1]) if len(sys.argv) > 1 else 6
OUT_W = 3000

im0 = Image.open(f'{D}/out/ring6/parki.png'); H = W * im0.height / im0.width
circ = 6 * (W + GAP); R = circ / (2 * math.pi); dpp = 360 / circ
HALF = (W / 2) * dpp   # hálf breidd miða í gráðum

TW = int(round(W * S)); TH = int(round(H * S))
tex = []
for n in ORDER:
    t = Image.open(f'{D}/out/ring6/{n}.png').convert('RGBA').resize((TW, TH), Image.LANCZOS)
    tex.append(np.asarray(t).astype(np.float32))
tex = np.stack(tex)   # (6, TH, TW, 4)

def rx(a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], np.float64)
def ry(a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], np.float64)
Minv = (rx(TILT) @ ry(YAW)).T   # snúningur er rétthyrnt fylki

E = np.array([OX, OY, PERSP]) - np.array([CX, CY, 0.0])   # auga í hnitum hringsins (fyrir snúning)
El = Minv @ E

def sample(idx, u, v):
    """bilinear úr tex[idx] á (u,v) í [0,1]; skilar (n,4)"""
    x = u * (TW - 1); y = v * (TH - 1)
    x0 = np.clip(np.floor(x).astype(int), 0, TW - 2); y0 = np.clip(np.floor(y).astype(int), 0, TH - 2)
    fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return ((tex[idx, y0, x0] * (1 - fx) + tex[idx, y0, x0 + 1] * fx) * (1 - fy)
            + (tex[idx, y0 + 1, x0] * (1 - fx) + tex[idx, y0 + 1, x0 + 1] * fx) * fy)

def hit(P, mirror):
    """P: (n,3) skurðpunktar í hnitum hringsins -> (ok, idx, u, v)"""
    ang = np.degrees(np.arctan2(P[:, 0], P[:, 2]))
    idx = np.round(ang / 60.0).astype(int) % 6
    d = ((ang - idx * 60.0 + 180.0) % 360.0) - 180.0
    ok = (np.abs(d) <= HALF) & (np.abs(P[:, 1]) <= H / 2)
    u = 0.5 + d / (2 * HALF); v = (P[:, 1] + H / 2) / H
    if mirror: u = 1 - u
    return ok, idx, np.clip(u, 0, 1), np.clip(v, 0, 1)

OW, OH = STAGE[0] * S, STAGE[1] * S
out = np.zeros((OH, OW, 4), np.uint8)
xs = (np.arange(OW) + 0.5) / S
CH = 256
for y0 in range(0, OH, CH):
    ys = (np.arange(y0, min(y0 + CH, OH)) + 0.5) / S
    px, py = np.meshgrid(xs, ys); px = px.ravel(); py = py.ravel()
    Dw = np.stack([px - OX, py - OY, np.full_like(px, -PERSP)], 1)   # stefna geisla (heims-hnit)
    Dl = Dw @ Minv.T
    a = Dl[:, 0] ** 2 + Dl[:, 2] ** 2; b = 2 * (El[0] * Dl[:, 0] + El[2] * Dl[:, 2]); c = El[0] ** 2 + El[2] ** 2 - R * R
    disc = b * b - 4 * a * c; m = disc > 0
    sq = np.sqrt(np.where(m, disc, 0))
    t1 = (-b - sq) / (2 * a); t2 = (-b + sq) / (2 * a)
    rgba = np.zeros((px.size, 4), np.float32)
    done = ~m
    for t, mirror in ((t1, False), (t2, True)):
        P = El[None, :] + t[:, None] * Dl
        ok, idx, u, v = hit(P, mirror)
        sel = ok & ~done
        if sel.any():
            rgba[sel] = sample(idx[sel], u[sel], v[sel])
            done |= sel
    out[y0:y0 + len(ys)] = np.clip(rgba, 0, 255).astype(np.uint8).reshape(len(ys), OW, 4)
    print(f'\r{y0 + len(ys)}/{OH}', end='', flush=True)
print()
img = Image.fromarray(out, 'RGBA'); bb = img.getbbox(); c = img.crop(bb)
c = c.resize((OUT_W, round(c.height * OUT_W / c.width)), Image.LANCZOS)
c.save(f'{D}/out/ring_crop.png'); print('bbox', bb, '->', c.size)
