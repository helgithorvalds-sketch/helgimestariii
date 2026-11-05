import build_svif_pages as b
from darkdc import build
import re
S, CX, CY = 1.1, 415.0, 490.5
def sx(v): return f'{CX + (float(v) - CX) * S:.1f}'
def sy(v): return f'{CY + (float(v) - CY) * S:.1f}'
def path(m):
    d = m.group(1); start, rest = re.match(r'(M[\d.]+,[\d.]+)(.*)', d).groups()
    rest = re.sub(r'H([\d.]+)', lambda q: 'H' + sx(q.group(1)), rest)
    rest = re.sub(r'V([\d.]+)', lambda q: 'V' + sy(q.group(1)), rest)
    return f'<path d="{start}{rest}"></path>'
def gold(m): return f'<circle cx="{sx(m.group(1))}" cy="{sy(m.group(2))}" r="4.5"></circle>'
build('Yfirlit', 'yfirlit_dark.html', list(b.edits) + [
    ('style="position: absolute; left: 215px; top: 345px; width: 400px; height: 291px; display: block"',
     f'style="position: absolute; left: {CX - 200 * S:.1f}px; top: {CY - 145.5 * S:.1f}px; width: {400 * S:.1f}px; height: {291 * S:.1f}px; display: block"')])
h = open('yfirlit_dark.html', encoding='utf-8').read()
h = re.sub(r'<path d="(M(?:206|616),[^"]*)"></path>', path, h)
h = re.sub(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="4.5"></circle>', gold, h)
open('yfirlit_dark.html', 'w', encoding='utf-8').write(h)
build('Afslaettir', 'afslaettir_dark.html', [
    ('Sex fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.', 'Fjögur fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.'),
    ('style="position: relative; width: 670px; height: 454px; display: block"', 'style="position: relative; width: 690px; height: 454px; display: block; object-fit: contain"'),
], blobs={'4a5740764184436a45fbefedb470dc83': 'out/ring_crop.png'})
build('UmSvif', 'umsvif_dark.html', [
    ('style="width: 270px; height: 192px; display: block; flex: 0 0 270px"', 'style="width: 300px; height: 213px; display: block; flex: 0 0 300px"'),
    ('<img src="/_blob/096e4e0db7105769a6f86b28d15e9d59" alt="" style="width: 62px; height: 56px; object-fit: contain; display: block">', ''),
    ('<img src="/_blob/e2dff9eafd32583e7a8764d1f8c492fb" alt="" style="width: 52px; height: 56px; object-fit: contain; display: block">', ''),
    ('<img src="/_blob/f9eaf881f43ee088ea0f35606eb32b3d" alt="" style="width: 52px; height: 56px; object-fit: contain; display: block">', ''),
('font-size: 50px; line-height: 1; letter-spacing: -1px; color: #4A342A">Af hverju SVIF?', 'font-size: 39px; line-height: 1; letter-spacing: -1px; color: #4A342A">Af hverju SVIF?')])
