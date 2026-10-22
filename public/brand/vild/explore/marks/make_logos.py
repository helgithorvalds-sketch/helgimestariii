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

# all marks live in a unit box (0..1), y down
def m_slice(fg, bg):
    """coin with a V slice taken out of the top: a share of the price comes back"""
    return (f'<circle cx="0.5" cy="0.5" r="0.5" fill="{fg}"/>'
            f'<path d="M0.22,-0.02 H0.78 L0.5,0.52 Z" fill="{bg}"/>')
def m_return(fg, bg):
    """V whose second arm comes back as an arrow: money returns to you"""
    t = 0.085
    return (f'<path d="M0.05,0.05 L0.5,0.95 L0.95,0.05" {st(fg, t)}/>'
            f'<path d="M0.72,0.05 H0.95 V0.28" {st(fg, t)}/>')
def m_loop(fg, bg):
    """one continuous line: down into a small loop (the coin) and up again"""
    t = 0.075; r = 0.13
    return (f'<path d="M0.06,0.04 L0.42,0.72 A{r},{r} 0 1 0 0.58,0.72 L0.94,0.04" {st(fg, t, "butt", "round")}/>')
def m_ribbon(fg, bg):
    """folded ribbon V: the right band lies over the left, a hairline gap marks the fold"""
    return (f'<path d="M0,0 H0.3 L0.65,1 H0.35 Z" fill="{fg}"/>'
            f'<path d="M0.7,0 H1 L0.65,1 H0.35 Z" fill="{fg}" stroke="{bg}" stroke-width="0.035" stroke-linejoin="miter"/>'
            f'<path d="M0.7,0 H1 L0.65,1 H0.35 Z" fill="{fg}"/>'.replace(f'fill="{fg}"/>', f'fill="{fg}" transform="scale(0.999)"/>'))
def m_chevrons(fg, bg):
    """two chevrons, the lower one gathered: it builds up"""
    t = 0.11
    return (f'<path d="M0.05,0.08 L0.5,0.5 L0.95,0.08" {st(fg, t)}/>'
            f'<path d="M0.2,0.58 L0.5,0.86 L0.8,0.58" {st(fg, t)}/>')
def m_catch(fg, bg):
    """V as a cup, coin dropping in"""
    t = 0.1
    return (f'<path d="M0.05,0.3 L0.5,0.98 L0.95,0.3" {st(fg, t)}/>'
            f'<circle cx="0.5" cy="0.14" r="0.12" fill="{fg}"/>')
def m_percent(fg, bg):
    """V between two coins, read as a percent sign: the share back"""
    t = 0.075
    return (f'<path d="M0.3,0.1 L0.5,0.9 L0.7,0.1" {st(fg, t)}/>'
            f'<circle cx="0.15" cy="0.18" r="0.11" fill="{fg}"/><circle cx="0.85" cy="0.82" r="0.11" fill="{fg}"/>')
def m_split(fg, bg):
    """solid V split by a hairline into two halves: what you pay, what comes back"""
    return (f'<path d="M0,0 H0.42 L0.5,0.2 L0.58,0 H1 L0.5,1 Z" fill="{fg}"/>'
            f'<path d="M0.5,0.2 V1" stroke="{bg}" stroke-width="0.05"/>')

MARKS = [("slice", m_slice), ("return", m_return), ("loop", m_loop), ("ribbon", m_ribbon),
         ("chevrons", m_chevrons), ("catch", m_catch), ("percent", m_percent), ("split", m_split)]

def design_mark(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 170, H/2 - 170, 340), bg)
    return d
def design_lockup(fn):
    def d(fg, bg): return svg(g(fn(fg, bg), W/2 - 130, H/2 - 250, 260) + wordmark(fg, 110, W/2, H/2 + 190), bg)
    return d
for name, fn in MARKS:
    for cn, fg, bg in COLOURWAYS:
        open(f"v12/vild-mark-{name}-{cn}.svg", "w").write(design_mark(fn)(fg, bg))
        open(f"v12/vild-lockup-{name}-{cn}.svg", "w").write(design_lockup(fn)(fg, bg))
print("ok")
