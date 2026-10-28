#!/usr/bin/env python3
"""Builds the exact e-mail for rows of postlisti.csv, and logs sends.

  compose.py postlisti.csv next 5            -> JSON list of the next 5 unsent rows: {idx, to, subject, body}
  compose.py postlisti.csv show <idx>        -> the e-mail for one row, printed
  compose.py postlisti.csv sent <idx> <message_id>   -> marks a row as sent (date + Gmail message id)
  compose.py postlisti.csv skip <idx> <reason>       -> marks a row as skipped
"""
import csv, json, sys, datetime, re

SUBJECT = 'SVIF – bæklingur fyrir nýstofnuð fyrirtæki'
VIDEO = 'https://cdn.jsdelivr.net/gh/helgithorvalds-sketch/helgimestariii@6215875e041668557347987523727639f9355d77/video/svif-fyrirtaeki/SVIF-fyrirtaeki-web.mp4'
BODY = """{kvedja}

Ég heiti Helgi Már og stend á bak við SVIF. Hingað til höfum við tengt nýja húseigendur við fyrirtæki sem hjálpa þeim að koma sér fyrir, og nú erum við að fara af stað með sama verkefni fyrir ný fyrirtæki og eigendur þeirra.

Hugmyndin er einföld: kerfið okkar finnur nýstofnuð fyrirtæki um leið og þau verða til og við sendum eigendum þeirra bækling þar sem traust fyrirtæki kynna þjónustu sína, einmitt á þeim tímapunkti sem þau eru að velja sér {thjonusta} og annað sem nýr rekstur þarf. Eitt fyrirtæki er í hverjum flokki og við sendum um 250 bæklinga á mánuði, um allt land.

Þetta stutta myndband útskýrir verkefnið á innan við mínútu:
{video}

Nánar um SVIF: https://svif.is

Gætuð þið látið mig vita hvort þetta sé eitthvað sem {fyrirtaeki} hefði áhuga á að skoða nánar? Stutt já eða nei dugar. Nei er líka alveg í lagi, þá vitum við það og ónáðum ykkur ekki frekar.

Bestu kveðjur,
Helgi Már Þorvaldsson
SVIF
853 5147
helgithorvalds@gmail.com"""

def load(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8'), delimiter=';'))
    return rows, list(rows[0].keys())

def save(path, rows, fields):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=fields, delimiter=';'); w.writeheader(); w.writerows(rows)

def mail(r):
    return dict(to=r['netfang'], subject=SUBJECT,
                body=BODY.format(kvedja=r['kvedja'] or 'Góðan daginn,', thjonusta=r['thjonusta'] or 'þjónustu eins og ykkar', video=VIDEO, fyrirtaeki=r['fyrirtaeki']))

if __name__ == '__main__':
    path, cmd = sys.argv[1], sys.argv[2]
    rows, fields = load(path)
    if cmd == 'next':
        n = int(sys.argv[3]); out = []
        for i, r in enumerate(rows):
            if r['netfang'] and not r['sent']:
                out.append(dict(idx=i, fyrirtaeki=r['fyrirtaeki'], **mail(r)))
                if len(out) >= n: break
        print(json.dumps(out, ensure_ascii=False, indent=1))
    elif cmd == 'show':
        r = rows[int(sys.argv[3])]; m = mail(r); print('To:', m['to']); print('Subject:', m['subject']); print(); print(m['body'])
    elif cmd == 'sent':
        r = rows[int(sys.argv[3])]; r['sent'] = datetime.date.today().isoformat(); r['message_id'] = sys.argv[4]; save(path, rows, fields); print('sent', r['fyrirtaeki'], r['netfang'])
    elif cmd == 'skip':
        r = rows[int(sys.argv[3])]; r['sent'] = 'sleppt: ' + ' '.join(sys.argv[4:]); save(path, rows, fields); print('skipped', r['fyrirtaeki'])
    elif cmd == 'stats':
        print('alls', len(rows), 'með netfang', sum(1 for r in rows if r['netfang']), 'sent', sum(1 for r in rows if re.match(r'\d{4}-', r['sent'])), 'sleppt', sum(1 for r in rows if r['sent'].startswith('sleppt')))
