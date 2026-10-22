W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H): return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
                                     f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
_s = open("make_v5.py").read().split("DESIGNS = [")[0]; _ns = {}; exec(_s, _ns)
block_inline, block_stacked = _ns["block_inline"], _ns["block_stacked"]

def rim(fg, bg, dia, cx, cy, solid):
    r = dia/2; t = dia*0.012
    if solid:
        return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fg}"/>'
                f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{bg}" stroke-width="{t:.1f}"/>')
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{fg}" stroke-width="{t*1.4:.1f}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.86:.1f}" fill="none" stroke="{fg}" stroke-width="{t:.1f}"/>')
def coin_inline(fg, bg, dia, cx, cy, solid=True):
    ink = bg if solid else fg
    return rim(fg, bg, dia, cx, cy, solid) + block_inline(ink, dia*0.19, cx, cy)
def coin_stacked(fg, bg, dia, cx, cy, solid=True):
    ink = bg if solid else fg
    return rim(fg, bg, dia, cx, cy, solid) + block_stacked(ink, dia*0.26, cx, cy, 0.1)
def coin_edge(inner, fg, bg, dia, cx, cy):
    r = dia/2; off = dia*0.07; t = dia*0.012
    return (f'<circle cx="{cx+off*0.6:.1f}" cy="{cy+off:.1f}" r="{r}" fill="{fg}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg}"/>' + inner(fg, bg, dia, cx, cy, solid=False))

out = {}
for cn, fg, bg in COLOURWAYS:
    out[f"vild-coin-block-inline-solid-{cn}"]  = svg(coin_inline(fg, bg, 560, W/2, H/2), bg)
    out[f"vild-coin-block-inline-line-{cn}"]   = svg(coin_inline(fg, bg, 560, W/2, H/2, solid=False), bg)
    out[f"vild-coin-block-inline-edge-{cn}"]   = svg(coin_edge(coin_inline, fg, bg, 540, W/2, H/2 - 15), bg)
    out[f"vild-coin-block-stacked-solid-{cn}"] = svg(coin_stacked(fg, bg, 560, W/2, H/2), bg)
    out[f"vild-coin-block-stacked-line-{cn}"]  = svg(coin_stacked(fg, bg, 560, W/2, H/2, solid=False), bg)
    out[f"vild-coin-block-stacked-edge-{cn}"]  = svg(coin_edge(coin_stacked, fg, bg, 540, W/2, H/2 - 15), bg)
for k, v in out.items(): open(f"v16/{k}.svg", "w").write(v)
print("ok")
