"""SVIF-innsíðurnar (Yfirlit, Afsláttarmiðar-kynning, Af hverju SVIF) í dökku kápuútliti.

Tekur .dc.html úr hönnunarartifactinu, setur dökka liti inn í props, skiptir Fraunces/Jost út fyrir Inter
(létt hástafaletur eins og á kápunni), setur dökkan kornóttan grunn og hornlínur kápunnar, og notar ljósar
útgáfur af húsmyndunum (ljos/*.png).
"""
import json
import os
import re

from dokk import bg as dokk_bg

D = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(D, '..', 'artifact-files', '7c048a51-64ed-4bec-ad90-a88fa82fd87a')
LJOS = os.path.join(D, 'ljos')

DARK = {'paper': '#4A4437', 'panel': 'rgba(255,255,255,0.055)', 'ink': '#FFFFFF',
        'cocoa': 'rgba(255,255,255,0.78)', 'gold': '#D8CCB6', 'linen': '#4A4437'}

# hornlínur kápunnar í 794 px hnitum (194 mm skurður)
FRAME = ('<svg aria-hidden="true" width="794" height="794" viewBox="0 0 794 794" style="position:absolute;left:0;top:0;pointer-events:none;z-index:1">'
         '<g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="0.9">'
         '<path d="M27,225 V27 H225"/><path d="M767,119 V767 H529"/><path d="M27,508 V767"/></g></svg>')


def fonts_css():
    return open(os.path.join(D, 'fonts.css')).read()


def restyle(body):
    # stórar fyrirsagnir: Fraunces 700 -> Inter 200, hástafir
    body = re.sub(r"font-family: Fraunces, Georgia, serif; font-variation-settings: 'SOFT' 60, 'WONK' 1; font-weight: 700; font-size: (\d+)px; line-height: ([\d.]+); letter-spacing: -?[\d.]+px;",
                  lambda m: (f"font-family: Inter, sans-serif; font-weight: 200; font-size: {int(int(m.group(1)) * 0.92)}px; line-height: {m.group(2)}; letter-spacing: 0.04em; text-transform: uppercase;"
                             if int(m.group(1)) >= 36 else
                             f"font-family: Inter, sans-serif; font-weight: 300; font-size: {int(m.group(1)) - 2}px; line-height: {m.group(2)}; letter-spacing: 0;"),
                  body)
    body = re.sub(r"font-family: Fraunces, Georgia, serif; font-variation-settings: 'SOFT' 60, 'WONK' 1; font-weight: 700;",
                  "font-family: Inter, sans-serif; font-weight: 300; letter-spacing: 0.02em; text-transform: uppercase;", body)
    # millifyrirsagnir (600) -> Inter 400
    body = body.replace("font-family: Fraunces, Georgia, serif; font-variation-settings: 'SOFT' 60, 'WONK' 1; font-weight: 600;",
                        "font-family: Inter, sans-serif; font-weight: 400; letter-spacing: 0.01em;")
    # skáletur (italic 500) -> Inter 300 uppréttur
    body = body.replace("font-family: Fraunces, Georgia, serif; font-variation-settings: 'SOFT' 60, 'WONK' 1; font-style: italic; font-weight: 500;",
                        "font-family: Inter, sans-serif; font-weight: 300;")
    body = body.replace('font-family: Jost, sans-serif', 'font-family: Inter, sans-serif')
    # ljós pappírsáferð burt, dökkur grunnur kemur í staðinn
    body = re.sub(r"background-image: repeating-linear-gradient\(90deg, rgba\(74,52,42,0\.0\d+\)[^;]*;", 'background-image: none;', body, count=1)
    # gömlu rammalínurnar (fyrsta svg-ið) burt
    body = re.sub(r'<svg aria-hidden="true" width="794" height="794" viewBox="0 0 794 794" style="position: absolute; left: 0; top: 0; pointer-events: none"><path d="M[^"]*" fill="none" stroke="[^"]*" stroke-width="1.2" opacity="0.[58]"></path></svg>', '', body, count=1)
    return body


def build(name, out, edits=(), blobs=None):
    src = open(f'{A}/project/{name}.dc.html', encoding='utf-8').read()
    props = json.loads(re.search(r"data-props='(.*?)'>", src, re.S).group(1))
    helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S).group(1)
    body = re.search(r'</helmet>\s*(.*?)\s*</x-dc>', src, re.S).group(1)
    defaults = {}
    for k, v in props.items():
        if isinstance(v, dict) and 'default' in v:
            body = body.replace('{{' + k + '}}', v['default']); defaults[k] = v['default']
    assert '{{' not in body
    for a, b in edits:  # sömu breytingar og á ljósu útgáfunni (litir þá enn sjálfgefnir)
        assert body.count(a) == 1, (body.count(a), a[:80])
        body = body.replace(a, b)
    for k, v in defaults.items():
        if k in DARK:
            body = body.replace(v, DARK[k])
    body = body.replace('rgba(125,90,68,0.3)', 'rgba(255,255,255,0.22)').replace('rgba(74,52,42,0.12)', 'rgba(0,0,0,0.25)')
    body = restyle(body)

    def blob(m):
        bid = m.group(1)
        if blobs and bid in blobs:
            return f'src="{blobs[bid]}"'
        for p in (f'{LJOS}/{bid}.png', f'{A}/{bid}.png', f'{A}/{bid}.svg'):
            if os.path.exists(p):
                return f'src="file://{os.path.abspath(p)}"'
        raise SystemExit('vantar ' + bid)
    body = re.sub(r'src="/_blob/([0-9a-f]{32})"', blob, body)
    style = re.search(r'<style>(.*?)</style>', helmet, re.S).group(1)
    grunnur = '.grunnur{position:absolute;inset:0;' + dokk_bg(True) + '}'
    # dökki grunnurinn og hornlínurnar fara inn í rótarblokkina, fyrir aftan efnið
    body = body.replace('>', '><div class="grunnur" style="z-index:0"></div>' + FRAME, 1)
    page = (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts_css()}{style}\n'
            'html,body{margin:0;padding:0;width:794px;height:794px;overflow:hidden;background:#4A4437}@page{margin:0}'
            f'{grunnur}</style></head><body>{body}</body></html>')
    open(os.path.join(D, out), 'w', encoding='utf-8').write(page)
    print('built', out)


if __name__ == '__main__':
    import build_svif_pages as b  # noqa: F401  (endurnýtir edits-listann fyrir Yfirlit)
