"""SVIF afsláttarmiðasíða (bls. 26) og bakhlið hennar (bls. 25), 200 x 200 mm með 3 mm blæði.

Rifgötun: heilar línur þvert yfir síðuna svo prentsmiðjan geti keyrt þær í gegn.
  láréttar: 34, 74, 114 og 154 mm frá efri skurðbrún (miðað við 194 mm síðu)
  lóðrétt:  10 mm frá kili (miðar á vinstri síðu, kjölur hægra megin)
Miðarnir ná út í ytri skurðbrún og inn að kilarlínunni, enginn spássía til hliðanna.
"""
import os

D = os.path.dirname(os.path.abspath(__file__))
B = 3.0            # blæði
TRIM = 194.0
HEAD = 34.0        # hausræma
STRIP = 40.0       # hæð hvers miða
SPINE_PERF = 10.0  # lóðrétt rifgötun frá kili
LINES_Y = [B + HEAD + STRIP * k for k in range(4)]  # 37, 77, 117, 157 (í síðuhnitum með blæði)

COUPONS = [
    dict(
        id='parki', bg='#ffffff', ink='#1b1b1f', accent='#f46d1e', muted='#55555c',
        photo='myndir/parki_photo.jpg', photo_pos='28% 50%',
        logo='myndir/parki_logo.png', logo_h=10.2, logo_on_photo=True,
        name='Parki Interiors',
        pct='25%', lead='af parketi, flísum, innihurðum, postulínsborðplötum og gólfteppum.',
        terms='Gildir af lagervörum. Framvísaðu miðanum í verslun.',
        web='parki.is', contact='', tag_bg='#f46d1e', tag_fg='#ffffff',
        back_how='Framvísaðu miðanum í verslun Parki. Afslátturinn miðast við lagervörur.',
    ),
    dict(
        id='ispan', bg='#ffffff', ink='#004785', accent='#008c9a', muted='#3d5f80',
        photo='myndir/ispan_02.jpg', photo_pos='50% 45%',
        logo='myndir/ispan_logo.png', logo_h=18.5, logo_on_photo=False,
        name='Íspan Glerborg',
        pct='20%', lead='af einangrunargleri, sólvarnargleri, handriðagleri, lökkuðu gleri, sturtugleri og speglum.',
        terms='Íslensk framleiðsla eftir þínum þörfum. Smiðjuvegi 7.',
        web='ispan.is', contact='54 54 300', tag_bg='#008c9a', tag_fg='#ffffff',
        back_how='Framvísaðu miðanum hjá Íspan Glerborg, Smiðjuvegi 7, eða nefndu SVIF þegar þú hefur samband í síma 54 54 300.',
    ),
    dict(
        id='ormsson', bg='#ffffff', ink='#1b1b1f', accent='#c8102e', muted='#55555c',
        photo='myndir/aeg_kitchen.jpg', photo_pos='30% 50%',
        logo='myndir/ormsson_logo_dark.png', logo_h=3.6, logo_on_photo=False, hth=True,
        name='Ormsson · AEG og HTH',
        pct='20%', lead='af AEG heimilistækjum og HTH innréttingum.',
        terms='Lágmúla 8, Reykjavík · Norðurtorgi, Akureyri.',
        web='ormsson.is', contact='', tag_bg='#c8102e', tag_fg='#ffffff',
        back_how='Framvísaðu miðanum í verslun Ormsson í Lágmúla 8 í Reykjavík eða á Norðurtorgi á Akureyri.',
    ),
    dict(
        id='maus', bg='#16161a', ink='#ffffff', accent='#ff5a5f', muted='#c9c9cf',
        photo='myndir/maus_hand.jpg', photo_pos='45% 40%',
        logo='myndir/maus_logo_white.png', logo_h=6.2, logo_on_photo=False,
        name='MAUS · REKK Import ehf.',
        pct='20%', lead='af öllum vörum Maus.',
        terms='Hringdu í 780 2200 og nefndu heimilisfangið þitt, eða pantaðu á maus.is.',
        web='maus.is', contact='780 2200', tag_bg='#d9252b', tag_fg='#ffffff',
        back_how='Hringdu í 780 2200 og nefndu heimilisfangið þitt, eða pantaðu á maus.is og nefndu SVIF.',
    ),
]

VALID = 'Gildir til 31.12.2026'

CSS = '''
@page{size:200mm 200mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:200mm;height:200mm;overflow:hidden}
body{position:relative;font-family:"Open Sans",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.paper{position:absolute;background:#F8F4EE;
  background-image:repeating-linear-gradient(90deg,rgba(74,52,42,.035) 0,rgba(74,52,42,.035) .53mm,transparent .53mm,transparent 2.38mm),
                   repeating-linear-gradient(0deg,rgba(255,255,255,.3) 0,rgba(255,255,255,.3) .53mm,transparent .53mm,transparent 2.38mm)}
.strip{position:absolute;left:0;width:200mm;overflow:hidden}
.ph{position:absolute;top:0;height:100%;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.ey{font-family:Montserrat;font-weight:700;font-size:6.2pt;letter-spacing:.14em;text-transform:uppercase;line-height:1.2}
.pct{font-family:Montserrat;font-weight:800;font-size:33pt;line-height:.86;letter-spacing:-.03em}
.afs{font-family:Montserrat;font-weight:800;font-size:8.6pt;letter-spacing:.2em;text-transform:uppercase;margin-top:1.3mm}
.lead{font-family:Montserrat;font-weight:700;font-size:8.2pt;line-height:1.28}
.terms{font-size:6.9pt;line-height:1.35;margin-top:1.2mm}
.foot{position:absolute;display:flex;align-items:baseline;gap:2.2mm;font-size:6.6pt;white-space:nowrap}
.foot .web{font-family:Montserrat;font-weight:800;font-size:8pt}
.tag{position:absolute;font-family:Montserrat;font-weight:800;font-size:6pt;letter-spacing:.16em;padding:.9mm 1.9mm;border-radius:.8mm;line-height:1.1}
.perf{position:absolute;left:0;top:0;width:200mm;height:200mm;pointer-events:none}
'''


def svif_mark(size_pt, ink, gold):
    return (f'<span style="display:inline-flex;align-items:flex-end;font-family:\'Archivo Black\',sans-serif;font-size:{size_pt}pt;'
            f'letter-spacing:-.02em;line-height:1;color:{ink}"><span>SV</span><span style="position:relative;display:inline-block">'
            f'<svg width="{size_pt*0.5:.2f}pt" height="{size_pt*0.28:.2f}pt" viewBox="0 0 22 12" style="position:absolute;left:50%;top:-{size_pt*0.42:.2f}pt;transform:translateX(-50%)">'
            f'<path d="M1 11 L11 1 L21 11" fill="none" stroke="{gold}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>I</span><span>F</span></span>')


def perf_svg(vertical_x):
    """Strikalínur nákvæmlega þar sem rifgötunin er, heilar línur yfir alla síðuna."""
    lines = []
    for y in LINES_Y:
        lines.append(f'<line x1="0" y1="{y}" x2="200" y2="{y}"/>')
    lines.append(f'<line x1="{vertical_x}" y1="0" x2="{vertical_x}" y2="200"/>')
    return ('<svg class="perf" viewBox="0 0 200 200" aria-hidden="true">'
            '<g stroke="#ffffff" stroke-width="0.55" stroke-opacity="0.85">' + ''.join(lines) + '</g>'
            '<g stroke="#5b4a3e" stroke-width="0.28" stroke-dasharray="1.4 1.0">' + ''.join(lines) + '</g></svg>')


def strip_top(k):
    return LINES_Y[k]


def coupon(c, k):
    top = strip_top(k)
    h = STRIP + (B if k == 3 else 0)
    pad_t = 5.2  # frá rifgötun að efni
    x_ph_r = 60.0
    x_mid = 66.0
    x_det = 120.0
    x_end = 181.5   # síðasti punktur efnis (perf er í 187)
    parts = []
    clip = f'polygon(0 0,{x_ph_r}mm 0,{x_ph_r - 7}mm 100%,0 100%)'
    parts.append(f'<div class="ph" style="left:0;width:{x_ph_r}mm;clip-path:{clip}"><img src="{c["photo"]}" alt="" style="object-position:{c["photo_pos"]}"></div>')
    if c['id'] == 'ormsson':
        parts.insert(0, f'<div class="ph" style="left:0;width:{x_ph_r + 1.4}mm;background:{c["accent"]};clip-path:polygon(0 0,{x_ph_r + 1.4}mm 0,{x_ph_r - 5.6}mm 100%,0 100%)"></div>')
    if c['id'] == 'maus':
        parts.insert(0, f'<div class="ph" style="left:0;width:{x_ph_r + 1.6}mm;background:#d9252b;clip-path:polygon(0 0,{x_ph_r + 1.6}mm 0,{x_ph_r - 5.4}mm 100%,0 100%)"></div>')
    if c['id'] == 'ispan':
        parts.insert(0, f'<div class="ph" style="left:0;width:{x_ph_r + 1.4}mm;background:#008c9a;clip-path:polygon(0 0,{x_ph_r + 1.4}mm 0,{x_ph_r - 5.6}mm 100%,0 100%)"></div>')

    if c.get('logo_on_photo'):
        parts.append(f'<img src="{c["logo"]}" alt="{c["name"]}" style="position:absolute;left:{B + 6}mm;top:{pad_t}mm;height:{c["logo_h"]}mm;box-shadow:0 .5mm 1.8mm rgba(0,0,0,.3)">')

    # miðjudálkur: merki (ef ekki á mynd) + prósenta
    mid = []
    if c['id'] == 'ispan':
        parts.append(f'<img src="{c["logo"]}" alt="Íspan Glerborg" style="position:absolute;left:{x_mid}mm;top:{(STRIP - c["logo_h"]) / 2 + 0.6}mm;height:{c["logo_h"]}mm">')
        mx = x_mid + c['logo_h'] * 1853 / 1743 + 5
        parts.append(f'<div style="position:absolute;left:{mx}mm;top:{pad_t + 1}mm;width:{x_det - mx}mm">'
                     f'<div class="ey" style="color:{c["accent"]}">Fyrir nýja húseigendur</div>'
                     f'<div class="pct" style="color:{c["ink"]};margin-top:1.6mm">{c["pct"]}</div>'
                     f'<div class="afs" style="color:{c["accent"]}">Afsláttur</div></div>')
    else:
        logo_html = ''
        if not c.get('logo_on_photo'):
            logo_html = f'<img src="{c["logo"]}" alt="{c["name"]}" style="display:block;height:{c["logo_h"]}mm;margin-bottom:2.2mm">'
        parts.append(f'<div style="position:absolute;left:{x_mid}mm;top:{pad_t}mm;width:{x_det - x_mid - 3}mm">{logo_html}'
                     f'<div class="ey" style="color:{c["accent"]}">Fyrir nýja húseigendur</div>'
                     f'<div class="pct" style="color:{c["ink"]};margin-top:1.6mm">{c["pct"]}</div>'
                     f'<div class="afs" style="color:{c["accent"]}">Afsláttur</div></div>')
    if c.get('hth'):
        parts.append(f'<div style="position:absolute;left:{x_mid + 31.5}mm;top:{pad_t - 1.7}mm;width:7mm;height:7mm;background:{c["accent"]};border-radius:.9mm;display:flex;align-items:center;justify-content:center">'
                     f'<img src="myndir/hth_mark_white.png" alt="HTH" style="width:5.2mm;display:block"></div>')

    # hægri dálkur: texti, skilmálar, vefur
    parts.append(f'<div style="position:absolute;left:{x_det}mm;width:{x_end - x_det}mm;top:{pad_t + 6.2}mm;color:{c["ink"]}">'
                 f'<div class="lead">{c["lead"]}</div>'
                 f'<div class="terms" style="color:{c["muted"]}">{c["terms"]}</div></div>')
    contact = f'<span>{c["contact"]}</span><span>·</span>' if c['contact'] and c['id'] != 'maus' else ''
    parts.append(f'<div class="foot" style="left:{x_det}mm;bottom:{(B if k == 3 else 0) + 4.6}mm;color:{c["muted"]}">'
                 f'<span class="web" style="color:{c["accent"] if c["id"] != "ispan" else c["ink"]}">{c["web"]}</span>{contact}<span>{VALID}</span></div>')
    parts.append(f'<div class="tag" style="right:{200 - x_end}mm;top:{pad_t}mm;background:{c["tag_bg"]};color:{c["tag_fg"]}">SVIF</div>')

    border = 'border-top:.2mm solid rgba(0,0,0,.08);' if c['bg'] == '#ffffff' and k > 0 else ''
    return (f'<div class="strip" id="{c["id"]}" style="top:{top}mm;height:{h}mm;background:{c["bg"]};{border}">'
            + ''.join(parts) + '</div>')


def page_front():
    ink, cocoa, gold = '#4A342A', '#7D5A44', '#9C8066'
    head = (f'<div class="paper" style="left:0;top:0;width:200mm;height:{B + HEAD}mm"></div>'
            f'<div style="position:absolute;left:{B + 6}mm;top:{B + 6.4}mm;width:96mm">'
            f'<div style="font-family:Jost;font-size:6.4pt;letter-spacing:.32em;text-transform:uppercase;color:{cocoa}">SVIF · Sértilboð</div>'
            f'<div style="font-family:Fraunces,serif;font-variation-settings:\'SOFT\' 60,\'WONK\' 1;font-weight:700;font-size:21pt;line-height:1.04;letter-spacing:-.015em;color:{ink};margin-top:1.4mm">'
            f'Afsláttarmiðar<br><span style="color:{gold}">fyrir nýja húseigendur</span></div></div>'
            f'<div style="position:absolute;left:110mm;width:{181.5 - 110}mm;top:{B + 8.2}mm;font-family:Jost;font-size:8pt;line-height:1.45;color:{cocoa};text-align:right">'
            f'Rífðu miðann úr eftir rifgötuninni og framvísaðu honum, eða nefndu SVIF þegar þú hefur samband. '
            f'Hver miði gildir einu sinni. Tilboðin gilda til 31. des. 2026.</div>')
    body = ''.join(coupon(c, k) for k, c in enumerate(COUPONS))
    return body, head, perf_svg(B + TRIM - SPINE_PERF)


def back_strip(c, k):
    """Bakhlið miða k. Hægri síða: kjölur vinstra megin, rifgötun 10 mm frá honum."""
    ink, cocoa, gold = '#4A342A', '#7D5A44', '#9C8066'
    top = strip_top(k)
    h = STRIP + (B if k == 3 else 0)
    x0 = B + SPINE_PERF + 6.5   # efni byrjar 6,5 mm frá rifgötun
    x_end = 200 - B - 7
    return (f'<div class="strip" style="top:{top}mm;height:{h}mm">'
            f'<div style="position:absolute;left:{x0}mm;top:5mm;width:{x_end - x0}mm;display:flex;justify-content:space-between;align-items:flex-start">'
            f'<div style="font-family:Jost;font-size:6.2pt;letter-spacing:.26em;text-transform:uppercase;color:{cocoa}">Bakhlið afsláttarmiða</div>'
            f'<div style="width:2.4mm;height:2.4mm;border-radius:50%;background:{c["tag_bg"]}"></div></div>'
            f'<div style="position:absolute;left:{x0}mm;top:9.6mm;width:86mm">'
            f'<div style="font-family:Fraunces,serif;font-variation-settings:\'SOFT\' 60,\'WONK\' 1;font-weight:700;font-size:14pt;line-height:1.1;color:{ink}">{c["name"]}</div>'
            f'<div style="font-family:Jost;font-size:8pt;line-height:1.4;color:{cocoa};margin-top:1.3mm">{c["pct"]} afsláttur {c["lead"]}</div>'
            f'<div style="font-family:Jost;font-size:7.2pt;line-height:1.4;color:{cocoa};margin-top:1.2mm">{c["back_how"]}</div></div>'
            f'<div style="position:absolute;left:{x0 + 92}mm;width:{x_end - x0 - 92}mm;top:10.4mm;font-family:Jost;font-size:7pt;line-height:1.45;color:{cocoa}">'
            f'<div style="font-weight:600;color:{ink}">{VALID}</div><div>Hver miði gildir einu sinni.</div><div>{c["web"]}</div>'
            f'<div style="margin-top:2.6mm;display:grid;grid-template-columns:auto 1fr;column-gap:1.6mm;row-gap:2.2mm;align-items:end">'
            f'<span>Dags.</span><span style="border-bottom:.2mm solid {gold};height:3mm"></span>'
            f'<span>Afgreitt af</span><span style="border-bottom:.2mm solid {gold};height:3mm"></span></div></div>'
            '</div>')


def page_back():
    ink, cocoa, gold = '#4A342A', '#7D5A44', '#9C8066'
    x0 = B + SPINE_PERF + 6.5
    head = (f'<div style="position:absolute;left:{x0}mm;top:{B + 6.4}mm;width:110mm">'
            f'<div style="font-family:Jost;font-size:6.4pt;letter-spacing:.32em;text-transform:uppercase;color:{cocoa}">SVIF · Sértilboð</div>'
            f'<div style="font-family:Fraunces,serif;font-variation-settings:\'SOFT\' 60,\'WONK\' 1;font-weight:700;font-size:17pt;line-height:1.08;color:{ink};margin-top:1.4mm">'
            f'Afsláttarmiðarnir eru<br><span style="color:{gold}">á næstu síðu</span></div></div>'
            f'<div style="position:absolute;left:{x0 + 104}mm;width:{200 - B - 7 - x0 - 104}mm;top:{B + 8.2}mm;font-family:Jost;font-size:8pt;line-height:1.45;color:{cocoa};text-align:right">'
            f'Hér á bakhliðinni sérðu hvar og hvernig hver miði gildir. Rífðu hann úr eftir rifgötuninni.</div>')
    body = ''.join(back_strip(c, k) for k, c in enumerate(COUPONS))
    return body, head, perf_svg(B + SPINE_PERF)


def write(name, body, head, perf, paper_all=False):
    fonts = open(os.path.join(D, 'fonts.css')).read()
    bg = '<div class="paper" style="left:0;top:0;width:200mm;height:200mm"></div>' if paper_all else ''
    html = (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}{CSS}</style></head>'
            f'<body>{bg}{body}{head}{perf}</body></html>')
    p = os.path.join(D, name)
    open(p, 'w', encoding='utf-8').write(html)
    print('skrifaði', p)


if __name__ == '__main__':
    write('midar_framhlid.html', *page_front())
    write('midar_bakhlid.html', *page_back(), paper_all=True)
