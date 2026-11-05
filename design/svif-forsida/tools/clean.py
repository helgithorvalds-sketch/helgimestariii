import cv2, numpy as np, sys
import os
W=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')+'/'
def clean(path, boxes, out, thr=200, dil=5, rad=9):
    img = cv2.imread(path)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = np.zeros(gray.shape, np.uint8)
    for (x0,y0,x1,y1,t) in boxes:
        roi = gray[y0:y1, x0:x1]
        # local background estimate: median blur big
        bg = cv2.medianBlur(roi, 31)
        m = ((roi.astype(int) - bg.astype(int)) > t).astype(np.uint8)*255
        mask[y0:y1, x0:x1] = np.maximum(mask[y0:y1, x0:x1], m)
    mask = cv2.dilate(mask, np.ones((dil,dil),np.uint8), iterations=2)
    res = cv2.inpaint(img, mask, rad, cv2.INPAINT_TELEA)
    # second pass: soften inpainted area
    blur = cv2.GaussianBlur(res, (0,0), 3)
    mf = cv2.GaussianBlur(mask.astype(np.float32)/255, (0,0), 4)[...,None]
    res = (res*(1-mf) + blur*mf).astype(np.uint8)
    cv2.imwrite(out, res); cv2.imwrite(out.replace('.png','_mask.png'), mask)
img=cv2.imread(W+'src/ref1.webp'); cv2.imwrite(W+'src/ref1.png', img); print(img.shape)
clean(W+'src/ref1.png', [
 (55,40,290,66,25),(905,35,1030,72,25),
 (235,400,845,560,25),(440,560,640,610,25),
 (220,625,870,715,22),(390,720,700,785,25),
 (440,1205,640,1300,25),(980,900,1025,1300,25)], W+'src/ref1_clean.png')
img2=cv2.imread(W+'src/ref2.png'); print(img2.shape)
clean(W+'src/ref2.png', [
 (35,35,130,80,18),(215,35,285,62,18),(425,35,520,80,18),(610,35,700,80,18),
 (70,355,665,425,18),(225,435,510,485,18),
 (35,810,130,868,18),(255,805,435,870,18),(560,810,700,868,18)], W+'src/ref2_clean.png')
