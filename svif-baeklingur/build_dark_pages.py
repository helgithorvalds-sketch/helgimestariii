import build_svif_pages as b
from darkdc import build
build('Yfirlit', 'yfirlit_dark.html', b.edits)
build('Afslaettir', 'afslaettir_dark.html', [
    ('Sex fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.', 'Fjögur fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.'),
    ('style="position: relative; width: 670px; height: 454px; display: block"', 'style="position: relative; width: 690px; height: 454px; display: block; object-fit: contain"'),
], blobs={'4a5740764184436a45fbefedb470dc83': 'out/ring_crop.png'})
build('UmSvif', 'umsvif_dark.html', [('font-size: 50px; line-height: 1; letter-spacing: -1px; color: #4A342A">Af hverju SVIF?', 'font-size: 39px; line-height: 1; letter-spacing: -1px; color: #4A342A">Af hverju SVIF?')])
