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
  ffmpeg -y -loglevel error -ss "$start" -t 0.8 -i "$VIDEO" -frames:v 1 -vf "fps=15,scale=480:-1,tile=6x2:padding=4:color=0x222222" "$OUT/strip_${name}.jpg"
}
strip coin 0.2
strip crowd 4.6
strip dive 8.0
strip flip 14.0
strip store 19.3
strip tap 25.4
strip dvc 36.0
strip credit 39.5
strip flow 43.0
strip butter 53.3
strip drop 61.0
strip compare 77.5
strip hero 85.2
strip free3 95.2
strip punch 102.5
strip night 113.0
strip morning 115.5
strip unlock 124.2
strip end 133.0
ls "$OUT"
