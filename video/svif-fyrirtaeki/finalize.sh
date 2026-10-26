#!/bin/bash
# Joins the rendered segments, adds the soundtrack at -14 LUFS, and writes the full and the small (<30 MB) film.
set -euo pipefail
cd "$(dirname "$0")"
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\nfile 'seg2.mp4'\n" > out/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/list.txt -c copy out/silent.mp4
ffmpeg -v error -y -i audio/out/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 out/mix-14.wav
ffmpeg -v error -y -i out/silent.mp4 -i out/mix-14.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart SVIF-fyrirtaeki.mp4
ffmpeg -v error -y -i SVIF-fyrirtaeki.mp4 -c:v libx264 -preset slow -b:v 3500k -maxrate 4000k -bufsize 8000k -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart SVIF-fyrirtaeki-litil.mp4
ffmpeg -v error -y -i out/mix-14.wav -c:a libmp3lame -b:a 192k music.mp3
ls -la SVIF-fyrirtaeki*.mp4 music.mp3
