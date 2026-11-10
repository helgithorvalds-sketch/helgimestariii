#!/usr/bin/env bash
# when the company film's frames are complete: full-quality encodes, the ≤10 MB web H.264, copy into the site
cd "$(dirname "$0")"
until [ "$(ls frames-biz 2>/dev/null | grep -c '^[0-9]*\.jpg$')" -ge 1302 ] && ! pgrep -f "capture.cjs biz" >/dev/null; do sleep 20; done
./finalize.sh svif-fyrirtaeki frames-biz biz-score.wav 4.0 30 > final-biz-r2.log 2>&1
N=biz; DUR=$(python3 -c "print(1302/30)")
for P in 1 2; do ffmpeg -y -loglevel error -framerate 30 -i frames-biz/%05d.jpg -i biz-score.wav -vf "format=yuv420p" -c:v libx264 -preset slower -b:v 1250k -maxrate 2400k -bufsize 3800k -pass $P -passlogfile out-lite/$N -profile:v high -level:v 4.0 -g 60 -x264-params "aq-mode=3:deblock=-1,-1" -color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range tv $( [ $P = 1 ] && echo "-an -f mp4 /dev/null" || echo "-c:a aac -b:a 112k -ar 48000 -t $DUR -movflags +faststart out-lite/svif-fyrirtaeki.mp4" ); done
PUB=../svif/public/svif/film
cp out-lite/svif-fyrirtaeki.mp4 $PUB/svif-fyrirtaeki.mp4 && cp out/svif-fyrirtaeki-av1.mp4 $PUB/ && cp out/svif-fyrirtaeki-poster.jpg $PUB/ && ffmpeg -y -loglevel error -i out/svif-fyrirtaeki.mp4 -frames:v 1 -q:v 3 $PUB/svif-fyrirtaeki-frame0.jpg
ls -la $PUB | awk '{print $5, $9}'; echo "biz film done $(date -u +%H:%M)"
