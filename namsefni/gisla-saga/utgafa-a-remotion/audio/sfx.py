# Every sound effect + ambience bed of Gísla saga ep. 1, timed to atburdir.md: each one STARTS on its anchor word
# (Whisper start time from timeline.json). Levels are LU relative to the voice stem's integrated loudness and are
# measured AFTER the voice sidechain duck (so "-6" means the event's max momentary loudness sits 6 LU under the
# voice in the final mix). Events = max momentary; beds = integrated over the bed.
import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st, momentary_max,
                 integrated, colored, smooth_noise)
import sfx_gen as G
import nordic as Nd
import timeline as T

N = ns(T.DUR)
A = T.A
EVENT_PEAK_DBFS = -8.0         # per-event peak cap (pre master gain)


def soft_cap(x, ceil_db, look=0.001, rel=0.04):
    """tiny look-ahead peak limiter for one event (gain smoothed so transients keep their shape)"""
    from scipy import ndimage
    c = dbg(ceil_db)
    pk = np.abs(x).max(0)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g = ndimage.minimum_filter1d(gr, 2 * La + 1)
    kr = 1 - np.exp(-1 / (rel * SR))
    out = np.empty_like(g)
    e = 1.0
    for i in range(len(g)):
        e = min(g[i], e + (1 - e) * kr)
        out[i] = e
    out = ndimage.uniform_filter1d(out, 2 * La + 1)
    return x * np.minimum(out, gr.max())[None, :]


class Cue:
    def __init__(self, t, name, desc, gen, level, kind="event", p=0.0, send=0.1, lpf=None, group=None):
        self.t, self.name, self.desc, self.gen, self.level = t, name, desc, gen, level
        self.kind, self.p, self.send, self.lpf = kind, p, send, lpf
        self.group = group or name
        self.measured = None


def _bed(fn, dur, fin, fout):
    def g():
        x = fn()
        x = st(x) if np.ndim(x) == 1 else x
        return fades(x[:, : ns(dur)], fin, fout)
    return g


def amb_day(dur, r):
    n = ns(dur)
    x = G.breeze(dur, r, 1.0, 0.12, 800)
    x += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.05, -0.5)
    x += pan(G.bird_chirps(dur, r, 0.45, "sparrow") * 0.05, 0.55)
    x += st(lp(bp(colored(n, r, 0.8), 150, 1200, 1), 900) * 0.25)          # distant fjord / river
    return x


def amb_night(dur, r):
    n = ns(dur)
    x = G.breeze(dur, r, 0.6, 0.08, 500)
    x += widen(G.crickets(dur, r, 2) * 0.006, r, 9, 1.0)
    return x


def fire_curve(dur, t0):
    """fire bed level over time: catches on 'kveikja', grows through block 5-6, knocked down by each hiss,
    flares back twice, then embers; fades as the family escapes"""
    t = t0 + np.arange(ns(dur)) / SR
    k1, k2, k3 = A["eldinn"], A["sinni"], A["thrisvar"]
    pts = [(t0, 0.0), (t0 + 0.4, 0.45), (A["sefur"], 0.6), (T.BLOCK_START[6], 0.75), (A["kerin"], 0.9), (k1, 1.0),
           (k1 + 0.25, 0.22), (k1 + 0.6, 0.3), (k2 - 0.35, 0.95), (k2, 1.0), (k2 + 0.2, 0.22), (k3, 0.45), (k3 + 0.25, 0.1),
           (A["brjota"], 0.12), (A["brjota"] + 0.4, 0.3), (A["sleppa"], 0.25), (A["sleppa"] + 1.0, 0.0)]
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


def _triumph():
    d = Nd.framedrum("big", 1.0, rng(74))
    bm = Nd.low_boom(rng(75), 1.2, 50.0)
    y = np.zeros(max(len(d), len(bm)))
    y[: len(d)] += d
    y[: len(bm)] += 0.8 * bm
    return y


def cues():
    C = []
    R = rng(997)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ---------------- block 1
    add(Cue(A["mysu"], "fire_hook", "low fire crackle under the flash-forward vat shot ('mysu')",
            _bed(lambda: hp(Nd.fire_bed(1.9, rng(11), np.interp(tt(1.9), [0, 0.2, 1.3, 1.9], [0, 0.8, 0.7, 0])), 60, 2), 1.9, 0.02, 0.5), -16, "bed",
            send=0.05))
    add(Cue(A["gisli1"], "whoosh_gisli", "soft whoosh as Gísli turns to camera ('Gísli')",
            lambda: G.whoosh(0.55, rng(12), 0.07, 350, 2000, 0.8, 0.16, 0.15), -11, send=0.1))
    for key, nm in [("gisli1", "Gísli"), ("pabba", "pabbi"), ("thordisi", "Þórdís"), ("thorkeli", "Þorkell")]:
        add(Cue(A[key], "card_pop", f"name-card pop: {nm}", (lambda r=rr(): Nd.card_pop(r)), -15, p=-0.35, send=0.05, group="card_pop"))
    d_day = A["nott"] + 1.2 - A["noregi"]
    add(Cue(A["noregi"], "amb_day", "valley day air: wind, blackbird + sparrows, distant fjord ('Noregi' -> crossfades into night on 'nótt')",
            _bed(lambda: amb_day(d_day, rng(13)) * np.interp(tt(d_day), [0, T.BLOCK_START[5] - A["noregi"], d_day], [1, 1, 0.35])[None, :],
                 d_day, 0.9, 1.6), -25, "bed", send=0.0))

    # ---------------- block 2
    add(Cue(A["bardur"], "jawharp_sting", "comic sting: jaw-harp 'boi-oing' as Bárður winks ('Bárður')",
            lambda: Nd.jawharp(196.0, 0.75, rng(21)), -8, p=0.2, send=0.08))
    add(Cue(A["drepur"], "thud", "heavy thud: Bárður drops behind the stone wall ('drepur')", lambda: Nd.thud(rng(22)), -6, send=0.12))

    # ---------------- block 3
    add(Cue(A["fussi"], "gate_slam", "farm gate slammed by Þorkell ('fússi')", lambda: Nd.gate_slam(rng(31)), -6, p=0.15, send=0.15))
    add(Cue(A["skeggja"], "brass_laugh", "Skeggi's laugh as a low brass stab figure HO-ho-ho-HOO, no voice ('Hólmgöngu-Skeggja')",
            lambda: Nd.brass_laugh(rng(32)), -7, send=0.18))
    for k in range(3):
        add(Cue(A["trestyttur"] + k * 0.26, "chop", f"wood chop {k + 1}/3: carver chipping the silly statues ('tréstyttur')",
                (lambda r=rr(), k=k: Nd.chop(r, 1.0 - 0.1 * k)), -10, p=0.25 - 0.15 * k, send=0.1, group="chops"))

    # ---------------- block 4
    add(Cue(A["montar"], "sword_shing", "sword Gunnlogi raised: steel scrape + long ring ('montar')", lambda: Nd.sword_shing(rng(41)),
            -8, p=0.1, send=0.2))
    add(Cue(A["heggur"], "whoosh_impact", "spear swing whoosh + impact flash, cut away ('heggur')", lambda: Nd.whoosh_impact(rng(42), 0.2),
            -5, send=0.15))
    for k in range(3):
        add(Cue(A["trefaeti"] + k * 0.24, "peg_tok", f"peg-leg tok {k + 1}/3 ('tréfæti')", (lambda r=rr(), k=k: Nd.peg_tok(r, 1.0 + 0.06 * (k % 2))),
                -12, p=-0.2 + 0.2 * k, send=0.08, group="peg_tok"))

    # ---------------- block 5
    t_ne = T.BLOCK_START[6] + 0.3
    add(Cue(A["nott"], "amb_night", "night falls: low night wind, faint insects ('nótt')",
            _bed(lambda: amb_night(t_ne - A["nott"], rng(51)), t_ne - A["nott"], 0.8, 1.5), -24, "bed", send=0.0))
    add(Cue(A["nott"] + 0.25, "owl", "owl 'hoo ... hoo-hoo' in the dark valley", lambda: pan(Nd.owl(rng(52)), -0.55), -14, send=0.35))
    add(Cue(A["sextiu"], "crowd_steps", "sixty men walking down the valley: crunching steps ('sextíu')",
            _bed(lambda: Nd.crowd_steps(3.6, rng(53), 26, 1.9, np.interp(tt(3.6), [0, 0.4, 2.6, 3.6], [0.3, 1, 1, 0])), 3.6, 0.15, 0.6),
            -16, "bed", send=0.15))
    for k, dt in enumerate([0.05, 0.85, 1.6]):
        add(Cue(A["sextiu"] + dt, "torch_whoosh", f"torch whoosh {k + 1}/3", (lambda r=rr(): Nd.torch_whoosh(r)), -13, p=(-0.5, 0.4, -0.1)[k],
                send=0.15, group="torch_whoosh"))
    add(Cue(A["kveikja"], "ignite", "fire catches the turf wall: whoomp + roar onset ('kveikja')", lambda: Nd.ignite(rng(54)), -7, send=0.12))
    fdur = A["sleppa"] + 1.2 - A["kveikja"]
    add(Cue(A["kveikja"], "fire_bed", "fire bed: rises through block 5-6, knocked down by each hiss, flares twice, embers (kveikja -> sleppa)",
            _bed(lambda: hp(Nd.fire_bed(fdur, rng(55), fire_curve(fdur, A["kveikja"])), 70, 2), fdur, 0.05, 0.5), -16, "bed", send=0.06))
    add(Cue(A["sefur"], "crackle_inside", "muffled crackle heard from inside the storehouse ('sefur')",
            lambda: st(Nd.crackle(2.0, rng(56), 22, np.interp(tt(2.0), [0, 0.3, 1.5, 2.0], [0.4, 1, 1, 0]), 0.25, lowpass=1100)), -14,
            send=0.0))

    # ---------------- block 6
    add(Cue(A["kerin"], "splash", "goat skin dunked into the whey vat ('kerin')", lambda: Nd.splash_small(rng(61)), -7, send=0.1))
    for k, (key, d) in enumerate([("eldinn", 1.0), ("sinni", 0.9), ("thrisvar", 1.7)]):
        add(Cue(A[key], "steam_hiss", f"steam hiss {k + 1}/3: whey-soaked skin beats the flames down ('{key}')",
                (lambda r=rr(), d=d: widen(Nd.hiss(d, r), r, 9, 0.8)), -6 if k < 2 else -5, send=0.1, group="steam_hiss"))

    # ---------------- block 7
    add(Cue(A["brjota"], "wall_crash", "Gísli kicks through the back wall: crack, splinters, falling boards ('brjóta')",
            lambda: Nd.wall_crash(rng(71)), -5, send=0.12))
    add(Cue(A["sleppa"], "wind_gust", "wind gust as the family runs up the mountainside ('sleppa')",
            _bed(lambda: G.breeze(1.8, rng(72), 1.0, 1.2, 1400) * np.interp(tt(1.8), [0, 0.35, 1.0, 1.8], [0, 1, 0.6, 0])[None, :], 1.8, 0.02, 0.3),
            -10, send=0.0))
    d_mt = T.BLOCK_START[8] - 0.2 - (A["sleppa"] + 0.6)
    add(Cue(A["sleppa"] + 0.6, "amb_mountain", "mountainside wind after the escape (block 7 bed)",
            _bed(lambda: G.breeze(d_mt, rng(77), 1.0, 0.2, 1100), d_mt, 0.8, 1.2), -27, "bed", send=0.0))
    add(Cue(A["sur"], "comic_sting", "comic sting: pucker squeak + falling plucks ('súr')", lambda: Nd.comic_sour(rng(73)), -8, p=0.15, send=0.1))
    add(Cue(A["sursson"], "triumph_hit", "triumphant hit: big drum + low boom on 'Súrsson' (score tutti on the same beat)",
            _triumph, -6, send=0.15))

    # ---------------- block 8
    sea_d = A["kippir"] - A["sigla"]
    add(Cue(A["sigla"], "waves", "grey sea from the ship: swells, bow splash, hull slap ('sigla' -> cut on 'kippir')",
            _bed(lambda: hp(Nd.waves(sea_d, rng(81)), 75, 2), sea_d, 0.5, 0.03), -18, "bed", send=0.0))
    add(Cue(A["sigla"], "sail_flap", "square sail flapping", _bed(lambda: pan(Nd.sail_flap(sea_d, rng(82)), 0.35), sea_d, 0.3, 0.03), -22,
            "bed", send=0.05))
    for k, dt in enumerate([0.0, 0.55, 1.3]):
        add(Cue(A["islands"] + dt, "gull", f"gull call {k + 1}/3 ('Íslands')", (lambda r=rr(), k=k: pan(Nd.gull(r), (0.5, -0.4, 0.2)[k])),
                -12 - 2 * k, send=0.3, group="gull"))
    for k, dt in enumerate([0.0, 0.66, 1.31]):
        add(Cue(A["fostbr"] + dt, "slow_drum", f"slow ritual drum {k + 1}/3 under the turf arch ('fóstbræðralag')",
                (lambda r=rr(), k=k: Nd.framedrum("big", 0.8 + 0.1 * k, r)), -9 + k, send=0.2, group="slow_drum"))
    add(Cue(A["kippir"], "hard_hit", "HARD HIT: the dark-red hand yanks back, freeze + shake ('kippir'); music cuts here",
            lambda: Nd.hard_hit(rng(88)), -3, send=0.15))
    add(Cue(T.END_CARD, "low_boom", "single low boom on the frozen end card (78.5 s, frame 2355), decays to silence by 80.0",
            lambda: Nd.low_boom(rng(89), 1.45, 42.0), -9, send=0.1))
    return C


def render(v_ref, duck):
    """v_ref: integrated loudness of the voice stem (stereo); duck: per-sample linear SFX duck gain (N,).
    Returns (stereo stem (2, N), cue list with measured levels)."""
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x = np.asarray(c.gen(), float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.lpf:
            x = lp(x, c.lpf, 1)
        i0 = ns(c.t)
        L = min(x.shape[1], N - i0)
        x = x[:, :L] * duck[None, i0:i0 + L]
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(v_ref + c.level - cur)
        pk = np.abs(x).max()
        if pk > dbg(EVENT_PEAK_DBFS):                 # short clicks read low on a 400 ms meter: cap their peaks
            x = soft_cap(x, EVENT_PEAK_DBFS)
        c.measured = (momentary_max(x) if c.kind == "event" else integrated(x)) - v_ref
        out[:, i0:i0 + L] += x
        if c.send > 0:
            send[i0:i0 + L] += c.send * x.mean(0)
    valley = make_ir(1.4, 77, pre=0.012, hf=1.6, early=[(0.08, 0.4, -0.5), (0.15, 0.3, 0.6)])
    wet = convolve_st(send, valley)
    a = ns(A["kippir"])                     # the oath freeze: no valley tail runs on past the hard hit's own sound
    wet[:, a + ns(1.2):] *= np.exp(-np.arange(N - a - ns(1.2)) / SR / 0.25)[None, :]
    out += 0.5 * wet
    out = hp(out, 28, 2)
    end = ns(T.DUR - 0.05)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :]
    return out, C
