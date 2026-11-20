"""Formula step 7: generate the narration sentence by sentence and lay out the timeline.

Backends:
  piper       free local Icelandic voices (default for this demo)
  elevenlabs  eleven_v4 with language_code "is"; needs an API key on api.elevenlabs.io
              (the session's proxy injects it, or set ELEVENLABS_API_KEY)

Usage: python build_audio.py --episode brot                       (ElevenLabs eleven_v3, Icelandic female voice)
       python build_audio.py --episode brot --backend piper --voice steinn
"""
import argparse, hashlib, json, os, shutil, subprocess, urllib.request, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
SR = 44100
GAP = 0.45          # silence between sentences
LEAD_IN = 2.2       # title card + chime before the first sentence
TAIL = 2.5

def to_pcm(src: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    # trim silence the engine adds at either end, keep 40 ms
    # gentle: a high threshold or a short margin clips soft onsets such as "n" in "nefnari"
    idx = np.where(np.abs(a) > 0.002)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(0.12 * SR)): idx[-1] + int(0.12 * SR)]
    return a

def synth_piper(text, out, voice, length_scale):
    model = f"/home/user/tts/voices/is_IS-{voice}-medium.onnx"
    subprocess.run(["/home/user/tts/venv/bin/piper", "-m", model, "-f", str(out), "--length-scale", str(length_scale)],
                   input=text.encode(), check=True, capture_output=True)

def synth_elevenlabs(text, out, voice, prev_text, model):
    body = {"text": text, "model_id": model, "language_code": "is",
            "voice_settings": {"stability": 0.6, "similarity_boost": 0.8}}
    if model != "eleven_v3":  # v3 does not take request stitching
        body["previous_text"] = prev_text or None
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json",
                                          "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "injected-by-proxy")})
    out.write_bytes(urllib.request.urlopen(req).read())

def tone(freqs, dur, vol=0.12):
    t = np.arange(int(dur * SR)) / SR
    env = np.exp(-t * 5.0) * np.minimum(1, t / 0.01)
    return sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs) * env * vol

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True)
    ap.add_argument("--backend", default="elevenlabs", choices=["piper", "elevenlabs"])
    # "Íslensk kennslurödd (kona)": designed in ElevenLabs Voice Design to speak native Icelandic, chosen by the creator
    ap.add_argument("--voice", default="vuKNwSXHmXUQ2BKzoJCH")
    ap.add_argument("--model", default="eleven_v3", help="ElevenLabs model (eleven_v3 or eleven_v4)")
    ap.add_argument("--length-scale", type=float, default=1.08)
    args = ap.parse_args()

    EP = HERE / "episodes" / args.episode
    script = json.loads((EP / "script.json").read_text())
    take_dir = EP / "audio" / f"{args.backend}-{args.voice}"
    take_dir.mkdir(parents=True, exist_ok=True)

    chime = np.concatenate([tone([523.25, 1046.5], 0.35), tone([659.25, 1318.5], 0.9)])
    think_cue = tone([880.0], 0.5, vol=0.06)
    track = [np.zeros(int(0.3 * SR)), chime]
    pos = lambda: sum(len(x) for x in track) / SR
    track.append(np.zeros(int(max(0, LEAD_IN - pos()) * SR)))

    timeline, prev = [], ""
    for s in script["sentences"]:
        key = hashlib.sha1(f"{s['text']}|{args.length_scale}|{args.model}".encode()).hexdigest()[:10]
        raw = take_dir / f"{s['id']}-{key}.{'mp3' if args.backend == 'elevenlabs' else 'wav'}"
        if not raw.exists():
            if args.backend == "piper":
                synth_piper(s["text"], raw, args.voice, args.length_scale)
            else:
                synth_elevenlabs(s["text"], raw, args.voice, prev, args.model)
        prev = s["text"]
        pcm = to_pcm(raw)
        track.append(np.zeros(int(s.get("gap_before", 0) * SR)))
        start = pos()
        track.append(pcm)
        end = pos()
        entry = {"id": s["id"], "part": s["part"], "text": s["text"], "start": round(start, 3), "end": round(end, 3),
                 "take": raw.name}
        if s.get("pause"):
            track.append(np.zeros(int(0.25 * SR)))
            entry["think_start"] = round(pos(), 3)
            track.append(think_cue)
            track.append(np.zeros(int((s["pause"] - len(think_cue) / SR) * SR)))
            entry["think_end"] = round(pos(), 3)
        timeline.append(entry)
        track.append(np.zeros(int(GAP * SR)))
    track.append(np.zeros(int(TAIL * SR)))
    track.append(tone([523.25, 783.99], 1.2))  # closing chime under the end card

    audio = np.concatenate(track)
    audio = audio / max(1e-6, np.abs(audio).max()) * 0.89
    with wave.open(str(EP / "audio" / "narration.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((audio * 32767).astype("<i2").tobytes())
    meta = {"backend": args.backend, "voice": args.voice, "duration": round(len(audio) / SR, 3),
            "series_tag": script["series_tag"], "title": script["title"], "sentences": timeline}
    (EP / "timeline.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    # optional captions (formula: full captions only as a toggle the viewer turns on)
    def ts(x):
        h, r = divmod(x, 3600); m, s = divmod(r, 60)
        return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}"
    srt = "\n".join(f"{i}\n{ts(e['start'])} --> {ts(e['end'] + 0.3)}\n{e['text']}\n" for i, e in enumerate(timeline, 1))
    (EP / "skjatexti.is.srt").write_text(srt)
    shutil.copy(EP / "audio" / "narration.wav", EP / "audio" / f"narration-{args.voice}.wav")
    (EP / "qa").mkdir(exist_ok=True)
    (EP / "qa" / f"timeline-{args.voice}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(f"{len(timeline)} sentences, {meta['duration']:.1f} s -> {EP}/audio/narration.wav, timeline.json")

if __name__ == "__main__":
    main()
