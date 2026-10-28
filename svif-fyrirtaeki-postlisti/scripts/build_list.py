#!/usr/bin/env python3
"""Merges every source into one company list (companies.csv) for the contact crawler.

Sources:
  data/lmfi.csv      lawyers from lmfi.is, grouped into law firms (the firm's site comes from the lawyers' pages
                     or their e-mail domain; the lawyers themselves become fallback contacts)
  data/fle.csv       auditors from fle.is, grouped into audit/accounting firms (in-house auditors at banks,
                     public bodies and ordinary companies are dropped)
  agents/*.csv       companies found per category by web search (flokkur;undirflokkur;fyrirtaeki;vefur;heimild;athugasemd)

Output columns: fyrirtaeki;vefur;flokkur;undirflokkur;heimild;skra_tengilidur;skra_netfang;skra_titill;athugasemd
Usage: build_list.py <scratch dir> <out csv>
"""
import csv, glob, os, re, sys, collections

ROOT, OUT = sys.argv[1], sys.argv[2]
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()
TRANS = str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')
def key(name):
    n = clean(name).translate(TRANS).replace('þ', 'th').lower()
    n = re.sub(r'\b(ehf|hf|slf|sf|ohf|svf|ses|lögmenn|logmenn|lögmannsstofa|logmannsstofa)\b\.?', '', n)
    return re.sub(r'[^a-z0-9]', '', n)
def domain_of(url_or_mail):
    s = clean(url_or_mail).lower()
    if '@' in s: s = s.split('@', 1)[1]
    s = re.sub(r'^https?://', '', s).replace('www.', '').split('/')[0].strip()
    return s if re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', s) else ''
FREE_MAIL = {'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'simnet.is', 'internet.is', 'mi.is', 'islandia.is', 'visir.is', 'hive.is', 'vortex.is', 'live.com', 'icloud.com', 'me.com', 'msn.com', 'centrum.is', 'emax.is', 'talnet.is', 'mmedia.is', 'snerpa.is', 'nett.is', 'hotmail.is', 'gmail.is', 'outlook.is'}

rows = {}
def add(name, vefur, flokkur, undir, heimild, tengilidur='', netfang='', titill='', ath=''):
    k = key(name)
    if not k: return
    r = rows.get(k)
    if r is None:
        rows[k] = dict(fyrirtaeki=clean(name), vefur=vefur, flokkur=flokkur, undirflokkur=undir, heimild=heimild,
                       skra_tengilidur=tengilidur, skra_netfang=netfang, skra_titill=titill, athugasemd=ath)
    else:
        if not r['vefur'] and vefur: r['vefur'] = vefur
        if not r['skra_netfang'] and netfang: r.update(skra_tengilidur=tengilidur, skra_netfang=netfang, skra_titill=titill)
        if r['heimild'] != heimild and heimild and heimild not in r['heimild']: r['heimild'] += ' | ' + heimild

# ---- law firms
firms = collections.defaultdict(list)
for l in csv.DictReader(open(os.path.join(ROOT, 'data', 'lmfi.csv'), encoding='utf-8'), delimiter=';'):
    if l.get('villa') or not l.get('stofa'): continue
    firms[clean(l['stofa'])].append(l)
for stofa, ls in firms.items():
    if re.search(r'\b(banki|bankinn|ríki|ríkis|sýslumaður|sýslumann|dómstól|ráðuneyti|stofnun|borg|bær|sveitarfélag|háskól|samtök|sjóður|lífeyris|tryggingar|Landsvirkjun|Icelandair|Síminn|Festi|Hagar|Eimskip|Samskip|Skatturinn|Alþingi|embætti|lögregl|Seðlabanki|Fjármálaeftirlit)\b', stofa, re.I):
        continue
    if not re.search(r'lög|log|law|juris|lex|legal|réttur|rettur|ráðgj|radgj|slf|ehf|hf|sf\b|stofa|lögmenn|logmenn|lögfræði|logfraedi', stofa, re.I):
        continue
    doms = collections.Counter(domain_of(l['vefur']) for l in ls if domain_of(l['vefur']))
    mdoms = collections.Counter(domain_of(l['netfang']) for l in ls if domain_of(l['netfang']) and domain_of(l['netfang']) not in FREE_MAIL)
    vefur = (doms.most_common(1) or mdoms.most_common(1) or [('', 0)])[0][0]
    # fallback contact: a partner/owner if the title says so, else the first lawyer with a firm-domain address
    ls_sorted = sorted(ls, key=lambda l: (0 if re.search(r'eigandi|meðeig|partner', l.get('titill', ''), re.I) else 1, 0 if domain_of(l['netfang']) == vefur else 1))
    c = next((l for l in ls_sorted if l['netfang']), None)
    add(stofa, vefur, 'Lögfræðiþjónusta', 'Lögmannsstofa', 'https://www.lmfi.is/logmannalisti',
        c['nafn'] if c else '', c['netfang'] if c else '', 'lögmaður' if c else '', f'{len(ls)} lögmenn á skrá' + ('' if vefur else '; enginn vefur skráður'))

# ---- audit / accounting firms
wps = collections.defaultdict(list)
for a in csv.DictReader(open(os.path.join(ROOT, 'data', 'fle.csv'), encoding='utf-8'), delimiter=';'):
    if not a.get('vinnustadur'): continue
    wps[clean(a['vinnustadur'])].append(a)
FIRM_HINT = re.compile(r'endursko|bókhald|bokhald|reikning|ráðgjöf|radgjof|bókun|bokun|uppgjör|Deloitte|KPMG|Pricewaterhouse|PwC|Ernst|EY\b|BDO|Grant Thornton|Enor|ECIT|Advant|Rýni|Gæða|ODT|DFK|Þrep|LOGOS|löggilt|loggilt|fjársýsla|Bókað|Fjárstoð|Uppgjör|Endursk|Skil\b|Auðlind|reikningsskil|Account', re.I)
for wp, as_ in wps.items():
    if not FIRM_HINT.search(wp): continue
    if re.search(r'Ríkisendurskoðun|Fjársýsla ríkisins|Skatturinn|banki|Landsvirkjun|lífeyris', wp, re.I): continue
    name = re.sub(r'\s*-\s*(Akureyri|Reykjavík|Reykjanesbær|Selfoss|Egilsstaðir|Ísafjörður|Akranes|Hafnarfjörður|Kópavogur|Vestmannaeyjar|Sauðárkrókur|Húsavík|Borgarnes).*$', '', wp)
    mdoms = collections.Counter(domain_of(a['netfang']) for a in as_ if domain_of(a['netfang']) and domain_of(a['netfang']) not in FREE_MAIL)
    vefur = (mdoms.most_common(1) or [('', 0)])[0][0]
    c = next((a for a in as_ if a['netfang'] and domain_of(a['netfang']) == vefur), None) or next((a for a in as_ if a['netfang']), None)
    add(name, vefur, 'Bókhald og endurskoðun', 'Endurskoðunarstofa', 'https://www.fle.is/is/felagatal',
        c['nafn'] if c else '', c['netfang'] if c else '', 'löggiltur endurskoðandi' if c else '', f'{len(as_)} endurskoðendur á skrá')

# ---- agent research
for fn in sorted(glob.glob(os.path.join(ROOT, 'agents', '*.csv'))):
    n = 0
    for r in csv.DictReader(open(fn, encoding='utf-8-sig'), delimiter=';'):
        name = clean(r.get('fyrirtaeki', ''))
        if not name: continue
        add(name, domain_of(r.get('vefur', '')), clean(r.get('flokkur', '')), clean(r.get('undirflokkur', '')), clean(r.get('heimild', '')), ath=clean(r.get('athugasemd', ''))); n += 1
    print(os.path.basename(fn), n)

out = sorted(rows.values(), key=lambda r: (r['flokkur'], r['fyrirtaeki']))
with open(OUT, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys()), delimiter=';'); w.writeheader(); w.writerows(out)
print('companies', len(out), 'with website', sum(1 for r in out if r['vefur']))
print(collections.Counter(r['flokkur'] for r in out).most_common())
