#!/usr/bin/env python3
"""Make the shareable-link build of the party builder.

A hosted page can't load images from other sites, so this keeps only the
products the builder can pick, packs their thumbnails into sprite sheets and
swaps the Partyland branding for the neutral look in link-brand.html.

    python3 build_link.py            # writes dist/veislusmidur.html + dist/img/sNN.webp

Run build.py first if the catalog in index.html should be refreshed.
"""
import io, json, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'index.html')
BRAND = os.path.join(HERE, 'link-brand.html')
OUT = os.path.join(HERE, 'dist')
CACHE = os.path.join(OUT, 'thumbs')
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
os.makedirs(CACHE, exist_ok=True)

SIZE, COLS, ROWS = 112, 8, 8
PER = COLS * ROWS
KEEP_TAGS = {'diskur','glas','servíettur','hnífapar','borðdúkur','rör','borðskraut','miðpunktur',
  'tölustafa blöðrur','álblaðra','mótíf','halloween','halloween skraut','jól','nýárs','latex','blöðrubogi',
  'blöðrulóð','fánalengja','borði','konfetti','confetti','hurðagardína','honeycomb','dúskalengja',
  'pom pom','kerti','kökutoppur','axlaborði','gotteríspokar','pinata','hattur','kóróna',
  'partý sprengjur','skotglas','helium','blöðrupumpa','flokkur:bordbunadur'}
KEEP_TITLE = re.compile(r'foil balloon|álblaðra|aluminum balloon|airloonz|supershape|balloon pump|blöðrupump', re.I)

html = open(SRC, encoding='utf-8').read()
a = html.index('window.CATALOG=') + len('window.CATALOG=')
b = html.index(';/*CATALOG-END*/')
cat = json.loads(html[a:b])
tags = [t.lower() for t in cat['tags']]
rows = [r for r in cat['products']
        if any(tags[i] in KEEP_TAGS for i in r[6]) or KEEP_TITLE.search(r[1])]
print('products kept', len(rows), 'of', len(cat['products']), '| sold out', sum(1 for r in rows if len(r) > 9 and r[9] == 0))


def thumb(row):
    handle, img = row[0], row[5]
    path = os.path.join(CACHE, handle + '.png')
    if os.path.exists(path):
        return path
    url = img if img.startswith('http') else cat['cdn'] + img
    url += ('&' if '?' in url else '?') + 'width=240'
    err = None
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert('RGBA')
            bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
            im = Image.alpha_composite(bg, im).convert('RGB')
            im.thumbnail((SIZE - 8, SIZE - 8), Image.LANCZOS)
            tile = Image.new('RGB', (SIZE, SIZE), (255, 255, 255))
            tile.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
            tile.save(path)
            return path
        except Exception as e:
            err = e
    print('  no image', handle, err, file=sys.stderr)
    return None


# Products picked for the same kind of slot tend to share a sprite sheet.
order = sorted(KEEP_TAGS)
def key(r):
    first = min((order.index(tags[i]) for i in r[6] if tags[i] in KEEP_TAGS), default=len(order))
    return (first, r[8])
rows.sort(key=key)

with ThreadPoolExecutor(12) as ex:
    paths = list(ex.map(thumb, rows))

for f in os.listdir(os.path.join(OUT, 'img')):
    os.remove(os.path.join(OUT, 'img', f))
sheets, out_rows = [], []
for idx, (r, pth) in enumerate(zip(rows, paths)):
    sheet, pos = divmod(idx, PER)
    if sheet == len(sheets):
        sheets.append(Image.new('RGB', (COLS * SIZE, ROWS * SIZE), (255, 255, 255)))
    if pth:
        sheets[sheet].paste(Image.open(pth), ((pos % COLS) * SIZE, (pos // COLS) * SIZE))
    r = list(r)
    r[5] = sheet * PER + pos if pth else -1
    out_rows.append(r)
for i, s in enumerate(sheets):
    s.save(os.path.join(OUT, 'img', f's{i:02d}.webp'), 'WEBP', quality=62, method=6)

cat2 = dict(cat, products=out_rows, sprite={'cols': COLS, 'rows': ROWS, 'per': PER, 'path': 'img/s'})
blob = json.dumps(cat2, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')


def between(text, start, end):
    i, j = text.index(start), text.index(end)
    return i, j + len(end)

brand = open(BRAND, encoding='utf-8').read()
b_head = brand.split('<!--HEAD-->')[1].split('<!--CSS-->')[0].strip()
b_css = brand.split('<!--CSS-->')[1].split('<!--TOP-->')[0].strip()
b_top = brand.split('<!--TOP-->')[1].strip()

page = html
i, j = between(page, '<!--BRAND-HEAD-START-->', '<!--BRAND-HEAD-END-->'); page = page[:i] + b_head + page[j:]
i, j = between(page, '/*BRAND-CSS-START*/', '/*BRAND-CSS-END*/'); page = page[:i] + b_css + page[j:]
i, j = between(page, '<!--BRAND-TOP-START-->', '<!--BRAND-TOP-END-->'); page = page[:i] + b_top + page[j:]
a = page.index('window.CATALOG='); b = page.index(';/*CATALOG-END*/')
page = page[:a] + 'window.CATALOG=' + blob + page[b:]
# The artifact host supplies doctype/html/head/body, charset and viewport.
page = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', page, count=1, flags=re.I)
page = page.replace('</head>\n<body>\n', '\n', 1)
page = re.sub(r'</body>\s*</html>\s*$', '', page)
assert '<head>' not in page and '<body>' not in page and page.lstrip().startswith('<title>'), page[:200]

open(os.path.join(OUT, 'veislusmidur.html'), 'w', encoding='utf-8').write(page)
total = sum(os.path.getsize(os.path.join(OUT, 'img', f)) for f in os.listdir(os.path.join(OUT, 'img')))
print(f"page {os.path.getsize(os.path.join(OUT, 'veislusmidur.html'))/1e6:.2f} MB, {len(sheets)} sprite sheets {total/1e6:.2f} MB")
