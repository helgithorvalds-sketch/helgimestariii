import math
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg): return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                           f'<rect width="{W}" height="{H}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def stroke(fg, t, cap="butt"): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="{cap}" stroke-linejoin="miter"'

# the thin wordmark (all letters whole) from the deconstructed set
_src = open("make_v10.py").read().split("VARIANTS = [")[0]; _ns = {}; exec(_src, _ns)
def wordmark(fg, h, cx, cy): return _ns["deconstructed"](fg, h, cx, cy, dmode="line", whole=True)

# ---------- the glass mark: V bowl, I stem, L foot, coin as the olive (unit box 1 x 1, y down) ----------
def glass(fg, bg, h, cx, cy, style="line", t=0.055, foot="both", coin=True):
    p = []; st = stroke(fg, t)
    bowl_y = 0.6
    if style == "line":
        p.append(f'<path d="M0,0 L0.5,{bowl_y} L1,0" {st}/>')                                  # V
        p.append(f'<path d="M0.5,{bowl_y:.3f} V1" {st}/>')                                      # I
        x0 = 0.5 - t/2 if foot == "right" else 0.2
        p.append(f'<path d="M{x0:.3f},{1-t/2:.3f} H0.8" {st}/>')                                # L foot
        if coin: p.append(f'<circle cx="0.5" cy="0.27" r="0.1" fill="{fg}"/>')                  # coin / olive
    else:  # solid
        p.append(f'<path d="M0,0 H1 L0.5,{bowl_y} Z" fill="{fg}"/>')
        p.append(f'<rect x="{0.5-0.045:.3f}" y="{bowl_y-0.02:.3f}" width="0.09" height="{1-bowl_y+0.02:.3f}" fill="{fg}"/>')
        x0 = 0.5 - 0.045 if foot == "right" else 0.2
        p.append(f'<rect x="{x0:.3f}" y="{1-0.09:.3f}" width="{0.8-x0:.3f}" height="0.09" fill="{fg}"/>')
        if coin: p.append(f'<circle cx="0.5" cy="0.24" r="0.11" fill="{bg}"/>')
    return g("".join(p), cx - h/2, cy - h/2, h)

# ---------- coins ----------
def coin_face(fg, bg, dia, cx, cy, style="line", inner=True):
    """flat coin: solid disc, thin rim ring, the glass mark in the centre"""
    r = dia/2; t = dia * 0.012
    out = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fg}"/>'
    if inner: out += f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{bg}" stroke-width="{t:.1f}"/>'
    out += glass(bg, fg, dia*0.46, cx, cy + dia*0.01, style=style, t=0.06)
    return out
def coin_edge(fg, bg, dia, cx, cy, style="line"):
    """coin with a visible edge: a solid disc behind, offset, and an outlined face on top"""
    r = dia/2; off = dia*0.07; t = dia*0.012
    out = f'<circle cx="{cx+off*0.6:.1f}" cy="{cy+off:.1f}" r="{r}" fill="{fg}"/>'
    out += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg}" stroke="{fg}" stroke-width="{t:.1f}"/>'
    out += f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{fg}" stroke-width="{t:.1f}"/>'
    out += glass(fg, bg, dia*0.46, cx, cy + dia*0.01, style=style, t=0.06)
    return out

def design_mark_line(fg, bg):     return svg(glass(fg, bg, 380, W/2, H/2), bg)
def design_mark_line_L(fg, bg):   return svg(glass(fg, bg, 380, W/2, H/2, foot="right"), bg)
def design_mark_solid(fg, bg):    return svg(glass(fg, bg, 380, W/2, H/2, style="solid"), bg)
def design_coin(fg, bg):          return svg(coin_face(fg, bg, 520, W/2, H/2), bg)
def design_coin_solid(fg, bg):    return svg(coin_face(fg, bg, 520, W/2, H/2, style="solid"), bg)
def design_coin_edge(fg, bg):     return svg(coin_edge(fg, bg, 500, W/2, H/2 - 15), bg)
def design_coin_lockup(fg, bg):   return svg(coin_face(fg, bg, 360, W/2, H/2 - 120) + wordmark(fg, 110, W/2, H/2 + 200), bg)
def design_mark_lockup(fg, bg):
    h = 150; gap = 70; ww = (0.9 + 0.5 + 0.5 + 0.6 + 0.5 + 0.8) * h; total = h + gap + ww; x0 = W/2 - total/2
    return svg(glass(fg, bg, h, x0 + h/2, H/2) + wordmark(fg, h, x0 + h + gap + ww/2, H/2), bg)
def design_icon(fg, bg):
    S = 560; r = S*0.22; x = W/2 - S/2; y = H/2 - S/2
    return svg(f'<rect x="{x}" y="{y}" width="{S}" height="{S}" rx="{r}" fill="{fg}"/>' + glass(bg, fg, S*0.5, W/2, H/2, t=0.06), bg)

DESIGNS = [("mark-line", design_mark_line), ("mark-line-L", design_mark_line_L), ("mark-solid", design_mark_solid),
           ("coin", design_coin), ("coin-solid", design_coin_solid), ("coin-edge", design_coin_edge),
           ("coin-lockup", design_coin_lockup), ("mark-lockup", design_mark_lockup), ("icon", design_icon)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v11/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")
