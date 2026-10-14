"""Original ambient score for the 68 s film (synthesised, no samples).

Soft pads from the start, a pulse that builds from scene 5 (22 s),
a lift for the pull-back (55 s) and a resolving chime on the logo (62 s).
Usage: python3 scripts/music.py out/music.wav
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 68.0
N = int(SR * DUR)
t = np.arange(N) / SR


def env(a, b, fade_in=2.0, fade_out=2.0):
    e = np.clip((t - a) / fade_in, 0, 1) * np.clip((b - t) / fade_out, 0, 1)
    return e * e * (3 - 2 * e)


def note(f):
    return 440.0 * 2 ** ((f - 69) / 12)


def pad(midi_notes, a, b, amp, fi=3.0, fo=3.0, bright=0.3):
    out = np.zeros(N)
    for i, m in enumerate(midi_notes):
        f = note(m)
        for d in (-0.08, 0.0, 0.08):  # detuned voices
            ph = 2 * np.pi * f * (1 + d / 100) * t + i
            out += np.sin(ph) + bright * 0.5 * np.sin(2 * ph) + bright * 0.2 * np.sin(3 * ph)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t)
    return out * env(a, b, fi, fo) * amp * lfo / (len(midi_notes) * 3)


def pluck(f, start, amp, decay=0.9):
    out = np.zeros(N)
    s = int(start * SR)
    n = int(min(N - s, SR * 3))
    if n <= 0:
        return out
    tt = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)
    out[s : s + n] = tone * np.exp(-tt / decay) * (1 - np.exp(-tt * 300)) * amp
    return out


# Chord progression (D major colour): Dmaj9 – Bm11 – Gmaj7 – A6sus
chords = [
    [50, 57, 62, 64, 66, 69],
    [47, 54, 59, 62, 64, 69],
    [43, 50, 55, 59, 62, 66],
    [45, 52, 57, 59, 62, 66],
]
mix = np.zeros(N)
bar = 4.0  # seconds per chord (~60 bpm feel)
for k in range(int(DUR / bar) + 1):
    a = k * bar
    c = chords[k % 4]
    mix += pad(c, a - 0.5, a + bar + 1.5, 0.22, fi=1.6, fo=1.8, bright=0.25 if a < 22 else 0.4)

# Low drone.
mix += 0.12 * np.sin(2 * np.pi * note(38) * t) * env(0.5, 66.5, 4, 4)

# Pulse from scene 5 onward: arpeggiated plucks on 8ths (0.5 s).
arp_rng = np.random.default_rng(3)
for i in range(int(22 / 0.5), int(62 / 0.5)):
    st = i * 0.5
    c = chords[int(st // bar) % 4]
    m = c[2 + (i % 4)] + 12
    build = np.clip((st - 22) / 10, 0, 1) * (1.15 if 55 <= st < 62 else 1.0)
    mix += pluck(note(m), st, 0.09 * build * (1.0 if i % 2 == 0 else 0.7), decay=0.55)
    if i % 8 == 0 and st >= 28:
        mix += pluck(note(c[0]), st, 0.12 * build, decay=1.4)

# Soft "camera shutter" ticks for the 7 m photo dots (scene 6).
for st in np.arange(28.4, 31.0, 0.5):
    s = int(st * SR)
    n = int(0.03 * SR)
    mix[s : s + n] += arp_rng.normal(0, 1, n) * np.exp(-np.arange(n) / (0.004 * SR)) * 0.05

# Riser into the pull-back, and resolving chime on the logo.
rise = np.clip((t - 52) / 3.0, 0, 1) * np.clip((55.4 - t) / 0.4, 0, 1)
noise = np.random.default_rng(1).normal(0, 1, N)
noise = np.convolve(noise, np.ones(40) / 40, mode="same")
mix += noise * rise ** 2 * 0.08
for m, d in [(62, 0), (69, 0.08), (74, 0.16), (78, 0.24)]:
    mix += pluck(note(m), 62.3 + d, 0.13, decay=2.4)
mix += pad([50, 57, 62, 66, 69], 61.5, 68.0, 0.28, fi=1.0, fo=3.5, bright=0.2)

# Simple stereo reverb (feedback delays) and master fade.
def reverb(x, delays, fb):
    y = x.copy()
    for d in delays:
        n = int(d * SR)
        buf = np.zeros_like(x)
        buf[n:] = x[:-n]
        for _ in range(3):
            buf[n:] += buf[:-n] * fb
        y += buf * 0.18
    return y

left = reverb(mix, [0.031, 0.067, 0.113], 0.35)
right = reverb(mix, [0.037, 0.073, 0.127], 0.35)
master = env(0, DUR, 1.5, 2.5)
st = np.stack([left * master, right * master], axis=1)
st /= np.max(np.abs(st)) / 0.8
pcm = (st * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", sys.argv[1])
