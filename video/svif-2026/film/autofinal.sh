#!/usr/bin/env bash
# finalize both films once their frames are complete, then copy them into the site
cd "$(dirname "$0")"
PUB=../svif/public/svif/film
mkdir -p "$PUB"
until [ "$(ls frames-home 2>/dev/null | grep -c '^[0-9]*\.jpg$')" -ge 1512 ] && ! pgrep -f "capture.cjs home" >/dev/null; do sleep 20; done
while pgrep -f "score.py --events home" >/dev/null; do sleep 5; done
./finalize.sh svif-heimili frames-home home-score.wav 4.0 30 > final-home.log 2>&1
cp out/svif-heimili.mp4 out/svif-heimili-poster.jpg "$PUB/"; [ -f out/svif-heimili-av1.mp4 ] && cp out/svif-heimili-av1.mp4 "$PUB/"
echo "home done $(date)"
until [ -f biz-captured.flag ] && [ "$(ls frames-biz 2>/dev/null | grep -c '^[0-9]*\.jpg$')" -ge 1464 ]; do sleep 20; done
while pgrep -f "score.py --events biz" >/dev/null; do sleep 5; done
./finalize.sh svif-fyrirtaeki frames-biz biz-score.wav 4.0 30 > final-biz.log 2>&1
cp out/svif-fyrirtaeki.mp4 out/svif-fyrirtaeki-poster.jpg "$PUB/"; [ -f out/svif-fyrirtaeki-av1.mp4 ] && cp out/svif-fyrirtaeki-av1.mp4 "$PUB/"
echo "biz done $(date)"
