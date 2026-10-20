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
strip iris1 3.9
strip card1 6.3
strip crowd 6.6
strip flip 14.0
strip store 20.6
strip tap 25.4
strip eq 34.0
strip dvc 40.0
strip credit 42.5
strip flow 47.0
strip chart 65.4
strip dive 68.0
strip suck 82.2
strip drop 82.8
strip stack 86.8
strip free 96.8
strip punch 99.2
strip night 107.5
strip morning 111.5
strip unlock 119.8
strip end 130.4
ls "$OUT"
