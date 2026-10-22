import math
W, H = 1200, 900
LIME, DARK = "#B4FF9B", "#0C5C3B"
COLOURWAYS = [("lime-dark", DARK, LIME), ("dark-lime", LIME, DARK)]
def svg(body, bg): return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
                           f'<rect width="{W}" height="{H}" fill="{bg}"/>{body}</svg>')
def g(body, x, y, s): return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{body}</g>'
def st(fg, t, cap="butt", join="miter"): return f'fill="none" stroke="{fg}" stroke-width="{t}" stroke-linecap="{cap}" stroke-linejoin="{join}"'
_src = open("make_v10.py").read().split("VARIANTS = [")[0]; _ns = {}; exec(_src, _ns)
def wordmark(fg, h, cx, cy): return _ns["deconstructed"](fg, h, cx, cy, dmode="line", whole=True)

def m_boomerang(fg, bg):
    """a boomerang is a V that comes back: two tapered blades"""
    return (f'<path d="M0.04,0.08 Q0.1,0.0 0.17,0.06 L0.5,0.62 L0.83,0.06 Q0.9,0.0 0.96,0.08 '
            f'L0.58,0.9 Q0.5,1.0 0.42,0.9 Z" fill="{fg}"/>')
def m_magnet(fg, bg):
    """magnet: the place keeps pulling the customer back; the coin is on its way in"""
    t = 0.12
    return (f'<path d="M0.16,0.02 V0.5 A0.34,0.34 0 0 0 0.84,0.5 V0.02" {st(fg, t)}/>'
            f'<path d="M0.1,0.02 H0.22 M0.78,0.02 H0.9" {st(fg, 0.0)}/>'
            f'<rect x="0.1" y="0.0" width="0.12" height="0.2" fill="{fg}"/><rect x="0.78" y="0.0" width="0.12" height="0.2" fill="{fg}"/>'
            f'<circle cx="0.5" cy="0.44" r="0.1" fill="{fg}"/>')
def m_dots(fg, bg):
    """coins that add up to a V"""
    pts = [(0.08,0.12),(0.26,0.46),(0.5,0.88),(0.74,0.46),(0.92,0.12)]
    return "".join(f'<circle cx="{x}" cy="{y}" r="0.09" fill="{fg}"/>' for x, y in pts)
def m_coin_return(fg, bg):
    """a coin with an arrow curling back around it"""
    t = 0.065
    return (f'<circle cx="0.5" cy="0.52" r="0.2" fill="{fg}"/>'
            f'<path d="M0.5,0.06 A0.46,0.46 0 1 1 0.04,0.52" {st(fg, t)}/>'
            f'<path d="M-0.08,0.62 L0.04,0.49 L0.16,0.62" {st(fg, t)}/>')
def m_bounce(fg, bg):
    """pay in on the left, coins bounce back out on the right"""
    t = 0.09
    return (f'<path d="M0.06,0.1 L0.46,0.92 L0.86,0.1" {st(fg, t)}/>'
            f'<circle cx="0.9" cy="0.2" r="0.0" fill="{fg}"/>'
            f'<circle cx="0.82" cy="-0.06" r="0.07" fill="{fg}"/><circle cx="0.98" cy="0.06" r="0.07" fill="{fg}"/>')
def m_plate(fg, bg):
    """a plate that is also a coin: ring, rim, and the V in the middle"""
    t = 0.05
    return (f'<circle cx="0.5" cy="0.5" r="0.48" {st(fg, t)}/><circle cx="0.5" cy="0.5" r="0.36" {st(fg, t*0.7)}/>'
            f'<path d="M0.36,0.36 L0.5,0.66 L0.64,0.36" {st(fg, 0.07)}/>')
def m_loop8(fg, bg):
    """the loyalty loop: customer and place in one figure, the V is the crossing"""
    t = 0.07
    return (f'<path d="M0.5,0.5 C0.3,0.2 0.02,0.2 0.02,0.5 C0.02,0.8 0.3,0.8 0.5,0.5 '
            f'C0.7,0.2 0.98,0.2 0.98,0.5 C0.98,0.8 0.7,0.8 0.5,0.5" {st(fg, t, "round", "round")}/>')
def m_exchange(fg, bg):
    """two coins, two arrows: you give, you get back"""
    t = 0.06
    return (f'<circle cx="0.2" cy="0.5" r="0.14" fill="{fg}"/><circle cx="0.8" cy="0.5" r="0.14" fill="{fg}"/>'
            f'<path d="M0.3,0.2 A0.34,0.34 0 0 1 0.7,0.2" {st(fg, t)}/><path d="M0.6,0.1 L0.71,0.21 L0.6,0.32" {st(fg, t)}/>'
            f'<path d="M0.7,0.8 A0.34,0.34 0 0 1 0.3,0.8" {st(fg, t)}/><path d="M0.4,0.9 L0.29,0.79 L0.4,0.68" {st(fg, t)}/>')
def m_slot(fg, bg):
    """a coin half-dropped into the V"""
    t = 0.09
    return (f'<path d="M0.06,0.18 L0.5,0.96 L0.94,0.18" {st(fg, t)}/>'
            f'<path d="M0.33,0.42 A0.17,0.17 0 1 1 0.67,0.42 Z" fill="{fg}"/>')

MARKS = [("boomerang", m_boomerang), ("magnet", m_magnet), ("dots", m_dots), ("coin-return", m_coin_return),
         ("bounce", m_bounce), ("plate", m_plate), ("loop8", m_loop8), ("exchange", m_exchange), ("slot", m_slot)]
def design_mark(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 170, H/2 - 170, 340), bg)
    return d
def design_lockup(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 130, H/2 - 250, 260) + wordmark(fg, 110, W/2, H/2 + 190), bg)
    return d
for name, fn in MARKS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v14/vild-mark-{name}-{cn}.svg", "w").write(design_mark(fn)(fg, bg))
        open(f"v14/vild-lockup-{name}-{cn}.svg", "w").write(design_lockup(fn)(fg, bg))
print("ok")
