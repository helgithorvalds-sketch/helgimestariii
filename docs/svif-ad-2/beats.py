import librosa, numpy as np, json
y, sr = librosa.load("audio.wav", sr=22050)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
onset_env = librosa.onset.onset_strength(y=y, sr=sr)
onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time", backtrack=False)
rms = librosa.feature.rms(y=y)[0]
t_rms = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
# energy per second
sec = {}
for t, r in zip(t_rms, rms):
    sec.setdefault(int(t), []).append(float(r))
energy = {k: round(float(np.mean(v)), 4) for k, v in sec.items()}
# strong onsets (top 20% strength)
o_frames = librosa.onset.onset_detect(y=y, sr=sr, units="frames")
strengths = onset_env[o_frames]
thr = np.percentile(strengths, 80)
strong = [round(float(librosa.frames_to_time(f, sr=sr)),2) for f, s in zip(o_frames, strengths) if s >= thr]
print("tempo", float(np.atleast_1d(tempo)[0]))
print("beats", [round(float(b),2) for b in beats])
print("n_beats", len(beats))
print("strong_onsets", strong)
print("energy_per_sec", energy)
# silence/quiet stretches
quiet = [k for k,v in energy.items() if v < 0.25*max(energy.values())]
print("quiet_secs", quiet)
