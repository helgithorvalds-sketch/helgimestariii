#!/usr/bin/env bash
# Extract review keyframes from a rendered film: scripts/keyframes.sh out/promo.mp4 out/review
set -euo pipefail
IN=$1; OUT=$2; mkdir -p "$OUT"
FRAMES=(20 70 100 124 154 204 269 311 360 400 440 485 508 548 574 596 646 706)
for f in "${FRAMES[@]}"; do
  ffmpeg -v error -y -i "$IN" -vf "select=eq(n\,$f)" -vframes 1 "$OUT/f$(printf %03d "$f").png"
done
echo "${#FRAMES[@]} keyframes → $OUT"
