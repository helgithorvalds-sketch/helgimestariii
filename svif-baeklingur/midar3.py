"""Afsláttarmiðar í útliti kápunnar: dökkur espresso-grunnur, mild ljósmynd vinstra megin, hvít merki, Inter.

midi(c, el, er, eb) skilar innihaldi eins miða (92 x 50 mm) með framlengingu út í blæðingu/kjöl.
Keyrt beint: býr til miðasíðuna (bls. 29) og stakar miðamyndir (fyrir hringinn á bls. 3 og tölvupósta).
"""
import os

import midar2 as m2
from dokk import bg as dokk_bg

D = os.path.dirname(os.path.abspath(__file__))
W, H = m2.W, m2.H
PANEL = '#ECE5D8'
SAND = '#D8CCB6'
VALID = 'Gildir til 31.12.2026'

C = {
    'parki': dict(logo='dokkmerki/parki.png', logo_h=7.2, photo='myndir/parki_photo.jpg', pos='30% 50%', big='25%', small='Afsláttur',
                  lead='af parketi, flísum, innihurðum, postulínsborðplötum og gólfteppum.', web='parki.is', info='Lagervörur'),
    'ispan': dict(logo='dokkmerki/ispan.png', logo_h=7.4, photo='myndir/ispan_02.jpg', pos='50% 45%', big='20%', small='Afsláttur',
                  lead='af einangrunar-, sólvarnar-, handriða- og sturtugleri, lökkuðu gleri og speglum.', web='ispan.is', info='54 54 300'),
    'ormsson': dict(logo='dokkmerki/ormsson.png', logo_h=3.0, hth=True, photo='myndir/aeg_kitchen.jpg', pos='32% 50%', big='20%', small='Afsláttur',
                    lead='af AEG heimilistækjum og HTH innréttingum.', web='ormsson.is', info='Lágmúla 8'),
    'maus': dict(logo='dokkmerki/maus.png', logo_h=4.4, photo='myndir/maus_hand.jpg', pos='45% 40%', big='20%', small='Afsláttur',
                 lead='af öllum vörum Maus.', web='maus.is', info='780 2200'),
    'sticker': dict(logo='dokkmerki/sticker.png', logo_h=4.6, photo='myndir/sticker_window.png', pos='50% 50%', big='25%', small='Afsláttur',
                    lead='af filmum og uppsetningu. Frí mæling heim.', web='sticker.is', info='775 2945'),
    'gardinur': dict(logo='dokkmerki/gardinur.png', logo_h=6.0, photo='myndir/gardinur_photo.png', pos='60% 50%', big='Frí', small='Mátaka heim',
                     lead='Frí mátaka heim til þín og frí sýnishorn.', web='gardinur.is', info='519 6888'),
}

CSS = '''
.mi{position:absolute;top:0;width:92mm;height:50mm;color:#2E2A22;font-family:Inter,sans-serif}
.mi *{font-family:Inter,sans-serif!important}
.mi .ph{position:absolute;top:0;overflow:hidden}
.mi .ph img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.6) sepia(.16) brightness(.97) contrast(1.02)}
.mi .fade{position:absolute;top:0;height:100%}
.mi .ey{font-size:5.3pt;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#7A6650}
.mi .big{font-weight:200;font-size:29pt;line-height:.9;letter-spacing:.01em}
.mi .sm{font-weight:400;font-size:5.6pt;letter-spacing:.28em;text-transform:uppercase;color:#7A6650;margin-top:1.3mm}
.mi .lead{font-weight:300;font-size:6.5pt;line-height:1.38;color:rgba(46,40,32,.88);margin-top:2mm}
.mi .foot{position:absolute;display:block;bottom:4.4mm;font-size:5.6pt;letter-spacing:.04em;color:rgba(46,40,32,.66);white-space:nowrap}
.mi .foot b{font-weight:500;font-size:6.6pt;letter-spacing:.06em;color:#2E2A22;margin-right:1.6mm}
.mi .tag{position:absolute;right:4.6mm;top:4.4mm;border:.2mm solid rgba(46,40,32,.6);padding:.6mm 1.5mm;font-size:5pt;font-weight:500;letter-spacing:.24em;line-height:1}
'''


def midi(key, el=0.0, er=0.0, eb=0.0):
    c = C[key]
    h = H + eb
    PW = 37.0       # breidd myndar innan miðans
    X = 41.5        # texti byrjar
    hth = ('<img src="dokkmerki/hth.png" alt="HTH" style="height:3.6mm;margin-left:2.2mm;vertical-align:middle">' if c.get('hth') else '')
    return (f'<div class="ph" style="left:-{el}mm;width:{PW + el}mm;height:{h}mm"><img src="{c["photo"]}" alt="" style="object-position:{c["pos"]}"></div>'
            f'<div class="fade" style="left:{PW - 14}mm;width:14.2mm;background:linear-gradient(90deg,rgba(236,229,216,0),{PANEL})"></div>'
            f'<div style="position:absolute;left:{X}mm;top:4.4mm;height:{c["logo_h"]}mm;display:flex;align-items:center">'
            f'<img src="{c["logo"]}" alt="" style="height:{c["logo_h"]}mm;display:block">{hth}</div>'
            '<div class="tag">SVIF</div>'
            f'<div style="position:absolute;left:{X}mm;right:4.6mm;top:{4.4 + max(c["logo_h"], 4.4) + 2.6}mm">'
            '<div class="ey">Fyrir nýja húseigendur</div>'
            f'<div style="display:flex;align-items:flex-end;gap:2.4mm;margin-top:1.6mm"><div class="big">{c["big"]}</div>'
            f'<div class="sm" style="margin:0 0 .7mm">{c["small"]}</div></div>'
            f'<div class="lead">{c["lead"]}</div></div>'
            f'<div class="foot" style="left:{X}mm"><b>{c["web"]}</b>{c["info"]} · {VALID}</div>')


def tile(key, x, y, el, er, eb):
    return (f'<div class="tile" style="left:{x - el}mm;top:{y}mm;width:{W + el + er}mm;height:{H + eb}mm;background:{PANEL};overflow:hidden">'
            f'<div class="mi" style="left:{el}mm">{midi(key, el, er, eb)}</div></div>')


def midasida():
    html = m2.midar()
    a = html.index('<div class="tile"')
    b = html.index('<svg class="perf"')
    tiles = (tile('parki', m2.X0, m2.Y0, m2.X0, 0, 0) + tile('ispan', m2.X1, m2.Y0, 0, m2.B, 0) +
             tile('ormsson', m2.X0, m2.Y1, m2.X0, 0, m2.B) + tile('maus', m2.X1, m2.Y1, 0, m2.B, m2.B))
    html = html[:a] + tiles + html[b:]
    return html.replace('</style>', CSS + '</style>', 1)


def stakir():
    fonts = open(os.path.join(D, 'fonts.css')).read()
    body = ''.join(f'<div id="{k}" class="mi" style="position:relative;display:inline-block;margin:6mm;background:{PANEL};overflow:hidden">{midi(k)}</div>' for k in C)
    return (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}*{{box-sizing:border-box}}'
            f'html,body{{margin:0;background:#777}}body{{width:220mm}}{CSS}</style></head><body>{body}</body></html>')


if __name__ == '__main__':
    open(os.path.join(D, 'midar3_framhlid.html'), 'w', encoding='utf-8').write(midasida())
    open(os.path.join(D, 'midar3_stakir.html'), 'w', encoding='utf-8').write(stakir())
    print('ok')
