"""Builds ring.html: six coupons bent around a cylinder (each split into strips), rendered with CSS 3D."""
import math
import sys

A = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad/artifact-files/7c048a51-64ed-4bec-ad90-a88fa82fd87a'
V = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad/vec'
ORDER = [  # front first, then clockwise
    ('parki', '02e741525dffbe020971d365776c0272'),
    ('sticker', '18e5e26f5e3d49be1210f89b2ba8acc1'),
    ('ispan', 'd4eae0f4fac226050fe3beecf5f30ece'),
    ('ormsson', '307eeab15a8c755222a1741eb161dcb9'),
    ('gardinur', '0668342c47ced951dd8f19cbfbb58c0c'),
    ('maus', 'af583834be7c7b30faff32f36a3d027b'),
]
W = float(sys.argv[1]) if len(sys.argv) > 1 else 400.0
tilt = float(sys.argv[2]) if len(sys.argv) > 2 else -10.0
persp = float(sys.argv[3]) if len(sys.argv) > 3 else 1800.0
yaw = float(sys.argv[4]) if len(sys.argv) > 4 else -8.0
H = W * 420 / 871
GAP = W * 0.06
N = 18  # strips per coupon
circ = 6 * (W + GAP)
R = circ / (2 * math.pi)
deg_per_px = 360 / circ
strip_w = W / N
parts = []
from PIL import Image, ImageOps
for _, bid in ORDER:
    ImageOps.mirror(Image.open(f'{A}/{bid}.png')).save(f'{V}/mirror_{bid}.png')
for i, (name, bid) in enumerate(ORDER):
    base = i * 60
    for j in range(N):
        # angle of this strip's centre; strips run from left to right across the coupon
        off = (j + 0.5 - N / 2) * strip_w * deg_per_px
        ang = base + off
        a = ang % 360
        back = 90 < a < 270
        img = f'{A}/{bid}.png' if not back else f'{V}/mirror_{bid}.png'
        col = j
        extra = ''
        parts.append(
            f'<div class="s" style="width:{strip_w + 0.6:.3f}px;height:{H:.2f}px;'
            f'background-image:url(file://{img});background-size:{W:.2f}px {H:.2f}px;'
            f'background-position:{-col * strip_w:.3f}px 0;'
            f'transform:rotateY({ang:.3f}deg) translateZ({R:.2f}px){extra}"></div>'
        )
# faces on the far side are seen from behind; mirror their artwork so the text reads correctly
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:transparent}}
.stage{{width:1100px;height:760px;position:relative;perspective:{persp}px;perspective-origin:50% 40%}}
.ring{{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:rotateX({tilt}deg) rotateY({yaw}deg)}}
.s{{position:absolute;left:0;top:{-H/2:.2f}px;margin-left:{-strip_w/2:.3f}px;transform-style:preserve-3d;backface-visibility:visible;background-repeat:no-repeat}}
</style></head><body><div class="stage"><div class="ring">{''.join(parts)}</div></div></body></html>'''
open(f'{V}/pages/ring.html', 'w').write(html)
print('ring.html W', W, 'R', round(R, 1), 'strips', len(parts))
