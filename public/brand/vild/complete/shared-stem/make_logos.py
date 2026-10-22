W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def stroke(fg, t): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="round" stroke-linejoin="round"'

def shared_stem(fg, h, cx, cy, dmode="outline", t=0.11, gap=0.36, dh=1.0, dw=0.8):
    """V · stem-with-dot-and-foot (i+L) · D.   dmode: outline | solid | solid-tall"""
    st = stroke(fg, t); x = 0; p = []
    dot_y = -0.34
    p.append(f'<path d="M{t/2:.3f},{t/2:.3f} L{0.47:.3f},{1-t/2:.3f} L{0.94-t/2:.3f},{t/2:.3f}" {st}/>'); x += 0.94 + gap
    p.append(f'<circle cx="{x+t/2:.3f}" cy="{dot_y:.3f}" r="{t*0.62:.3f}" fill="{fg}"/>')
    p.append(f'<path d="M{x+t/2:.3f},{t/2:.3f} V{1-t/2:.3f} H{x+0.55:.3f}" {st}/>'); x += 0.55 + gap
    if dmode == "outline":
        p.append(f'<path d="M{x+t/2:.3f},{t/2:.3f} V{1-t/2:.3f} M{x+t/2:.3f},{t/2:.3f} H{x+0.3:.3f} '
                 f'A{0.5-t/2:.3f},{0.5-t/2:.3f} 0 0 1 {x+0.3:.3f},{1-t/2:.3f} H{x+t/2:.3f}" {st}/>'); x += 0.8 + t
    else:
        top = 1 - dh                                 # solid-tall rises toward the dot
        r = dh / 2; stem = dw - r
        p.append(f'<path d="M{x:.3f},{top:.3f} H{x+stem:.3f} A{r:.3f},{r:.3f} 0 0 1 {x+stem:.3f},1 H{x:.3f} Z" fill="{fg}"/>'); x += dw
    top_all = min(dot_y - t*0.62, 1 - dh)
    return g("".join(p), cx - x*h/2, cy - (top_all + 1)/2*h, h), x

VARIANTS = [
    ("shared-stem",          dict(dmode="outline")),
    ("shared-stem-solid-d",  dict(dmode="solid", dh=1.0, dw=0.85)),
    ("shared-stem-big-d",    dict(dmode="solid", dh=1.34, dw=1.0)),     # D reaches the dot's height
    ("shared-stem-big-d-wide", dict(dmode="solid", dh=1.34, dw=1.2, t=0.12)),
]
def transparent(body): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{body}</svg>'
for name, kw in VARIANTS:
    for cn, fg, bg in COLOURWAYS:
        body, _ = shared_stem(fg, 230, W/2, H/2, **kw)
        open(f"complete2/vild-{name}-{cn}.svg", "w").write(svg(body, bg))
    body, _ = shared_stem(DARK, 230, W/2, H/2, **kw); open(f"complete2/vild-{name}-transparent-dark.svg", "w").write(transparent(body))
    body, _ = shared_stem(LIME, 230, W/2, H/2, **kw); open(f"complete2/vild-{name}-transparent-lime.svg", "w").write(transparent(body))
print("ok")
