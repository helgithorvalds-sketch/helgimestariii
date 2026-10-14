"""Generates the SVIF soundtrack: calm, bright piano/pad at 96 BPM, with sound cues placed on the exact
times things happen on screen (exported from the page as events.json by `node capture.mjs events:events.json`).
Usage: python3 music.py events.json out.wav
"""
import sys, wave, json
import numpy as np

EV = json.load(open(sys.argv[1]))
SR = 48000
DUR = float(EV['dur'])
N = int(SR * DUR)
TL = EV['tl']
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

BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
CHORDS = [
    [50, 57, 62, 66, 69, 76],   # D
    [47, 54, 59, 62, 66, 73],   # Bm9
    [43, 50, 55, 59, 62, 69],   # Gmaj7 add9
    [45, 52, 57, 61, 64, 71],   # A6/9
]
def chord_at(t): return CHORDS[int(t // BAR) % 4]
SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]  # D major pentatonic-ish, for cue melodies

# ---------------- bed ----------------
def pad_voice(f, dur):
    tt = env_t(dur); s = np.zeros(len(tt))
    for det in (-0.12, 0.0, 0.13):
        ff = f * 2 ** (det / 12)
        s += np.sin(2 * np.pi * ff * tt + rng.uniform(0, 6.28)) + 0.25 * np.sin(2 * np.pi * 2 * ff * tt)
    att = np.clip(tt / 1.2, 0, 1); rel = np.clip((dur - tt) / 1.4, 0, 1)
    return s * att * rel * (0.85 + 0.15 * np.sin(2 * np.pi * 0.2 * tt))

def pluck(f, dur=2.4, bright=1.0, decay=2.6):
    tt = env_t(dur)
    e = np.exp(-tt * decay) * np.clip(tt / 0.004, 0, 1)
    s = (np.sin(2 * np.pi * f * tt) + 0.35 * bright * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
         + 0.12 * bright * np.sin(2 * np.pi * 3.01 * f * tt) * np.exp(-tt * 5))
    return s * e

nbars = int(np.ceil(DUR / BAR)) + 1
END = TL['end']
for b in range(nbars):
    st = b * BAR
    ch = CHORDS[0] if st > END + 1 else CHORDS[b % 4]
    g = 0.030 if st < 6 else 0.036
    for k, m in enumerate(ch[:5]):
        add(pad_voice(hz(m), BAR + 1.6), st - 0.3, pan=(-0.5 + k * 0.25), gain=g)

PATTERN = [0, 2, 4, 3, 5, 4, 2, 3]
for b in range(nbars):
    st = b * BAR
    if st < 5.6 or st > DUR - 4: continue
    ch = CHORDS[0] if st > END + 1 else CHORDS[b % 4]
    dens = 8 if 13 < st < END else 4
    step = 8 // dens
    for i in range(dens):
        m = ch[PATTERN[(i * step) % 8] % len(ch)] + 12
        add(pluck(hz(m), bright=0.9), st + i * step * BEAT / 2, pan=(-0.35 if i % 2 else 0.35), gain=0.05 * (1.0 if i % 2 == 0 else 0.75))

def sub(f, dur):
    tt = env_t(dur); return np.sin(2 * np.pi * f * tt) * np.exp(-tt * 1.1) * np.clip(tt / 0.02, 0, 1)
for b in range(nbars):
    st = b * BAR
    if st < 13 or st > DUR - 3: continue
    add(sub(hz((CHORDS[0] if st > END + 1 else CHORDS[b % 4])[0] - 12), BAR), st, gain=0.16)

# soft heartbeat under the system and the delivery
def thump():
    tt = env_t(0.5); f = 55 + 60 * np.exp(-tt * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
tb = np.ceil(TL['nodeIn'] / BEAT) * BEAT; beat = 0
while tb < TL['vanB'] + 2:
    fade = min(1, (tb - TL['nodeIn']) / 3) * min(1, (TL['vanB'] + 2 - tb) / 2.5)
    if beat % 2 == 0: add(thump(), tb, gain=0.11 * fade)
    tb += BEAT; beat += 1

# ---------------- cues ----------------
def bell(f, dur=2.2, bright=0.5):
    tt = env_t(dur)
    return (np.sin(2 * np.pi * f * tt) + bright * 0.5 * np.sin(2 * np.pi * 2.0 * f * tt) * np.exp(-tt * 4)
            + bright * 0.25 * np.sin(2 * np.pi * 3.0 * f * tt) * np.exp(-tt * 7)) * np.exp(-tt * 2.8) * np.clip(tt / 0.003, 0, 1)

def bloom(t_hit, notes, rise=0.9, tail=2.2):
    """A soft tonal swell that rises into the cut and blooms: replaces the noise whooshes."""
    n = int((rise + tail) * SR); tt = np.arange(n) / SR
    up = np.clip(tt / rise, 0, 1) ** 2.4; down = np.exp(-np.clip(tt - rise, 0, None) * 2.6)
    e = np.where(tt < rise, up, down)
    s = np.zeros(n)
    for k, m in enumerate(notes):
        f = hz(m)
        s += (np.sin(2 * np.pi * f * tt + k) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) / len(notes)
    s *= e * (0.9 + 0.1 * np.sin(2 * np.pi * 5 * tt))
    add(s, t_hit - rise, pan=0.0, gain=0.11)
    add(bell(hz(notes[-1] + 12), 2.0, 0.4), t_hit, pan=0.15, gain=0.035)

def plip(f, up=True):
    """Short, round, satisfying drop: a sine with a quick pitch glide."""
    tt = env_t(0.35)
    glide = f * (1 + (0.35 if up else -0.2) * np.exp(-tt * 40))
    return np.sin(2 * np.pi * np.cumsum(glide) / SR) * np.exp(-tt * 14) * np.clip(tt / 0.002, 0, 1)

def knock(f):
    tt = env_t(0.6)
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 3.9 * f * tt) * np.exp(-tt * 30)) * np.exp(-tt * 9) * np.clip(tt / 0.002, 0, 1)

pill_i = absorb_i = found_i = drop_i = 0
for e in EV['events']:
    k, t = e['k'], e['t']
    if k == 'selt':
        add(bell(hz(81)), t, pan=0.2, gain=0.05)
    elif k == 'pill':        # tasks appearing: light, quiet ticks walking up the scale
        add(plip(hz(SCALE[pill_i % 6] + 12)), t, pan=rng.uniform(-0.5, 0.5), gain=0.035); pill_i += 1
    elif k == 'absorb':      # each task landing in the book: a round pluck, ascending
        m = SCALE[min(absorb_i, len(SCALE) - 1)]
        add(pluck(hz(m), 1.4, 0.5, 4.5), t, pan=0.1, gain=0.06); add(plip(hz(m + 12), True), t, pan=0.1, gain=0.03); absorb_i += 1
    elif k in ('open',):     # book opens: warm chord bloom
        bloom(t, [62, 66, 69, 74], rise=0.6, tail=2.4)
    elif k == 'offer':       # offer card lights up
        add(bell(hz(86), 2.4, 0.6), t, pan=-0.2, gain=0.05); add(bell(hz(90), 2.4, 0.6), t + 0.09, pan=0.2, gain=0.04)
    elif k == 'found':       # a home lights up blue
        add(bell(hz(SCALE[3 + found_i % 7] + 12), 1.8, 0.5), t, pan=rng.uniform(-0.6, 0.6), gain=0.03); found_i += 1
    elif k == 'drop':        # a book lands at a home
        add(knock(hz(SCALE[drop_i % 5] - 12)), t, pan=rng.uniform(-0.3, 0.3), gain=0.09); drop_i += 1
    elif k == 'tile':        # categories light up one by one
        add(bell(hz(SCALE[2 + e['i']] + 12), 1.8, 0.55), t, pan=-0.3 + 0.08 * e['i'], gain=0.045)
    elif k == 'fin':
        if rng.random() < 0.5: add(bell(hz(SCALE[rng.integers(4, 10)] + 12), 1.6, 0.4), t, pan=rng.uniform(-0.7, 0.7), gain=0.016)

# scene transitions: tonal blooms instead of noise
for t, notes in [(5.9, [57, 62, 66]), (TL['bookIn'], [62, 66, 69]), (TL['rise'] + 1.8, [59, 62, 66, 71]),
                 (TL['vanA'], [55, 59, 62, 66]), (TL['bookUp'] + 1.0, [57, 61, 64, 69]), (TL['back'] + 1.2, [62, 66, 69, 74])]:
    bloom(t, notes)
add(bell(hz(74), 3.5, 0.5), TL['nodeIn'], gain=0.05); add(sub(hz(38), 2.0), TL['nodeIn'], gain=0.2)
for i, m in enumerate([81, 78, 76, 74, 69]):
    add(pluck(hz(m), 3.0, 0.6), END + 0.3 + i * BEAT, pan=0.1, gain=0.06)

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
