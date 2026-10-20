"""Paste the 871 px coupon images over the upscaled blue coupon page at the matched grid positions."""
from PIL import Image, ImageFilter

S = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad'
A = f'{S}/artifact-files/7c048a51-64ed-4bec-ad90-a88fa82fd87a'
SCALE = 2292 / 1100
GRID = {  # (x, y, w, h) in the 1100 px page, from template matching
    '02e741525dffbe020971d365776c0272': (64, 138, 476, 231),   # parki
    'd4eae0f4fac226050fe3beecf5f30ece': (566, 138, 476, 231),  # ispan
    '307eeab15a8c755222a1741eb161dcb9': (64, 414, 476, 231),   # ormsson
    '18e5e26f5e3d49be1210f89b2ba8acc1': (566, 414, 476, 231),  # sticker
    '0668342c47ced951dd8f19cbfbb58c0c': (64, 689, 476, 231),   # gardinur
    'af583834be7c7b30faff32f36a3d027b': (566, 688, 476, 231),  # maus
}

page = Image.open(f'{S}/v2_blend_BLA/25.png').convert('RGB')
for bid, (x, y, w, h) in GRID.items():
    c = Image.open(f'{A}/{bid}.png').convert('RGBA')
    X, Y, W, H = (round(v * SCALE) for v in (x, y, w, h))
    c = c.resize((W, H), Image.LANCZOS)
    page.paste(c, (X, Y), c)
page.save(f'{S}/v2_blend_BLA/25.png')
page.crop((100, 250, 1200, 800)).save(f'{S}/blue_coupons_check.png')
print('composited', page.size)
