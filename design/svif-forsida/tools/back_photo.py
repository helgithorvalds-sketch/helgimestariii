# Makes src/bak-solargeisli.jpg: the sunbeam on the wall for the back page, at print resolution.
# Input: the text-cleaned reference photo and the mask of where text was removed (both 1080 x 1350).
import sys, cv2, numpy as np
clean_png, mask_png, out = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(clean_png).astype(np.float32)
mask = cv2.imread(mask_png, 0)
x0, y0, s = 385, 0, 686                      # 686 px square (above the teapot): 666 px trim + bleed
crop = img[y0:y0+s, x0:x0+s].copy()
m = mask[y0:y0+s, x0:x0+s]
m = cv2.dilate(m, np.ones((9, 9), np.uint8), iterations=3)
# smooth away the inpainting patches inside the removed-text area, keep the beam edge
u8 = np.clip(crop, 0, 255).astype(np.uint8)
smooth = cv2.medianBlur(u8, 45)
smooth = cv2.bilateralFilter(smooth, 25, 18, 25).astype(np.float32)
mf = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 12)[..., None]
crop = crop * (1 - mf) + smooth * mf
# also soften any small leftover blotches everywhere a little (the wall is smooth)
crop = cv2.bilateralFilter(np.clip(crop, 0, 255).astype(np.uint8), 9, 10, 9).astype(np.float32)
crop = crop[:, ::-1]                          # mirror so it does not read as the front photo
N = 2600
big = cv2.resize(crop, (N, N), interpolation=cv2.INTER_LANCZOS4)
big = big * 1.13                              # a touch brighter, like the front
# fine, crisp film grain at print resolution
rng = np.random.default_rng(3)
g = rng.normal(0, 1, (N, N)).astype(np.float32)
g = cv2.GaussianBlur(g, (0, 0), 0.7) * 6.5
big = np.clip(big + g[..., None], 0, 255).astype(np.uint8)
cv2.imwrite(out, big, [cv2.IMWRITE_JPEG_QUALITY, 94])
print('wrote', out, big.shape)
