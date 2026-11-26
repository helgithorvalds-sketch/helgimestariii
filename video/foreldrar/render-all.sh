#!/bin/bash
# Renders the full video in 3 parallel parts, joins them and adds the music.
set -e
cd "$(dirname "$0")"
END=147.6
node render.mjs --from 0 --to 49.2 --out out/parts/p1.mp4 > out/parts/p1.log 2>&1 &
node render.mjs --from 49.2 --to 98.4 --out out/parts/p2.mp4 > out/parts/p2.log 2>&1 &
node render.mjs --from 98.4 --to $END --out out/parts/p3.mp4 > out/parts/p3.log 2>&1 &
wait
printf "file 'p1.mp4'\nfile 'p2.mp4'\nfile 'p3.mp4'\n" > out/parts/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/parts/list.txt -c copy out/parts/video.mp4
# music: bar 0 of the video (0.1 s) = first downbeat of the track (2.135 s)
ffmpeg -v error -y -i out/parts/video.mp4 -ss 2.035 -i audio/music_raw.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k \
  -af "afade=t=in:st=0:d=0.05,afade=t=out:st=$(echo "$END - 1.2" | bc):d=1.2" -t $END out/svif-foreldrar.mp4
echo DONE
