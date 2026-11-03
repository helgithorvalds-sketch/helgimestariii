#!/usr/bin/env python3
"""Adds research results to postlisti.csv without ever creating a second e-mail to the same company.

Two kinds of input, both JSON Lines written by the research agents:
  --gap  FILE ...   addresses found for rows that are already on the list but had none
                    {"idx", "fyrirtaeki", "email", "email_type", "contact_name", "title", "source_url", "note"}
  --new  FILE ...   companies that are not on the list yet
                    {"flokkur", "undirflokkur", "fyrirtaeki", "vefur", "netfang", "email_type",
                     "email_source_url", "heimild", "athugasemd", "fit"}

An address is used only when
  - it is a well-formed address with a recorded source URL (nothing guessed),
  - it is not a jobs/billing/no-reply style mailbox, and not Helgi's own address,
  - its domain has an MX record (checked over DNS-over-HTTPS, as in contacts.py),
  - no other row on the list already has that address, that e-mail domain or that website domain
    (free-mail domains such as gmail.com are compared by full address only),
  - the company is not on the exclusion list (companies Helgi has already been in contact with).
New companies are also skipped when their name already appears on the list.

Usage:
  add_found.py postlisti.csv --gap found_gap_1.jsonl ... --new new_B1.jsonl ... --exclude crm_exclude.json
               [--report report.json] [--dry-run]
"""
import argparse, csv, json, re, sys, datetime
import requests

FREE_MAIL = {'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'simnet.is', 'internet.is', 'mi.is', 'islandia.is',
             'visir.is', 'hive.is', 'vortex.is', 'live.com', 'icloud.com', 'me.com', 'msn.com', 'centrum.is', 'emax.is',
             'talnet.is', 'mmedia.is', 'snerpa.is', 'nett.is', 'hotmail.is', 'gmail.is', 'outlook.is', 'googlemail.com'}
OWN = {'helgithorvalds@gmail.com', 'helgithorvald@gmail.com'}
OWN_DOMAINS = {'svif.is'}
EMAIL_RE = re.compile(r'^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$')
BAD_ADDR = re.compile(r'(example\.|sentry|wixpress|\.png$|\.jpg$|\.gif$|\.svg$|\.webp$|noreply|no-reply|donotreply|do-not-reply|yourdomain|domain\.com|@test)', re.I)
BAD_LOCAL = re.compile(r'^(atvinna|starf|storf|umsokn|umsoknir|jobs?|careers?|hr|reikning|reikningar|invoices?|billing|kvartanir|'
                       r'privacy|dpo|gdpr|personuvernd|abuse|postmaster|webmaster|press|fjolmidlar|fjarfestatengsl|ir|'
                       r'mailer-daemon|bounce|askrift|ritstjorn|ritstjori|frett|frettir|netfrett|frettaskot|lager)(?=$|[._\-0-9])', re.I)
TR = str.maketrans('áéíóúýðæöÁÉÍÓÚÝÐÆÖ', 'aeiouydaoAEIOUYDAO')
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()


def name_key(n):
    n = re.sub(r'\([^)]*\)', ' ', n or '').translate(TR).replace('þ', 'th').replace('Þ', 'th').lower()
    n = re.sub(r'\b(ehf|hf|slf|sf|ohf|ses|svf)\b\.?', '', n)
    return re.sub(r'[^a-z0-9]', '', n)


def domain_of(s):
    s = clean(s).lower()
    if not s: return ''
    if '@' in s: s = s.split('@', 1)[1]
    s = re.sub(r'^https?://', '', s)
    s = re.sub(r'^www\.', '', s).split('/')[0].split('?')[0].strip('.')
    return s if re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', s) else ''


MX = {}
def mx(domain):
    if domain in MX: return MX[domain]
    res = 'DNS?'
    for attempt in range(3):
        try:
            j = requests.get('https://dns.google/resolve', params={'name': domain, 'type': 'MX'}, timeout=15).json()
            ans = [a['data'] for a in j.get('Answer', []) if a.get('type') == 15]
            res = 'MX:' + ans[0].split()[-1].rstrip('.') if ans else 'ekkert MX'
            break
        except Exception:
            continue
    MX[domain] = res
    return res


def tegund(email_type, title):
    if (email_type or '').lower() != 'personal': return 'almennt netfang'
    t = (title or '').lower()
    if re.search(r'marka[ðd]s|marketing', t): return 'markaðsstjóri'
    if re.search(r'framkv|forstj|eigand|stofnand|ceo|founder|owner|managing|rekstrarstj|skrifstofustj', t): return 'stjórnandi/eigandi'
    if re.search(r's[oö]lu|sales|vi[ðd]skiptastj', t): return 'sölustjóri'
    return 'nafngreindur starfsmaður'


def read_jsonl(paths):
    out = []
    for p in paths or []:
        try:
            for n, line in enumerate(open(p, encoding='utf-8'), 1):
                line = line.strip()
                if not line: continue
                try: out.append(json.loads(line))
                except Exception: print(f'  skip bad json {p}:{n}', file=sys.stderr)
        except FileNotFoundError:
            print(f'  missing {p}', file=sys.stderr)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('--gap', nargs='*', default=[])
    ap.add_argument('--new', nargs='*', default=[])
    ap.add_argument('--exclude', default='')
    ap.add_argument('--block', nargs='*', default=[], help='addresses that must not be used')
    ap.add_argument('--crm-seeds', nargs='*', default=[], help='seeds_*.json: CRM addresses used when research found none')
    ap.add_argument('--report', default='')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()

    rows = list(csv.DictReader(open(a.csv, encoding='utf-8'), delimiter=';'))
    fields = list(rows[0].keys())
    excl = set(json.load(open(a.exclude))) if a.exclude else set()
    excl_mail = {e for e in excl if '@' in e} | {b.strip().lower() for b in a.block}
    excl_dom = {e for e in excl if '@' not in e}
    crm_mail = {}
    for p in a.crm_seeds:
        for s in json.load(open(p, encoding='utf-8')):
            if s.get('netfang_i_crm'): crm_mail[name_key(s['fyrirtaeki'])] = s['netfang_i_crm'].strip().lower()

    # who already owns which address / domain / name on the list
    addr_owner, dom_owner, name_owner = {}, {}, {}
    def claim(i, r):
        e = r['netfang'].strip().lower()
        if e:
            addr_owner.setdefault(e, i)
            d = domain_of(e)
            if d and d not in FREE_MAIL: dom_owner.setdefault(d, i)
        d = domain_of(r['vefur'])
        if d and d not in FREE_MAIL: dom_owner.setdefault(d, i)
        for tok in (r.get('onnur_netfong') or '').split():
            t = re.sub(r'\[.*$', '', tok).strip().lower()
            if '@' in t: addr_owner.setdefault(t, i)
        k = name_key(r['fyrirtaeki'])
        if k: name_owner.setdefault(k, i)
    for i, r in enumerate(rows): claim(i, r)

    report = dict(updated=[], added_with_email=[], added_without_email=[], rejected=[])

    def check_email(email, src, own_row=None):
        """'' when the address may be used, else the reason it may not."""
        e = (email or '').strip().lower().rstrip('.')
        if not e: return 'ekkert netfang'
        if not EMAIL_RE.match(e) or BAD_ADDR.search(e): return 'ógilt netfang'
        if BAD_LOCAL.match(e.split('@')[0]): return 'pósthólf fyrir umsóknir/reikninga o.þ.h.'
        if e in OWN or domain_of(e) in OWN_DOMAINS: return 'netfang Helga/SVIF'
        if not ((src or '').startswith('http') or (src or '').startswith('crm:')): return 'engin heimild skráð'
        if re.search(r'data-protection|dataprotection|privacy|personuvernd|gdpr|dsgvo|persónuvernd', src or '', re.I):
            return 'netfang úr persónuverndarskjali'
        if e in excl_mail: return 'þegar haft samband (CRM/Gmail)'
        d = domain_of(e)
        if d not in FREE_MAIL and d in excl_dom: return 'þegar haft samband (CRM/Gmail)'
        o = addr_owner.get(e)
        if o is not None and o != own_row: return f'netfangið er þegar á lista (röð {o})'
        if d not in FREE_MAIL:
            o = dom_owner.get(d)
            if o is not None and o != own_row: return f'lénið er þegar á lista (röð {o}: {rows[o]["fyrirtaeki"]})'
        m = mx(d)
        if not m.startswith('MX:'): return f'lén tekur ekki við pósti ({m})'
        return ''

    def source_label(src, company_domain):
        if (src or '').startswith('crm:'): return 'úr CRM Helga (' + src[4:].strip() + ')'
        return ('á vef fyrirtækisins: ' if company_domain and domain_of(src) == company_domain else 'á öðrum vef: ') + src

    # ---- addresses for rows that are already on the list
    for g in read_jsonl(a.gap):
        try: i = int(g.get('idx'))
        except Exception: report['rejected'].append(dict(g, reason='ekkert idx')); continue
        if not (0 <= i < len(rows)): report['rejected'].append(dict(g, reason='idx utan lista')); continue
        r = rows[i]
        if name_key(r['fyrirtaeki']) != name_key(g.get('fyrirtaeki', '')):
            report['rejected'].append(dict(g, reason=f'nafn passar ekki við röð {i} ({r["fyrirtaeki"]})')); continue
        if r['netfang'].strip() or r['sent'].strip():
            report['rejected'].append(dict(g, reason='röðin er þegar með netfang eða afgreidd')); continue
        email = (g.get('email') or '').strip().lower().rstrip('.')
        site = domain_of(g.get('website'))
        if site and not domain_of(r['vefur']):
            o = dom_owner.get(site)
            if o is not None and o != i:
                report['rejected'].append(dict(g, reason=f'vefurinn er þegar á lista (röð {o}: {rows[o]["fyrirtaeki"]})')); continue
            if site in excl_dom:
                report['rejected'].append(dict(g, reason='þegar haft samband (CRM/Gmail)')); continue
            r['vefur'] = site; dom_owner.setdefault(site, i)
        why = check_email(email, g.get('source_url'), own_row=i)
        if why:
            report['rejected'].append(dict(g, reason=why)); continue
        r['netfang'] = email
        r['tegund'] = g.get('tegund') or tegund(g.get('email_type'), g.get('title'))
        if r['tegund'] != 'almennt netfang':
            r['tengilidur'] = clean(g.get('contact_name')); r['titill'] = clean(g.get('title'))
        r['stadfesting'] = source_label(g.get('source_url'), domain_of(r['vefur']))
        r['mx'] = mx(domain_of(email))
        note = clean(g.get('note'))
        r['athugasemd'] = clean((r['athugasemd'] + ' | ' if r['athugasemd'] else '') + 'netfang fundið 3.11.' + (f' ({note})' if note and note.lower() != 'ok' else ''))
        claim(i, r)
        report['updated'].append(dict(idx=i, fyrirtaeki=r['fyrirtaeki'], netfang=email, tegund=r['tegund']))

    # ---- companies that are not on the list yet
    for n in read_jsonl(a.new):
        name = clean(n.get('fyrirtaeki')); flokkur = clean(n.get('flokkur'))
        if not name or not flokkur: report['rejected'].append(dict(n, reason='vantar nafn eða flokk')); continue
        k = name_key(name)
        if k in name_owner: report['rejected'].append(dict(n, reason=f'nafnið er þegar á lista (röð {name_owner[k]})')); continue
        wd = domain_of(n.get('vefur'))
        if wd and wd not in FREE_MAIL:
            if wd in excl_dom: report['rejected'].append(dict(n, reason='þegar haft samband (CRM/Gmail)')); continue
            if wd in dom_owner: report['rejected'].append(dict(n, reason=f'vefurinn er þegar á lista (röð {dom_owner[wd]}: {rows[dom_owner[wd]]["fyrirtaeki"]})')); continue
        email = (n.get('netfang') or '').strip().lower().rstrip('.')
        src = n.get('email_source_url')
        if not email and k in crm_mail:
            email, src = crm_mail[k], 'crm: fyrirtækjabók'
        why = check_email(email, src) if email else 'ekkert netfang'
        row = {f: '' for f in fields}
        row.update(fyrirtaeki=name, flokkur=flokkur, undirflokkur=clean(n.get('undirflokkur')), vefur=wd or clean(n.get('vefur')),
                   kvedja='Hæhæ,',
                   athugasemd=clean(' | '.join(x for x in (clean(n.get('athugasemd')), ('passar: ' + clean(n.get('fit'))) if n.get('fit') else '',
                                                            ('heimild: ' + clean(n.get('heimild'))) if n.get('heimild') else '', 'bætt við 3.11.') if x)))
        if why and why not in ('ekkert netfang',):
            if why.startswith('þegar haft samband') or why.startswith('netfangið er þegar') or why.startswith('lénið er þegar'):
                report['rejected'].append(dict(n, reason=why)); continue
            row['athugasemd'] = clean(row['athugasemd'] + f' | netfang ekki notað: {why} ({email})')
            email = ''
        if email and not why:
            row.update(netfang=email, tegund=tegund(n.get('email_type'), ''), mx=mx(domain_of(email)),
                       stadfesting=source_label(src, wd))
        rows.append(row); i = len(rows) - 1; claim(i, row)
        (report['added_with_email'] if row['netfang'] else report['added_without_email']).append(dict(idx=i, fyrirtaeki=name, flokkur=flokkur, netfang=row['netfang']))

    # ---- hard safety checks before writing
    sendable = [r['netfang'].lower() for r in rows if r['netfang'] and not r['sent']]
    sent = [r['netfang'].lower() for r in rows if r['message_id']]
    assert not (set(sendable) & set(sent)), 'an unsent row shares an address with a sent row'
    assert len(sendable) == len(set(sendable)), 'two unsent rows share an address'
    assert not any(e in OWN for e in sendable), "Helgi's own address is queued"

    print(f"uppfært (netfang fundið fyrir röð á lista): {len(report['updated'])}")
    print(f"nýtt fyrirtæki með netfangi: {len(report['added_with_email'])}")
    print(f"nýtt fyrirtæki án netfangs: {len(report['added_without_email'])}")
    print(f"hafnað: {len(report['rejected'])}")
    from collections import Counter
    print('höfnunarástæður:', Counter(re.sub(r' \(.*$', '', x['reason']) for x in report['rejected']).most_common())
    if a.report:
        json.dump(report, open(a.report, 'w'), ensure_ascii=False, indent=1)
    if a.dry_run:
        print('(dry run, nothing written)'); return
    with open(a.csv, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=';'); w.writeheader(); w.writerows(rows)
    print('skrifað:', a.csv, len(rows), 'raðir')


if __name__ == '__main__':
    main()
