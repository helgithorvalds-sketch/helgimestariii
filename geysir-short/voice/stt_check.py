# Transcribe a take with ElevenLabs Scribe (Icelandic) and report word accuracy vs the script. usage: python3 stt_check.py take.mp3
import json, re, subprocess, sys, difflib
f = sys.argv[1]
out = subprocess.run(['curl', '-s', '-X', 'POST', 'https://api.elevenlabs.io/v1/speech-to-text', '-H', 'xi-api-key: proxy-injected',
                      '-F', 'model_id=scribe_v1', '-F', 'language_code=isl', '-F', f'file=@{f}'], capture_output=True, text=True).stdout
d = json.loads(out)
if 'text' not in d: print(out[:400]); sys.exit(1)
norm = lambda s: re.sub(r'[^\wáéíóúýþæöð ]', ' ', re.sub(r'\[[^\]]*\]', ' ', s.lower())).split()
ref = norm(open('narration.txt', encoding='utf-8').read()); hyp = norm(d['text'])
sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
match = sum(b.size for b in sm.get_matching_blocks())
print(f'{f}: {match}/{len(ref)} script words heard correctly ({100*match/len(ref):.0f}%)')
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag != 'equal': print(f'   {tag:8s} script: {" ".join(ref[i1:i2])!r:45s} heard: {" ".join(hyp[j1:j2])!r}')
