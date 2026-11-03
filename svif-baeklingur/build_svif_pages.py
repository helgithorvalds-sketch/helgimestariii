"""Yfirlit (bls. 2) og Afsláttarmiðar-kynning (bls. 3) með nýrri síðuröð: MJ Lausnir út, fjórir miðar."""
from dcbuild import build

G = '#9C8066'
def bls(n): return f'<span style="color: {G}; font-weight: 500">bls. {n}</span>'
def body(items): return '<br>'.join(f'{a} · {bls(n)}' for a, n in items)

old = [  # (titill, línur) eins og í Yfirlit.dc.html eftir litaskipti
    ('Þak &amp; efni', [('Múrbúðin', 2), ('Fagafl', 3), ('Áltak', 4)]),
    ('Gluggar &amp; hurðir', [('Gluggavinir', 5), ('Gardínur', 6), ('KORA', 7), ('sticker.is', 8)]),
    ('Eldhús &amp; tæki', [('HTH', 11), ('Ormsson', 12)]),
    ('Múr &amp; málun', [('Litamálun', 13), ('Steindi', 14), ('más', 15)]),
    ('Lásar &amp; tryggingar', [('lásar.is', 19), ('VÍS', 20)]),
    ('Bað &amp; lagnir', [('HK Lagnir', 16), ('Baðlínan', 17), ('Stífluþjónustan', 18)]),
    ('Garður &amp; pottur', [('Heitirpottar.is', 21)]),
    ('Rafmagn &amp; rafbíll', [('Straumlind', 9), ('Ísorka', 10)]),
    ('Gólf &amp; flísar', [('Parki', 22), ('Heit gólf', 23), ('MS lagnir', 24), ('MJ Lausnir', 25)]),
]
# ný 28 síðna röð (1-miðuð blaðsíðunúmer)
new = [
    ('Múr &amp; málun', [('Litamálun', 16), ('Múrbúðin', 17), ('Steindi', 18)]),
    ('Gluggar &amp; gler', [('Íspan', 7), ('Gluggavinir', 14), ('Gardínur', 15)]),
    ('Eldhús &amp; tæki', [('HTH', 10), ('Ormsson', 11)]),
    ('Þjónusta &amp; filmur', [('sticker.is', 8), ('KORA', 9)]),
    ('Lásar &amp; tryggingar', [('lásar.is', 22), ('VÍS', 23)]),
    ('Bað &amp; lagnir', [('HK Lagnir', 20), ('Steindi', 19)]),
    ('Eldvarnir', [('Maus', 12)]),
    ('Rafmagn &amp; rafbíll', [('Straumlind', 4), ('Ísorka', 5), ('RÓM Verk', 24)]),
    ('Gólf &amp; flísar', [('Parki', 6), ('Heit gólf', 21)]),
]
# í prentuðu útgáfunni: Þjónusta & filmur er 3. hópur vinstra megin (top 514) og Eldhús 4. (top 576)
new[2], new[3] = new[3], new[2]
edits = []
for i, ((ot, ob), (nt, nb)) in enumerate(zip(old, new)):
    edits.append((f'>{ot}</div>', f'>@@T{i}@@</div>'))
    edits.append((body(ob), f'@@B{i}@@'))
for i, (nt, nb) in enumerate(new):
    edits.append((f'@@T{i}@@', nt))
    edits.append((f'@@B{i}@@', body(nb)))
# Gólf & flísar: neðar svo það rekist ekki á Rafmagn (3 línur), eins og í prentuðu útgáfunni
edits.append(('left: 626px; width: 140px; top: 566px', 'left: 626px; width: 140px; top: 601px'))
edits.append(('<path d="M616,574 H460 V554 H395"></path>', '<path d="M616,609 H592 V574 H460 V554 H395"></path>'))
edits.append(('<circle cx="616" cy="574" r="3.2"></circle>', '<circle cx="616" cy="609" r="3.2"></circle>'))
edits.append(('24 fyrirtæki · svif.is', '19 fyrirtæki · svif.is'))
build('Yfirlit', 'yfirlit.html', edits)

build('Afslaettir', 'afslaettir.html', [
    ('Sex fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.', 'Fjögur fyrirtæki í bókinni bjóða nýjum húseigendum afslátt.'),
    ('alt="Sex afsláttarmiðar í hring: Parki, Íspan, Ormsson, sticker.is, gardinur.is og Maus" style="position: relative; width: 670px; height: 454px; display: block"',
     'alt="Fjórir afsláttarmiðar í hring: Parki, Íspan, Ormsson og Maus" style="position: relative; width: 690px; height: 454px; display: block; object-fit: contain"'),
], blobs={'4a5740764184436a45fbefedb470dc83': 'out/ring_crop.png'})
