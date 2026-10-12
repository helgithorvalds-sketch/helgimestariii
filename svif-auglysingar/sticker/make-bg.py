"""Býr til bakgrunnsmyndir (án ljósmyndar) fyrir E-útgáfurnar G, H og I,
ásamt „frostaðri" útgáfu hverrar myndar fyrir glerspjaldið.

python3 make-bg.py
"""
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

W = H = 2202
TEAL = (87, 189, 189)
TEAL_DEEP = (47, 138, 138)
random.seed(7)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(c_top, c_bottom, angle=0.0):
    """Línulegur litstigull. angle í gráðum: 0 = ofan og niður."""
    img = Image.new("RGB", (W, H))
    px = img.load()
    a = math.radians(angle)
    dx, dy = math.sin(a), math.cos(a)
    for y in range(H):
        for x in range(0, W, 2):
            t = ((x / W - .5) * dx + (y / H - .5) * dy) + .5
            t = max(0, min(1, t))
            c = lerp(c_top, c_bottom, t)
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    return img


def bokeh(base, circles, blur):
    """Mjúkir ljóshringir ofan á grunninn. circles: (cx, cy, r, rgb, alpha)."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for cx, cy, r, rgb, al in circles:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgb + (al,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    out = base.convert("RGBA")
    out.alpha_composite(layer)
    return out.convert("RGB")


def bands(base, angle_deg, bands_spec, blur):
    """Skáhallandi ljósbönd (sól í gegnum glugga). bands_spec: (offset, width, rgb, alpha)."""
    big = int(W * 1.6)
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for off, wd, rgb, al in bands_spec:
        d.rectangle([off, 0, off + wd, big], fill=rgb + (al,))
    layer = layer.rotate(angle_deg, resample=Image.BICUBIC, expand=False)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    cx = (big - W) // 2
    layer = layer.crop((cx, cx, cx + W, cx + H))
    out = base.convert("RGBA")
    out.alpha_composite(layer)
    return out.convert("RGB")


def grain(img, amount=6):
    """Örlítil kornótt áferð svo stiglarnir prentist án randa."""
    noise = Image.effect_noise((W, H), amount).convert("L")
    noise = ImageChops.offset(noise, 0, 0)
    n = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img, ImageChops.add(img, n, scale=1.0, offset=-128), .35)


def frost(img, blur=46, white=.42):
    """Sandblásið gler: óskýrt + hvít slikja."""
    f = img.filter(ImageFilter.GaussianBlur(blur))
    veil = Image.new("RGB", (W, H), (255, 255, 255))
    return Image.blend(f, veil, white)


def save(name, img, frost_blur, frost_white):
    img = grain(img)
    img.save(f"assets/{name}.jpg", quality=92, subsampling=0)
    frost(img, frost_blur, frost_white).save(f"assets/{name}-frost.jpg", quality=92, subsampling=0)
    print("skrifaði", name)


# G · Ljós: hvítt/teal gler með mjúkum ljóshringjum
g = gradient((246, 250, 250), (214, 234, 234), angle=-25)
g = bokeh(g, [
    (1750, 260, 520, (255, 255, 255), 230),
    (420, 700, 430, TEAL, 70),
    (1500, 820, 360, TEAL, 55),
    (260, 180, 300, (255, 255, 255), 200),
    (1150, 400, 180, (255, 255, 255), 160),
    (1900, 1000, 260, TEAL, 60),
], blur=110)
g = bands(g, 32, [(900, 160, (255, 255, 255), 120), (1200, 70, (255, 255, 255), 90)], blur=60)
save("bg-ljos", g, 40, .40)

# H · Birta: dagsbirta á ská í gegnum glugga (ljósbönd á pappírshvítum grunni)
h = gradient((252, 252, 250), (226, 232, 232), angle=0)
h = bands(h, 28, [
    (380, 190, (255, 255, 255), 255),
    (760, 60, (255, 255, 255), 200),
    (1020, 240, (255, 255, 255), 255),
    (1480, 90, (255, 255, 255), 210),
    (1800, 300, (255, 255, 255), 255),
    (2400, 150, (255, 255, 255), 230),
    (560, 60, (175, 215, 215), 60),
    (1280, 70, (175, 215, 215), 60),
    (2140, 80, (175, 215, 215), 60),
], blur=38)
h = bokeh(h, [(1850, 300, 420, TEAL, 40), (300, 1500, 500, TEAL, 30)], blur=160)
save("bg-birta", h, 36, .36)

# I · Dökk: djúpt teal gler með glóandi ljóshringjum
i = gradient((22, 50, 54), (12, 26, 30), angle=-35)
i = bokeh(i, [
    (1800, 220, 520, TEAL, 150),
    (330, 560, 420, TEAL, 110),
    (1300, 760, 300, (255, 255, 255), 70),
    (700, 160, 200, (255, 255, 255), 60),
    (2000, 900, 320, TEAL_DEEP, 150),
    (1000, 1400, 600, TEAL_DEEP, 80),
    (1650, 520, 90, (255, 255, 255), 120),
    (520, 340, 60, (255, 255, 255), 110),
], blur=95)
i = bands(i, 35, [(1100, 120, (255, 255, 255), 40), (1350, 50, (255, 255, 255), 35)], blur=50)
save("bg-dokk", i, 44, .80)
