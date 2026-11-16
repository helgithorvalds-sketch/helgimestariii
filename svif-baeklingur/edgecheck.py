"""Leitar að hvítum röndum og þunnum línum (skurðarmerkjum) við skurð á öllum síðum prent-PDF.
Fyrir hverja hlið: meðalbirta hverrar línu (raðar/dálks) 0..95 px inn frá kanti (= blæðing 3 mm + 5 mm inn fyrir skurð),
borin saman við miðgildi nágranna; stökk > 22 = grunsamleg lína. Einnig: hvítt (>245) í blæðingu þar sem innra er ekki hvítt."""
import sys, pymupdf, numpy as np
from PIL import Image
doc = pymupdf.open(sys.argv[1]); D = 95; bad = 0
for i, p in enumerate(doc):
    info = doc.extract_image(p.get_images()[0][0]); im = Image.open(__import__('io').BytesIO(info['image'])).convert('L')
    a = np.asarray(im).astype(float); n = a.shape[0]; c0, c1 = n // 6, 5 * n // 6
    sides = {'efst': a[:D, c0:c1].mean(1), 'neðst': a[::-1][:D, c0:c1].mean(1),
             'vinstri': a[c0:c1, :D].mean(0), 'hægri': a[c0:c1, ::-1][:, :D].mean(0)}
    msgs = []
    for nm, prof in sides.items():
        # thin-line detector: deviation from local median (window 9) of the profile
        pad = np.pad(prof, 4, mode='edge'); med = np.array([np.median(pad[k:k + 9]) for k in range(len(prof))])
        dev = np.abs(prof - med); hits = [k for k in range(len(prof)) if dev[k] > 22]
        if hits: msgs.append(f'{nm}: lína {hits[0]}–{hits[-1]} px frá kanti (frávik {dev.max():.0f})')
        inner = prof[45:D].mean()
        if prof[:40].max() > 245 and inner < 225: msgs.append(f'{nm}: hvítt í blæðingu (innra {inner:.0f})')
    if msgs: bad += 1; print(f'bls. {i+1:2d}: ' + '; '.join(msgs))
print('síður með ábendingu:', bad, 'af', len(doc))

# Skurðarmerki / hvít spássía í hornum: í hverju horni (0..140 px) – ef >40 % pixla eru næstum hvítir
# en síðan sjálf (180..400 px inn) er ekki hvít, eða ef þunnar dökkar línur liggja á hvítum grunni.
bad2 = 0
for i, p in enumerate(doc):
    info = doc.extract_image(p.get_images()[0][0]); a = np.asarray(Image.open(__import__('io').BytesIO(info['image'])).convert('L')).astype(float)
    n = a.shape[0]; K = 140; msgs = []
    for nm, (ys, xs) in {'efst-vinstri': (slice(0, K), slice(0, K)), 'efst-hægri': (slice(0, K), slice(n - K, n)),
                         'neðst-vinstri': (slice(n - K, n), slice(0, K)), 'neðst-hægri': (slice(n - K, n), slice(n - K, n))}.items():
        c = a[ys, xs]; white = (c > 245).mean()
        dark_on_white = ((c < 120).mean() > 0.003) and white > 0.5
        if white > 0.4 and dark_on_white: msgs.append(f'{nm}: dökkar línur á hvítu (skurðarmerki?) hvítt {white:.0%}')
    for nm, band in {'efst': a[:35, n//4:3*n//4], 'neðst': a[n-35:, n//4:3*n//4], 'vinstri': a[n//4:3*n//4, :35], 'hægri': a[n//4:3*n//4, n-35:]}.items():
        if (band > 245).mean() > 0.9:
            ref = {'efst': a[180:400, n//4:3*n//4], 'neðst': a[n-400:n-180, n//4:3*n//4], 'vinstri': a[n//4:3*n//4, 180:400], 'hægri': a[n//4:3*n//4, n-400:n-180]}[nm]
            if (ref > 245).mean() < 0.6: msgs.append(f'{nm}: blæðing hvít en síðan ekki')
    if msgs: bad2 += 1; print(f'bls. {i+1:2d}: ' + '; '.join(msgs))
print('síður með horn-/spássíuábendingu:', bad2, 'af', len(doc))
