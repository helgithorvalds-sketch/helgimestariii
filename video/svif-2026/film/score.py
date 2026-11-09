#!/usr/bin/env python3
"""
SVIF film scorer: a warm, intimate, premium underscore plus quiet, tasteful sound design, all synthesised here
(no samples). Deterministic for a given --seed.

  python3 score.py --events events.json --duration 50.4 --out score.wav [--seed 7] [--mood home|biz] [--png a.png]

events.json is a list of {"t": seconds, "kind": str} (an object {"events": [...]} works too). Kinds:
  open, land, gather, book-land, page, card, rise, found, stack, send, slot, end, office, tile.

The musical form is derived from the events, so a re-cut film re-scores itself:
  0 .. W     dark title card: soft room tone, a dark pad blooms on the 'open', three high felt-piano notes
  W          the world begins (default 6.0 s): the beat grid starts (~79 BPM home, ~83 biz), the motif enters
  W .. L     gentle build  I - IV(lydian) - vi - V - I6 - IV - vi ... ; a very soft low pulse from the first
             'book-land' / 'gather' / 'office'; string-like swells fade in a third of the way to the lift
  L          lift at the first 'found' (else the first 'send'): IV lydian voiced high, flowing piano, strings rise
  L .. R     ii - V; the pulse drops out on the V so the music breathes in
  R          resolves to I exactly on the 'slot' (the beat length is fitted so the slot falls on a beat)
  R .. E     settle, a plagal IV/I sigh
  E .. end   final I 6/9 under the logo ('end') and its natural tail; fade over the last 1.2 s

Instruments: felt piano (additive, inharmonic partials, two-stage decay, unison-string beating, felt hammer),
warm analogue pad (drifting detuned PolyBLEP saws through a slowly opening low-pass), string-like ensemble
(detuned saws with delayed vibrato, bowed-swell envelopes), soft felt low pulse, sine sub, muted celesta.
Rooms are convolution reverbs with synthetic frequency-dependent decay. Sound design: felt/paper taps,
paper slides, card flicks, airy tonal rises (no whooshes, no risers), a warm thump + chime on the slot.
Each sound effect is levelled against the music around it (default -10 to -14 dB under it).
Master: gentle EQ, slow bus compression, look-ahead true-peak limiter, integrated loudness -14 LUFS
(BS.1770-4, measured here and cross-checked with ffmpeg ebur128), true peak <= -1.5 dBTP, 48 kHz stereo 24-bit.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import zlib

import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d
from pedalboard import Pedalboard, Chorus, Compressor, HighpassFilter, HighShelfFilter, LowShelfFilter, PeakFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from svif_dsp import SR, mtof, saw, lpf, hpf, bpf, sweep_bpf, pan  # noqa: E402  (copy of the old film's dsp.py)


# =============================================================================================== utilities
def rng_for(seed, *keys):
    return np.random.default_rng([int(seed) & 0xFFFFFFFF] + [zlib.crc32(repr(k).encode()) for k in keys])


def ramp(n):
    """Raised-cosine 0 -> 1 over n samples."""
    n = max(int(n), 1)
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def env_ar(n, att, rel_start, rel):
    """Raised-cosine attack (s), hold, raised-cosine release starting at rel_start (s); zero afterwards."""
    e = np.ones(n)
    a = min(n, int(att * SR))
    if a > 0:
        e[:a] = ramp(a)
    rs = int(rel_start * SR)
    if rs < n:
        r = max(1, int(rel * SR))
        m = min(n - rs, r)
        e[rs:rs + m] *= 1 - ramp(r)[:m]
        e[rs + m:] = 0
    return e


def add(buf, x, t, gain=1.0, p=0.0):
    """Mix x (mono or (2, n)) into the stereo buffer at time t; mono is equal-power panned to p."""
    if x.ndim == 1:
        x = pan(x, p)
    i = int(round(t * SR))
    if i < 0:
        x = x[:, -i:]
        i = 0
    if i >= buf.shape[1] or x.shape[1] == 0:
        return
    m = min(x.shape[1], buf.shape[1] - i)
    buf[:, i:i + m] += x[:, :m] * gain


def mixm(*xs):
    """Sum 1-D signals of different lengths (zero-padded)."""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[:len(x)] += x
    return out


def autopan(x, p0, p1):
    n = len(x)
    p = np.linspace(p0, p1, n)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def smoothstep(u):
    u = np.clip(u, 0, 1)
    return u * u * (3 - 2 * u)


def curve(nodes, n, smooth=0.0):
    """Piecewise-linear automation through (t, value) nodes, sampled per sample; optional moving-average smoothing."""
    nodes = sorted(nodes)
    ts = np.array([a for a, _ in nodes], dtype=float)
    vs = np.array([b for _, b in nodes], dtype=float)
    y = np.interp(np.arange(n) / SR, ts, vs)
    if smooth > 0:
        y = uniform_filter1d(y, size=max(1, int(smooth * SR)), mode='nearest')
    return y


def tv_lpf(x, fc, block=256, order=2):
    """Low-pass a (2, n) signal whose cutoff follows the per-sample curve fc; state is carried between blocks."""
    n = x.shape[1]
    y = np.zeros_like(x)
    zi = None
    last = None
    sos = None
    for s in range(0, n, block):
        e = min(n, s + block)
        f = float(np.clip(fc[s], 30, SR * 0.45))
        if last is None or abs(f - last) > last * 0.004:
            sos = signal.butter(order, f, 'low', fs=SR, output='sos')
            last = f
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, 2))
        y[:, s:e], zi = signal.sosfilt(sos, x[:, s:e], axis=-1, zi=zi)
    return y


def limiter(x, ceiling_db=-1.9, look_ms=5.0, release_ms=140.0):
    """Look-ahead true-peak limiter (the old film's brickwall, copied) that also returns its gain curve."""
    from scipy.ndimage import minimum_filter1d
    c = 10 ** (ceiling_db / 20)
    n = x.shape[1]
    a = np.zeros(n)
    for ch in x:
        up = signal.resample_poly(ch, 4, 1)[: n * 4]
        a = np.maximum(a, np.abs(np.concatenate([up, np.zeros(n * 4 - len(up))])).reshape(-1, 4).max(1))
    g = np.minimum(1.0, c / np.maximum(a, 1e-12))
    L = max(1, int(SR * look_ms / 1000))
    gmin = minimum_filter1d(g, size=2 * L + 1, mode='nearest')
    gp = np.concatenate([np.full(L, gmin[0]), gmin, np.full(L, gmin[-1])])
    gs = np.minimum(np.convolve(gp, np.ones(L) / L, mode='same')[L:L + n], gmin)
    r = 1.0 - gs
    dec = 16
    rd = r[: len(r) // dec * dec].reshape(-1, dec).max(1)
    k = np.exp(-dec / (SR * release_ms / 1000))
    out = np.empty_like(rd)
    prev = 0.0
    for i, v in enumerate(rd):
        prev = v if v > prev else prev * k
        out[i] = prev
    rr = np.repeat(out, dec)
    gain = 1.0 - np.maximum(r, np.concatenate([rr, np.zeros(len(r) - len(rr))]))
    return x * gain, gain


def fx(x, board):
    return board(x.astype(np.float32), SR).astype(np.float64)


def pink(n, r):
    spec = np.fft.rfft(r.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[1:] /= np.sqrt(f[1:])
    spec[0] = 0
    y = np.fft.irfft(spec, n)
    return y / (np.std(y) + 1e-12)


# =============================================================================================== rooms
def make_ir(seed, rt60, length, predelay=0.02, bright=7000.0, er=10):
    """Synthetic stereo room: decorrelated noise with frequency-dependent decay (highs die first),
    a soft diffuse build-up, pre-delay and a few early reflections. Unit energy per channel."""
    n = int(length * SR)
    t = np.arange(n) / SR
    r = rng_for(seed, 'ir', rt60, length)
    bands = [(None, 350, 1.15), (350, 1500, 1.0), (1500, 4500, 0.7), (4500, None, 0.4)]
    ir = np.zeros((2, n))
    for ch in range(2):
        nz = r.standard_normal(n)
        for lo, hi, k in bands:
            if lo is None:
                b = lpf(nz, hi, 4)
            elif hi is None:
                b = hpf(nz, lo, 4)
            else:
                b = bpf(nz, lo, hi, 2)
            ir[ch] += b * np.exp(-6.91 * t / (rt60 * k))
    ir *= 1 - np.exp(-t / 0.022)
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, pd)), ir[:, :n - pd]], axis=1)
    for ch in range(2):
        for j in range(er):
            d = r.uniform(0.003, 0.06)
            i = int(pd * 0.5 + d * SR)
            if i < n:
                ir[ch, i] += r.uniform(0.6, 1.2) * (1 if j % 2 else -1) * np.exp(-d / 0.04) * 6
    ir = lpf(ir, bright, 2)
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    return ir


def reverb(x, ir, wet, hp=140.0):
    """x (2, n) plus a wet return; the send is high-passed so the room never muddies the low end."""
    n = x.shape[1]
    s = hpf(x, hp) if hp else x
    w0 = signal.oaconvolve(s[0], ir[0])[:n]
    w1 = signal.oaconvolve(s[1], ir[1])[:n]
    return x + wet * np.stack([0.82 * w0 + 0.18 * w1, 0.82 * w1 + 0.18 * w0])


# =============================================================================================== loudness (BS.1770-4)
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def kpow(x):
    """K-weighted power summed over the two channels, per sample."""
    y = signal.lfilter(*_K1, x, axis=-1)
    y = signal.lfilter(*_K2, y, axis=-1)
    return np.sum(y ** 2, axis=0)


def to_lufs(z):
    return -0.691 + 10 * np.log10(np.maximum(z, 1e-20))


def blocks(p, win, hop=0.1):
    c = np.concatenate([[0.0], np.cumsum(p)])
    w, h = int(win * SR), int(hop * SR)
    st = np.arange(0, max(1, len(p) - w + 1), h)
    return st, (c[np.minimum(st + w, len(p))] - c[st]) / w


def integrated_lufs(x):
    _, z = blocks(kpow(x), 0.4)
    lz = to_lufs(z)
    g = z[lz > -70]
    if not len(g):
        return -70.0
    rel = to_lufs(g.mean()) - 10
    return float(to_lufs(z[(lz > -70) & (lz > rel)].mean()))


def lra(x):
    _, z = blocks(kpow(x), 3.0)
    lz = to_lufs(z)
    g = z[lz > -70]
    if not len(g):
        return 0.0
    rel = to_lufs(g.mean()) - 20
    s = np.sort(lz[(lz > -70) & (lz > rel)])
    return float(s[int(0.95 * (len(s) - 1))] - s[int(0.10 * (len(s) - 1))])


def true_peak_db(x):
    m = 0.0
    for ch in x:
        m = max(m, float(np.max(np.abs(signal.resample_poly(ch, 4, 1)))))
    return 20 * np.log10(m + 1e-12)


# =============================================================================================== instruments
class FeltPiano:
    """Additive felt piano. Each (note, velocity bucket) is rendered once and reused; velocity scales brightness
    (felt muting: soft hits are dark), attack softness and level."""

    def __init__(self, seed):
        self.seed = seed
        self.cache = {}

    def note(self, m, vel):
        vq = int(np.clip(round(vel * 10), 1, 10))
        key = (m, vq)
        if key not in self.cache:
            self.cache[key] = self._render(m, vq / 10)
        return self.cache[key] * (vel / (vq / 10))

    def _render(self, m, v):
        r = rng_for(self.seed, 'piano', m, v)
        f0 = mtof(m)
        L = int(SR * 7.0)
        t = np.arange(L) / SR
        B = 0.00011 * 2 ** ((m - 60) / 18)                 # string inharmonicity, rising with pitch
        fc = 1100 + 3600 * v ** 1.2                         # felt: the hammer's brightness follows velocity
        tau_base = float(np.clip(2.2 * (261.6 / f0) ** 0.55, 0.5, 6.0))
        y = np.zeros(L)
        amps = []
        for k in range(1, 64):
            fk = k * f0 * np.sqrt(1 + B * k * k)
            if fk > 10000:
                break
            w = 1.0 / (1.0 + (fk / fc) ** 2.0)
            amp = k ** -0.7 * w * (0.2 + 0.8 * abs(np.sin(np.pi * k / 7.4)))   # strike point near 1/7.4
            if amp < 2e-4:
                continue
            amps.append(amp)
            tau2 = tau_base / (1 + (fk / 1500) ** 1.15)
            tau1 = tau2 * 0.2
            nk = min(L, int(SR * tau2 * 7.0))
            tt = t[:nk]
            beat = 1 + 0.16 * np.cos(2 * np.pi * (0.05 + 0.00035 * fk) * tt + r.uniform(0, 6.283))
            dec = 0.6 * np.exp(-tt / tau1) + 0.4 * np.exp(-tt / tau2)
            y[:nk] += amp * np.sin(2 * np.pi * fk * tt + r.uniform(0, 6.283)) * dec * beat
        y /= np.sqrt(np.sum(np.square(amps))) + 1e-9
        a = int(SR * (0.004 + 0.010 * (1 - v)))           # 4..14 ms felt attack instead of a click
        y[:a] *= ramp(a)
        nz = r.standard_normal(int(0.06 * SR))
        thump = lpf(nz, 300 + 500 * v) * np.exp(-np.arange(len(nz)) / SR / 0.011)
        thump[:int(0.002 * SR)] *= ramp(int(0.002 * SR))
        y[:len(thump)] += thump * 0.06
        mech = bpf(r.standard_normal(int(0.03 * SR)), 1200, 6500) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.006)
        mech[:int(0.001 * SR)] *= ramp(int(0.001 * SR))
        y[:len(mech)] += mech * 0.012 * (0.5 + v)        # the soft key/felt mechanism: intimacy, not attack
        reg = 0.8 if m < 48 else 1.0                       # keep the bass from clouding
        return y * v ** 1.25 * reg


def pad_notes(notes, n, r, cents=(-7.0, 0.0, 7.0)):
    """Warm analogue pad voice stack: drifting detuned saws, spread across the stereo field."""
    out = np.zeros((2, n))
    t = np.arange(n) / SR
    for m in notes:
        for j, c in enumerate(cents):
            drift = 1 + 0.0008 * np.sin(2 * np.pi * r.uniform(0.06, 0.17) * t + r.uniform(0, 6.283))
            x = saw(mtof(m) * 2 ** (c / 1200) * drift, n, phase0=r.random())
            out += pan(x, (-0.65, 0.0, 0.65)[j % 3])
    return out / max(1, len(notes) * len(cents)) * 2.2


def string_note(m, dur, r, att=0.9, rel=1.3):
    """String-like ensemble note: five detuned saws, each with its own delayed vibrato, bowed swell."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    onset = np.clip((t - 0.35) / 0.9, 0, 1)
    for v, c in enumerate((-9.0, -4.0, 0.0, 4.0, 9.0)):
        rate = 5.0 + r.uniform(-0.35, 0.35)
        vib = 1 + 0.0026 * onset * np.sin(2 * np.pi * rate * t + r.uniform(0, 6.283))
        f = mtof(m) * 2 ** ((c + r.normal(0, 1.2)) / 1200) * vib
        out += pan(saw(f, n, phase0=r.random()), (v - 2) / 2 * 0.55)
    return out / 5 * env_ar(n, att, dur, rel)


def pulse_hit(m, r):
    """A very soft felt-mallet low pulse (timpani-ish heartbeat, no click)."""
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = mtof(m) * (1 + 0.035 * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / 0.26) + 0.32 * np.sin(2 * ph) * np.exp(-t / 0.13)
    nz = lpf(r.standard_normal(n), 240) * np.exp(-t / 0.03) * 0.25
    x = x + nz
    x[:int(0.016 * SR)] *= ramp(int(0.016 * SR))
    return x


def celesta(m, r, dur=2.6):
    """Soft, muted celesta / bell: strong fundamental, a few weak bar modes, felt-mallet attack."""
    f0 = mtof(m)
    n = int(dur * SR)
    t = np.arange(n) / SR
    tau = 1.0 * (1000 / f0) ** 0.25
    x = np.zeros(n)
    for ratio, a, tk in ((1.0, 1.0, 1.0), (2.0, 0.07, 0.35), (3.0, 0.035, 0.22), (4.02, 0.045, 0.12), (5.43, 0.015, 0.06)):
        if f0 * ratio < 12000:
            x += a * np.sin(2 * np.pi * f0 * ratio * t + r.uniform(0, 6.283)) * np.exp(-t / (tau * tk))
    x[:int(0.003 * SR)] *= ramp(int(0.003 * SR))
    nz = bpf(r.standard_normal(int(0.03 * SR)), 1500, 5000) * np.exp(-np.arange(int(0.03 * SR)) / SR / 0.004)
    x[:len(nz)] += nz * 0.02
    return lpf(x, 6500)


# =============================================================================================== sound design
def felt_tap(r, body_m=50, bright=2600.0):
    """An object settling on a plinth: soft felt/paper contact with a small, low, tuned body."""
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    burst = bpf(r.standard_normal(n), 180, bright) * np.exp(-t / 0.02)
    burst[:int(0.0018 * SR)] *= ramp(int(0.0018 * SR))
    f = mtof(body_m)
    body = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.12 * np.exp(-t / 0.01))) / SR) * np.exp(-t / 0.05)
    body[:int(0.003 * SR)] *= ramp(int(0.003 * SR))
    thud = np.sin(2 * np.pi * 72 * t) * np.exp(-t / 0.06)
    thud[:int(0.004 * SR)] *= ramp(int(0.004 * SR))
    return lpf(burst * 0.85 + body * 0.42 + thud * 0.25, 4200)


def paper_tap(r):
    """A printed copy landing on a stack: a light paper pat with a puff of air."""
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = bpf(r.standard_normal(n), 500, 4200) * np.exp(-t / 0.013)
    x[:int(0.0012 * SR)] *= ramp(int(0.0012 * SR))
    air = lpf(r.standard_normal(n), 420) * np.exp(-t / 0.05) * 0.5
    air[:int(0.004 * SR)] *= ramp(int(0.004 * SR))
    return lpf(x + air, 5200)


def card_flick(r):
    """A coupon card fanning out: a short, soft card flick."""
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    x = sweep_bpf(r.standard_normal(n), 1600, 3800, q=1.0) * np.exp(-t / 0.035)
    x[:int(0.004 * SR)] *= ramp(int(0.004 * SR))
    tick = bpf(r.standard_normal(n), 300, 1200) * np.exp(-t / 0.008) * 0.3
    tick[:int(0.0015 * SR)] *= ramp(int(0.0015 * SR))
    return lpf(x + tick, 6000)


def paper_slide(r, dur=0.38, f0=1100.0, f1=2600.0, flap=0.0, p0=-0.25, p1=0.25):
    """A sheet of paper sliding: band-limited noise with friction grain, smooth swell in and out (stereo)."""
    n = int((dur + 0.2) * SR)
    t = np.arange(n) / SR
    u = np.clip(t / dur, 0, 1)
    env = np.sin(np.pi * u) ** 1.3 * (t < dur)
    g = lpf(r.standard_normal(n), 45)
    grain = 0.62 + 0.38 * g / (np.max(np.abs(g)) + 1e-9)
    x = sweep_bpf(r.standard_normal(n), f0, f1, q=0.85) * env * grain
    st = autopan(x, p0, p1)
    if flap:
        i0 = int(dur * 0.82 * SR)
        tt = t[i0:] - t[i0]
        fl = np.sin(2 * np.pi * 115 * tt) * np.exp(-tt / 0.045)
        fl[:int(0.006 * SR)] *= ramp(int(0.006 * SR))
        st[:, i0:] += fl * flap * 0.35
    return lpf(st, 5200)


def airy_rise(r, dur, tones, f_lo=450.0, f_hi=2000.0, peak=0.85, tail=0.8, w0=0.5, w1=1.0):
    """A gentle, airy rise (breath + tonal shimmer of the chord it leads to). Slow, wide band, ends softly."""
    n = int((dur + tail) * SR)
    t = np.arange(n) / SR
    tp = dur * peak
    up = smoothstep(t / tp) ** 1.4
    down = np.cos(np.clip((t - tp) / (n / SR - tp), 0, 1) * np.pi / 2) ** 2
    env = np.where(t < tp, up, down)
    L = sweep_bpf(r.standard_normal(n), f_lo, f_hi, q=0.6)
    R = sweep_bpf(r.standard_normal(n), f_lo * 1.05, f_hi * 1.05, q=0.6)
    w = np.linspace(w0, w1, n)                            # stereo width opens as it rises
    mid, side = (L + R) / 2, (L - R) / 2 * w
    x = np.stack([mid + side, mid - side]) * env
    for i, m in enumerate(tones):
        f = mtof(m) * (1 + 0.0015 * np.sin(2 * np.pi * (0.6 + 0.13 * i) * t + r.uniform(0, 6.283)))
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env ** 2 * 0.3
        x += pan(s, (-0.5, 0.5)[i % 2] * 0.7)
    return lpf(x, 5000)


def low_bloom(r, m, dur=3.2):
    """A town rising: a low, soft warm bloom (no rumble, no boom)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = smoothstep(t / 1.1) * np.exp(-np.maximum(0, t - 1.1) / 0.8)
    f = mtof(m)
    x = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t + 1.0)) * e
    x += lpf(r.standard_normal(n), 220) * e * 0.4
    x += bpf(r.standard_normal(n), 250, 900) * e ** 1.5 * 0.35       # a warm breath so it reads on small speakers
    return x


def warm_thump(r, m, tau=0.24):
    """The booklet arriving: a warm, low, tuned thump with a felt contact (no click, no boom)."""
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(mtof(m) * (1 + 0.2 * np.exp(-t / 0.035))) / SR
    x = np.sin(ph) * np.exp(-t / tau) + 0.22 * np.sin(2 * ph) * np.exp(-t / (tau * 0.5))
    x[:int(0.006 * SR)] *= ramp(int(0.006 * SR))
    felt = lpf(r.standard_normal(n), 320) * np.exp(-t / 0.025) * 0.25
    felt[:int(0.002 * SR)] *= ramp(int(0.002 * SR))
    return x + felt


# =============================================================================================== harmony (D-flat major)
# root: pulse/sub register; lh: felt-piano chord (rolled, low to high); pad: pad voicing; arp: broken-chord tones;
# shi: string upper voices; slo: string low voice.
CH = {
    # The major 7th (C) is kept out of every chord a Db melody note sits on (no minor-9th rubs); it appears only as
    # the lydian #11 at the lift, as the third of the cadential V, and as a passing melody note.
    'Iintro': dict(root=37, lh=[], pad=[49, 56, 63, 65], arp=[], shi=[], slo=None),
    'I':      dict(root=37, lh=[37, 44, 53, 63], pad=[56, 61, 63, 65], arp=[56, 63, 65, 68, 73, 75], shi=[65, 68], slo=49),
    'I6':     dict(root=41, lh=[41, 49, 56, 63], pad=[56, 61, 63, 65], arp=[56, 61, 63, 65, 68, 73], shi=[65, 68], slo=53),
    'IV':     dict(root=42, lh=[42, 49, 58, 65], pad=[58, 61, 65, 68], arp=[58, 61, 65, 68, 70, 73], shi=[65, 70], slo=54),
    'IVlift': dict(root=42, lh=[42, 54, 61, 65, 70], pad=[61, 65, 68, 70, 72], arp=[61, 65, 68, 70, 72, 77], shi=[72, 77], slo=42),
    'vi':     dict(root=34, lh=[34, 46, 53, 61], pad=[56, 61, 65, 68], arp=[53, 56, 61, 65, 68, 73], shi=[65, 68], slo=46),
    'V':      dict(root=44, lh=[44, 51, 56, 61], pad=[58, 61, 63, 68], arp=[56, 58, 61, 63, 68, 70], shi=[63, 70], slo=44),
    'ii':     dict(root=39, lh=[39, 46, 54, 61], pad=[54, 58, 61, 68], arp=[54, 58, 61, 66, 70, 73], shi=[66, 73], slo=39),
    'Vc':     dict(root=44, lh=[44, 51, 56, 63], pad=[58, 60, 63, 68], arp=[], shi=[63, 70], slo=44),
    'Ires':   dict(root=37, lh=[37, 49, 56, 61, 65], pad=[56, 61, 63, 65, 68], arp=[56, 61, 63, 65, 68], shi=[65, 73], slo=37),
    'IV/I':   dict(root=37, lh=[37, 54, 58, 61], pad=[54, 58, 61, 65], arp=[54, 58, 61, 65, 70], shi=[65, 70], slo=37),
    'Ifinal': dict(root=37, lh=[37, 44, 53, 58, 63, 68], pad=[56, 61, 63, 65, 70], arp=[], shi=[61, 65], slo=None),
}

# melody cells: (beat, midi, length in beats, velocity scale); one list per occurrence of the chord
MEL = {
    'I':      [[(0, 77, 2, 1.0), (2, 75, 1, .85), (3, 73, .5, .8), (3.5, 68, 1.5, .8)],          # F  Eb Db Ab
               [(0, 80, 1.5, 1.0), (1.5, 77, .5, .8), (2, 75, 1, .85), (3, 73, 2, .85)]],        # Ab F  Eb Db
    'I6':     [[(0, 80, 2, 1.0), (2, 77, 1, .85), (3, 75, .5, .8), (3.5, 73, 1.5, .85)]],        # Ab F  Eb Db
    'IV':     [[(0, 70, 2, .95), (2, 72, 1, .85), (3, 73, 2, .9)],                               # Bb C  Db
               [(0, 70, 1, .9), (1, 72, 1, .85), (2, 73, 1, .9), (3, 77, 2, 1.0)]],              # Bb C  Db F
    'vi':     [[(0, 77, 2, 1.0), (2, 75, 1, .85), (3, 73, .5, .8), (3.5, 70, 1.5, .8)],          # F  Eb Db Bb
               [(0, 75, 2, .95), (2, 73, 1, .85), (3, 72, 1, .85)]],                             # Eb Db C
    'V':      [[(0, 75, 2.5, .95), (2.5, 73, .5, .8), (3, 72, 1, .85), (4, 75, 1, .85)]],        # Eb Db C Eb
    'IVlift': [[(0, 77, 1, .95), (1, 80, 1, 1.0), (2, 82, 2.5, 1.08), (4.5, 80, .5, .85), (5, 77, 1, .9),
                (6, 80, 2, .95), (8, 82, 2, 1.0)]],                                               # F Ab Bb Ab F
    'ii':     [[(0, 78, 2, 1.0), (2, 77, 1, .9), (3, 75, 1, .9)]],                               # Gb F Eb
    'Vc':     [[(0, 75, 1, .92), (1, 72, 1, .88)]],                                              # Eb C -> Db
    'Ires':   [[(0, 73, 3.2, 1.0)]],
    'IV/I':   [[(0, 70, 1, .8), (1, 68, 2, .75)]],
    'Ifinal': [[(0.15, 77, 6, .7)]],
}

ARP = {   # (beat offset, index into the chord's arp tones)
    1.0: [(1, 1), (2, 2), (3, 3), (4, 2)],
    1.5: [(1, 1), (2, 2), (2.5, 3), (3, 4), (4, 2), (4.5, 3)],
    2.0: [(0.5, 1), (1, 2), (1.5, 3), (2, 4), (2.5, 3), (3, 5), (3.5, 4), (4, 2), (4.5, 3), (5, 1), (5.5, 2)],
    0.5: [(1.5, 2), (2.5, 3)],
}

MOODS = {
    'home': dict(transpose=0, beat=0.76, chunk=5, energy=0.0, world=6.0),
    'biz':  dict(transpose=2, beat=0.72, chunk=4, energy=0.12, world=6.0),   # E-flat, a touch more forward
}
PENTA = [61, 63, 65, 68, 70]   # D-flat major pentatonic


def penta_from(m0, k):
    """k-th pentatonic note at or above m0."""
    notes = sorted({p + 12 * o for p in PENTA for o in range(-3, 4)})
    i = next(j for j, x in enumerate(notes) if x >= m0)
    return notes[i + k]


# =============================================================================================== form
class Plan:
    pass


def build_plan(events, dur, mood, world=None):
    M = MOODS[mood]
    P = Plan()
    P.dur, P.N, P.mood, P.T = dur, int(round(dur * SR)), mood, M['transpose']
    P.events = sorted([e for e in events if 0 <= float(e['t']) < dur], key=lambda e: float(e['t']))
    ev = [(float(e['t']), e['kind']) for e in P.events]

    def first(kinds, after=-1.0):
        return next((t for t, k in ev if k in kinds and t > after), None)

    t_open = first({'open'})
    P.open = 0.4 if t_open is None else t_open
    W = float(world if world is not None else M['world'])
    W = min(W, dur * 0.3)
    E = first({'end'})
    E = dur - 5.4 if E is None else E
    R = first({'slot'})
    if R is None:
        sends = [t for t, k in ev if k == 'send']
        R = sends[-1] + 2.6 if sends else E - 4 * M['beat']
    R = float(np.clip(R, W + 14 * M['beat'], E - 0.5))
    nb = max(14, int(round((R - W) / M['beat'])))
    beat = (R - W) / nb
    tb = lambda k: W + k * beat  # noqa: E731
    Lt = first({'found'}) or first({'send'}) or tb(nb - 12)
    l = int(np.clip(round((Lt - W) / beat), 4, nb - 8))
    Pt = first({'book-land'}) or first({'office'}) or first({'gather'})
    p = int(np.ceil((Pt - W) / beat - 1e-3)) if Pt is not None else 2 * M['chunk']
    p = int(np.clip(p, min(M['chunk'], l), l))
    P.W, P.R, P.E, P.beat, P.nb, P.l, P.p = W, R, E, beat, nb, l, p
    P.L, P.Pt = tb(l), tb(p)
    P.bpm = 60 / beat

    # chord timeline
    segs = []
    seq = ['I', 'IV', 'vi', 'V', 'I6', 'IV', 'vi', 'V']
    k, i = 0, 0
    while k < l:
        k1 = min(l, k + M['chunk'])
        if 0 < l - k1 < 3:
            k1 = l
        segs.append([k, k1, seq[i % len(seq)]])
        k, i = k1, i + 1
    if segs and segs[-1][2] == 'IV':
        segs[-1][2] = 'vi'
    segs.append([l, nb - 6, 'IVlift'])
    segs.append([nb - 6, nb - 2, 'ii'])
    segs.append([nb - 2, nb, 'Vc'])
    chords = [dict(t0=tb(a), t1=tb(b), sym=s) for a, b, s in segs]
    plag = max(R + 2 * beat, E - 2.3 * beat) if E - R >= 4 * beat else None
    chords.append(dict(t0=R, t1=plag if plag else E, sym='Ires'))
    if plag:
        chords.append(dict(t0=plag, t1=E, sym='IV/I'))
    chords.append(dict(t0=E, t1=dur, sym='Ifinal'))
    seen = {}
    for c in chords:
        c['occ'] = seen.get(c['sym'], 0)
        seen[c['sym']] = c['occ'] + 1
    P.chords = chords

    # intensity arc (drives density, velocity, filter, levels)
    en = M['energy']
    nodes = [(0.0, 0.08), (W, 0.18 + en), (tb(2 * M['chunk']), 0.33 + en), (P.Pt, 0.40 + en),
             (P.L, 0.68 + en), (R - 2 * beat, 0.92), (R, 1.0), (R + 3 * beat, 0.62), (E, 0.45), (dur, 0.25)]
    clean = []
    for t, v in sorted(nodes):
        if clean and t <= clean[-1][0] + 1e-6:
            clean[-1] = (clean[-1][0], max(clean[-1][1], min(v, 1.0)))
        else:
            clean.append((t, min(v, 1.0)))
    P.inodes = clean
    P.I = lambda t: float(np.interp(t, [a for a, _ in clean], [b for _, b in clean]))  # noqa: E731
    P.S = next((c['t0'] for c in chords if c['t0'] >= P.Pt + 0.3 * (P.L - P.Pt) - 1e-6), P.L)
    return P


def chord_at(P, t):
    for c in P.chords:
        if c['t0'] - 1e-6 <= t < c['t1'] - 1e-6:
            return c
    return P.chords[-1] if t >= P.chords[-1]['t0'] else dict(sym='Iintro', t0=0, t1=P.W)


# =============================================================================================== music
def render_music(P, seed, irs):
    N, T, beat = P.N, P.T, P.beat
    r = rng_for(seed, 'music')
    piano = FeltPiano(seed)
    notes = []   # (t, midi, vel, t_off)

    # --- intro: three high felt notes in free time, then a pickup into the motif
    W = P.W
    for frac, m, v in ((0.26, 68, 0.15), (0.50, 75, 0.145), (0.63, 73, 0.135)):
        notes.append((W * frac, m, v, W + 0.15))
    notes.append((W - beat, 68, 0.13, W + 0.6))

    # --- chords
    for c in P.chords:
        sym, t0, t1 = c['sym'], c['t0'], c['t1']
        d = CH[sym]
        I = P.I(t0)
        cv = 0.16 + 0.27 * I
        mv = 0.25 + 0.40 * I
        av = 0.10 + 0.18 * I
        nbt = (t1 - t0) / beat
        final = sym == 'Ifinal'
        off = P.dur + 1 if final else t1 + 0.12
        roll = 0.055 if final else 0.045 if abs(t0 - P.W) < 1e-6 else 0.032
        if abs(t0 - P.W) < 1e-6:
            cv *= 0.85                                                  # the world settles in, it does not land
        for j, m in enumerate(d['lh']):
            v = cv * (0.95 if j == 0 else 0.78 - 0.04 * j) * (1.15 if sym in ('Ires', 'Ifinal') else 1.0)
            jit = 0 if j == 0 else r.normal(0, 0.004)
            notes.append((t0 + j * roll + jit, m, v, off))
        # broken chord
        if sym in ('Ires', 'IV/I'):
            dens = 0.5 if sym == 'Ires' else 0
        elif sym in ('Vc', 'Ifinal'):
            dens = 0
        else:
            dens = 0 if I < 0.30 else 1.0 if I < 0.45 else 1.5 if I < 0.66 else 2.0
        if dens and d['arp']:
            for b, idx in ARP[dens]:
                if b < nbt - 0.25:
                    m = d['arp'][idx % len(d['arp'])]
                    acc = 1.0 if b % 1 == 0 else 0.8
                    notes.append((t0 + b * beat + r.normal(0, 0.005), m, av * acc, t1 + 0.12))
        # melody
        cells = MEL.get(sym)
        if cells:
            cell = [x for x in cells[c['occ'] % len(cells)] if x[0] < nbt - 0.2 or final]
            for i, (b, m, ln, vs) in enumerate(cell):
                ts = t0 + b * beat + (0 if b == 0 else r.normal(0, 0.006))
                nxt = t0 + cell[i + 1][0] * beat if i + 1 < len(cell) else t0 + (b + ln) * beat
                toff = P.dur + 1 if final else min(max(t0 + (b + ln) * beat, nxt) + 0.2, t1 + 0.12)
                notes.append((ts, m, mv * vs, toff))
                if sym in ('IVlift', 'Vc', 'Ires'):                      # octave doubling at the lift
                    notes.append((ts + 0.012, m - 12, mv * vs * 0.45, toff))

    P.notelog = [('piano', ts, min(toff, ts + 2.5), m + T) for ts, m, v, toff in notes]
    pbuf = np.zeros((2, N))
    for ts, m, v, toff in notes:
        m += T
        y = piano.note(m, v)
        ln = min(len(y), int((toff - ts + 0.4) * SR))
        y = y[:ln].copy()
        k = int((toff - ts) * SR)
        if k < ln:
            y[k:] *= 1 - ramp(ln - k)                                   # damper: 0.4 s soft release
        add(pbuf, y, ts, 1.0, p=float(np.clip((m - 62) / 30, -0.5, 0.5)) * 0.6)
    pbuf *= 10 ** ((-20 - integrated_lufs(pbuf)) / 20)
    pbuf = fx(pbuf, Pedalboard([HighpassFilter(42), LowShelfFilter(cutoff_frequency_hz=220, gain_db=-1.5, q=0.7),
                                Compressor(threshold_db=-15, ratio=2.5, attack_ms=4, release_ms=140),
                                HighShelfFilter(cutoff_frequency_hz=6000, gain_db=2.5, q=0.7)]))
    pbuf = reverb(pbuf, irs['hall'], 0.30)

    # --- pad
    pad = np.zeros((2, N))
    segs = [dict(sym='Iintro', t0=max(0.05, P.open - 0.2), t1=W)] + P.chords
    for c in segs:
        d = CH[c['sym']]
        att = 3.2 if c['sym'] == 'Iintro' else 1.4
        rel = 2.6 if c['sym'] == 'Ifinal' else 1.6
        L = c['t1'] - c['t0'] + (0.3 if c['sym'] != 'Ifinal' else 0)
        n = int((L + rel) * SR)
        x = pad_notes([m + T for m in d['pad']], n, rng_for(seed, 'pad', c['t0']))
        P.notelog += [('pad', c['t0'], c['t1'], m + T) for m in d['pad']]
        x *= env_ar(n, att, L, rel) * (1.2 if c['sym'] == 'Iintro' else 1.0)
        add(pad, x, c['t0'] - (0.25 if c['sym'] != 'Iintro' else 0))
    It = np.array([P.I(t) for t in np.arange(0, P.dur + 0.1, 0.05)])
    Is = np.interp(np.arange(N) / SR, np.arange(len(It)) * 0.05, It)
    Is = uniform_filter1d(Is, size=int(0.5 * SR), mode='nearest')
    pad = tv_lpf(pad, 340 + 1500 * Is ** 1.35)
    pad = lpf(pad, 6000)
    pad *= 0.33 + 0.67 * Is
    pad = fx(pad, Pedalboard([PeakFilter(cutoff_frequency_hz=320, gain_db=-2.0, q=0.8), Chorus(rate_hz=0.17, depth=0.3, centre_delay_ms=8.0, feedback=0.0, mix=0.4)]))
    pad = reverb(pad, irs['hall'], 0.55)

    # --- strings: voice-led sustained lines from S, low line from the lift, swelling into the resolution
    strings = np.zeros((2, N))
    lines = {0: [], 1: [], 2: []}
    for c in P.chords:
        if c['t0'] < P.S - 1e-6:
            continue
        d = CH[c['sym']]
        for v, m in enumerate(d['shi'][:2]):
            lines[v].append([c['t0'], c['t1'], m])
        if d['slo'] is not None and c['t0'] >= P.L - 1e-6:
            lines[2].append([c['t0'], c['t1'], d['slo']])
    for v, ln in lines.items():
        merged = []
        for a, b, m in ln:
            if merged and merged[-1][2] == m and abs(merged[-1][1] - a) < 1e-6:
                merged[-1][1] = b
            else:
                merged.append([a, b, m])
        for a, b, m in merged:
            final = abs(b - P.dur) < 1e-6
            x = string_note(m + T, (b - a) + (0 if final else 0.25), rng_for(seed, 'str', v, a),
                            att=1.1 if v < 2 else 1.6, rel=0.9 if not final else 1.0)
            add(strings, x, a - 0.12, 1.0 if v < 2 else 0.8)
            P.notelog.append(('str', a, b, m + T))
    sn = [(P.S - 0.3, 0.0), (P.S + 3.0, 0.45), (P.L, 0.62), (P.R - 2 * beat, 0.85), (P.R - 0.05, 1.0),
          (P.R + 2.2, 0.62), (P.E - 0.3, 0.25), (P.E + 2.5, 0.15), (P.dur, 0.0)]
    strings *= curve([(0.0, 0.0)] + sn, N, smooth=0.4)
    strings = fx(strings, Pedalboard([HighpassFilter(150), PeakFilter(cutoff_frequency_hz=900, gain_db=1.5, q=0.7),
                                      HighShelfFilter(cutoff_frequency_hz=4500, gain_db=-2.5, q=0.7)]))
    strings = lpf(strings, 5500)
    strings = reverb(strings, irs['hall'], 0.55)

    # --- low pulse: every beat from the first landing of the booklet until the cadence V (the breath)
    pulse = np.zeros((2, N))
    for k in range(P.p, P.nb - 2):
        t = W + k * beat
        c = chord_at(P, t + 1e-4)
        m = CH[c['sym']]['root'] + T
        while m > 45:
            m -= 12
        acc = 1.0 if abs(t - c['t0']) < 1e-3 else 0.7
        add(pulse, pulse_hit(m, rng_for(seed, 'pulse', k)), t, (0.5 + 0.5 * P.I(t)) * acc)
    pulse = lpf(pulse, 300)
    pulse = reverb(pulse, irs['room'], 0.12, hp=60)

    # --- sub: a quiet sine root under everything from the second phrase on
    sub = np.zeros((2, N))
    for c in P.chords:
        if c['t0'] < W + 2 * MOODS[P.mood]['chunk'] * beat - 1e-6:
            continue
        m = CH[c['sym']]['root'] + T
        while m > 45:
            m -= 12
        L = c['t1'] - c['t0']
        rel = 2.5 if c['sym'] == 'Ifinal' else 0.5
        n = int((L + rel) * SR)
        tt = np.arange(n) / SR
        x = (np.sin(2 * np.pi * mtof(m) * tt) + 0.2 * np.sin(4 * np.pi * mtof(m) * tt)) * env_ar(n, 0.5, L, rel)
        if c['sym'] == 'Ifinal':
            x *= np.exp(-tt / 3.0)
        add(sub, x, c['t0'])
    sub = lpf(sub, 180)

    stems = dict(piano=pbuf, pad=pad, strings=strings, pulse=pulse, sub=sub)
    targets = dict(piano=-20.0, pad=-24.5, strings=-25.0, pulse=-31.0, sub=-33.0)
    for k, x in stems.items():
        lu = integrated_lufs(x)
        stems[k] = x * 10 ** ((targets[k] - lu) / 20)
    return stems


# =============================================================================================== sound effects
REL = {'land': -12, 'stack': -14, 'page': -12.5, 'card': -14, 'gather': -13, 'book-land': -10, 'rise': -9,
       'found': -9, 'send': -13, 'send-flick': -17, 'slot-slide': -10, 'slot-thump': -8, 'slot-chime': -9,
       'end': -14, 'office': -10, 'tile': -10}


def render_sfx(P, music, seed, irs):
    N, T = P.N, P.T
    clips = []   # (t, stereo clip, rel dB, bus, label)
    cnt = {}
    ev = [(float(e['t']), e['kind']) for e in P.events]

    def nxt(t, kinds, within=4.0):
        return next((u for u, k in ev if k in kinds and t < u <= t + within), None)

    for t, k in ev:
        i = cnt.get(k, 0)
        cnt[k] = i + 1
        r = rng_for(seed, 'sfx', k, i)
        c = chord_at(P, t + 1e-4)
        if k == 'open':
            continue                                               # the intro pad is the opening
        elif k == 'land':
            body = [49, 51, 53, 56, 58, 61][i % 6] + T
            clips.append((t, pan(felt_tap(r, body), -0.35 + 0.14 * (i % 6)), REL[k], 'dry', k))
        elif k == 'stack':
            clips.append((t, pan(paper_tap(r), r.uniform(-0.25, 0.25)), REL[k] + r.uniform(-1.5, 1.0), 'dry', k))
        elif k == 'page':
            clips.append((t - 0.12, lpf(paper_slide(r, 0.36, 1100, 2500, flap=1.0, p0=0.3, p1=-0.3), 4300), REL[k], 'dry', k))
        elif k == 'card':
            clips.append((t, pan(card_flick(r), -0.3 + 0.2 * (i % 4)), REL[k], 'dry', k))
        elif k in ('gather', 'send'):
            to = nxt(t, {'book-land', 'slot', 'land', 'office'}) or t + (1.8 if k == 'gather' else 2.6)
            dur = max(0.8, to - t - (0.12 if k == 'send' else 0.0))
            target = chord_at(P, to + 1e-3)
            tones = [m + T + 12 for m in CH[target['sym']]['pad'][-3:]]
            peak = 0.95 if k == 'gather' else 0.78
            x = airy_rise(r, dur, tones, 380 if k == 'gather' else 450, 1500 if k == 'gather' else 1800,
                          peak=peak, tail=0.7, w0=0.4, w1=1.0 if k == 'send' else 0.7)
            clips.append((t, x, REL[k], 'wet', k))
            if k == 'send':
                for j, d in enumerate((0.0, 0.09, 0.21)):
                    clips.append((t + d, pan(card_flick(rng_for(seed, 'flick', i, j)), -0.4 + 0.4 * j), REL['send-flick'], 'dry', 'send'))
        elif k == 'book-land':
            x = mixm(felt_tap(r, 41 + T, 1400), 0.7 * warm_thump(r, 41 + T, tau=0.12))
            clips.append((t, pan(x, 0.0), REL[k], 'dry', k))
        elif k == 'rise':
            m = CH[c['sym']]['root'] + T
            while m > 40:
                m -= 12
            clips.append((t, pan(low_bloom(r, m), 0.0), REL[k], 'dry', k))
        elif k in ('found', 'tile'):
            m = penta_from((80 if k == 'found' else 73) + T, i % 8)
            x = celesta(m, r)
            clips.append((t, pan(x, -0.45 + 0.15 * (i % 7)), REL[k], 'wet', k))
        elif k == 'slot':
            clips.append((t - 0.3, paper_slide(r, 0.34, 800, 2400, flap=0.0, p0=-0.15, p1=0.1), REL['slot-slide'], 'dry', 'slot'))
            clips.append((t, pan(warm_thump(r, 37 + T), 0.0), REL['slot-thump'], 'dry', 'slot'))
            ch = celesta(85 + T, r) + 0.8 * np.concatenate([np.zeros(int(0.028 * SR)), celesta(89 + T, r)])[:int(2.6 * SR)]
            clips.append((t + 0.03, pan(ch, 0.12), REL['slot-chime'], 'wet', 'slot'))
        elif k == 'end':
            clips.append((t + 0.05, pan(celesta(80 + T, r), 0.2), REL[k], 'wet', k))
        elif k == 'office':
            x = mixm(felt_tap(r, 44 + T, 1500), 0.6 * warm_thump(r, 44 + T, tau=0.14))
            clips.append((t, pan(x, 0.0), REL[k], 'dry', k))
            m = CH[c['sym']]['root'] + T
            while m > 40:
                m -= 12
            clips.append((t, pan(low_bloom(r, m, 2.6), 0.0), REL[k] - 4, 'dry', k))
        else:
            print(f'  (no sound for kind {k!r} at {t:.2f}s)')

    # level every clip against the music around it
    mp = kpow(music)
    music_int = integrated_lufs(music)
    buses = dict(dry=np.zeros((2, N)), wet=np.zeros((2, N)))
    log = []
    for t, x, rel, bus, label in clips:
        cp = kpow(np.concatenate([x, np.zeros((2, int(0.1 * SR)))], axis=1))
        c_lu = to_lufs(np.max(uniform_filter1d(cp, size=int(0.1 * SR))))
        a = max(0, int((t - 0.2) * SR))
        b = min(N, int((t + max(0.6, x.shape[1] / SR)) * SR))
        m_lu = to_lufs(np.mean(mp[a:b])) if b > a else music_int
        target = float(np.clip(m_lu + rel, music_int - 30, music_int - 4))
        g = 10 ** ((target - c_lu) / 20)
        add(buses[bus], x, t, g)
        log.append((t, label, m_lu - music_int, target - m_lu))
    dry = reverb(buses['dry'], irs['room'], 0.16)
    wet = reverb(buses['wet'], irs['hall'], 0.38)
    sfx = fx(dry + wet, Pedalboard([PeakFilter(cutoff_frequency_hz=3000, gain_db=-1.5, q=1.0)]))

    # soft room tone from the very first sample (never hard digital silence)
    rr = rng_for(seed, 'room')
    room = np.stack([pink(N, rr), pink(N, rr)])
    room = lpf(hpf(room, 60), 3200)
    room = room * 10 ** ((music_int - 32 - integrated_lufs(room)) / 20)
    return sfx, room, log


# =============================================================================================== master
def master(mix, target=-14.0, tp_max=-1.5, fade_out=1.2):
    N = mix.shape[1]
    mix = fx(mix, Pedalboard([HighpassFilter(26), LowShelfFilter(cutoff_frequency_hz=120, gain_db=0.5, q=0.7),
                              PeakFilter(cutoff_frequency_hz=380, gain_db=-1.0, q=0.8),
                              PeakFilter(cutoff_frequency_hz=3500, gain_db=1.0, q=0.7),
                              HighShelfFilter(cutoff_frequency_hz=8500, gain_db=2.0, q=0.7)]))
    mix *= 10 ** ((-20 - integrated_lufs(mix)) / 20)
    pre = mix.copy()
    mix = fx(mix, Pedalboard([Compressor(threshold_db=-24, ratio=1.7, attack_ms=40, release_ms=380)]))
    fade = np.ones(N)
    fi, fo = int(0.012 * SR), int(fade_out * SR)
    fade[:fi] = ramp(fi)
    fade[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    g = target - integrated_lufs(mix * fade)
    ceiling = tp_max - 0.4
    for _ in range(8):
        y, lg = limiter(mix * 10 ** (g / 20), ceiling_db=ceiling)
        y = y * fade
        lu = integrated_lufs(y)
        tp = true_peak_db(y)
        if tp > tp_max - 0.15:
            ceiling -= tp - (tp_max - 0.25)
            continue
        if abs(lu - target) < 0.04:
            break
        g += target - lu
    gr = -20 * np.log10(np.maximum(lg, 1e-9))
    comp_gr = integrated_lufs(pre) - integrated_lufs(mix)
    hot = []
    for i in np.argsort(gr)[::-1]:
        if gr[i] < 1.0 or len(hot) >= 4:
            break
        if all(abs(i / SR - h) > 0.5 for h, _ in hot):
            hot.append((i / SR, float(gr[i])))
    return y, dict(gain_db=g, limiter_max_gr=float(np.max(gr)), limiter_pct_over_1db=float(np.mean(gr > 1.0) * 100),
                   comp_gr=comp_gr, hot=hot)


# =============================================================================================== analysis
def ffmpeg_ebur128(path):
    try:
        out = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-filter_complex', 'ebur128=peak=true',
                              '-f', 'null', '-'], capture_output=True, text=True, timeout=120).stderr
    except Exception as e:  # pragma: no cover
        return dict(error=str(e))
    s = out[out.rfind('Summary:'):]
    g = lambda pat: (lambda mm: float(mm.group(1)) if mm else None)(re.search(pat, s, re.S))  # noqa: E731
    return dict(I=g(r'I:\s+(-?[\d.]+) LUFS'), LRA=g(r'LRA:\s+(-?[\d.]+) LU'), TP=g(r'True peak:\s+Peak:\s+(-?[\d.]+) dBFS'))


def clicks(y):
    hp = hpf(y.mean(0), 6000, 4)
    a = np.abs(hp)
    loc = np.sqrt(uniform_filter1d(hp ** 2, size=int(0.05 * SR)) + 1e-12)
    idx = np.where((a > 9 * loc) & (a > 0.01))[0]
    return idx / SR


def short_term(y, win):
    p = kpow(y)
    pa = uniform_filter1d(p, size=int(win * SR), mode='constant')
    return to_lufs(pa)


def draw_png(y, P, path, stats):
    from PIL import Image, ImageDraw, ImageFont
    Wd, H = 1800, 1040
    x0, x1 = 70, Wd - 30
    pw = x1 - x0
    img = Image.new('RGB', (Wd, H), (24, 21, 18))
    dr = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default(size=14)
        fsm = ImageFont.load_default(size=12)
    except TypeError:
        font = fsm = ImageFont.load_default()
    dur = y.shape[1] / SR
    X = lambda t: x0 + t / dur * pw  # noqa: E731
    cream, taupe, dim = (236, 226, 205), (150, 136, 116), (70, 63, 55)
    dr.text((x0, 10), f"SVIF score  {os.path.basename(path)}   mood={P.mood}  {P.bpm:.1f} BPM   "
            f"I={stats['I']:.2f} LUFS  TP={stats['TP']:.2f} dBTP  LRA={stats['LRA']:.1f} LU  "
            f"peak={stats['peak']:.2f} dBFS  clipped={stats['clipped']}", fill=cream, font=font)
    # panels
    P1, P2, P3 = (50, 250), (270, 470), (490, 1000)
    mid = y.mean(0)
    cols = np.array_split(mid, pw)
    c = (P1[0] + P1[1]) / 2
    hh = (P1[1] - P1[0]) / 2
    for i, seg in enumerate(cols):
        if len(seg):
            dr.line([(x0 + i, c - seg.max() * hh), (x0 + i, c - seg.min() * hh)], fill=(196, 180, 150))
    dr.text((8, c - 7), 'wave', fill=taupe, font=fsm)
    # loudness
    lo, hi = -50.0, -6.0
    Yl = lambda v: P2[1] - (np.clip(v, lo, hi) - lo) / (hi - lo) * (P2[1] - P2[0])  # noqa: E731
    for v in (-40, -30, -20, -14, -10):
        dr.line([(x0, Yl(v)), (x1, Yl(v))], fill=(120, 90, 60) if v == -14 else dim)
        dr.text((8, Yl(v) - 7), f'{v}', fill=taupe, font=fsm)
    for win, col, w in ((0.4, (120, 110, 160), 1), (3.0, (240, 200, 120), 2)):
        lu = short_term(y, win)
        pts = [(x0 + i, Yl(lu[min(len(lu) - 1, int(i / pw * len(lu)))])) for i in range(pw)]
        dr.line(pts, fill=col, width=w)
    dr.text((x1 - 330, P2[0] + 2), 'momentary 0.4 s (violet), short-term 3 s (gold), LUFS', fill=taupe, font=fsm)
    # spectrogram (log frequency)
    hop = max(256, y.shape[1] // pw)
    f, tt, Z = signal.stft(mid, fs=SR, nperseg=4096, noverlap=4096 - hop, boundary=None, padded=False)
    mag = 20 * np.log10(np.abs(Z) + 1e-9)
    rows = P3[1] - P3[0]
    fr = 30 * (16000 / 30) ** (1 - np.arange(rows) / (rows - 1))
    spec = np.empty((rows, mag.shape[1]))
    for j in range(mag.shape[1]):
        spec[:, j] = np.interp(fr, f, mag[:, j])
    vmin, vmax = -115, -35
    u = np.clip((spec - vmin) / (vmax - vmin), 0, 1)
    stops = np.array([[0, 18, 15, 13], [0.3, 62, 38, 72], [0.55, 150, 62, 70], [0.78, 230, 150, 80], [1, 252, 242, 214]])
    rgb = np.stack([np.interp(u, stops[:, 0], stops[:, k]) for k in (1, 2, 3)], -1).astype(np.uint8)
    sp = Image.fromarray(rgb).resize((pw, rows), Image.BILINEAR)
    img.paste(sp, (x0, P3[0]))
    for fq in (50, 100, 200, 500, 1000, 2000, 5000, 10000):
        yy = P3[0] + (1 - np.log(fq / 30) / np.log(16000 / 30)) * (rows - 1)
        dr.line([(x0 - 6, yy), (x0, yy)], fill=taupe)
        dr.text((8, yy - 7), f'{fq if fq < 1000 else str(fq // 1000) + "k"}', fill=taupe, font=fsm)
    # time grid, anchors, events
    for s in range(0, int(dur) + 1, 5):
        dr.line([(X(s), P1[1]), (X(s), P1[1] + 6)], fill=taupe)
        dr.text((X(s) - 6, P3[1] + 6), f'{s}s', fill=taupe, font=fsm)
    for t, lab in ((P.W, 'world'), (P.Pt, 'pulse'), (P.S, 'strings'), (P.L, 'lift'), (P.R, 'RESOLVE'), (P.E, 'end')):
        for (a, b) in (P1, P2):
            dr.line([(X(t), a), (X(t), b)], fill=(140, 110, 70), width=1)
        dr.text((X(t) + 3, P2[1] - 16), lab, fill=(230, 190, 120), font=fsm)
    short = {'land': 'L', 'stack': 's', 'page': 'pg', 'card': 'c', 'gather': 'G', 'book-land': 'B', 'rise': 'R',
             'found': 'f', 'send': 'SEND', 'slot': 'SLOT', 'end': 'END', 'open': 'open', 'office': 'O', 'tile': 't'}
    lastx = -99
    for e in P.events:
        t = float(e['t'])
        dr.line([(X(t), P1[0]), (X(t), P1[0] + 10)], fill=(200, 120, 90))
        dr.line([(X(t), P3[0]), (X(t), P3[0] + 8)], fill=(200, 120, 90))
        if X(t) - lastx > 16:
            dr.text((X(t) - 3, P1[0] - 16), short.get(e['kind'], e['kind'][:2]), fill=(220, 150, 110), font=fsm)
            lastx = X(t)
    for c in P.chords:
        dr.text((X(c['t0']) + 2, P3[0] + 10), c['sym'], fill=(250, 240, 220), font=fsm)
    img.save(path)


# =============================================================================================== main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--events', required=True)
    ap.add_argument('--duration', type=float, required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--mood', choices=sorted(MOODS), default='home')
    ap.add_argument('--world', type=float, default=None, help='when the story world (beat grid, motif) begins; default 6.0 s')
    ap.add_argument('--lufs', type=float, default=-14.0)
    ap.add_argument('--tp', type=float, default=-1.5, help='true-peak ceiling, dBTP')
    ap.add_argument('--png', default=None, help='write an analysis picture (waveform, loudness, spectrogram, cues)')
    ap.add_argument('--stems', default=None, help='also write the pre-master stems (music, sfx, room) into this folder')
    a = ap.parse_args()

    raw = json.load(open(a.events))
    events = raw['events'] if isinstance(raw, dict) else raw
    P = build_plan(events, a.duration, a.mood, a.world)
    print(f'form: world {P.W:.2f}s  beat {P.beat:.4f}s ({P.bpm:.2f} BPM, {P.nb} beats to the resolve)  pulse {P.Pt:.2f}s  '
          f'strings {P.S:.2f}s  lift {P.L:.2f}s  resolve {P.R:.2f}s  end {P.E:.2f}s')
    print('chords: ' + '  '.join(f"{c['sym']}@{c['t0']:.2f}" for c in P.chords))

    irs = dict(hall=make_ir(a.seed, 2.6, 3.4, 0.024, 8000), room=make_ir(a.seed + 1, 0.7, 1.0, 0.006, 6000, er=14))
    stems = render_music(P, a.seed, irs)
    music = sum(stems.values())
    sfx, room, log = render_sfx(P, music, a.seed, irs)
    music = fx(music, Pedalboard([LowShelfFilter(cutoff_frequency_hz=160, gain_db=0.5, q=0.7)]))
    y, mst = master(music + sfx + room, a.lufs, a.tp)
    if a.stems:
        from scipy.io import wavfile
        os.makedirs(a.stems, exist_ok=True)
        for name, x in dict(music=music, sfx=sfx, room=room, **stems).items():
            wavfile.write(os.path.join(a.stems, f'{name}.wav'), SR, (x * 10 ** (mst['gain_db'] / 20)).T.astype(np.float32))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or '.', exist_ok=True)
    try:
        from pedalboard.io import AudioFile
        with AudioFile(a.out, 'w', SR, 2, bit_depth=24) as f:
            f.write(y.astype(np.float32))
    except Exception:
        from scipy.io import wavfile
        wavfile.write(a.out, SR, y.T.astype(np.float32))

    # ------------------------------------------------------------------ report
    lu, tp = integrated_lufs(y), true_peak_db(y)
    pk = 20 * np.log10(np.max(np.abs(y)) + 1e-12)
    clip_n = int(np.sum(np.abs(y) >= 0.999))
    ff = ffmpeg_ebur128(a.out)
    st = short_term(y, 3.0)
    print(f'master: bus comp ~{mst["comp_gr"]:.1f} dB, make-up {mst["gain_db"]:+.1f} dB, limiter max GR {mst["limiter_max_gr"]:.1f} dB '
          f'({mst["limiter_pct_over_1db"]:.2f}% of samples > 1 dB)' + (' worst at ' + ', '.join(f'{t:.2f}s {v:.1f} dB' for t, v in mst['hot']) if mst['hot'] else ''))
    print(f'loudness (BS.1770 here): I {lu:.2f} LUFS  LRA {lra(y):.1f} LU  true peak {tp:.2f} dBTP  sample peak {pk:.2f} dBFS  '
          f'clipped samples {clip_n}')
    print(f'loudness (ffmpeg ebur128): I {ff.get("I")} LUFS  LRA {ff.get("LRA")} LU  true peak {ff.get("TP")} dBFS')
    head = 20 * np.log10(np.sqrt(np.mean(y[:, int(0.02 * SR):int(0.3 * SR)] ** 2)) + 1e-12)
    print(f'start: first 20-300 ms RMS {head:.1f} dBFS (room tone, not digital silence); last sample {np.max(np.abs(y[:, -1])):.2e}')
    ck = clicks(y)
    print(f'click detector: {len(ck)} suspicious samples' + (f' e.g. at {", ".join(f"{t:.3f}" for t in ck[:6])} s' if len(ck) else ''))
    secs = [(0, P.W, 'title'), (P.W, P.Pt, 'world'), (P.Pt, P.L, 'build'), (P.L, P.R, 'lift'), (P.R, P.E, 'resolve'),
            (P.E, P.dur, 'end/tail')]
    print('sections (mean short-term LUFS): ' + '  '.join(
        f'{n} {to_lufs(np.mean(10 ** ((st[int(s * SR):int(e * SR)] + 0.691) / 10))):.1f}' for s, e, n in secs if e > s))
    print('short-term every 2 s: ' + ' '.join(f'{st[min(len(st) - 1, int(t * SR))]:.0f}' for t in np.arange(1, P.dur, 2)))
    print('sfx levels (dB under the music around them): ' + ', '.join(
        f'{lab}@{t:.2f} {-rel:.0f}' for t, lab, _, rel in log))
    if a.png:
        draw_png(y, P, a.png, dict(I=ff.get('I') or lu, TP=ff.get('TP') or tp, LRA=ff.get('LRA') or lra(y), peak=pk, clipped=clip_n))
        print('png:', a.png)
    print('wrote', a.out)


if __name__ == '__main__':
    main()
