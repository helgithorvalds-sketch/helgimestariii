"""Original 110 BPM soundtrack + sound effects synced to the animation's events.
python3 audio.py events.json out.wav
"""
import json, sys, wave
import numpy as np

SR = 44100
BPM = 110
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(3)

ev = json.load(open(sys.argv[1]))
DUR = ev["duration"]
N = int((DUR + 2.5) * SR)


def T(d):
    return np.arange(int(d * SR)) / SR


def add(buf, x, t, gain=1.0):
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]
        i = 0
    j = min(len(buf), i + len(x))
    if j > i:
        buf[i:j] += x[: j - i] * gain


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def band(x, lo, hi):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(X, len(x))


def tilt(x, lo, hi):
    """Soft band shaping (gentler than a brick wall)."""
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR) + 1
    g = 1 / (1 + (lo / fr) ** 4) / (1 + (fr / hi) ** 2)
    return np.fft.irfft(X * g, len(x))


# ---------------------------------------------------------------- music
# F maj9 | D m9 | Bb maj9 | C add9   (I vi IV V)
CHORDS = [
    (53, [57, 60, 64, 67]),  # F: A C E G
    (50, [57, 60, 62, 65]),  # Dm: A C D F
    (46, [57, 58, 62, 65]),  # Bb: A Bb D F
    (48, [55, 60, 62, 64]),  # C: G C D E
]
ARP = [  # pluck notes per chord (octave up), 8 eighths
    [69, 72, 76, 79, 81, 79, 76, 72],
    [69, 72, 74, 77, 81, 77, 74, 72],
    [70, 74, 77, 81, 82, 81, 77, 74],
    [67, 72, 74, 76, 79, 76, 74, 72],
]

_pad_cache = {}


def pad_note(m, dur):
    key = (m, round(dur, 3))
    if key in _pad_cache:
        return _pad_cache[key]
    f = midi(m)
    tt = T(dur + 0.9)
    x = np.zeros_like(tt)
    for det in (-0.0045, 0.0, 0.0048):
        ff = f * (1 + det)
        ph = rng.random() * 6.28
        for k in range(1, 10):
            if ff * k > 7000:
                break
            x += np.sin(2 * np.pi * ff * k * tt + ph * k) / (k ** 1.7)
    a = np.clip(tt / 0.45, 0, 1)
    r = np.clip((dur + 0.9 - tt) / 0.9, 0, 1)
    x = x * a * r * (1 + 0.08 * np.sin(2 * np.pi * 0.25 * tt))
    _pad_cache[key] = x
    return x


def pluck(m):
    f = midi(m)
    tt = T(0.7)
    x = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / 0.05)
         + 0.15 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.03)) * np.exp(-tt / 0.17)
    x[:48] *= np.linspace(0, 1, 48)
    return x


def bass_note(m, dur=0.42):
    f = midi(m)
    tt = T(dur)
    x = np.tanh(1.8 * np.sin(2 * np.pi * f * tt)) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)
    env = np.minimum(1, tt / 0.008) * np.exp(-tt / (dur * 0.55))
    return x * env


def kick():
    tt = T(0.45)
    f = 48 + 110 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt / 0.22)
    x[:200] += band(rng.standard_normal(200), 2000, 8000) * np.linspace(0.5, 0, 200)
    return x


def clap():
    tt = T(0.32)
    n = tilt(rng.standard_normal(len(tt)), 900, 3500)
    env = np.zeros_like(tt)
    for o in (0, 0.011, 0.022):
        env += np.where(tt >= o, np.exp(-(tt - o) / 0.008), 0) * 0.6
    env += np.where(tt >= 0.03, np.exp(-(tt - 0.03) / 0.09), 0)
    return n * env / np.max(np.abs(n))


def hat(open_=False):
    tt = T(0.3 if open_ else 0.08)
    n = band(rng.standard_normal(len(tt)), 6500, 16000)
    return n * np.exp(-tt / (0.12 if open_ else 0.022)) / np.max(np.abs(n))


def crash():
    tt = T(2.2)
    n = tilt(rng.standard_normal(len(tt)), 3000, 12000)
    return n * np.exp(-tt / 0.7) / np.max(np.abs(n))


K, CL, HC, HO, CR = kick(), clap(), hat(), hat(True), crash()

pad = np.zeros(N); pl = np.zeros(N); bass = np.zeros(N); drums = np.zeros(N)
kicks = []
NBARS = int(np.ceil(DUR / BAR))
MU = ev.get("music", {"drumsFrom": 4, "cards": [8, 18, 30, 50], "brk": [50, 51], "light": [52, 72], "outro": 78})
CARDS = set()
for c in MU["cards"]:
    CARDS.update((c, c + 1))


def section(bar):
    if bar < MU["drumsFrom"]: return "intro"
    if bar >= MU["outro"]: return "outro"
    if bar in MU["brk"]: return "break"
    if MU["light"][0] <= bar < MU["light"][1]: return "light"
    if bar in CARDS: return "card"
    return "full"


for bar in range(NBARS + 1):
    t0 = bar * BAR
    if t0 > DUR + 0.5:
        break
    root, notes = CHORDS[bar % 4]
    sec = section(bar)
    # pad always (fades at end)
    for m in notes:
        add(pad, pad_note(m, BAR), t0, 0.055)
    add(pad, pad_note(root - 12, BAR), t0, 0.05)
    # arp
    if sec != "break":
        for i, m in enumerate(ARP[bar % 4]):
            if sec in ("intro", "outro") and i % 2:
                continue
            add(pl, pluck(m + (12 if (sec == "full" and bar % 8 >= 4 and i % 4 == 3) else 0)), t0 + i * BEAT / 2, 0.11 if sec != "light" else 0.09)
    # bass: offbeat eighths + root on 1
    if sec in ("full", "light", "card"):
        add(bass, bass_note(root - 12, 0.5), t0, 0.32)
        for b in range(4):
            add(bass, bass_note(root - 12 + (12 if b == 3 and bar % 2 else 0), 0.3), t0 + b * BEAT + BEAT / 2, 0.24)
    # drums
    if sec in ("full", "card"):
        for b in range(4):
            add(drums, K, t0 + b * BEAT, 0.85); kicks.append(t0 + b * BEAT)
            add(drums, HC, t0 + b * BEAT + BEAT / 2, 0.16)
            add(drums, HC, t0 + b * BEAT + BEAT / 4 * 3, 0.06)
        for b in (1, 3):
            add(drums, CL, t0 + b * BEAT, 0.33)
        if bar % 2 == 1:
            add(drums, HO, t0 + 3 * BEAT + BEAT / 2, 0.12)
    elif sec == "light":
        for b in (0, 2):
            add(drums, K, t0 + b * BEAT, 0.7); kicks.append(t0 + b * BEAT)
        for b in range(4):
            add(drums, HC, t0 + b * BEAT + BEAT / 2, 0.13)
        add(drums, CL, t0 + 3 * BEAT, 0.16)
    if bar == MU['drumsFrom'] or (bar - 2) in MU['cards'] or bar == MU['light'][1]:
        add(drums, CR, t0, 0.22)

# intro riser into bar 4
rt = T(BAR)
riser = tilt(rng.standard_normal(len(rt)), 500, 9000) * (rt / BAR) ** 2.2
add(drums, riser / np.max(np.abs(riser)), (MU['drumsFrom'] - 1) * BAR, 0.12)

# sidechain on music
sc = np.ones(N)
for k in kicks:
    i = int(k * SR); L = int(0.28 * SR)
    seg = 1 - 0.55 * np.exp(-np.arange(L) / SR / 0.09)
    j = min(N, i + L)
    sc[i:j] = np.minimum(sc[i:j], seg[: j - i])

# delay on plucks (dotted eighth)
dl = np.copy(pl)
d = int(BEAT * 0.75 * SR)
for r, g in ((1, 0.32), (2, 0.14), (3, 0.06)):
    dl[d * r:] += pl[: N - d * r] * g

music_dry = pad * sc + dl * sc * 0.9 + bass * sc + drums
# reverb (FFT convolution) on pad + plucks
irt = T(2.4)
ir = rng.standard_normal(len(irt)) * np.exp(-irt / 0.55)
ir = tilt(ir, 200, 5000)
ir /= np.sqrt(np.sum(ir ** 2))
send = (pad * 0.7 + dl * 0.8) * sc
L = 1 << int(np.ceil(np.log2(N + len(ir))))
wetL = np.fft.irfft(np.fft.rfft(send, L) * np.fft.rfft(ir, L), L)[:N]
ir2 = np.roll(ir, int(0.013 * SR))
wetR = np.fft.irfft(np.fft.rfft(send, L) * np.fft.rfft(ir2, L), L)[:N]

musicL = music_dry + wetL * 0.35
musicR = music_dry + wetR * 0.35
# end fade
fade = np.ones(N)
fs, fe = int((DUR - BAR * 1.2) * SR), int((DUR + 1.5) * SR)
fade[fs:fe] = np.linspace(1, 0, fe - fs) ** 1.5
fade[fe:] = 0
mpk = max(np.max(np.abs(musicL)), np.max(np.abs(musicR)))
musicL *= fade * 0.42 / mpk
musicR *= fade * 0.42 / mpk

# ---------------------------------------------------------------- sfx
def s_pop(p=1.0):
    tt = T(0.16)
    f = (520 + 600 * np.exp(-tt / 0.018)) * p
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.045)
    x[:30] += rng.standard_normal(30) * 0.25
    return x


def s_whoosh(p=1.0):
    d = 0.75
    tt = T(d)
    lo = tilt(rng.standard_normal(len(tt)), 250 * p, 1800 * p)
    hi = tilt(rng.standard_normal(len(tt)), 1500 * p, 7000 * p)
    k = tt / d
    env = np.sin(np.pi * np.clip(k, 0, 1)) ** 1.6
    x = (lo * (1 - k) + hi * k) * env
    return x / np.max(np.abs(x))


def s_hit(p=1.0):
    tt = T(1.2)
    f = 45 + 60 * np.exp(-tt / 0.06)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.35)
    n = tilt(rng.standard_normal(len(tt)), 200, 4000) * np.exp(-tt / 0.08) * 0.3
    return (x + n) / 1.2


def s_tick(p=1.0):
    tt = T(0.04)
    return np.sin(2 * np.pi * 2300 * p * tt) * np.exp(-tt / 0.007)


def bell(f, d=0.9, tau=0.35):
    tt = T(d)
    x = np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.08) + 0.25 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.04)
    return x * np.exp(-tt / tau) * np.minimum(1, tt / 0.002)


def s_coin(p=1.0):
    x = np.zeros(int(0.9 * SR))
    add(x, bell(1568 * p, 0.8, 0.22), 0, 0.6)
    add(x, bell(2093 * p, 0.8, 0.3), 0.07, 0.6)
    return x


def s_win(p=1.0):
    x = np.zeros(int(1.6 * SR))
    for i, m in enumerate([72, 76, 79, 84]):
        add(x, bell(midi(m) * p, 1.2, 0.4), i * 0.075, 0.45)
    return x


def s_shine(p=1.0):
    x = np.zeros(int(1.2 * SR))
    for i in range(9):
        add(x, bell(2400 + rng.random() * 2600, 0.4, 0.09), rng.random() * 0.6, 0.18)
    return x


def s_paper(p=1.0):
    tt = T(0.18)
    n = tilt(rng.standard_normal(len(tt)), 1200 * p, 6000) * np.exp(-tt / 0.05)
    n *= 0.6 + 0.4 * (rng.random(len(tt)) > 0.6)
    return n / np.max(np.abs(n))


def s_swipe(p=1.0):
    tt = T(0.24)
    n = tilt(rng.standard_normal(len(tt)), 2000 * p, 9000) * np.sin(np.pi * tt / 0.24) ** 2
    return n / np.max(np.abs(n))


def s_ding(p=1.0):
    return bell(1318.5 * p, 1.4, 0.55)


def s_nope(p=1.0):
    x = np.zeros(int(0.45 * SR))
    for i, m in enumerate([76, 72]):
        tt = T(0.16)
        tone = np.tanh(2 * np.sin(2 * np.pi * midi(m) * tt)) * np.exp(-tt / 0.07)
        add(x, tone, i * 0.13, 0.5)
    return x


def s_unlock(p=1.0):
    x = np.zeros(int(0.8 * SR))
    add(x, s_tick(0.6), 0, 1.0)
    tt = T(0.5)
    f = 600 + 900 * tt
    add(x, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.15) * 0.5, 0.05)
    return x


SFX = {"pop": (s_pop, 0.32), "whoosh": (s_whoosh, 0.3), "hit": (s_hit, 0.5), "tick": (s_tick, 0.09), "coin": (s_coin, 0.4),
       "win": (s_win, 0.38), "shine": (s_shine, 0.3), "paper": (s_paper, 0.22), "swipe": (s_swipe, 0.14), "ding": (s_ding, 0.38),
       "nope": (s_nope, 0.3), "unlock": (s_unlock, 0.4)}
sfx = np.zeros(N)
cache = {}
for e in ev["events"]:
    fn, g = SFX.get(e["type"], (None, 0))
    if fn is None:
        print("unknown sfx", e["type"]); continue
    p = round(float(e.get("pitch", 1)), 3)
    key = (e["type"], p)
    if key not in cache:
        cache[key] = fn(p)
    add(sfx, cache[key], e["t"], g * float(e.get("gain", 1)))

outL = musicL + sfx * 0.9
outR = musicR + sfx * 0.9
outL = np.tanh(outL * 1.15) / np.tanh(1.15)
outR = np.tanh(outR * 1.15) / np.tanh(1.15)
pk = max(np.max(np.abs(outL)), np.max(np.abs(outR)))
outL *= 0.89 / pk; outR *= 0.89 / pk
st = np.stack([outL, outR], 1)
st = st[: int((DUR + 0.3) * SR)]
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st * 32767).astype(np.int16).tobytes())
print("wrote", sys.argv[2], "dur", len(st) / SR, "events", len(ev["events"]))
