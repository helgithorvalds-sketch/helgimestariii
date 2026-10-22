import math
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'

def vild_ligature(fg, xh, cx, cy, mode="flow", t=0.3, dw=0.62, asc=-0.55, dgap=0.2):
    """v + i + L + d as one shape. The v's diagonal lands on an upright stem (the i, dot above);
    a foot at the stem's base makes the L; the d sits to the right.
    mode: 'flow'   foot runs into the lower-left of the d's bowl (one connected form)
          'gap'    foot stops short of the d
          'plinth' foot runs all the way under the d to its stem"""
    p = []
    stem_x = dw
    p.append(f'<path d="M0,0 H{t*1.05:.3f} L{dw+t:.3f},1 H{dw:.3f} Z" fill="{fg}"/>')          # v diagonal
    p.append(f'<rect x="{stem_x:.3f}" y="0" width="{t}" height="1" fill="{fg}"/>')               # i / L stem
    p.append(f'<circle cx="{stem_x+t/2:.3f}" cy="{asc+0.2:.3f}" r="{t*0.58:.3f}" fill="{fg}"/>')  # i dot
    bx = stem_x + t + dgap                                                                       # d bowl left edge
    ccx, ccy, r = bx + 0.5, 0.5, 0.5
    if mode == "flow":
        foot_end = ccx - math.sqrt(r*r - (0.5 - t/2)**2) + 0.12
    elif mode == "gap":
        foot_end = bx - 0.1
    else:
        foot_end = bx + 1.0
    p.append(f'<rect x="{stem_x:.3f}" y="{1-t:.3f}" width="{foot_end-stem_x:.3f}" height="{t}" fill="{fg}"/>')  # L foot
    p.append(f'<path d="M{ccx-r:.3f},{ccy} A{r},{r} 0 1 1 {ccx+r:.3f},{ccy} A{r},{r} 0 1 1 {ccx-r:.3f},{ccy} Z '
             f'M{ccx-r+t:.3f},{ccy} A{r-t:.3f},{r-t:.3f} 0 1 0 {ccx+r-t:.3f},{ccy} A{r-t:.3f},{r-t:.3f} 0 1 0 {ccx-r+t:.3f},{ccy} Z" '
             f'fill="{fg}" fill-rule="evenodd"/>')                                               # d bowl
    p.append(f'<rect x="{bx+1.0-t:.3f}" y="{asc:.3f}" width="{t}" height="{1-asc:.3f}" fill="{fg}"/>')  # d stem
    total_w = bx + 1.0
    return g("".join(p), cx - total_w*xh/2, cy - (asc+1)/2*xh, xh), total_w

def design(mode):
    def fn(fg, bg):
        body, _ = vild_ligature(fg, 210, W/2, H/2, mode); return svg(body, bg)
    return fn
def design_icon(fg, bg):
    S = 560; r = S*0.22; x = W/2 - S/2; y = H/2 - S/2
    body, _ = vild_ligature(bg, S*0.26, W/2, H/2, "flow")
    return svg(f'<rect x="{x}" y="{y}" width="{S}" height="{S}" rx="{r}" fill="{fg}"/>' + body, bg)
def design_coin(fg, bg):
    dia = 560
    body, _ = vild_ligature(bg, dia*0.24, W/2, H/2, "flow")
    return svg(f'<circle cx="{W/2}" cy="{H/2}" r="{dia/2}" fill="{fg}"/>' + body, bg)

DESIGNS = [("ligature-flow", design("flow")), ("ligature-gap", design("gap")), ("ligature-plinth", design("plinth")),
           ("ligature-icon", design_icon), ("ligature-coin", design_coin)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v7/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")
