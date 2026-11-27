# Soundtrack for "Sápan í Geysi": narration + music (ducked under the voice, comedic drop-out before the BÚMM)
# + sound effects pinned to picture frames (each sample's measured energy peak lands on its frame), mastered to
# -14 LUFS / -1 dBTP (short-form standard). Sample-exact offline mix (numpy), independent of render retries.
# Usage: python3 audio/mix.py  -> public/audio/mix.wav (+ out/mix-nomusic.wav)
import json, subprocess, os
import numpy as np

SR, FPS, TOTAL = 48000, 30, 2000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

N = int(TOTAL / FPS * SR) + SR // 2
db = lambda d: 10 ** (d / 20)
fr = lambda f: int(round(f / FPS * SR))

# measured energy peaks (seconds) from the Freesound manifests (promo + this project)
peaks = {}
for m in [P("public/audio/sfx/audio-manifest.json"), os.path.join(ROOT, "..", "promo-video", "public/audio/sfx/audio-manifest.json")]:
    if os.path.exists(m):
        for a in json.load(open(m))["assets"]:
            an = (a.get("analysis") or {})
            an = an.get("audio", an)
            if an.get("energy_peak_seconds") is not None: peaks[a["file"]] = an["energy_peak_seconds"]

voice = load(P("voice/voice.wav"))
music = load(P("public/audio/music/geysir-music.mp3"))
sfx = np.zeros(N, np.float32)
cache = {}
def put(frame, name, gain_db, dur=None, align_peak=True, fade_out=0.05):
    x = cache.get(name)
    if x is None: x = cache[name] = load(P("public/audio/sfx", name))
    if dur: x = x[: int(dur * SR)]
    x = x.copy()
    n = int(fade_out * SR)
    if n and len(x) > n: x[-n:] *= np.linspace(1, 0, n)
    off = int(peaks.get(name, 0) * SR) if align_peak else 0
    s = max(0, fr(frame) - off)
    e = min(N, s + len(x))
    sfx[s:e] += x[: e - s] * db(gain_db)

POP, SPLASH, BUBBLES, CORK, TICK, THUMP, CHEER = "fs-321163.mp3", "fs-442773.mp3", "fs-539823.mp3", "fs-506156.mp3", "fs-418896.mp3", "fs-683031.mp3", "fs-410868.mp3"
WOOSH, RISER, IMPACT, SHIMMER, SWOOSH, SWOOSH2 = "fs-683096.mp3", "fs-503813.mp3", "fs-754564.mp3", "fs-714565.mp3", "fs-786514.mp3", "fs-632763.mp3"

CUES = [
    # hook: soap pours, "SÁPA?!" slam, the first eruption on "gjósa!"
    (30, BUBBLES, -16, 2.5), (46, POP, -7, None), (110, WOOSH, -9, None), (121, IMPACT, -8, None), (121, SPLASH, -6, None),
    # setting: "60 M"
    (263, POP, -7, None),
    # lazy: the day counter flips
    (360, POP, -12, None), (372, POP, -15, None), (384, POP, -15, None), (396, POP, -15, None),
    # soap goes in, the countdown ticks, the water bubbles, riser into the BÚMM
    (641, BUBBLES, -11, 3.0), (686, POP, -10, None), (688, TICK, -13, 2.0), (723, POP, -10, None), (725, TICK, -11, 1.3), (725, BUBBLES, -8, 2.0),
    (764, RISER, -4, None), (779, IMPACT, -1, None), (779, SPLASH, -2, None), (781, WOOSH, -7, None),
    # soaked: question marks
    (828, POP, -11, None), (834, POP, -13, None),
    # board 1: inside Geysir, 120 °C, the weight pressing down
    (904, SWOOSH, -10, None), (998, POP, -6, None), (1110, THUMP, -12, None), (1124, THUMP, -12, None), (1138, THUMP, -12, None),
    # the kid's soda bottle
    (1188, BUBBLES, -18, 1.6), (1241, CORK, -3, None), (1268, SPLASH, -14, None),
    # board 2: soap bubbles, splash, pressure falls, steam, eruption
    (1311, SWOOSH, -10, None), (1323, BUBBLES, -12, 2.0), (1400, SPLASH, -14, None), (1434, SWOOSH2, -12, None), (1484, WOOSH, -7, None), (1508, IMPACT, -6, None), (1508, SPLASH, -8, None),
    # banned
    (1630, THUMP, -1, None),
    # Strokkur runs the show
    (1751, SPLASH, -8, None), (1753, CHEER, -11, None),
    # board 3: the world's geysers, the end card
    (1851, SWOOSH, -10, None), (1904, POP, -12, None), (1910, POP, -12, None), (1916, POP, -12, None), (1922, POP, -12, None), (1946, SHIMMER, -8, None),
]
for f, name, g, dur in CUES: put(f, name, g, dur)

# ---- music: ducked under the voice (sidechain from the voice envelope), drop-out before the BÚMM ----
v = np.zeros(N, np.float32); v[: len(voice)] = voice[:N]
def movavg(x, w):  # centred moving average via cumulative sums (O(N))
    c = np.cumsum(np.concatenate([[0.0], x.astype(np.float64)]))
    i = np.arange(len(x)); lo = np.clip(i - w // 2, 0, len(x)); hi = np.clip(i + w // 2 + 1, 0, len(x))
    return ((c[hi] - c[lo]) / np.maximum(1, hi - lo)).astype(np.float32)
win = int(0.05 * SR)
env = np.sqrt(movavg(v ** 2, win))
active = (env > db(-38)).astype(np.float32)
hold = int(0.25 * SR)
active = movavg(active, hold) > 0.01
duck = np.where(active, db(-9), db(0)).astype(np.float32)
sm = int(0.12 * SR); duck = movavg(duck, sm)
mus = np.zeros(N, np.float32); m = music[:N]; mus[: len(m)] = m
gainc = np.ones(N, np.float32) * db(-11)
def ramp(a, b, g0, g1):
    s, e = fr(a), fr(b); gainc[s:e] = np.linspace(g0, g1, e - s)
ramp(755, 764, db(-11), db(-40)); gainc[fr(764): fr(806)] = 0.0; ramp(806, 818, 0.0, db(-11))  # comic drop-out
gainc[: fr(6)] *= np.linspace(0, 1, fr(6))
end = fr(TOTAL); gainc[end - fr(30): end] *= np.linspace(1, 0, fr(30)); gainc[end:] = 0
mus *= gainc * duck

def master(x, target=-14.0):
    tmp = P("out", "_tmp.wav")
    os.makedirs(P("out"), exist_ok=True)
    write(tmp, x)
    out = subprocess.run(["ffmpeg", "-v", "info", "-i", tmp, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float([l for l in out.splitlines() if l.strip().startswith("I:")][-1].split()[1])
    y = x * db(target - I)
    pk = np.max(np.abs(y))
    lim = db(-1.2)
    if pk > lim:  # soft-knee peak limiter (tanh) above the ceiling
        y = np.where(np.abs(y) > lim * 0.8, np.sign(y) * (lim * 0.8 + (lim * 0.2) * np.tanh((np.abs(y) - lim * 0.8) / (lim * 0.2))), y)
    return y, I

def write(path, x):
    x = np.clip(x[: fr(TOTAL)], -1, 1)
    pcm = (x * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ac", "2", path], input=pcm, check=True)

full, I0 = master(v + mus + sfx)
write(P("public/audio/mix.wav"), full)
print("mix: pre-master", round(I0, 1), "LUFS -> -14 LUFS; cues", len(CUES))
