# Own synthesis for the Gísla saga ep. 1 soundtrack (numpy/scipy only; builds on the MIT dsp.py / sfx_gen.py /
# instruments.py kit copied from claude-animated-shorts, see LICENSE-claude-animated-shorts.txt).
# Instruments: folk fiddle (bowed additive + body resonances, vibrato, bow noise, tremolo), bowed drone,
# lyre / kantele pluck, frame drum (doum / tek / big), lur (wooden horn), jaw harp (munnharpa).
# Effects: fire roar + crackle, steam hiss, splash, wood chop, gate slam, body thud, sword shing, peg-leg tok,
# owl, gulls, waves, sail flap, crowd footsteps, torch whoosh, wall crash, low boom, hard hit.
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, reson, resbank, peq, colored, smooth_noise, fades, shape, phase,
                 modal, pan, st, widen)
import instruments as I
import sfx_gen as G


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def _place(buf, x, t):
    i = ns(t)
    a, b = max(0, i), min(buf.shape[-1], i + x.shape[-1])
    if b > a:
        buf[..., a:b] += x[..., a - i: b - i]


# ================================================================ instruments
_BODY = [(290, 0.9, 0.35), (480, 1.0, 0.3), (1100, 0.55, 0.45), (2700, 0.8, 0.35), (4400, 0.35, 0.4)]  # (Hz, gain, oct width)


def _body(f):
    g = 0.25 + sum(a * np.exp(-0.5 * (np.log2(f / fc) / w) ** 2) for fc, a, w in _BODY)
    return g / (1 + (f / 6500.0) ** 3)


def fiddle(f, dur, vel=0.7, r=None, rel=0.12, vib_depth=14.0, vib_rate=5.6, scoop=-18.0, trem=0.0, bright=1.0):
    """folk fiddle note: sawtooth-like additive partials weighted by a violin body response, delayed vibrato,
    bow noise; trem > 0 = bowed tremolo (Hz)"""
    r = r or rng(0)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    att = 0.045 if not trem else 0.02
    env = np.ones(n)
    a = ns(att)
    env[:a] = np.linspace(0, 1, a) ** 1.3
    d = ns(dur)
    if d < n:
        env[d:] *= np.linspace(1, 0, n - d) ** 1.6
    env *= 1 + 0.12 * np.exp(-((t - att) / 0.05) ** 2)          # bow bite
    if trem:
        tr = 0.55 + 0.45 * np.abs(np.sin(np.pi * trem * t + r.uniform(0, TAU))) ** 0.6
        env *= tr
    vib = vib_depth * np.clip((t - 0.16) / 0.25, 0, 1) * np.sin(TAU * vib_rate * t + r.uniform(0, TAU))
    cents = scoop * np.exp(-t / 0.04) + vib + 3.0 * smooth_noise(n, r, 3.0)
    ph = phase(f * 2 ** (cents / 1200))
    K = int(min(40, 9000 / f))
    y = np.zeros(n)
    for k in range(1, K + 1):
        fk = k * f
        y += (1.0 / k ** (1.05 / bright)) * _body(fk) * np.sin(k * ph + r.uniform(0, TAU))
    nz = r.standard_normal(n)
    bow = bp(nz, 1800, 7000, 1) * 0.05 + reson(nz, min(f * 2, 6000), 4) * 0.03
    return (y * env + bow * env) * vel * 0.35


def drone(freqs, dur, vel=0.5, r=None, att=1.2, rel=1.2, warm=1500.0, breath=0.25):
    """bowed drone strings (hardanger / nyckelharpa feel): stereo, slow bow-pressure breathing"""
    r = r or rng(0)
    n = ns(dur + rel)
    t = np.arange(n) / SR
    env = np.ones(n)
    a = ns(att)
    env[:a] = 0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, a))
    d = ns(dur)
    if d < n:
        env[d:] *= 0.5 + 0.5 * np.cos(np.pi * np.linspace(0, 1, n - d))
    out = np.zeros((2, n))
    for f in freqs:
        for side, dc in ((0, -4.0), (1, 4.0)):
            br = 1 + breath * smooth_noise(n, r, 0.35)
            cents = dc + 2.5 * smooth_noise(n, r, 0.8)
            ph = phase(f * 2 ** (cents / 1200))
            K = int(min(30, warm * 2.2 / f))
            y = np.zeros(n)
            for k in range(1, K + 1):
                y += (1 / k) / (1 + (k * f / warm) ** 2) * _body(k * f) * np.sin(k * ph + r.uniform(0, TAU))
            out[side] += y * br
    out += 0.02 * np.stack([bp(r.standard_normal(n), 1500, 5000, 1) for _ in range(2)]) * (1 + breath * smooth_noise(n, r, 0.3))
    return out * env * vel / np.sqrt(len(freqs))


def lyre(f, vel=0.6, r=None, dur=1.8, bright=0.55):
    """lyre / kantele pluck: gut-ish string, warm, longer ring than the pizzicato"""
    r = r or rng(0)
    y = I.pluck(f, vel, r, dur=dur, bright=bright, pos=0.13)
    t = tt(dur)
    y += 0.25 * vel * np.sin(TAU * f * t + r.uniform(0, TAU)) * np.exp(-t / 0.9) * (1 - np.exp(-t / 0.003))
    return y


def framedrum(kind="doum", vel=0.7, r=None):
    """frame drum: 'doum' (open low centre hit), 'tek' (rim/edge), 'big' (large drum for the slow ritual beat)"""
    r = r or rng(0)
    if kind == "tek":
        dur = 0.25
        t = tt(dur)
        y = modal(dur, [(r.uniform(330, 380), 0.6, 0.03), (r.uniform(610, 680), 0.5, 0.02), (r.uniform(950, 1100), 0.35, 0.012)], r)
        y += bp(r.standard_normal(len(t)), 900, 6000, 1) * np.exp(-t / 0.008) * 0.9
        return fades(y * vel, 0.0, 0.03)
    if kind == "big":
        dur = 2.2
        t = tt(dur)
        f0 = r.uniform(52, 58)
        y = modal(dur, [(f0, 1.0, 0.55), (f0 * 1.59, 0.4, 0.3), (f0 * 2.14, 0.25, 0.2), (f0 * 2.65, 0.15, 0.12)], r, glide=0.12, glide_tau=0.05)
        y += lp(r.standard_normal(len(t)), 500, 2) * np.exp(-t / 0.03) * 1.2
        y += bp(r.standard_normal(len(t)), 200, 3000, 1) * np.exp(-t / 0.012) * 0.4
        return fades(y * vel, 0.0, 0.2)
    dur = 0.9
    t = tt(dur)
    f0 = r.uniform(76, 86)
    y = modal(dur, [(f0, 1.0, 0.28), (f0 * 1.59, 0.45, 0.15), (f0 * 2.14, 0.3, 0.1), (f0 * 2.3, 0.2, 0.08)], r, glide=0.08, glide_tau=0.03)
    y += lp(r.standard_normal(len(t)), 700, 2) * np.exp(-t / 0.02) * 0.7
    y += bp(r.standard_normal(len(t)), 700, 5000, 1) * np.exp(-t / 0.006) * 0.25
    return fades(y * vel, 0.0, 0.1)


def lur(f, dur, vel=0.7, r=None, kind="soft"):
    """wooden horn / lur call - the bridge kit's additive brass voiced softer and woodier"""
    r = r or rng(0)
    y = I.brass(f, dur, vel, r, kind, scoop=-30.0, rel=0.15)
    return lp(y, 3200, 1)


def jawharp(f0, dur, r, wah=((0, 600), (0.15, 1800), (0.35, 700), (0.6, 1500))):
    """munnharpa: buzzy reed pulse train through a moving mouth formant ('boi-oing')"""
    n = ns(dur)
    t = np.arange(n) / SR
    ph = phase(np.full(n, f0) * (1 + 0.01 * np.sin(TAU * 6 * t)))
    saw = (ph / TAU) % 1.0
    src = np.where(saw < 0.12, 1.0, 0.0) - 0.12
    fc = np.interp(t, [p[0] for p in wah], [p[1] for p in wah])
    y = shape(src, lambda T, F: (np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / np.interp(T, t, fc)[None, :]) / 0.35) ** 2) * 3
                                 + np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / f0) / 0.5) ** 2)), 1024, 128)
    env = (1 - np.exp(-t / 0.004)) * np.exp(-t / (dur * 0.5))
    return fades(y * env, 0.001, 0.05)


# ================================================================ fire / water / steam
def crackle(dur, r, rate=14.0, env=None, big=0.15, lowpass=None):
    """burning wood crackle: random pops (short broadband ticks through small resonances), some bigger snaps"""
    n = ns(dur)
    y = np.zeros(n)
    tm = r.uniform(0, 0.05)
    while tm < dur:
        k = ns(tm)
        a = 1.0 if env is None else env[min(k, n - 1)]
        rr = rate if np.isscalar(rate) else rate[min(k, n - 1)]
        if a > 0.01:
            L = ns(0.03)
            tl = np.arange(L) / SR
            if r.uniform() < big:
                pop = modal(0.06, [(r.uniform(700, 1600), 1, 0.008), (r.uniform(1800, 4000), 0.7, 0.004)], r)
                pop += hp(r.standard_normal(ns(0.06)), 900) * np.exp(-tt(0.06) / 0.004) * 1.4
                g = r.uniform(0.6, 1.0)
            else:
                pop = hp(r.standard_normal(L), 1500) * np.exp(-tl / r.uniform(0.0006, 0.002))
                g = r.uniform(0.15, 0.6)
            m = min(len(pop), n - k)
            y[k:k + m] += pop[:m] * g * a
        tm += r.exponential(1.0 / max(rr, 0.2))
    if lowpass:
        y = lp(y, lowpass, 2)
    return y


def fire_bed(dur, r, level_curve=None, inside=False):
    """fire: low roar (brown noise, flickering), mid 'whoosh' breathing, crackle on top; stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    lv = np.ones(n) if level_curve is None else level_curve
    out = np.zeros((2, n))
    for ch in range(2):
        flick = 0.65 + 0.35 * smooth_noise(n, r, 3.0)
        roar = lp(colored(n, r, 2.0), 380, 2) * flick * 1.2
        breath = bp(colored(n, r, 1.0), 300, 1600, 1) * (0.5 + 0.5 * smooth_noise(n, r, 0.8)) * 0.35
        cr = crackle(dur, r, 10 + 26 * lv, lv, big=0.18) * 0.55
        out[ch] = (roar + breath) * lv + cr
    if inside:
        out = lp(out, 900, 2)
    return out


def hiss(dur, r, strength=1.0):
    """water/whey hitting the flames: steam hiss burst + sizzle (spectrum falling as it cools) + a few spits"""
    n = ns(dur)
    t = np.arange(n) / SR
    nz = colored(n, r, 0.3)
    fc = lambda T: 2500 + 5500 * np.exp(-T / (dur * 0.35))
    y = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 50) / fc(T)[None, :]) / 1.1) ** 2), 1024, 256)
    env = (1 - np.exp(-t / 0.012)) * (0.55 * np.exp(-t / (dur * 0.18)) + 0.45 * np.exp(-t / (dur * 0.45)))
    y = y * env
    sz = crackle(dur, r, 120 * np.exp(-t / (dur * 0.3)) + 5, np.exp(-t / (dur * 0.4)), big=0.0) * 0.4
    thump = lp(r.standard_normal(n), 300, 2) * np.exp(-t / 0.05) * 0.5
    return fades((y + sz + thump) * strength, 0.002, 0.08)


def splash_small(r):
    """goat skin dunked into a vat of whey: slap, gulp, slosh, bubbles"""
    dur = 1.1
    n = ns(dur)
    t = np.arange(n) / SR
    nz = r.standard_normal(n)
    slap = bp(nz, 300, 6000, 1) * np.exp(-t / 0.025) * 1.2
    gulp = np.exp(-t / 0.12) * np.sin(phase(140 * (1 + 0.6 * np.exp(-t / 0.04)))) * 0.6
    body = shape(colored(n, r, 0.5), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / (700 + 900 * np.exp(-T[None, :] / 0.2))) / 1.2) ** 2), 1024, 256)
    body *= (1 - np.exp(-t / 0.015)) * np.exp(-t / 0.25) * 0.9
    bub = G.bubbles(dur, r, 300 * np.exp(-t / 0.35) + 8, 300, 1800, (0.006, 0.025), np.exp(-t / 0.5)) * 0.7
    return fades(slap + gulp + body + bub, 0.0, 0.15)


# ================================================================ wood / metal / impacts
def chop(r, big=1.0):
    """axe / chisel biting into wood: hard click, wood body knock, a short splinter crunch"""
    dur = 0.45
    t = tt(dur)
    n = len(t)
    click = hp(r.standard_normal(n), 2500) * np.exp(-t / 0.0015) * 1.2
    knock = modal(dur, [(r.uniform(180, 230), 1.0, 0.05), (r.uniform(420, 520), 0.8, 0.035), (r.uniform(900, 1100), 0.5, 0.02),
                        (r.uniform(1700, 2100), 0.3, 0.012)], r)
    thud = lp(r.standard_normal(n), 400, 2) * np.exp(-t / 0.02) * 0.9
    crunch = crackle(0.12, r, 160, None, big=0.3)
    y = click + knock * 1.4 + thud
    y[: len(crunch)] += crunch * 0.4 * np.exp(-np.arange(len(crunch)) / SR / 0.04)
    return fades(y * big, 0.0, 0.05)


def gate_slam(r):
    """wooden farm gate slammed: plank boom, frame rattle, latch clank, small bounce"""
    dur = 1.2
    t = tt(dur)
    n = len(t)
    boom = modal(dur, [(r.uniform(95, 110), 1.0, 0.12), (r.uniform(190, 230), 0.8, 0.08), (r.uniform(380, 450), 0.6, 0.05),
                       (r.uniform(760, 880), 0.35, 0.03)], r) * 1.4
    hit = bp(r.standard_normal(n), 200, 5000, 1) * np.exp(-t / 0.01) * 1.0
    y = boom + hit
    latch = G.clink(r, 1900, 0.15) * 0.6
    y[ns(0.015): ns(0.015) + len(latch)] += latch
    rat = G.rattle(0.35, r, 40, np.exp(-np.linspace(0, 1, ns(0.35)) * 4), heavy=True) * 0.25
    y[ns(0.02): ns(0.02) + len(rat)] += rat
    b2 = modal(0.4, [(r.uniform(190, 230), 0.4, 0.05), (r.uniform(400, 460), 0.3, 0.03)], r)
    y[ns(0.16): ns(0.16) + len(b2)] += b2
    return fades(y, 0.0, 0.2)


def thud(r):
    """heavy body falling behind a stone wall (no gore): low thump + dirt + cloth"""
    dur = 0.9
    t = tt(dur)
    n = len(t)
    low = np.exp(-t / 0.13) * np.sin(phase(68 * (1 + 0.5 * np.exp(-t / 0.02)))) * 1.6
    dirt = lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.05) * 1.0
    cloth = bp(r.standard_normal(n), 800, 4000, 1) * np.exp(-t / 0.06) * 0.25
    grit = crackle(0.4, r, 80, np.exp(-np.linspace(0, 6, ns(0.4))), big=0.0) * 0.3
    y = low + dirt + cloth
    y[ns(0.02): ns(0.02) + len(grit)] += grit
    return fades(y, 0.0, 0.15)


def sword_shing(r):
    """sword drawn and raised: steel scrape rising into a long bright ring"""
    dur = 1.7
    n = ns(dur)
    t = np.arange(n) / SR
    scrape_env = np.clip(t / 0.04, 0, 1) * np.exp(-np.maximum(t - 0.05, 0) / 0.18)
    nz = r.standard_normal(n)
    fc = 3500 + 3500 * np.clip(t / 0.25, 0, 1)
    scrape = shape(nz, lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 50) / np.interp(T, t, fc)[None, :]) / 0.5) ** 2), 1024, 128)
    scrape *= scrape_env
    ringenv = (1 - np.exp(-np.maximum(t - 0.06, 0) / 0.03)) * (t > 0.06)
    ring = modal(dur, [(2350, 1.0, 0.9), (2350 * 2.76, 0.5, 0.45), (2350 * 5.4, 0.25, 0.2), (3420, 0.6, 0.7), (5070, 0.3, 0.35)], r)
    ring *= ringenv * (1 + 0.15 * np.sin(TAU * 7 * t))
    return fades(scrape * 0.9 + ring * 0.45, 0.002, 0.2)


def whoosh_impact(r, gap=0.2):
    """spear swing: fast whoosh, then a hard impact (thump + crack), flash cut"""
    w = G.whoosh(0.45, r, gap * 0.85, 400, 2600, 0.8, 0.08, 0.35)
    imp_d = 0.8
    ti = tt(imp_d)
    imp = np.exp(-ti / 0.09) * np.sin(phase(75 * (1 + 0.6 * np.exp(-ti / 0.015)))) * 1.8
    imp += bp(r.standard_normal(len(ti)), 600, 9000, 2) * np.exp(-ti / 0.006) * 1.6
    imp += modal(imp_d, [(r.uniform(400, 500), 0.5, 0.04), (r.uniform(1100, 1300), 0.3, 0.02)], r)
    y = np.zeros(ns(gap + imp_d))
    y[: len(w)] += w
    y[ns(gap): ns(gap) + len(imp)] += imp
    return fades(y, 0.002, 0.15)


def peg_tok(r, pitch=1.0):
    """wooden peg leg on a wooden floor: hollow 'tok'"""
    dur = 0.3
    t = tt(dur)
    n = len(t)
    y = modal(dur, [(560 * pitch, 1.0, 0.03), (1240 * pitch, 0.6, 0.018), (2050 * pitch, 0.3, 0.01)], r)
    y += hp(r.standard_normal(n), 1500) * np.exp(-t / 0.0015) * 0.5
    y += lp(r.standard_normal(n), 300) * np.exp(-t / 0.015) * 0.5
    return fades(y, 0.0, 0.04)


def wall_crash(r):
    """kicking through a timber/turf wall: crack, splintering, boards and turf falling"""
    dur = 2.0
    n = ns(dur)
    y = np.zeros(n)
    c = G.wood_crack(r)
    y[: len(c)] += c * 0.9
    tm = 0.08
    while tm < 1.2:
        k = chop(r, r.uniform(0.2, 0.55)) * np.exp(-tm / 0.6)
        _place(y, k, tm)
        tm += r.exponential(0.09) + 0.03
    dirt = lp(colored(n, r, 1.5), 1200, 2) * np.exp(-tt(dur) / 0.35) * (1 - np.exp(-tt(dur) / 0.05)) * 0.5
    return fades(y + dirt, 0.0, 0.3)


def low_boom(r, dur=1.8, f0=44.0):
    t = tt(dur)
    n = len(t)
    y = np.exp(-t / (dur * 0.33)) * np.sin(phase(f0 * (1 + 0.35 * np.exp(-t / 0.05))))
    y += 0.4 * np.exp(-t / (dur * 0.2)) * np.sin(phase(2 * f0 * (1 + 0.3 * np.exp(-t / 0.04))) + 0.5)
    y += lp(r.standard_normal(n), 250, 2) * np.exp(-t / 0.04) * 0.6
    return fades(y * (1 - np.exp(-t / 0.004)), 0.0, 0.25)


def hard_hit(r):
    """the hand yanked back: sharp crack + big drum + low thump, short reverse-swell pre-roll of 20 ms only"""
    dur = 1.6
    t = tt(dur)
    n = len(t)
    crack = bp(r.standard_normal(n), 1200, 12000, 2) * np.exp(-t / 0.005) * 2.0
    snap = I.snare(1.0, r, dur=0.4, tune=1.3)
    drum = framedrum("big", 1.0, r)
    y = crack + np.pad(drum, (0, max(0, n - len(drum))))[:n] * 1.4
    y[: len(snap)] += snap * 0.8
    y += np.exp(-t / 0.25) * np.sin(phase(58 * (1 + 0.5 * np.exp(-t / 0.03)))) * 1.2
    return fades(y, 0.0, 0.3)


# ================================================================ creatures / nature / crowd
def owl(r, f0=390.0):
    """tawny-owl-like 'hoo ... hoo-hoo': breathy sine with a falling glide, formant-filtered breath"""
    out = np.zeros(ns(1.6))
    for (t0, d, g) in [(0.0, 0.5, 1.0), (0.75, 0.22, 0.7), (1.02, 0.4, 0.85)]:
        n = ns(d)
        t = np.arange(n) / SR
        f = f0 * (1.06 - 0.1 * t / d) * (1 + 0.004 * np.sin(TAU * 8 * t))
        env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
        y = (np.sin(phase(f)) + 0.06 * np.sin(2 * phase(f))) * env
        y += reson(r.standard_normal(n), f0, 6) * env * 0.08
        _place(out, y * g, t0)
    return lp(out, 2500, 1)


def gull(r, base=None):
    """herring-gull call 'kyow': harsh tone, rising then falling pitch"""
    base = base or r.uniform(1250, 1500)
    d = r.uniform(0.32, 0.45)
    n = ns(d)
    t = np.arange(n) / SR
    u = t / d
    f = base * (1 + 0.45 * np.sin(np.pi * np.clip(u * 1.3, 0, 1)) - 0.25 * u)
    ph = phase(f)
    y = np.sin(ph) + 0.6 * np.sin(2 * ph + 0.3) + 0.35 * np.sin(3 * ph + 1) + 0.18 * np.sin(4 * ph)
    y = peq(y, 2800, 6, 1.2)
    env = np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.08, 0, 1)
    y += bp(r.standard_normal(n), 2000, 6000, 1) * env * 0.15
    return fades(y * env, 0.002, 0.03)


def waves(dur, r, period=5.5):
    """sea from a ship: broad wash swells, bow splash, hull slap; stereo"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        ph0 = r.uniform(0, TAU)
        sw = 0.5 + 0.5 * np.sin(TAU * t / (period * r.uniform(0.9, 1.1)) + ph0)
        sw = sw ** 2 * (0.7 + 0.3 * smooth_noise(n, r, 0.3))
        wash = shape(colored(n, r, 0.9), lambda T, F: np.exp(-0.5 * (np.log2(np.maximum(F[:, None], 20) / 700) / 1.6) ** 2), 2048, 512)
        rum = lp(colored(n, r, 2.0), 140, 2) * 0.5
        out[ch] = wash * (0.25 + 0.75 * sw) + rum
    tm = r.uniform(0.5, 1.5)
    while tm < dur - 0.6:
        s = splash_small(r) * 0.35
        p = r.uniform(-0.6, 0.6)
        _place(out, pan(lp(s, 3000, 1), p), tm)
        tm += r.exponential(2.2) + 1.0
    return out


def sail_flap(dur, r):
    """square sail luffing: canvas flutter + occasional snaps"""
    n = ns(dur)
    y = G.flag_flutter(dur, r) * 0.8
    y = lp(y, 2500, 1)
    tm = r.uniform(0.3, 1.0)
    while tm < dur - 0.3:
        L = ns(0.12)
        tl = np.arange(L) / SR
        s = bp(r.standard_normal(L), 300, 3000, 1) * np.exp(-tl / 0.02) * 1.5
        s += lp(r.standard_normal(L), 250) * np.exp(-tl / 0.03) * 0.8
        k = ns(tm)
        y[k:k + L] += s[: n - k]
        tm += r.uniform(1.0, 2.2)
    return y


def crowd_steps(dur, r, people=24, rate=1.8, env=None):
    """many men walking fast on grass and gravel at night: soft crunches, gear jingle; stereo"""
    n = ns(dur)
    out = np.zeros((2, n))
    for p in range(people):
        y = np.zeros(n)
        tm = r.uniform(0, 0.6)
        sp = rate * r.uniform(0.85, 1.15)
        while tm < dur:
            L = ns(0.12)
            tl = np.arange(L) / SR
            c = bp(r.standard_normal(L), r.uniform(500, 900), r.uniform(2500, 5000), 1) * np.exp(-tl / r.uniform(0.02, 0.04))
            c += lp(r.standard_normal(L), 250) * np.exp(-tl / 0.015) * 0.6
            k = ns(tm)
            y[k:k + L] += c[: n - k] * r.uniform(0.4, 1.0)
            tm += 1 / sp * r.uniform(0.9, 1.1)
        g = r.uniform(0.3, 1.0)
        out += pan(lp(y, r.uniform(2500, 7000), 1) * g, r.uniform(-0.85, 0.85))
    if env is not None:
        out *= env[None, :]
    return out


def torch_whoosh(r, dur=0.9):
    """a torch swung past: soft flame whoosh with a flutter"""
    y = G.whoosh(dur, r, 0.3, 250, 1200, 1.0, 0.25, 0.05)
    t = tt(dur)
    y *= 0.75 + 0.25 * np.sin(TAU * 11 * t)
    return y + crackle(dur, r, 20, np.exp(-t / 0.4), big=0.1) * 0.2


def ignite(r):
    """fire catching the turf wall: low 'whoomp' swell + roar onset"""
    dur = 1.6
    t = tt(dur)
    n = len(t)
    env = np.clip(t / 0.12, 0, 1) ** 1.5 * np.exp(-np.maximum(t - 0.15, 0) / 0.6)
    roar = lp(colored(n, r, 1.6), 700, 2) * env * 1.4
    wh = G.whoosh(dur, r, 0.14, 200, 1400, 1.1, 0.35, 0.05) * 0.8
    pop = np.exp(-t / 0.1) * np.sin(phase(60 * (1 + 0.4 * np.exp(-t / 0.03)))) * 0.8
    return fades(roar + wh + pop + crackle(dur, r, 30, env, big=0.2) * 0.4, 0.004, 0.3)


def card_pop(r, f0=None):
    """tiny UI 'pop' for a name card: rising bubble pluck + soft wood tick"""
    f0 = f0 or r.uniform(620, 700)
    d = 0.16
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 0.7 * (1 - np.exp(-t / 0.03))))) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.002))
    y += modal(d, [(1900, 0.25, 0.01)], r)
    return fades(y, 0.0, 0.03)


def comic_sour(r):
    """'súr' sting: pucker squeak up + three falling pizzicato plucks (wah-wah-wah)"""
    out = np.zeros(ns(1.1))
    d = 0.16
    t = tt(d)
    sq = np.sin(phase(np.linspace(900, 1700, len(t)))) * np.sin(np.pi * t / d) ** 2 * 0.5
    _place(out, sq, 0.0)
    for k, m in enumerate([74, 73, 72]):
        _place(out, I.pluck(m2f(m), 0.8, r, dur=0.5, bright=0.7), 0.17 + k * 0.17)
    _place(out, I.pluck(m2f(50), 0.9, r, dur=0.6, bright=0.4), 0.17 + 3 * 0.17)
    return out


def brass_laugh(r):
    """Skeggi's laugh as a big low lur/brass stab figure (no voice): HO - ho - ho - HOO"""
    out = np.zeros(ns(1.6))
    for k, (dt, m, d, v) in enumerate([(0.0, 50, 0.16, 1.0), (0.2, 50, 0.13, 0.8), (0.37, 48, 0.13, 0.8), (0.55, 45, 0.5, 0.95)]):
        for mm, g in ((m, 1.0), (m + 7, 0.55), (m - 12, 0.7)):
            y = I.brass(m2f(mm), d, v, r, "stab", scoop=-40, rel=0.08, fall=-1.5 if k == 3 else 0.0)
            _place(out, y * g, dt)
    return out
