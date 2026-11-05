"""SVIF afsláttarmiðar 2 x 2 neðst á síðu (bls. 29, hægri síða, kjölur vinstra megin).

Síðan er 200 x 200 mm með 3 mm blæði (skurður 194 x 194 mm).
Hver miði er 92 x 50 mm og þeir liggja þétt saman, ekkert bil á milli.
Rifgötun, heilar línur sem prentsmiðjan keyrir í gegnum allt blaðið (mælt frá skurðbrún):
  lóðréttar: 10 mm frá kili og 102 mm frá kili
  láréttar: 94 mm og 144 mm frá efri brún
Neðsta röðin endar í neðri skurðbrún og hægri dálkurinn í ytri skurðbrún.
Líka: auð síða (bakhlið miðanna), Kærar þakkir og laus auglýsingapláss, öll á línpappír kápunnar.
"""
import os

D = os.path.dirname(os.path.abspath(__file__))
B = 3.0
W, H = 92.0, 50.0
SPINE = 10.0
X0 = B + SPINE            # 13: vinstri brún miða (rifgötun við kjöl)
X1 = X0 + W               # 105: rifgötun milli dálka
Y0 = B + 94.0             # 97: efri brún miða
Y1 = Y0 + H               # 147: milli raða
VALID = 'Gildir til 31.12.2026'

LINEN = ('background:#DFD2C1;background-image:'
         'repeating-linear-gradient(90deg,rgba(74,52,42,.06) 0,rgba(74,52,42,.06) .489mm,transparent .489mm,transparent 2.2mm),'
         'repeating-linear-gradient(0deg,rgba(255,255,255,.16) 0,rgba(255,255,255,.16) .489mm,transparent .489mm,transparent 2.2mm)')
# bakgrunnur eins og á „Af hverju SVIF?“ (ljós pappír)
PAPER = ('background:#F8F4EE;background-image:'
         'repeating-linear-gradient(90deg,rgba(74,52,42,.035) 0,rgba(74,52,42,.035) .489mm,transparent .489mm,transparent 2.2mm),'
         'repeating-linear-gradient(0deg,rgba(255,255,255,.3) 0,rgba(255,255,255,.3) .489mm,transparent .489mm,transparent 2.2mm)')
INK, COCOA, GOLD = '#4A342A', '#7D5A44', '#9C8066'

CSS = '''
@page{size:200mm 200mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:200mm;height:200mm;overflow:hidden}
body{position:relative;font-family:"Open Sans",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tile{position:absolute;overflow:hidden}
.core{position:absolute;top:0;width:92mm;height:50mm}
.ph{position:absolute;top:0;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ey{font-family:Montserrat;font-weight:700;font-size:5.6pt;letter-spacing:.13em;text-transform:uppercase;line-height:1.2}
.big{font-family:Montserrat;font-weight:800;line-height:.88;letter-spacing:-.025em}
.big small{display:block;font-size:7.6pt;letter-spacing:.17em;font-weight:800;margin-top:1mm;text-transform:uppercase}
.lead{font-family:Montserrat;font-weight:700;font-size:6.6pt;line-height:1.27}
.foot{position:absolute;bottom:5mm;display:flex;flex-direction:column;gap:.35mm;font-size:5.9pt;line-height:1.2;white-space:nowrap}
.foot .web{font-family:Montserrat;font-weight:800;font-size:7.4pt}
.tag{position:absolute;font-family:Montserrat;font-weight:800;font-size:5.6pt;letter-spacing:.16em;padding:.85mm 1.7mm;border-radius:.7mm;line-height:1.1}
.perf{position:absolute;left:0;top:0;width:200mm;height:200mm;pointer-events:none}
'''


def tile(x, y, ext_l, ext_r, ext_b, bg, inner, cid):
    return (f'<div class="tile" id="{cid}" style="left:{x - ext_l}mm;top:{y}mm;width:{W + ext_l + ext_r}mm;height:{H + ext_b}mm;background:{bg}">'
            f'<div class="core" style="left:{ext_l}mm">{inner(ext_l, ext_r, ext_b)}</div></div>')


def parki(el, er, eb):
    h = H + eb
    return (f'<div class="ph" style="left:-{el}mm;width:{40 + el}mm;height:{h}mm;clip-path:polygon(0 0,{31 + el}mm 0,{40 + el}mm 25mm,{31 + el}mm 50mm,0 50mm)">'
            '<img src="myndir/parki_photo.jpg" alt="" style="object-position:30% 50%"></div>'
            '<img src="myndir/parki_logo.png" alt="Parki Interiors" style="position:absolute;left:5mm;top:5mm;width:17mm;box-shadow:0 .5mm 1.6mm rgba(0,0,0,.3)">'
            '<div style="position:absolute;left:5mm;bottom:5mm;background:#1b1b1f;color:#fff;font-family:Montserrat;font-weight:700;font-size:5pt;letter-spacing:.14em;padding:1mm 1.8mm;text-transform:uppercase">Parki Interiors</div>'
            '<div class="tag" style="right:5mm;top:5mm;background:#f46d1e;color:#fff">SVIF</div>'
            '<div style="position:absolute;left:43mm;right:5mm;top:11mm;text-align:right;color:#1b1b1f">'
            '<div class="ey" style="color:#e8681b">Fyrir nýja húseigendur</div>'
            '<div class="big" style="font-size:25pt;margin-top:1mm">25%<small style="color:#e8681b">Afsláttur</small></div>'
            '<div class="lead" style="margin-top:1.6mm">af parketi, flísum, innihurðum, postulínsborðplötum og gólfteppum.</div></div>'
            '<div class="foot" style="right:5mm;align-items:flex-end;color:#4b4b50"><span class="web" style="color:#e8681b">parki.is</span>'
            f'<span>Lagervörur · {VALID}</span></div>')


def ispan(el, er, eb):
    h = H + eb
    return ('<div style="position:absolute;left:52.2mm;top:0;width:{w}mm;height:{h}mm;background:#008c9a;clip-path:polygon(8mm 0,100% 0,100% 100%,0 100%)"></div>'
            .format(w=40 + er + 0.1 - 0.3 + 0.2, h=h) +
            f'<div class="ph" style="left:54mm;width:{38 + er}mm;height:{h}mm;clip-path:polygon(8mm 0,100% 0,100% 100%,0 100%)"><img src="myndir/ispan_02.jpg" alt="" style="object-position:50% 45%"></div>'
            '<img src="myndir/ispan_logo.png" alt="Íspan Glerborg" style="position:absolute;left:5mm;top:5mm;height:15mm">'
            '<div class="big" style="position:absolute;left:23.5mm;top:5.6mm;font-size:25pt;color:#004785">20%<small style="color:#008c9a">Afsláttur</small></div>'
            '<div style="position:absolute;left:5mm;top:23.6mm;width:45mm;color:#004785">'
            '<div class="ey" style="color:#008c9a">Fyrir nýja húseigendur</div>'
            '<div class="lead" style="margin-top:1.1mm">af einangrunargleri, sólvarnargleri, handriðagleri, sturtugleri, lökkuðu gleri og speglum.</div></div>'
            '<div class="tag" style="right:5mm;top:5mm;background:#fff;color:#004785">SVIF</div>'
            '<div class="foot" style="left:5mm;color:#3d5f80;flex-direction:row;align-items:baseline;gap:2mm"><span class="web" style="color:#004785">ispan.is</span>'
            f'<span>54 54 300 · {VALID}</span></div>')


def ormsson(el, er, eb):
    h = H + eb
    return (f'<div class="ph" style="left:-{el}mm;width:{41.6 + el}mm;height:{h}mm;background:#c8102e;clip-path:polygon(0 0,{41.6 + el}mm 0,{33.2 + el}mm 100%,0 100%)"></div>'
            f'<div class="ph" style="left:-{el}mm;width:{40 + el}mm;height:{h}mm;clip-path:polygon(0 0,{40 + el}mm 0,{31.6 + el}mm 100%,0 100%)"><img src="myndir/aeg_kitchen.jpg" alt="" style="object-position:32% 50%"></div>'
            '<div class="tag" style="left:5mm;top:5mm;background:#fff;color:#1b1b1f">SVIF</div>'
            '<img src="myndir/ormsson_logo_dark.png" alt="Ormsson" style="position:absolute;left:44mm;top:6.3mm;width:25mm">'
            '<div style="position:absolute;right:5mm;top:4.6mm;width:7mm;height:7mm;background:#c8102e;border-radius:.9mm;display:flex;align-items:center;justify-content:center"><img src="myndir/hth_mark_white.png" alt="HTH" style="width:5.2mm;display:block"></div>'
            '<div style="position:absolute;left:44mm;right:5mm;top:14.6mm;color:#1b1b1f">'
            '<div class="ey" style="color:#c8102e">Fyrir nýja húseigendur</div>'
            '<div class="big" style="font-size:24pt;margin-top:1mm">20%<small style="color:#c8102e">Afsláttur</small></div>'
            '<div class="lead" style="margin-top:1.4mm">af AEG heimilistækjum og HTH innréttingum.</div></div>'
            '<div class="foot" style="left:44mm;color:#4b4b50"><span class="web" style="color:#1b1b1f">ormsson.is</span>'
            f'<span>Lágmúla 8 · {VALID}</span></div>')


def maus(el, er, eb):
    h = H + eb
    return ('<div style="position:absolute;left:31mm;top:-14mm;width:5.5mm;height:90mm;background:#d9252b;transform:rotate(20deg)"></div>'
            '<div style="position:absolute;left:38.6mm;top:-14mm;width:1.8mm;height:90mm;background:#d9252b;opacity:.6;transform:rotate(20deg)"></div>'
            f'<div class="ph" style="left:0;width:34mm;height:{h}mm;clip-path:polygon(0 0,34mm 0,{34 - 18.2:.1f}mm 100%,0 100%)"><img src="myndir/maus_hand.jpg" alt="" style="object-position:45% 40%"></div>'
            '<img src="myndir/maus_logo_white.png" alt="Maus" style="position:absolute;left:44mm;top:5.4mm;width:23mm">'
            '<div class="tag" style="right:5mm;top:5.4mm;background:#fff;color:#d9252b">SVIF</div>'
            '<div style="position:absolute;left:44mm;right:5mm;top:15.4mm;color:#fff">'
            '<div class="ey" style="color:#ff6b70">Fyrir nýja húseigendur</div>'
            '<div class="big" style="font-size:24pt;margin-top:1mm">20%<small style="color:#ff6b70">Afsláttur</small></div>'
            '<div class="lead" style="margin-top:1.4mm">af öllum vörum Maus.</div></div>'
            '<div class="foot" style="left:44mm;color:#d4d4d8"><span class="web" style="color:#fff">maus.is</span>'
            f'<span>780 2200 · {VALID}</span></div>')


def perf():
    g = []
    for y in (Y0, Y1):
        g.append(f'<line x1="0" y1="{y}" x2="200" y2="{y}"/>')
    for x in (X0, X1):
        g.append(f'<line x1="{x}" y1="{Y0}" x2="{x}" y2="200"/>')
    s = ''.join(g)
    return ('<svg class="perf" viewBox="0 0 200 200" aria-hidden="true">'
            f'<g stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.85">{s}</g>'
            f'<g stroke="#5b4a3e" stroke-width="0.26" stroke-dasharray="1.4 1.0">{s}</g></svg>')


def svif(pt):
    return (f'<span style="display:inline-flex;align-items:flex-end;font-family:\'Archivo Black\',sans-serif;font-size:{pt}pt;letter-spacing:-.02em;line-height:1;color:{INK}">'
            f'<span>SV</span><span style="position:relative;display:inline-block"><svg width="{pt * .55:.2f}pt" height="{pt * .3:.2f}pt" viewBox="0 0 22 12" style="position:absolute;left:50%;top:-{pt * .42:.2f}pt;transform:translateX(-50%)">'
            f'<path d="M1 11 L11 1 L21 11" fill="none" stroke="{GOLD}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>I</span><span>F</span></span>')


def frame(path):
    return (f'<svg viewBox="0 0 200 200" style="position:absolute;left:0;top:0;width:200mm;height:200mm" aria-hidden="true">'
            f'<path d="{path}" fill="none" stroke="{COCOA}" stroke-width="0.3" opacity="0.8"/></svg>')


def page(body, bg=None):
    fonts = open(os.path.join(D, 'fonts.css')).read()
    return (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}{CSS}</style></head>'
            f'<body><div style="position:absolute;inset:0;{bg or LINEN}"></div>{body}</body></html>')


def midar():
    # haus: í tveimur dálkum svo rifgötunin (x = 105 mm) fari ekki í gegnum textann
    head = (f'<div style="position:absolute;left:{X0 + 6}mm;width:{X1 - X0 - 12}mm;top:{B + 30}mm;color:{INK}">'
            f'<div style="font-family:Jost;font-size:6.6pt;letter-spacing:.32em;text-transform:uppercase;color:{COCOA}">SVIF · Sértilboð</div>'
            f'<div style="font-family:\'Bodoni Moda\',serif;font-weight:500;font-size:25pt;line-height:1.02;letter-spacing:-.01em;margin-top:2mm">Afsláttarmiðar</div>'
            f'<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:17pt;line-height:1.1;color:{GOLD};margin-top:1mm">fyrir nýja húseigendur</div></div>'
            f'<div style="position:absolute;left:{X1 + 6}mm;width:{197 - 7 - X1 - 6}mm;top:{B + 33.5}mm;font-family:Jost;font-size:8.2pt;line-height:1.5;color:{COCOA}">'
            'Rífðu miðann úr eftir rifgötuninni og framvísaðu honum, eða nefndu SVIF þegar þú hefur samband. '
            'Hver miði gildir einu sinni. Tilboðin gilda til 31. des. 2026.</div>')
    tiles = (tile(X0, Y0, X0, 0, 0, '#ffffff', parki, 'parki') +
             tile(X1, Y0, 0, B, 0, '#ffffff', ispan, 'ispan') +
             tile(X0, Y1, X0, 0, B, '#ffffff', ormsson, 'ormsson') +
             tile(X1, Y1, 0, B, B, '#16161a', maus, 'maus'))
    top_frame = frame('M9.35,80 V9.35 H190.65 V80')
    return page(top_frame + head + tiles + perf(), PAPER)


def aud():
    return page('')


FYRIRTAEKI = ['Straumlind', 'Ísorka', 'Parki Interiors', 'Íspan Glerborg', 'Sticker.is', 'KORA', 'HTH', 'Ormsson', 'Maus',
              'Gluggavinir', 'Gardínur.is', 'Litamálun', 'Múrbúðin', 'HK Lagnir', 'Lásar.is', 'VÍS', 'RÓM Verk']


def thakkir():
    items = ''.join(f'<div style="width:38mm">{n}</div>' for n in FYRIRTAEKI)
    body = (frame('M99.8,9.35 H190.65 V190.65 H9.35 V136.9') +
            '<div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:' + INK + '">'
            f'<div style="font-family:Jost;font-size:6.8pt;letter-spacing:.34em;text-transform:uppercase;color:{COCOA}">Velkomin heim</div>'
            '<div style="font-family:\'Bodoni Moda\',serif;font-weight:500;font-size:40pt;line-height:1;letter-spacing:-.02em;text-transform:uppercase;margin-top:4mm">Kærar</div>'
            f'<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:500;font-size:42pt;line-height:.95;color:{GOLD}">þakkir</div>'
            f'<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:13.5pt;line-height:1.3;color:{INK};margin-top:4mm;max-width:118mm">'
            'til allra fyrirtækjanna sem taka þátt í bókinni og bjóða nýjum húseigendum sérkjör.</div>'
            f'<div style="width:14mm;height:.3mm;background:{GOLD};margin:6mm 0 5.5mm"></div>'
            f'<div style="display:flex;flex-wrap:wrap;justify-content:center;width:152mm;row-gap:2.3mm;font-family:Jost;font-size:8.6pt;letter-spacing:.04em;color:{COCOA}">{items}</div>'
            f'<div style="margin-top:9mm">{svif(15)}</div>'
            f'<div style="font-family:Jost;font-size:6.4pt;letter-spacing:.34em;text-transform:uppercase;color:{INK};opacity:.8;margin-top:2mm">svif.is</div>'
            '</div>')
    return page(body)


def laust(n):
    body = (frame('M9.35,9.35 H190.65 V190.65 H9.35 Z') +
            f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:{COCOA};text-align:center">'
            f'<div style="font-family:Jost;font-size:7pt;letter-spacing:.34em;text-transform:uppercase">Laust auglýsingapláss · {n}</div>'
            f'<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-weight:600;font-size:20pt;color:{INK};margin-top:3mm">Auglýsing kemur hér</div></div>')
    return page(body)


if __name__ == '__main__':
    for name, html in [('midar2_framhlid', midar()), ('aud', aud()), ('thakkir', thakkir()),
                       ('laust1', laust(1)), ('laust2', laust(2)), ('laust3', laust(3))]:
        open(os.path.join(D, name + '.html'), 'w', encoding='utf-8').write(html)
        print('skrifaði', name)
