#!/usr/bin/env python3
"""Turns the crawler output (plus the registry fallbacks) into the mailing list: one row per company with the
address that will be written to, who it is, how it was verified, the greeting and the category phrase that go
into the e-mail, and empty columns for the sending log.

Order of preference for the address:
  1. markaðsstjóri found on the company's site      4. sölustjóri found on the site
  2. framkvæmdastjóri / eigandi found on the site   5. a named person on the site (title unknown)
  3. a named lawyer / auditor from the registry     6. the company's general address found on the site

Usage: finalize_list.py contacts.csv postlisti.csv
"""
import csv, re, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from greeting import greeting, gender
import requests

SRC, DST = sys.argv[1], sys.argv[2]
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()

# the phrase that fills "...einmitt á þeim tímapunkti sem þau eru að velja sér {þjónusta} og annað sem nýr rekstur þarf"
PHRASES = [
    (r'lögfræ|lögm|hugverk|vörumerkjaskr|einkaleyf', 'lögfræðiþjónustu'),
    (r'endurskoð', 'endurskoðanda'),
    (r'bókhald|bókar', 'bókhaldsstofu'),
    (r'launa|rekstrarhugbún|bókhaldskerf|hugbúnað', 'launa- og bókhaldskerfi'),
    (r'innheimt', 'innheimtuþjónustu'),
    (r'bank|greiðslu|pos', 'banka og greiðslulausnir'),
    (r'trygg|vátrygg', 'tryggingar'),
    (r'fjármögn|rekstrarleig|leigufélag', 'fjármögnun'),
    (r'auglýsingastof|birting', 'auglýsingastofu'),
    (r'hönnun|grafísk|vörumerk|ásýnd', 'hönnuð fyrir merki og ásýnd'),
    (r'vefstof|vefsíð|vefhönn|vefversl', 'vefsíðu'),
    (r'stafræn|seo|samfélagsmið|markaðssetn', 'markaðsþjónustu'),
    (r'ljósmynd|myndband|efnisgerð|drón', 'ljósmyndara og efnisgerð'),
    (r'prentsmið|prentþjón|prentun', 'prentþjónustu'),
    (r'merking|skilt|kynningarvör|fatnað', 'merkingar og skilti'),
    (r'tölvubún|tölvuversl', 'tölvubúnað'),
    (r'upplýsingatæk|rekstrarþjón|tölvuþjón|hýsing', 'tölvuþjónustu'),
    (r'sölukerf|netverslunarkerf', 'sölu- og bókhaldskerfi'),
    (r'fjarskipt|símkerf', 'síma og fjarskipti'),
    (r'prentar|afritun|skrifstofutæk', 'skrifstofutæki'),
    (r'netörygg|persónuvernd|undirrit', 'netöryggi og rafræna undirritun'),
    (r'lén|tölvupóst', 'lén og vefhýsingu'),
    (r'skrifstofuhúsn|samvinnurým|skrifstofuhót|atvinnuhúsn|fasteign', 'skrifstofuhúsnæði'),
    (r'húsgögn|innrétting', 'skrifstofuhúsgögn'),
    (r'rekstrarvör|pappír|skrifstofuvör', 'rekstrarvörur'),
    (r'kaffi', 'kaffivélar'),
    (r'ræsting|þrif', 'ræstingar'),
    (r'örygg|brunavarn|slökkvi', 'öryggiskerfi'),
    (r'bíl|sendibíl|flutning', 'bíla og flutninga'),
    (r'mötuneyt|matar|veiting', 'matarþjónustu'),
    (r'ráðning|mannauð', 'ráðningarþjónustu'),
    (r'markaðsráðgj|söluþjálf|rannsókn', 'markaðsráðgjöf'),
    (r'þýðing|texta', 'þýðingar'),
    (r'námskeið|fræðsl|þjálfun', 'fræðslu og námskeið'),
    (r'vinnuvernd|heilsa|heilsurækt|líkamsrækt', 'heilsu- og vinnuverndarþjónustu'),
    (r'stofnun|styrkj|viðskiptaáætl', 'ráðgjöf við stofnun'),
    (r'ráðgjöf|stjórnend', 'ráðgjöf'),
]
def phrase(flokkur, undir):
    t = (flokkur + ' ' + undir).lower()
    for rx, ph in PHRASES:
        if re.search(rx, t): return ph
    return 'þjónustu eins og ykkar'

NOUNISH = re.compile(r'^(Bókhald|Endurskoðun|Ráðgjöf|Lögfræði|Skrifstofa|Starfsfólk|Stjórn|Teymi|Hönnun|Prentun|Verslun|Þjónusta|Netfang|Sími|Nafn|Reykjavík|Akureyri|Ísland|Sala|Markaður|Markaðs|Fyrirtæki|Hafðu|Hafa|Samband)$', re.I)
MX = {}
def mx(domain):
    if domain in MX: return MX[domain]
    try:
        j = requests.get('https://dns.google/resolve', params={'name': domain, 'type': 'MX'}, timeout=15).json()
        ans = [a['data'] for a in j.get('Answer', []) if a.get('type') == 15]
        MX[domain] = 'MX:' + ans[0].split()[-1].rstrip('.') if ans else 'ekkert MX'
    except Exception:
        MX[domain] = 'DNS?'
    return MX[domain]

NOUN_WORDS = re.compile(r'^(Bókhald|Endurskoðun|Ráðgjöf|Lögfræði|Lögmenn|Lögmaður|Skrifstofa|Starfsfólk|Starfsmaður|Yfirstjórn|Fjármáladeild|Söludeild|Markaðsdeild|Deild|Stjórn|Teymi|Hönnun|Prentun|Verslun|Þjónusta|Símatími|Opið|Hafðu|Hafa|Samband|Netfang|Sími|Símanúmer|Skilaboð|Senda|Nafn|Fax|Kennitala|Heimilisfang|Fyrirtæki|Reykjavík|Kópavogur|Hafnarfjörður|Akureyri|Garðabær|Mosfellsbær|Selfoss|Ísland|Iceland|Google|Facebook|Instagram|Linkedin|About|Services|Service|Contact|Team|Home|Menu|Email|Phone|Partner|Partners|Ads|Meta|Microsoft|Apple|Premium|Vefur|Vefsíða|Vefverslun|Tölvupóstur|Póstur|Sala|Markaður|Markaðs)$', re.I)
TITLE_WORD = re.compile(r'(stjóri|stjórnandi|eigandi|stofnandi|fulltrúi|ráðgjafi|endurskoðandi|lögmaður|lögfræðingur|bókari|hönnuður|sérfræðingur|forritari|þjónn|CEO|CFO|COO|CMO|Partner|Manager|Managing|Director|Senior|Head|Chief|Lead|Founder|Owner|Consultant|Designer|Developer|Specialist)$', re.I)
def person_name(n):
    """Strip labels and title words that the crawler left around a person's name; '' when nothing person-like remains."""
    n = re.sub(r'\([^)]*\)', ' ', n)
    w = [x for x in clean(n).split() if x]
    while w and (NOUN_WORDS.match(w[0]) or TITLE_WORD.search(w[0])): w = w[1:]
    while w and (NOUN_WORDS.match(w[-1]) or TITLE_WORD.search(w[-1])): w = w[:-1]
    w = w[:4]
    if not w or len(w[0]) < 3 or not re.match(r'^[A-ZÁÉÍÓÚÝÞÆÖ][a-záéíóúýþæöð]+$', w[0]): return ''
    return ' '.join(w)

SERVICE_BOX = re.compile(r'^(bokhald|bókhald|reikningar|innkaup|atvinna|starf|umsokn|umsoknir|press|frettir|kvartanir|bokari|laun|greidslur|hjalp|help|support|thjonustuver|noreply|webmaster|postmaster|dpo|privacy|security|abuse|hr|jobs|career|billing|invoice|accounting|reikning|afstemming|fjarfestatengsl|utleiga|verslun|pantanir|order|orders|netverslun|vefverslun)(?=$|[._\-0-9])', re.I)
GENERIC_BOX = re.compile(r'^(info|upplysingar|skrifstofa|postur|mail|hello|hallo|office|kontakt|contact|sala|sales|afgreidsla|reception|mottaka|fyrirspurnir|velkomin|stofan|logmenn|endurskodun|admin|markadur|marketing|markadsdeild|kynning)$', re.I)
EXCLUDE = re.compile(r'samtök|^félag |félag löggiltra|félag íslenskra|stofnun$|ríkis|ráðuneyti|sveitarfélag|háskól|eftirlit|you@company', re.I)
def site_domain(url):
    d = re.sub(r'^https?://', '', (url or '').lower()).replace('www.', '').split('/')[0]
    return d
def base_name(domain):
    parts = domain.split('.')
    return parts[-2] if len(parts) >= 2 else domain
def others(col):
    """[(email, type, name)] from the crawler's 'oll_netfong' column."""
    out = []
    for tok in (col or '').split():
        m = re.match(r'^([^\[\s]+)\[([a-z]+)(?::(.*))?\]$', tok)
        if m: out.append((m.group(1).lower(), m.group(2), m.group(3) or ''))
    return out
def better_general(chosen, row):
    """A plainer company mailbox than a service inbox like bokhald@, when the site shows one."""
    dom = site_domain(row.get('vefur_endanlegur') or row.get('vefur'))
    cands = [e for e, t, n in others(row.get('oll_netfong')) if e != chosen and not SERVICE_BOX.match(e.split('@')[0]) and not BAD_PLACEHOLDER.search(e)]
    def score(e):
        local, d = e.split('@')
        return (0 if local == base_name(d) or local == base_name(dom) else 1 if GENERIC_BOX.match(local) else 2, 0 if d.endswith(base_name(dom) + '.') or d == dom or base_name(d) == base_name(dom) else 1)
    cands = [e for e in cands if score(e)[0] < 2]
    return min(cands, key=score) if cands else ''
BAD_PLACEHOLDER = re.compile(r'company\.com|example|%20|u003e|sentry|wixpress', re.I)

from greeting import MALE, FEMALE
def looks_like_person(n, local):
    """True when the cleaned name is plausibly the person behind the address."""
    if not n: return False
    w = n.split()
    tr = str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')
    asc = [x.translate(tr).replace('þ', 'th').lower() for x in w]
    loc = re.sub(r'[^a-z]', '', local.translate(tr).lower())
    if loc and len(loc) >= 3 and (asc[0].startswith(loc[:4]) or loc.startswith(asc[0][:4]) or ''.join(x[0] for x in asc) == loc
                                  or loc in (asc[0][0] + asc[-1], asc[0] + asc[-1][0], asc[0] + asc[-1], asc[-1]) or asc[-1].startswith(loc)): return True
    if loc and len(loc) >= 4 and re.fullmatch(r'[a-z]+', loc) and not GENERIC_BOX.match(loc) and not SERVICE_BOX.match(loc): return False   # someone else's mailbox
    if w[0] in MALE or w[0] in FEMALE: return True
    return any(re.search(r'(son|dóttir|dottir|bur)$', x) for x in w)

def company_display(name):
    n = clean(name)
    n = re.sub(r'\s*[-–]\s*(Reykjavík|Akureyri)$', '', n)
    n = re.sub(r'\s+(ehf|hf|slf|sf|ohf|svf)\.?$', '', n, flags=re.I)
    return n

out = []
for r in csv.DictReader(open(SRC, encoding='utf-8'), delimiter=';'):
    typ = r.get('tegund', ''); site_name = r.get('tengilidur', '')
    reg_name, reg_mail, reg_title = r.get('skra_tengilidur', ''), r.get('skra_netfang', ''), r.get('skra_titill', '')
    choice = None
    if r.get('netfang') and typ in ('markadur', 'stjornandi'):
        choice = (r['netfang'], site_name, r.get('titill', ''), {'markadur': 'markaðsstjóri', 'stjornandi': 'stjórnandi/eigandi'}[typ], 'á vef fyrirtækisins: ' + r.get('netfang_heimild', ''))
    elif reg_mail:
        choice = (reg_mail, reg_name, reg_title, 'nafngreindur ' + reg_title, 'í félagatali: ' + r.get('heimild', '').split(' | ')[0])
    elif r.get('netfang') and typ in ('sala', 'nafngreint'):
        choice = (r['netfang'], site_name, r.get('titill', ''), 'sölustjóri' if typ == 'sala' else 'nafngreindur starfsmaður', 'á vef fyrirtækisins: ' + r.get('netfang_heimild', ''))
    elif r.get('almennt_netfang'):
        choice = (r['almennt_netfang'], '', '', 'almennt netfang', 'á vef fyrirtækisins: ' + r.get('netfang_heimild', ''))
    elif r.get('netfang'):
        choice = (r['netfang'], site_name, r.get('titill', ''), 'netfang á vef (óflokkað)', 'á vef fyrirtækisins: ' + r.get('netfang_heimild', ''))
    row = dict(fyrirtaeki=company_display(r['fyrirtaeki']), flokkur=r.get('flokkur', ''), undirflokkur=r.get('undirflokkur', ''), vefur=r.get('vefur_endanlegur') or r.get('vefur', ''),
               netfang='', tengilidur='', titill='', tegund='', stadfesting='', mx='', kvedja='', thjonusta=phrase(r.get('flokkur', ''), r.get('undirflokkur', '')),
               onnur_netfong=r.get('oll_netfong', '')[:300], athugasemd=r.get('villa', '') or r.get('athugasemd', ''), sent='', message_id='', svar='')
    if choice and not re.fullmatch(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', choice[0]):
        choice = None
    if EXCLUDE.search(r['fyrirtaeki']) or BAD_PLACEHOLDER.search(r.get('netfang', '')):
        choice = None; r['villa'] = (r.get('villa', '') + '; ' if r.get('villa') else '') + 'ekki fyrirtæki / ógilt netfang, sleppt'
    if choice:
        e, n, t, typ_is, verif = choice
        n = person_name(n)
        local, dom = e.split('@')
        sdom = site_domain(r.get('vefur_endanlegur') or r.get('vefur'))
        # a company name mistaken for a person
        cname = re.sub(r'[^a-z0-9]', '', (r['fyrirtaeki'] or '').translate(str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')).lower())
        if n and any(len(w) >= 4 and re.sub(r'[^a-z0-9]', '', w.translate(str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')).lower()) in cname for w in n.split()): n = ''
        if n and re.search(r'(gerð|þjónusta|stofa|stofan|hönnun|lausnir|kerfi|verslun|miðlun|ráðgjöf|félag|setur|prent|merking)$', n.split()[-1], re.I): n = ''
        # a mailbox that is plainly the company's, whatever the crawler read next to it
        if (GENERIC_BOX.match(local) or local == base_name(dom) or local == base_name(sdom)) and 'félagatali' not in verif:
            n, t, typ_is = '', '', 'almennt netfang'
        # the accounting or support inbox is not who we write to: prefer the plain company mailbox if the site shows one
        if SERVICE_BOX.match(local) and 'félagatali' not in verif:
            alt = better_general(e, r)
            if alt: e, n, t, typ_is = alt, '', '', 'almennt netfang'
            else: n, t, typ_is = '', '(þjónustupósthólf)', 'almennt netfang'
        # an address on a foreign domain when the site shows one on its own: take the company's own
        if sdom.endswith('.is') and not dom.endswith('.is') and 'félagatali' not in verif:
            alt = better_general(e, r)
            if alt: e, n, t, typ_is = alt, '', '', 'almennt netfang'
        if n and 'félagatali' not in verif and not looks_like_person(n, e.split('@')[0]): n, t = '', ''
        if not n and typ_is not in ('almennt netfang',) and 'félagatali' not in verif and typ_is != 'netfang á vef (óflokkað)':
            typ_is, t = 'netfang á vef (óflokkað)', ''
        row.update(netfang=e, tengilidur=n, titill=t, tegund=typ_is, stadfesting=verif, mx=mx(e.split('@')[1]), kvedja=greeting(n))
    else:
        row['athugasemd'] = (row['athugasemd'] + '; ' if row['athugasemd'] else '') + 'ekkert netfang fannst'
    out.append(row)

out.sort(key=lambda r: (r['netfang'] == '', r['flokkur'], r['fyrirtaeki']))
# one row per company: the same firm reached through two sources (registry + research) keeps its best contact
RANK = {'markaðsstjóri': 0, 'stjórnandi/eigandi': 1, 'nafngreindur lögmaður': 2, 'nafngreindur löggiltur endurskoðandi': 2, 'sölustjóri': 3, 'nafngreindur starfsmaður': 4, 'almennt netfang': 5, 'netfang á vef (óflokkað)': 6, '': 9}
def ckey(r):
    d = site_domain(r['vefur'])
    nm = re.sub(r'[^a-z0-9]', '', r['fyrirtaeki'].lower().translate(str.maketrans('áéíóúýðæöþ', 'aeiouydaot')))
    nm = re.sub(r'(ehf|hf|slf|sf|logmenn|logmannsstofa|endurskodun|auglysingastofa|fyrirtaekjathjonusta|b2b)$', '', nm)
    return (base_name(d) if d and base_name(d) not in ('facebook', 'wordpress', 'squarespace', 'wixsite', 'google') else nm)
best = {}
for r in sorted(out, key=lambda r: RANK.get(r['tegund'], 9)):
    k = ckey(r)
    if not k: continue
    if k in best and best[k] is not r:
        if r['netfang']: r['sent'] = 'sleppt: sama fyrirtæki og ' + best[k]['fyrirtaeki']
        r['athugasemd'] = (r['athugasemd'] + '; ' if r['athugasemd'] else '') + 'sama fyrirtæki og ' + best[k]['fyrirtaeki']
    else:
        best[k] = r
seen = {}
for r in out:
    e = r['netfang'].lower()
    if not e or r['sent']: continue
    if e in seen:
        r['athugasemd'] = (r['athugasemd'] + '; ' if r['athugasemd'] else '') + f"sama netfang og {seen[e]}, ekki sent tvisvar"
        r['sent'] = 'sleppt: sama netfang og ' + seen[e]
    else:
        seen[e] = r['fyrirtaeki']
with open(DST, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys()), delimiter=';'); w.writeheader(); w.writerows(out)
# the same list as a spreadsheet, for reading and ticking off by hand
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
    wb = Workbook(); ws = wb.active; ws.title = 'Póstlisti'
    cols = list(out[0].keys()); ws.append(cols)
    for c in ws[1]: c.font = Font(bold=True); c.fill = PatternFill('solid', fgColor='E8ECF5')
    for r in out: ws.append([r[c] for c in cols])
    widths = dict(fyrirtaeki=34, flokkur=28, undirflokkur=24, vefur=26, netfang=32, tengilidur=28, titill=22, tegund=24, stadfesting=50, mx=18, kvedja=16, thjonusta=24, onnur_netfong=40, athugasemd=30, sent=12, message_id=18, svar=14)
    for i, c in enumerate(cols, 1): ws.column_dimensions[get_column_letter(i)].width = widths.get(c, 16)
    ws.freeze_panes = 'B2'; ws.auto_filter.ref = ws.dimensions
    wb.save(DST.rsplit('.', 1)[0] + '.xlsx')
except Exception as e:
    print('xlsx skipped:', e)
n_mail = sum(1 for r in out if r['netfang'])
from collections import Counter
print(f'{len(out)} companies, {n_mail} with an address;', Counter(r['tegund'] for r in out if r['netfang']).most_common())
print('MX problems:', sum(1 for r in out if r['netfang'] and not r['mx'].startswith('MX:')))
