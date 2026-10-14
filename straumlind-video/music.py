"""Generates the Straumlind soundtrack: bright, lightly driving pad and pluck at 108 BPM, with sound cues placed on the exact
times things happen on screen (exported from the page as events.json by `node capture.mjs events:events.json`).
Usage: python3 music.py events.json out.wav
"""
import sys, wave, json
import numpy as np

EV = json.load(open(sys.argv[1]))
SR = 48000
DUR = float(EV['dur'])
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

def env_t(dur): n = int(dur * SR); return np.arange(n) / SR

BPM = 108; BEAT = 60 / BPM; BAR = 4 * BEAT
CHORDS = [
    [45, 52, 57, 61, 64, 71],   # A add9
    [42, 49, 54, 57, 61, 68],   # F#m9
    [38, 45, 50, 54, 57, 64],   # Dmaj7 add9
    [40, 47, 52, 56, 59, 66],   # E6/9
]
SCALE = [61, 64, 66, 69, 71, 73, 76, 78, 81, 83, 85]  # A major pentatonic-ish
SETS = EV['sets']; END = SETS['end']['a']
def chord_at(t): return CHORDS[0] if t > END + 0.5 else CHORDS[int(t // BAR) % 4]

def pad_voice(f, dur):
    tt = env_t(dur); s = np.zeros(len(tt))
    for det in (-0.1, 0.0, 0.11):
        ff = f * 2 ** (det / 12)
        s += np.sin(2 * np.pi * ff * tt + rng.uniform(0, 6.28)) + 0.22 * np.sin(2 * np.pi * 2 * ff * tt)
    att = np.clip(tt / 0.9, 0, 1); rel = np.clip((dur - tt) / 1.2, 0, 1)
    return s * att * rel

def pluck(f, dur=2.0, bright=1.0, decay=3.2):
    tt = env_t(dur)
    e = np.exp(-tt * decay) * np.clip(tt / 0.004, 0, 1)
    return (np.sin(2 * np.pi * f * tt) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
            + 0.12 * bright * np.sin(2 * np.pi * 3.01 * f * tt) * np.exp(-tt * 5)) * e

def sub(f, dur):
    tt = env_t(dur); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.6) * np.clip(tt / 0.02, 0, 1)

def thump():
    tt = env_t(0.45); f = 50 + 70 * np.exp(-tt * 34)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 10)

def tick(f):
    tt = env_t(0.12); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 60)

def bell(f, dur=2.0, bright=0.5):
    tt = env_t(dur)
    return (np.sin(2 * np.pi * f * tt) + bright * 0.5 * np.sin(2 * np.pi * 2.0 * f * tt) * np.exp(-tt * 4)
            + bright * 0.25 * np.sin(2 * np.pi * 3.0 * f * tt) * np.exp(-tt * 7)) * np.exp(-tt * 3) * np.clip(tt / 0.003, 0, 1)

def plip(f, up=True):
    tt = env_t(0.3)
    glide = f * (1 + (0.35 if up else -0.2) * np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(glide) / SR) * np.exp(-tt * 15) * np.clip(tt / 0.002, 0, 1)

def bloom(t_hit, notes, rise=0.55, tail=1.8, gain=0.09):
    """A tonal swell into each cut instead of a noise whoosh."""
    n = int((rise + tail) * SR); tt = np.arange(n) / SR
    e = np.where(tt < rise, np.clip(tt / rise, 0, 1) ** 2.4, np.exp(-np.clip(tt - rise, 0, None) * 2.8))
    s = np.zeros(n)
    for k, m in enumerate(notes):
        f = hz(m); s += (np.sin(2 * np.pi * f * tt + k) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) / len(notes)
    add(s * e, t_hit - rise, gain=gain)

nbars = int(np.ceil(DUR / BAR)) + 1
# bed: pad all the way, arpeggio from the first cut, a soft pulse while things are explained
for b in range(nbars):
    st = b * BAR; ch = chord_at(st + 0.01)
    for k, m in enumerate(ch[:5]):
        add(pad_voice(hz(m), BAR + 1.3), st - 0.2, pan=(-0.5 + k * 0.25), gain=0.028 if st < 4 else 0.032)
PATTERN = [0, 2, 4, 5, 3, 4, 2, 5]
step = BEAT / 2; i = 0; tt0 = 2.2
while tt0 < DUR - 3:
    ch = chord_at(tt0); m = ch[PATTERN[i % 8] % len(ch)] + 12
    dens_ok = tt0 > SETS['grid']['a'] - 0.2 or i % 2 == 0
    if dens_ok: add(pluck(hz(m), 1.6, 0.9), tt0, pan=(-0.35 if i % 2 else 0.35), gain=0.045 * (1.0 if i % 2 == 0 else 0.7))
    tt0 += step; i += 1
for b in range(nbars):
    st = b * BAR
    if st < SETS['grid']['a'] - 0.5 or st > DUR - 4: continue
    add(sub(hz(chord_at(st + 0.01)[0] - 12), BAR), st, gain=0.15)
tb = np.ceil(SETS['grid']['a'] / BEAT) * BEAT; n = 0
while tb < SETS['end']['a'] - 0.2:
    quiet = min(1, (tb - SETS['grid']['a']) / 2.5)
    add(thump(), tb, gain=0.10 * quiet)
    add(tick(hz(100)), tb + BEAT / 2, pan=0.4 if n % 2 else -0.4, gain=0.012 * quiet)
    tb += BEAT; n += 1

counts = {}
def nxt(k): counts[k] = counts.get(k, -1) + 1; return counts[k]
for e in EV['events']:
    k, t = e['k'], e['t']
    if k == 'cut':
        bloom(t, [m + 12 for m in chord_at(t + 0.1)[2:5]])
    elif k in ('rise', 'lines'):
        add(bell(hz(SCALE[5 + nxt(k) % 3] + 12), 1.8, 0.4), t, pan=0.2, gain=0.03)
    elif k == 'stat':
        add(bell(hz(81), 2.6, 0.7), t + 0.2, pan=-0.2, gain=0.06); add(bell(hz(88), 2.6, 0.7), t + 0.32, pan=0.2, gain=0.05)
    elif k in ('pill', 'pop', 'card'):
        add(plip(hz(SCALE[nxt(k) % 8] + 12)), t, pan=rng.uniform(-0.5, 0.5), gain=0.04)
    elif k == 'bill':
        add(pluck(hz(69), 2.0, 0.6), t, gain=0.06)
    elif k == 'split':
        add(bell(hz(76), 2.4, 0.6), t + 0.1, pan=0.3, gain=0.06); add(plip(hz(88)), t + 0.6, pan=0.3, gain=0.04)
    elif k == 'bar':
        add(pluck(hz(SCALE[nxt(k) % 5]), 1.2, 0.5, 4.5), t, pan=-0.3 + 0.15 * e.get('i', 0) % 0.6, gain=0.06)
    elif k == 'hero':
        add(bell(hz(85), 2.8, 0.8), t + 0.15, gain=0.07); add(sub(hz(33), 1.6), t + 0.1, gain=0.18)
    elif k == 'avg':
        add(plip(hz(76), False), t, gain=0.04)
    elif k == 'node':
        add(bell(hz(76), 3.0, 0.5), t, gain=0.05)
    elif k == 'buy':
        add(bell(hz(SCALE[3 + e['i']] + 12), 1.6, 0.6), t, pan=-0.4 + 0.16 * e['i'], gain=0.045)
    elif k == 'count':
        for j in range(8): add(tick(hz(SCALE[j % 6] + 24)), t + j * 0.28, pan=0.3 if j % 2 else -0.3, gain=0.02)
    elif k == 'save':
        add(bell(hz(81), 2.6, 0.7), t, gain=0.06); add(bell(hz(85), 2.6, 0.7), t + 0.12, gain=0.05); add(bell(hz(88), 2.6, 0.7), t + 0.24, gain=0.05)
    elif k == 'car':
        add(pluck(hz(57), 1.8, 0.4), t + 1.6, gain=0.05)
    elif k == 'plug':
        add(plip(hz(81)), t, gain=0.05); add(bell(hz(88), 1.8, 0.5), t + 0.5, gain=0.035)
    elif k == 'found':
        if rng.random() < 0.6: add(bell(hz(SCALE[rng.integers(3, 10)] + 12), 1.4, 0.4), t, pan=rng.uniform(-0.7, 0.7), gain=0.02)
    elif k == 'bolt':
        add(sub(hz(33), 2.0), t, gain=0.22); add(bell(hz(69), 3.5, 0.7), t, gain=0.07)
    elif k == 'end':
        for j, m in enumerate([81, 76, 73, 69]):
            add(pluck(hz(m), 3.0, 0.6), t + 0.2 + j * BEAT, pan=0.1, gain=0.06)

# ---------------- reverb + master ----------------
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
with wave.open(sys.argv[2] if len(sys.argv) > 2 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', DUR, len(EV['events']), 'cues')
