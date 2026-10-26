#!/usr/bin/env python3
"""
Original 120 BPM score + sound effects for the SVIF fyrirtæki film.
Reads audio/events.json (timeline and cues exported from the page with `node capture.mjs events:audio/events.json`)
and writes audio/out/mix.wav. Every sound is synthesised here (dsp.py); no samples, and no noise whooshes:
transitions are tonal, so nothing sounds like sandpaper.
"""
import json
import os
import sys

import numpy as np
from scipy.io import wavfile
from pedalboard import Pedalboard, Reverb, Compressor, Delay, Chorus, HighpassFilter, PeakFilter, LowShelfFilter, HighShelfFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import *  # noqa: E402,F401,F403

EV = json.load(open(os.path.join(HERE, 'events.json')))
DUR = float(EV['dur'])
TL = EV['tl']
N = int(round(DUR * SR))
BPM = float(EV['bpm'])
BEAT = 60 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4
NBARS = int(np.ceil(DUR / BAR))


def bt(n):
    return n * BEAT


def bus():
    return np.zeros((2, N))


def put(buf, x, t, gain=1.0):
    """Mono clip into a mono buffer."""
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    if i < 0:
        x = x[-i:]
        i = 0
    n = min(len(x), len(buf) - i)
    buf[i:i + n] += x[:n] * gain


# ---------------------------------------------------------------- harmony: D major, bright and confident
CH = {
    'D': dict(root=38, notes=[62, 66, 69, 73]),     # Dmaj7
    'Bm': dict(root=35, notes=[62, 66, 69, 71]),    # Bm7
    'G': dict(root=31, notes=[62, 66, 67, 71]),     # Gmaj7
    'A': dict(root=33, notes=[61, 64, 69, 71]),     # A6/9-ish
    'Asus': dict(root=33, notes=[62, 64, 69, 71]),  # Asus4 add9: the question before the drop
    'D9': dict(root=26, notes=[62, 64, 66, 69, 73]),
}
LOOP = ['D', 'Bm', 'G', 'A']
STOP = (TL['stop'], TL['bookIn'])        # the music halts under "byrja?" and the brochure lands on silence + boom
DROP = TL['bookIn']
FINAL = TL['end']


def chord(bar):
    t = bar * BAR
    if t >= FINAL - 0.01:
        return 'D9'
    if abs(t - TL['slamA']) < 0.01:
        return 'Asus'
    return LOOP[bar % 4]


def section(bar):
    t = bar * BAR
    s = dict(kick=0, clap=0, hats=0, open=0, bass=None, chords=0, cut=2200, pad=0, arp=0, lead=0, half=0)
    if t < 2:                         # the city rises: pad and a filtered arp
        s.update(pad=0.7, arp=0.5, cut=1200)
    elif t < 4:
        s.update(kick=1, half=1, hats=1, pad=0.6, arp=0.7, chords=0.5, cut=1500)
    elif t < 8:                       # the new company: the groove arrives
        s.update(kick=1, clap=1, hats=1, bass='off', chords=1, cut=2100, pad=0.25)
    elif t < 14:                      # the pile grows: busier hats, the arp counts the blocks
        s.update(kick=1, clap=1, hats=2, bass='off', chords=1, cut=2300 + (t - 8) * 60, arp=0.6)
    elif t < 16:                      # "Hvar á að byrja?": only the hits (cues), a held chord underneath
        s.update(pad=0.9, cut=1400)
    elif t < 24:                      # DROP: SVIF
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2800, arp=0.7, lead=1)
    elif t < 30:                      # the system: half-time, room to read
        s.update(kick=1, half=1, clap=0.8, hats=1, bass='long', chords=0.8, cut=1800, pad=0.6, arp=0.5)
    elif t < 38:                      # delivery: rolling bass, full groove
        s.update(kick=1, clap=1, hats=2, open=1, bass='roll', chords=1, cut=2600, arp=0.6)
    elif t < FINAL - 0.01:            # categories
        s.update(kick=1, clap=1, hats=2, open=1, bass='off', chords=1, cut=2800, arp=0.6, lead=0.8)
    else:                             # end card: one chord, bells
        s.update(pad=0.8, cut=1600)
    return s


SEC = [section(b) for b in range(NBARS)]


def in_stop(t):
    return STOP[0] - 0.001 <= t < STOP[1]


# ---------------------------------------------------------------- drums
def drums():
    d = bus()
    K, CL, HC, HO, HC2 = kick(), clap(), hat(False, 4), hat(True, 6), hat(False, 9)
    kicks = []
    for bar in range(NBARS):
        s = SEC[bar]
        for step in range(16):
            t = bar * BAR + step * STEP
            if t >= DUR - 0.01 or in_stop(t):
                continue
            if s['kick'] and step % (8 if s['half'] else 4) == 0:
                place(d, K, t, 0.9)
                kicks.append(t)
            if s['clap'] and step in ((8,) if s['half'] else (4, 12)):
                place(d, pan(CL, 0.0), t, 0.42 * s['clap'])
            if s['hats']:
                if step % 4 == 2:
                    place(d, pan(HC, 0.22), t, 0.26)
                elif s['hats'] >= 2 and step % 2 == 1:
                    place(d, pan(HC2, -0.18), t, 0.085)
            if s['open'] and step == 14 and bar % 2 == 1:
                place(d, pan(HO, 0.3), t, 0.12)
    # snare roll into the drop, under the last two words
    SN = snare(7)
    a = TL['slamA'] + bt(2)
    n = int(round((STOP[0] - a) / STEP))
    for i in range(n):
        for k in range(2 if i > n * 0.5 else 1):
            place(d, pan(SN, 0.15 if i % 2 else -0.15), a + i * STEP + k * STEP / 2, 0.05 + 0.35 * i / n)
    place(d, K, DROP, 1.0); kicks.append(DROP)
    place(d, K, FINAL, 1.0); kicks.append(FINAL)
    return d, sorted(set(kicks))


def sidechain_env(kicks, depth=0.55, tau=0.13):
    e = np.zeros(N)
    L = int(SR * 0.5)
    shape = np.exp(-secs(L) / tau)
    for t in kicks:
        i = int(round(t * SR))
        n = min(L, N - i)
        if n > 0:
            e[i:i + n] = np.maximum(e[i:i + n], shape[:n])
    return 1 - depth * e


# ---------------------------------------------------------------- tonal parts
def bassline():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['bass']:
            continue
        root = CH[chord(bar)]['root']
        t0 = bar * BAR
        if s['bass'] == 'long':
            n = int(SR * BAR)
            f = mtof(root)
            x = (0.7 * sine(f, n) + 0.35 * lpf(saw(f, n), 380)) * adsr(n, a=0.02, d=0.3, s=0.75, r=0.15)
            put(out, x * 0.55, t0)
            continue
        steps = {'off': [2, 6, 10, 14], 'roll': list(range(16))}[s['bass']]
        for st in steps:
            t = t0 + st * STEP
            if t >= DUR or in_stop(t):
                continue
            m = root + (12 if s['bass'] == 'roll' and st % 2 == 1 else 0)
            ff = mtof(m)
            n = int(SR * 0.17)
            x = (0.75 * sine(ff, n) + 0.55 * lpf(saw(ff, n), 650)) * adsr(n, a=0.004, d=0.06, s=0.55, r=0.04, hold=0.12)
            put(out, soft(x, 1.3) * (0.5 if s['bass'] != 'roll' else (0.42 if st % 2 == 0 else 0.3)), t)
    return out


def chord_stabs():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['chords']:
            continue
        notes = CH[chord(bar)]['notes']
        for st in [0, 3, 6, 10, 12]:
            t = bar * BAR + st * STEP
            if t >= DUR or in_stop(t):
                continue
            x = sum(pluck(mtof(m), 0.42, cutoff=s['cut'], tau=0.12, seed=m) for m in notes) / len(notes)
            put(out, x * 0.55 * s['chords'], t)
    return out


def pads():
    out = np.zeros(N)
    for bar in range(NBARS):
        s = SEC[bar]
        if not s['pad']:
            continue
        notes = CH[chord(bar)]['notes']
        hold = BAR if bar * BAR < FINAL - 0.01 else DUR - bar * BAR
        if abs(bar * BAR - TL['slamA']) < 0.01:
            hold = STOP[0] - bar * BAR     # the held chord under the question stops with the music
        n = int(SR * (hold + 1.2))
        x = sum(pad_voice(mtof(m), n, cutoff=1500, seed=m) for m in notes) / len(notes)
        put(out, x * adsr(n, a=0.3, d=0.4, s=0.85, r=0.9 if hold < BAR + .1 else 2.0, hold=hold) * 0.5 * s['pad'], bar * BAR)
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
            if t >= DUR or in_stop(t):
                continue
            m = notes[seq[st % 8] % len(notes)] + (12 if st >= 8 and bar % 2 else 0)
            x = fm_bell(mtof(m), dur=0.4, ratio=2.0, index=1.3, tau=0.16, itau=0.06)
            put(out, x * 0.13 * s['arp'] * (1.0 if st % 4 == 0 else 0.7), t)
    return out


# hook, one bar per chord: (16th step, midi note, length in 16ths)
MEL = {
    'D': [(0, 74, 2), (2, 78, 2), (4, 81, 2), (6, 78, 1), (7, 76, 1), (10, 74, 2), (12, 76, 3)],
    'Bm': [(0, 74, 2), (2, 78, 2), (4, 83, 2), (6, 81, 1), (7, 78, 1), (10, 74, 2), (12, 78, 3)],
    'G': [(0, 71, 2), (2, 74, 2), (4, 79, 2), (6, 78, 1), (7, 74, 1), (10, 71, 2), (12, 74, 3)],
    'A': [(0, 73, 2), (2, 76, 2), (4, 81, 2), (6, 80, 1), (7, 76, 1), (10, 73, 2), (12, 76, 3)],
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
            put(out, (body + sine(mtof(m) * 2, n) * expdec(n, 0.12) * 0.18) * 0.3 * s['lead'], t)
    return out


def final_chord():
    out = np.zeros(N)
    notes = CH['D9']['notes'] + [50, 38]
    n = int(SR * (DUR - FINAL + 0.5))
    x = sum(pad_voice(mtof(m), n, cutoff=3200, voices=5, seed=m) for m in notes) / len(notes)
    put(out, x * expdec(n, 2.4, 0.004) * 0.7, FINAL)
    for k, m in enumerate([81, 78, 76, 74, 69]):
        put(out, fm_bell(mtof(m), 3.0, ratio=3.5, index=1.4, tau=1.1) * 0.12, FINAL + k * BEAT)
    return out


# ---------------------------------------------------------------- sound effects
SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88]


def sfx_impact(seed=22):
    n = int(SR * 1.6)
    t = secs(n)
    sub = sine(62 * np.exp(-t / 0.5) + 26, n) * np.exp(-t / 0.45)
    nz = lpf(noise(n, seed), 1800) * np.exp(-t / 0.05)
    return soft(sub * 1.1 + nz * 0.5, 1.6) * 0.8


def sfx_thock(f=310.0):
    """A clay block landing: short wooden knock with a low thud under it."""
    n = int(SR * 0.45)
    t = secs(n)
    body = sine(f + f * 0.6 * np.exp(-t / 0.01), n) * np.exp(-t / 0.06)
    thud = sine(70 + 60 * np.exp(-t / 0.03), n) * np.exp(-t / 0.1)
    return soft(body * 0.8 + thud * 0.9, 1.4)


def sfx_pop(f=600.0):
    n = int(SR * 0.16)
    t = secs(n)
    fr = f * (0.6 + 0.4 * (1 - np.exp(-t / 0.02)))
    return sine(fr, n) * np.exp(-t / 0.04) * (1 - np.exp(-t / 0.002))


def sfx_stab(notes, dur=1.2, cutoff=4200):
    return sum(pluck(mtof(m), dur, cutoff=cutoff, tau=0.28, seed=m, bright=1.6) for m in notes) / len(notes)


def sfx_bell(m, dur=1.6, gain=1.0):
    return fm_bell(mtof(m), dur, ratio=3.5, index=1.4, tau=0.55) * gain


def sfx_tonal_riser(dur, m0=50, m1=74):
    """A rising chord glide (no noise)."""
    n = int(SR * dur)
    t = secs(n) / dur
    x = np.zeros(n)
    for iv in (0, 7, 12):
        f = mtof(m0 + iv + (m1 - m0) * t ** 1.6)
        x += saw(f, n) / 3
    return lpf(x, 2400) * t ** 2


def sfx_knock(f=180.0):
    n = int(SR * 0.4)
    t = secs(n)
    return (sine(f, n) + 0.4 * sine(f * 3.9, n) * np.exp(-t / 0.03)) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.002))


def sfx_counter(dur):
    n = int(SR * (dur + 0.1))
    out = np.zeros(n)
    t = 0.0
    while t < dur:
        p = t / dur
        m = int(SR * 0.04)
        tt = secs(m)
        tk = np.sin(2 * np.pi * (1500 + 900 * p) * tt) * np.exp(-tt / 0.008)
        i = int(t * SR)
        out[i:i + m] += tk[: n - i] * 0.5
        t += 0.03 + 0.09 * p ** 3
    return out


def cues():
    out = bus()
    for e in EV['events']:
        k, t, i = e['k'], e['t'], e.get('i', 0)
        if k == 'sign':
            place(out, pan(sfx_stab([74, 78, 81, 86], 1.4), 0.1), t, 0.5)
            place(out, pan(sfx_bell(93), 0.2), t, 0.18)
        elif k == 'slab':                   # each block lands on the beat, a step higher each time
            place(out, pan(sfx_thock(mtof(SCALE[i % 12] - 12)), -0.2 + 0.04 * i), t, 0.75)
        elif k == 'slam':                   # Hvar / á / að / byrja?
            place(out, pan(sfx_impact(22 + i), 0), t, 0.65 + 0.1 * i)
            place(out, pan(sfx_stab([n + 12 * (i == 3) for n in [57, 62, 64, 69]], 0.9, 3000), 0), t, 0.55)
        elif k == 'drop':                   # the brochure lands: boom, crash, a bright chord
            place(out, pan(sfx_impact(40), 0), t, 1.0)
            place(out, widen(crash(5, 2.4), 9, 0.6), t, 0.32)
            place(out, pan(sfx_stab([62, 66, 69, 74, 78], 1.6), 0), t, 0.55)
        elif k == 'absorb':                 # blocks flying into the brochure: rising pops on the eighths
            place(out, pan(sfx_pop(mtof(SCALE[min(i, 11)] + 12)), 0.25 - 0.05 * i), t, 0.45)
        elif k == 'open':
            place(out, pan(sfx_stab([66, 69, 74, 78], 1.4, 3600), 0), t, 0.32)
        elif k == 'offer':
            place(out, pan(sfx_bell(86, 1.8), -0.2), t, 0.35)
            place(out, pan(sfx_bell(90, 1.8), 0.2), t + BEAT / 4, 0.25)
        elif k == 'close':
            place(out, pan(sfx_thock(260), 0), t, 0.35)
        elif k == 'rise':
            r = sfx_tonal_riser(TL['nodeIn'] - t)
            place(out, widen(r / np.max(np.abs(r)), 12, 0.6), t, 0.12)
        elif k == 'node':
            place(out, pan(sfx_impact(41), 0), t, 0.7)
            place(out, pan(sfx_bell(74, 2.8), 0), t, 0.4)
        elif k == 'found':                  # companies found on the sixteenths
            place(out, pan(sfx_bell(SCALE[3 + i % 9] + 12, 0.9), -0.6 + 0.07 * (i % 18)), t, 0.16)
        elif k == 'deliver':                # a brochure lands at an address on every beat
            place(out, pan(sfx_knock(mtof(SCALE[i % 6] - 12)), -0.3 + 0.07 * i), t, 0.6)
            place(out, pan(sfx_bell(SCALE[3 + i % 6] + 12, 1.0), 0.2), t, 0.12)
        elif k == 'counter':
            place(out, pan(sfx_counter(e['d']), 0.3), t, 0.22)
        elif k == 'count':
            place(out, pan(sfx_stab([74, 78, 81, 86], 1.2), 0.2), t, 0.4)
        elif k == 'bookUp':
            place(out, pan(sfx_pop(500), 0), t, 0.3)
        elif k == 'tile':                   # categories light up on every beat
            place(out, pan(sfx_bell(SCALE[2 + i] + 12, 1.4), -0.35 + 0.1 * i), t, 0.3)
        elif k == 'home':
            place(out, pan(sfx_knock(147), 0), t, 0.5)
        elif k == 'end':
            place(out, pan(sfx_impact(43), 0), t, 0.7)
            place(out, widen(crash(5, 2.6), 9, 0.6), t, 0.28)
        elif k == 'fin':
            if i % 2 == 0:
                place(out, pan(sfx_bell(SCALE[4 + (i // 2) % 7] + 12, 1.2), -0.7 + 0.09 * (i % 16)), t, 0.06)
    return out


# ---------------------------------------------------------------- mix
def fx(x, board):
    return board(x.astype(np.float32), SR).astype(np.float64)


def tape_stop(x, a, b_):
    i0, i1 = int(a * SR), int(b_ * SR)
    n = i1 - i0
    pos = i0 + np.cumsum(np.linspace(1, 0, n) ** 1.3)
    fade = np.linspace(1, 0.2, n)
    fade[-int(SR * 0.02):] *= np.linspace(1, 0, int(SR * 0.02))
    for ch in range(x.shape[0]):
        x[ch, i0:i1] = np.interp(pos, np.arange(x.shape[1]), x[ch]) * fade
    return x


def main():
    out_dir = os.path.join(HERE, 'out')
    os.makedirs(out_dir, exist_ok=True)
    dr, kicks = drums()
    sc = sidechain_env(kicks)
    bass = pan(bassline() * sc, 0)
    chd = widen(chord_stabs() * sc, 12, 0.55)
    pd = widen(pads() * (0.5 + 0.5 * sc), 18, 0.7)
    ar = pan(arps(), -0.25)
    ld = pan(lead(), 0.05)
    fin = widen(final_chord(), 15, 0.7)
    DOT8 = BEAT * 0.75
    drums_b = fx(dr, Pedalboard([HighpassFilter(34), Reverb(room_size=0.25, damping=0.7, wet_level=0.07, dry_level=1.0)]))
    chd = fx(chd, Pedalboard([Chorus(rate_hz=0.6, depth=0.25, mix=0.3), Reverb(room_size=0.45, damping=0.6, wet_level=0.18, dry_level=0.9)]))
    pd = fx(pd, Pedalboard([Chorus(rate_hz=0.3, depth=0.4, mix=0.5), Reverb(room_size=0.85, damping=0.5, wet_level=0.35, dry_level=0.75)]))
    ar = fx(ar, Pedalboard([Delay(delay_seconds=DOT8, feedback=0.28, mix=0.22), Reverb(room_size=0.6, wet_level=0.22, dry_level=0.85)]))
    ld = fx(ld, Pedalboard([Delay(delay_seconds=DOT8, feedback=0.3, mix=0.2), Reverb(room_size=0.55, wet_level=0.2, dry_level=0.9)]))
    fin = fx(fin, Pedalboard([Reverb(room_size=0.9, damping=0.4, wet_level=0.45, dry_level=0.8)]))
    music = drums_b * 1.0 + bass * 0.9 + chd * 0.55 + pd * 0.4 + ar * 0.55 + ld * 0.6 + fin * 0.9
    music = fx(music, Pedalboard([LowShelfFilter(cutoff_frequency_hz=140, gain_db=3.5, q=0.7), PeakFilter(cutoff_frequency_hz=2400, gain_db=-3.5, q=0.8), HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.0, q=0.7)]))
    music = tape_stop(music, *STOP)
    music[:, int(STOP[1] * SR) - int(0.01 * SR): int(STOP[1] * SR)] = 0
    sfx = cues()
    sfx = fx(sfx, Pedalboard([PeakFilter(cutoff_frequency_hz=2500, gain_db=-3.5, q=1.2), Reverb(room_size=0.3, damping=0.6, wet_level=0.12, dry_level=1.0, width=0.8)]))
    # duck the music a little under the effects so the hits read
    a = np.abs(sfx).max(0)
    dec = 48
    ad = a[: N // dec * dec].reshape(-1, dec).max(1)
    ed = np.zeros_like(ad)
    att, rel = np.exp(-dec / (SR * 0.01)), np.exp(-dec / (SR * 0.2))
    lvl = 0.0
    for i, v in enumerate(ad):
        lvl = att * lvl + (1 - att) * v if v > lvl else rel * lvl + (1 - rel) * v
        ed[i] = lvl
    envl = np.zeros(N)
    envl[: len(ed) * dec] = np.repeat(ed, dec)
    music *= 1 - 0.3 * np.clip(envl / 0.3, 0, 1)
    mix = music * 0.75 + sfx * 0.85
    mix = fx(mix, Pedalboard([HighpassFilter(24), Compressor(threshold_db=-18, ratio=2.0, attack_ms=15, release_ms=180)]))
    mix *= 0.5 / np.sqrt(np.mean(mix ** 2)) * 0.25     # rough level; finalize sets -14 LUFS
    mix = brickwall(mix, ceiling_db=-1.5)
    fi, fo = int(0.05 * SR), int(1.2 * SR)
    mix[:, :fi] *= np.linspace(0, 1, fi)
    mix[:, -fo:] *= np.linspace(1, 0, fo)
    print(f'peak {20*np.log10(np.max(np.abs(mix))):.1f} dBFS, rms {20*np.log10(np.sqrt(np.mean(mix**2))):.1f} dBFS')
    wavfile.write(os.path.join(out_dir, 'mix.wav'), SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))


if __name__ == '__main__':
    main()
