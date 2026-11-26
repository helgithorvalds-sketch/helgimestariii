#!/bin/bash
# Render the whole video with 4 workers, then concat and mux audio.
set -euo pipefail
cd "$(dirname "$0")"
DUR=$(node stills.js .probe 2>/dev/null | grep -oP 'duration \K[0-9.]+')
TOTAL=$(python3 -c "print(round($DUR*30))"); W=4; per=$(( (TOTAL + W - 1) / W ))
echo "duration $DUR s, $TOTAL frames"
rm -rf .probe seg_*.mp4 video_noaudio.mp4 events.json
for i in $(seq 0 $((W-1))); do s=$((i*per)); e=$(( (i+1)*per )); node render.js seg_$i.mp4 $s $e $((8810+i)) > log_$i.txt 2>&1 & done
wait
cat log_*.txt | grep -E "done|ERR"
printf "file 'seg_%d.mp4'\n" $(seq 0 $((W-1))) > segs.txt
ffmpeg -v error -y -f concat -safe 0 -i segs.txt -c copy video_noaudio.mp4
python3 audio.py events.json soundtrack.wav
ffmpeg -v error -y -i video_noaudio.mp4 -i soundtrack.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart einkarettur_svif.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 einkarettur_svif.mp4
