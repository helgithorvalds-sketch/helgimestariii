# Final mix of Gísla saga ep. 1 (Version A): narration (voice_master.wav, gain only - no EQ, no compression, no
# time-stretch) + original Nordic-folk score + synthesized SFX. Music and SFX are ducked by a SIDECHAIN computed from
# the voice audio itself (look-ahead envelope). Music sits 10-14 LU under the voice while it speaks (measured on
# speech windows per section), SFX events ~6 LU under. Master gain to -14 LUFS integrated, own 4x-oversampled
# look-ahead limiter for <= -1 dBTP, exactly 80.000 s / 48 kHz / stereo / 24-bit.
# Writes mix.wav + voice.wav / music.wav / sfx.wav (stems at mix gain, pre-limiter) + cues.md.
# Run: <venv>/bin/python -I mix.py   (from this folder; renders are cached in _cache/)
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
from scipy import ndimage, signal
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, short_term, lra, true_peak, fades, _blocks, shelf
import timeline as T

N = ns(T.DUR)                  # 3,840,000 samples = 80.000 s
CACHE = os.path.join(HERE, "_cache")
TARGET_LUFS = -13.96          # own meter; ffmpeg ebur128 / loudnorm then read -14.0 / -14.0x
SFX_PEAK_DBFS = -7.0          # SFX bus peak limiter (pre master gain): transients never drive the master limiter
CEIL_DBTP = -1.3
MUSIC_DUCK_DB = -7.0           # sidechain depth on the music while the voice speaks
SFX_DUCK_DB = -3.0             # lighter on the effects (they land ON words by design)
# music level while speaking, LU relative to the voice over the same speech windows (brief: 10-14 LU under)
MUSIC_TARGET = {"hook": -13.5, "play": -12.0, "night": -12.0, "fire": -11.0, "lift": -11.0, "sea": -11.5}
SECTIONS = [("hook", 0.0, T.A["noregi"]), ("play", T.A["noregi"], T.BLOCK_START[5] - 0.15),
            ("night", T.BLOCK_START[5] - 0.15, T.BLOCK_START[6] - 0.1), ("fire", T.BLOCK_START[6] - 0.1, T.bar(22, 2)),
            ("lift", T.bar(22, 2), T.BLOCK_START[8] - 0.3), ("sea", T.BLOCK_START[8] - 0.3, T.A["kippir"])]
# music rides (start, end, dB): the three knock-downs of the fire (music 'breathes out' with each hiss)
DIPS = [(T.A["eldinn"], T.A["eldinn"] + 0.45, -6.0), (T.A["sinni"], T.A["sinni"] + 0.4, -6.0), (T.A["thrisvar"], T.A["thrisvar"] + 0.7, -7.0)]


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def cached(name, fn):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name + ".npy")
    if os.path.exists(p) and "--fresh" not in sys.argv:
        log("cache hit", name)
        return np.load(p).astype(np.float64)
    x = fn()
    np.save(p, np.asarray(x, np.float32))
    return x


# ================================================================ voice + sidechain
def load_voice():
    x, sr = read_wav(T.VOICE_PATH)
    assert sr == SR, sr
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def voice_activity(v, look=0.04, att=0.02, hold=0.12, rel=0.35):
    """0..1 speech activity from the voice AUDIO: 10 ms RMS, soft gate 24 dB under the loud speech level,
    look-ahead (the duck starts 40 ms before each word), hold, attack/release one-pole at 1 kHz control rate"""
    hopn = ns(0.001)
    win = ns(0.010)
    p = np.pad(v, (win // 2, win // 2))
    c = np.concatenate([[0], np.cumsum(p ** 2)])
    idx = np.arange(0, N, hopn)
    rms = np.sqrt(np.maximum((c[idx + win] - c[idx]) / win, 1e-20))
    db = 20 * np.log10(rms)
    loud = np.percentile(db[db > -70], 90)
    a = np.clip((db - (loud - 24)) / 8.0, 0, 1)
    ctrl = 1000
    a = ndimage.maximum_filter1d(a, int((look + hold) * ctrl) + 1, origin=-int((look - hold) * ctrl / 2))   # look-ahead + hold
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros_like(a)
    e = 0.0
    for i in range(len(a)):
        e += (a[i] - e) * (ka if a[i] > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, idx / SR, env), loud


def speech_mask_blocks(act, hop=0.01):
    """for 400 ms loudness blocks (10 ms hop): True where the block centre is speech (activity > 0.6)"""
    nb = int((N - ns(0.4)) / ns(hop)) + 1
    centres = (np.arange(nb) * hop + 0.2)
    return act[np.minimum((centres * SR).astype(int), N - 1)] > 0.6, centres


def masked_lufs(x, mask):
    _, z = _blocks(x, 0.4, 0.01)
    z = z[: len(mask)]
    m = mask[: len(z)] & (z > 0)
    if m.sum() < 5:
        return -99.0
    return float(-0.691 + 10 * np.log10(z[m].mean()))


# ================================================================ music automation
def section_curve(m_ducked, v_st, mask, centres):
    gains, meas = {}, {}
    for name, a, b in SECTIONS:
        k = mask & (centres >= a) & (centres < b)
        Lm = masked_lufs(m_ducked, k)
        Lv = masked_lufs(v_st, k)
        gains[name] = (Lv + MUSIC_TARGET[name] - Lm) if Lm > -98 else 0.0
        meas[name] = (Lv, Lm)
    t = np.arange(N) / SR
    curve = np.zeros(N)
    for name, a, b in SECTIONS:
        curve[t >= a] = gains[name]
    curve[t >= T.A["kippir"]] = gains["sea"]
    curve = ndimage.uniform_filter1d(curve, ns(0.5), mode="nearest")
    for a, b, db in DIPS:
        d = np.zeros(N)
        d[ns(a): ns(b)] = db
        curve += ndimage.uniform_filter1d(d, ns(0.08), mode="nearest")
    return curve, gains, meas


# ================================================================ limiter (from the bridge kit's mix.py)
def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3


def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def ffmpeg_measure(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, timeout=300)
    txt = r.stderr
    i = txt.rfind("Summary:")
    eb = "\n".join(l.rstrip() for l in txt[i:].splitlines() if l.strip()) if i >= 0 else txt[-1200:]
    r2 = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
                         "-f", "null", "-"], capture_output=True, text=True, timeout=300)
    t2 = r2.stderr
    j = t2.rfind("{")
    ln = json.loads(t2[j: t2.rfind("}") + 1]) if j >= 0 else {}
    return eb, ln


# ================================================================ main
def main():
    t_start = time.time()
    v = load_voice()
    v_st = st(v)
    v_ref = lufs(v_st)
    log(f"voice: {v_ref:.2f} LUFS (dual-mono stereo), TP {true_peak(v_st):.2f} dBTP")
    act, loud = voice_activity(v)
    log(f"sidechain: speech level p90 {loud:.1f} dBFS RMS, active {100 * (act > 0.6).mean():.1f} % of the time")
    mask, centres = speech_mask_blocks(act)

    import music
    b = music.build()
    m_raw = cached("music_raw", lambda: music.render(b, ref=-20.0)[0])
    m_raw = shelf(m_raw, 90.0, -3.0, "low")             # keep the drone/drum lows from crowding the narration
    m_d = m_raw * dbg(MUSIC_DUCK_DB * act)[None, :]
    curve, gains, meas = section_curve(m_d, v_st, mask, centres)
    m = m_d * dbg(curve)[None, :]
    m[:, ns(T.A["kippir"]):] = 0.0                       # hard cut stays hard after the smoothing
    log("music section gains (dB):", {k: round(g, 1) for k, g in gains.items()})

    import sfx
    duck_s = dbg(SFX_DUCK_DB * act)
    C_box = {}

    def _s():
        out, C = sfx.render(v_ref, duck_s)
        C_box["C"] = C
        return out
    s_st = cached("sfx", _s)
    mpath = os.path.join(CACHE, "sfx_measured.json")
    if "C" in C_box:
        json.dump([c.measured for c in C_box["C"]], open(mpath, "w"))
    else:
        C_box["C"] = sfx.cues()
        if os.path.exists(mpath):
            for c, mv in zip(C_box["C"], json.load(open(mpath))):
                c.measured = mv
    C = C_box["C"]
    s_st, gs3 = limiter(s_st, SFX_PEAK_DBFS, look=0.002, rel=0.05)
    log(f"sfx bus limiter: max GR {-20 * np.log10(gs3.min()):.2f} dB, >1 dB on {100 * (gs3 < dbg(-1)).mean():.3f} % of samples")

    mix0 = v_st + m + s_st
    G = TARGET_LUFS - lufs(mix0)
    for it in range(6):
        y, g3 = limiter(mix0 * dbg(G))
        L = lufs(y)
        log(f"master iter {it}: gain {G:+.2f} dB -> {L:.2f} LUFS, TP {true_peak(y):.2f} dBTP, max GR {-20 * np.log10(g3.min()):.2f} dB")
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L
    y = fades(y, 0.0, 0.02)
    assert y.shape == (2, N), y.shape
    gv, gm, gs = v_st * dbg(G), m * dbg(G), s_st * dbg(G)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "voice.wav"), gv)
    write_wav(os.path.join(HERE, "music.wav"), gm)
    write_wav(os.path.join(HERE, "sfx.wav"), gs)
    log("wrote mix.wav + voice/music/sfx stems")

    # ---------------- measurements
    I_, TP, LRA = lufs(y), true_peak(y), lra(y)
    grdb = -20 * np.log10(g3)
    gr = dict(max=float(grdb.max()), pct01=float((grdb > 0.1).mean() * 100))
    rows = []
    for name, a, b_ in SECTIONS:
        k = mask & (centres >= a) & (centres < b_)
        Lv, Lm, Ls = masked_lufs(gv, k), masked_lufs(gm, k), masked_lufs(gs, k)
        rows.append((name, a, b_, Lv, Lm, Ls, Lv - Lm, Lv - Ls))
        log(f"{name:<6} {a:6.2f}-{b_:6.2f}  speech: voice {Lv:6.1f}  music {Lm:6.1f} ({Lm - Lv:+.1f} LU)  sfx {Ls:6.1f} ({Ls - Lv:+.1f} LU)")
    eb, ln = ffmpeg_measure(os.path.join(HERE, "mix.wav"))
    print(eb)
    log("loudnorm:", json.dumps({k: ln.get(k) for k in ("input_i", "input_tp", "input_lra")}))
    vI = lufs(gv)
    stats = dict(I=I_, TP=TP, LRA=LRA, G=G, gr=gr, vI=vI, mI=lufs(gm), sI=lufs(gs), gains=gains)
    write_cues(C, b, stats, rows, eb, ln, vI)
    log(f"done in {time.time() - t_start:.0f} s")


def write_cues(C, b, s, rows, eb, ln, vI):
    L = []
    w = L.append
    w("# Gísla saga, 1. þáttur (Mysan) - Version A sound: cue sheet")
    w("")
    w("All music and effects are original, synthesized with numpy/scipy (`nordic.py`, plus the MIT `dsp.py` / `sfx_gen.py` / "
      "`instruments.py` kit from claude-animated-shorts), placed by `music.py` / `sfx.py`, mixed by `mix.py`. "
      "Narration = `public/gisla/voice_master.wav`, gain only (no EQ, no compression, no time-stretch).")
    w("")
    w("## Files")
    w("| file | content |")
    w("|---|---|")
    w(f"| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, {N:,} samples = 80.000 s |")
    w("| `voice.wav` / `music.wav` / `sfx.wav` | stems at mix gain, pre-limiter (they sum to the mix before the master limiter) |")
    w("")
    w("## Master loudness")
    w(f"- Own BS.1770-4 meter: integrated **{s['I']:.2f} LUFS**, true peak **{s['TP']:.2f} dBTP**, LRA {s['LRA']:.1f} LU")
    w(f"- ffmpeg loudnorm (measurement pass): input_i **{ln.get('input_i')} LUFS**, input_tp **{ln.get('input_tp')} dBTP**, "
      f"input_lra {ln.get('input_lra')} LU")
    w(f"- Stems at mix gain: voice {s['vI']:.1f} LUFS, music {s['mI']:.1f} LUFS, sfx {s['sI']:.1f} LUFS; master gain {s['G']:+.2f} dB "
      f"(same on every stem); limiter ceiling {CEIL_DBTP} dBTP, max GR {s['gr']['max']:.2f} dB, active (>0.1 dB) on "
      f"{s['gr']['pct01']:.2f} % of samples (mostly single voice peaks: the narration's own true peak is -2.2 dBTP, so "
      f"-14 LUFS needs ~1.5-2 dB off its loudest plosives)")
    w(f"- SFX bus: own peak limiter at {SFX_PEAK_DBFS} dBFS (pre master gain) so effect transients never push the master limiter.")
    w("")
    w("ffmpeg ebur128 (peak=true):")
    w("```")
    w(eb)
    w("```")
    w("")
    w("## Ducking (sidechain from voice_master.wav)")
    w(f"- Key = the voice audio: 10 ms RMS, soft gate 24 dB under the loud-speech level, 40 ms look-ahead, 120 ms hold, "
      f"20 ms attack, 350 ms release. Music duck {MUSIC_DUCK_DB:+.0f} dB, SFX duck {SFX_DUCK_DB:+.0f} dB.")
    w("- Music level per section is then set so the music sits the target LU under the voice over the speech windows; "
      "in the gaps between blocks it blooms back up by the duck depth.")
    w("- Rides: music dips on the three steam hisses (" + ", ".join(f"{a:.2f}-{b:.2f} s {d:+.0f} dB" for a, b, d in DIPS) + ").")
    w("")
    w("| section | time s | voice (speech) LUFS | music LUFS | music vs voice | sfx LUFS | sfx vs voice |")
    w("|---|---|---|---|---|---|---|")
    for (name, a, b_, Lv, Lm, Ls, dm, ds) in rows:
        w(f"| {name} | {a:.2f}-{b_:.2f} | {Lv:.1f} | {Lm:.1f} | {-dm:+.1f} LU | {Ls:.1f} | {-ds:+.1f} LU |")
    w("")
    w("## Music map (original score: Nordic folk - bowed drone, fiddle, lyre/kantele, frame drum, lur; 96 bpm, bar 1 = 'Noregi')")
    w("Section gains applied (dB): " + ", ".join(f"{k} {v:+.1f}" for k, v in s["gains"].items()) + ".")
    w("")
    w("| time s | frame | music |")
    w("|---|---|---|")
    for t, d in sorted(b.cues):
        w(f"| {t:.3f} | {int(round(t * T.FPS))} | {d} |")
    w("")
    w("## SFX events (each starts ON its anchor word; Whisper start time from timeline.json)")
    w(f"Level = LU relative to the voice stem's integrated loudness ({vI:.1f} LUFS at mix gain), measured after the SFX duck: "
      "events as max momentary loudness, beds as integrated loudness over the bed.")
    w("")
    w("| # | time s | frame | cue | what | kind | target LU | measured LU |")
    w("|---|---|---|---|---|---|---|---|")
    for i, c in enumerate(sorted(C, key=lambda c: (c.t, c.name))):
        meas = f"{c.measured:+.1f}" if c.measured is not None else "-"
        w(f"| {i + 1} | {c.t:.3f} | {c.t * T.FPS:.1f} | {c.name} | {c.desc} | {c.kind} | {c.level:+.0f} | {meas} |")
    w("")
    open(os.path.join(HERE, "cues.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
