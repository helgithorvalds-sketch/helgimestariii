import cv2, numpy as np
rng=np.random.default_rng(7)
def up(src,dst,scale):
    img=cv2.imread(src)
    big=cv2.resize(img,None,fx=scale,fy=scale,interpolation=cv2.INTER_LANCZOS4)
    bl=cv2.GaussianBlur(big,(0,0),2.0); big=cv2.addWeighted(big,1.35,bl,-0.35,0)
    n=rng.normal(0,3.2,big.shape[:2])[...,None]; big=np.clip(big+n,0,255).astype(np.uint8)
    cv2.imwrite(dst,big,[cv2.IMWRITE_JPEG_QUALITY,92]); print(dst,big.shape)
img=cv2.imread('src/ref1_clean.png')
m=np.zeros(img.shape[:2],np.uint8); cv2.circle(m,(546,463),14,255,-1)
img=cv2.inpaint(img,m,15,cv2.INPAINT_TELEA); cv2.imwrite('src/ref1_clean.png',img)
up('src/ref1_clean.png','src/bg1.jpg',2.0)
up('src/ref2_clean.png','src/bg2.jpg',3.0)
# ---- procedural light oak tabletop ----
H,W=2400,3200
def fbm(h,w,oct=5,base=8,seed=0):
    r=np.random.default_rng(seed); out=np.zeros((h,w),np.float32); amp=1; tot=0
    for o in range(oct):
        gh,gw=int(base*2**o*h/w)+2,base*2**o+2
        g=r.random((gh,gw)).astype(np.float32)
        out+=amp*cv2.resize(g,(w,h),interpolation=cv2.INTER_CUBIC); tot+=amp; amp*=0.5
    return out/tot
wood=np.zeros((H,W,3),np.float32)
plank_h=400
ys=np.arange(H)[:,None].astype(np.float32); xs=np.arange(W)[None,:].astype(np.float32)
base_col=np.array([168,196,222],np.float32)  # BGR light oak
for i,y0 in enumerate(range(0,H,plank_h)):
    h=min(plank_h,H-y0)
    warp=fbm(h,W,5,3,seed=i*11)*90
    yy=ys[:h]+warp
    grain=np.sin((yy+ (fbm(h,W,4,2,seed=i*7+1)*260))*0.11)*0.5+0.5
    fine=fbm(h,W,6,40,seed=i*3+2)
    stretch=cv2.resize(fbm(h//8+2,W,4,30,seed=i+50),(W,h))
    v=0.55*grain**3+0.25*fine+0.2*stretch
    tone=1.0+ (np.random.default_rng(i).random()-0.5)*0.12
    col=base_col*tone*(0.86+0.2*v[...,None]) - np.array([10,14,14])*v[...,None]**2
    wood[y0:y0+h]=col
    # seam
    wood[y0:y0+3]*=0.72
    wood[y0+3:y0+5]*=1.04
# streak blur along x
wood=cv2.GaussianBlur(wood,(0,0),sigmaX=6,sigmaY=0.8)
wood=np.clip(wood+np.random.default_rng(1).normal(0,2.5,wood.shape[:2])[...,None],0,255)
cv2.imwrite('src/wood.jpg',wood.astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,90])
cv2.imwrite('src/wood_prev.jpg',cv2.resize(wood.astype(np.uint8),(800,600)))
