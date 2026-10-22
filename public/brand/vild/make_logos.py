import math
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]

def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s):
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'

# ---------- Boon-style solid block letters (unit height, y down) ----------
# every letter is one solid shape: no counters, like the discs in BOON
def B_V(w=1.0, hw=0.07): return f'<path d="M0,0 H{w} L{w/2+hw:.3f},1 H{w/2-hw:.3f} Z"/>', w
def B_I(w=0.5):          return f'<rect width="{w}" height="1"/>', w
def B_L(w=0.6, st=0.32): return f'<path d="M0,0 H{st} V{1-st:.3f} H{w} V1 H0 Z"/>', w
def B_D(w=0.9):
    r = 0.5; return f'<path d="M0,0 H{w-r:.3f} A{r},{r} 0 0 1 {w-r:.3f},1 H0 Z"/>', w
BLOCK = [B_V, B_I, B_L, B_D]

def block_row(letters, gap=0.1):
    x = 0; out = ""; 
    for fn in letters:
        d, w = fn(); out += f'<g transform="translate({x:.3f} 0)">{d}</g>'; x += w + gap
    return out, x - gap

def block_inline(fg, h, cx, cy, gap=0.1):
    body, w = block_row(BLOCK, gap)
    return g(f'<g fill="{fg}">{body}</g>', cx - w*h/2, cy - h/2, h)

def block_stacked(fg, h, cx, cy, gap=0.1):
    r1, w1 = block_row(BLOCK[:2], gap); r2, w2 = block_row(BLOCK[2:], gap)   # both rows are 1.5 wide
    w = max(w1, w2); th = 2 + gap
    body = f'<g fill="{fg}">{r1}<g transform="translate(0 {1+gap})">{r2}</g></g>'
    return g(body, cx - w*h/2, cy - th*h/2, h)

# ---------- boon.-style rounded lowercase "vild." (x-height 1, stroke t) ----------
def lower(fg, xh, cx, cy, t=0.34, gap=0.2):
    asc = -0.5; dot_r = t * 0.55
    st = f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="round" stroke-linejoin="round"'
    x = 0; parts = []
    # v
    parts.append(f'<path d="M{t/2},{t/2} L{0.5+t/2*0.0:.3f},{1-t/2} L{1-t/2},{t/2}" {st}/>'
                 .replace(f"M{t/2},{t/2}", f"M{t/2:.3f},{t/2:.3f}")); vx = x; x += 1 + gap
    # i
    parts.append(f'<g transform="translate({x:.3f} 0)"><path d="M{t/2:.3f},{t/2:.3f} V{1-t/2:.3f}" {st}/>'
                 f'<circle cx="{t/2:.3f}" cy="{asc + 0.12:.3f}" r="{dot_r:.3f}" fill="{fg}"/></g>'); x += t + gap
    # l
    parts.append(f'<g transform="translate({x:.3f} 0)"><path d="M{t/2:.3f},{asc:.3f} V{1-t/2:.3f}" {st}/></g>'); x += t + gap
    # d: ring + stem on the right
    r = 0.5 - t/2
    parts.append(f'<g transform="translate({x:.3f} 0)"><circle cx="0.5" cy="0.5" r="{r:.3f}" {st}/>'
                 f'<path d="M{1-t/2:.3f},{asc:.3f} V{1-t/2:.3f}" {st}/></g>'); x += 1 + gap * 0.6
    # period
    parts.append(f'<circle cx="{x + dot_r:.3f}" cy="{1 - dot_r:.3f}" r="{dot_r:.3f}" fill="{fg}"/>'); x += dot_r * 2
    body = "".join(parts); total_h = 1 - asc
    return g(body, cx - x*xh/2, cy - (asc + 1)/2*xh, xh)

# ---------- MUKU-style thin stacked letters ----------
def thin_stacked(fg, h, cx, cy, t=0.09, gap=0.55):
    st = f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="square" stroke-linejoin="miter"'
    w = 0.8
    V = f'<path d="M0,0 L{w/2},1 L{w},0" {st}/>'
    I = f'<path d="M{w/2},0 V1" {st}/>'
    L = f'<path d="M0,0 V1 H{w}" {st}/>'
    D = f'<path d="M0,0 V1 H{w-0.5} A0.5,0.5 0 0 0 {w-0.5},0 Z" {st}/>'
    rw = 2*w + gap; rh = 2 + gap
    body = (f'{V}<g transform="translate({w+gap} 0)">{I}</g>'
            f'<g transform="translate(0 {1+gap})">{L}</g><g transform="translate({w+gap} {1+gap})">{D}</g>')
    return g(body, cx - rw*h/2, cy - rh*h/2, h)

# ---------- coin: solid disc with the block V knocked out (cashback) ----------
def coin(fg, bg, dia, cx, cy):
    d, w = B_V(); vh = dia * 0.5
    return (f'<circle cx="{cx}" cy="{cy}" r="{dia/2}" fill="{fg}"/>' +
            g(f'<g fill="{bg}">{d}</g>', cx - w*vh/2, cy - vh/2 + dia*0.02, vh))

# ---------- compositions ----------
def design_block(fg, bg):         return svg(block_inline(fg, 230, W/2, H/2), bg)
def design_block_stacked(fg, bg): return svg(block_stacked(fg, 215, W/2, H/2), bg)
def design_lower(fg, bg):         return svg(lower(fg, 190, W/2, H/2), bg)
def design_thin_stacked(fg, bg):  return svg(thin_stacked(fg, 190, W/2, H/2), bg)
def design_coin(fg, bg):          return svg(coin(fg, bg, 380, W/2, H/2), bg)
def design_lockup(fg, bg):
    h = 160; dia = h * 1.1; gap = h * 0.45; _, bw = block_row(BLOCK); bw *= h
    total = dia + gap + bw; x0 = W/2 - total/2
    return svg(coin(fg, bg, dia, x0 + dia/2, H/2) + block_inline(fg, h, x0 + dia + gap + bw/2, H/2), bg)
def design_lockup_lower(fg, bg):
    xh = 150; dia = xh * 1.25; gap = xh * 0.5; lw = (1 + 0.2 + 0.34 + 0.2 + 0.34 + 0.2 + 1 + 0.12 + 0.37) * xh
    total = dia + gap + lw; x0 = W/2 - total/2
    return svg(coin(fg, bg, dia, x0 + dia/2, H/2 + xh*0.1) + lower(fg, xh, x0 + dia + gap + lw/2, H/2), bg)
def design_stacked_coin(fg, bg):
    return svg(coin(fg, bg, 260, W/2, H/2 - 165) + block_inline(fg, 125, W/2, H/2 + 160), bg)
def design_icon(fg, bg):
    S = 560; r = S*0.22; x = W/2 - S/2; y = H/2 - S/2; d, w = B_V(); vh = S * 0.5
    return svg(f'<rect x="{x}" y="{y}" width="{S}" height="{S}" rx="{r}" fill="{fg}"/>' +
               g(f'<g fill="{bg}">{d}</g>', W/2 - w*vh/2, H/2 - vh/2 + S*0.02, vh), bg)
def design_icon_stacked(fg, bg):
    S = 560; r = S*0.22; x = W/2 - S/2; y = H/2 - S/2
    return svg(f'<rect x="{x}" y="{y}" width="{S}" height="{S}" rx="{r}" fill="{fg}"/>' + block_stacked(bg, S*0.3, W/2, H/2), bg)

DESIGNS = [("block", design_block), ("block-stacked", design_block_stacked), ("lower", design_lower),
           ("thin-stacked", design_thin_stacked), ("coin", design_coin), ("lockup", design_lockup),
           ("lockup-lower", design_lockup_lower), ("stacked-coin", design_stacked_coin),
           ("icon", design_icon), ("icon-stacked", design_icon_stacked)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v5/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")

# ================= single-object "VILD" monograms =================
def mono_tight(fg, h, cx, cy, gap=0.06):
    """fused square monogram: VI over LD with hairline gaps, one silhouette."""
    return block_stacked(fg, h, cx, cy, gap)

def coin_vild(fg, bg, dia, cx, cy):
    """a coin that spells VILD: stacked block letters knocked out of a disc."""
    return f'<circle cx="{cx}" cy="{cy}" r="{dia/2}" fill="{fg}"/>' + block_stacked(bg, dia*0.27, cx, cy, 0.1)

def ligature(fg, xh, cx, cy, t=0.3):
    """lowercase 'vild' as one ligature: a check-mark 'v' whose upright is the 'i' stem (dot above),
    then 'l' and 'd' sharing one bowl between two tall stems."""
    asc = -0.55; dot_r = t * 0.58; parts = []
    # v + i : diagonal from top-left down to the base of an upright stem
    vx = 0.0; dw = 0.62                     # diagonal spans dw horizontally
    diag = (f'<path d="M{vx},0 H{vx+t*1.05:.3f} L{vx+dw+t:.3f},{1:.3f} H{vx+dw:.3f} Z" fill="{fg}"/>')
    stem_x = vx + dw
    parts.append(diag)
    parts.append(f'<rect x="{stem_x:.3f}" y="0" width="{t}" height="1" fill="{fg}"/>')
    parts.append(f'<circle cx="{stem_x + t/2:.3f}" cy="{asc + 0.2:.3f}" r="{dot_r:.3f}" fill="{fg}"/>')
    x = stem_x + t + 0.26
    # l
    parts.append(f'<rect x="{x:.3f}" y="{asc:.3f}" width="{t}" height="{1-asc:.3f}" fill="{fg}"/>')
    lx = x; x += t + 0.14
    # d : bowl between l-stem and its own tall stem
    bw = 0.95; r_out = 0.5
    bowl = (f'<path d="M{x:.3f},{0.5:.3f} A{r_out},{r_out} 0 0 1 {x+bw:.3f},0.5 A{r_out},{r_out} 0 0 1 {x:.3f},0.5 Z '
            f'M{x+t:.3f},0.5 A{r_out-t:.3f},{r_out-t:.3f} 0 0 0 {x+bw-t:.3f},0.5 A{r_out-t:.3f},{r_out-t:.3f} 0 0 0 {x+t:.3f},0.5 Z" '
            f'fill="{fg}" fill-rule="evenodd" transform="translate(0 0) scale(1 1)"/>')
    # ellipse-ish bowl via two arcs is a circle of diameter bw>1? keep it a circle: set bw = 1
    parts.append(bowl.replace(f"{x+bw:.3f}", f"{x+1.0:.3f}").replace(f"{x+bw-t:.3f}", f"{x+1.0-t:.3f}"))
    parts.append(f'<rect x="{x+1.0-t:.3f}" y="{asc:.3f}" width="{t}" height="{1-asc:.3f}" fill="{fg}"/>')
    total_w = x + 1.0
    return g("".join(parts), cx - total_w*xh/2, cy - (asc+1)/2*xh, xh)

def design_mono_tight(fg, bg):  return svg(mono_tight(fg, 215, W/2, H/2), bg)
def design_coin_vild(fg, bg):   return svg(coin_vild(fg, bg, 520, W/2, H/2), bg)
def design_ligature(fg, bg):    return svg(ligature(fg, 200, W/2, H/2), bg)
def design_coin_vild_lockup(fg, bg):
    h = 150; dia = h * 1.9; gap = h * 0.5; _, bw = block_row(BLOCK); bw *= h
    total = dia + gap + bw; x0 = W/2 - total/2
    return svg(coin_vild(fg, bg, dia, x0 + dia/2, H/2) + block_inline(fg, h, x0 + dia + gap + bw/2, H/2), bg)

MONO = [("mono-tight", design_mono_tight), ("coin-vild", design_coin_vild), ("ligature", design_ligature),
        ("coin-vild-lockup", design_coin_vild_lockup)]
for dn, fn in MONO:
    for cn, fg, bg in COLOURWAYS:
        open(f"v5/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("mono ok")
