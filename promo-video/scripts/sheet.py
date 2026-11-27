# Tile QA stills into one contact sheet: python3 scripts/sheet.py out.png in1.png in2.png ... (cols via COLS env)
import os, sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
cols = int(os.environ.get('COLS', 2)); w = int(os.environ.get('W', 800))
ims = [Image.open(f).convert('RGB') for f in files]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im.resize((w, h)), (x, y + 22))
    d.text((x + 6, y + 5), os.path.basename(f), fill=(255, 255, 255))
sheet.save(out)
