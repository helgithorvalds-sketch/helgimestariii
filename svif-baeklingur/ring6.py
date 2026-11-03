"""Hringurinn á bls. 3 í gamla stílnum: sex miðar á sívalningi; núverandi miðar fremst og efst, Sticker og Gardínur á hliðum aftast."""
import math, os
from PIL import Image, ImageOps
D=os.path.dirname(os.path.abspath(__file__))
ORDER=['parki','ispan','sticker','ormsson','gardinur','maus']   # 0° fremst, svo réttsælis (60° hver)
W=400.0; tilt=-10.0; persp=1800.0; yaw=-8.0; N=18
im0=Image.open(f'{D}/out/ring6/parki.png'); H=W*im0.height/im0.width
GAP=W*0.06; circ=6*(W+GAP); R=circ/(2*math.pi); dpp=360/circ; sw=W/N
for n in ORDER: ImageOps.mirror(Image.open(f'{D}/out/ring6/{n}.png')).save(f'{D}/out/ring6/m_{n}.png')
parts=[]
for i,n in enumerate(ORDER):
    for j in range(N):
        ang=i*60+(j+0.5-N/2)*sw*dpp; back=90<ang%360<270
        img=f'out/ring6/{"m_" if back else ""}{n}.png'
        parts.append(f'<div class="s" style="width:{sw+0.6:.3f}px;height:{H:.2f}px;background-image:url({img});background-size:{W:.2f}px {H:.2f}px;'
                     f'background-position:{-j*sw:.3f}px 0;transform:rotateY({ang:.3f}deg) translateZ({R:.2f}px)"></div>')
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:transparent}}
.stage{{width:1100px;height:760px;position:relative;perspective:{persp}px;perspective-origin:50% 40%}}
.ring{{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:rotateX({tilt}deg) rotateY({yaw}deg)}}
.s{{position:absolute;left:0;top:{-H/2:.2f}px;margin-left:{-sw/2:.3f}px;backface-visibility:visible;background-repeat:no-repeat}}
</style></head><body><div class="stage"><div class="ring">{''.join(parts)}</div></div></body></html>'''
open(f'{D}/ring6.html','w').write(html); print('R',round(R),'H',round(H))
