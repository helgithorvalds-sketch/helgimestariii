W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg): return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                           f'<rect width="{W}" height="{H}" fill="{bg}"/>{body}</svg>')
def bare(body): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def stroke(fg, t): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="butt" stroke-linejoin="miter"'

def deconstructed(fg, h, cx, cy, dmode="line", t=0.055, gap=0.5, cut=0.09, dh=1.0, dw=0.8, whole=False):
    if whole: cut = 0.0
    """V I L D from separated strokes.  dmode: line | big-line | solid | big-solid"""
    st = stroke(fg, t); x = 0; p = []
    p.append(f'<path d="M0,0 L0.45,1 L0.9,0" {st}/>'); x += 0.9 + gap   # V whole, arms meet
    p.append(f'<path d="M{x:.3f},0 V1" {st}/>'); x += gap
    if whole: p.append(f'<path d="M{x:.3f},0 V{1-t/2:.3f} H{x+0.6:.3f}" {st}/>')
    else:     p.append(f'<path d="M{x:.3f},0 V{1-cut:.3f} M{x+cut:.3f},1 H{x+0.6:.3f}" {st}/>')
    x += 0.6 + gap
    top = 1 - dh; r = dh / 2; stem = dw - r
    if dmode in ("line", "big-line"):
        p.append(f'<path d="M{x:.3f},{top:.3f} V1 M{x+cut:.3f},{top+t/2:.3f} H{x+stem:.3f} '
                 f'A{r-t/2:.3f},{r-t/2:.3f} 0 0 1 {x+stem:.3f},{1-t/2:.3f} H{x+cut:.3f}" {st}/>')
    else:
        p.append(f'<path d="M{x:.3f},{top:.3f} H{x+stem:.3f} A{r:.3f},{r:.3f} 0 0 1 {x+stem:.3f},1 H{x:.3f} Z" fill="{fg}"/>')
    x += dw
    return g("".join(p), cx - x*h/2, cy - (top+1)/2*h, h)

VARIANTS = [("deconstructed",            dict(dmode="line")),
            ("whole",                    dict(dmode="line", whole=True)),
            ("whole-big-d",              dict(dmode="big-line", dh=1.3, dw=1.0, whole=True)),
            ("deconstructed-big-d",      dict(dmode="big-line", dh=1.3, dw=1.0)),
            ("deconstructed-solid-d",    dict(dmode="solid", dh=1.0, dw=0.8)),
            ("deconstructed-big-solid-d",dict(dmode="big-solid", dh=1.3, dw=1.0))]
for name, kw in VARIANTS:
    for cn, fg, bg in COLOURWAYS:
        open(f"complete3/vild-{name}-{cn}.svg", "w").write(svg(deconstructed(fg, 230, W/2, H/2, **kw), bg))
    open(f"complete3/vild-{name}-transparent-dark.svg", "w").write(bare(deconstructed(DARK, 230, W/2, H/2, **kw)))
    open(f"complete3/vild-{name}-transparent-lime.svg", "w").write(bare(deconstructed(LIME, 230, W/2, H/2, **kw)))
print("ok")
