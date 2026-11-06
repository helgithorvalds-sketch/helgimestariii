import base64, io, os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__))
s=open(f'{D}/flett/index.html',encoding='utf-8').read()
s=s.replace('<meta name="claude:viewport-fit-sides" content="cover">\n','')
s=s.replace('<title>SVIF flettibók</title>','<title>SVIF – Velkomstbæklingur</title>\n<meta name="description" content="Flettu í gegnum velkomstbækling SVIF fyrir nýja húseigendur.">\n<meta property="og:title" content="SVIF – Velkomstbæklingur">\n<meta property="og:description" content="Flettu í gegnum velkomstbækling SVIF fyrir nýja húseigendur.">')
import re; s=re.sub(r'Prufuflettu · (\d+) síður · 194 × 194 mm', r'Velkomstbæklingur · \1 síður', s); assert 'Prufuflettu' not in s
data=[]
for i in range(32):
    im=Image.open(f'{D}/flett/sidur/sida_{i:02d}.jpg').convert('RGB').resize((1000,1000),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'JPEG',quality=82,optimize=True,progressive=True)
    data.append('data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode())
old="const mynd=i=>`sidur/sida_${String(i).padStart(2,'0')}.jpg`;"
assert old in s
s=s.replace(old,"const SIDUR=window.SVIF_SIDUR; const mynd=i=>SIDUR[i];")
s=s.replace('<script>\n(function(){','<script>window.SVIF_SIDUR='+str(data).replace("'",'"')+';</script>\n<script>\n(function(){',1)
assert 'window.SVIF_SIDUR=' in s and 'claude' not in s.lower()
open(f'{D}/public_flett/baeklingur.html','w',encoding='utf-8').write(s); print(len(s)//1024,'KB')
