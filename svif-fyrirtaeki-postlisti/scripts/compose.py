#!/usr/bin/env python3
"""Builds the exact e-mail for rows of postlisti.csv, and logs sends.

  compose.py postlisti.csv next 5            -> JSON list of the next 5 unsent rows: {idx, to, subject, body}
  compose.py postlisti.csv show <idx>        -> the e-mail for one row, printed
  compose.py postlisti.csv sent <idx> <message_id>   -> marks a row as sent (date + Gmail message id)
  compose.py postlisti.csv skip <idx> <reason>       -> marks a row as skipped
"""
import csv, json, sys, datetime, re

SUBJECT = 'SVIF – bæklingur fyrir nýstofnuð fyrirtæki'
VIDEO = 'https://svif.is/fyrirtaeki'   # the SVIF fyrir fyrirtæki page on svif.is, with the film at the top
BODY = """Hæhæ,

Helgi Már heiti ég og stend á bak við fyrirtækið SVIF.

Við vorum nýlega að skoða fyrirtækið ykkar og sáum að það gæti mögulega hentað mjög vel fyrir nýtt markaðsverkefni sem við höfum verið að vinna að.

Þegar fólk stofnar nýtt fyrirtæki þarf það að huga að ótal hlutum, hvort sem það er að finna tryggingar, bókhald, vefsíðu, auglýsingastofu eða aðra þjónustu sem þarf til að koma rekstrinum af stað.

Þess vegna höfum við sett saman sérstakan bækling fyrir nýja fyrirtækjaeigendur þar sem fyrirtæki kynna þjónustu sína og bjóða upp á afslætti. Bæklingurinn er sendur beint til nýrra fyrirtækjaeigenda um allt land, einmitt þegar þeir eru að leita að þjónustu sem getur hjálpað þeim að koma rekstrinum af stað. Við sendum um 250 bæklinga á mánuði.

Hér er stutt myndband sem útskýrir verkefnið og hvernig þetta virkar á innan við mínútu:

Myndband: {video}

Nánar um SVIF: https://svif.is

Upphaflega vorum við með bækling til nýrra húseigenda og eftir lofandi niðurstöður þar teljum við rökrétt að miðla auglýsingum einnig til nýrra fyrirtækjaeigenda.

Mig langaði því að athuga hvort þetta væri eitthvað sem þið hefðuð áhuga á að skoða nánar. Það væri frábært að fá stutt svar, hvort sem það er já eða nei. Ef þetta er ekki eitthvað fyrir ykkur er það auðvitað ekkert mál, þá vitum við það og höfum ekki frekar samband vegna þessa.

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

import html as _html
SITE = 'https://svif.is'
def html_body():
    """The same text as HTML: paragraphs, and the two links as real hyperlinks with the address as link text."""
    paras = []
    for para in BODY.format(video=VIDEO).split('\n\n'):
        t = _html.escape(para)
        t = t.replace('Myndband: ' + VIDEO, '<a href="' + VIDEO + '" style="color:#1f55ff">Myndband</a>')
        t = t.replace('Nánar um SVIF: ' + SITE, 'Nánar um SVIF: <a href="' + SITE + '" style="color:#1f55ff">svif.is</a>')
        t = t.replace('helgithorvalds@gmail.com', '<a href="mailto:helgithorvalds@gmail.com" style="color:#1f55ff">helgithorvalds@gmail.com</a>')
        paras.append('<p style="margin:0 0 16px">' + t.replace('\n', '<br>') + '</p>')
    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">' + ''.join(paras) + '</div>'

def mail(r):
    return dict(to=r['netfang'], subject=SUBJECT,
                body=BODY.format(video=VIDEO), html=html_body())

if __name__ == '__main__':
    path, cmd = sys.argv[1], sys.argv[2]
    rows, fields = load(path)
    if cmd == 'next':
        n = int(sys.argv[3]); out = []
        RANK = {'markaðsstjóri': 0, 'stjórnandi/eigandi': 1, 'nafngreindur lögmaður': 2, 'nafngreindur löggiltur endurskoðandi': 2, 'sölustjóri': 3, 'nafngreindur starfsmaður': 4, 'almennt netfang': 5, 'netfang á vef (óflokkað)': 6}
        order = sorted(range(len(rows)), key=lambda i: (RANK.get(rows[i]['tegund'], 9), rows[i]['flokkur'], rows[i]['fyrirtaeki']))
        for i in order:
            r = rows[i]
            if r['netfang'] and not r['sent'] and r['mx'].startswith('MX:'):
                out.append(dict(idx=i, fyrirtaeki=r['fyrirtaeki'], **mail(r)))
                if len(out) >= n: break
        print(json.dumps(out, ensure_ascii=False, indent=1))
    elif cmd == 'show':
        r = rows[int(sys.argv[3])]; m = mail(r); print('To:', m['to']); print('Subject:', m['subject']); print(); print(m['body'])
    elif cmd == 'sent':
        r = rows[int(sys.argv[3])]; r['sent'] = datetime.date.today().isoformat(); r['message_id'] = sys.argv[4]; save(path, rows, fields); print('sent', r['fyrirtaeki'], r['netfang'])
    elif cmd == 'mark':   # mark idx=email=message_id ... (the address must match the row, so a shifted index can never mislabel a send)
        n = 0
        for tok in sys.argv[3:]:
            idx, email, mid = tok.split('=')
            r = rows[int(idx)]
            assert r['netfang'].lower() == email.lower(), f'row {idx} is {r["netfang"]}, not {email}'
            r['sent'] = datetime.date.today().isoformat(); r['message_id'] = mid; n += 1
        save(path, rows, fields); print('marked', n)
    elif cmd == 'skip':
        r = rows[int(sys.argv[3])]; r['sent'] = 'sleppt: ' + ' '.join(sys.argv[4:]); save(path, rows, fields); print('skipped', r['fyrirtaeki'])
    elif cmd == 'stats':
        print('alls', len(rows), 'með netfang', sum(1 for r in rows if r['netfang']), 'sent', sum(1 for r in rows if re.match(r'\d{4}-', r['sent'])), 'sleppt', sum(1 for r in rows if r['sent'].startswith('sleppt')))
