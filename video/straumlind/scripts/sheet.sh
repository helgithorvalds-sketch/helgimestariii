#!/usr/bin/env bash
# Tile PNG/JPG stills into one review sheet, 3 per row at 640 px wide: scripts/sheet.sh out.jpg frame1 frame2 ...
set -euo pipefail
out="$1"; shift
n=$#; cols=3; rows=$(( (n + cols - 1) / cols ))
inputs=(); for f in "$@"; do inputs+=(-i "$f"); done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$(for i in $(seq 0 $((n-1))); do printf '[%d:v]scale=640:-1[s%d];' $i $i; done)$(for i in $(seq 0 $((n-1))); do printf '[s%d]' $i; done)xstack=inputs=$n:layout=$(python3 -c "
n=$n;c=$cols
print('|'.join(f'{(i%c)*640}_{(i//c)*360}' for i in range(n)))
"):fill=0x222222" -frames:v 1 -q:v 3 "$out"
