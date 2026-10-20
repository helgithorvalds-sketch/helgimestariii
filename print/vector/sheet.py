import io
import sys

import pymupdf
from PIL import Image

S = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad'


def pdfim(n):
    return Image.open(io.BytesIO(pymupdf.open(f'{S}/vec/pdf/{n}.pdf')[0].get_pixmap(dpi=65, alpha=False).tobytes('png'))).resize((500, 500))


names = sys.argv[2:]
ims = [pdfim(n) for n in names]
out = Image.new('RGB', (510 * len(ims) - 10, 500), 'white')
for i, im in enumerate(ims):
    out.paste(im, (i * 510, 0))
out.save(sys.argv[1])
