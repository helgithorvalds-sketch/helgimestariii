"""Generates the SVIF soundtrack: calm, bright ambient piano/pad at 96 BPM, 64 s, synced to scene beats.
Usage: python3 music.py out.wav
"""
import sys, wave
import numpy as np

SR = 48000
DUR = 64.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
t_all = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i0 = int(start * SR)
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    if i0 >= N: return
    sig = sig[: N - i0] * gain
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    L[i0:i0 + len(sig)] += sig * l; R[i0:i0 + len(sig)] += sig * r

def onepole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    # vectorised one-pole via lfilter-like recursion in blocks
    y = np.empty_like(x); acc = 0.0
    for i in range(0, len(x), 4096):
        blk = x[i:i + 4096]
        out = np.empty_like(blk)
        for j, v in enumerate(blk):
            acc = (1 - a) * v + a * acc; out[j] = acc
        y[i:i + 4096] = out
    return y

BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
# D major: Dmaj9, Bm9, Gmaj7(#11-ish), A6sus -> warm, unresolved, optimistic
CHORDS = [
    [50, 57, 62, 66, 69, 76],   # D  (D A D F# A E)
    [47, 54, 59, 62, 66, 73],   # Bm9
    [43, 50, 55, 59, 62, 69],   # Gmaj7 add9
    [45, 52, 57, 61, 64, 71],   # A6/9
]

# ---- pad ----
def pad_voice(f, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    s = np.zeros(n)
    for det in (-0.12, 0.0, 0.13):
        ff = f * 2 ** (det / 12)
        s += np.sin(2 * np.pi * ff * tt + rng.uniform(0, 6.28)) + 0.25 * np.sin(2 * np.pi * 2 * ff * tt)
    att = np.clip(tt / 1.2, 0, 1); rel = np.clip((dur - tt) / 1.4, 0, 1)
    return s * att * rel * (0.85 + 0.15 * np.sin(2 * np.pi * 0.2 * tt))

nbars = int(np.ceil(DUR / BAR)) + 1
for b in range(nbars):
    st = b * BAR
    ch = CHORDS[b % 4]
    g = 0.030 if st < 6 else 0.036
    if st > 56: ch = CHORDS[0]
    for k, m in enumerate(ch[:5]):
        add(pad_voice(hz(m), BAR + 1.6), st - 0.3, pan=(-0.5 + k * 0.25), gain=g)

# ---- piano-ish arpeggio (enters with the house) ----
def pluck(f, dur=2.4, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = np.exp(-tt * 2.6) * np.clip(tt / 0.004, 0, 1)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
         + 0.12 * bright * np.sin(2 * np.pi * 3.01 * f * tt) * np.exp(-tt * 5))
    return s * env

PATTERN = [0, 2, 4, 3, 5, 4, 2, 3]  # indices into chord tones +12
for b in range(nbars):
    st = b * BAR
    if st < 5.6 or st > 60: continue
    ch = CHORDS[b % 4]
    dens = 8 if 13 < st < 54 else 4
    for i in range(dens):
        step = 8 // dens
        m = ch[PATTERN[(i * step) % 8] % len(ch)] + 12
        vel = 0.055 * (1.0 if i % 2 == 0 else 0.75)
        add(pluck(hz(m), bright=0.9), st + i * step * BEAT / 2, pan=(-0.35 if i % 2 else 0.35), gain=vel)

# ---- melody hint on the book reveal and ending ----
for st, notes in [(46.4, [74, 76, 78, 81]), (56.6, [81, 78, 76, 74, 69])]:
    for i, m in enumerate(notes):
        add(pluck(hz(m), 3.0, 0.6), st + i * BEAT, pan=0.1, gain=0.06)

# ---- sub bass ----
def sub(f, dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.1) * np.clip(tt / 0.02, 0, 1)
for b in range(nbars):
    st = b * BAR
    if st < 13 or st > 60.5: continue
    add(sub(hz(CHORDS[b % 4][0] - 12), BAR), st, gain=0.16)

# ---- soft pulse + shaker under system and delivery ----
def thump():
    n = int(0.5 * SR); tt = np.arange(n) / SR
    f = 55 + 60 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
def shaker():
    n = int(0.09 * SR); tt = np.arange(n) / SR
    x = rng.standard_normal(n); x = x - onepole(x, 3500)
    return x * np.exp(-tt * 55)
beat = 0
tb = 21.6
while tb < 54:
    fade = min(1, (tb - 21.6) / 3) * min(1, (54 - tb) / 2.5)
    if beat % 2 == 0: add(thump(), tb, gain=0.12 * fade)
    if tb > 29: add(shaker(), tb + BEAT / 2, pan=0.4, gain=0.05 * fade)
    tb += BEAT; beat += 1

# ---- whooshes on transitions ----
def whoosh(dur=1.8):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = rng.standard_normal(n)
    lo = onepole(x, 900); hi = onepole(x, 2600)
    band = hi - lo * 0.6
    env = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 2
    return band * env
for st in [5.6, 13.4, 19.6, 29.0, 43.0, 54.0]:
    add(whoosh(), st - 0.9, pan=rng.uniform(-0.3, 0.3), gain=0.10)

# ---- chimes as homes are found ----
def chime(f):
    n = int(2.0 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2.76 * f * tt) * np.exp(-tt * 6)) * np.exp(-tt * 3.2) * np.clip(tt / 0.002, 0, 1)
notes = [86, 90, 93, 88, 91, 86, 93, 90, 88, 95, 91, 86]
for k, m in enumerate(notes):
    add(chime(hz(m)), 23.5 + k * 0.33, pan=rng.uniform(-0.6, 0.6), gain=0.028)
add(chime(hz(81)), 7.45, pan=0.2, gain=0.04)  # "SELT"

# ---- reverb (FFT convolution with a decaying noise tail) ----
ir_n = int(2.8 * SR); it = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-it * 2.4); irR = rng.standard_normal(ir_n) * np.exp(-it * 2.4)
irL[0] = irR[0] = 0
def conv(x, ir):
    size = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
wetL = conv(L, irL); wetR = conv(R, irR)
wet_scale = 0.32 / (np.max(np.abs(wetL)) / max(1e-9, np.max(np.abs(L))) + 1e-9)
outL = L + wetL * wet_scale; outR = R + wetR * wet_scale

fade = np.clip(t_all / 1.5, 0, 1) * np.clip((DUR - t_all) / 3.0, 0, 1)
outL *= fade; outR *= fade
peak = max(np.max(np.abs(outL)), np.max(np.abs(outR)))
outL *= 0.85 / peak; outR *= 0.85 / peak
pcm = (np.stack([outL, outR], axis=1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', peak)
