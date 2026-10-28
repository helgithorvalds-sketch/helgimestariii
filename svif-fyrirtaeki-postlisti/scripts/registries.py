#!/usr/bin/env python3
"""Pulls firms and named contacts out of two public professional registries:
   - fle.is/is/felagatal      (löggiltir endurskoðendur: name, workplace, phone, email)
   - lmfi.is/logmannalisti    (lögmenn: each lawyer's page gives the law firm, its website and the lawyer's email)
Writes data/fle.csv and data/lmfi.csv (semicolon separated)."""
import csv, re, sys, time, os
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup

OUT = sys.argv[1]
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) SVIF-contact-research/1.0 (+mailto:helgithorvalds@gmail.com)', 'Accept-Language': 'is,en;q=0.8'}
S = requests.Session(); S.headers.update(UA)
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()

def fle():
    html = S.get('https://www.fle.is/is/felagatal', timeout=60).text
    soup = BeautifulSoup(html, 'lxml')
    rows = []
    for u in soup.select('.embList .user'):
        g = lambda sel: clean(u.select_one(sel).get_text(' ', strip=True)) if u.select_one(sel) else ''
        m = u.select_one('.email a[href^=mailto]')
        rows.append(dict(nafn=g('.name'), rettindi=g('.label'), vinnustadur=g('.workplace'), simi=g('.phone'),
                         netfang=(m.get('href')[7:].strip() if m else ''), heimild='https://www.fle.is/is/felagatal'))
    with open(os.path.join(OUT, 'fle.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys(), delimiter=';'); w.writeheader(); w.writerows(rows)
    print('fle', len(rows))

def lawyer(url):
    for attempt in range(3):
        try:
            r = S.get(url, timeout=40); r.raise_for_status(); break
        except Exception:
            time.sleep(2 + attempt * 3)
    else:
        return dict(url=url, villa='fetch failed')
    soup = BeautifulSoup(r.text, 'lxml')
    d = dict(url=url, nafn='', titill='', stofa='', adsetur='', postnr='', stadur='', simi='', netfang='', vefur='', malaflokkar='', villa='')
    lab0 = soup.select_one('span.lawyerlabel')
    card = lab0.find_parent('div', class_='column') if lab0 else None
    h = (card.select_one('h1') if card else None) or soup.select_one('#maincontent h1')
    if h:
        t = h.select_one('.title'); d['titill'] = clean(t.get_text(' ', strip=True)) if t else ''
        if t: t.extract()
        d['nafn'] = clean(h.get_text(' ', strip=True))
    keymap = {'Lögmannsstofa': 'stofa', 'Aðsetur': 'adsetur', 'Póstnúmer': 'postnr', 'Staður': 'stadur', 'Sími': 'simi', 'Netfang': 'netfang', 'Vefsíða': 'vefur'}
    for lab in soup.select('span.lawyerlabel'):
        key = keymap.get(clean(lab.get_text()).rstrip(':').strip())
        if not key: continue
        li = lab.parent
        a = li.select_one('a[href]')
        if key == 'netfang' and a and a.get('href', '').startswith('mailto:'): d[key] = a.get('href')[7:].split('?')[0].strip(); continue
        if key == 'vefur' and a: d[key] = clean(a.get_text()) or a.get('href'); continue
        lab.extract(); d[key] = clean(li.get_text(' ', strip=True))
    d['malaflokkar'] = ' | '.join(clean(x.get_text()) for x in soup.select('.casecat h2'))[:300]
    return d

def lmfi():
    html = S.get('https://www.lmfi.is/logmannalisti?name=&IsCorporate=0', timeout=60).text
    soup = BeautifulSoup(html, 'lxml')
    links = ['https://www.lmfi.is' + a.get('href').split('#')[0] for a in soup.select('.lawyerslistcontainer a[href^="/logmannalisti/"]')]
    links = list(dict.fromkeys(links))
    print('lmfi lawyers', len(links), flush=True)
    rows = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        for i, d in enumerate(ex.map(lawyer, links)):
            rows.append(d)
            if i % 50 == 0: print('  ', i, d.get('nafn'), d.get('stofa'), d.get('netfang'), flush=True)
            time.sleep(0.15)
    keys = ['url', 'nafn', 'titill', 'stofa', 'adsetur', 'postnr', 'stadur', 'simi', 'netfang', 'vefur', 'malaflokkar', 'villa']
    with open(os.path.join(OUT, 'lmfi.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=keys, delimiter=';', extrasaction='ignore'); w.writeheader(); w.writerows(rows)
    print('lmfi', len(rows))

if __name__ == '__main__':
    fle()
    if '--fle-only' not in sys.argv: lmfi()
