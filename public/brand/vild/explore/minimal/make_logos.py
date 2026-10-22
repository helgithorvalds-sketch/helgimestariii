import math
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg, w=W, h=H):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def stroke(fg, t, cap="butt"): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="{cap}" stroke-linejoin="miter"'

# ---------- A. hairline + one solid form (L'C) : thin V I L, solid D with a slit ----------
def hairline_solid(fg, bg, h, cx, cy, t=0.06, gap=0.34):
    st = stroke(fg, t); x = 0; p = []
    p.append(f'<path d="M{t/2:.3f},0 L{0.45:.3f},{1-t*0.6:.3f} L{0.9-t/2:.3f},0" {st}/>'); x += 0.9 + gap
    p.append(f'<path d="M{x+t/2:.3f},0 V1" {st}/>'); x += t + gap
    p.append(f'<path d="M{x+t/2:.3f},0 V{1-t/2:.3f} H{x+0.6:.3f}" {st}/>'); x += 0.6 + gap
    r = 0.5; dw = 0.3 + r
    p.append(f'<path d="M{x:.3f},0 H{x+0.3:.3f} A{r},{r} 0 0 1 {x+0.3:.3f},1 H{x:.3f} Z" fill="{fg}"/>')
    p.append(f'<rect x="{x+0.3:.3f}" y="{0.5-t*0.6:.3f}" width="{r+0.01:.3f}" height="{t*1.2:.3f}" fill="{bg}"/>')  # slit, like the C
    x += dw
    return g("".join(p), cx - x*h/2, cy - h/2, h)

# ---------- B. deconstructed strokes with wide tracking (SEEKER) ----------
def deconstructed(fg, h, cx, cy, t=0.055, gap=0.5, cut=0.09):
    st = stroke(fg, t); x = 0; p = []
    # V: two diagonals that stop short of meeting
    p.append(f'<path d="M0,0 L{0.45-cut*0.5:.3f},{1-cut:.3f} M{0.9:.3f},0 L{0.45+cut*0.5:.3f},{1-cut:.3f}" {st}/>'); x += 0.9 + gap
    p.append(f'<path d="M{x:.3f},0 V1" {st}/>'); x += gap
    p.append(f'<path d="M{x:.3f},0 V{1-cut:.3f} M{x+cut:.3f},1 H{x+0.6:.3f}" {st}/>'); x += 0.6 + gap
    p.append(f'<path d="M{x:.3f},0 V1 M{x+cut:.3f},{t/2:.3f} H{x+0.3:.3f} A{0.5-t/2:.3f},{0.5-t/2:.3f} 0 0 1 {x+0.3:.3f},{1-t/2:.3f} H{x+cut:.3f}" {st}/>'); x += 0.8
    return g("".join(p), cx - x*h/2, cy - h/2, h)

# ---------- C. monoline, I and L share one stem (MOOD) ----------
def shared_stem(fg, h, cx, cy, t=0.11, gap=0.36):
    st = stroke(fg, t, "round"); x = 0; p = []
    p.append(f'<path d="M{t/2:.3f},{t/2:.3f} L{0.47:.3f},{1-t/2:.3f} L{0.94-t/2:.3f},{t/2:.3f}" {st}/>'); x += 0.94 + gap
    # i and L in one: dot above a stem that turns into the foot
    p.append(f'<circle cx="{x+t/2:.3f}" cy="{-0.34:.3f}" r="{t*0.62:.3f}" fill="{fg}"/>')
    p.append(f'<path d="M{x+t/2:.3f},{t/2:.3f} V{1-t/2:.3f} H{x+0.55:.3f}" {st}/>'); x += 0.55 + gap
    p.append(f'<path d="M{x+t/2:.3f},{t/2:.3f} V{1-t/2:.3f} M{x+t/2:.3f},{t/2:.3f} H{x+0.3:.3f} A{0.5-t/2:.3f},{0.5-t/2:.3f} 0 0 1 {x+0.3:.3f},{1-t/2:.3f} H{x+t/2:.3f}" {st}/>'); x += 0.8 + t
    return g("".join(p), cx - x*h/2, cy - (1-0.34)/2*h + 0.17*h, h)

# ---------- D. thin overlapping monogram (41 / for only one) ----------
def monogram(fg, h, cx, cy, t=0.045):
    st = stroke(fg, t)
    # V, a tall stem with a foot (I + L) passing through the right arm, and a circle (D / coin) around the crossing
    p = (f'<path d="M0,0.15 L0.62,1.15 L1.24,0.15" {st}/>'
         f'<path d="M0.93,-0.25 V1.3 H1.42" {st}/>'
         f'<circle cx="0.93" cy="0.55" r="0.42" {st}/>'
         f'<circle cx="0.93" cy="-0.46" r="{t*1.3:.3f}" fill="{fg}"/>')
    return g(p, cx - 1.42*h/2, cy - (1.3+0.5)/2*h + 0.5*h, h)

def design_A(fg, bg): return svg(hairline_solid(fg, bg, 240, W/2, H/2), bg)
def design_B(fg, bg): return svg(deconstructed(fg, 230, W/2, H/2), bg)
def design_C(fg, bg): return svg(shared_stem(fg, 230, W/2, H/2), bg)
def design_D(fg, bg): return svg(monogram(fg, 300, W/2, H/2), bg)
def design_D_lockup(fg, bg):
    return svg(monogram(fg, 230, W/2, H/2 - 120) + deconstructed(fg, 95, W/2, H/2 + 190, t=0.07, gap=0.6), bg)
def design_A_icon(fg, bg):
    S = 560; r = S*0.22; x = W/2 - S/2; y = H/2 - S/2
    return svg(f'<rect x="{x}" y="{y}" width="{S}" height="{S}" rx="{r}" fill="{fg}"/>' + monogram(bg, S*0.42, W/2, H/2), bg)

DESIGNS = [("hairline-solid", design_A), ("deconstructed", design_B), ("shared-stem", design_C),
           ("monogram", design_D), ("monogram-lockup", design_D_lockup), ("monogram-icon", design_A_icon)]
for dn, fn in DESIGNS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v6/vild-{dn}-{cn}.svg", "w").write(fn(fg, bg))
print("ok")
