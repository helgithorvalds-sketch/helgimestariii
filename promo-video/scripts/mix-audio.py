# Sample-exact audio mix from the cue table (out/cues.json, exported from src/sfx.ts + src/timeline.ts),
# independent of Remotion's per-frame audio collection. Mirrors Main.tsx: BGM from frame 0 with fades,
# each SFX placed at `from`, trimmed to `dur` frames, scaled by `volume`. Then masters to -16 LUFS / -1.5 dBTP.
# Usage: python3 scripts/mix-audio.py out/cues.json out/mix.wav [--no-bgm] [--gain=<dB>]
# The same --gain is applied to both versions so SFX levels match between them (measure it on the BGM mix).
import json, subprocess, sys
cues = json.load(open(sys.argv[1])); out = sys.argv[2]; bgm_on = '--no-bgm' not in sys.argv
gain = next((float(a.split('=')[1]) for a in sys.argv if a.startswith('--gain=')), 0.0)
fps, total = cues['fps'], cues['total']; T = total / fps
inputs, chains, labels = [], [], []
def add(path, filt):
    i = len(inputs) // 2; inputs.extend(['-i', f'public/{path}']); lab = f'a{i}'
    chains.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,{filt}[{lab}]'); labels.append(f'[{lab}]')
if bgm_on:
    b = cues['bgm']; fi, fo = b['fadeIn'] / fps, b['fadeOut'] / fps
    add(b['src'], f"atrim=0:{T},volume={b['volume']},afade=t=in:st=0:d={fi},afade=t=out:st={T - fo}:d={fo}")
for s in cues['sfx']:
    start = s['from'] / fps; dur = (s.get('dur') or 90) / fps; trim = (s.get('trim') or 0) / fps
    ms = int(round(start * 1000))
    add(s['src'], f"atrim={trim}:{trim + dur},asetpts=PTS-STARTPTS,volume={s['volume']},adelay={ms}|{ms}")
n = len(labels)
graph = ';'.join(chains) + f";{''.join(labels)}amix=inputs={n}:normalize=0:duration=longest,apad=whole_dur={T},atrim=0:{T},volume={gain}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled,aresample=48000[out]"
cmd = ['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_s16le', '-ar', '48000', out]
subprocess.run(cmd, check=True)
print('wrote', out, 'inputs', n)
