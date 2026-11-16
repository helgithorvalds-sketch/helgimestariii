#!/usr/bin/env python3
"""Build the product catalog for the Partyland party-builder demo.

Fetches Partyland's public Shopify product feed (/products.json), ranks
products by best-selling order inside the collections the builder uses,
and writes a compact catalog into index.html between the CATALOG markers.

Usage:
    python3 build.py              # fetch live data and update index.html
    python3 build.py --cache DIR  # reuse/keep raw downloads in DIR
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
from html import unescape

STORE = "https://partyland.is"
CDN = "https://cdn.shopify.com/s/files/"
HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, "index.html")
UA = {"User-Agent": "Mozilla/5.0 (party-builder demo)"}

# Collections whose best-selling order is used as the popularity signal.
RANK_COLLECTIONS = [
    "diskar", "plast-glas", "serviettur", "hnifapor", "borddukur", "ror",
    "al-blodrur", "latex-blodrur", "blodrur-tolur", "blodrur-med-motifi",
    "kokukerti", "kokutoppar", "fanalengjur", "konfetti", "hurdagardina",
    "honeycomb", "gotterispokar", "pinata", "blodrubogi", "duskalengjur",
    "pom-pom", "bordskraut", "midpunktur", "krullubordar", "axlabordar",
    "koronur", "hattar-hufur", "party-sprengjur", "stjornuljos",
    "blodrusett-1", "blodrusett-ceiling-kit", "renningar", "afmaeli",
    "helium-kutar-afylling", "blodrulod",
]

# Products that are only costumes / make-up are never used by the builder.
COSTUME_TAGS = {
    "Búningur", "halloween búningur", "barnabúningur", "Hárkolla", "Linsur",
    "Andlitsmálning", "flokkur:fullordinsbuningar", "flokkur:barnabuningar",
    "flokkur:harkollur", "flokkur:andlitsmalning", "Förðun", "Hársprey",
    "hárlenging", "andlitssteinar", "Gríma", "Hanskar", "pils", "tjull",
}
KEEP_ANYWAY = {"Axlaborði", "Kóróna", "Hattur", "Blævængur", "Gleraugu"}


def get(url, cache=None, name=None):
    if cache and name:
        path = os.path.join(cache, name)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                return f.read()
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                text = r.read().decode("utf-8")
            break
        except Exception as e:  # network hiccup: back off and retry
            if attempt == 3:
                raise
            print(f"  retry {url}: {e}", file=sys.stderr)
            time.sleep(2 ** attempt)
    if cache and name:
        with open(os.path.join(cache, name), "w", encoding="utf-8") as f:
            f.write(text)
    time.sleep(0.25)
    return text


def fetch_products(cache):
    products, page = [], 1
    while True:
        raw = get(f"{STORE}/products.json?limit=250&page={page}", cache, f"products-{page}.json")
        batch = json.loads(raw)["products"]
        products += batch
        print(f"  products page {page}: {len(batch)}")
        if len(batch) < 250:
            return products
        page += 1


def fetch_ranks(cache):
    """Return {handle: percentile 0..1} — lower is more popular."""
    rank = {}
    for col in RANK_COLLECTIONS:
        handles, page = [], 1
        while page <= 30:
            html = get(f"{STORE}/collections/{col}?sort_by=best-selling&page={page}",
                       cache, f"rank-{col}-{page}.html")
            found = re.findall(rf'href="/collections/{re.escape(col)}/products/([^"?#]+)', html)
            if not found:  # some collection pages link to /products/ directly
                found = re.findall(r'href="/products/([^"?#]+)', html)
            new = [h for h in dict.fromkeys(found) if h not in handles]
            if not new:
                break
            handles += new
            page += 1
        n = max(len(handles), 1)
        for i, h in enumerate(handles):
            pct = i / n
            rank[h] = min(rank.get(h, 1.0), pct)
        print(f"  ranked {col}: {len(handles)}")
    return rank


def pack_size(title, body):
    text = f"{title} {body}"
    m = re.search(r"for\s+(\d+)\s+guests", text, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"\((\d+)\s+knives", text, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d+)\s*(?:stk|stykki|ct|pcs|pc|pk)\b", title, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"\b(?:set|pack|bag|box)\s+(?:of\s+)?(\d+)\b", title, re.I)
    if m:
        return int(m.group(1))
    m = re.match(r"\s*(\d+)\s+(?:\w+\s+){0,2}(?:plates|napkins|cups|straws|balloons|latex|tumblers|bags|candles|glasses)", title, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d+)\s*(?:stk|stykki|ct|pcs)\b", body, re.I)
    if m:
        return int(m.group(1))
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", help="directory for raw downloads (reused if present)")
    args = ap.parse_args()
    if args.cache:
        os.makedirs(args.cache, exist_ok=True)

    print("Fetching products…")
    products = fetch_products(args.cache)
    print("Fetching best-selling order…")
    ranks = fetch_ranks(args.cache)

    tag_index, tag_list, rows = {}, [], []
    skipped = {"unavailable": 0, "no_image": 0, "costume": 0}
    for p in products:
        variant = next((v for v in p["variants"] if v.get("available")), None)
        if not variant:
            skipped["unavailable"] += 1
            continue
        if not p.get("images"):
            skipped["no_image"] += 1
            continue
        tags = p.get("tags") or []
        if set(tags) & COSTUME_TAGS and not set(tags) & KEEP_ANYWAY:
            skipped["costume"] += 1
            continue
        src = p["images"][0]["src"]
        img = src[len(CDN):] if src.startswith(CDN) else src
        body = unescape(re.sub(r"<[^>]+>", " ", p.get("body_html") or ""))
        title = unescape(p["title"]).strip()
        tag_ids = []
        for t in tags:
            if t not in tag_index:
                tag_index[t] = len(tag_list)
                tag_list.append(t)
            tag_ids.append(tag_index[t])
        price = round(float(variant["price"]))
        compare = variant.get("compare_at_price")
        compare = round(float(compare)) if compare and float(compare) > price else 0
        rows.append([
            p["handle"], title, price, compare, variant["id"], img, tag_ids,
            pack_size(title, body), round(ranks.get(p["handle"], 1.0), 3),
        ])

    catalog = {
        "builtAt": time.strftime("%Y-%m-%d"),
        "store": STORE,
        "cdn": CDN,
        "tags": tag_list,
        "products": rows,
    }
    blob = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    blob = blob.replace("</", "<\\/")

    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    start, end = "/*CATALOG-START*/", "/*CATALOG-END*/"
    i, j = html.index(start) + len(start), html.index(end)
    html = html[:i] + "window.CATALOG=" + blob + ";" + html[j:]
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Kept {len(rows)} products ({len(tag_list)} tags); skipped {skipped}")
    print(f"index.html is {os.path.getsize(INDEX) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
