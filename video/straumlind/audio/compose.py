#!/usr/bin/env python3
"""
Original 120 BPM score and sound effects for the Straumlind film.
Reads out/meta.json (scene timeline and sound cues exported from the page) and writes audio/out/mix.wav.
Everything is synthesised here; no samples. Structure follows STORYBOARD.md: a filtered intro that drops
when "19%" lands, half-time breaths on every question card, a tension chord while the balance scale is
off, the hook melody after "Hvað þýðir það fyrir þig?", and a final hit on the logo.
Adapted from the Gleðipeningar composer (same synth toolkit and mix chain).
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from pedalboard import Pedalboard, Reverb, Compressor, Delay, Chorus, HighpassFilter, LowpassFilter, PeakFilter, LowShelfFilter, HighShelfFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *  # noqa: E402,F401,F403

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = json.load(open(os.path.join(ROOT, 'out', 'meta.json')))
DUR = float(META['duration']) + 2.5  # let the last chord ring past the picture
N = int(round(DUR * SR))
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
NBARS = int(np.ceil(DUR / BAR))


def bt(n):
    """Beats to seconds."""
    return n * BEAT


def bus():
    return np.zeros((2, N))


def place2(buf, x, t):
    i = int(round(t * SR))
    if i >= len(buf) or i < 0:
        return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n]


# ---------------------------------------------------------------- harmony (D major)
CH = {
    'D': dict(root=38, notes=[57, 62, 66, 69]),        # D
    'A/C#': dict(root=37, notes=[57, 61, 64, 69]),     # A, C# in the bass
    'Bm': dict(root=35, notes=[54, 59, 62, 66]),       # Bm
    'G': dict(root=31, notes=[55, 59, 62, 66]),        # Gmaj7
    'Asus': dict(root=33, notes=[57, 62, 64, 69]),     # Asus4(add9 feel)
    'Em': dict(root=40, notes=[55, 59, 62, 67]),       # Em7: the tension while the scale is off
    'F#m': dict(root=42, notes=[54, 57, 61, 66]),      # F#m: lift into the resolve
    'D9': dict(root=26, notes=[57, 61, 64, 66, 69]),   # Dmaj9 for the end
}
LOOP = ['D', 'A/C#', 'Bm', 'G']
# one chord per bar (bar = 4 beats = 2 s), laid out against the beat map in STORYBOARD.md
PLAN = {}
for bar in range(NBARS):
    PLAN[bar] = LOOP[bar % 4]
PLAN.update({
    0: 'D', 1: 'A/C#',            # intro (filtered)
    2: 'Bm', 3: 'G',              # the drop: "19%"
    4: 'Asus', 5: 'Em',           # main question, Kafli 1
    13: 'Asus',                   # Kafli 2
    20: 'Bm', 21: 'Em', 22: 'D',  # balance: off, then level
    25: 'G', 26: 'Asus',          # recap builds into the tag
    27: 'Asus',                   # Kafli 3
    35: 'Bm', 36: 'G',            # night
    37: 'D', 38: 'F#m',           # across the country
    39: 'Asus',                   # Kafli 4
    43: 'G',
})
for bar in range(44, NBARS):
    PLAN[bar] = 'D9'
CARDS = [4, 5, 13, 27, 39]
FINAL = bt(176)
DROP = bt(8)


def chord(bar):
    return PLAN.get(bar, 'D')


# ---------------------------------------------------------------- arrangement (per bar)
def section(bar):
    s = dict(kick=0, clap=0, hats=0, open=0, bass=None, chords=0, cut=2200, pad=0, arp=0, lead=0, half=0, muffle=0)
    t0 = bar * BAR
    if bar <= 1:                       # intro: pad and plucks, the filter opening
        s.update(chords=0.6, cut=900 + bar * 900, pad=0.7, hats=1 if bar == 1 else 0)
    elif bar in CARDS:                 # question cards: half-time breath
        s.update(kick=1, half=1, bass='long', chords=0.55, cut=1300, pad=0.85)
    elif bar <= 3:                     # the drop
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2600, arp=0.6)
    elif bar <= 12:                    # chapter 1 answer
        s.update(kick=1, clap=1, hats=2, bass='off', chords=0.9, cut=2300, arp=0.55)
    elif bar <= 19:                    # reasons 1, 2
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=0.9, cut=2400, arp=0.7)
    elif bar == 21:                    # the scale is off: thinner, darker
        s.update(kick=1, clap=0.6, hats=1, bass='long', chords=0.7, cut=1200, pad=0.5)
    elif bar <= 24:                    # level again; automation
        s.update(kick=1, clap=1, hats=2, bass='off', chords=1, cut=2500, arp=0.7)
    elif bar <= 26:                    # recap: build
        s.update(kick=1, clap=1, hats=2 + (bar - 25), bass='roll', chords=1, cut=2200 + (bar - 25) * 700, arp=0.8)
    elif bar <= 34:                    # the payoff: chart and homes, with the hook
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2800, arp=0.6, lead=1)
    elif bar <= 36:                    # night: muffled
        s.update(kick=1, clap=0.7, hats=1, bass='off', chords=0.8, cut=900, pad=0.6, muffle=1)
    elif bar <= 38:                    # across the country: the filter opens again
        s.update(kick=1, clap=1, hats=2, bass='off', chords=1, cut=1800 + (bar - 37) * 900, arp=0.8)
    elif bar <= 43:                    # switching
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2700, arp=0.5, lead=0.8 if bar < 43 else 0.5)
    return s


SEC = [section(b_) for b_ in range(NBARS)]
KICK_BREAKS = [(bt(7.5), bt(8)), (bt(175.5), bt(176))]
ROLLS = [(bt(6), bt(8), 0.05, 0.4), (bt(106), bt(108), 0.05, 0.35), (bt(174), bt(176), 0.06, 0.45)]


def in_break(t):
    return any(a <= t < b_ for a, b_ in KICK_BREAKS) or t >= FINAL


# ---------------------------------------------------------------- drums
def drums():
    d = bus()
    K, CL, HC, HO = kick(tau=0.19, punch=110.0, base=52.0), clap(), hat(False, 4), hat(True, 6)
    HC2 = hat(False, 9)
    kicks = []
    for bar in range(NBARS):
        s = SEC[bar]
        for step in range(16):
            t = bar * BAR + step * STEP
            if t >= DUR - 0.01:
                break
            if s['kick'] and step % (8 if s['half'] else 4) == 0 and not in_break(t):
                place(d, K, t, 0.85)
                kicks.append(t)
            if s['clap'] and step in ((8,) if s['half'] else (4, 12)) and not in_break(t):
                place(d, pan(CL, 0.0), t, 0.36 * s['clap'])
            if s['hats'] and not in_break(t):
                if step % 4 == 2:
                    place(d, pan(HC, 0.22), t, 0.22)
                elif s['hats'] >= 2 and step % 2 == 1:
                    place(d, pan(HC2, -0.18), t, 0.07)
                elif s['hats'] >= 3 and step % 4 == 0:
                    place(d, pan(HC2, 0.1), t, 0.06)
            if s['open'] and step == 14 and bar % 2 == 1 and not in_break(t):
                place(d, pan(HO, 0.3), t, 0.1)
    SN = snare(7)
    for a, b_, g0, g1 in ROLLS:
        n = int(round((b_ - a) / STEP))
        for i in range(n):
            t = a + i * STEP
            rate = 2 if (i > n * 0.6) else 1
            for k in range(rate):
                place(d, pan(SN, (0.15 if i % 2 else -0.15)), t + k * STEP / 2, g0 + (g1 - g0) * (i / n))
    place(d, K, FINAL, 1.0)
    kicks.append(FINAL)
    return d, kicks


def sidechain_env(kicks, depth=0.55, tau=0.13):
    env = np.zeros(N)
    L = int(SR * 0.6)
    shape = np.exp(-secs(L) / tau)
    for t in kicks:
        i = int(round(t * SR))
        n = min(L, N - i)
        if n > 0:
            env[i:i + n] = np.maximum(env[i:i + n], shape[:n])
    return 1 - depth * env


# ---------------------------------------------------------------- bass
def bassline():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['bass']:
            continue
        root = CH[chord(bar)]['root']
        f = mtof(root)
        t0 = bar * BAR
        if s['bass'] == 'long':
            n = int(SR * BAR)
            env = adsr(n, a=0.02, d=0.3, s=0.75, r=0.15)
            x = 0.7 * sine(f, n) + 0.3 * lpf(saw(f, n), 360)
            place2(out, x * env * 0.55, t0)
            continue
        steps = {'off': [2, 6, 10, 14], 'roll': list(range(0, 16, 2)) + [15]}[s['bass']]
        for st in steps:
            t = t0 + st * STEP
            if t >= DUR or in_break(t):
                continue
            m = root + (12 if s['bass'] == 'roll' and st % 4 == 2 else 0)
            ff = mtof(m)
            dur = 0.13
            n = int(SR * (dur + 0.05))
            env = adsr(n, a=0.004, d=0.06, s=0.55, r=0.04, hold=dur)
            x = 0.75 * sine(ff, n) + 0.5 * lpf(saw(ff, n), 620)
            place2(out, soft(x * env, 1.3) * 0.5, t)
    return out


# ---------------------------------------------------------------- chords, pad, arp, lead
STAB = [0, 3, 6, 10, 12]


def chord_stabs():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['chords']:
            continue
        notes = CH[chord(bar)]['notes']
        pattern = STAB if bar > 1 else [0, 6, 10]
        for st in pattern:
            t = bar * BAR + st * STEP
            if t >= DUR or (t >= FINAL - 0.01):
                continue
            x = sum(pluck(mtof(m), 0.42, cutoff=s['cut'], tau=0.12, seed=m) for m in notes) / len(notes)
            place2(out, x * 0.55 * s['chords'], t)
    return out


def pads():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['pad']:
            continue
        notes = CH[chord(bar)]['notes']
        n = int(SR * (BAR + 1.2))
        env = adsr(n, a=0.35, d=0.4, s=0.85, r=1.1, hold=BAR)
        x = sum(pad_voice(mtof(m), n, cutoff=1500 if bar not in CARDS else 1900, seed=m) for m in notes) / len(notes)
        place2(out, x * env * 0.5 * s['pad'], bar * BAR)
    return out


def arps():
    out = np.zeros(N)
    seq = [0, 1, 2, 3, 2, 1, 2, 3]
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['arp']:
            continue
        notes = [m + 12 for m in CH[chord(bar)]['notes']]
        for st in range(16):
            t = bar * BAR + st * STEP
            if t >= DUR or t >= FINAL:
                continue
            m = notes[seq[st % 8] % len(notes)] + (12 if st >= 8 and bar % 2 else 0)
            x = fm_bell(mtof(m), dur=0.45, ratio=2.0, index=1.2, tau=0.17, itau=0.06)
            place2(out, x * 0.12 * s['arp'] * (1.0 if st % 4 == 0 else 0.72), t)
    return out


# Original hook, one bar per chord: (16th step, midi note, length in 16ths)
MEL = {
    'D': [(0, 74, 2), (2, 78, 2), (4, 81, 3), (8, 79, 1), (9, 78, 1), (10, 76, 2), (12, 78, 3)],
    'A/C#': [(0, 73, 2), (2, 76, 2), (4, 81, 3), (8, 80, 1), (9, 78, 1), (10, 76, 2), (12, 73, 3)],
    'Bm': [(0, 74, 2), (2, 78, 2), (4, 83, 3), (8, 81, 1), (9, 79, 1), (10, 78, 2), (12, 74, 3)],
    'G': [(0, 79, 2), (2, 78, 2), (4, 76, 3), (8, 74, 2), (10, 71, 2), (12, 74, 3)],
}


def lead():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['lead']:
            continue
        for st, m, ln in MEL.get(chord(bar), []):
            t = bar * BAR + st * STEP
            if t >= FINAL:
                continue
            dur = ln * STEP + 0.18
            n = int(SR * dur)
            body = pluck(mtof(m), dur, cutoff=3000, tau=0.2 + ln * 0.03, detune=0.05, seed=m, bright=1.6)
            sub = sine(mtof(m) * 2, n) * expdec(n, 0.12) * 0.15
            place2(out, (body + sub) * 0.3 * s['lead'], t)
    return out


def final_chord():
    out = np.zeros(N)
    notes = CH['D9']['notes'] + [50, 38]
    n = int(SR * 6.0)
    env = expdec(n, 2.0, 0.004)
    x = sum(pad_voice(mtof(m), n, cutoff=3200, voices=5, seed=m) for m in notes) / len(notes)
    place2(out, x * env * 0.7, FINAL)
    for k, m in enumerate([74, 78, 81, 86]):
        place2(out, fm_bell(mtof(m), 3.2, ratio=3.5, index=1.3, tau=1.2) * 0.11, FINAL + k * BEAT / 2)
    return out


# ---------------------------------------------------------------- sound effects
def sfx_whoosh(dur=0.6, f0=300, f1=2400, seed=11):
    n = int(SR * dur)
    x = sweep_bpf(noise(n, seed), f0, f1, q=1.4)
    tt = secs(n) / dur
    env = np.sin(np.pi * np.clip(tt, 0, 1)) ** 1.6
    xs = x * env * 2.2
    p = np.linspace(-0.5, 0.5, n)
    return np.stack([xs * np.cos((p + 1) * np.pi / 4), xs * np.sin((p + 1) * np.pi / 4)])


def sfx_swell(dur=0.6, seed=3):
    """Tonal swell into a cut: chord tones under an opening filter, a breath of air on top. No hiss."""
    n = int(SR * (dur + 0.25))
    tt = secs(n)
    rise = np.clip(tt / dur, 0, 1) ** 2.2
    fall = np.exp(-np.clip(tt - dur, 0, None) * 9)
    env = np.where(tt < dur, rise, fall)
    x = np.zeros(n)
    for k, m in enumerate([62, 69, 74, 78]):
        x += saw(mtof(m) * (1 + 0.003 * k), n) / 4
    x = sweep_lpf(x, 400, 5200)
    air = bpf(noise(n, seed), 2500, 8000) * 0.05
    return (x * 0.6 + air) * env


def sfx_clink(pitch=1.0, seed=12):
    n = int(SR * 1.2)
    t = secs(n)
    f0 = 2350 * pitch
    x = np.zeros(n)
    for ratio, amp, tau in [(1.0, 1.0, 0.32), (2.76, 0.55, 0.16), (5.4, 0.35, 0.08), (8.93, 0.2, 0.05), (1.5, 0.25, 0.22)]:
        x += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / tau)
    x += hpf(noise(n, seed), 3000) * np.exp(-t / 0.004) * 0.6
    return x * 0.35


def sfx_tink(pitch=1.0):
    return sfx_clink(pitch * 1.6) * 0.6


def sfx_coin(pitch=1.0):
    a = fm_bell(1568 * pitch, 0.5, ratio=2.0, index=0.8, tau=0.12, itau=0.05)
    b_ = fm_bell(2093 * pitch, 0.5, ratio=2.0, index=0.8, tau=0.2, itau=0.05)
    x = np.zeros(int(SR * 0.6))
    x[: len(a)] += a * 0.6
    i = int(SR * 0.06)
    x[i:i + len(b_)] += b_[: len(x) - i] * 0.7
    return x * 0.5


def sfx_tick(pitch=1.0, seed=14):
    n = int(SR * 0.05)
    t = secs(n)
    return (bpf(noise(n, seed), 2500 * pitch, 7000 * pitch) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 1800 * pitch * t) * np.exp(-t / 0.01) * 0.4) * 0.6


def sfx_pop(pitch=1.0, seed=15):
    n = int(SR * 0.12)
    t = secs(n)
    f = (320 + 900 * (1 - np.exp(-t / 0.02))) * pitch
    return (sine(f, n) * np.exp(-t / 0.035) * (1 - np.exp(-t / 0.002)) + bpf(noise(n, seed), 1500, 5000) * np.exp(-t / 0.004) * 0.2) * 0.6


def sfx_popcloud(dur=2.3, seed=16):
    n = int(SR * (dur + 0.2))
    out = np.zeros((2, n))
    r = rng(seed)
    t = 0.0
    while t < dur:
        p = t / dur
        pp = sfx_pop(0.8 + r.random() * 0.9 + p * 0.3, seed=int(r.integers(1000)))
        place(out, pan(pp, r.uniform(-0.7, 0.7)), t, 0.22 + 0.2 * r.random())
        t += 1 / (8 + 60 * np.sin(np.pi * min(1, p * 1.1)) ** 0.7)
    return out


def sfx_counter(dur=2.0, seed=17):
    n = int(SR * (dur + 0.1))
    out = np.zeros(n)
    t = 0.0
    while t < dur:
        p = t / dur
        tk = sfx_tick(0.9 + 0.8 * p, seed)
        i = int(t * SR)
        out[i:i + len(tk)] += tk[: n - i] * 0.5
        t += 0.028 + 0.11 * p ** 3
    return out * 0.7


def sfx_stab():
    x = sum(pluck(mtof(m), 1.4, cutoff=4200, tau=0.3, seed=m, bright=1.6) for m in [62, 66, 69, 74, 78]) / 5
    return x * 0.8


def sfx_beep():
    n = int(SR * 0.22)
    t = secs(n)
    x = np.sin(2 * np.pi * 1975 * t) * adsr(n, 0.004, 0.02, 0.8, 0.03, hold=0.18)
    return soft(x * 1.4, 1.5) * 0.35


def sfx_thud(seed=19, pitch=1.0):
    n = int(SR * 0.4)
    t = secs(n)
    x = sine((48 + 70 * np.exp(-t / 0.03)) * pitch, n) * np.exp(-t / 0.12) + lpf(noise(n, seed), 600) * np.exp(-t / 0.03) * 0.5
    return soft(x, 1.4) * 0.7


def sfx_ruler(dur=0.45, seed=20, pitch=1.0):
    n = int(SR * dur)
    x = sweep_bpf(noise(n, seed), 600 * pitch, 5000 * pitch, q=3)
    env = np.sin(np.pi * np.clip(secs(n) / dur, 0, 1)) ** 0.8
    return x * env * 1.1


def sfx_riser(dur=1.5, seed=21):
    n = int(SR * dur)
    t = secs(n) / dur
    nz = sweep_bpf(noise(n, seed), 400, 7000, q=1.2) * t ** 2.4
    sw = sine(220 * 2 ** (t * 1.5), n) * t ** 2 * 0.2
    return widen((nz * 1.1 + sw) * 0.6, 9, 0.6)


def sfx_impact(seed=22):
    n = int(SR * 1.6)
    t = secs(n)
    sub = sine(62 * np.exp(-t / 0.5) + 26, n) * np.exp(-t / 0.45)
    nz = lpf(noise(n, seed), 2000) * np.exp(-t / 0.08)
    return soft(sub * 1.1 + nz * 0.5, 1.6) * 0.8


def sfx_thock(pitch=1.0):
    n = int(SR * 0.3)
    t = secs(n)
    return sine((310 + 160 * np.exp(-t / 0.01)) * pitch, n) * np.exp(-t / 0.05) * 0.7


def sfx_flip(seed=24):
    n = int(SR * 0.3)
    t = secs(n)
    x = bpf(noise(n, seed), 1500, 5000) * np.exp(-t / 0.05) * 0.5
    tone = sine(900 + 1400 * (t / 0.3), n) * np.exp(-t / 0.08) * 0.3
    return x + tone


def sfx_slam(pitch=1.0, seed=26):
    n = int(SR * 0.5)
    t = secs(n)
    body = sine(70 * pitch + 60 * np.exp(-t / 0.02), n) * np.exp(-t / 0.1)
    slap = bpf(noise(n, seed), 500, 4000) * np.exp(-t / 0.02)
    return soft(body * 0.9 + slap * 0.6, 1.5) * 0.7


def sfx_notify():
    n = int(SR * 1.4)
    out = np.zeros(n)
    a = fm_bell(1318.5, 1.2, ratio=2.0, index=0.7, tau=0.35)
    b_ = fm_bell(1975.5, 1.2, ratio=2.0, index=0.7, tau=0.5)
    out[: len(a)] += a * 0.5
    i = int(0.13 * SR)
    out[i:i + len(b_)] += b_[: n - i] * 0.6
    return out * 0.6


def sfx_blip(pitch=1.0):
    """A short round sine with a quick upward glide."""
    n = int(SR * 0.3)
    t = secs(n)
    f = 880 * pitch * (1 + 0.35 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 15) * np.clip(t / 0.002, 0, 1) * 0.6


def sfx_paper(seed=40):
    n = int(SR * 0.35)
    t = secs(n)
    x = bpf(noise(n, seed), 1200, 6000) * np.sin(np.pi * np.clip(t / 0.35, 0, 1)) ** 1.2
    return x * 0.35


def sfx_clack(seed=41):
    n = int(SR * 0.35)
    out = np.zeros(n)
    for k, d in enumerate([0.0, 0.07]):
        i = int(d * SR)
        m = int(SR * 0.08)
        tt = secs(m)
        c = (sine(1100 - k * 250, m) * np.exp(-tt / 0.02) + bpf(noise(m, seed + k), 1500, 6000) * np.exp(-tt / 0.006) * 0.6)
        out[i:i + m] += c[: n - i]
    return out * 0.6


def sfx_node():
    n = int(SR * 2.4)
    out = np.zeros(n)
    for k, m in enumerate([74, 81, 86]):
        i = int(k * 0.06 * SR)
        b_ = fm_bell(mtof(m), 2.0, ratio=3.0, index=1.0, tau=0.8)
        out[i:i + len(b_)] += b_[: n - i] * 0.15
    return out


def sfx_draw(dur=1.7):
    """A gentle rising tone with shimmer while the forecast line draws."""
    n = int(SR * dur)
    t = secs(n) / dur
    f = mtof(62) * 2 ** (t * 1.0)
    x = sine(f, n) * 0.5 + sine(f * 2, n) * 0.18 * t
    env = np.clip(t * 6, 0, 1) * np.clip((1 - t) * 8, 0, 1)
    return lpf(x, 3500) * env * 0.4


def sfx_block(pitch=1.0, seed=42):
    n = int(SR * 0.4)
    t = secs(n)
    x = sine((520 * pitch) + 220 * np.exp(-t / 0.01), n) * np.exp(-t / 0.06) + bpf(noise(n, seed), 1200, 5000) * np.exp(-t / 0.008) * 0.5
    return soft(x, 1.3) * 0.6


def sfx_creak(seed=43):
    n = int(SR * 0.6)
    t = secs(n)
    f = 140 + 60 * np.sin(2 * np.pi * 1.6 * t)
    x = lpf(saw(f, n), 900) * np.sin(np.pi * np.clip(t / 0.6, 0, 1))
    return x * 0.12


def sfx_level():
    n = int(SR * 2.0)
    out = np.zeros(n)
    for k, m in enumerate([74, 78, 81, 86]):
        i = int(k * 0.07 * SR)
        b_ = fm_bell(mtof(m), 1.6, ratio=2.0, index=0.9, tau=0.7)
        out[i:i + len(b_)] += b_[: n - i] * 0.14
    return out


def sfx_hit():
    x = sfx_impact(44)
    s = sfx_stab()
    out = np.zeros(max(len(x), len(s)))
    out[: len(x)] += x * 0.8
    out[: len(s)] += s * 0.7
    return out


def sfx_click(seed=45):
    n = int(SR * 0.12)
    t = secs(n)
    return (bpf(noise(n, seed), 2000, 8000) * np.exp(-t / 0.004) + sine(2200, n) * np.exp(-t / 0.01) * 0.4) * 0.7


def sfx_drive(dur=1.0):
    """Electric car arriving: a soft whir that falls as it slows."""
    n = int(SR * dur)
    t = secs(n) / dur
    f = 420 * (1 - 0.45 * t)
    x = sine(f, n) * 0.4 + sine(f * 1.5, n) * 0.15
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 0.8
    return lpf(x, 1800) * env * 0.35


def sfx_sparkle(dur=2.0, seed=46):
    n = int(SR * (dur + 1.0))
    out = np.zeros((2, n))
    r = rng(seed)
    notes = [74, 78, 81, 83, 86, 90, 93]
    t = 0.0
    while t < dur:
        m = notes[int(r.integers(len(notes)))]
        b_ = fm_bell(mtof(m), 0.9, ratio=3.0, index=0.8, tau=0.3)
        place(out, pan(b_, r.uniform(-0.8, 0.8)), t, 0.05 + 0.05 * r.random())
        t += 0.06 + 0.06 * r.random()
    return out


def sfx_final():
    return sfx_impact(50) * 0.7


WEIGHT = {'coin': 0.68, 'beep': 0.6, 'tink': 0.85, 'notify': 0.85, 'level': 0.8, 'counter': 0.85, 'popcloud': 1.1, 'node': 0.8,
          'sparkle': 0.9, 'swell': 0.75, 'paper': 1.1, 'draw': 0.8, 'creak': 0.7}


def render_cue(c):
    name = c['name']
    g = float(c.get('gain', 0.6))
    p = float(c.get('pitch', 1.0))
    d = float(c.get('dur', 0.5))
    fns = {
        'swell': lambda: sfx_swell(d),
        'tink': lambda: sfx_tink(p),
        'coin': lambda: sfx_coin(p),
        'tick': lambda: sfx_tick(p),
        'pop': lambda: sfx_pop(p),
        'popcloud': lambda: sfx_popcloud(d),
        'counter': lambda: sfx_counter(d),
        'stab': sfx_stab,
        'beep': sfx_beep,
        'thud': lambda: sfx_thud(pitch=p),
        'ruler': lambda: sfx_ruler(d, pitch=p),
        'impact': sfx_impact,
        'thock': lambda: sfx_thock(p),
        'flip': sfx_flip,
        'slam': lambda: sfx_slam(p),
        'notify': sfx_notify,
        'blip': lambda: sfx_blip(p),
        'paper': sfx_paper,
        'clack': sfx_clack,
        'node': sfx_node,
        'draw': lambda: sfx_draw(d),
        'block': lambda: sfx_block(p),
        'creak': sfx_creak,
        'level': sfx_level,
        'hit': sfx_hit,
        'click': sfx_click,
        'drive': lambda: sfx_drive(d),
        'sparkle': lambda: sfx_sparkle(d),
        'final': sfx_final,
    }
    if name not in fns:
        print('unknown cue', name)
        return None
    return fns[name]() * g


# ---------------------------------------------------------------- mix
def fx_board(x, board):
    y = board(x.astype(np.float32), SR)
    return y.astype(np.float64)


def power(x, windows):
    pw = []
    for a, b_ in windows:
        seg = x[..., int(a * SR): int(b_ * SR)]
        if seg.size:
            pw.append(np.mean(seg ** 2))
    return float(np.mean(pw)) if pw else 1e-12


def stage(x, target_db, windows):
    cur = 10 * np.log10(power(x, windows) + 1e-15)
    return x * 10 ** ((target_db - cur) / 20)


def main():
    out_dir = os.path.join(ROOT, 'audio', 'out')
    os.makedirs(out_dir, exist_ok=True)
    print('drums...')
    dr, kicks = drums()
    sc = sidechain_env(kicks)
    print('bass, chords, pad, arp, lead...')
    bs = bassline() * sc
    chd = chord_stabs() * sc
    pd = pads() * (0.5 + 0.5 * sc)
    ar = arps()
    ld = lead()
    fin = final_chord()

    GROOVE = [(bt(8), bt(16)), (bt(112), bt(140))]
    DOT8 = BEAT * 0.75
    drums_b = stage(fx_board(dr, Pedalboard([HighpassFilter(34), Reverb(room_size=0.22, damping=0.7, wet_level=0.07, dry_level=1.0)])), -18.0, GROOVE)
    bass_b = stage(fx_board(pan(bs, 0), Pedalboard([HighpassFilter(36)])), -19.0, GROOVE)
    chords_b = stage(fx_board(widen(chd, 12, 0.55), Pedalboard([Chorus(rate_hz=0.6, depth=0.25, mix=0.3), Reverb(room_size=0.45, damping=0.6, wet_level=0.18, dry_level=0.9, width=1.0)])), -24.0, GROOVE)
    pad_b = stage(fx_board(widen(pd, 18, 0.7), Pedalboard([Chorus(rate_hz=0.3, depth=0.4, mix=0.5), Reverb(room_size=0.85, damping=0.5, wet_level=0.35, dry_level=0.75, width=1.0)])), -25.5, [(0, bt(8)), (bt(16), bt(24))])
    arp_b = stage(fx_board(pan(ar, -0.25), Pedalboard([Delay(delay_seconds=DOT8, feedback=0.26, mix=0.2), Reverb(room_size=0.6, wet_level=0.22, dry_level=0.85)])), -30.5, [(bt(56), bt(80))])
    lead_b = stage(fx_board(pan(ld, 0.05), Pedalboard([Delay(delay_seconds=DOT8, feedback=0.28, mix=0.18), Reverb(room_size=0.55, wet_level=0.2, dry_level=0.9)])), -24.5, [(bt(112), bt(140))])
    fin_b = stage(fx_board(widen(fin, 15, 0.7), Pedalboard([Reverb(room_size=0.9, damping=0.4, wet_level=0.45, dry_level=0.8, width=1.0)])), -19.0, [(FINAL, FINAL + 1.5)])
    music = drums_b + bass_b + chords_b + pad_b + arp_b + lead_b + fin_b

    # crashes at the big moments, a reverse swell and a riser into the drop and the end
    CR = crash(5)
    for t in [8, 24, 56, 112, 160]:
        place(music, widen(CR, 9, 0.6), bt(t), 0.045)
    place(music, widen(crash(8, 2.6), 9, 0.6), FINAL, 0.06)
    rc = crash(8, 1.2)[::-1]
    place(music, widen(rc, 9, 0.6), DROP - len(rc) / SR, 0.03)
    for a, b_ in [(bt(4), bt(8)), (bt(172), bt(176))]:
        rz = sfx_riser(b_ - a)
        place(music, rz / np.max(np.abs(rz)), a, 0.09)

    # intro: the whole bus opens from a low-pass into the drop; the night section is muffled
    tt = secs(N)
    intro = np.clip(tt / DROP, 0, 1)
    lo = fx_board(music, Pedalboard([LowpassFilter(cutoff_frequency_hz=700)]))
    w = np.where(tt < DROP, 1 - intro ** 2.2, 0.0)
    night_a, night_b = bt(140), bt(148)
    wn = np.interp(tt, [night_a - 0.3, night_a + 0.4, night_b - 0.6, night_b], [0, 0.75, 0.75, 0])
    wmix = np.maximum(w, wn)
    music = music * (1 - wmix) + lo * wmix

    # tonal balance: warm lows, less 2-3 kHz bite
    music = fx_board(music, Pedalboard([LowShelfFilter(cutoff_frequency_hz=140, gain_db=4.0, q=0.7), PeakFilter(cutoff_frequency_hz=320, gain_db=1.5, q=0.8),
                                        PeakFilter(cutoff_frequency_hz=2400, gain_db=-4.0, q=0.8), HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.0, q=0.7)]))
    # cards sit a little lower so the answers land
    sec_db = np.zeros(N)
    for c in CARDS:
        sec_db += np.interp(tt, [bt(c * 4) - 0.05, bt(c * 4) + 0.1, bt(c * 4 + 3.6), bt(c * 4 + 4)], [0, -1.8, -1.8, 0], left=0, right=0)
    music *= 10 ** (sec_db / 20)

    print('cues...')
    sfx = bus()
    for c in META['cues']:
        x = render_cue(c)
        if x is None:
            continue
        if x.ndim == 1:
            x = pan(x, 0.0)
        pk = np.max(np.abs(x))
        if pk > 0:
            x = x / pk * float(c.get('gain', 0.6)) * 0.6 * WEIGHT.get(c['name'], 1.0)
        place(sfx, x, c['t'], 1.0)
    sfx = fx_board(sfx, Pedalboard([PeakFilter(cutoff_frequency_hz=2050, gain_db=-3.0, q=1.2), PeakFilter(cutoff_frequency_hz=2650, gain_db=-4.0, q=1.2), Reverb(room_size=0.3, damping=0.6, wet_level=0.12, dry_level=1.0, width=0.8)]))

    # duck the music a little under the effects so they read clearly
    a = np.abs(sfx).max(0)
    dec = 48
    ad = a[: N // dec * dec].reshape(-1, dec).max(1)
    ed = np.zeros_like(ad)
    att_d, rel_d = np.exp(-dec / (SR * 0.01)), np.exp(-dec / (SR * 0.22))
    lvl = 0.0
    for i, v in enumerate(ad):
        lvl = att_d * lvl + (1 - att_d) * v if v > lvl else rel_d * lvl + (1 - rel_d) * v
        ed[i] = lvl
    env = np.zeros(N)
    env[: len(ed) * dec] = np.repeat(ed, dec)
    duck = 1 - 0.25 * np.clip(env / 0.25, 0, 1)
    music *= duck * 0.8

    mix = (music + sfx) * 0.6
    mix = fx_board(mix, Pedalboard([HighpassFilter(24), Compressor(threshold_db=-20, ratio=2.0, attack_ms=15, release_ms=180)]))
    mix *= 10 ** (5.5 / 20)
    mix = brickwall(mix, ceiling_db=-1.6)
    f = int(0.6 * SR)
    mix[:, -f:] *= np.linspace(1, 0, f)
    fi = int(0.02 * SR)
    mix[:, :fi] *= np.linspace(0, 1, fi)
    peak = np.max(np.abs(mix))
    rms = np.sqrt(np.mean(mix ** 2))
    print(f'mix peak {20*np.log10(peak+1e-9):.1f} dBFS, rms {20*np.log10(rms+1e-9):.1f} dBFS')
    wavfile.write(os.path.join(out_dir, 'mix.wav'), SR, (mix.T * 32767).astype(np.int16))
    print('wrote', out_dir)


if __name__ == '__main__':
    main()
