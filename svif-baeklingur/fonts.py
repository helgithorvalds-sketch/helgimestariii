import re, os, subprocess, hashlib, sys
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
D=os.path.dirname(os.path.abspath(__file__))
def fetch_css(url):
    css=subprocess.run(['curl','-sS','-A',UA,url],capture_output=True,text=True,check=True).stdout
    def repl(m):
        u=m.group(1); fn=os.path.join(D,'fonts',hashlib.md5(u.encode()).hexdigest()+'.woff2')
        if not os.path.exists(fn): subprocess.run(['curl','-sS','-o',fn,u],check=True)
        return f'url(fonts/{os.path.basename(fn)})'
    return re.sub(r'url\((https://fonts\.gstatic\.com/[^)]+)\)',repl,css)
url='https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Jost:wght@400;500;600&family=Archivo+Black&family=Montserrat:wght@500;600;700;800&family=Open+Sans:wght@400;600;700&display=swap'
open(os.path.join(D,'fonts.css'),'w').write(fetch_css(url))
print('ok')
