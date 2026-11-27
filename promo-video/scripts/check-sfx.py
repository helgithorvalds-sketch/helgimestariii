# Measure where each SFX actually starts in the rendered SFX-only track (cross-correlation), vs. the planned frame.
# Usage: python3 scripts/check-sfx.py out/promo-nobgm.mp4
import subprocess, sys, numpy as np
SR = 16000
def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
SHOTS = {}; f = 0
for k, d in [('open', 104), ('hero', 177), ('title', 59), ('deal', 162), ('calls', 103), ('outro', 145)]:
    SHOTS[k] = f; f += d
at = lambda s, o, p: SHOTS[s] + o - round(p * 30)
S = 'public/audio/sfx/'
CUES = [('hero lamp', at('hero', 2, .005), 'fs-253659.mp3'), ('hero woosh', at('hero', 60, .955), 'fs-683096.mp3'), ('hero reseat', at('hero', 142, .335), 'fs-571577.mp3'),
        ('title swoosh', at('title', 5, .185), 'fs-786514.mp3'), ('deal 1', at('deal', 46, .335), 'fs-571577.mp3'), ('deal swoosh', at('deal', 62, .075), 'fs-632763.mp3'),
        ('call 1', at('calls', 28, .335), 'fs-648387-norm.mp3'), ('call 5', at('calls', 76, .335), 'fs-648387-norm.mp3'),
        ('outro swoosh', at('outro', 6, .075), 'fs-632763.mp3'), ('outro impact', at('outro', 44, .605), 'fs-754564.mp3')]
mix = pcm(sys.argv[1])
for name, frame, file in CUES:
    s = pcm(S + file)[: SR // 2]
    t0 = int(frame / 30 * SR); w = int(0.4 * SR)
    seg = mix[max(0, t0 - w): t0 + w + len(s)]
    c = np.correlate(seg, s, 'valid')
    lag = (int(np.argmax(np.abs(c))) + max(0, t0 - w) - t0) / SR * 30
    print(f'{name:14s} planned f{frame:4d}  measured offset {lag:+5.2f} f')
