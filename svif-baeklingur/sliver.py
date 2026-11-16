"""Hvítar flísar sem gætu sést ef skurður hliðrast um allt að 1 mm: í 12 px rétt utan við skurð (blæðing),
pixlar > 235 þar sem jaðarlína skurðarins er < 170. Tilkynnir glugga (30 px) þar sem >50 % eru slíkir."""
import sys, pymupdf, io, numpy as np
from PIL import Image
doc = pymupdf.open(sys.argv[1]); T0, M = 35, 12; n_bad = 0
for i, p in enumerate(doc):
    info = doc.extract_image(p.get_images()[0][0]); a = np.asarray(Image.open(io.BytesIO(info['image'])).convert('L')).astype(float)
    T1 = a.shape[0] - T0; out = []
    for nm, band, edge in (('efst', a[T0 - M:T0, T0:T1], a[T0, T0:T1]), ('neðst', a[T1:T1 + M, T0:T1], a[T1 - 1, T0:T1]),
                           ('vinstri', a[T0:T1, T0 - M:T0].T, a[T0:T1, T0]), ('hægri', a[T0:T1, T1:T1 + M].T, a[T0:T1, T1 - 1])):
        s = ((band > 235) & (edge[None, :] < 170)).any(axis=0).astype(float)
        win = np.convolve(s, np.ones(30) / 30, mode='same')
        if win.max() > 0.5:
            idx = np.where(win > 0.5)[0]; out.append(f'{nm} {idx[0] + T0}–{idx[-1] + T0} px')
    if out: n_bad += 1; print(f'bls. {i + 1:2d}: hvít flís í blæðingu: ' + ', '.join(out))
print('síður með hvítar flísar við skurð:', n_bad, 'af', len(doc))
