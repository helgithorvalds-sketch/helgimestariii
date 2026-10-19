#!/usr/bin/env bash
# Review sheets for a rendered video: one frame per second, plus motion strips around fast moments.
#   bash scripts/review.sh [video] [outdir]
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO="${1:-out/video.mp4}"
OUT="${2:-out/review}"
mkdir -p "$OUT"

# 1 fps contact sheets, 30 frames per sheet
ffmpeg -y -loglevel error -i "$VIDEO" -vf "fps=1,scale=384:-1,tile=6x5:padding=4:color=0x222222" "$OUT/sec_%02d.jpg"

# motion strips: 12 frames at 15 fps around each moment (start time in seconds)
strip() {
  local name="$1" start="$2"
  ffmpeg -y -loglevel error -ss "$start" -i "$VIDEO" -frames:v 12 -vf "fps=15,scale=480:-1,tile=6x2:padding=4:color=0x222222" "$OUT/strip_${name}.jpg"
}
strip coin 0.3
strip euler 1.8
strip crowd 4.4
strip tap 9.1
strip tag 16.8
strip rise 25.7
strip dive 29.4
strip slam 45.9
strip math 52.0
strip unlock 75.8
strip knock 82.3
strip end 87.5
ls "$OUT"
