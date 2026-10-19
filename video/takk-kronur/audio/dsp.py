"""Small synthesis toolkit: oscillators, envelopes, filters, drums, FM bells. Everything is deterministic."""
import numpy as np
from scipy import signal

SR = 48000


def secs(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def rng(seed):
    return np.random.default_rng(seed)


# ---------------- oscillators ----------------
def saw(freq, n, phase0=0.0):
    """PolyBLEP band-limited saw, freq may be a scalar or an array."""
    dt = np.broadcast_to(np.asarray(freq, dtype=np.float64) / SR, (n,))
    ph = (phase0 + np.cumsum(dt) - dt[0]) % 1.0
    y = 2.0 * ph - 1.0
    m1 = ph < dt
    t1 = ph[m1] / dt[m1]
    y[m1] -= t1 + t1 - t1 * t1 - 1.0
    m2 = ph > 1.0 - dt
    t2 = (ph[m2] - 1.0) / dt[m2]
    y[m2] -= t2 * t2 + t2 + t2 + 1.0
    return y


def sine(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    return np.sin(2 * np.pi * (np.cumsum(f) / SR) + phase0)


def tri(freq, n):
    return 2 * np.abs(saw(freq, n)) - 1


def noise(n, seed=0):
    return rng(seed).uniform(-1, 1, n)


# ---------------- envelopes ----------------
def adsr(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    """Linear ADSR. hold = time the release starts (defaults to the end minus r)."""
    t = secs(n)
    hold = (n / SR - r) if hold is None else hold
    pre = np.interp(t, [0, a, a + d, 1e9], [0, 1, s, s])
    lvl = float(np.interp(hold, [0, a, a + d, 1e9], [0, 1, s, s]))
    rel = np.clip(1 - (t - hold) / max(r, 1e-6), 0, 1) * lvl
    return np.where(t < hold, pre, rel)


def expdec(n, tau, attack=0.002):
    t = secs(n)
    return np.exp(-t / tau) * (1 - np.exp(-t / max(attack, 1e-5)))


# ---------------- filters ----------------
def lpf(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def hpf(x, fc, order=2):
    sos = signal.butter(order, max(fc, 10), 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def bpf(x, lo, hi, order=2):
    sos = signal.butter(order, [max(lo, 10), min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def sweep_bpf(x, f0, f1, q=1.2, block=256, curve='exp'):
    """Band-pass whose centre moves from f0 to f1 over the signal (block-wise, state carried)."""
    n = len(x)
    out = np.zeros(n)
    zi = None
    nb = max(1, n // block + 1)
    for i in range(nb):
        s, e = i * block, min(n, (i + 1) * block)
        if s >= e:
            break
        p = s / max(1, n - 1)
        fc = f0 * (f1 / f0) ** p if curve == 'exp' else f0 + (f1 - f0) * p
        bw = fc / q
        lo, hi = max(20, fc - bw / 2), min(SR * 0.45, fc + bw / 2)
        sos = signal.butter(2, [lo, hi], 'band', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s:e], zi = signal.sosfilt(sos, x[s:e], zi=zi)
    return out


def sweep_lpf(x, f0, f1, block=256):
    n = len(x)
    out = np.zeros(n)
    zi = None
    for i in range(n // block + 1):
        s, e = i * block, min(n, (i + 1) * block)
        if s >= e:
            break
        p = s / max(1, n - 1)
        fc = f0 * (f1 / f0) ** p
        sos = signal.butter(2, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[s:e], zi = signal.sosfilt(sos, x[s:e], zi=zi)
    return out


def soft(x, drive=1.5):
    return np.tanh(drive * x) / np.tanh(drive)


# ---------------- stereo helpers ----------------
def pan(x, p=0.0):
    """Equal-power pan, p in -1..1. Returns (2, n)."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)])


def place(buf, x, t, gain=1.0):
    """Mix a (2, n) or (n,) clip into a (2, N) buffer at time t (seconds)."""
    if x.ndim == 1:
        x = np.stack([x, x]) * 0.7071
    i = int(round(t * SR))
    if i >= buf.shape[1]:
        return
    if i < 0:
        x = x[:, -i:]
        i = 0
    n = min(x.shape[1], buf.shape[1] - i)
    buf[:, i:i + n] += x[:, :n] * gain


def widen(x, ms=11.0, mix=0.5):
    """Haas-style widening of a mono signal into stereo."""
    d = int(SR * ms / 1000)
    r = np.concatenate([np.zeros(d), x])[: len(x)]
    return np.stack([x, x * (1 - mix) + r * mix])


# ---------------- instruments ----------------
def kick(tau=0.21, punch=120.0, base=50.0, click=0.3, seed=1):
    n = int(SR * 0.6)
    t = secs(n)
    f = base + punch * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * (1 - np.exp(-t / 0.0015))
    c = hpf(noise(n, seed), 2500) * np.exp(-t / 0.003) * click
    return soft(body * 1.1 + c, 1.8)


def clap(seed=2):
    n = int(SR * 0.5)
    t = secs(n)
    x = np.zeros(n)
    nz = noise(n, seed)
    for k, d in enumerate([0.0, 0.009, 0.018, 0.028]):
        i = int(d * SR)
        tau = 0.006 if k < 3 else 0.11
        seg = nz[: n - i] * np.exp(-secs(n - i) / tau)
        x[i:] += seg * (0.8 if k < 3 else 1.0)
    return bpf(x, 900, 4200) * 1.5


def snare(seed=3):
    n = int(SR * 0.35)
    t = secs(n)
    body = np.sin(2 * np.pi * np.cumsum(185 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.06)
    nz = bpf(noise(n, seed), 1500, 9000) * np.exp(-t / 0.11)
    return body * 0.6 + nz * 0.9


def hat(open_=False, seed=4):
    n = int(SR * (0.7 if open_ else 0.12))
    t = secs(n)
    # 808-style metallic cluster + noise
    freqs = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]
    m = sum(np.sign(np.sin(2 * np.pi * f * 1.6 * t)) for f in freqs)
    x = bpf(m * 0.2 + noise(n, seed) * 0.8, 7000, 15000)
    return x * np.exp(-t / (0.22 if open_ else 0.032))


def crash(seed=5, dur=2.2):
    n = int(SR * dur)
    t = secs(n)
    freqs = [311.1, 437.8, 562.4, 712.3, 901.7, 1123.0]
    m = sum(np.sign(np.sin(2 * np.pi * f * 2.1 * t)) for f in freqs)
    x = hpf(m * 0.15 + noise(n, seed), 3500) * np.exp(-t / 0.75)
    return x * 0.6


def fm_bell(freq, dur=1.2, ratio=3.5, index=2.4, tau=0.55, itau=0.18):
    n = int(SR * dur)
    t = secs(n)
    mod = np.sin(2 * np.pi * freq * ratio * t) * index * np.exp(-t / itau)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / tau) * (1 - np.exp(-t / 0.002))


def pluck(freq, dur, cutoff=2400.0, detune=0.08, tau=0.16, seed=0, bright=2.5):
    """Detuned-saw pluck with a brightness envelope."""
    n = int(SR * dur)
    x = np.zeros(n)
    for k, c in enumerate((-detune, 0.0, detune)):
        x += saw(freq * 2 ** (c / 12), n, phase0=(k * 0.33 + seed * 0.17) % 1)
    x /= 3
    env = expdec(n, tau, 0.003)
    dark = lpf(x, cutoff)
    lit = lpf(x, min(cutoff * bright, 16000))
    e2 = np.exp(-secs(n) / (tau * 0.35))
    return (dark * (1 - e2) + lit * e2) * env


def pad_voice(freq, n, cutoff=1400.0, voices=5, spread=0.14, seed=0):
    x = np.zeros(n)
    for k in range(voices):
        c = spread * (k / (voices - 1) - 0.5) * 2
        x += saw(freq * 2 ** (c / 12), n, phase0=(k * 0.37 + seed * 0.11) % 1)
    return lpf(x / voices, cutoff, 2)
