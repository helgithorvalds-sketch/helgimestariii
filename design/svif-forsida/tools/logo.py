from PIL import Image
import numpy as np
im=Image.open('src/svif-logo.png').convert('RGBA'); a=np.array(im).astype(float)
r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
lum=(r+g+b)/3; sat=np.max(a[...,:3],-1)-np.min(a[...,:3],-1)
roof=(b>r+15)&(al>20)            # bluish lavender roof
letters=(~roof)&(al>20)
print('roof px',roof.sum(),'letters px',letters.sum())
bbox=Image.fromarray(al.astype(np.uint8)).getbbox(); print(bbox)
def make(letter_rgb, roof_rgb, name):
    o=a.copy()
    o[letters,0:3]=letter_rgb
    o[roof,0:3]=roof_rgb
    Image.fromarray(o.astype(np.uint8)).crop(bbox).save('src/'+name)
make((255,255,255),(255,255,255),'logo-white.png')
make((255,255,255),(184,197,236),'logo-white-roof.png')
make((35,32,70),(91,116,196),'logo-ink.png')
make((35,32,70),(35,32,70),'logo-ink-mono.png')
# roof icon only
ys,xs=np.where(roof); rb=(xs.min()-4,ys.min()-4,xs.max()+5,ys.max()+5); print('roof bbox',rb)
o=np.zeros_like(a); o[roof]=[255,255,255,255]; o[...,3]=np.where(roof,al,0)
Image.fromarray(o.astype(np.uint8)).crop(rb).save('src/roof-white.png')
