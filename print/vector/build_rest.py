from prep import build


def bls(n):
    return f'<span style="color: #9C8066; font-weight: 500">bls. {n}</span>'


def grp(title, items):
    return title, '<br>'.join(f'{name} · {bls(n)}' for name, n in items)


# (title, body) pairs as they appear in Yfirlit after {{gold}} substitution
old_groups = [
    grp('Þak &amp; efni', [('Múrbúðin', 2), ('Fagafl', 3), ('Áltak', 4)]),
    grp('Gluggar &amp; hurðir', [('Gluggavinir', 5), ('Gardínur', 6), ('KORA', 7), ('sticker.is', 8)]),
    grp('Eldhús &amp; tæki', [('HTH', 11), ('Ormsson', 12)]),
    grp('Múr &amp; málun', [('Litamálun', 13), ('Steindi', 14), ('más', 15)]),
    grp('Lásar &amp; tryggingar', [('lásar.is', 19), ('VÍS', 20)]),
    grp('Bað &amp; lagnir', [('HK Lagnir', 16), ('Baðlínan', 17), ('Stífluþjónustan', 18)]),
    grp('Garður &amp; pottur', [('Heitirpottar.is', 21)]),
    grp('Rafmagn &amp; rafbíll', [('Straumlind', 9), ('Ísorka', 10)]),
    grp('Gólf &amp; flísar', [('Parki', 22), ('Heit gólf', 23), ('MS lagnir', 24), ('MJ Lausnir', 25)]),
]
# the real 26-page velkomstbók order
new_groups = [
    grp('Múr &amp; málun', [('Múrbúðin', 5), ('Litamálun', 16), ('Steindi', 17)]),
    grp('Gluggar &amp; gler', [('Gluggavinir', 6), ('Íspan', 7), ('Gardínur', 8)]),
    grp('Þjónusta &amp; filmur', [('KORA', 9), ('sticker.is', 10)]),
    grp('Eldhús &amp; tæki', [('HTH', 14), ('Ormsson', 15)]),
    grp('Lásar &amp; tryggingar', [('lásar.is', 20), ('VÍS', 21)]),
    grp('Bað &amp; lagnir', [('HK Lagnir', 19), ('Steindi', 18)]),
    grp('Eldvarnir', [('Maus', 12)]),
    grp('Rafmagn &amp; rafbíll', [('Ísorka', 11)]),
    grp('Gólf &amp; flísar', [('Parki', 22), ('Heit gólf', 23), ('MJ Lausnir', 24)]),
]
edits = []
for (ot, ob), (nt, nb) in zip(old_groups, new_groups):
    edits.append((ot + '</div>', nt + '</div>'))
    edits.append((ob, nb))
edits.append(('24 fyrirtæki · svif.is', '18 fyrirtæki · svif.is'))
build('Yfirlit', edits)
build('Afslaettir')
build('UmSvif')
build('Midar')
