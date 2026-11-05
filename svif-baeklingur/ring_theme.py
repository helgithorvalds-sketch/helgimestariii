"""Miðarnir í hringnum á bls. 3 í litum hvers fyrirtækis (sama uppsetning og aftast)."""
import os
import midar3 as m
D = os.path.dirname(os.path.abspath(__file__))
THEME = {  # bakgrunnur, texti, áherslulitur, dökk merki?
    'parki':    ('#E2671E', '#FFFFFF', '#FFE2CC', False),
    'ispan':    ('#0F2F5C', '#FFFFFF', '#7FD3DA', False),
    'ormsson':  ('#141414', '#FFFFFF', '#E0263F', False),
    'maus':     ('#141416', '#FFFFFF', '#FF5A5F', False),
    'sticker':  ('#1F8C8E', '#FFFFFF', '#D2F1F0', False),
    'gardinur': ('#EAE2D4', '#3B2F24', '#8A6A3F', True),
}
fonts = open(os.path.join(D, 'fonts.css')).read()
css = m.CSS
body = ''
for k, (bg, ink, acc, dark) in THEME.items():
    inner = m.midi(k)
    if not dark:
        inner = inner.replace('dokkmerki/', 'hvit/')
    r, g, b = int(bg[1:3], 16), int(bg[3:5], 16), int(bg[5:7], 16)
    inner = inner.replace('rgba(236,229,216,0)', f'rgba({r},{g},{b},0)').replace(m.PANEL, bg)
    css += (f'#{k}{{color:{ink}}}#{k} .ey,#{k} .sm{{color:{acc}!important}}#{k} .lead{{color:{ink}!important;opacity:.9}}'
            f'#{k} .foot{{color:{ink}!important;opacity:.75}}#{k} .foot b{{color:{ink}!important}}#{k} .tag{{border-color:{ink}!important;color:{ink}}}')
    body += f'<div id="{k}" class="mi" style="position:relative;display:inline-block;margin:6mm;background:{bg};overflow:hidden">{inner}</div>'
html = (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}*{{box-sizing:border-box}}'
        f'html,body{{margin:0;background:#777}}body{{width:220mm}}{css}</style></head><body>{body}</body></html>')
open(os.path.join(D, 'midar3_stakir_thema.html'), 'w', encoding='utf-8').write(html)
print('ok')
