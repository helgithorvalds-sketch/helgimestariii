import math
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def st(fg, t, cap="butt"): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="{cap}" stroke-linejoin="miter"'

# ---- font text (Outfit) as paths, cap height 1, y down ----
_f = {}
def text_paths(text, wght, tracking=0.0):
    if wght not in _f: _f[wght] = instantiateVariableFont(TTFont("fonts/Outfit.ttf"), {"wght": wght})
    f = _f[wght]; cmap = f.getBestCmap(); gs = f.getGlyphSet(); upm = f["head"].unitsPerEm
    cap = f["OS/2"].sCapHeight / upm
    x = 0; out = ""
    for ch in text:
        gl = gs[cmap[ord(ch)]]; pen = SVGPathPen(gs)
        gl.draw(TransformPen(pen, (1/upm/cap, 0, 0, -1/upm/cap, x, 1)))   # scale so cap height = 1
        out += f'<path d="{pen.getCommands()}"/>'; x += (gl.width/upm + tracking) / cap
    return out, x - tracking/cap

# ================= 1. MINO : hairline, wide tracking, open joins =================
def mino(fg, h, cx, cy, t=0.045, gap=1.0, cut=0.11):
    s = st(fg, t); x = 0; p = []
    p.append(f'<path d="M0,0 L{0.42:.3f},{1-cut*0.9:.3f} M{0.84:.3f},0 L{0.42+cut*0.45:.3f},{1-cut*0.9+cut*0.55:.3f}" {s}/>')  # V, arms stop before meeting
    x += 0.84 + gap
    p.append(f'<path d="M{x:.3f},0 V1" {s}/>'); x += gap
    p.append(f'<path d="M{x:.3f},0 V{1-cut:.3f} M{x+cut:.3f},1 H{x+0.62:.3f}" {s}/>'); x += 0.62 + gap   # L, foot floats off the stem
    p.append(f'<path d="M{x:.3f},0 V1 M{x+cut:.3f},{t/2:.3f} H{x+0.36:.3f} A{0.5-t/2:.3f},{0.5-t/2:.3f} 0 0 1 {x+0.36:.3f},{1-t/2:.3f} H{x+cut:.3f}" {s}/>')  # D, bowl detached
    x += 0.86
    return g("".join(p), cx - x*h/2, cy - h/2, h)

# ================= 2. Flexi / Fature : framed geometric V + clean wordmark =================
def frame_v(fg, h, cx, cy, t=0.13):
    """rounded-square outline whose top edge flows into a V: one continuous mark"""
    s = st(fg, t, "round"); r = 0.26
    frame = (f'<path d="M{r},0 H{1-r} A{r},{r} 0 0 1 1,{r} V{1-r} A{r},{r} 0 0 1 {1-r},1 H{r} A{r},{r} 0 0 1 0,{1-r} V{r} A{r},{r} 0 0 1 {r},0 Z" {s}/>')
    v = f'<path d="M{0.18:.3f},{0.08:.3f} L0.5,{0.72:.3f} L{0.82:.3f},{0.08:.3f}" {s}/>'
    return g(frame + v, cx - h/2, cy - h/2, h)
def frame_v_cut(fg, bg, h, cx, cy, t=0.13):
    """one continuous line: down the V, up again, then around the rounded frame back to the V"""
    s = st(fg, t, "round"); r = 0.26; a, b = 0.17, 0.83
    d = (f"M{a},0 L0.5,0.7 L{b},0 H{1-r} A{r},{r} 0 0 1 1,{r} V{1-r} A{r},{r} 0 0 1 {1-r},1 "
         f"H{r} A{r},{r} 0 0 1 0,{1-r} V{r} A{r},{r} 0 0 1 {r},0 Z")
    return g(f'<path d="{d}" {s}/>', cx - h/2, cy - h/2, h)
def wordmark(fg, text, wght, cap_px, x_left, cy, tracking=0.0):
    paths, w = text_paths(text, wght, tracking)
    return g(f'<g fill="{fg}">{paths}</g>', x_left, cy - cap_px/2, cap_px), w*cap_px
def lockup_frame(fg, bg, cut=False):
    cap = 150; mh = cap * 1.35; gap = cap * 0.42
    _, ww = text_paths("Vild", 500, -0.01); ww *= cap
    total = mh + gap + ww; x0 = W/2 - total/2
    mark = (frame_v_cut(fg, bg, mh, x0 + mh/2, H/2) if cut else frame_v(fg, mh, x0 + mh/2, H/2))
    wm, _ = wordmark(fg, "Vild", 500, cap, x0 + mh + gap, H/2, -0.01)
    return svg(mark + wm, bg)

# ================= 3. aure : thin flowing lowercase ligature, l shares the d's bowl =================
def aure(fg, xh, cx, cy, t=0.085, asc=-0.62):
    s = st(fg, t, "round"); p = []; x = 0
    p.append(f'<path d="M{t/2:.3f},{t/2:.3f} L{0.46:.3f},{1-t/2:.3f} L{0.92-t/2:.3f},{t/2:.3f}" {s}/>'); x += 0.92 + 0.2
    p.append(f'<path d="M{x:.3f},{t/2:.3f} V{1-t/2:.3f}" {s}/><circle cx="{x:.3f}" cy="{-0.3:.3f}" r="{t*0.7:.3f}" fill="{fg}"/>'); x += 0.3
    # l is the left tangent of the d's bowl; the bowl swings out and the d's stem rises on the right
    lx = x; r = 0.5 - t/2
    p.append(f'<path d="M{lx:.3f},{asc:.3f} V{1-t/2:.3f}" {s}/>')
    ccx = lx + 0.5
    p.append(f'<circle cx="{ccx:.3f}" cy="0.5" r="{r:.3f}" {s}/>')
    p.append(f'<path d="M{lx+1-t/2:.3f},{asc:.3f} V{1-t/2:.3f}" {s}/>'); x = lx + 1
    return g("".join(p), cx - x*xh/2, cy - (asc+1)/2*xh, xh)

def design_mino(fg, bg):        return svg(mino(fg, 170, W/2, H/2), bg)
def design_mino_small(fg, bg):  return svg(mino(fg, 110, W/2, H/2, gap=1.3), bg)
def design_frame(fg, bg):       return lockup_frame(fg, bg, cut=False)
def design_frame_cut(fg, bg):   return lockup_frame(fg, bg, cut=True)
def design_frame_mark(fg, bg):  return svg(frame_v_cut(fg, bg, 360, W/2, H/2), bg)
def design_aure(fg, bg):        return svg(aure(fg, 230, W/2, H/2), bg)

DESIGNS = [("mino", design_mino), ("mino-small", design_mino_small), ("frame-lockup", design_frame),
           ("frame-cut-lockup", design_frame_cut), ("frame-mark", design_frame_mark), ("aure", design_aure)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v9/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")
