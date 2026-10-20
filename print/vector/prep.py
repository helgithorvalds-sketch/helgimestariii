import re, json, os, sys, subprocess, hashlib, html
A='/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad/artifact-files/7c048a51-64ed-4bec-ad90-a88fa82fd87a'
V='/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad/vec'
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
def fetch_css(url):
    url=html.unescape(url)
    key=hashlib.md5(url.encode()).hexdigest()[:10]
    css=subprocess.run(['curl','-sS','-A',UA,url],capture_output=True,text=True,check=True).stdout
    def repl(m):
        u=m.group(1); fn=os.path.join(V,'fonts',hashlib.md5(u.encode()).hexdigest()+'.woff2')
        if not os.path.exists(fn): subprocess.run(['curl','-sS','-o',fn,u],check=True)
        return f'url(file://{fn})'
    return re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)',repl,css)
def build(name, edits=None):
    src=open(f'{A}/project/{name}.dc.html',encoding='utf-8').read()
    props=json.loads(re.search(r"data-props='(.*?)'>",src,re.S).group(1))
    helmet=re.search(r'<helmet>(.*?)</helmet>',src,re.S).group(1)
    body=re.search(r'</helmet>\s*(.*?)\s*</x-dc>',src,re.S).group(1)
    for k,v in props.items():
        if isinstance(v,dict) and 'default' in v: body=body.replace('{{'+k+'}}',v['default'])
    assert '{{' not in body, re.findall(r'\{\{\w+\}\}',body)
    def blob(m):
        bid=m.group(1); 
        for ext in ('png','jpg','svg','webp'):
            p=f'{A}/{bid}.{ext}'
            if os.path.exists(p): return f'src="file://{p}"'
        raise SystemExit('missing blob '+bid)
    body=re.sub(r'src="/_blob/([0-9a-f]{32})"',blob,body)
    css=''
    for u in re.findall(r'<link rel="stylesheet" href="([^"]+)">',helmet): css+=fetch_css(u)+'\n'
    style=re.search(r'<style>(.*?)</style>',helmet,re.S).group(1)
    if edits:
        for a,b in edits:
            assert a in body, a[:60]; body=body.replace(a,b)
    page=f'<!doctype html><html lang="is"><head><meta charset="utf-8"><style>{css}{style}\nhtml,body{{margin:0;padding:0;width:794px;height:794px;overflow:hidden}}@page{{margin:0}}</style></head><body>{body}</body></html>'
    out=f'{V}/pages/{name}.html'; open(out,'w',encoding='utf-8').write(page); print('built',out)
if __name__=='__main__':
    for n in sys.argv[1:]: build(n)
