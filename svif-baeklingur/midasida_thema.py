"""Bls. 25: afsláttarmiðarnir (sem eru rifnir úr) í litum hvers fyrirtækis."""
import os
import midar2 as m2
import midar3 as m
from ring_theme import THEME
D = os.path.dirname(os.path.abspath(__file__))

def tile(key, x, y, el, er, eb):
    bg, ink, acc, dark = THEME[key]
    inner = m.midi(key, el, er, eb)
    if not dark:
        inner = inner.replace('dokkmerki/', 'hvit/')
    r, g, b = int(bg[1:3], 16), int(bg[3:5], 16), int(bg[5:7], 16)
    inner = inner.replace('rgba(236,229,216,0)', f'rgba({r},{g},{b},0)').replace(m.PANEL, bg)
    return (f'<div class="tile" style="left:{x - el}mm;top:{y}mm;width:{m.W + el + er}mm;height:{m.H + eb}mm;background:{bg};overflow:hidden">'
            f'<div class="mi" id="t_{key}" style="left:{el}mm">{inner}</div></div>')

html = m2.midar()
a = html.index('<div class="tile"'); b = html.index('<svg class="perf"')
tiles = (tile('ispan', m2.X0, m2.Y0, m2.X0, 0, 0) + tile('parki', m2.X1, m2.Y0, 0, m2.B, 0) +
         tile('maus', m2.X0, m2.Y1, m2.X0, 0, m2.B) + tile('ormsson', m2.X1, m2.Y1, 0, m2.B, m2.B))  # speglað: Parki/Ormsson lenda vinstra megin
css = m.CSS
for k, (bg, ink, acc, dark) in THEME.items():
    css += (f'#t_{k}{{color:{ink}}}#t_{k} .ey,#t_{k} .sm{{color:{acc}!important}}#t_{k} .lead{{color:{ink}!important;opacity:.9}}'
            f'#t_{k} .foot{{color:{ink}!important;opacity:.75}}#t_{k} .foot b{{color:{ink}!important}}#t_{k} .tag{{border-color:{ink}!important;color:{ink}}}')
html = html[:a] + tiles + html[b:]
html = html.replace('</style>', css + '</style>', 1)
i = html.index('<body>') + len('<body>')
j = html.index('</div>', html.index('class="grunnur"')) + len('</div>')
html = html[:j] + '<div class="flip" style="position:absolute;inset:0;transform:scaleX(-1)">' + html[j:].replace('</body>', '</div></body>', 1)
html = html.replace('</style>', '.flip .mi{transform:scaleX(-1)}.flip>div:not(.tile){transform:scaleX(-1)}</style>', 1)
open(os.path.join(D, 'midar_thema_framhlid.html'), 'w', encoding='utf-8').write(html)
print('ok')
