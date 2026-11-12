# Builds the final Svif cover (November–December 2026 print run).
# Front: A3 (Nýi kaflinn, heima photo). Back: zoomed sunbeam on the wall.
#   designs/v4-svif-2026.html        screen version, 1000 x 1000 (render at 2.4 -> 2400 px)
#   designs/v4-svif-2026-prent.html  print version with 3 mm bleed on each side (20 x 20 cm trim)
import os
HERE = os.path.dirname(os.path.abspath(__file__))
TPL = r'''<!doctype html>
<html lang="is"><head><meta charset="utf-8"><title>Svif Nýi kaflinn __NAME__</title>
<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="v2.css">
<style>
  :root { --line: __LINE__; --lw: __LW__; --b: __B__px; }
  .page { width: calc(1000px + 2 * var(--b)); height: calc(1000px + 2 * var(--b)); }
  .safe { position: absolute; left: var(--b); top: var(--b); width: 1000px; height: 1000px; }
  /* broken frame from A3: top-left corner, lower left, long right side, bottom-right */
  .fr { background: #fff; opacity: .75; }
  .fr.h { height: var(--lw); } .fr.v { width: var(--lw); }

  .v3 .bg { background-image: url(../src/bg1.jpg); background-size: 100% auto; background-position: 0 __FRONTPOS__; filter: brightness(1.1) contrast(.95) saturate(1.02); }
  .v3 .tint { background: rgba(25,22,20,.04); }
  .v3 .shade { background: linear-gradient(180deg, rgba(40,30,20,.26) 0%, rgba(40,30,20,0) 22%, rgba(40,30,20,0) 70%, rgba(40,30,20,.32) 100%); }
  .v3 h1 { position: absolute; left: 0; right: 0; top: 326px; text-align: center; font-family: "Inter", sans-serif; font-weight: 200; font-size: 106px; letter-spacing: .035em; line-height: 1; text-shadow: 0 2px 30px rgba(60,40,20,.16); }
  .v3 .dv { left: 170px; right: 170px; top: 476px; }
  .v3 .dv img { width: 92px; }
  .v3 .dv .ln, .v3 .dv .ar { background: #fff; opacity: .9; }
  .v3 .dv .ar::after { border-color: #fff; }
  .v3 .sub { position: absolute; left: 0; right: 0; top: 538px; text-align: center; font-size: 16.5px; line-height: 1.55; letter-spacing: .06em; text-transform: uppercase; font-weight: 300; }
  .v3 .web { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; font-size: 15.5px; letter-spacing: .3em; font-weight: 400; }

  /* back: zoomed in on the sunlit wall, mirrored, so it does not read as the same photo */
  .v3b .bg { __BACKBG__ }
  .v3b .tint { background: linear-gradient(180deg, rgba(20,18,16,.16), rgba(20,18,16,.26)); }
  .v3b h2 { position: absolute; left: 0; right: 0; top: 318px; text-align: center; font-family: "Inter", sans-serif; font-weight: 200; font-size: 68px; letter-spacing: .04em; line-height: 1; }
  .v3b .dv { left: 250px; right: 250px; top: 420px; }
  .v3b .dv img { width: 78px; }
  .v3b .body { position: absolute; left: 50%; transform: translateX(-50%); top: 500px; width: 560px; text-align: center; font-size: 19px; line-height: 1.62; font-weight: 300; }
  /* QR alone in the bottom-left corner, level with the bottom corner text */
  .v3b .qr { position: absolute; left: 64px; bottom: 64px; width: 100px; height: 100px; }  /* 100 px = 20 mm printed */
</style></head><body>

<div class="page v3 grain" id="front">
  <div class="bg"></div><div class="layer tint"></div><div class="layer shade"></div>
  <div class="safe">
  __FRAME__
  <div class="corner" style="left:64px;top:62px">Velkomin</div>
  <div class="corner" style="left:0;right:0;top:62px;text-align:center">65°N · 19°W</div>
  <div class="corner" style="right:64px;top:62px;text-align:right">Fyrir heimilið</div>

  <h1>NÝI KAFLINN</h1>
  <div class="dv"><span class="ln"></span><img src="../src/logo-white.png" alt="Svif"><span class="ln"></span></div>
  <div class="sub">Velkomin í nýja heimilið þitt<br>Sérkjör frá traustum fyrirtækjum</div>
  <div class="corner" style="left:64px;bottom:64px">Allt fyrir<br>nýja húseigendur</div>
  <div class="web">SVIF.IS</div>
  <div class="corner" style="right:64px;bottom:64px;text-align:right">Tilboð<br>og afslættir</div>
  </div>
</div>

<div class="page v3 v3b grain" id="back">
  <div class="bg"></div><div class="layer tint"></div>
  <div class="safe">
  __FRAME__
  <div class="corner" style="left:64px;top:62px">SVIF.IS</div>
  <div class="corner" style="right:64px;top:62px;text-align:right">2026</div>

  <h2>TIL HAMINGJU</h2>
  <div class="dv"><span class="ln"></span><img src="../src/roof-white.png" alt=""><span class="ln"></span></div>
  <p class="body">Í þessum bæklingi finnur þú traust fyrirtæki sem hjálpa þér að koma þér fyrir á nýju heimili, með sérkjörum fyrir nýja húseigendur.</p>
  <img class="qr" src="../src/qr-white.svg" alt="QR kóði á svif.is">

  <img src="../src/logo-white.png" alt="Svif" style="position:absolute;left:50%;transform:translateX(-50%);bottom:64px;width:150px">
  <div class="corner" style="right:64px;bottom:64px;text-align:right">Hannað, prentað<br>og sent af Svif</div>
  </div>
</div>

</body></html>
'''
FRAME = '''<span class="fr h" style="left:34px;top:34px;width:250px"></span>
  <span class="fr v" style="left:34px;top:34px;height:250px"></span>
  <span class="fr v" style="left:34px;top:640px;height:326px"></span>
  <span class="fr v" style="right:34px;top:150px;height:816px"></span>
  <span class="fr h" style="right:34px;bottom:34px;width:300px"></span>'''
BACK = "background-image: url(../src/bak-solargeisli.jpg); background-size: cover; background-position: center; filter: none;"  # made by tools/back_photo.py

# 20 cm trim = 1000 px, so 3 mm bleed = 15 px
for fname, b in [('v4-svif-2026', 0), ('v4-svif-2026-prent', 15)]:
    front_y = '-62px' if b == 0 else f'{-62 * 1.03 + b:.0f}px'   # keeps the same view inside the trim
    back = BACK
    html = (TPL.replace('__NAME__', fname).replace('__LINE__', 'rgba(255,255,255,.78)').replace('__LW__', '1px')
               .replace('__B__', str(b)).replace('__FRAME__', FRAME).replace('__FRONTPOS__', front_y).replace('__BACKBG__', back))
    open(os.path.join(HERE, '..', 'designs', fname + '.html'), 'w').write(html)
    print('wrote', fname)
