#!/usr/bin/env python3
"""
Original 120 BPM score + sound effects for the Takk krónur film.
Reads out/meta.json (scene timeline and sound cues exported from the page) and writes audio/out/mix.wav.
Every sound is synthesised here; no samples are used.
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from pedalboard import Pedalboard, Reverb, Compressor, Limiter, Delay, Chorus, HighpassFilter, LowpassFilter, PeakFilter, LowShelfFilter, HighShelfFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import *  # noqa: E402,F401,F403

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = json.load(open(os.path.join(ROOT, 'out', 'meta.json')))
DUR = float(META['duration'])
N = int(round(DUR * SR))
BEAT, BAR = 0.5, 2.0
STEP = BEAT / 4
NBARS = int(np.ceil(DUR / BAR))


def bus():
    return np.zeros((2, N))


# ---------------------------------------------------------------- harmony
CH = {
    'F': dict(root=41, notes=[53, 57, 60, 64]),      # Fmaj7
    'C/E': dict(root=40, notes=[55, 60, 64, 67]),    # C with E in the bass
    'Dm': dict(root=38, notes=[53, 57, 60, 62]),     # Dm7
    'Bb': dict(root=34, notes=[53, 57, 58, 62]),     # Bbmaj7
    'Csus': dict(root=36, notes=[53, 55, 60, 65]),   # Csus4
    'F9': dict(root=29, notes=[57, 60, 64, 67, 69]),  # Fmaj9
}
LOOP = ['F', 'C/E', 'Dm', 'Bb']
SPECIAL = {21: 'Bb', 22: 'Csus', 31: 'Dm', 32: 'Bb', 33: 'F', 34: 'Bb', 35: 'Dm', 36: 'Bb', 37: 'Csus', 44: 'F9', 45: 'F9'}


def chord(bar):
    return SPECIAL.get(bar, LOOP[bar % 4])


# ---------------------------------------------------------------- arrangement (per 2-second bar)
def section(bar):
    s = dict(kick=0, clap=0, hats=0, open=0, bass=None, chords=0, cut=2200, pad=0, arp=0, lead=0, bells=0)
    if bar <= 1:  # coin
        s.update(hats=1 if bar == 1 else 0, chords=0.55, cut=900 + bar * 700, pad=0.5)
    elif bar <= 7:  # 65.000, how it works
        s.update(kick=1, clap=1, hats=1, bass='off', chords=1, cut=2100)
    elif bar <= 12:  # discount, butter, chart rises
        s.update(kick=1, clap=1, hats=2, bass='off', chords=1, cut=2400, arp=0.8)
    elif bar <= 16:  # 15 %, Refurinn
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2700, arp=1, bells=1)
    elif bar <= 20:  # why it works
        s.update(kick=1, clap=1, hats=2, bass='roll', chords=1, cut=2500, arp=0.7)
    elif bar <= 22:  # pivot breakdown
        s.update(pad=1, bass='long', chords=0.5, cut=700 + (bar - 21) * 900)
    elif bar <= 30:  # drop: offers + the math
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2600, arp=0.8, lead=1)
    elif bar <= 32:  # friday night, muffled club
        s.update(kick=1, clap=0.7, hats=1, bass='club', chords=0.8, cut=650)
    elif bar <= 34:  # saturday morning
        s.update(pad=0.9, bells=1)
    elif bar <= 37:  # goal build
        s.update(kick=1, hats=1 if bar == 35 else 2, clap=0 if bar == 35 else 1, bass='off', chords=0.8, cut=1400 + (bar - 35) * 700, arp=0.5 + (bar - 35) * 0.25)
    elif bar <= 41:  # unlocked, cost
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2600, arp=0.8, lead=1)
    elif bar <= 43:  # closing lines
        s.update(kick=1, clap=0.6, hats=1, bass='off', chords=0.9, cut=1700 - (bar - 42) * 500, pad=0.4)
    return s


SEC = [section(b) for b in range(NBARS)]
KICK_BREAKS = [(25.5, 26.0), (65.62, 66.0)]  # no kick in these windows
STOP = (65.62, 66.0)  # tape stop when the bar's lights go out


def in_break(t):
    return any(a <= t < b for a, b in KICK_BREAKS)


# ---------------------------------------------------------------- drums
def drums():
    d = bus()
    K, CL, HC, HO = kick(), clap(), hat(False, 4), hat(True, 6)
    HC2 = hat(False, 9)
    kicks = []
    for bar in range(NBARS):
        s = SEC[bar]
        for step in range(16):
            t = bar * BAR + step * STEP
            if t >= DUR - 0.01:
                break
            if s['kick'] and step % 4 == 0 and not in_break(t):
                place(d, K, t, 0.9)
                kicks.append(t)
            if s['clap'] and step in (4, 12) and not in_break(t):
                place(d, pan(CL, 0.0), t, 0.42 * s['clap'])
            if s['hats']:
                if step % 4 == 2:
                    place(d, pan(HC, 0.22), t, 0.26)
                elif s['hats'] >= 2 and step % 2 == 1:
                    place(d, pan(HC2, -0.18), t, 0.085)
            if s['open'] and step == 14 and bar % 2 == 1:
                place(d, pan(HO, 0.3), t, 0.12)
    # snare rolls into the big moments
    SN = snare(7)
    for a, b_, g0, g1 in [(25.0, 26.0, 0.12, 0.42), (44.0, 46.0, 0.06, 0.45), (74.0, 76.0, 0.08, 0.45)]:
        n = int(round((b_ - a) / STEP))
        for i in range(n):
            t = a + i * STEP
            rate = 2 if (i > n * 0.6) else 1
            for k in range(rate):
                tt = t + k * STEP / 2
                g = g0 + (g1 - g0) * (i / n)
                place(d, pan(SN, (0.15 if i % 2 else -0.15)), tt, g)
    # the last hit
    place(d, K, 88.0, 1.0)
    kicks.append(88.0)
    return d, kicks


def sidechain_env(kicks, depth=0.6, tau=0.14):
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
            x = 0.7 * sine(f, n) + 0.35 * lpf(saw(f, n), 380)
            place2(out, x * env * 0.55, t0)
            continue
        steps = {'off': [2, 6, 10, 14], 'roll': list(range(16)), 'club': [0, 2, 6, 8, 10, 14]}[s['bass']]
        for st in steps:
            t = t0 + st * STEP
            if t >= DUR:
                continue
            m = root + (12 if s['bass'] == 'roll' and st % 2 == 1 else 0)
            ff = mtof(m)
            dur = 0.12 if s['bass'] != 'club' else 0.2
            n = int(SR * (dur + 0.05))
            env = adsr(n, a=0.004, d=0.06, s=0.55, r=0.04, hold=dur)
            cut = 650 if s['bass'] != 'club' else 420
            x = 0.75 * sine(ff, n) + 0.55 * lpf(saw(ff, n), cut)
            g = 0.5 if s['bass'] != 'roll' else (0.42 if st % 2 == 0 else 0.3)
            place2(out, soft(x * env, 1.3) * g, t)
    return out


def place2(buf, x, t):
    i = int(round(t * SR))
    if i >= len(buf):
        return
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n]


# ---------------------------------------------------------------- chords, pad, arp, bells, lead
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
            if t >= DUR or (STOP[0] <= t < STOP[1] + 0.3 and bar == 32 and st >= 10):
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
        x = sum(pad_voice(mtof(m), n, cutoff=1500 if bar != 22 else 2600, seed=m) for m in notes) / len(notes)
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
            if t >= DUR:
                continue
            m = notes[seq[st % 8] % len(notes)] + (12 if st >= 8 and bar % 2 else 0)
            x = fm_bell(mtof(m), dur=0.45, ratio=2.0, index=1.3, tau=0.18, itau=0.06)
            place2(out, x * 0.13 * s['arp'] * (1.0 if st % 4 == 0 else 0.75), t)
    return out


def bells():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['bells']:
            continue
        notes = [m + 24 for m in CH[chord(bar)]['notes']]
        hits = [0, 6, 10] if bar >= 33 else [2, 10]
        for k, st in enumerate(hits):
            t = bar * BAR + st * STEP
            m = notes[(k + bar) % len(notes)]
            x = fm_bell(mtof(m), dur=1.6, ratio=3.5, index=1.6, tau=0.7, itau=0.15)
            place2(out, x * 0.12, t)
    return out


# Original hook, one bar per chord: (16th step, midi note, length in 16ths)
MEL = {
    'F': [(0, 69, 2), (2, 72, 2), (4, 77, 2), (6, 76, 1), (7, 72, 1), (10, 69, 2), (12, 72, 3)],
    'C/E': [(0, 67, 2), (2, 72, 2), (4, 76, 2), (6, 74, 1), (7, 72, 1), (10, 67, 2), (12, 76, 3)],
    'Dm': [(0, 65, 2), (2, 69, 2), (4, 74, 2), (6, 72, 1), (7, 69, 1), (10, 65, 2), (12, 69, 3)],
    'Bb': [(0, 74, 2), (2, 77, 2), (4, 81, 2), (6, 79, 1), (7, 77, 1), (10, 74, 2), (12, 72, 3)],
}


def lead():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['lead']:
            continue
        for st, m, ln in MEL.get(chord(bar), []):
            t = bar * BAR + st * STEP
            dur = ln * STEP + 0.18
            n = int(SR * dur)
            body = pluck(mtof(m), dur, cutoff=3000, tau=0.2 + ln * 0.03, detune=0.05, seed=m, bright=1.7)
            sub = sine(mtof(m) * 2, n) * expdec(n, 0.12) * 0.18
            place2(out, (body + sub) * 0.3, t)
    return out


def final_chord():
    out = np.zeros(N)
    notes = CH['F9']['notes'] + [53, 41]
    n = int(SR * 3.0)
    env = expdec(n, 1.1, 0.004)
    x = sum(pad_voice(mtof(m), n, cutoff=3200, voices=5, seed=m) for m in notes) / len(notes)
    place2(out, x * env * 0.7, 88.0)
    for m in [69, 72, 76, 81]:
        place2(out, fm_bell(mtof(m), 2.6, ratio=3.5, index=1.4, tau=1.0) * 0.12, 88.0)
    return out


# ---------------------------------------------------------------- sound effects
def sfx_whoosh(dur=0.6, f0=300, f1=2400, seed=11):
    n = int(SR * dur)
    x = sweep_bpf(noise(n, seed), f0, f1, q=1.4)
    t = secs(n) / dur
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 1.6
    xs = x * env * 2.2
    p = np.linspace(-0.5, 0.5, n)
    return np.stack([xs * np.cos((p + 1) * np.pi / 4), xs * np.sin((p + 1) * np.pi / 4)])


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
    n = int(SR * 0.5)
    a = fm_bell(1568 * pitch, 0.5, ratio=2.0, index=0.8, tau=0.12, itau=0.05)
    b = fm_bell(2093 * pitch, 0.5, ratio=2.0, index=0.8, tau=0.2, itau=0.05)
    x = np.zeros(int(SR * 0.6))
    x[: len(a)] += a * 0.6
    i = int(SR * 0.06)
    x[i:i + len(b)] += b[: len(x) - i] * 0.7
    return x * 0.5


def sfx_rattle(dur=1.8, seed=13):
    n = int(SR * dur)
    x = np.zeros(n)
    t = 0.0
    r = rng(seed)
    click = hpf(noise(400, seed), 2000) * np.exp(-secs(400) / 0.0015)
    while t < dur - 0.01:
        p = t / dur
        rate = 9 + 70 * p ** 2.2
        i = int(t * SR)
        g = 0.25 + 0.5 * p
        x[i:i + len(click)] += click[: n - i] * g * (0.8 + 0.4 * r.random())
        t += 1 / rate
    ring = sine(2400 + 1600 * (secs(n) / dur) ** 2, n) * 0.05 * (secs(n) / dur)
    return (x + ring) * 0.5


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
        t += 1 / (8 + 70 * np.sin(np.pi * min(1, p * 1.1)) ** 0.7)
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
    n = int(SR * 1.4)
    x = sum(pluck(mtof(m), 1.4, cutoff=4200, tau=0.3, seed=m, bright=1.6) for m in [65, 69, 72, 76, 81]) / 5
    return x * 0.8


def sfx_beep():
    n = int(SR * 0.22)
    t = secs(n)
    x = np.sin(2 * np.pi * 1975 * t) * adsr(n, 0.004, 0.02, 0.8, 0.03, hold=0.18)
    return soft(x * 1.4, 1.5) * 0.35


def sfx_printer(dur=0.6, seed=18):
    n = int(SR * dur)
    t = secs(n)
    buzz = np.sign(np.sin(2 * np.pi * 95 * t)) * 0.3 + np.sign(np.sin(2 * np.pi * 190 * t + 0.5)) * 0.2
    clicks = np.zeros(n)
    for k in range(int(dur * 38)):
        i = int(k / 38 * SR)
        m = min(300, n - i)
        clicks[i:i + m] += hpf(noise(m, seed + k), 3000) * np.exp(-secs(m) / 0.002)
    env = adsr(n, 0.01, 0.05, 0.9, 0.06)
    return lpf(buzz, 1800) * env * 0.15 + clicks * 0.25


def sfx_thud(seed=19):
    n = int(SR * 0.4)
    t = secs(n)
    x = sine(48 + 70 * np.exp(-t / 0.03), n) * np.exp(-t / 0.12) + lpf(noise(n, seed), 600) * np.exp(-t / 0.03) * 0.5
    return soft(x, 1.4) * 0.7


def sfx_ruler(dur=0.45, seed=20):
    n = int(SR * dur)
    x = sweep_bpf(noise(n, seed), 600, 5000, q=3)
    env = np.sin(np.pi * np.clip(secs(n) / dur, 0, 1)) ** 0.8
    return x * env * 1.4


def sfx_riser(dur=1.5, seed=21):
    n = int(SR * dur)
    t = secs(n) / dur
    nz = sweep_bpf(noise(n, seed), 400, 9000, q=1.2) * t ** 2.2
    tone = saw(110 * 2 ** (t * 2), n) * 0.0
    sw = sine(220 * 2 ** (t * 1.5), n) * t ** 2 * 0.15
    return widen((nz * 1.6 + sw + tone) * 0.6, 9, 0.6)


def sfx_impact(seed=22):
    n = int(SR * 1.6)
    t = secs(n)
    sub = sine(62 * np.exp(-t / 0.5) + 26, n) * np.exp(-t / 0.45)
    nz = lpf(noise(n, seed), 2400) * np.exp(-t / 0.09)
    return soft(sub * 1.1 + nz * 0.7, 1.6) * 0.8


def sfx_thock():
    n = int(SR * 0.3)
    t = secs(n)
    return (sine(310 + 160 * np.exp(-t / 0.01), n) * np.exp(-t / 0.05) + sfx_tick(0.8)[: n].sum() * 0) * 0.7


def sfx_bell():
    return fm_bell(1318.5, 1.6, ratio=3.5, index=1.2, tau=0.6) * 0.3


def sfx_swing(seed=23):
    return sfx_whoosh(0.7, 180, 900, seed) * 0.5


def sfx_flip(seed=24):
    w = sfx_whoosh(0.25, 900, 4000, seed) * 0.6
    n = w.shape[1]
    snap = hpf(noise(n, seed + 1), 2500) * np.exp(-np.maximum(0, secs(n) - 0.12) / 0.006) * (secs(n) > 0.12) * 0.4
    return w + np.stack([snap, snap])


def sfx_swoosh(seed=25):
    return sfx_whoosh(0.32, 700, 3600, seed) * 0.55


def sfx_slam(pitch=1.0, seed=26):
    n = int(SR * 0.5)
    t = secs(n)
    body = sine(70 * pitch + 60 * np.exp(-t / 0.02), n) * np.exp(-t / 0.1)
    slap = bpf(noise(n, seed), 500, 4000) * np.exp(-t / 0.025)
    return soft(body * 0.9 + slap * 0.8, 1.5) * 0.75


def sfx_steps(dur=1.5, seed=27):
    n = int(SR * (dur + 0.2))
    out = np.zeros((2, n))
    k = 0
    t = 0.0
    while t < dur:
        m = int(SR * 0.09)
        st = lpf(noise(m, seed + k), 900) * np.exp(-secs(m) / 0.018) + sine(110, m) * np.exp(-secs(m) / 0.02) * 0.3
        place(out, pan(st, -0.25 if k % 2 else 0.25), t, 0.5)
        t += 0.26
        k += 1
    return out


def sfx_stamp(seed=28):
    return sfx_thud(seed) * 0.8 + np.pad(hpf(noise(int(SR * 0.05), seed), 4000) * 0.3, (0, int(SR * 0.4) - int(SR * 0.05)))


def sfx_register(seed=29):
    n = int(SR * 1.2)
    t = secs(n)
    mech = np.zeros(n)
    for k, d in enumerate([0.0, 0.05, 0.09]):
        i = int(d * SR)
        m = min(int(SR * 0.04), n - i)
        mech[i:i + m] += bpf(noise(m, seed + k), 1200, 6000) * np.exp(-secs(m) / 0.006)
    i = int(0.12 * SR)
    ding = np.zeros(n)
    b1 = fm_bell(2637, 1.0, ratio=2.0, index=0.9, tau=0.45)
    b2 = fm_bell(3136, 1.0, ratio=2.0, index=0.9, tau=0.45)
    ding[i:i + len(b1)] += (b1 + b2 * 0.7)[: n - i]
    return mech * 0.5 + ding * 0.3


def sfx_glass(pitch=1.0):
    n = int(SR * 0.8)
    t = secs(n)
    f0 = 3150 * pitch
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau) for r, a, tau in [(1, 1, 0.25), (1.58, 0.6, 0.18), (2.41, 0.4, 0.1), (3.9, 0.25, 0.06)])
    return x * 0.18 + sfx_tick(1.4)[:1].sum() * 0


def sfx_slide(dur=0.36, seed=30):
    n = int(SR * dur)
    x = bpf(noise(n, seed), 700, 3000)
    env = np.sin(np.pi * np.clip(secs(n) / dur, 0, 1)) ** 0.6
    return x * env * 0.25


def sfx_lightsoff(seed=31):
    n = int(SR * 0.9)
    t = secs(n)
    click = hpf(noise(n, seed), 2000) * np.exp(-t / 0.003) * 0.5
    down = sine(400 * np.exp(-t / 0.25) + 40, n) * np.exp(-t / 0.3) * 0.3
    return click + down


def sfx_morning():
    n = int(SR * 2.5)
    out = np.zeros(n)
    for k, m in enumerate([81, 84, 88, 93]):
        i = int(k * 0.12 * SR)
        b = fm_bell(mtof(m), 2.0, ratio=3.0, index=0.8, tau=0.9)
        out[i:i + len(b)] += b[: n - i] * 0.12
    return out


def sfx_buzz(dur=0.5):
    n = int(SR * dur)
    t = secs(n)
    gate = ((t % 0.25) < 0.17).astype(float)
    x = (np.sin(2 * np.pi * 150 * t) + 0.4 * np.sin(2 * np.pi * 300 * t)) * gate
    return lpf(x, 900) * 0.45


def sfx_notify():
    n = int(SR * 1.4)
    out = np.zeros(n)
    a = fm_bell(1318.5, 1.2, ratio=2.0, index=0.7, tau=0.35)
    b = fm_bell(1975.5, 1.2, ratio=2.0, index=0.7, tau=0.5)
    out[: len(a)] += a * 0.5
    i = int(0.13 * SR)
    out[i:i + len(b)] += b[: n - i] * 0.6
    return out * 0.6


def sfx_blink():
    return sfx_pop(1.8) * 0.4


def sfx_level(step=0):
    base = [72, 76, 79][step] if step < 3 else 79
    seq = [base, base + 4, base + 7, base + 12]
    n = int(SR * 0.9)
    out = np.zeros(n)
    for k, m in enumerate(seq):
        i = int(k * 0.055 * SR)
        m_n = int(SR * 0.3)
        tone = (tri(mtof(m), m_n) * 0.6 + np.sign(np.sin(2 * np.pi * mtof(m) * secs(m_n))) * 0.15) * np.exp(-secs(m_n) / 0.12)
        out[i:i + m_n] += lpf(tone, 6000)[: n - i] * 0.4
    return out


def sfx_unlock():
    n = int(SR * 2.4)
    out = np.zeros(n)
    for k, m in enumerate([65, 69, 72, 77, 81, 84]):
        i = int(k * 0.045 * SR)
        b = fm_bell(mtof(m), 2.0, ratio=2.0, index=1.0, tau=0.8)
        out[i:i + len(b)] += b[: n - i] * 0.13
    imp = sfx_impact(40)[:n] * 0.6
    out[: len(imp)] += imp
    return out


def sfx_sparkler(dur=3.0, seed=33):
    n = int(SR * dur)
    x = np.zeros(n)
    r = rng(seed)
    for _ in range(int(dur * 140)):
        i = int(r.random() * (n - 200))
        x[i:i + 200] += hpf(noise(200, int(r.integers(9999))), 3000) * np.exp(-secs(200) / 0.0009) * r.random()
    return x * 0.35


def sfx_knock(seed=34):
    n = int(SR * 0.5)
    t = secs(n)
    return soft(sine(140 + 120 * np.exp(-t / 0.015), n) * np.exp(-t / 0.06) + bpf(noise(n, seed), 1500, 6000) * np.exp(-t / 0.01) * 0.7, 1.5) * 0.7


def sfx_final():
    return sfx_impact(50) * 0.7


def sfx_loop(dur=3.6, seed=35):
    n = int(SR * dur)
    t = secs(n)
    x = sweep_bpf(noise(n, seed), 500, 900, q=2) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 1.8)) * 0.25
    p = np.sin(2 * np.pi * t / 1.8)
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)])


# Tonal effects carry more energy than clicks at the same peak: weight them down.
WEIGHT = {'register': 0.5, 'coin': 0.68, 'beep': 0.6, 'glass': 0.72, 'clink': 0.85, 'tink': 0.85, 'notify': 0.85,
          'bell': 0.8, 'level': 0.8, 'counter': 0.85, 'popcloud': 1.1, 'steps': 1.25, 'slide': 1.1, 'unlock': 0.9}


def render_cue(c):
    name = c['name']
    g = float(c.get('gain', 0.6))
    p = float(c.get('pitch', 1.0))
    d = float(c.get('dur', 0.5))
    if name == 'whoosh':
        x = sfx_whoosh(d, c.get('from', 300), c.get('to', 2400), seed=int(c['t'] * 100) % 997)
    elif name == 'clink':
        x = sfx_clink(p)
    elif name == 'tink':
        x = sfx_tink(p)
    elif name == 'coin':
        x = sfx_coin(p)
    elif name == 'rattle':
        x = sfx_rattle(d)
    elif name == 'tick':
        x = sfx_tick(p)
    elif name == 'pop':
        x = sfx_pop(p)
    elif name == 'popcloud':
        x = sfx_popcloud(d)
    elif name == 'counter':
        x = sfx_counter(d)
    elif name == 'stab':
        x = sfx_stab()
    elif name == 'beep':
        x = sfx_beep()
    elif name == 'printer':
        x = sfx_printer(d)
    elif name == 'thud':
        x = sfx_thud()
    elif name == 'ruler':
        x = sfx_ruler(d)
    elif name == 'riser':
        x = sfx_riser(d)
    elif name == 'impact':
        x = sfx_impact()
    elif name == 'thock':
        x = sfx_thock()
    elif name == 'bell':
        x = sfx_bell()
    elif name == 'swing':
        x = sfx_swing()
    elif name == 'flip':
        x = sfx_flip()
    elif name == 'swoosh':
        x = sfx_swoosh(seed=int(c['t'] * 10) % 97)
    elif name == 'slam':
        x = sfx_slam(p)
    elif name == 'steps':
        x = sfx_steps(d)
    elif name == 'stamp':
        x = sfx_stamp()
    elif name == 'register':
        x = sfx_register()
    elif name == 'glass':
        x = sfx_glass(p)
    elif name == 'slide':
        x = sfx_slide(d)
    elif name == 'lightsoff':
        x = sfx_lightsoff()
    elif name == 'morning':
        x = sfx_morning()
    elif name == 'buzz':
        x = sfx_buzz(d)
    elif name == 'notify':
        x = sfx_notify()
    elif name == 'blink':
        x = sfx_blink()
    elif name == 'level':
        x = sfx_level(int(c.get('step', 0)))
    elif name == 'unlock':
        x = sfx_unlock()
    elif name == 'sparkler':
        x = sfx_sparkler(d)
    elif name == 'knock':
        x = sfx_knock()
    elif name == 'final':
        x = sfx_final()
    elif name == 'loop':
        x = sfx_loop(d)
    else:
        print('unknown cue', name)
        return None
    return x * g


# ---------------------------------------------------------------- mix
def fx_board(x, board):
    y = board(x.astype(np.float32), SR)
    return y.astype(np.float64)


def tape_stop(x, a, b):
    """Slow the signal to a halt between a and b (seconds), silence after."""
    i0, i1 = int(a * SR), int(b * SR)
    n = i1 - i0
    rate = np.linspace(1, 0, n) ** 1.3
    pos = i0 + np.cumsum(rate)
    fade = np.linspace(1, 0.2, n)
    k = int(SR * 0.03)
    fade[-k:] *= np.linspace(1, 0, k)  # no click when the music stops
    for ch in range(x.shape[0]):
        seg = np.interp(pos, np.arange(x.shape[1]), x[ch])
        x[ch, i0:i1] = seg * fade
    return x


def power(x, windows):
    pw = []
    for a, b_ in windows:
        seg = x[..., int(a * SR): int(b_ * SR)]
        if seg.size:
            pw.append(np.mean(seg ** 2))
    return float(np.mean(pw)) if pw else 1e-12


def stage(x, target_db, windows):
    """Scale a track so its RMS over the given windows hits target_db (dBFS)."""
    cur = 10 * np.log10(power(x, windows) + 1e-15)
    return x * 10 ** ((target_db - cur) / 20)


def main():
    out_dir = os.path.join(ROOT, 'audio', 'out')
    os.makedirs(out_dir, exist_ok=True)
    print('drums...')
    dr, kicks = drums()
    sc = sidechain_env(kicks)
    print('bass...')
    bs = bassline() * sc
    print('chords...')
    chd = chord_stabs() * sc
    print('pad, arp, bells, lead...')
    pd = pads() * (0.5 + 0.5 * sc)
    ar = arps()
    bl = bells()
    ld = lead()
    fin = final_chord()

    DROP = [(46, 62), (76, 84)]
    print('effects + gain staging...')
    drums_b = stage(fx_board(dr, Pedalboard([HighpassFilter(34), Reverb(room_size=0.25, damping=0.7, wet_level=0.08, dry_level=1.0)])), -17.5, DROP)
    bass_b = stage(fx_board(pan(bs, 0), Pedalboard([HighpassFilter(36)])), -18.8, DROP)
    chords_b = stage(fx_board(widen(chd, 12, 0.55), Pedalboard([Chorus(rate_hz=0.6, depth=0.25, mix=0.3), Reverb(room_size=0.45, damping=0.6, wet_level=0.18, dry_level=0.9, width=1.0)])), -23.5, DROP)
    pad_b = stage(fx_board(widen(pd, 18, 0.7), Pedalboard([Chorus(rate_hz=0.3, depth=0.4, mix=0.5), Reverb(room_size=0.85, damping=0.5, wet_level=0.35, dry_level=0.75, width=1.0)])), -25.0, [(42, 46), (66, 70)])
    arp_b = stage(fx_board(pan(ar, -0.25), Pedalboard([Delay(delay_seconds=0.375, feedback=0.28, mix=0.22), Reverb(room_size=0.6, wet_level=0.22, dry_level=0.85)])), -30.0, [(16, 26), (46, 62)])
    bell_b = stage(fx_board(pan(bl, 0.3), Pedalboard([Reverb(room_size=0.8, wet_level=0.35, dry_level=0.8)])), -29.0, [(26, 34), (66, 70)])
    lead_b = stage(fx_board(pan(ld, 0.05), Pedalboard([Delay(delay_seconds=0.375, feedback=0.3, mix=0.2), Reverb(room_size=0.55, wet_level=0.2, dry_level=0.9)])), -24.0, DROP)
    fin_b = stage(fx_board(widen(fin, 15, 0.7), Pedalboard([Reverb(room_size=0.9, damping=0.4, wet_level=0.45, dry_level=0.8, width=1.0)])), -19.0, [(88, 89.5)])
    music = drums_b + bass_b + chords_b + pad_b + arp_b + bell_b + lead_b + fin_b
    for name, x in [('drums', drums_b), ('bass', bass_b), ('chords', chords_b), ('lead', lead_b)]:
        print(f'  {name:7s} drop rms {10*np.log10(power(x, DROP)):.1f} dB')
    # crashes and reverse swells at the big moments
    CR = crash(5)
    for t in [4.0, 26.0, 46.0, 76.0, 88.0]:
        place(music, widen(CR, 9, 0.6), t, 0.05)
    for t in [46.0, 76.0]:
        rc = crash(8, 1.2)[::-1]
        place(music, widen(rc, 9, 0.6), t - len(rc) / SR, 0.035)
    rz = sfx_riser(2.0)
    place(music, rz / np.max(np.abs(rz)), 74.0, 0.12)
    # tonal balance: warmer lows, less 2-3 kHz bite
    music = fx_board(music, Pedalboard([LowShelfFilter(cutoff_frequency_hz=140, gain_db=4.5, q=0.7), PeakFilter(cutoff_frequency_hz=320, gain_db=2.0, q=0.8),
                                        PeakFilter(cutoff_frequency_hz=2400, gain_db=-4.5, q=0.8), HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.0, q=0.7)]))
    music = tape_stop(music, *STOP)
    music[:, int(STOP[1] * SR): int(66.02 * SR)] = 0
    # section dynamics: the breakdown sits lower so the drop lands
    tt = secs(N)
    sec_db = np.interp(tt, [0, 42.0, 42.3, 44.0, 45.9, 46.0, 91], [0, 0, -6, -5, -1.5, 0, 0])
    music *= 10 ** (sec_db / 20)
    print(f'  music bus rms (drop) {10*np.log10(power(music, DROP)):.1f} dB')

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
            x = x / pk * float(c.get('gain', 0.6)) * 0.62 * WEIGHT.get(c['name'], 1.0)
        place(sfx, x, c['t'], 1.0)
    sfx = fx_board(sfx, Pedalboard([PeakFilter(cutoff_frequency_hz=2050, gain_db=-3.0, q=1.2), PeakFilter(cutoff_frequency_hz=2650, gain_db=-4.5, q=1.2), Reverb(room_size=0.3, damping=0.6, wet_level=0.12, dry_level=1.0, width=0.8)]))

    # duck the music a little under every sound effect so the effects read clearly
    a = np.abs(sfx).max(0)
    env = np.zeros(N)
    att, rel = np.exp(-1 / (SR * 0.01)), np.exp(-1 / (SR * 0.22))
    lvl = 0.0
    # vectorised one-pole follower on a decimated signal, then upsampled
    dec = 48
    ad = a[: N // dec * dec].reshape(-1, dec).max(1)
    ed = np.zeros_like(ad)
    att_d, rel_d = np.exp(-dec / (SR * 0.01)), np.exp(-dec / (SR * 0.22))
    for i, v in enumerate(ad):
        lvl = att_d * lvl + (1 - att_d) * v if v > lvl else rel_d * lvl + (1 - rel_d) * v
        ed[i] = lvl
    env[: len(ed) * dec] = np.repeat(ed, dec)
    duck = 1 - 0.28 * np.clip(env / 0.25, 0, 1)
    music *= duck * 0.8

    mix = (music + sfx) * 0.6
    mix = fx_board(mix, Pedalboard([HighpassFilter(24), Compressor(threshold_db=-20, ratio=2.0, attack_ms=15, release_ms=180)]))
    mix *= 10 ** (5.8 / 20)  # drive into the limiter: ~-14 LUFS with peaks held at the ceiling
    pre_pk, pre_rms = np.max(np.abs(mix)), np.sqrt(np.mean(mix ** 2))
    over = np.mean(np.max(np.abs(mix), axis=0) > 10 ** (-1.6 / 20))
    print(f'pre-limiter peak {20*np.log10(pre_pk):.1f} dBFS, rms {20*np.log10(pre_rms):.1f} dBFS, samples over ceiling {over*100:.3f}%')
    mix = brickwall(mix, ceiling_db=-1.6)
    f = int(0.4 * SR)
    mix[:, -f:] *= np.linspace(1, 0, f)
    peak = np.max(np.abs(mix))
    rms = np.sqrt(np.mean(mix ** 2))
    print(f'mix peak {20*np.log10(peak+1e-9):.1f} dBFS, rms {20*np.log10(rms+1e-9):.1f} dBFS')
    wavfile.write(os.path.join(out_dir, 'mix.wav'), SR, (mix.T * 32767).astype(np.int16))
    wavfile.write(os.path.join(out_dir, 'music.wav'), SR, (np.clip(music.T, -1, 1) * 32767).astype(np.int16))
    wavfile.write(os.path.join(out_dir, 'sfx.wav'), SR, (np.clip(sfx.T, -1, 1) * 32767).astype(np.int16))
    print('wrote', out_dir)


if __name__ == '__main__':
    main()
