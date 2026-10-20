#!/usr/bin/env python3
"""Level and spectrogram report for the mix (for checking a mix without listening)."""
import sys, os, json
import numpy as np
from scipy.io import wavfile
from scipy import signal
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(n):
    sr, x = wavfile.read(os.path.join(ROOT, 'audio', 'out', n))
    return sr, x.astype(np.float64) / 32768
sr, mix = load('mix.wav'); _, mus = load('music.wav'); _, sfx = load('sfx.wav')
def db(v): return 20 * np.log10(np.maximum(v, 1e-9))
for name, x in [('mix', mix), ('music', mus), ('sfx', sfx)]:
    m = x.mean(1)
    print(f'{name:6s} peak {db(np.abs(x).max()):6.1f} dBFS  rms {db(np.sqrt((m**2).mean())):6.1f} dBFS')
# windowed RMS (0.25 s) per section
W = int(sr * 0.25)
def env(x):
    m = x.mean(1)
    n = len(m) // W
    return db(np.sqrt((m[: n * W].reshape(n, W) ** 2).mean(1)))
em, es, ex = env(mus), env(sfx), env(mix)
meta = json.load(open(os.path.join(ROOT, 'out', 'meta.json')))
for s in meta['scenes']:
    if s['from'] >= 999: continue
    a, b = int(s['from'] / 0.25), int(s['to'] / 0.25)
    print(f"{s['id']:8s} {s['from']:5.1f}-{s['to']:5.1f}s  music {em[a:b].mean():6.1f}  sfx {es[a:b].max():6.1f} (max)  mix {ex[a:b].mean():6.1f}")
# picture: spectrogram + envelopes
f, t, S = signal.spectrogram(mix.mean(1), sr, nperseg=4096, noverlap=3072)
S = 10 * np.log10(S + 1e-12)
fmin, fmax = 30, 16000
H, Wd = 360, 1800
img = Image.new('RGB', (Wd, H + 200), (16, 8, 30))
logf = np.log10(np.clip(f, 1, None))
rows = np.linspace(np.log10(fmax), np.log10(fmin), H)
cols = np.linspace(0, t[-1], Wd)
ti = np.searchsorted(t, cols).clip(0, len(t) - 1)
fi = np.array([np.argmin(np.abs(logf - r)) for r in rows])
Z = S[fi][:, ti]
Z = np.clip((Z - (Z.max() - 80)) / 80, 0, 1)
rgb = (np.stack([Z ** 0.8 * 230, Z ** 1.6 * 160, Z ** 0.5 * 255], -1)).astype(np.uint8)
img.paste(Image.fromarray(rgb), (0, 0))
d = ImageDraw.Draw(img)
for name, e, col in [('music', em, (180, 140, 255)), ('sfx', es, (255, 200, 80)), ('mix', ex, (255, 255, 255))]:
    pts = [(i * Wd / len(e), H + 190 - (max(-60, v) + 60) * 3) for i, v in enumerate(e)]
    d.line(pts, fill=col, width=2)
for s in meta['scenes']:
    if s['from'] >= 999: continue
    x = s['from'] / t[-1] * Wd
    d.line([(x, 0), (x, H + 200)], fill=(255, 255, 255), width=1)
    d.text((x + 3, 3), s['id'], fill=(255, 255, 255))
img.save(os.path.join(ROOT, 'out', 'audio_report.png'))
print('wrote out/audio_report.png')
