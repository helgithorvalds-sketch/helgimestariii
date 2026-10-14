#!/bin/sh
# Usage: ./sheet.sh out.jpg  (tiles the 6 frames in frames/ into a 3x2 sheet)
set -- "$1" $(ls frames/f_*.jpg | sort -t_ -k2 -g)
out=$1; shift
ffmpeg -loglevel error -y -i $1 -i $2 -i $3 -i $4 -i $5 -i $6 -filter_complex "[0][1][2]hstack=3[a];[3][4][5]hstack=3[b];[a][b]vstack,scale=1920:-1" "$out"
