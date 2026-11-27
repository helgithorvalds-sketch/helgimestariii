# Original instrumental score for Gísla saga ep. 1 "Mysan" (no vocals), composed and synthesized here.
# Nordic folk palette: bowed drone (D + A), folk fiddle, lyre/kantele, frame drum, wooden lur.
# 96 bpm, bar = 2.5 s, bar 1 downbeat ON "Noregi" (timeline.T0); bar 25 downbeat = "Súrsson" (68.665 vs word 68.655).
#   hook 0-8.67   : drone fades in under the flash-forward, heartbeat drum, lyre "whey" motif
#   B1-4 8.67-40.7: playful D-dorian dance tune (theme A/B), lyre ostinato, frame drum; duel drive in block 4
#   B5   40.7-50.6: night - drone D + Eb rub, heartbeat drum, low lyre; fire lit -> tremolo fiddle
#   B6   50.6-62.4: fire - lyre ostinato, driving drum, rising tremolo, three knock-downs (dips in mix.py)
#   B7   62.4-70.6: escape lift - D major theme, strums, drum; triumphant tutti on "Súrsson"
#   B8   70.6-77.7: sea-wide - open fifths, long fiddle line, lyre "waves", oath swell; HARD CUT on "kippir"
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import nordic as Nd
import timeline as T

N = ns(T.DUR)
F = Nd.m2f
Q = T.Q
bar = T.bar
CUT = T.A["kippir"]

# theme A (bars 1-4) and B (bars 5-8), D dorian: (bar, beat, length in beats, midi)
THEME_A = [
    (1, 0, .5, 69), (1, .5, .5, 74), (1, 1, .5, 74), (1, 1.5, .5, 76), (1, 2, 1, 77), (1, 3, .5, 76), (1, 3.5, .5, 74),
    (2, 0, .5, 72), (2, .5, .5, 69), (2, 1, .5, 69), (2, 1.5, .5, 72), (2, 2, 1.5, 74),
    (3, 0, .5, 69), (3, .5, .5, 74), (3, 1, .5, 74), (3, 1.5, .5, 76), (3, 2, .5, 77), (3, 2.5, .5, 79), (3, 3, 1, 81),
    (4, 0, .5, 79), (4, .5, .5, 76), (4, 1, .5, 72), (4, 1.5, .5, 76), (4, 2, 2, 74),
]
THEME_B = [
    (1, 0, 1, 81), (1, 1, .5, 79), (1, 1.5, .5, 77), (1, 2, 1, 76), (1, 3, 1, 74),
    (2, 0, .5, 72), (2, .5, .5, 74), (2, 1, .5, 76), (2, 1.5, .5, 72), (2, 2, 2, 69),
    (3, 0, .5, 74), (3, .5, .5, 76), (3, 1, .5, 77), (3, 1.5, .5, 76), (3, 2, .5, 74), (3, 2.5, .5, 72), (3, 3, 1, 69),
    (4, 0, .5, 71), (4, .5, .5, 72), (4, 1, 1, 69), (4, 2, 2, 74),
]
# chords per bar (lyre arpeggio + bass): dorian i - VII - i - (IV) ...
CH = {"Dm": [50, 57, 62, 65, 69], "C": [48, 55, 60, 64, 67], "G": [43, 55, 59, 62, 67], "Am": [45, 57, 60, 64, 69],
      "D": [50, 57, 62, 66, 69], "A": [45, 57, 61, 64, 69], "Bm": [47, 54, 59, 62, 66], "Gmaj": [43, 55, 59, 62, 67],
      "Bb": [46, 53, 58, 62, 65], "Dsus": [50, 57, 62, 64, 69]}
PROG_A = ["Dm", "C", "Dm", "G"]
PROG_B = ["Dm", "Am", "C", "Dm"]


def tune(theme, bar1, transpose=0, major=False):
    ev = []
    for (b, beat, d, m) in theme:
        mm = m + transpose
        if major and (mm % 12) in (5, 0):      # F -> F#, C -> C# (D major)
            mm += 1
        ev.append((bar(bar1 + b - 1, beat), d * Q, mm))
    return ev


class Band:
    def __init__(self):
        self.tr, self.send, self.cues = {}, {}, []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0):
        buf = self.track(name, 0.2)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(1150)


def _r():
    return rng(int(R.integers(1 << 30)))


def fiddle_line(b, notes, vel=0.7, p=0.15, gate=0.95, ens=1, trem=0.0, name="fiddle", vib=14.0):
    """fiddle melody; ens = number of players (detuned, slightly late, panned)"""
    for k in range(ens):
        for (t, d, m) in notes:
            rr = _r()
            det = 0 if k == 0 else rr.uniform(-9, 9)
            late = 0 if k == 0 else rr.uniform(0.004, 0.02)
            x = Nd.fiddle(F(m) * 2 ** (det / 1200), d * gate, vel * rr.uniform(0.92, 1.04) * (1 if k == 0 else 0.7), rr,
                          trem=trem, vib_depth=vib)
            b.add(name, x, t + late, p + (0 if k == 0 else rr.uniform(-0.5, 0.5)))


def lyre_arp(b, chord, t0, pattern, vel=0.5, step=0.5, p=-0.3, octave=0, dur=1.6, name="lyre"):
    notes = CH[chord]
    for i, idx in enumerate(pattern):
        if idx is None:
            continue
        rr = _r()
        b.add(name, Nd.lyre(F(notes[idx] + octave), vel * rr.uniform(0.85, 1.05), rr, dur=dur), t0 + i * step * Q + rr.normal(0, 0.003), p)


def drum(b, kind, t, vel, p=0.0, name="drum"):
    rr = _r()
    b.add(name, Nd.framedrum(kind, vel * rr.uniform(0.9, 1.05), rr), t + rr.normal(0, 0.002), p)


DANCE = [("doum", 0, 1.0), ("tek", 1.5, 0.55), ("doum", 2, 0.8), ("tek", 3, 0.6), ("tek", 3.5, 0.45)]
DRIVE = [("doum", 0, 1.0), ("tek", .5, .4), ("tek", 1, .6), ("doum", 1.5, .7), ("doum", 2, .9), ("tek", 2.5, .4), ("tek", 3, .65), ("tek", 3.5, .5)]


def drum_bar(b, bnum, pat, vel):
    for kind, beat, v in pat:
        drum(b, kind, bar(bnum, beat), vel * v)


def build():
    b = Band()
    for name, send in [("drone", 0.3), ("fiddle", 0.22), ("fiddle2", 0.25), ("lyre", 0.25), ("bass", 0.12), ("drum", 0.14),
                       ("lur", 0.3), ("hit", 0.25)]:
        b.track(name, send)

    # ============ HOOK 0 - 8.665: flash-forward to the whey vat in firelight - mysterious drone + heartbeat + lyre motif
    b.add("drone", Nd.drone([F(38), F(45)], 8.4, 0.55, _r(), att=2.5, rel=0.8), 0.2)
    for k, t in enumerate([1.165, 3.665, 6.165]):
        drum(b, "doum", t, 0.45 + 0.1 * k, -0.05)
        drum(b, "doum", t + 0.32, 0.3 + 0.07 * k, -0.05)
    for i, m in enumerate([62, 65, 69, 72, 69, 65]):          # "whey" motif on 'súrri mysu'
        rr = _r()
        b.add("lyre", Nd.lyre(F(m), 0.45, rr, dur=1.8), 2.9 + i * Q / 2, -0.25)
    for i, m in enumerate([69, 74, 76]):                       # pickup into bar 1 (beat 2.5 of bar 0)
        rr = _r()
        b.add("lyre", Nd.lyre(F(m), 0.5 + 0.08 * i, rr, dur=1.2), bar(0, 2.5 + i * 0.5), -0.25)
    drum(b, "tek", bar(0, 3), 0.5)
    drum(b, "tek", bar(0, 3.5), 0.6)
    b.cues.append((0.2, "hook: low bowed drone D2+A2 fades in (flash-forward to the whey vat), soft heartbeat frame drum"))
    b.cues.append((2.9, "lyre 'whey' motif D-F-A-C under 'súrri mysu'; lyre pickup A-D-E into bar 1"))

    # ============ PLAYFUL bars 1-12 (8.665 - 38.665): D dorian dance tune
    b.add("drone", Nd.drone([F(38), F(45), F(50)], bar(13) - bar(1), 0.42, _r(), att=0.4, rel=1.5), bar(1))
    for bb in range(1, 13):
        prog = PROG_A if bb in (1, 2, 3, 4, 9, 10, 11, 12) else PROG_B
        ch = prog[(bb - 1) % 4]
        pat = [0, 2, 3, 2, 4, 3, 2, 1] if bb < 9 else [0, 2, 3, 4, 3, 2, 3, 2]
        lyre_arp(b, ch, bar(bb), pat, 0.42 if bb < 5 else 0.48, octave=0, dur=1.2)
        rr = _r()
        b.add("bass", Nd.lyre(F(CH[ch][0] - 12), 0.75, rr, dur=1.6, bright=0.35), bar(bb), -0.05)
        b.add("bass", Nd.lyre(F(CH[ch][1] - 12), 0.55, rr, dur=1.2, bright=0.35), bar(bb, 2), -0.05)
        if bb < 9:
            drum_bar(b, bb, DANCE, 0.55 if bb < 5 else 0.62)
        else:
            drum_bar(b, bb, DRIVE, 0.7)
    fiddle_line(b, tune(THEME_A, 1), 0.62)                      # bars 1-4 (block 1 end / block 2)
    fiddle_line(b, tune(THEME_B, 5), 0.66)                      # bars 5-8 (block 3, the statues)
    fiddle_line(b, tune(THEME_A, 9), 0.72, ens=2)               # bars 9-12 (block 4, the duel)
    fiddle_line(b, [(t, d, m - 12) for (t, d, m) in tune(THEME_A, 9)], 0.42, name="fiddle2", p=-0.3)
    b.cues.append((bar(1), "bar 1 on 'Noregi': playful D-dorian dance - fiddle theme A, lyre arpeggios, lyre bass, frame drum (dance pattern)"))
    b.cues.append((bar(5), "theme B (block 3: Þorkell leaves, Skeggi, the statues)"))
    b.cues.append((bar(9), "duel (block 4): theme A with two fiddles + octave below, driving drum"))
    # turnaround bar 13: descending lyre + drum roll that dies into the night
    for i, m in enumerate([81, 77, 74, 69, 65, 62, 57, 53]):
        rr = _r()
        b.add("lyre", Nd.lyre(F(m), 0.5 - 0.03 * i, rr, dur=1.6), bar(13, i * 0.5), -0.2)
    for i in range(6):
        drum(b, "tek", bar(13, 2 + i * 0.25), 0.5 - 0.06 * i)
    b.add("fiddle", Nd.fiddle(F(62), 3.2, 0.5, _r(), vib_depth=10), bar(13, 0.0), 0.15)
    b.cues.append((bar(13), "turnaround: falling lyre run + fading drum, fiddle holds D into the night"))

    # ============ NIGHT bar 14 - (block 5, 40.74 - 50.6)
    t_n = T.BLOCK_START[5] - 0.15
    b.add("drone", Nd.drone([F(38), F(39)], 6.2, 0.4, _r(), att=1.2, rel=0.8, warm=900, breath=0.35), t_n)
    b.add("drone", Nd.drone([F(38), F(45), F(51)], bar(22, 2) - (t_n + 5.6), 0.5, _r(), att=1.5, rel=0.6, warm=1100, breath=0.3),
          t_n + 5.6)
    for bb in range(14, 22):                                     # heartbeat 'lub-dub'
        v = 0.55 + 0.04 * (bb - 14)
        drum(b, "big" if bb >= 18 else "doum", bar(bb), v)
        drum(b, "doum", bar(bb, 0.6), v * 0.7)
        drum(b, "doum", bar(bb, 2), v * 0.85)
        drum(b, "doum", bar(bb, 2.6), v * 0.6)
    for bb, ms in [(14, [50, 51]), (15, [50, 53]), (16, [50, 51]), (17, [48, 51])]:
        for k, m in enumerate(ms):
            rr = _r()
            b.add("lyre", Nd.lyre(F(m), 0.5, rr, dur=2.2, bright=0.4), bar(bb, k * 2), -0.2)
    b.cues.append((t_n, "night (block 5): drone D + Eb rub, heartbeat drum lub-dub, low lyre D/Eb"))
    # fire lit -> tremolo fiddles (minor second rub), rising
    tk = T.A["kveikja"]
    fiddle_line(b, [(tk, bar(18) - tk, 57)], 0.38, trem=11.0, name="fiddle2", p=-0.35, vib=4)
    fiddle_line(b, [(tk + 0.6, bar(18) - tk - 0.6, 58)], 0.3, trem=12.0, name="fiddle2", p=0.35, vib=4)
    b.cues.append((tk, "'kveikja': tremolo fiddles A3/Bb3 (minor-second rub) enter with the fire"))

    # ============ FIRE bars 18-22 (block 6): lyre ostinato in 8ths, drum drive, rising tremolo
    for bb in range(18, 22):
        for i, m in enumerate([50, 53, 57, 58, 57, 53, 50, 51]):
            rr = _r()
            b.add("lyre", Nd.lyre(F(m + 12), 0.42 + 0.03 * (bb - 18), rr, dur=0.9, bright=0.5), bar(bb, i * 0.5), -0.25)
        for i in range(8):
            drum(b, "tek", bar(bb, i * 0.5 + 0.25), 0.25 + 0.04 * (bb - 18))
    rise = [(18, 62, 63), (19, 63, 65), (20, 65, 66), (21, 66, 69)]
    for bb, m1, m2 in rise:
        fiddle_line(b, [(bar(bb), 2 * Q, m1), (bar(bb, 2), 2 * Q, m2)], 0.42 + 0.05 * (bb - 18), trem=13.0, ens=2, vib=5)
    b.cues.append((bar(18), "fire (block 6): lyre ostinato D-F-A-Bb, ticking drum, tremolo fiddles climbing D-Eb-F-F#-A"))
    # bar 22 first half: suspense into the break-out; drum roll swell
    for i in range(10):
        drum(b, "tek", bar(22, i * 0.2), 0.3 + 0.05 * i)
    fiddle_line(b, [(bar(22), 2 * Q, 70)], 0.5, trem=15.0, ens=2, vib=4)

    # ============ LIFT (block 7): from 'sleppa' (bar 22 beat 2 = 62.415) - D major
    tl = bar(22, 2)
    for i, m in enumerate([62, 66, 69, 74, 78, 81]):            # rising lyre gliss into the escape
        rr = _r()
        b.add("lyre", Nd.lyre(F(m), 0.5 + 0.04 * i, rr, dur=1.4, bright=0.65), tl + i * 0.1, -0.2)
    b.add("drone", Nd.drone([F(38), F(45), F(50)], bar(25) - tl + 0.2, 0.42, _r(), att=0.3, rel=0.4, warm=1800), tl)
    for bb in (23, 24):
        for k, ch in enumerate(["D", "A"] if bb == 23 else ["Gmaj", "A"]):
            lyre_arp(b, ch, bar(bb, k * 2), [0, 2, 3, 4], 0.5, dur=1.2)
            rr = _r()
            b.add("bass", Nd.lyre(F(CH[ch][0] - 12), 0.8, rr, dur=1.4, bright=0.35), bar(bb, k * 2), -0.05)
        drum_bar(b, bb, DRIVE, 0.62)
    fiddle_line(b, tune(THEME_A[:7], 23, major=True) + tune([(2, 0, .5, 79), (2, .5, .5, 76), (2, 1, .5, 73), (2, 1.5, .5, 76),
                                                               (2, 2, 2, 76)], 23), 0.7, ens=2)
    drum(b, "tek", bar(24, 3.5), 0.7)
    b.cues.append((tl, "'sleppa': LIFT - rising lyre glide, D major drone, theme A in D major (two fiddles), driving drum"))
    # 'Súrsson' (bar 25 = 68.665): triumphant tutti D major
    th = bar(25)
    for m, g, p in [(50, 1.0, -0.2), (57, 0.8, 0.2), (62, 0.8, -0.1), (66, 0.6, 0.15)]:
        b.add("lur", Nd.lur(F(m), 1.25, 0.8, _r(), "soft"), th, p, g)
    for m in [62, 69, 74, 78]:
        b.add("fiddle", Nd.fiddle(F(m), 1.6, 0.5, _r(), vib_depth=12), th, (m - 70) / 20)
    for i, m in enumerate([50, 57, 62, 66, 69, 74]):
        rr = _r()
        b.add("lyre", Nd.lyre(F(m), 0.6, rr, dur=2.2, bright=0.6), th + i * 0.018, -0.2)
    drum(b, "big", th, 1.0)
    drum(b, "doum", th + 0.01, 0.8)
    b.add("drone", Nd.drone([F(38), F(45), F(50), F(54)], 2.0, 0.5, _r(), att=0.05, rel=1.0, warm=2200), th)
    b.cues.append((th, "'Súrsson' (bar 25 = 68.665): triumphant D-major tutti - lur chord, fiddle double stops, lyre strum, big drum"))

    # ============ SEA (block 8 70.66 - 77.744): wide open fifths, long fiddle line, lyre waves, swell into the oath
    ts = T.BLOCK_START[8] - 0.3
    b.add("drone", Nd.drone([F(38), F(45), F(52)], CUT - ts + 0.2, 0.5, _r(), att=1.4, rel=0.2, warm=1300, breath=0.35), ts)
    waves_pat = [0, 1, 2, 3, 4, 3, 2, 1]
    for bb, ch in [(26, "Dsus"), (27, "C"), (28, "Bb")]:
        lyre_arp(b, ch, bar(bb), waves_pat, 0.4, dur=1.8, p=-0.35)
        lyre_arp(b, ch, bar(bb, 2), waves_pat[::-1], 0.36, dur=1.8, p=0.35)
        rr = _r()
        b.add("bass", Nd.lyre(F(CH[ch][0] - 12), 0.7, rr, dur=2.4, bright=0.3), bar(bb), -0.05)
    sea = [(bar(25, 3), 0.95 * Q, 69), (bar(26), 4 * Q, 74), (bar(27), 2 * Q, 76), (bar(27, 2), Q, 72), (bar(27, 3), Q, 69),
           (bar(28), CUT - bar(28) + 0.3, 70)]
    fiddle_line(b, sea, 0.62, ens=2, gate=0.98, vib=16)
    fiddle_line(b, [(bar(26), 8 * Q, 62), (bar(28), CUT - bar(28) + 0.3, 62)], 0.36, name="fiddle2", p=-0.4, gate=0.99)
    b.add("lur", Nd.lur(F(45), bar(26, 2) - bar(25, 3), 0.55, _r(), "soft"), bar(25, 3), 0.1, 0.6)
    b.cues.append((ts, "sea (block 8): open-fifth drone D-A-E, broad two-fiddle line, lyre 'wave' arpeggios, distant lur"))
    # oath swell: from 'fóstbræðralag' the strings tremolo and climb until the cut
    tf = T.A["fostbr"]
    fiddle_line(b, [(tf, CUT - tf + 0.3, 74), (tf + 0.4, CUT - tf, 75)], 0.4, trem=14.0, ens=1, name="fiddle2", vib=3)
    b.cues.append((tf, "'fóstbræðralag': tremolo D5/Eb5 rub swells under the slow ritual drum (SFX)"))

    # ============ HARD CUT on 'kippir'
    cut = np.ones(N)
    a = ns(CUT)
    cut[a:a + ns(0.004)] = np.linspace(1, 0, ns(0.004))
    cut[a + ns(0.004):] = 0
    b.cut = cut
    b.cues.append((CUT, "HARD CUT on 'kippir' (77.744, frame 2332) - music silent to the end; only the hard hit and one low boom (SFX)"))
    return b


TARGET = {"drone": -7.0, "fiddle": 0.0, "fiddle2": -5.0, "lyre": -3.5, "bass": -6.0, "drum": -3.5, "lur": -4.0, "hit": -4.0}


def render(b, ref=-20.0):
    hall = make_ir(1.9, 21, pre=0.02, hf=1.5)                 # wooden hall / fjord air
    dry = np.zeros((2, N))
    wet = np.zeros((2, N))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = round(L, 1)
        x = x * g
        b.tr[k] = x
        dry += x
        wet += b.send[k] * x
    out = dry + 0.75 * convolve_st(wet.mean(0), hall)
    out = hp(out, 32, 2)
    out *= b.cut[None, :]
    return out, levels
