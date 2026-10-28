#!/usr/bin/env python3
"""Finds the right contact at each company by reading the company's own website.

For every company (name;domain;...) it fetches the front page and the pages that look like
"starfsfólk", "um okkur" or "hafa samband", collects every e-mail address on them together with
the name and job title printed next to it, and picks one address in this order:
    markaðsstjóri  >  framkvæmdastjóri / eigandi  >  sölustjóri  >  almennt netfang (info@ ...)
Each address is recorded with the URL it was found on, so it can be checked by hand, and the
domain's MX record is looked up (DNS over HTTPS) to confirm it accepts mail. SMTP is not used.

Usage: contacts.py companies.csv out.csv [--workers 8] [--limit N]
Input columns (semicolon separated, header): fyrirtaeki;vefur;flokkur ... (extra columns are passed through).
"""
import csv, re, sys, time, json, html as htmlmod, os, random
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse
import urllib.robotparser as robotparser
import requests
from bs4 import BeautifulSoup

UA = 'Mozilla/5.0 (X11; Linux x86_64) SVIF-contact-research/1.0 (+mailto:helgithorvalds@gmail.com)'
HEAD = {'User-Agent': UA, 'Accept-Language': 'is,en;q=0.8', 'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'}
TIMEOUT = 20
MAX_PAGES = 7

PAGE_HINTS = re.compile(r'starfsf|starfsm|mannskap|f[oó]lki|teymi|team|um[-_ ]?okkur|umokkur|um[-_]fyrirt|about|hafa[-_ ]?samband|hafasamband|samband|contact|tengili|stj[oó]rn|people|staff|stofan|fyrirt[aæ]ki[ðd]|eigend|partners|medeig', re.I)
EMAIL_RE = re.compile(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}')
OBFUSC = [(re.compile(r'\s*[\[\(\{]\s*(at|hjá|hja)\s*[\]\)\}]\s*', re.I), '@'), (re.compile(r'\s+hjá\s+', re.I), '@'),
          (re.compile(r'\s*[\[\(\{]\s*(dot|punktur)\s*[\]\)\}]\s*', re.I), '.')]
BAD_EMAIL = re.compile(r'(example\.|sentry|wixpress|\.png$|\.jpg$|\.gif$|\.svg$|\.webp$|@2x|noreply|no-reply|donotreply|@[0-9.]+$|^[0-9a-f]{20,}@|w3\.org|schema\.org|yourdomain|domain\.com|email\.com|@email$|@test)', re.I)
TITLES = [  # (type, pattern); first match in a card wins
    ('markadur', re.compile(r'marka[ðd]s|marketing|kynningarstj|kynningarfulltr|v[oö]rumerkjastj|samskiptastj|communications|brand manager|cmo\b', re.I)),
    ('stjornandi', re.compile(r'framkv[aæ]mdastj|forstj[oó]r|\bceo\b|managing director|eigandi|stofnandi|founder|me[ðd]eigandi|partner|skrifstofustj|rekstrarstj|fj[aá]rm[aá]lastj|\bcfo\b|\bcoo\b|forst[oö][ðd]uma[ðd]ur', re.I)),
    ('sala', re.compile(r's[oö]lustj|vi[ðd]skiptastj|s[oö]lufulltr|s[oö]lu- og|account manager|sales', re.I)),
]
GENERIC_LOCAL = re.compile(r'^(info|upplysingar|upplýsingar|skrifstofa|postur|póstur|mail|hello|hallo|halló|office|kontakt|contact|sala|sales|thjonusta|þjónusta|afgreidsla|bokhald|reception|motttaka|móttaka|hafdusamband|fyrirspurnir|velkomin|svif|stofan|logmenn|endurskodun|admin|frontdesk|markadur|marketing|markadsdeild)$', re.I)
NAME_RE = re.compile(r"\b([A-ZÁÉÍÓÚÝÞÆÖ][a-záéíóúýþæöð]+(?:[ \-][A-ZÁÉÍÓÚÝÞÆÖ][a-záéíóúýþæöð]+){1,3})")

clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()
MX_CACHE = {}

def mx_ok(domain):
    domain = domain.lower()
    if domain in MX_CACHE: return MX_CACHE[domain]
    ok = ''
    try:
        j = requests.get('https://dns.google/resolve', params={'name': domain, 'type': 'MX'}, timeout=15).json()
        ans = [a['data'] for a in j.get('Answer', []) if a.get('type') == 15]
        if ans: ok = 'MX:' + ans[0].split()[-1].rstrip('.')
        else:
            j = requests.get('https://dns.google/resolve', params={'name': domain, 'type': 'A'}, timeout=15).json()
            ok = 'A-only' if j.get('Answer') else 'NXDOMAIN'
    except Exception as e:
        ok = 'DNS?'
    MX_CACHE[domain] = ok
    return ok

class Site:
    def __init__(self, domain):
        self.domain = domain.lower().strip().strip('/')
        self.domain = re.sub(r'^https?://', '', self.domain).split('/')[0]
        self.s = requests.Session(); self.s.headers.update(HEAD)
        self.pages = {}      # url -> html
        self.err = ''
        self.base = None
        self.rp = None
        self.status = {}
        self.blocked = False

    def allowed(self, url):
        if self.rp is None:
            self.rp = robotparser.RobotFileParser()
            try:
                r = self.s.get(urljoin(self.base, '/robots.txt'), timeout=10)
                self.rp.parse(r.text.splitlines() if r.status_code == 200 else [])
            except Exception:
                self.rp.parse([])
        try: return self.rp.can_fetch(UA, url)
        except Exception: return True

    def get(self, url):
        if url in self.pages: return self.pages[url]
        if self.base and not self.allowed(url): return None
        r = None
        for attempt in range(3):
            try:
                r = self.s.get(url, timeout=TIMEOUT, allow_redirects=True); break
            except requests.exceptions.ConnectionError as e:
                self.err = str(e)[:120]; time.sleep(2 + 3 * attempt)
            except Exception as e:
                self.err = str(e)[:120]; break
        if r is None: return None
        try:
            self.status[url] = r.status_code
            if r.status_code in (401, 403, 429, 503) and self.base is None: self.blocked = True
            if r.status_code >= 400 or 'html' not in r.headers.get('content-type', 'html'): return None
            r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == 'iso-8859-1' else r.encoding
            self.pages[r.url] = r.text; self.pages[url] = r.text
            if self.base is None: self.base = r.url
            time.sleep(0.4 + random.random() * 0.4)
            return r.text
        except Exception as e:
            self.err = str(e)[:120]; return None

    def crawl(self):
        home = None
        for u in (f'https://{self.domain}/', f'https://www.{self.domain}/', f'http://{self.domain}/', f'http://www.{self.domain}/'):
            home = self.get(u)
            if home: break
        if not home: return
        soup = BeautifulSoup(home, 'lxml')
        host = urlparse(self.base).netloc.lower().replace('www.', '')
        cands = []
        for a in soup.select('a[href]'):
            href = a.get('href', ''); text = clean(a.get_text(' ', strip=True))
            if href.startswith(('mailto:', 'tel:', '#', 'javascript:')): continue
            full = urljoin(self.base, href)
            p = urlparse(full)
            if p.netloc.lower().replace('www.', '') != host: continue
            if PAGE_HINTS.search(p.path + ' ' + text):
                score = 3 if re.search(r'starfsf|starfsm|mannskap|f[oó]lki|teymi|team|people|staff', p.path + ' ' + text, re.I) else 2 if re.search(r'um|about|stj[oó]rn', p.path + ' ' + text, re.I) else 1
                cands.append((-score, full.split('#')[0]))
        seen = set(); n = 0
        for _, u in sorted(cands):
            if u in seen or u.rstrip('/') == self.base.rstrip('/'): continue
            seen.add(u)
            if self.get(u): n += 1
            if n >= MAX_PAGES - 1: break
        if n == 0:   # menus drawn by JavaScript: try the paths Icelandic sites usually use
            for path in ('/hafa-samband', '/hafdu-samband', '/hafa-samband/', '/samband', '/um-okkur', '/um-okkur/', '/starfsfolk', '/starfsfolk/', '/contact', '/contact-us', '/about', '/um', '/fyrirtaekid', '/teymid', '/folkid'):
                if self.get(urljoin(self.base, path)): n += 1
                if n >= 3: break

def emails_in(html_text, soup):
    found = {}
    for a in soup.select('a[href^="mailto:"]'):
        e = htmlmod.unescape(a.get('href')[7:].split('?')[0].strip().lower())
        if EMAIL_RE.fullmatch(e) and not BAD_EMAIL.search(e): found.setdefault(e, a)
    text = soup.get_text(' ', strip=True)
    for rx, rep in OBFUSC: text = rx.sub(rep, text)
    for e in EMAIL_RE.findall(text):
        e = e.lower().strip('.')
        if not BAD_EMAIL.search(e): found.setdefault(e, None)
    # addresses that only live in attributes, JSON or scripts (no surrounding text to read a title from)
    for e in EMAIL_RE.findall(htmlmod.unescape(html_text)):
        e = e.lower().strip('.')
        if not BAD_EMAIL.search(e) and not re.search(r'\.(js|css|woff2?|ttf|min)$', e): found.setdefault(e, None)
    return found

def card_for(a):
    """The staff card around a mailto link: the largest ancestor whose text still holds exactly one address."""
    el = a
    for _ in range(7):
        parent = el.parent
        if parent is None or parent.name in ('body', 'html', '[document]'): break
        t = clean(parent.get_text(' ', strip=True))
        if len(t) > 500 or len(parent.select('a[href^="mailto:"]')) > 1 or len(set(EMAIL_RE.findall(t))) > 1: break
        el = parent
    return clean(el.get_text(' ', strip=True))

STOP_WORDS = re.compile(r'^(Nafn|Netfang|Sími|Reykjavík|Ísland|Iceland|Instagram|Facebook|Linkedin|Starfsfólk|Hafðu|Hafa|Opnunartími|Senda|Skrifstofa|Um|Okkar|Allir|Fyrirtækið|Starfsmenn|Mannskapurinn|Teymið|Stjórn|Kennitala|Heimilisfang|Póstur|Fax|Vinsamlegast|Takk|Velkomin)$', re.I)
TRANS = str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')
def ascii_(s): return s.translate(TRANS).replace('þ', 'th').replace('Þ', 'Th').lower()

def pick_name(ctx, email):
    """The person the address belongs to: the name in the card whose first name or initials match the local part."""
    local = re.sub(r'[^a-z]', '', ascii_(email.split('@')[0]))
    cands = []
    for m in NAME_RE.finditer(ctx):
        cand = m.group(1)
        words = cand.split()
        if any(STOP_WORDS.match(w) for w in words): continue
        if len(words) < 2 and not re.search(r'son$|d[oó]ttir$|bur$', cand): continue
        cands.append(cand)
    if not cands: return ''
    def score(cand):
        w = [ascii_(x) for x in cand.split()]
        sc = 0
        if local and w[0].startswith(local[:4]) and len(local) >= 3: sc += 4
        if local and local.startswith(w[0][:4]) and len(w[0]) >= 3: sc += 3
        if local and ''.join(x[0] for x in w) == local: sc += 5
        if local and (w[0] + w[-1][0]) == local or (w[0][0] + w[-1]) == local: sc += 4
        if local and local == ''.join(w): sc += 5
        if local and w[0] in local and len(w[0]) >= 4: sc += 2
        if re.search(r'son$|d[oó]ttir$|bur$', cand): sc += 1
        return sc
    best = max(cands, key=score)
    best = best if score(best) > 0 or len(cands) == 1 else cands[0]
    words = best.split()
    # anchor on the word the address is made from, drop nouns/titles before and after the person
    for i, w in enumerate(words):
        if local and len(local) >= 3 and ascii_(w).startswith(local[:4]): words = words[i:]; break
    while words and (NOUN_WORDS.match(words[0]) or TITLE_WORD.search(words[0])): words = words[1:]
    while words and (NOUN_WORDS.match(words[-1]) or TITLE_WORD.search(words[-1])): words = words[:-1]
    return ' '.join(words[:4])

NOUN_WORDS = re.compile(r'^(Bókhald|Endurskoðun|Ráðgjöf|Lögfræði|Lögmenn|Lögmaður|Skrifstofa|Starfsfólk|Starfsmaður|Yfirstjórn|Fjármáladeild|Söludeild|Markaðsdeild|Deild|Stjórn|Teymi|Hönnun|Prentun|Verslun|Þjónusta|Símatími|Opið|Mánudaga|Föstudaga|Hafðu|Hafa|Samband|Netfang|Sími|Símanúmer|Skilaboð|Senda|Nafn|Fax|Kennitala|Heimilisfang|Fyrirtæki|Reykjavík|Kópavogur|Hafnarfjörður|Akureyri|Garðabær|Mosfellsbær|Selfoss|Ísland|Iceland|Google|Facebook|Instagram|Linkedin|About|Services|Service|Contact|Team|Home|Menu|Email|Phone|Partner|Partners|Ads|Meta|Microsoft|Apple|Premium|Vefur|Vefsíða|Vefverslun|Tölvupóstur|Póstur|Sala|Markaður|Markaðs)$', re.I)
TITLE_WORD = re.compile(r'(stjóri|stjórnandi|eigandi|stofnandi|fulltrúi|ráðgjafi|endurskoðandi|lögmaður|lögfræðingur|bókari|hönnuður|sérfræðingur|forritari|þjónn|CEO|CFO|COO|CMO|Partner|Manager|Managing|Director|Senior|Head|Chief|Lead|Founder|Owner|Consultant|Designer|Developer|Specialist)$', re.I)

TITLE_RE = re.compile(r'((?:[A-Za-záéíóúýþæöð]+-?\s+og\s+)?[A-Za-záéíóúýþæöð]*(?:stjóri|stjórnandi|eigandi|stofnandi|fulltrúi|ráðgjafi|endurskoðandi|lögmaður|bókari|forstjóri|framkvæmdastjóri|hönnuður|sérfræðingur|verkefnastjóri|Manager|Director|Partner|Founder|Owner|CEO|CFO|COO|CMO)\b)', re.I)
def pick_title(ctx, name):
    ms = list(TITLE_RE.finditer(ctx))
    if not ms: return ''
    if name and name in ctx:
        pos = ctx.index(name) + len(name)
        ms.sort(key=lambda m: abs(m.start() - pos))
    return clean(ms[0].group(1))[:60]

def analyse(site, company):
    host = urlparse(site.base).netloc.lower().replace('www.', '') if site.base else site.domain
    contacts = {}   # email -> dict
    for url, html_text in site.pages.items():
        if url != site.base and url in site.pages and html_text is not site.pages.get(url): pass
        soup = BeautifulSoup(html_text, 'lxml')
        for bad in soup(['script', 'style', 'noscript']): bad.extract()
        for e, a in emails_in(html_text, soup).items():
            ctx = card_for(a) if a is not None else ''
            if not ctx:
                i = soup.get_text(' ', strip=True).lower().find(e)
                ctx = clean(soup.get_text(' ', strip=True)[max(0, i - 160): i + 60]) if i >= 0 else ''
            typ = 'annad'
            for t, rx in TITLES:
                if rx.search(ctx): typ = t; break
            local = e.split('@')[0]
            if GENERIC_LOCAL.match(local) or local == host.split('.')[0] or local.replace('-', '') == re.sub(r'[^a-z0-9]', '', company.lower())[:len(local)]:
                typ = 'almennt' if typ == 'annad' else typ
            name = pick_name(ctx, e) if typ != 'almennt' else ''
            title = pick_title(ctx, name) if typ != 'almennt' else ''
            if typ == 'annad' and name and len(ctx) < 200: typ = 'nafngreint'
            rec = contacts.get(e)
            rank = {'markadur': 0, 'stjornandi': 1, 'sala': 2, 'almennt': 3, 'nafngreint': 4, 'annad': 5}[typ]
            if typ == 'stjornandi':   # the managing director before the office, HR or finance manager
                rank += 0.0 if re.search(r'forstj|framkv[aæ]mdastj|\bceo\b|eigandi|stofnandi|founder|managing director', ctx, re.I) and not re.search(r'a[ðd]sto[ðd]ar', title, re.I) else 0.3 if re.search(r'a[ðd]sto[ðd]ar|rekstrarstj|s[oö]lu', title, re.I) else 0.6
            if rec is None or rank < rec['rank']:
                contacts[e] = dict(netfang=e, tegund=typ, rank=rank, nafn=name, titill=title, heimild=url, samhengi=ctx[:160], sama_len=e.endswith('@' + host) or host.endswith(e.split('@')[1]))
    ordered = sorted(contacts.values(), key=lambda r: (r['rank'], not r['sama_len'], not bool(r['nafn']), r['netfang']))
    best = ordered[0] if ordered else None
    general = next((r for r in ordered if r['tegund'] == 'almennt'), None)
    return ordered, best, general

import subprocess
RENDER = True
HERE = os.path.dirname(os.path.abspath(__file__))
def render_js(site):
    urls = [site.base] + [u for u in site.pages if u != site.base and u.startswith('http') and u.rstrip('/') != site.base.rstrip('/')][:3]
    urls = list(dict.fromkeys(urls))
    try:
        p = subprocess.run(['node', os.path.join(HERE, 'render.mjs')] + urls, capture_output=True, text=True, timeout=120)
        d = json.loads(p.stdout or '{}')
        return {u: h for u, h in d.items() if h}
    except Exception as e:
        return {}

def process(row, idx=0):
    company = row.get('fyrirtaeki', ''); domain = row.get('vefur', '')
    out = dict(row)
    out.update(dict(vefur_endanlegur='', sidur=0, netfang='', tengilidur='', titill='', tegund='', netfang_heimild='', mx='', almennt_netfang='', oll_netfong='', villa=''))
    if not domain: out['villa'] = 'enginn vefur'; return out
    site = Site(domain)
    try:
        site.crawl()
    except Exception as e:
        site.err = str(e)[:120]
    out['vefur_endanlegur'] = site.base or ''
    out['sidur'] = len(set(site.pages.values()))
    if not site.pages:
        out['villa'] = site.err or 'náði ekki í vefinn'; return out
    ordered, best, general = analyse(site, company)
    if (not best or best['tegund'] in ('annad', 'nafngreint')) and not site.blocked and RENDER:
        rendered = render_js(site)
        if rendered:
            site.pages.update(rendered)
            ordered, best, general = analyse(site, company)
            out['sidur'] = len(set(site.pages.values()))
    if site.blocked: out['villa'] = 'vefurinn hafnar sjálfvirkum lestri (' + str(site.status.get(f'https://{site.domain}/', '')) + ')'
    if best:
        out.update(netfang=best['netfang'], tengilidur=best['nafn'], titill=best['titill'], tegund=best['tegund'], netfang_heimild=best['heimild'])
        out['mx'] = mx_ok(best['netfang'].split('@')[1])
    if general: out['almennt_netfang'] = general['netfang']
    out['oll_netfong'] = ' '.join(f"{r['netfang']}[{r['tegund']}{':' + r['nafn'] if r['nafn'] else ''}]" for r in ordered[:12])
    return out

def main():
    src, dst = sys.argv[1], sys.argv[2]
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 8
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    rows = list(csv.DictReader(open(src, encoding='utf-8-sig'), delimiter=';'))
    if limit: rows = rows[:limit]
    done = {}
    if os.path.exists(dst):   # resume: keep rows already processed
        for r in csv.DictReader(open(dst, encoding='utf-8'), delimiter=';'): done[(r.get('fyrirtaeki'), r.get('vefur'))] = r
    todo = [r for r in rows if (r.get('fyrirtaeki'), r.get('vefur')) not in done]
    print(f'{len(rows)} companies, {len(done)} done, {len(todo)} to do', flush=True)
    fields = None; results = list(done.values())
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for i, out in enumerate(ex.map(process, todo)):
            results.append(out)
            if fields is None:
                fields = list(out.keys())
            if i % 10 == 0 or i == len(todo) - 1:
                with open(dst, 'w', newline='', encoding='utf-8') as f:
                    w = csv.DictWriter(f, fieldnames=fields, delimiter=';', extrasaction='ignore'); w.writeheader(); w.writerows(results)
                print(f'{i + 1}/{len(todo)}  {int(time.time() - t0)}s  {out.get("fyrirtaeki")} -> {out.get("netfang")} [{out.get("tegund")}] {out.get("villa")}', flush=True)
    print('wrote', dst)

if __name__ == '__main__':
    main()
