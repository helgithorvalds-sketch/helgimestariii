# ElevenLabs TTS with character timestamps → <name>.mp3 + <name>.align.json   usage: python3 tts.py <voice_id> <name> [model]
import base64, json, sys, urllib.request
voice, name = sys.argv[1], sys.argv[2]; model = sys.argv[3] if len(sys.argv) > 3 else 'eleven_v3'
text = open('narration.txt', encoding='utf-8').read().strip()
body = {'text': text, 'model_id': model, 'language_code': 'is', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'speed': float(sys.argv[4]) if len(sys.argv) > 4 else 1.0}}
req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128',
                             data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'xi-api-key': 'proxy-injected'})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.read()[:500].decode(errors='replace')); sys.exit(1)
open(f'{name}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
json.dump({k: d.get(k) for k in ('alignment', 'normalized_alignment')}, open(f'{name}.align.json', 'w'), ensure_ascii=False)
a = d.get('alignment') or {}
print(name, 'chars', len(a.get('characters', [])), 'end', (a.get('character_end_times_seconds') or [0])[-1])
