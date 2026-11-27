#!/usr/bin/env bash
# Full build: render picture (muted) → export cue table → sample-exact audio mixes → mux into final/.
# Audio is mixed outside Remotion so frame retries during rendering can never shift sound effects.
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER_ARGS=()
[ -n "${REMOTION_BROWSER:-}" ] && BROWSER_ARGS=(--browser-executable="$REMOTION_BROWSER")
npx remotion render src/index.ts Promo out/picture.mp4 --muted --timeout=120000 "${BROWSER_ARGS[@]}"
npx esbuild scripts/export-cues.ts --bundle --platform=node --format=cjs --log-level=warning --outfile=out/export-cues.cjs
node out/export-cues.cjs > out/cues.json
python3 scripts/mix-audio.py out/cues.json out/mix-raw.wav --gain=0 > /dev/null
I=$(ffmpeg -v info -i out/mix-raw.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-16 - ($I), 2))")   # master the music version to -16 LUFS; same gain for both
python3 scripts/mix-audio.py out/cues.json out/mix.wav --gain="$G"
python3 scripts/mix-audio.py out/cues.json out/mix-nobgm.wav --no-bgm --gain="$G"
mkdir -p final
for v in "promo:mix" "promo-nobgm:mix-nobgm"; do
  ffmpeg -v error -y -i out/picture.mp4 -i "out/${v##*:}.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart "final/${v%%:*}.mp4"
done
python3 scripts/check-sfx.py final/promo-nobgm.mp4
