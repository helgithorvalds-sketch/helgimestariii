"""Generates a royalty-free background track (music.wav) synced to the video timeline.

Soft pad chords + plucked arpeggio at 96 BPM, with a short whoosh on each scene change.
Usage: python3 music.py
"""
import wave
import numpy as np

SR = 44100
DUR = 41.0
BPM = 96
BEAT = 60 / BPM
SCENE_CUTS = [4.4, 10.4, 15.4, 22.8, 25.8, 32.2, 37.2]   # matches S{} in index.html

t = np.arange(int(SR * DUR)) / SR
out = np.zeros((len(t), 2))
rng = np.random.default_rng(7)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# Fmaj7 – Am7 – Dm7 – Bbmaj7 … then lifts to C on the solution reveal
CHORDS = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65], [46, 53, 57, 62]]
BAR = BEAT * 4


def chord_at(time):
    if time >= 22.8:       # brighter progression for the solution half
        prog = [[48, 55, 60, 64], [53, 57, 60, 64], [45, 52, 57, 60], [55, 59, 62, 67]]
        return prog[int((time - 22.8) / BAR) % 4]
    return CHORDS[int(time / BAR) % 4]


# Pad: detuned sines per chord bar, with crossfades
pad_bars = [(b, min(b + BAR, 22.8)) for b in np.arange(0, 22.8, BAR)] + \
           [(b, b + BAR) for b in np.arange(22.8, DUR, BAR)]
for b0, b1 in pad_bars:
    notes = chord_at(b0 + 0.01)
    i0, i1 = int(b0 * SR), min(len(t), int((b1 + 0.6) * SR))
    seg = t[i0:i1] - b0
    env = np.minimum(1, seg / 0.6) * np.clip((b1 + 0.6 - b0 - seg) / 0.6, 0, 1)
    for k, n in enumerate(notes):
        f = midi(n)
        for det, pan in ((-0.12, 0.3), (0.12, 0.7)):
            w = np.sin(2 * np.pi * (f + det) * seg) + 0.25 * np.sin(2 * np.pi * 2 * (f + det) * seg)
            out[i0:i1, 0] += 0.022 * env * w * (1 - pan)
            out[i0:i1, 1] += 0.022 * env * w * pan

# Bass on each bar
for b0 in np.arange(0, DUR, BAR):
    n = chord_at(b0 + 0.01)[0] - 12
    i0, i1 = int(b0 * SR), min(len(t), int((b0 + BAR) * SR))
    seg = t[i0:i1] - b0
    env = np.exp(-seg * 1.2) * np.minimum(1, seg / 0.02)
    w = np.sin(2 * np.pi * midi(n) * seg)
    out[i0:i1] += 0.09 * (env * w)[:, None]

# Pluck arpeggio in 8ths, enters at 4.4s (problem), gets busier after the reveal
step = BEAT / 2
for k, s0 in enumerate(np.arange(4.4, DUR - 1.0, step)):
    if s0 < 22.8 and k % 2:
        continue
    notes = chord_at(s0)
    n = notes[(k // (1 if s0 >= 22.8 else 2)) % 4] + 12
    i0, i1 = int(s0 * SR), min(len(t), int((s0 + 0.9) * SR))
    seg = t[i0:i1] - s0
    env = np.exp(-seg * 6) * np.minimum(1, seg / 0.004)
    w = np.sin(2 * np.pi * midi(n) * seg) + 0.3 * np.sin(2 * np.pi * 3 * midi(n) * seg) * np.exp(-seg * 12)
    pan = 0.35 + 0.3 * ((k % 4) / 3)
    out[i0:i1, 0] += 0.05 * env * w * (1 - pan)
    out[i0:i1, 1] += 0.05 * env * w * pan

# Soft kick on beats from the reveal onward
for s0 in np.arange(22.8, DUR - 1.5, BEAT):
    i0, i1 = int(s0 * SR), min(len(t), int((s0 + 0.35) * SR))
    seg = t[i0:i1] - s0
    f = 50 + 70 * np.exp(-seg * 30)
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-seg * 9)
    out[i0:i1] += 0.11 * w[:, None]

# Whoosh (filtered noise swell) leading into each scene cut
for c in SCENE_CUTS:
    i0, i1 = int((c - 0.6) * SR), int((c + 0.25) * SR)
    seg = (t[i0:i1] - (c - 0.6)) / 0.85
    noise = rng.standard_normal((i1 - i0, 2))
    a = 0.02 + 0.25 * seg                      # one-pole low-pass opening up
    y = np.zeros_like(noise)
    acc = np.zeros(2)
    for i in range(len(noise)):
        acc += a[i] * (noise[i] - acc)
        y[i] = acc
    env = np.sin(np.pi * seg) ** 2
    out[i0:i1] += 0.10 * y * env[:, None]

# Master: fade in/out, normalise, soft clip
fade = np.minimum(1, t / 1.0) * np.clip((DUR - t) / 2.5, 0, 1)
out *= fade[:, None]
out = np.tanh(out / np.max(np.abs(out)) * 1.2) * 0.8

with wave.open('music.wav', 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((out * 32767).astype('<i2').tobytes())
print('wrote music.wav', DUR, 's')
