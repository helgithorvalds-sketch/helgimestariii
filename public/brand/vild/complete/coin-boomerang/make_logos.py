W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H): return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
                                     f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def bare(body, w=W, h=H): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
_m = open("make_v14.py").read().split("MARKS = [")[0]; _ns = {}; exec(_m, _ns)
m_boomerang, m_dots, wordmark = _ns["m_boomerang"], _ns["m_dots"], _ns["wordmark"]
MARKS = {"boomerang": (m_boomerang, 0.52, 0.02), "dots": (m_dots, 0.5, 0.0)}   # fn, size inside coin, y nudge

def coin_solid(mark, fg, bg, dia, cx, cy, rim=True):
    """solid coin, the mark knocked out of it"""
    fn, k, ny = MARKS[mark]; r = dia/2; t = dia*0.012
    out = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fg}"/>'
    if rim: out += f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{bg}" stroke-width="{t:.1f}"/>'
    return out + g(fn(bg, fg), cx - dia*k/2, cy - dia*k/2 + dia*ny, dia*k)
def coin_line(mark, fg, bg, dia, cx, cy):
    """outlined coin: thin outer ring and rim, mark in the brand colour"""
    fn, k, ny = MARKS[mark]; r = dia/2; t = dia*0.012
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{fg}" stroke-width="{t*1.4:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{fg}" stroke-width="{t:.1f}"/>'
            + g(fn(fg, bg), cx - dia*k/2, cy - dia*k/2 + dia*ny, dia*k))
def coin_edge(mark, fg, bg, dia, cx, cy):
    """coin with a visible edge behind the face"""
    fn, k, ny = MARKS[mark]; r = dia/2; off = dia*0.07; t = dia*0.012
    return (f'<circle cx="{cx+off*0.6:.1f}" cy="{cy+off:.1f}" r="{r}" fill="{fg}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg}" stroke="{fg}" stroke-width="{t*1.4:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{fg}" stroke-width="{t:.1f}"/>'
            + g(fn(fg, bg), cx - dia*k/2, cy - dia*k/2 + dia*ny, dia*k))

out = {}
for mark in MARKS:
    for cn, fg, bg in COLOURWAYS:
        out[f"vild-coin-{mark}-solid-{cn}"]  = svg(coin_solid(mark, fg, bg, 520, W/2, H/2), bg)
        out[f"vild-coin-{mark}-line-{cn}"]   = svg(coin_line(mark, fg, bg, 520, W/2, H/2), bg)
        out[f"vild-coin-{mark}-edge-{cn}"]   = svg(coin_edge(mark, fg, bg, 500, W/2, H/2 - 15), bg)
        out[f"vild-coin-{mark}-lockup-{cn}"] = svg(coin_solid(mark, fg, bg, 380, W/2, H/2 - 110) + wordmark(fg, 110, W/2, H/2 + 210), bg)
    out[f"vild-coin-{mark}-solid-transparent-dark"] = bare(coin_solid(mark, DARK, "none", 520, W/2, H/2, rim=False) if False else coin_solid(mark, DARK, LIME, 520, W/2, H/2))
    out[f"vild-coin-{mark}-square-lime-dark"] = (lambda s=1000: f'<svg xmlns="http://www.w3.org/2000/svg" width="{s}" height="{s}" viewBox="0 0 {s} {s}"><rect width="{s}" height="{s}" fill="{LIME}"/>{coin_solid(mark, DARK, LIME, 760, s/2, s/2)}</svg>')()
for k, v in out.items(): open(f"v15/{k}.svg", "w").write(v)
print("ok")
