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

def m_pin(fg, bg):
    """map pin: the places you earn at. the head is a coin, the tail is the V"""
    return (f'<path d="M0.5,1 L0.1,0.42 A0.4,0.4 0 1 1 0.9,0.42 Z" fill="{fg}"/>'
            f'<circle cx="0.5" cy="0.4" r="0.16" fill="{bg}"/>')
def m_pin_line(fg, bg):
    t = 0.07
    return (f'<path d="M0.5,0.98 L0.13,0.44 A0.37,0.37 0 1 1 0.87,0.44 Z" {st(fg, t, "butt", "miter")}/>'
            f'<circle cx="0.5" cy="0.4" r="0.11" fill="{fg}"/>')
def m_vd(fg, bg):
    """V and D in one: a half coin with the V cut out"""
    return (f'<path d="M0.2,0 H0.5 A0.5,0.5 0 0 1 0.5,1 H0.2 Z" fill="{fg}"/>'
            f'<path d="M0.28,0.2 H0.44 L0.52,0.58 L0.6,0.2 H0.76 L0.58,0.82 H0.46 Z" fill="{bg}"/>')
def m_tag(fg, bg):
    """price tag pointing down: its body is the V, the hole is the coin"""
    t = 0.07
    return (f'<path d="M0.18,0.04 H0.82 V0.42 L0.5,0.97 L0.18,0.42 Z" {st(fg, t, "butt", "miter")}/>'
            f'<circle cx="0.5" cy="0.24" r="0.08" fill="{fg}"/>')
def m_card(fg, bg):
    """card with a V notch: the part that comes back off the bill"""
    return (f'<rect x="0.0" y="0.18" width="1.0" height="0.64" rx="0.09" fill="{fg}"/>'
            f'<path d="M0.41,0.16 H0.59 L0.5,0.36 Z" fill="{bg}"/>'
            f'<rect x="0.12" y="0.6" width="0.3" height="0.07" fill="{bg}"/>')
def m_cycle(fg, bg):
    """V inside a returning arc: the money circles back"""
    t = 0.065
    return (f'<path d="M0.5,0.04 A0.46,0.46 0 1 1 0.04,0.5" {st(fg, t)}/>'
            f'<path d="M-0.08,0.6 L0.04,0.47 L0.16,0.6" {st(fg, t)}/>'
            f'<path d="M0.32,0.32 L0.5,0.7 L0.68,0.32" {st(fg, 0.085)}/>')
def m_vplus(fg, bg):
    """V plus: more back"""
    t = 0.09
    return (f'<path d="M0.04,0.12 L0.44,0.92 L0.84,0.12" {st(fg, t)}/>'
            f'<path d="M0.86,0.04 V0.34 M0.71,0.19 H1.01" {st(fg, 0.07)}/>')
def m_ticket(fg, bg):
    """a receipt whose torn edge is one V"""
    return (f'<path d="M0.2,0 H0.8 V0.72 L0.5,1 L0.2,0.72 Z" fill="{fg}"/>'
            f'<path d="M0.32,0.2 H0.68 M0.32,0.34 H0.68 M0.32,0.48 H0.56" {st(bg, 0.05)}/>')
def m_diamond(fg, bg):
    """V in a fine rhombus: premium"""
    t = 0.045
    return (f'<path d="M0.5,0.02 L0.98,0.5 L0.5,0.98 L0.02,0.5 Z" {st(fg, t)}/>'
            f'<path d="M0.3,0.34 L0.5,0.72 L0.7,0.34" {st(fg, 0.075)}/>')

MARKS = [("pin", m_pin), ("pin-line", m_pin_line), ("vd", m_vd), ("tag", m_tag), ("card", m_card),
         ("cycle", m_cycle), ("vplus", m_vplus), ("ticket", m_ticket), ("diamond", m_diamond)]
def design_mark(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 170, H/2 - 170, 340), bg)
    return d
def design_lockup(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 130, H/2 - 250, 260) + wordmark(fg, 110, W/2, H/2 + 190), bg)
    return d
for name, fn in MARKS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v13/vild-mark-{name}-{cn}.svg", "w").write(design_mark(fn)(fg, bg))
        open(f"v13/vild-lockup-{name}-{cn}.svg", "w").write(design_lockup(fn)(fg, bg))
print("ok")
