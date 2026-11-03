#!/usr/bin/env python3
"""Finds an address for rows that are on the list but have none, by reading the company's own website.

For a row without a website it first looks for one: it builds likely domains from the company name
(Döðlur -> dodlur.is, Jökulá -> jokula.is …), keeps a domain only when it resolves, its front page
names the company and talks about the company's line of work, and it is not a parked or for-sale page.
Then it reads the site with contacts.py (front page, contact, about and staff pages; robots.txt is
respected; a site that refuses automated reading is left alone and only rendered in Chromium when it
loaded normally but drew its addresses with JavaScript).

Output: JSON Lines in the format add_found.py --gap reads:
  {"idx", "fyrirtaeki", "website", "email", "email_type", "tegund", "contact_name", "title", "source_url", "note"}

Usage: find_gap_contacts.py gap_rows.json [more.json ...] --out found_gap_crawl.jsonl [--workers 8]
"""
import json, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor
import requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import contacts  # noqa: E402

TR = str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')
def ascii_(s): return (s or '').replace('æ', 'ae').replace('Æ', 'ae').replace('þ', 'th').replace('Þ', 'th').translate(TR).lower()

GENERIC = set('''ehf hf slf sf ohf ses og the and of a i a ad
auglysingastofa auglysingastofan auglysingastofu augl honnunarstofa honnunarstofan honnunarhus honnun markadsstofa markadsstofan
markadssamskipti markadsradgjof radgjof radgjafi radgjafar radgjafastofa radningar radningarthjonusta thydingar thydingastofa
thydingathjonusta thydandi textathjonusta ljosmyndari ljosmyndastofa ljosmyndun myndbandagerd kvikmyndagerd framleidsla
studio stujdio stofa stofan thjonusta thjonustan lausnir verkstaedi heildverslun verslun ehf. hf. skrifstofa skrifstofuhotel
samvinnurymi fasteignafelag fasteignir leiga leigan bilaleiga raestingar raestingarthjonusta thrif hreingerningar
vinnuvernd heilsuvernd salfraedithjonusta salfraedistofa veisluthjonusta motuneyti namskeid fraedsla radstefnur
islands islandi island iceland reykjavik reykjavikur akureyri kopavogi hafnarfirdi'''.split())

SECTOR_WORDS = [
    (r'augl|hönnun|herferð|mörkun', r'augl|honnun|herferd|brand|marketing|design|creative|markads|morkun|ásýnd|asynd'),
    (r'ljósmynd|myndband|kvikmynd|drón|efnisgerð', r'ljosmynd|mynd|photo|video|film|kvikmynd|dron|content'),
    (r'þýðing|texta', r'thyd|túlk|tulk|translat|interpret|texta|profark|proofread'),
    (r'skrifstofuhúsn|samvinnurým|skrifstofuhót', r'skrifstof|leig|husnaed|office|cowork|samvinnu|rymi|fasteign|desk'),
    (r'vinnuvernd|starfsmannaheils|heilsurækt', r'vinnuvernd|heilsu|salfraed|ahaettumat|oryggi|vinnustad|health|fitness|likamsraekt'),
    (r'bílar|langtímaleig|sendibíl', r'bil|leig|car|van|sendibil|rental|lease'),
    (r'vefstof|vefhönn|vefversl', r'vef|web|honnun|forrit|design|digital|shopify|wordpress|kodun|develop'),
    (r'ræsting|þrif', r'raest|thrif|hreinger|clean'),
    (r'markaðsráðgj|söluþjálf|vörumerkjaráðgj', r'markads|radgjof|solu|marketing|brand|sales|consult'),
    (r'stjórnendaráðgj|rekstrar- og', r'radgjof|rekstr|stjorn|consult|strateg|advisory'),
    (r'mötuneyt|matarþjón|veiting', r'mat|veisl|hadegis|catering|eldhus|kokk|food|lunch'),
    (r'bank|greiðslu|posar', r'bank|greidsl|pay|posi|kort|card'),
    (r'launa', r'laun|mannaud|payroll|tima|hr\b'),
    (r'námskeið|fræðsl|þjálfun', r'namskeid|fraedsl|thjalf|kennsl|course|training|nam\b'),
    (r'rekstrarhugbún|sölukerf|netverslunarkerf', r'kerfi|hugbunad|software|kassa|bokhald|netversl|app\b|saas'),
    (r'merking|kynningarvör|fatnað', r'merk|fatnad|prent|gjaf|vinnufot|promo|print|logo'),
    (r'prentar|afritun', r'prentar|ljosrit|copier|print'),
    (r'stofnun fyrirtækja|styrkj|viðskiptaáætl', r'stofn|styrk|radgjof|vidskiptaaaetl|startup|grant'),
    (r'örygg|brunavarn|slökkvi', r'oryggi|voktun|brun|slokkvi|security|alarm|myndavel'),
]
PARKED = re.compile(r'domain (is )?for sale|buy this domain|this domain (may be|is) (for sale|parked)|lén til sölu|lenid er til solu|'
                    r'parkingcrew|sedo\.com|dan\.com|hugedomains|godaddy\.com/domainsearch|under construction|coming soon|'
                    r'website is (being|under)|isnic\.is/is/domain|þetta lén er|default web site page|apache2 (ubuntu|debian) default|'
                    r'it works!|welcome to nginx|index of /', re.I)
S = requests.Session(); S.headers.update(contacts.HEAD)


def tokens(name):
    n = re.sub(r'\([^)]*\)', ' ', name or '')
    n = re.sub(r'[/&,–\-]+', ' ', n)
    words = [re.sub(r'[^a-z0-9]', '', ascii_(w)) for w in n.split()]
    words = [w for w in words if w]
    distinct = [w for w in words if w not in GENERIC]
    return words, distinct


def candidates(name):
    words, distinct = tokens(name)
    c = []
    if distinct:
        c += [''.join(distinct), '-'.join(distinct), distinct[0]]
        if len(distinct) > 1: c += [distinct[0] + distinct[1]]
    if words: c += [''.join(words), '-'.join(words)]
    out = []
    for s in c:
        if len(s) < 3 or len(s) > 40: continue
        for tld in ('.is', '.com'):
            d = s + tld
            if d not in out: out.append(d)
    return out[:10], distinct


def resolves(domain):
    try:
        j = S.get('https://dns.google/resolve', params={'name': domain, 'type': 'A'}, timeout=12).json()
        return bool(j.get('Answer'))
    except Exception:
        return False


def sector_rx(flokkur):
    for rx, words in SECTOR_WORDS:
        if re.search(rx, flokkur or '', re.I): return re.compile(words, re.I)
    return None


ICELANDIC = re.compile(r'hafa samband|hafdu samband|kennitala|reykjavik|island|iceland|islensk|\behf\b|\bvid erum\b|\bum okkur\b|'
                       r'\bthjonusta\b|\bheimilisfang\b|\bsimi\b|\bnetfang\b|\.is\b')


def fetch_front(domain):
    for u in ('https://' + domain + '/', 'https://www.' + domain + '/', 'http://' + domain + '/'):
        try:
            r = S.get(u, timeout=15, allow_redirects=True)
            if r.status_code < 400: return r
        except Exception:
            continue
    return None


def verify(domain, words, distinct, flokkur):
    """(final_host, reason) when the domain's front page belongs to this company, else ('', reason).
    The page must name the company, be in Icelandic or about Iceland, and (unless the name is long and
    distinctive) talk about the company's line of work; short names must appear in full."""
    r = fetch_front(domain)
    if r is None: return '', 'svarar ekki'
    r.encoding = r.apparent_encoding if not r.encoding or r.encoding.lower() == 'iso-8859-1' else r.encoding
    html = r.text or ''
    text = ascii_(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', html, flags=re.S)))
    text = re.sub(r'\s+', ' ', text)
    if len(text.strip()) < 80 or (len(text) < 2000 and PARKED.search(text)): return '', 'tóm eða lögð síða'
    host = re.sub(r'^www\.', '', requests.utils.urlparse(r.url).netloc.lower())
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    title = ascii_(m.group(1)) if m else ''
    hay = title + ' ' + text
    squashed = re.sub(r'[^a-z0-9]', '', hay)
    main = distinct[0] if distinct else ''
    if not main: return '', 'ekkert sérkenni í nafni'
    if len(ICELANDIC.findall(hay + ' ' + html.lower()[:200000])) < 2: return '', 'ekki íslenskur vefur'
    srx = sector_rx(flokkur)
    sector_ok = bool(srx and srx.search(hay))
    sld = re.sub(r'[^a-z0-9]', '', host.split('.')[0]) if host else ''
    exact_domain = sld in (main, re.sub(r'[^a-z0-9]', '', ''.join(distinct)))
    if main not in squashed:
        # the logo carries the name and the text does not: accept only an exact domain match in the right line of work
        if not (exact_domain and sector_ok and len(main) >= 5): return '', 'nafnið kemur ekki fyrir'
    if len(main) < 5 and re.sub(r'[^a-z0-9]', '', ''.join(words)) not in squashed:
        return '', 'stutt nafn kemur ekki fyrir í heild'
    if not sector_ok and len(main) < 7: return '', 'starfsemin passar ekki'
    return host, 'staðfest' + ('' if sector_ok else ' (nafn)')


def find_site(row):
    cands, distinct = candidates(row['fyrirtaeki'])
    words, _ = tokens(row['fyrirtaeki'])
    for d in cands:
        if not resolves(d): continue
        host, why = verify(d, words, distinct, row.get('flokkur', ''))
        if host: return host, f'vefur fundinn út frá nafni: {d}'
    return '', 'enginn vefur fannst út frá nafni'


def handle(row):
    out = dict(idx=row['idx'], fyrirtaeki=row['fyrirtaeki'], website='', email='', email_type='none', tegund='',
               contact_name='', title='', source_url='', note='')
    site = (row.get('vefur') or '').strip()
    note = []
    if '403' in (row.get('athugasemd') or '') or 'hafnar sjálfvirkum' in (row.get('athugasemd') or ''):
        out['note'] = 'vefurinn hafnar sjálfvirkum lestri; ekki reynt aftur'; return out
    if not site:
        site, why = find_site(row); note.append(why)
        if not site: out['note'] = '; '.join(note); return out
        out['website'] = site
    res = contacts.process(dict(fyrirtaeki=row['fyrirtaeki'], vefur=site))
    if res.get('villa'): note.append(res['villa'])
    if res.get('netfang'):
        t = res.get('tegund')
        out.update(email=res['netfang'], source_url=res.get('netfang_heimild') or '',
                   email_type='general' if t in ('almennt', 'annad') else 'personal',
                   tegund={'markadur': 'markaðsstjóri', 'stjornandi': 'stjórnandi/eigandi', 'sala': 'sölustjóri',
                           'almennt': 'almennt netfang', 'nafngreint': 'nafngreindur starfsmaður', 'annad': 'netfang á vef (óflokkað)'}.get(t, ''),
                   contact_name=res.get('tengilidur') or '', title=res.get('titill') or '')
    else:
        note.append('ekkert netfang á vefnum')
    out['note'] = '; '.join(n for n in note if n)
    return out


def fill_new(n):
    """A new company from research that has no address yet: find its site if needed and read the address off it."""
    if (n.get('netfang') or '').strip(): return n
    site = re.sub(r'^https?://', '', (n.get('vefur') or '').strip()).split('/')[0]
    if not site:
        site, why = find_site(dict(fyrirtaeki=n.get('fyrirtaeki', ''), flokkur=n.get('flokkur', '')))
        if not site: return n
        n = dict(n, vefur=site)
    res = contacts.process(dict(fyrirtaeki=n.get('fyrirtaeki', ''), vefur=site))
    if res.get('netfang'):
        n = dict(n, netfang=res['netfang'], email_source_url=res.get('netfang_heimild') or '',
                 email_type='general' if res.get('tegund') in ('almennt', 'annad') else 'personal')
    return n


def main_new(args):
    """--new IN.jsonl ... --out OUT.jsonl : the same records, with addresses filled in where the site shows one."""
    out_path = args[args.index('--out') + 1]
    workers = int(args[args.index('--workers') + 1]) if '--workers' in args else 6
    ins = [a for a in args if a.endswith('.jsonl') and a != out_path]
    recs = [json.loads(l) for p in ins for l in open(p, encoding='utf-8') if l.strip()]
    with ThreadPoolExecutor(max_workers=workers) as ex, open(out_path, 'w', encoding='utf-8') as f:
        for n in ex.map(fill_new, recs):
            f.write(json.dumps(n, ensure_ascii=False) + '\n')
    print('wrote', out_path, len(recs))


def main():
    args = sys.argv[1:]
    if '--new' in args: return main_new(args)
    out_path = args[args.index('--out') + 1]
    workers = int(args[args.index('--workers') + 1]) if '--workers' in args else 8
    inputs = [a for a in args if a.endswith('.json')]
    rows = [r for p in inputs for r in json.load(open(p, encoding='utf-8'))]
    done = set()
    if os.path.exists(out_path):
        done = {json.loads(l)['idx'] for l in open(out_path, encoding='utf-8') if l.strip()}
    todo = [r for r in rows if r['idx'] not in done]
    print(f'{len(rows)} rows, {len(done)} done, {len(todo)} to do', flush=True)
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=workers) as ex, open(out_path, 'a', encoding='utf-8') as f:
        for i, o in enumerate(ex.map(handle, todo)):
            f.write(json.dumps(o, ensure_ascii=False) + '\n'); f.flush()
            if o['email'] or i % 10 == 0:
                print(f"{i + 1}/{len(todo)} {int(time.time() - t0)}s {o['fyrirtaeki']} -> {o['website'] or '-'} {o['email'] or ''} [{o['note'][:60]}]", flush=True)
    print('wrote', out_path)


if __name__ == '__main__':
    main()
