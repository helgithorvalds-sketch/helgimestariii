#!/usr/bin/env bash
# wait for the home capture to finish, then capture the company film (48.8 s × 30 = 1464 frames)
cd "$(dirname "$0")"
while pgrep -f "capture.cjs home" >/dev/null; do sleep 15; done
BASE=http://127.0.0.1:5302 node capture.cjs biz frames-biz 0 732 > cap-biz-a.log 2>&1 &
BASE=http://127.0.0.1:5302 node capture.cjs biz frames-biz 732 1464 > cap-biz-b.log 2>&1 &
wait
echo done > biz-captured.flag
