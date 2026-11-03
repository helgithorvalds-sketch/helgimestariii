#!/usr/bin/env python3
"""Confirms that every address the research agents reported is really printed on the company's web pages.

The agents read pages through a summarising fetch tool, which can return a plausible but wrong address
(for example info@ when the page only shows a Cloudflare-protected address). This script fetches the
recorded source page itself, plus the site's front, contact and about pages (contacts.py, robots.txt
respected), decodes Cloudflare e-mail protection, and keeps an address only when it appears in the HTML.
When the reported address is not there but the site shows another address, the site's own best address
(chosen the same way as contacts.py) is used instead. Addresses that come from Helgi's CRM (source
"crm:") are kept as they are.

Usage:
  verify_emails.py --new new_B1.jsonl ... --out new_verified.jsonl
  verify_emails.py --gap found_gap_1.jsonl ... --out gap_verified.jsonl
"""
import json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import contacts  # noqa: E402
from bs4 import BeautifulSoup

CF = re.compile(r'data-cfemail="([0-9a-fA-F]+)"|/cdn-cgi/l/email-protection#([0-9a-fA-F]+)')


def cf_decode(h):
    try:
        k = int(h[:2], 16)
        return ''.join(chr(int(h[i:i + 2], 16) ^ k) for i in range(2, len(h), 2)).lower()
    except Exception:
        return ''


def addresses(html):
    out = set()
    for m in CF.finditer(html or ''):
        e = cf_decode(m.group(1) or m.group(2))
        if contacts.EMAIL_RE.fullmatch(e): out.add(e)
    soup = BeautifulSoup(html or '', 'lxml')
    out |= set(contacts.emails_in(html or '', soup).keys())
    return {e.lower().strip('.') for e in out}


def site_pages(domain, extra_url=''):
    s = contacts.Site(domain)
    try: s.crawl()
    except Exception: pass
    if extra_url and extra_url not in s.pages:
        try: s.get(extra_url)
        except Exception: pass
    return s


def check(email, source_url, website, company):
    """(status, email_to_use, url) with status verified / replaced / not_found / unreachable / crm."""
    email = (email or '').strip().lower().rstrip('.')
    if (source_url or '').startswith('crm:'): return 'crm', email, source_url
    dom = re.sub(r'^https?://', '', (website or '')).replace('www.', '').split('/')[0] or (email.split('@')[1] if '@' in email else '')
    if not dom and source_url: dom = re.sub(r'^https?://', '', source_url).replace('www.', '').split('/')[0]
    if not dom: return 'unreachable', '', ''
    s = site_pages(dom, source_url if (source_url or '').startswith('http') else '')
    if not s.pages: return 'unreachable', '', ''
    found = {}
    for url, html in s.pages.items():
        for e in addresses(html):
            found.setdefault(e, url)
    if email and email in found: return 'verified', email, found[email]
    # the agent's address is not on the site: use what the site itself shows, picked like contacts.py does
    if found:
        ordered, best, general = contacts.analyse(s, company)
        pick = best or general
        if pick and pick['netfang'] in found: return 'replaced', pick['netfang'], pick['heimild']
    return 'not_found', '', ''


def do_new(n):
    st, e, url = check(n.get('netfang'), n.get('email_source_url'), n.get('vefur'), n.get('fyrirtaeki', ''))
    n = dict(n, verify=st)
    if st in ('verified', 'replaced', 'crm'):
        if st == 'replaced': n['agent_netfang'] = n.get('netfang', '')
        n.update(netfang=e, email_source_url=url)
    else:
        if n.get('netfang'): n['agent_netfang'] = n['netfang']
        n.update(netfang='', email_source_url='')
    return n


def do_gap(g):
    st, e, url = check(g.get('email'), g.get('source_url'), g.get('website') or '', g.get('fyrirtaeki', ''))
    g = dict(g, verify=st)
    if st in ('verified', 'replaced', 'crm'):
        if st == 'replaced': g['agent_email'] = g.get('email', '')
        g.update(email=e, source_url=url)
    else:
        if g.get('email'): g['agent_email'] = g['email']
        g.update(email='', source_url='')
    return g


def main():
    a = sys.argv[1:]
    out = a[a.index('--out') + 1]
    mode = 'new' if '--new' in a else 'gap'
    ins = [x for x in a if x.endswith('.jsonl') and x != out]
    recs = [json.loads(l) for p in ins for l in open(p, encoding='utf-8') if l.strip()]
    if mode == 'gap': recs = [r for r in recs if r.get('email')]   # only rows where an agent claims an address
    fn = do_new if mode == 'new' else do_gap
    from collections import Counter
    with ThreadPoolExecutor(max_workers=6) as ex, open(out, 'w', encoding='utf-8') as f:
        res = list(ex.map(fn, recs))
        for r in res: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    print('wrote', out, len(res), Counter(r['verify'] for r in res))


if __name__ == '__main__':
    main()
