# -*- coding: utf-8 -*-
"""Builds the production book (HTML artifact + markdown) from shots.py, jobs.json and reference-beatmap.json."""
import json, html, re
import shots
S = shots.SHOTS; E = shots.E
jobs = json.load(open("jobs.json"))
bm = json.load(open("reference-beatmap.json"))
beats = bm["beats"]; hits = bm["strong_onsets"]; cuts = bm["cuts"]; energy = bm["rms_per_second"]
esc = html.escape

def t(x): return f"{x:0.2f}"
def mmss(x):
    m = int(x // 60); s = x - 60 * m
    return f"{m}:{s:05.2f}"

# ---------- timeline SVG (to scale, 0..65.13 s) ----------
W = 1000; L = 36; R = 12; DUR = 65.13
def X(sec): return L + (W - L - R) * sec / DUR
rows = []
# energy curve (reference loudness per second, normalised)
emax = max(energy.values())
pts = []
for k in sorted(energy, key=int):
    sec = int(k); v = energy[k] / emax
    pts.append(f"{X(sec+0.5):.1f},{(60 - 44*v):.1f}")
area = "M" + f"{X(0):.1f},60 L" + " L".join(pts) + f" L{X(DUR):.1f},60 Z"
# beat ticks
beat_ticks = "".join(f'<line x1="{X(b):.1f}" y1="66" x2="{X(b):.1f}" y2="72" class="tk"/>' for b in beats)
hit_ticks = "".join(f'<line x1="{X(b):.1f}" y1="62" x2="{X(b):.1f}" y2="76" class="hit"/>' for b in hits)
cut_ticks = "".join(f'<line x1="{X(c):.1f}" y1="80" x2="{X(c):.1f}" y2="88" class="cut"/>' for c in cuts)
# our shots as blocks
acts = {"1":"A", "8":"B", "31":"C", "36":"D", "47":"E"}
act_of = {}
cur = "A"
for s in S:
    if s[0] in acts: cur = acts[s[0]]
    act_of[s[0]] = cur
blocks = ""
for i, s in enumerate(S):
    x0, x1 = X(s[1]), X(s[2]); y = 100 + (i % 2) * 14
    blocks += f'<rect x="{x0:.1f}" y="{y}" width="{max(x1-x0-0.6,0.8):.1f}" height="12" class="blk a{act_of[s[0]]}"><title>{esc(s[0])} · {esc(s[4])} · {t(s[1])}–{t(s[2])}</title></rect>'
    if (x1 - x0) > 16:
        blocks += f'<text x="{x0+2:.1f}" y="{y+9.5}" class="bl">{esc(s[0])}</text>'
# second labels
secs = "".join(f'<text x="{X(k):.1f}" y="140" class="ax">{k}</text>' for k in range(0, 66, 5))
timeline_svg = f'''<svg viewBox="0 0 {W} 146" class="tl" role="img" aria-label="Beat map of the reference track with the shot plan laid on top">
<path d="{area}" class="nrg"/>
<text x="0" y="56" class="lab">loud</text>
{beat_ticks}{hit_ticks}<text x="0" y="72" class="lab">beats</text>
{cut_ticks}<text x="0" y="87" class="lab">ref cuts</text>
{blocks}<text x="0" y="110" class="lab">shots</text>
{secs}</svg>'''

# ---------- sections ----------
def act_title(sid):
    return {"1":("ACT 1","The keys","0:00–0:10 · 14 beats · the hook"),
            "8":("ACT 2","Everything breaks","0:10–0:43 · 44 beats · one gag per hit"),
            "31":("ACT 3","The book","0:43–0:50 · 10 beats · the turn"),
            "36":("ACT 4","Everything gets fixed","0:50–1:00 · one cut per beat, then quarter beats"),
            "47":("ACT 5","Home","1:00–1:05 · the outro and the loop")}.get(sid)

def disp(p):
    return esc(p)

script_html = ""
for s in S:
    sid, tin, tout, beat, slug, action, els, cam, prompt, model, sfx, service = s
    at = act_title(sid)
    if at:
        script_html += f'<div class="acttitle"><span class="n">{at[0]}</span><span class="t">{esc(at[1])}</span><span class="time">{esc(at[2])}</span></div>'
    svc = f'<span class="svc">{esc(service)}</span>' if service else ""
    script_html += (f'<div class="scene"><div class="num">{sid}<small>{mmss(tin)}</small></div><div>'
                    f'<p class="slug">{esc(slug)} {svc}</p><p>{esc(action)}</p>'
                    f'<p class="note"><b>Beat</b> {esc(beat)} · <b>Sound</b> {esc(sfx)}</p></div></div>')

MODEL = {"K":"Kling 3.0 pro", "S":"Seedance 2.5 (physics)", "V":"Veo 3 (faces)"}
shots_html = ""
for s in S:
    sid, tin, tout, beat, slug, action, els, cam, prompt, model, sfx, service = s
    clip = jobs["clips"].get(sid, {})
    still = jobs["stills"].get(sid, "")
    status = clip.get("status", "not run")
    sclass = {"completed":"ok","failed":"bad"}.get(status, "todo")
    shots_html += (f'<div class="shot"><div class="head"><span class="id">{sid}</span><span>{t(tout-tin)} s · in {mmss(tin)}</span>'
                   f'<span>{esc(cam)}</span><span class="loc">{esc(", ".join("@"+e for e in els))}</span>'
                   f'<span class="st {sclass}">{esc(status)}</span></div><button data-copy type="button">Copy</button>'
                   f'<p class="prompt">{disp(prompt)}</p>'
                   f'<p class="tip">Model: {MODEL[model]}. Generate 5 s, use the best {t(tout-tin)} s. '
                   + (f'Start still <span class="mono">{esc(still)}</span>. ' if still and not still.startswith("FAILED") else "")
                   + (f'Clip <span class="mono">{esc(clip.get("job",""))}</span> ({esc(clip.get("model",""))}).' if clip.get("job") else "")
                   + '</p></div>')

elements_rows = "".join(f'<tr><td class="mono">@{esc(k)}</td><td class="mono">{esc(v)}</td><td class="mono">{esc(jobs["sheets"].get(k,"existing · from the first film"))}</td></tr>' for k, v in E.items())

# beat table for the editor: every beat with time and what lands there
beat_rows = ""
for i, b in enumerate(beats):
    what = [s[0] for s in S if abs(s[1]-b) < 0.06]
    hit = "●" if any(abs(h-b) < 0.08 for h in hits) else ""
    beat_rows += f'<tr><td class="mono">{i+1}</td><td class="mono">{t(b)}</td><td class="mono">{mmss(b)}</td><td>{hit}</td><td class="mono">{esc(", ".join(what))}</td></tr>'

sfx_rows = "".join(f'<tr><td class="mono">{s[0]}</td><td class="mono">{t(s[1])}</td><td>{esc(s[10])}</td></tr>' for s in S if s[10] and "none" not in s[10])

n_clips_ok = sum(1 for c in jobs["clips"].values() if c.get("status") == "completed")
n_clips_bad = sum(1 for c in jobs["clips"].values() if c.get("status") == "failed")
cut_v1 = jobs.get("cut_v1", {})

page = f'''<title>Fyrsti dagurinn</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* Layout: a sticky section nav on the left, one long reading column on the right; the beat timeline is the hero. */
  :root{{
    --ground:#ECE9F3; --ground-deep:#DED9EC; --paper:#FFFFFF; --ink:#27233A; --ink-soft:#736E8C;
    --line:#CFC9E0; --accent:#E8B923; --accent-ink:#3D2E00; --lav:#B9A7E6; --lav-ink:#2E2350; --chip:#F5F3FA; --code:#F7F5FC;
    --ok:#2E7D5B; --ok-soft:#DFF1E8; --bad:#A94B33; --bad-soft:#F6E3DE;
  }}
  @media (prefers-color-scheme: dark){{
    :root:not([data-theme="light"]){{
      --ground:#1E1B2A; --ground-deep:#16141F; --paper:#2A2638; --ink:#EDEAF6; --ink-soft:#A39DBB;
      --line:#3F3A52; --accent:#E8B923; --accent-ink:#2A2000; --lav:#8F7CC9; --lav-ink:#EDEAF6; --chip:#332F44; --code:#201D2C;
      --ok:#6FBD98; --ok-soft:#22352C; --bad:#D3826B; --bad-soft:#3A2822; color-scheme:dark;
    }}
  }}
  :root[data-theme="dark"]{{
    --ground:#1E1B2A; --ground-deep:#16141F; --paper:#2A2638; --ink:#EDEAF6; --ink-soft:#A39DBB;
    --line:#3F3A52; --accent:#E8B923; --accent-ink:#2A2000; --lav:#8F7CC9; --lav-ink:#EDEAF6; --chip:#332F44; --code:#201D2C;
    --ok:#6FBD98; --ok-soft:#22352C; --bad:#D3826B; --bad-soft:#3A2822; color-scheme:dark;
  }}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--ground);color:var(--ink);font-family:"Archivo","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:15.5px;line-height:1.55;padding-inline:16px;padding-block:0 64px}}
  .wrap{{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:200px minmax(0,1fr);gap:40px}}
  @media (max-width:820px){{.wrap{{grid-template-columns:1fr;gap:0}}}}
  header{{grid-column:1/-1;padding-block:40px 24px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto;gap:24px;align-items:end}}
  @media (max-width:820px){{header{{grid-template-columns:1fr}}}}
  .merki{{font-weight:700;letter-spacing:.32em;font-size:14px}}
  .undir{{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);margin-top:4px}}
  h1{{font-size:clamp(34px,5vw,54px);line-height:1;margin:22px 0 10px;font-weight:600;letter-spacing:-.02em;text-wrap:balance}}
  .lead{{max-width:62ch;color:var(--ink-soft);margin:0;font-size:16px}}
  .facts{{display:grid;grid-template-columns:repeat(2,auto);gap:6px 22px;font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;font-size:12.5px;color:var(--ink-soft)}}
  .facts b{{color:var(--ink);font-weight:500}}
  nav{{position:sticky;top:env(safe-area-inset-top,0px);align-self:start;padding-top:28px}}
  @media (max-width:820px){{nav{{position:static;padding:16px 0 0;display:flex;flex-wrap:wrap;gap:6px 14px}}}}
  nav a{{display:block;text-decoration:none;font-size:13px;color:var(--ink-soft);padding:5px 0;border-left:2px solid transparent;padding-left:10px}}
  @media (max-width:820px){{nav a{{border-left:0;padding-left:0}}}}
  nav a:hover{{color:var(--ink)}} nav a.act{{color:var(--ink);border-left-color:var(--accent)}}
  main{{padding-top:28px;min-width:0}}
  section{{padding-block:0 44px}}
  h2{{font-size:24px;font-weight:600;letter-spacing:-.01em;margin:0 0 6px;text-wrap:balance}}
  h2 + p.sub{{margin:0 0 20px;color:var(--ink-soft);max-width:62ch}}
  h3{{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;margin:30px 0 12px}}
  p{{max-width:68ch}}
  .tl{{width:100%;height:auto;display:block;margin:10px 0 6px}}
  .tl .nrg{{fill:var(--lav);opacity:.55}} .tl .tk{{stroke:var(--ink-soft);stroke-width:.8}} .tl .hit{{stroke:var(--accent);stroke-width:2}}
  .tl .cut{{stroke:var(--ink);stroke-width:1}} .tl .blk{{fill:var(--paper);stroke:var(--line);stroke-width:.6}}
  .tl .aA{{fill:var(--lav)}} .tl .aB{{fill:var(--bad-soft)}} .tl .aC{{fill:var(--accent)}} .tl .aD{{fill:var(--ok-soft)}} .tl .aE{{fill:var(--lav)}}
  .tl .bl{{font:9px "IBM Plex Mono",monospace;fill:var(--ink)}} .tl .ax{{font:10px "IBM Plex Mono",monospace;fill:var(--ink-soft);text-anchor:middle}}
  .tl .lab{{font:9px "IBM Plex Mono",monospace;fill:var(--ink-soft);text-transform:uppercase;letter-spacing:.08em}}
  .legend{{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12.5px;color:var(--ink-soft);margin:0 0 14px}}
  .legend i{{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}}
  .pitch{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}}
  @media (max-width:700px){{.pitch{{grid-template-columns:1fr}}}}
  .pitch div{{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:14px 16px;min-width:0}}
  .pitch b{{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:6px;font-weight:600}}
  .pitch p{{margin:0;font-size:14.5px}}
  .acttitle{{display:flex;align-items:baseline;gap:14px;margin:30px 0 12px;flex-wrap:wrap}}
  .acttitle .n{{font-family:"IBM Plex Mono",monospace;font-size:12px;background:var(--accent);color:var(--accent-ink);padding:3px 8px;border-radius:3px;font-weight:500}}
  .acttitle .t{{font-size:16px;font-weight:600;letter-spacing:.02em}}
  .acttitle .time{{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--ink-soft);margin-left:auto}}
  .scene{{display:grid;grid-template-columns:54px minmax(0,1fr);gap:0 14px;padding:14px 0;border-top:1px solid var(--line)}}
  .scene:last-child{{border-bottom:1px solid var(--line)}}
  .scene .num{{font-family:"IBM Plex Mono",monospace;font-size:14px;color:var(--ink);padding-top:2px;font-variant-numeric:tabular-nums;display:grid;gap:2px}}
  .scene .num small{{font-size:11px;color:var(--ink-soft)}}
  .scene .slug{{font-weight:600;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin:0 0 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}}
  .scene p{{margin:0}} .scene .note{{margin-top:6px;color:var(--ink-soft);font-size:13.5px}} .scene .note b{{color:var(--ink);font-weight:600}}
  .svc{{font-size:10.5px;letter-spacing:.08em;background:var(--lav);color:var(--lav-ink);padding:2px 7px;border-radius:3px;font-weight:600}}
  .callout{{background:var(--paper);border-left:3px solid var(--accent);padding:14px 18px;border-radius:0 6px 6px 0;margin-top:22px;max-width:72ch}}
  .callout p{{margin:0 0 8px}} .callout p:last-child{{margin:0}}
  table{{border-collapse:collapse;width:100%;font-size:14px;background:var(--paper);border:1px solid var(--line);border-radius:6px;overflow:hidden}}
  .tablewrap{{overflow-x:auto;max-width:100%}}
  th{{text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--chip)}}
  td{{padding:9px 14px;border-bottom:1px solid var(--line);vertical-align:top}} tr:last-child td{{border-bottom:0}}
  td.mono,.mono{{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12.5px;font-variant-numeric:tabular-nums;word-break:break-all}}
  .shot{{background:var(--paper);border:1px solid var(--line);border-radius:6px;margin-bottom:10px;padding:12px 14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 14px}}
  .shot .head{{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:var(--ink-soft)}}
  .shot .head .id{{color:var(--ink);font-weight:500;font-size:13px}} .shot .head .loc{{background:var(--chip);padding:1px 7px;border-radius:3px}}
  .shot .prompt{{grid-column:1/-1;margin:0;font-size:14.5px;max-width:none;line-height:1.5}}
  .shot .tip{{grid-column:1/-1;margin:0;color:var(--ink-soft);font-size:13.5px;max-width:none}}
  .shot button,.copyall{{align-self:start;font:500 12px "IBM Plex Mono",monospace;background:var(--chip);color:var(--ink);border:1px solid var(--line);border-radius:4px;padding:5px 9px;cursor:pointer}}
  .shot button:hover,.copyall:hover{{border-color:var(--ink-soft)}} .shot button:focus-visible,.copyall:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
  .shot button.ok{{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}}
  .st{{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;padding:2px 7px;border-radius:3px;font-weight:600}}
  .st.ok{{background:var(--ok-soft);color:var(--ok)}} .st.bad{{background:var(--bad-soft);color:var(--bad)}} .st.todo{{background:var(--chip);color:var(--ink-soft)}}
  ul{{padding-left:20px;max-width:70ch}} li{{margin-bottom:6px}}
  .rules li b{{font-weight:600}}
  .stat{{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0}}
  .stat div{{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:10px 14px;min-width:120px}}
  .stat .n{{font-family:"IBM Plex Mono",monospace;font-size:22px;font-weight:500}} .stat .l{{font-size:12px;color:var(--ink-soft)}}
  footer{{grid-column:1/-1;border-top:1px solid var(--line);margin-top:20px;padding-top:18px;font-size:13px;color:var(--ink-soft);display:flex;flex-wrap:wrap;gap:8px 24px}}
  @media (prefers-reduced-motion:no-preference){{.shot button{{transition:background .15s,border-color .15s}}}}
</style>

<div class="wrap">
  <header>
    <div>
      <div class="merki">SVIF</div>
      <div class="undir">Auglýsing 2 · framleiðslubók</div>
      <h1>Fyrsti dagurinn</h1>
      <p class="lead">A 65-second vertical comedy cut to the beat: a family gets the keys, the house falls apart one gag per hit, the SVIF book comes through the letterbox and the tradespeople fix everything, one cut per beat. Built on a frame-by-frame and beat-by-beat analysis of the ORO Newstead reel you sent.</p>
    </div>
    <div class="facts">
      <span>Runtime</span><b>1:05 · loops</b>
      <span>Format</span><b>9:16 · 1080×1920 · 24 fps</b>
      <span>Tempo</span><b>80.7 BPM · beat 0.743 s</b>
      <span>Cast</span><b>Hrefna · Kári · Ási · Snati</b>
      <span>Shots</span><b>49 (56 clips)</b>
      <span>Clips rendered</span><b>{n_clips_ok} ok · {n_clips_bad} failed</b>
      <span>Project</span><b>higgsfield.ai · svif-fyrsti-dagurinn</b>
    </div>
  </header>

  <nav aria-label="Sections">
    <a href="#ref">The reference, decoded</a>
    <a href="#concept">Concept &amp; cast</a>
    <a href="#timeline">Beat map</a>
    <a href="#script">Script</a>
    <a href="#shots">Shot list &amp; prompts</a>
    <a href="#assets">Assets &amp; Elements</a>
    <a href="#edit">Edit &amp; sound</a>
    <a href="#craft">How the good ones are made</a>
    <a href="#credits">Credits &amp; next steps</a>
  </nav>

  <main>
    <section id="ref">
      <h2>The reference, decoded</h2>
      <p class="sub">What the ORO Newstead reel actually does, measured: tempo, where the hits fall, how often it cuts, and the five devices that make it feel expensive.</p>
      <div class="stat">
        <div><div class="n">65.1 s</div><div class="l">runtime, 720×1280, 24 fps</div></div>
        <div><div class="n">80.7</div><div class="l">BPM (half-time feel, 86 beats)</div></div>
        <div><div class="n">50</div><div class="l">hard cuts</div></div>
        <div><div class="n">29</div><div class="l">cuts within 100 ms of a beat</div></div>
        <div><div class="n">0.26 s</div><div class="l">mean cut length in the last run</div></div>
      </div>
      <h3>Structure</h3>
      <div class="tablewrap"><table>
        <tr><th>Section</th><th>Time</th><th>Cuts</th><th>Mean shot</th><th>What happens</th></tr>
        <tr><td>Hook</td><td class="mono">0:00–0:14</td><td class="mono">5</td><td class="mono">2.3 s</td><td>Static wide of the man on the waterfront. The newspaper rises into frame. Hard hits at 3.0 (headline), 4.3 (glasses), 5.8 (eyes). Music stays sparse and quiet until 14 s.</td></tr>
        <tr><td>Build</td><td class="mono">0:14–0:30</td><td class="mono">10</td><td class="mono">1.5 s</td><td>He walks into the city still reading. Obstacles arrive one per hit: barrier tape, construction crew, ferry. Energy jumps at 14.4 and again at 20.</td></tr>
        <tr><td>Journey</td><td class="mono">0:30–0:47</td><td class="mono">13</td><td class="mono">1.5 s</td><td>Dog, park, traffic, the building. Every shot keeps the newspaper in frame. Big hits at 25.5, 29.3, 32.9, 40.8.</td></tr>
        <tr><td>Payoff</td><td class="mono">0:47–0:58</td><td class="mono">13</td><td class="mono">0.9 s</td><td>Amenities montage, one per beat: pool, lobby, cinema, gym, sauna, grill, wine. Faces get bigger and happier.</td></tr>
        <tr><td>Run-out</td><td class="mono">0:58–1:00</td><td class="mono">8</td><td class="mono">0.26 s</td><td>Eight quarter-beat flashes, then a hard stop.</td></tr>
        <tr><td>Outro</td><td class="mono">1:00–1:05</td><td class="mono">1</td><td class="mono">—</td><td>Music falls away. The newspaper blows out of his hands, drifts across the sky and lands at his feet on the waterfront: the opening frame. The reel loops without a seam.</td></tr>
      </table></div>
      <h3>The five devices worth stealing</h3>
      <ul class="rules">
        <li><b>One prop in every frame.</b> The newspaper is the ORO brand, carried through all 50 cuts. Ours is the lavender SVIF book: on the doormat in frame one, through the letterbox at 42.8, in the dog's mouth, on the coffee table, falling out of the sky at the end.</li>
        <li><b>A hit is a new angle, never a camera move.</b> Each strong onset lands on a hard cut to a tighter or wider angle of the same thing (headline → glasses → eyes → macro of the eye). Camera moves are slow and happen between hits.</li>
        <li><b>The first ten seconds are quiet and static.</b> The energy curve is near silent for 3 to 13 s; the hook is the face, not the music. Ours: the key, the door, Hrefna's eyes.</li>
        <li><b>Cut density doubles every section.</b> 2.3 s → 1.5 s → 0.9 s → 0.26 s. We copy the exact ramp: Act 2 one gag per 2 beats, Act 4 one fix per beat, then 8 quarter-beat inserts at 58.3.</li>
        <li><b>The ending is the beginning.</b> The last frame matches the first, so the reel plays again before the viewer realises. Shot 49 is shot 1.</li>
      </ul>
      <p>Realism is carried by three things, not by the model alone: one consistent hero (same hat, same glasses, same jacket in every shot), a warm late-afternoon grade with film grain in every clip, and extras who never look at the camera. Our equivalents are the four Elements, the one look string in every prompt, and tradespeople who are busy with their hands.</p>
    </section>

    <section id="concept">
      <h2>Concept and cast</h2>
      <p class="sub">Three people, one dog, one house, one book. No dialogue. Everything the house does wrong is a page in the book.</p>
      <div class="pitch">
        <div><b>Logline</b><p>A family gets the keys to a lovely old house. The toilet erupts, the window breaks, the lights die, the dog turns lavender. Then the SVIF book comes through the letterbox and, one cut per beat, the right people fix every single thing.</p></div>
        <div><b>Tone</b><p>Deadpan slapstick, played straight. Nobody screams; they stare at the camera. The comedy is in the timing (the hits) and in the family portrait at 40.8.</p></div>
        <div><b>The product line</b><p>Each disaster is a category in the book: plumber, drains, electrician, glazier, painter, curtains, flooring, fire safety, floor heating, deck, cleaning. The fix montage is literally the table of contents.</p></div>
      </div>
      <h3>Cast · Elements</h3>
      <div class="tablewrap"><table>
        <tr><th>Who</th><th>Handle</th><th>Look (locked for the whole film)</th></tr>
        <tr><td>Hrefna, mamma, 36</td><td class="mono">@hrefna</td><td>Ash-blonde low bun, freckles, grey-blue eyes. Mustard-yellow chunky knit, dark jeans, white sneakers. The yellow is there so lavender paint reads on it.</td></tr>
        <tr><td>Kári, pabbi, 38</td><td class="mono">@kari</td><td>Short reddish-brown beard, cropped auburn hair, slight dad belly. Navy quarter-zip fleece, khaki work trousers, brown boots. He is the one who gets hurt.</td></tr>
        <tr><td>Ási, 7</td><td class="mono">@asi</td><td>Tousled pale blond hair, missing front tooth. Cobalt-blue rain jacket over a green striped tee, red sneakers, football.</td></tr>
        <tr><td>Snati, the dog</td><td class="mono">@snati</td><td>Icelandic sheepdog, tan and cream, curled tail. Lavender from 29.3 to 58.6. He delivers the book.</td></tr>
        <tr><td>Píparinn, the plumber</td><td class="mono">@pipari</td><td>Mid fifties, grey stubble, navy overalls with reflective stripes, red toolbox. The first fixer at the door; the other trades are unnamed extras.</td></tr>
      </table></div>
    </section>

    <section id="timeline">
      <h2>Beat map</h2>
      <p class="sub">The reference track's loudness, its 86 beats (yellow = the strong hits), the 50 cuts in the reference, and our 49 shots laid on the same grid. Hover a block for the slug.</p>
      {timeline_svg}
      <div class="legend"><span><i style="background:var(--lav)"></i>Act 1 and 5</span><span><i style="background:var(--bad-soft)"></i>Act 2, it breaks</span><span><i style="background:var(--accent)"></i>Act 3, the book</span><span><i style="background:var(--ok-soft)"></i>Act 4, the fixes</span></div>
      <div class="callout"><p><strong>If you use a different track.</strong> Everything above is in <span class="mono">docs/svif-ad-2/reference-beatmap.json</span>. Run <span class="mono">beats.py</span> on the new track and the in/out points shift to its beats; the shot order and the ramp stay the same. Keep the tempo between 78 and 90 BPM or the one-beat fixes get too fast to read.</p></div>
    </section>

    <section id="script">
      <h2>Script</h2>
      <p class="sub">Numbered shots in order. The time is the in-point on the reference grid; the beat line says which hit the cut or the action lands on. Nobody speaks. The purple tag is the SVIF category the gag sells.</p>
      {script_html}
      <div class="callout">
        <p><strong>Why the dog is lavender.</strong> At 29.3 the paint can tips and Snati becomes the colour of the SVIF book. From then on the brand colour is in every frame without a logo, and at 44.4 the lavender dog carries the lavender book. He gets rinsed clean at 58.6, two beats before the end.</p>
        <p><strong>Why the family portrait holds for three beats.</strong> The reference breathes at 40.8 (energy dips, longest shot of the build). Ours is the low point: all four on the sofa, deadpan, drip into the bowl. It is the thumbnail and the still for the ad.</p>
      </div>
    </section>

    <section id="shots">
      <h2>Shot list and prompts</h2>
      <p class="sub">Paste-ready. Tag the Elements by handle exactly as written. Generate the still first with the same prompt, judge it at 100 %, then make the video from the still. Each clip is 5 s; the edit uses the best 0.7 to 2.5 s of it, so an action that lands anywhere in the clip is fine.</p>
      <p><button class="copyall" type="button" data-copyall>Copy all prompts</button></p>
      {shots_html}
      <div class="callout"><p><strong>Model rule.</strong> Kling 3.0 pro (10 credits a clip, Elements supported) for everything by default. Seedance 2.5 omni-reference (35 credits) for the water, glass and paint physics when Kling softens them. Veo 3 fast (22 credits) only for the two macro face shots if Kling's eyes look painted. Never run the whole set on the expensive model; re-roll the one shot that fails.</p></div>
    </section>

    <section id="assets">
      <h2>Assets and Elements</h2>
      <p class="sub">Everything lives in the Higgsfield project <span class="mono">svif-fyrsti-dagurinn</span>. Character sheets are split-screen (full body left, chest-up right) on mid-grey, people slightly underexposed, no logos anywhere. Locations are 9:16 stills from the exact angles the shots use.</p>
      <div class="tablewrap"><table><tr><th>Element</th><th>Element id</th><th>Sheet job</th></tr>{elements_rows}</table></div>
      <h3>Slop pass before you cut</h3>
      <ul>
        <li>I could not view the pixels from this session (the image host is blocked here), only submit and check status. Open the project and look at every sheet at 100 % before trusting a clip: six fingers, drifting beard, the dog's tail curl, the boy's missing tooth.</li>
        <li>Shot 30 and 47 must be the same framing. If they are not, regenerate 47 from the shot-30 still with Kling's end-frame mode.</li>
        <li>Shot 1 and 49 must be the same framing (the loop). Same fix.</li>
        <li>The book cover must read SVIF. If a model has invented a cover, redo the still with @prop_b-klingur earlier in the prompt.</li>
      </ul>
    </section>

    <section id="edit">
      <h2>Edit and sound</h2>
      <p class="sub">The edit is the product. Lay the track down first, drop markers on every beat, then place clips so the action (not the cut) lands on the marker.</p>
      <h3>Method, any editor (CapCut, Premiere, Resolve)</h3>
      <ol>
        <li>Import the track and add markers at every time in the beat table below (CapCut: Beat detection, then nudge to these values; Premiere/Resolve: paste the list as markers from <span class="mono">reference-beatmap.json</span>).</li>
        <li>Place each clip at its in-point. Scrub inside the 5 s clip until the action frame (key lands, water hits face, glass breaks) sits exactly on the hit marker, then trim the head to the in-point.</li>
        <li>Hard cuts only. No dissolves, no speed ramps except the three toilet bursts (shot 9), which may be slowed to 50 % so the three gushes land on 11.87, 12.05 and 12.26.</li>
        <li>Act 4: one clip per beat, 0.74 s each, in on the beat. Act 4 run-out: eight inserts of 0.19 s from 58.28.</li>
        <li>Grade once, globally: warm highlights, slight lift in the blacks, 35 mm grain at 20 %, then cool only the blackout shots 18, 19, 27, 29, 30.</li>
        <li>End: the last frame of 49 must match the first frame of 1. Export as a loop. Add svif.is bottom-left for the last 3 s in the editor; never ask a model to render text.</li>
      </ol>
      <h3>Sound design</h3>
      <p>Music only until 3.00. Then every hit gets one diegetic sound, no more: the sound is the joke's full stop. Kling renders sound on; harvest the splash, the glass and the plank from the clips and layer them under the track, 6 dB under the music except the three toilet bursts, which sit on top.</p>
      <div class="tablewrap"><table><tr><th>Shot</th><th>At</th><th>Sound</th></tr>{sfx_rows}</table></div>
      <h3>Beat table for markers</h3>
      <div class="tablewrap"><table><tr><th>#</th><th>s</th><th>m:ss</th><th>Hit</th><th>Shot in</th></tr>{beat_rows}</table></div>
    </section>

    <section id="craft">
      <h2>How the good ones are made</h2>
      <p class="sub">What the ORO reel, the Higgsfield Academy courses and the current model comparisons agree on, boiled down to what changes a result.</p>
      <ul class="rules">
        <li><b>Assets first, shots second.</b> Lock every character, location and prop as an Element before the first video. Describe a character in words once (the sheet); in scene prompts only tag the handle.</li>
        <li><b>Still, judge, then motion.</b> A bad start image is the most expensive mistake. Generate the frame, inspect the crop you will use, then animate. Re-roll the index that failed, never the whole set.</li>
        <li><b>One shot = characters + environment + camera + light + action.</b> Write prompts in that order; models weight the start of the prompt more. Only describe what is in frame; never write what is not there.</li>
        <li><b>Short clips, long edit.</b> Nobody ships a 5 s AI clip whole. The reference uses 50 fragments of 0.3 to 3 s. Generate long, use the best second. Flaws hide in short cuts; so does slop.</li>
        <li><b>Physics is the realism test.</b> Water, glass, paint, fabric: this is where models look fake. Kling 3.0 and Seedance 2.5 handle these best right now; Veo 3 is strongest on faces and native sound. Use the model per shot, not per film.</li>
        <li><b>Consistency comes from references, not luck.</b> Kling 3.0 Elements and Seedance's omni-reference take several images per generation; pass the character sheet and the location still together on every clip.</li>
        <li><b>Grain, grade and lens language.</b> One look string in every prompt (camera, lens, film stock, light) and one global grade in the edit. Mixed looks are what reads as AI.</li>
        <li><b>Sound sells the cut.</b> The ORO reel is 60 % sound design: every hit has a diegetic sound. Generate with sound on, keep the good foley, drop the rest.</li>
        <li><b>Loop it.</b> A reel that ends where it starts gets watched twice. Design the first and last frame together before anything else.</li>
      </ul>
      <h3>Models in your account, measured today</h3>
      <div class="tablewrap"><table>
        <tr><th>Model</th><th>Credits · 5 s · 9:16</th><th>Use it for</th><th>Watch out</th></tr>
        <tr><td>Kling 3.0 pro</td><td class="mono">10</td><td>Default. Elements, multi-shot, native sound, strong physics and camera control.</td><td>Aggressive moderation: some jobs fail with no reason (people plus water, dark rooms). Decline the preset suggestion. Retry with a shorter prompt or no start image.</td></tr>
        <tr><td>Seedance 2.5 omni</td><td class="mono">35 (720p)</td><td>Physics hero shots, image and video references, up to 30 s, video extension.</td><td>Three times the price; keep it for the 8 physics gags.</td></tr>
        <tr><td>Veo 3 fast</td><td class="mono">22</td><td>Macro faces, eyes widening, native dialogue if you ever add a line.</td><td>Start image only, no Elements; identity drifts from the sheet.</td></tr>
        <tr><td>Nano Banana Pro</td><td class="mono">~2 per still</td><td>Sheets, location stills, start frames with Elements.</td><td>Child plus stove was refused once; soften the wording.</td></tr>
      </table></div>
    </section>

    <section id="credits">
      <h2>Credits and next steps</h2>
      <p class="sub">Started at 2,381 credits on Ultra. Measured: 2 per still, 10 per Kling pro clip, 35 per Seedance clip.</p>
      <div class="tablewrap"><table>
        <tr><th>Stage</th><th>What</th><th>Credits</th></tr>
        <tr><td>Assets</td><td>5 character sheets + 5 location stills</td><td class="mono">~25</td></tr>
        <tr><td>Start frames</td><td>56 stills with Elements, 1 retry</td><td class="mono">~115</td></tr>
        <tr><td>Takes</td><td>56 clips on Kling pro, retries on failures</td><td class="mono">~600</td></tr>
        <tr><td>Reserve</td><td>Seedance re-rolls for the physics gags, 2 takes each</td><td class="mono">~560</td></tr>
      </table></div>
      <h3>What is done and what is yours</h3>
      <ul>
        <li>Done here: the analysis, the script, 11 Elements, 56 start frames, the first video pass on Kling 3.0, and the beat map. Everything is in the project; job ids are in <span class="mono">docs/svif-ad-2/jobs.json</span>.</li>
        <li>Yours: open the project, do the slop pass on the stills and clips, pick takes, and cut on the beat markers. Budget two hours for the edit; the markers do the timing.</li>
        <li>Music: the reference track is not licensed to you. Find a track at 78 to 90 BPM with a quiet 10-second intro and a hard stop near 60 s, re-run <span class="mono">beats.py</span>, and the grid moves with it.</li>
        <li>Then: generate 2 more takes of the 8 physics shots (3, 9, 12, 14, 21, 22, 31, 48) on Seedance 2.5 and pick the best.</li>
      </ul>
    </section>
  </main>
  <footer><span>Source: docs/svif-ad-2 on branch claude/eloquent-cannon-wd6m07</span><span>Reference: instagram.com/p/DdNp2_qp4qg</span><span>Previous film: Velkomin heim</span></footer>
</div>
<script>
(function(){{
  var links=[].slice.call(document.querySelectorAll('nav a'));
  var secs=links.map(function(a){{return document.querySelector(a.getAttribute('href'));}});
  function mark(){{var y=window.scrollY+120,cur=0;secs.forEach(function(s,i){{if(s&&s.offsetTop<=y)cur=i;}});links.forEach(function(a,i){{a.classList.toggle('act',i===cur);}});}}
  window.addEventListener('scroll',mark,{{passive:true}});mark();
  function copyText(t,b){{function done(){{var o=b.textContent;b.textContent='Copied';b.classList.add('ok');setTimeout(function(){{b.textContent=o;b.classList.remove('ok');}},1400);}}
    function fb(){{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{{document.execCommand('copy');}}catch(e){{}}ta.remove();done();}}
    try{{navigator.clipboard.writeText(t).then(done,fb);}}catch(e){{fb();}}}}
  document.querySelectorAll('button[data-copy]').forEach(function(b){{b.addEventListener('click',function(){{var p=b.parentElement.querySelector('.prompt');if(p)copyText(p.textContent.trim(),b);}});}});
  var all=document.querySelector('[data-copyall]');
  if(all)all.addEventListener('click',function(){{var t=[].slice.call(document.querySelectorAll('.shot')).map(function(s){{return s.querySelector('.id').textContent+'\\t'+s.querySelector('.prompt').textContent.trim();}}).join('\\n');copyText(t,all);}});
}})();
</script>
'''
open("fyrsti-dagurinn.html", "w").write(page)

# markdown twin for the repo
md = ["# Fyrsti dagurinn — SVIF auglýsing 2\n", "Beat-synced 65 s vertical comedy. See fyrsti-dagurinn.html for the full book.\n", "\n## Shots\n",
      "| # | in | out | beat | slug | model | service |", "|---|---|---|---|---|---|---|"]
for s in S:
    md.append(f"| {s[0]} | {t(s[1])} | {t(s[2])} | {s[3]} | {s[4]} | {MODEL[s[9]]} | {s[11]} |")
md.append("\n## Prompts\n")
for s in S:
    md.append(f"**{s[0]} · {s[4]}**  \n{s[8]}\n")
open("README.md", "w").write("\n".join(md))
print("built", len(page), "bytes")
