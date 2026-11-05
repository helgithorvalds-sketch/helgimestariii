# Builds the round-3 Nýji kaflinn pages (white lines and coloured lines) from one template.
import os
HERE = os.path.dirname(os.path.abspath(__file__))
TPL = r'''<!doctype html>
<html lang="is"><head><meta charset="utf-8"><title>Svif Nýji kaflinn __NAME__</title>
<link rel="stylesheet" href="base.css"><link rel="stylesheet" href="v2.css">
<style>
  :root { --line: __LINE__; --lw: __LW__; }
  /* broken frame from A3: top-left corner, lower left, long right side, bottom-right */
  .fr { background: #fff; opacity: .75; }
  .fr.h { height: var(--lw); } .fr.v { width: var(--lw); }

  .v3 .bg { background-image: url(../src/bg1.jpg); background-size: 100% auto; background-position: 0 -62px; filter: brightness(1.1) contrast(.95) saturate(1.02); }
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
  .v3b h2 { position: absolute; left: 0; right: 0; top: 268px; text-align: center; font-family: "Inter", sans-serif; font-weight: 200; font-size: 68px; letter-spacing: .04em; line-height: 1; }
  .v3b .dv { left: 250px; right: 250px; top: 370px; }
  .v3b .dv img { width: 78px; }
  .v3b .body { position: absolute; left: 50%; transform: translateX(-50%); top: 450px; width: 560px; text-align: center; font-size: 19px; line-height: 1.62; font-weight: 300; }
  .v3b .qrrow { position: absolute; left: 50%; transform: translateX(-50%); top: 600px; display: flex; align-items: center; gap: 26px; }
  .v3b .qrrow img { width: 92px; height: 92px; }
  .v3b .qrrow .t { font-size: 15.5px; line-height: 1.35; text-transform: uppercase; letter-spacing: .02em; }
</style></head><body>

<div class="page v3 grain" id="front">
  <div class="bg"></div><div class="layer tint"></div><div class="layer shade"></div>
  __FRAME__
  <div class="corner" style="left:64px;top:62px">Velkomin</div>
  <div class="corner" style="left:318px;top:62px">2026</div>
  <div class="corner" style="left:590px;top:62px">Nýir<br>húseigendur</div>
  <div class="corner" style="right:64px;top:62px;text-align:right">Tilboð<br>og afslættir</div>

  <h1>NÝJI KAFLINN</h1>
  <div class="dv"><span class="ln"></span><img src="../src/logo-white.png" alt="Svif"><span class="ar"></span></div>
  <div class="sub">Velkomin í nýja heimilið þitt<br>Sérkjör frá traustum fyrirtækjum</div>
  <div class="corner" style="left:64px;bottom:64px">Ljós<br>Rými<br>Hlýja</div>
  <div class="web">SVIF.IS</div>
  <div class="corner" style="right:64px;bottom:64px;text-align:right">Framkvæmdir<br>Viðhald<br>Innréttingar</div>
</div>

<div class="page v3 v3b grain" id="back">
  <div class="bg"></div><div class="layer tint"></div>
  __FRAME__
  <div class="corner" style="left:64px;top:62px">SVIF.IS</div>

  <h2>TIL HAMINGJU</h2>
  <div class="dv"><span class="ln"></span><img src="../src/roof-white.png" alt=""><span class="ar"></span></div>
  <p class="body">Í þessum bæklingi finnur þú traust fyrirtæki sem hjálpa þér að koma þér fyrir á nýju heimili, með sérkjörum fyrir nýja húseigendur.</p>
  <div class="qrrow"><img src="../src/qr-white.svg" alt=""><div class="t">Skannaðu<br>og sjáðu meira<br>á svif.is</div></div>

  <img src="../src/logo-white.png" alt="Svif" style="position:absolute;left:50%;transform:translateX(-50%);bottom:64px;width:150px">
  <div class="corner" style="right:64px;bottom:64px;text-align:right">Hannað, prentað<br>og sent af Svif</div>
</div>

</body></html>
'''
FRAME = '''<span class="fr h" style="left:34px;top:34px;width:250px"></span>
  <span class="fr v" style="left:34px;top:34px;height:250px"></span>
  <span class="fr v" style="left:34px;top:640px;height:326px"></span>
  <span class="fr v" style="right:34px;top:150px;height:816px"></span>
  <span class="fr h" style="right:34px;bottom:34px;width:300px"></span>'''
# Back-page photos. The front is always the A3 photo.
PHOTOS = {
  # the original A3 back: soft close-up of the stool and armchair
  'upprunaleg': "background-image: url(../src/bg1.jpg); background-size: 175% auto; background-position: 92% 70%; filter: brightness(.82) blur(3px);",
  # the blurred hallway from the first Nýr kafli cover, toned to match
  'gangur': "background-image: url(../src/bg2.jpg); background-size: 240% auto; background-position: 78% 40%; transform: scaleX(-1); filter: brightness(.76) saturate(.78) blur(5px);",
  # my pick: zoomed in on the sunbeam on the wall, mirrored
  'solargeisli': "background-image: url(../src/bg1.jpg); background-size: 2160px auto; background-position: -860px -420px; transform: scaleX(-1); filter: brightness(1.06) contrast(.96) blur(5px);",
}
LINES = {'hvitar-linur': ('rgba(255,255,255,.78)', '1px')}

def build(fname, photo, lines):
    line, lw = LINES[lines]; p = PHOTOS[photo]
    html = (TPL.replace('__NAME__', fname).replace('__LINE__', line).replace('__LW__', lw).replace('__FRAME__', FRAME)
               .replace('__BACKBG__', p))
    open(os.path.join(HERE, '..', 'designs', fname + '.html'), 'w').write(html)
    print('wrote', fname)

for photo in PHOTOS: build(f'v3-bak-{photo}', photo, 'hvitar-linur')
