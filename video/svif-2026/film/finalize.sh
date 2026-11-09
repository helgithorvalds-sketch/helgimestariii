#!/usr/bin/env bash
# ./finalize.sh <name> <framesdir> <score.wav> <posterTime> [fps=30]
# -> out/<name>.mp4 (1080p H.264, sRGB-tagged, light temporal grain against banding), out/<name>-720.mp4,
#    out/<name>-poster.jpg (and out/<name>-av1.mp4 when SVT-AV1 is available)
set -euo pipefail
NAME=$1; FR=$2; WAV=$3; PT=${4:-4}; FPS=${5:-30}
mkdir -p out
N=$(ls "$FR" | grep -c '\.jpg$')
DUR=$(python3 -c "print($N/$FPS)")
TAGS="-color_primaries bt709 -color_trc iec61966-2-1 -colorspace bt709 -color_range tv"
GRAIN="noise=c0s=2:c0f=t,format=yuv420p"
ffmpeg -y -loglevel error -framerate "$FPS" -i "$FR/%05d.jpg" -i "$WAV" \
  -vf "$GRAIN" -c:v libx264 -preset veryslow -crf 19 -profile:v high -level:v 4.0 -g $((FPS*2)) -keyint_min $FPS \
  -x264-params "aq-mode=3:deblock=-1,-1" $TAGS \
  -c:a aac -b:a 192k -ar 48000 -t "$DUR" -movflags +faststart "out/$NAME.mp4"
ffmpeg -y -loglevel error -i "out/$NAME.mp4" -vf "scale=1280:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 21 -g $((FPS*2)) $TAGS \
  -c:a aac -b:a 128k -movflags +faststart "out/$NAME-720.mp4"
ENC=$(ffmpeg -hide_banner -encoders 2>/dev/null || true)
if [[ "$ENC" == *libsvtav1* ]]; then
  ffmpeg -y -loglevel error -framerate "$FPS" -i "$FR/%05d.jpg" -i "$WAV" -vf "format=yuv420p10le" \
    -c:v libsvtav1 -preset 4 -crf 28 -g $((FPS*2)) -svtav1-params "tune=0:film-grain=8" $TAGS \
    -c:a aac -b:a 160k -ar 48000 -t "$DUR" -movflags +faststart "out/$NAME-av1.mp4" || echo "av1 skipped"
fi
F=$(python3 -c "print(f'{int(round($PT*$FPS)):05d}')")
python3 -c "from PIL import Image; Image.open('$FR/$F.jpg').convert('RGB').save('out/$NAME-poster.jpg', quality=84, optimize=True, progressive=True)"
ls -la out/ | grep "$NAME"
