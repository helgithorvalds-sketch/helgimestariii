import sys, os, glob, time
import numpy as np
import torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image


class SRVGGNetCompact(nn.Module):
    def __init__(self, num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4):
        super().__init__()
        self.upscale = upscale
        self.body = nn.ModuleList()
        self.body.append(nn.Conv2d(num_in_ch, num_feat, 3, 1, 1))
        self.body.append(nn.PReLU(num_parameters=num_feat))
        for _ in range(num_conv):
            self.body.append(nn.Conv2d(num_feat, num_feat, 3, 1, 1))
            self.body.append(nn.PReLU(num_parameters=num_feat))
        self.body.append(nn.Conv2d(num_feat, num_out_ch * upscale * upscale, 3, 1, 1))
        self.upsampler = nn.PixelShuffle(upscale)

    def forward(self, x):
        out = x
        for m in self.body:
            out = m(out)
        out = self.upsampler(out)
        base = F.interpolate(x, scale_factor=self.upscale, mode='nearest')
        return out + base


torch.set_num_threads(os.cpu_count())
model = SRVGGNetCompact()
sd = torch.load(sys.argv[4], map_location='cpu')
sd = sd.get('params', sd.get('params_ema', sd))
model.load_state_dict(sd, strict=True)
model.eval()


def enhance(img, tile=320, pad=12):
    x = torch.from_numpy(img).permute(2, 0, 1).float().unsqueeze(0) / 255.0
    _, _, h, w = x.shape
    out = torch.zeros(1, 3, h * 4, w * 4)
    for y in range(0, h, tile):
        for xx in range(0, w, tile):
            y0, y1 = max(0, y - pad), min(h, y + tile + pad)
            x0, x1 = max(0, xx - pad), min(w, xx + tile + pad)
            with torch.no_grad():
                o = model(x[:, :, y0:y1, x0:x1])
            oy, ox = (y - y0) * 4, (xx - x0) * 4
            th, tw = min(tile, h - y) * 4, min(tile, w - xx) * 4
            out[:, :, y * 4:y * 4 + th, xx * 4:xx * 4 + tw] = o[:, :, oy:oy + th, ox:ox + tw]
    return (out.clamp(0, 1).squeeze(0).permute(1, 2, 0).numpy() * 255).round().astype(np.uint8)


src, dst, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.png'))):
    o = os.path.join(dst, os.path.basename(f))
    if os.path.exists(o):
        continue
    t = time.time()
    img = np.array(Image.open(f).convert('RGB'))
    up = Image.fromarray(enhance(img)).resize((target, target), Image.LANCZOS)
    up.save(o)
    print(os.path.basename(f), up.size, f'{time.time() - t:.0f}s', flush=True)
print('DONE')
