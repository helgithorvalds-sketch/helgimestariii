import cv2, numpy as np
H,W=2400,3200
def noise(h,w,gh,gw,seed):
    g=np.random.default_rng(seed).random((gh,gw)).astype(np.float32)
    return cv2.resize(g,(w,h),interpolation=cv2.INTER_CUBIC)
def fbm(h,w,gh,gw,oct,seed):
    out=0; amp=1; tot=0
    for o in range(oct):
        out=out+amp*noise(h,w,gh*2**o,gw*2**o,seed+o); tot+=amp; amp*=0.5
    return out/tot
img=np.zeros((H,W),np.float32); R=np.random.default_rng(5)
plank=600
for i,y0 in enumerate(range(0,H,plank)):
    h=min(plank,H-y0)
    yy=np.arange(h,dtype=np.float32)[:,None]+np.zeros((1,W),np.float32)
    warp=fbm(h,W,2,3,3,seed=i*31)*60 + fbm(h,W,4,10,2,seed=i*7)*10
    period=R.uniform(9,14)
    ph=((yy+warp)/period)%1.0
    line=np.exp(-((ph-0.5)**2)/0.02)*fbm(h,W,6,8,2,seed=i+70)   # rings fade in/out
    streak=fbm(h,W,h//3,W//120,2,seed=i+300)                       # long fibres
    mottle=fbm(h,W,3,4,3,seed=i+900)
    rays=(noise(h,W,h//6,W//25,seed=i+500)>0.93).astype(np.float32)  # oak medullary flecks
    rays=cv2.GaussianBlur(rays,(0,0),3,1)
    v=1.0-0.09*line-0.07*(streak-0.5)+0.07*(mottle-0.5)+0.05*rays
    v*=R.uniform(0.96,1.04)
    v[:2]*=0.8
    img[y0:y0+h]=v
img=cv2.GaussianBlur(img,(0,0),sigmaX=1.4,sigmaY=0.5)
col=np.array([146,180,212],np.float32)
out=np.clip(img[...,None]*col+np.random.default_rng(2).normal(0,1.6,(H,W))[...,None],0,255).astype(np.uint8)
cv2.imwrite('src/wood.jpg',out,[cv2.IMWRITE_JPEG_QUALITY,90])
