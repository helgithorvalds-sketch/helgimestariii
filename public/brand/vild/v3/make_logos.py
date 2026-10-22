import math
W, H = 1200, 900
COLOURWAYS = [
    ("lime-dark",   "#0C5C3B", "#B4FF9B"),
    ("lime-white",  "#FFFFFF", "#B4FF9B"),
    ("green-cream", "#F2EFE6", "#00BF63"),
    ("mint-cream",  "#F3F4EE", "#06CE78"),
]
T = 0.27    # stroke thickness (unit = letter height)
S = 0.075   # slit thickness
_id = [0]
def uid():
    _id[0] += 1; return f"m{_id[0]}"

# ---- constructed letters, each in a box of height 1 (y down), returns (pathdata, width) ----
def letter_V(w=1.0):
    a = 0.31 * w; hw = 0.13 * w                     # top arm width, half flat-bottom width
    hin = 1 - (w/2 - a) / (w/2 - hw)                # inner vertex height so arm edges are parallel
    return (f"M0,0 L{a:.4f},0 L{w/2:.4f},{hin:.4f} L{w-a:.4f},0 L{w:.4f},0 "
            f"L{w/2+hw:.4f},1 L{w/2-hw:.4f},1 Z"), w
def letter_I(w=0.72):
    st = T * 0.95; x0 = w/2 - st/2
    return (f"M0,0 H{w:.4f} V{T:.4f} H{x0+st:.4f} V{1-T:.4f} H{w:.4f} V1 H0 V{1-T:.4f} "
            f"H{x0:.4f} V{T:.4f} H0 Z"), w
def letter_L(w=0.72):
    return f"M0,0 H{T:.4f} V{1-T:.4f} H{w:.4f} V1 H0 Z", w
def letter_D(w=1.0):
    r = 0.5; ri = 0.5 - T
    return (f"M0,0 H{w-r:.4f} A{r},{r} 0 0 1 {w-r:.4f},1 H0 Z "
            f"M{T:.4f},{T:.4f} V{1-T:.4f} H{w-r:.4f} A{ri:.4f},{ri:.4f} 0 0 0 {w-r:.4f},{T:.4f} Z"), w

def slits_mask(width, ys, extra=""):
    """mask that keeps everything except horizontal slits starting at each y in ys (unit coords)."""
    i = uid()
    rects = "".join(f'<rect x="-1" y="{y:.4f}" width="{width+2:.4f}" height="{S:.4f}" fill="black"/>' for y in ys)
    return i, f'<mask id="{i}" maskUnits="userSpaceOnUse" x="-1" y="-1" width="{width+2:.4f}" height="3"><rect x="-1" y="-1" width="{width+2:.4f}" height="3" fill="white"/>{rects}{extra}</mask>'

ROW1 = [T, 1 - T - S]          # two slits, aligned with the I's bars
ROW2 = [1 - T - S]             # one slit, separating the L's foot

def glyph(d, width, ys, fg, x, y, h):
    """place a unit letter at (x,y) scaled to height h, with slits."""
    mid, mdef = slits_mask(width, ys)
    return (f'<defs>{mdef}</defs><g transform="translate({x:.2f} {y:.2f}) scale({h:.3f})">'
            f'<path d="{d}" fill="{fg}" fill-rule="evenodd" mask="url(#{mid})"/></g>')

# ---- compositions ----
def stacked(fg, h, cx, cy, gap=0.13):
    """ZERO-style 2x2 block: VI over LD, both rows justified to the same width."""
    (dV, wV), (dI, wI), (dL, wL), (dD, wD) = letter_V(), letter_I(), letter_L(), letter_D()
    rw = wV + gap + wI                      # == wL + gap + wD
    total_w = rw * h; total_h = (2 + gap) * h
    x0 = cx - total_w/2; y0 = cy - total_h/2
    out = glyph(dV, wV, ROW1, fg, x0, y0, h)
    out += glyph(dI, wI, ROW1, fg, x0 + (wV + gap) * h, y0, h)
    y1 = y0 + (1 + gap) * h
    out += glyph(dL, wL, ROW2, fg, x0, y1, h)
    out += glyph(dD, wD, ROW2, fg, x0 + (wL + gap) * h, y1, h)
    return out

def inline(fg, h, cx, cy, gap=0.13, ys=ROW1):
    letters = [letter_V(), letter_I(), letter_L(), letter_D()]
    total = (sum(w for _, w in letters) + gap * 3) * h
    x = cx - total/2; y = cy - h/2; out = ""
    for d, w in letters:
        out += glyph(d, w, ys, fg, x, y, h); x += (w + gap) * h
    return out

def mark_stripes(fg, h, cx, cy):
    d, w = letter_V()
    return glyph(d, w, ROW1, fg, cx - w*h/2, cy - h/2, h)

def mark_cut(fg, h, cx, cy):
    """Perimeter-Watch style: chunky V with one diagonal cut, parallel to the left arm, through the right arm."""
    d, w = letter_V(); a = 0.31; hw = 0.13
    ang = math.degrees(math.atan2(1, w/2 - hw))      # angle of the arm edges
    # a slanted slit crossing the right arm, lower-left to upper-right of it
    cutx, cuty = 0.78, 0.36
    extra = (f'<rect x="-0.6" y="{-S/2:.4f}" width="1.2" height="{S*1.1:.4f}" fill="black" '
             f'transform="translate({cutx} {cuty}) rotate({ -(90 - ang):.2f})"/>')
    mid, mdef = slits_mask(w, [], extra)
    x = cx - w*h/2; y = cy - h/2
    return (f'<defs>{mdef}</defs><g transform="translate({x:.2f} {y:.2f}) scale({h:.3f})">'
            f'<path d="{d}" fill="{fg}" mask="url(#{mid})"/></g>')

def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')

def design_stacked(fg, bg):  return svg(stacked(fg, 215, W/2, H/2), bg)
def design_inline(fg, bg):   return svg(inline(fg, 210, W/2, H/2), bg)
def design_mark(fg, bg):     return svg(mark_stripes(fg, 320, W/2, H/2), bg)
def design_mark_cut(fg, bg): return svg(mark_cut(fg, 320, W/2, H/2), bg)
def design_lockup(fg, bg):
    h = 150; mw = 1.0 * 1.15 * h; gap = 0.5 * h
    d_total = (1.0 + 0.72 + 0.72 + 1.0 + 0.13*3) * h
    total = mw + gap + d_total; x0 = W/2 - total/2
    return svg(mark_cut(fg, h * 1.15, x0 + mw/2, H/2) + inline(fg, h, x0 + mw + gap + d_total/2, H/2), bg)
def design_lockup_stacked(fg, bg):
    return svg(mark_cut(fg, 230, W/2, H/2 - 160) + inline(fg, 120, W/2, H/2 + 150), bg)
def design_icon(fg, bg):
    Sq = 560; r = Sq * 0.2; x = W/2 - Sq/2; y = H/2 - Sq/2
    return svg(f'<rect x="{x}" y="{y}" width="{Sq}" height="{Sq}" rx="{r}" fill="{fg}"/>' + mark_stripes(bg, Sq*0.5, W/2, H/2), bg)
def design_icon_cut(fg, bg):
    Sq = 560; r = Sq * 0.2; x = W/2 - Sq/2; y = H/2 - Sq/2
    return svg(f'<rect x="{x}" y="{y}" width="{Sq}" height="{Sq}" rx="{r}" fill="{fg}"/>' + mark_cut(bg, Sq*0.5, W/2, H/2), bg)


# ---- cashback marks ----
def mark_coin(fg, bg, h, cx, cy):
    """coin: solid disc with the striped V knocked out of it."""
    d, w = letter_V(); r = h / 2
    mid, mdef = slits_mask(w, ROW1)
    vh = h * 0.52; vx = cx - w*vh/2; vy = cy - vh/2 + h*0.02
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fg}"/><defs>{mdef}</defs>'
            f'<g transform="translate({vx:.2f} {vy:.2f}) scale({vh:.3f})">'
            f'<path d="{d}" fill="{bg}" fill-rule="evenodd" mask="url(#{mid})"/></g>')

def mark_catch(fg, h, cx, cy):
    """V as a cup catching a coin: cut V with a disc dropping into the opening."""
    d, w = letter_V()
    r = h * 0.14; vh = h * 0.78
    v = mark_cut(fg, vh, cx, cy + h*0.11)
    # coin hovers above the mouth of the V, about to drop in
    return v + f'<circle cx="{cx:.2f}" cy="{cy + h*0.11 - vh/2 - r - h*0.07:.2f}" r="{r:.2f}" fill="{fg}"/>'

def mark_return(fg, h, cx, cy):
    """V whose right arm is a detached chip flipped back: money going out and coming back."""
    d, w = letter_V(); a = 0.31; hw = 0.13
    ang = math.degrees(math.atan2(1, w/2 - hw))
    cutx, cuty = 0.78, 0.36
    extra = (f'<rect x="-0.6" y="{-S*1.6/2:.4f}" width="1.2" height="{S*1.6:.4f}" fill="black" '
             f'transform="translate({cutx} {cuty}) rotate({ -(90 - ang):.2f})"/>')
    mid, mdef = slits_mask(w, [], extra)
    x = cx - w*h/2; y = cy - h/2
    body = (f'<defs>{mdef}</defs><g transform="translate({x:.2f} {y:.2f}) scale({h:.3f})">'
            f'<path d="{d}" fill="{fg}" mask="url(#{mid})"/></g>')
    # coin where the chip was cut off, hovering above the right arm
    r = h * 0.11
    return body + f'<circle cx="{cx + w*h*0.46:.2f}" cy="{cy - h*0.62:.2f}" r="{r:.2f}" fill="{fg}"/>'

def design_mark_coin(fg, bg):   return svg(mark_coin(fg, bg, 360, W/2, H/2), bg)
def design_mark_catch(fg, bg):  return svg(mark_catch(fg, 320, W/2, H/2), bg)
def design_mark_return(fg, bg): return svg(mark_return(fg, 320, W/2, H/2), bg)
def design_lockup_coin(fg, bg):
    h = 150; mw = 1.25 * h; gap = 0.45 * h
    d_total = (1.0 + 0.72 + 0.72 + 1.0 + 0.13*3) * h
    total = mw + gap + d_total; x0 = W/2 - total/2
    return svg(mark_coin(fg, bg, mw, x0 + mw/2, H/2) + inline(fg, h, x0 + mw + gap + d_total/2, H/2), bg)
def design_lockup_catch(fg, bg):
    h = 150; mw = 1.15 * h; gap = 0.5 * h
    d_total = (1.0 + 0.72 + 0.72 + 1.0 + 0.13*3) * h
    total = mw + gap + d_total; x0 = W/2 - total/2
    return svg(mark_catch(fg, h*1.0, x0 + mw/2, H/2 + h*0.04) + inline(fg, h, x0 + mw + gap + d_total/2, H/2), bg)
def design_stacked_coin(fg, bg):
    """ZERO block with the coin mark beside it, like a seal."""
    return svg(mark_coin(fg, bg, 250, W/2, H/2 - 170) + inline(fg, 120, W/2, H/2 + 150), bg)
def design_icon_coin(fg, bg):
    Sq = 560; r = Sq * 0.2; x = W/2 - Sq/2; y = H/2 - Sq/2
    return svg(f'<rect x="{x}" y="{y}" width="{Sq}" height="{Sq}" rx="{r}" fill="{fg}"/>' + mark_coin(bg, fg, Sq*0.62, W/2, H/2), bg)

DESIGNS = [("stacked", design_stacked), ("inline", design_inline),
           ("mark-coin", design_mark_coin), ("mark-catch", design_mark_catch), ("mark-cut", design_mark_cut),
           ("lockup-coin", design_lockup_coin), ("lockup-catch", design_lockup_catch), ("lockup", design_lockup),
           ("stacked-coin", design_stacked_coin), ("icon-coin", design_icon_coin), ("icon-cut", design_icon_cut)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v4/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")
