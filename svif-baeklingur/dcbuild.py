"""Býr til 794 px HTML úr .dc.html í hönnunarartifactinu (sjálfgefin props, blobs -> skrár, letur staðbundið)."""
import re, json, os
D = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(D, '..', 'artifact-files', '7c048a51-64ed-4bec-ad90-a88fa82fd87a')
def build(name, out, edits=(), blobs=None):
    src = open(f'{A}/project/{name}.dc.html', encoding='utf-8').read()
    props = json.loads(re.search(r"data-props='(.*?)'>", src, re.S).group(1))
    helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S).group(1)
    body = re.search(r'</helmet>\s*(.*?)\s*</x-dc>', src, re.S).group(1)
    for k, v in props.items():
        if isinstance(v, dict) and 'default' in v: body = body.replace('{{' + k + '}}', v['default'])
    assert '{{' not in body
    for a, b in edits:
        assert body.count(a) == 1, (body.count(a), a[:80]); body = body.replace(a, b)
    def blob(m):
        bid = m.group(1)
        if blobs and bid in blobs: return f'src="{blobs[bid]}"'
        p = f'{A}/{bid}.png'
        assert os.path.exists(p), bid
        return f'src="file://{os.path.abspath(p)}"'
    body = re.sub(r'src="/_blob/([0-9a-f]{32})"', blob, body)
    style = re.search(r'<style>(.*?)</style>', helmet, re.S).group(1)
    fonts = open(f'{D}/fonts.css').read()
    page = (f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{fonts}{style}\n'
            'html,body{margin:0;padding:0;width:794px;height:794px;overflow:hidden}@page{margin:0}</style></head>'
            f'<body>{body}</body></html>')
    open(f'{D}/{out}', 'w', encoding='utf-8').write(page); print('built', out)
