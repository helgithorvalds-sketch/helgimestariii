"""Formula step 8 (automatic part): transcribe the finished narration with Icelandic Whisper and diff it
against the script, sentence by sentence. Each sentence is cut from the finished track and
prefixed with a fixed primer phrase, because the recognizer drops the opening of a clip.
It finds wrong, missing or swapped words. It cannot hear stress, vowel length or odd melody: a human must listen."""
import difflib, json, re, subprocess, sys
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

HERE = Path(__file__).parent
episode, voice = sys.argv[1], sys.argv[2]
EP = HERE / "episodes" / episode
tl = json.loads((EP / "qa" / f"timeline-{voice}.json").read_text())
def pcm16k(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)
track = pcm16k(EP / "audio" / f"narration-{voice}.wav")
# A fixed primer phrase in the same voice goes before every clip; the recognizer tends to drop the opening
# of a clip, so it drops part of the primer instead of the sentence's first word. The primer is then removed.
primer_wav = HERE / "qa-primer.wav"
if not primer_wav.exists():
    subprocess.run(["/home/user/tts/venv/bin/piper", "-m", "/home/user/tts/voices/is_IS-steinn-medium.onnx", "-f", str(primer_wav)],
                   input="Næsta setning.".encode(), check=True, capture_output=True)
primer = pcm16k(primer_wav)
model = WhisperModel("/home/user/tts/asr-model", device="cpu", compute_type="int8", cpu_threads=4)
norm = lambda t: re.sub(r"[^\wáéíóúýþæöð ]", " ", t.lower()).split()

def transcribe(e):
    clip = track[int((e["start"] - 0.05) * 16000): int((e["end"] + 0.1) * 16000)]
    x = np.concatenate([np.zeros(4000, np.float32), primer, np.zeros(5000, np.float32), clip, np.zeros(8000, np.float32)])
    segs, _ = model.transcribe(x, language="is", beam_size=5, condition_on_previous_text=False)
    w = norm(" ".join(s.text for s in segs))
    # strip whatever survived of the primer ("næsta setning")
    while w and w[0] in ("næsta", "setning", "setningu", "setninga", "æsta", "sta"):
        w = w[1:]
    return w

lines, errs, words, flagged = [], 0, 0, 0
for e in tl["sentences"]:
    b = transcribe(e)
    heard = " ".join(b)
    a = norm(e["text"])
    ops = [o for o in difflib.SequenceMatcher(None, a, b).get_opcodes() if o[0] != "equal"]
    n_err = sum(max(i2 - i1, j2 - j1) for _, i1, i2, j1, j2 in ops)
    errs += n_err; words += len(a); flagged += bool(ops)
    lines.append(f"{'ATH' if ops else 'OK '} {e['id']:>4}  handrit: {e['text']}\n           heyrt:   {heard}" +
                 "".join(f"\n           - '{' '.join(a[i1:i2])}' -> '{' '.join(b[j1:j2])}'" for _, i1, i2, j1, j2 in ops))
summary = (f"\nRödd {voice}: {errs} frávik í {words} orðum ({errs / words:.1%}), {flagged} af {len(tl['sentences'])} setningum með frávik.\n"
           "Frávik eru staðir til að hlusta á, ekki sannaðar villur: talgreinirinn gerir sjálfur 7–16% villur á íslensku.\n")
(EP / "qa" / f"asr-{voice}.txt").write_text("\n".join(lines) + summary)
print("\n".join(lines) + summary)
