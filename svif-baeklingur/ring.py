"""Fjórir afsláttarmiðar beygðir utan um sívalning (CSS 3D), fyrir kynningarsíðuna (bls. 3)."""
import math, sys, os
from PIL import Image, ImageOps
D=os.path.dirname(os.path.abspath(__file__))
ORDER=['parki','ispan','ormsson','maus']   # fremst fyrst, svo réttsælis
W=float(sys.argv[1]) if len(sys.argv)>1 else 700
tilt=float(sys.argv[2]) if len(sys.argv)>2 else -11
persp=float(sys.argv[3]) if len(sys.argv)>3 else 1900
yaw=float(sys.argv[4]) if len(sys.argv)>4 else -16
im0=Image.open(f'{D}/out/coupons/parki.png'); H=W*im0.height/im0.width
GAP=W*0.05; N=40
circ=len(ORDER)*(W+GAP); R=circ/(2*math.pi); dpp=360/circ; sw=W/N
parts=[]
for n in ORDER:
    ImageOps.mirror(Image.open(f'{D}/out/coupons/{n}.png')).save(f'{D}/out/coupons/m_{n}.png')
for i,n in enumerate(ORDER):
    base=i*360/len(ORDER)
    for j in range(N):
        ang=base+(j+0.5-N/2)*sw*dpp; a=ang%360; back=90<a<270
        img=f'out/coupons/{"m_" if back else ""}{n}.png'
        col=j
        parts.append(f'<div class="s" style="width:{sw+0.7:.3f}px;height:{H:.2f}px;background-image:url({img});background-size:{W:.2f}px {H:.2f}px;'
                     f'background-position:{-col*sw:.3f}px 0;transform:rotateY({ang:.3f}deg) translateZ({R:.2f}px)"></div>')
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;background:transparent}}
.stage{{width:1100px;height:760px;position:relative;perspective:{persp}px;perspective-origin:50% 38%}}
.ring{{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d;transform:rotateX({tilt}deg) rotateY({yaw}deg)}}
.s{{position:absolute;left:0;top:{-H/2:.2f}px;margin-left:{-sw/2:.3f}px;backface-visibility:visible;background-repeat:no-repeat;box-shadow:0 0 0 rgba(0,0,0,0)}}
</style></head><body><div class="stage"><div class="ring">{''.join(parts)}</div></div></body></html>'''
open(f'{D}/ring.html','w').write(html); print('R',round(R),'H',round(H))
