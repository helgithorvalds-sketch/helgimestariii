#!/usr/bin/env python3
"""Overlays addresses found by hand/agent research (found_*.csv: fyrirtaeki;vefur;netfang;tengilidur;titill;tegund;heimild;athugasemd)
onto the crawler output, matched by company name.   Usage: merge_found.py contacts.csv found1.csv [found2.csv ...]"""
import csv, sys, re
dst = sys.argv[1]
rows = list(csv.DictReader(open(dst, encoding='utf-8'), delimiter=';'))
fields = list(rows[0].keys())
key = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower().translate(str.maketrans('áéíóúýðæöþ', 'aeiouydaot')))
by = {key(r['fyrirtaeki']): r for r in rows}
dom = lambda u: re.sub(r'^https?://', '', (u or '').lower()).replace('www.', '').split('/')[0]
bydom = {}
for r in rows:
    for d in (dom(r.get('vefur')), dom(r.get('vefur_endanlegur'))):
        if d and d not in bydom: bydom[d] = r
TYP = {'markaðsstjóri': 'markadur', 'markadsstjori': 'markadur', 'stjórnandi': 'stjornandi', 'stjornandi': 'stjornandi', 'almennt': 'almennt'}
n = 0
for fn in sys.argv[2:]:
    for f in csv.DictReader(open(fn, encoding='utf-8-sig'), delimiter=';'):
        r = by.get(key(f['fyrirtaeki'])) or bydom.get(dom(f.get('vefur')))
        if r is None: print('no match', f['fyrirtaeki'], f.get('vefur')); continue
        if f.get('athugasemd'): r['villa'] = (r.get('villa', '') + '; ' if r.get('villa') else '') + 'handleit: ' + f['athugasemd'][:160]
        if not f.get('netfang'): continue
        r.update(netfang=f['netfang'].strip(), tengilidur=f.get('tengilidur', '').strip(), titill=f.get('titill', '').strip(),
                 tegund=TYP.get(f.get('tegund', '').strip().lower(), 'nafngreint' if f.get('tengilidur') else 'almennt'),
                 netfang_heimild=f.get('heimild', '').strip(), villa='')
        if r['tegund'] == 'almennt': r['almennt_netfang'] = r['netfang']
        n += 1
with open(dst, 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=fields, delimiter=';'); w.writeheader(); w.writerows(rows)
print('merged', n)
