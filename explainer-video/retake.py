"""Best-of-N for sentences the speech check flagged: generate N new takes with ElevenLabs, score each with the
Icelandic recognizer, keep the one it hears best as the cached take. Then run build_audio.py again.
Usage: python retake.py <episode> <id> [<id> ...] [--n 3]
A human must still listen: the recognizer cannot hear stress or vowel length."""
import argparse, difflib, hashlib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
sys.path.insert(0, str(Path(__file__).parent))
from build_audio import synth_elevenlabs

HERE = Path(__file__).parent
ap = argparse.ArgumentParser(); ap.add_argument("episode"); ap.add_argument("ids", nargs="+"); ap.add_argument("--n", type=int, default=3)
ap.add_argument("--voice", default="vuKNwSXHmXUQ2BKzoJCH"); ap.add_argument("--model", default="eleven_v3")
a = ap.parse_args()
EP = HERE / "episodes" / a.episode
script = {s["id"]: s for s in json.loads((EP / "script.json").read_text())["sentences"]}
take_dir = EP / "audio" / f"elevenlabs-{a.voice}"
take_dir.mkdir(parents=True, exist_ok=True)
pcm = lambda p: np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout, np.float32)
primer = pcm(HERE / "qa-primer.wav")
model = WhisperModel("/home/user/tts/asr-model", device="cpu", compute_type="int8", cpu_threads=4)
norm = lambda t: re.sub(r"[^\wáéíóúýþæöð ]", " ", t.lower()).split()
def score(path, text):
    x = np.concatenate([np.zeros(4000, np.float32), primer, np.zeros(5000, np.float32), pcm(path), np.zeros(8000, np.float32)])
    segs, _ = model.transcribe(x, language="is", beam_size=5, condition_on_previous_text=False)
    b = norm(" ".join(s.text for s in segs))
    while b and b[0] in ("næsta", "setning", "æsta", "sta", "a"): b = b[1:]
    ref = norm(text)
    ops = [o for o in difflib.SequenceMatcher(None, ref, b).get_opcodes() if o[0] != "equal"]
    return sum(max(i2 - i1, j2 - j1) for _, i1, i2, j1, j2 in ops), " ".join(b)
for sid in a.ids:
    text = script[sid]["text"]
    key = hashlib.sha1(f"{text}|1.08|{a.model}".encode()).hexdigest()[:10]
    final = take_dir / f"{sid}-{key}.mp3"
    cands = [final] if final.exists() else []
    for i in range(a.n):
        c = take_dir / f"{sid}-{key}-cand{i}.mp3"
        synth_elevenlabs(text, c, a.voice, "", a.model)
        cands.append(c)
    scored = sorted((score(c, text) + (c,) for c in cands), key=lambda r: r[0])
    for err, heard, c in scored: print(f"{sid}  {err} villur  {c.name}  heyrt: {heard}")
    best = scored[0][2]
    if best != final: final.write_bytes(best.read_bytes())
    for c in cands:
        if c != final and c.exists(): c.unlink()
    print(f"{sid}: valin taka með {scored[0][0]} villum\n")
