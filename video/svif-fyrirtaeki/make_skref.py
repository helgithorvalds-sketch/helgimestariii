#!/usr/bin/env python3
"""Builds skref.html: the film's world (svif-fyrirtaeki.html) on a square 1080x1080 stage, driven by skref-clips.js
instead of the film's timeline. Render with e.g.
  HTML='skref.html?clip=1' VW=1080 VH=1080 PR=1 HIDE='#caps,#brand,#chapters,#count,#end' node capture.mjs web/skref1.mp4 0 8 30
"""
import pathlib, re
here = pathlib.Path(__file__).parent
src = (here / 'svif-fyrirtaeki.html').read_text(encoding='utf-8')
clips = (here / 'skref-clips.js').read_text(encoding='utf-8')

def sub1(s, old, new):
    assert s.count(old) == 1, old
    return s.replace(old, new)

s = src
s = sub1(s, '<title>SVIF fyrir fyrirtæki</title>', '<title>SVIF fyrir fyrirtæki: skref</title>')
s = sub1(s, '</style>', '#stage, #gl { width: 1080px; height: 1080px; }\n</style>')          # square stage
s = sub1(s, '<canvas id="gl" width="1920" height="1080"></canvas>', '<canvas id="gl" width="1080" height="1080"></canvas>')
s = sub1(s, 'const W = 1920, H = 1080, DUR = 52;', 'const W = 1080, H = 1080, DUR = 52;')
s = sub1(s, 'window.__ready = (async()=>{ layout(); await init(); render(0);', clips + '\nwindow.__ready = (async()=>{ layout(); await init(); renderClip(0);')
s = sub1(s, 'window.__seek = (t)=>{ render(t); return true; };', 'window.__seek = (t)=>{ renderClip(t); return true; };')
(here / 'skref.html').write_text(s, encoding='utf-8')
print('skref.html', len(s), 'bytes')
