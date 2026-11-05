"""SVIF-síður í útliti nýju kápunnar: dökkur, hlýr grár grunnur með ljósgeisla og korni, mjóar hvítar hornlínur, Inter."""
import os
D = os.path.dirname(os.path.abspath(__file__))
B = 3.0
# hornlínur kápunnar (mælt af kápumyndinni, umreiknað í mm á 200 mm síðu með blæði)
F = dict(x0=9.6, x1=190.3, y0=9.6, y1=190.3, a=58.0, ry=32.1, bx=132.2, ly=127.2)
GRAIN = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>"
         "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/>"
         "<feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .09 0'/></filter>"
         "<rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")")
def bg(geisli=True):
    beam = ("linear-gradient(128deg,transparent 52%,rgba(214,208,196,.16) 63%,rgba(214,208,196,.30) 72%,rgba(214,208,196,.12) 82%,transparent 92%),"
            if geisli else "")
    return (f"background-color:#4A4437;background-image:{GRAIN},{beam}"
            "radial-gradient(ellipse at 50% 40%,rgba(255,250,240,.10),transparent 65%),"
            "radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(20,16,10,.38) 100%);background-size:300px 300px,100% 100%,100% 100%,100% 100%")
def frame():
    f = F
    return (f'<svg viewBox="0 0 200 200" style="position:absolute;inset:0;width:200mm;height:200mm" aria-hidden="true">'
            f'<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".22">'
            f'<path d="M{f["x0"]},{f["a"]} V{f["y0"]} H{f["a"]}"/>'
            f'<path d="M{f["x1"]},{f["ry"]} V{f["y1"]} H{f["bx"]}"/>'
            f'<path d="M{f["x0"]},{f["ly"]} V{f["y1"]}"/></g></svg>')
def roof(w_mm=11):
    # húsþakið úr SVIF-merkinu: þak með skorsteini
    return (f'<svg viewBox="0 0 44 30" style="width:{w_mm}mm;height:{w_mm*30/44:.2f}mm;display:block" aria-hidden="true">'
            '<path d="M4 26 L22 8 L40 26" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="M30 9 V3.5 H35.5 V14.5" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>')
def rule(w=34):
    return (f'<div style="display:flex;align-items:center;gap:5mm;margin:6mm 0 6mm">'
            f'<div style="width:{w}mm;height:.22mm;background:rgba(255,255,255,.75)"></div>{roof()}'
            f'<div style="position:relative;width:{w}mm;height:.22mm;background:rgba(255,255,255,.75)">'
            '<svg viewBox="0 0 10 10" style="position:absolute;right:-.4mm;top:-1.45mm;width:3mm;height:3mm"><path d="M2 0 L8 5 L2 10" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".9"/></svg></div></div>')
def corner(txt, pos):
    st = {'tl': 'left:{l}mm;top:{t}mm', 'tr': 'right:{l}mm;top:{t}mm;text-align:right', 'bl': 'left:{l}mm;bottom:{t}mm', 'br': 'right:{l}mm;bottom:{t}mm;text-align:right', 'bc': 'left:0;right:0;bottom:{t}mm;text-align:center;letter-spacing:.32em'}[pos].format(l=B + 9.4, t=B + 11.2)
    return f'<div style="position:absolute;{st};font-family:Inter;font-weight:400;font-size:8.4pt;line-height:1.25;letter-spacing:.04em;text-transform:uppercase;color:#fff">{txt}</div>'
def page(body, geisli=True):
    fonts = open(os.path.join(D, 'fonts.css')).read()
    return (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}'
            '@page{size:200mm 200mm;margin:0}*{box-sizing:border-box}html,body{margin:0;width:200mm;height:200mm;overflow:hidden}'
            '.grunnur{position:absolute;inset:0;' + bg(geisli) + '}'
            f'</style></head><body><div class="grunnur"></div>{frame()}{body}</body></html>')

FYRIRTAEKI = ['Straumlind', 'Ísorka', 'Parki Interiors', 'Íspan Glerborg', 'Sticker.is', 'KORA', 'HTH', 'Ormsson', 'Maus',
              'Gluggavinir', 'TME Gluggar', 'Gardínur.is', 'Fagafl', 'Litamálun', 'Múrbúðin', 'HK Lagnir', 'MS Lagnir',
              'Lásar.is', 'VÍS', 'RÓM Verk']
def thakkir():
    items = ''.join(f'<div style="width:40mm">{n}</div>' for n in FYRIRTAEKI)
    body = ('<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">'
            '<div style="font-family:Inter;font-weight:200;font-size:50pt;line-height:1;letter-spacing:.06em;text-transform:uppercase;margin-top:-6mm">Kærar þakkir</div>'
            + rule(30) +
            '<div style="font-family:Inter;font-weight:300;font-size:11pt;line-height:1.6;max-width:120mm;color:rgba(255,255,255,.92)">'
            'til allra fyrirtækjanna sem taka þátt í bókinni og bjóða nýjum húseigendum sérkjör.</div>'
            '<div style="display:flex;flex-wrap:wrap;justify-content:center;width:160mm;row-gap:2.6mm;margin-top:9mm;'
            f'font-family:Inter;font-weight:400;font-size:8pt;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.86)">{items}</div></div>'
            + corner('svif.is', 'tl') + corner('2026', 'tr') + corner('Velkomin heim', 'bl') + corner('Fyrir nýja<br>húseigendur', 'br'))
    return page(body)
def aud():
    return page('', geisli=False)
def laust(n):
    body = ('<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center">'
            f'<div style="font-family:Inter;font-weight:400;font-size:8pt;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,255,255,.8)">Laust auglýsingapláss · {n}</div>'
            '<div style="font-family:Inter;font-weight:200;font-size:30pt;letter-spacing:.06em;text-transform:uppercase;margin-top:4mm">Auglýsing kemur hér</div></div>'
            + corner('svif.is', 'tl'))
    return page(body, geisli=False)
if __name__ == '__main__':
    for name, h in [('d_thakkir', thakkir()), ('d_aud', aud()), ('d_laust1', laust(1)), ('d_laust2', laust(2)), ('d_laust3', laust(3))]:
        open(os.path.join(D, name + '.html'), 'w', encoding='utf-8').write(h); print(name)
