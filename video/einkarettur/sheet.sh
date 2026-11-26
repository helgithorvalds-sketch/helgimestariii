#!/bin/bash
# sheet.sh dir out.png cols : contact sheet of pngs in dir (sorted by name order given)
dir=$1; out=$2; cols=${3:-2}
files=$(ls $dir/*.png | sort -V)
n=$(echo "$files" | wc -l)
args=""; i=0; for f in $files; do args="$args -i $f"; i=$((i+1)); done
rows=$(( (n + cols - 1) / cols ))
ffmpeg -v error $args -filter_complex "$(for k in $(seq 0 $((n-1))); do echo -n "[$k]scale=960:-1,drawtext=text='$(basename $(echo "$files" | sed -n "$((k+1))p") .png)':x=10:y=10:fontsize=28:fontcolor=red[v$k];"; done)$(for k in $(seq 0 $((n-1))); do echo -n "[v$k]"; done)xstack=inputs=$n:layout=$(for k in $(seq 0 $((n-1))); do r=$((k / cols)); c=$((k % cols)); x=""; for q in $(seq 1 $c); do x="${x}+w0"; done; y=""; for q in $(seq 1 $r); do y="${y}+h0"; done; echo -n "${x:-0}_${y:-0}|" | sed 's/^+//; s/_+/_/'; done | sed 's/|$//'):fill=black" -y $out
