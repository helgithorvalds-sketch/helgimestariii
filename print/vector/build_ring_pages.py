"""Beige Afslaettir with the new ring, and the blue ring page with inlined local fonts."""
import re

from prep import build, fetch_css, V

RING = f'{V}/pdf/ring_final_crop.png'
A = '/tmp/claude-0/-home-user-helgimestariii/6663cf3e-572e-56ec-8b1e-c368f8d68c4b/scratchpad/artifact-files/7c048a51-64ed-4bec-ad90-a88fa82fd87a'

# beige: swap the 895 px ring blob for the 3x render, keep the layout box
build('Afslaettir', [
    (f'src="file://{A}/4a5740764184436a45fbefedb470dc83.png"', f'src="file://{RING}"'),
    ('style="position: relative; width: 670px; height: 454px; display: block"',
     'style="position: relative; width: 670px; height: 454px; display: block; object-fit: contain"'),
])

# blue: standalone page, fonts fetched the same way as the artifact pages
src = open(f'{V}/pages/Afsl_BLA_src.html', encoding='utf-8').read()
link = re.search(r'<link rel="stylesheet" href="([^"]+)">', src).group(1)
css = fetch_css(link)
src = src.replace(f'<link rel="stylesheet" href="{link}">', f'<style>{css}</style>')
src = src.replace('RINGSRC', f'file://{RING}')
open(f'{V}/pages/Afsl_BLA.html', 'w', encoding='utf-8').write(src)
print('built Afsl_BLA.html')
