#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SVIF Heimsent v2 – útsendingarkerfi fyrir nýja húseigendur, miðað við ÁÆTLAÐAN AFHENDINGARDAG.

Hvað kerfið gerir:
  1. Sækir kaupskrá HMS (allir þinglýstir kaupsamningar) og síar eftir svæði (HBS + Suðurnes, eða Akureyri).
  2. Hendir út öllu sem er ekki heimili: ónothæfum samningum, atvinnuhúsnæði, sumarhúsum, bílskúrum,
     heilum byggingum, verktaka-/fjárfestakaupum (margar eignir á sama samningi eða sama dag).
  3. Gefur hverri eign einkunn A–F eftir líkum á framkvæmdum (sömu reglur og áður).
  4. Áætlar AFHENDINGARDAG út frá kaupsamningsdegi:  notað húsnæði +10 vikur, fullbúin nýbygging +12 vikur,
     selt ófullbúið +9 mánuðir.  Bæklingur fer ALDREI út fyrir áætlaða afhendingu.
  5. Heldur utan um hvað hefur verið sent (state/sent.json) svo ekkert heimilisfang fái bækling tvisvar,
     og setur íbúðarnúmer (hæð + íbúð) á allar íbúðir í fjölbýli svo blaðberi viti í hvaða póstkassa.
  6. Skilar vikulegum útsendingarlista (CSV + XLSX) í Póstdreifingar-sniði og samantekt.

Notkun:
  python3 heimsent.py run --count 150 --date 2026-10-03             prufukeyrsla, skrifar lista í out/
  python3 heimsent.py run --count 150 --date 2026-10-03 --commit    skrifar lista OG merkir sem sent
  python3 heimsent.py preview                                        hvað verður tilbúið næstu vikur
  python3 heimsent.py daily                                          ný kaup síðan síðast (daglegi pósturinn)
  python3 heimsent.py status                                         staða biðraðar
  python3 heimsent.py xlsx out/utgafa_2026-10-03.csv                 breyta CSV í XLSX (þarf openpyxl)

Allar stillingar eru efst í skránni (CFG) og má yfirskrifa með skipanalínu, t.d. --delivery-days 84.
Krefst aðeins Python 3.8+ (engin aukasöfn). openpyxl er valkvætt fyrir XLSX.
"""
import argparse
import collections
import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
STATE_DIR = os.path.join(HERE, "state")
OUT_DIR = os.path.join(HERE, "out")
KAUPSKRA_URL = ("https://frs3o1zldvgn.objectstorage.eu-frankfurt-1.oci.customer-oci.com"
                "/n/frs3o1zldvgn/b/public_data_for_download/o/kaupskra.csv")

# ----------------------------------------------------------------------------- stillingar
CFG = {
    "DELIVERY_DAYS": 70,          # notað húsnæði: áætluð afhending = kaupsamningur + 10 vikur
    "NEW_BUILD_DAYS": 84,         # fullbúin nýbygging: + 12 vikur
    "UNFINISHED_DAYS": 270,       # selt ófullbúið (fokhelt / tilbúið til innréttinga): + 9 mánuðir
    "MAX_DAYS_AFTER_DELIVERY": 150,  # eftir þetta dettur heimilisfangið út (of gamalt)
    "SEND_GRADES": "ABC",         # einkunnir sem fá bækling
    "INCLUDE_NEW_BUILDS": False,  # fullbúnar nýbyggingar fá einkunn C ef True, annars E (ekki sent)
    "BULK_PER_CONTRACT": 3,       # >= svona margar eignir á sama skjalanúmeri = verktaka-/fjárfestakaup
    "BULK_SAME_DAY": 4,           # >= svona margar eignir á sama húsnúmeri sama dag = verktakakaup
    "MAX_M2": 500,                # stærra = heil bygging
    "MAX_ROOMS": 12,
    "MIN_M2": 25,                 # minna = geymsla / bílskúr
    "BIG_FLAT_M2": 90,            # eldri íbúð >= þetta = B, annars C
    "NEW_BUILD_YEARS": 1,         # byggingarár >= ár - 1 telst nýbygging
    "FRESHNESS_DECAY": 0.3,       # stig sem dragast af fyrir hvern dag frá áætlaðri afhendingu
    "RESALE_MONTHS": 6,           # eign seld aftur eftir þetta = nýr eigandi, má senda aftur
    "LOOKBACK_DAYS": 420,         # hversu langt aftur í kaupskrá er lesið
    "STALE_DATA_DAYS": 5,         # viðvörun ef HMS hefur ekki uppfært í svona marga daga
}
GRADE_BASE = {"A": 100, "B": 80, "C": 60, "D": 40, "E": 20, "F": 0}
RESIDENTIAL = {"Einbýli", "Sérbýli", "Fjölbýli"}
HOUSE = {"Einbýli", "Sérbýli"}

TOWNS = {
    **{str(p): "Reykjavík" for p in (101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 116, 162)},
    "170": "Seltjarnarnes", "190": "Vogar",
    "200": "Kópavogur", "201": "Kópavogur", "202": "Kópavogur", "203": "Kópavogur",
    "210": "Garðabær", "212": "Garðabær", "225": "Garðabær (Álftanes)",
    "220": "Hafnarfjörður", "221": "Hafnarfjörður", "222": "Hafnarfjörður",
    "230": "Reykjanesbær", "232": "Reykjanesbær", "233": "Reykjanesbær", "235": "Reykjanesbær",
    "260": "Reykjanesbær", "262": "Reykjanesbær", "240": "Grindavík",
    "245": "Suðurnesjabær", "250": "Suðurnesjabær",
    "270": "Mosfellsbær", "271": "Mosfellsbær", "276": "Mosfellsbær",
    "600": "Akureyri", "601": "Akureyri", "603": "Akureyri", "604": "Akureyri",
    "605": "Akureyri", "606": "Akureyri", "607": "Akureyri",
}
REGIONS = {
    "hbs": {p for p in TOWNS if int(p) < 600},
    "akureyri": {p for p in TOWNS if int(p) >= 600},
    "all": set(TOWNS),
}


# ----------------------------------------------------------------------------- hjálparföll
def pdate(s):
    s = (s or "").strip()[:10]
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        return None


def ffloat(s):
    try:
        return float((s or "").strip().replace(",", "."))
    except ValueError:
        return 0.0


def fint(s):
    try:
        return int(float((s or "").strip()))
    except ValueError:
        return None


def load_json(path, default):
    try:
        with open(path, encoding="utf8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def fetch_kaupskra(path, refresh):
    """Sækir kaupskrá nema til sé eintak yngra en 20 klst."""
    if os.path.exists(path) and not refresh:
        age_h = (dt.datetime.now().timestamp() - os.path.getmtime(path)) / 3600
        if age_h < 20:
            return "notaði eintak í skyndiminni (%.0f klst gamalt)" % age_h
    os.makedirs(os.path.dirname(path), exist_ok=True)
    try:
        with urllib.request.urlopen(KAUPSKRA_URL, timeout=300) as resp, open(path + ".tmp", "wb") as f:
            while True:
                chunk = resp.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        os.replace(path + ".tmp", path)
        return "sótti nýja kaupskrá (%.1f MB)" % (os.path.getsize(path) / 1e6)
    except Exception as e:  # noqa: BLE001
        if os.path.exists(path):
            return "VIÐVÖRUN: tókst ekki að sækja kaupskrá (%s) – notaði gamalt eintak" % e
        raise SystemExit("Tókst ekki að sækja kaupskrá og ekkert eintak til: %s" % e)


# ----------------------------------------------------------------------------- lestur og mat
def read_rows(path, region, since):
    raw = open(path, "rb").read().decode("latin-1")
    rows = []
    for r in csv.DictReader(io.StringIO(raw), delimiter=";"):
        pn = (r.get("POSTNR") or "").strip()
        if pn not in region:
            continue
        utg = pdate(r.get("UTGDAG"))
        if not utg or utg < since:
            continue
        street = " ".join((r.get("HEIMILISFANG") or "").split())
        rows.append({
            "fastnum": (r.get("FASTNUM") or "").strip(),
            "street": street, "postnr": pn, "town": TOWNS.get(pn, ""),
            "utg": utg, "thingl": pdate(r.get("THINGLYSTDAGS")),
            "byggar": fint(r.get("BYGGAR")), "m2": ffloat(r.get("EINFLM")),
            "rooms": fint(r.get("FJHERB")) or 0, "tegund": (r.get("TEGUND") or "").strip(),
            "fullbuid": (r.get("FULLBUID") or "1").strip() != "0",
            "onoth": (r.get("ONOTHAEFUR_SAMNINGUR") or "0").strip() == "1",
            "skjal": (r.get("SKJALANUMER") or "").strip(), "fepilog": (r.get("FEPILOG") or "").strip(),
            "verd": fint(r.get("KAUPVERD")) or 0,
        })
    return rows


def dedupe(rows):
    """Ein færsla á hverja eign (fastanúmer): nothæfur samningur umfram ónothæfan, annars nýjasti."""
    by = collections.defaultdict(list)
    for r in rows:
        by[r["fastnum"]].append(r)
    out = []
    for group in by.values():
        group.sort(key=lambda r: (not r["onoth"], r["utg"]))
        out.append(group[-1])
    return out


def mark_bulk(rows):
    per_contract = collections.Counter(r["skjal"] for r in rows if r["skjal"])
    per_day = collections.Counter((r["street"].lower(), r["postnr"], r["utg"]) for r in rows)
    for r in rows:
        r["bulk"] = 0
        if r["skjal"] and per_contract[r["skjal"]] >= CFG["BULK_PER_CONTRACT"]:
            r["bulk"] = per_contract[r["skjal"]]
        elif per_day[(r["street"].lower(), r["postnr"], r["utg"])] >= CFG["BULK_SAME_DAY"]:
            r["bulk"] = per_day[(r["street"].lower(), r["postnr"], r["utg"])]


def grade(r):
    """Skilar (einkunn, ástæða). A–C fá bækling, D–F ekki."""
    year = r["utg"].year
    if r["onoth"]:
        return "F", "ónothæfur samningur skv. HMS"
    if r["tegund"] not in RESIDENTIAL:
        return "F", "ekki íbúðarhúsnæði (%s)" % (r["tegund"] or "óskráð")
    if r["bulk"]:
        return "F", "verktaka-/fjárfestakaup (%d eignir á sama samningi/degi)" % r["bulk"]
    if r["m2"] > CFG["MAX_M2"] or r["rooms"] > CFG["MAX_ROOMS"]:
        return "F", "heil bygging / of stórt (%.0f m², %d herb.)" % (r["m2"], r["rooms"])
    if r["m2"] and r["m2"] < CFG["MIN_M2"]:
        return "F", "of lítið (%.0f m²) – geymsla eða bílskúr" % r["m2"]
    b = r["byggar"]
    if not b:
        return "E", "byggingarár óskráð"
    house = r["tegund"] in HOUSE
    if not r["fullbuid"]:
        return ("A" if house else "B"), "selt ófullbúið – eigandi klárar sjálfur (afhending óviss)"
    if b >= year - CFG["NEW_BUILD_YEARS"]:
        if CFG["INCLUDE_NEW_BUILDS"]:
            return "C", "fullbúin nýbygging"
        return "E", "nýbygging – ekki markhópur"
    if house:
        if b <= 1989:
            return "A", "eldra sérbýli – lagnir/þak/steypa á tíma"
        if b <= 2009:
            return "B", "sérbýli '90–'09 – bað/eldhús á endurnýjunaraldri"
        return "C", "nýrra sérbýli – lóð/pallur eftir"
    if b <= 1984:
        if r["m2"] >= CFG["BIG_FLAT_M2"]:
            return "B", "stór eldri íbúð"
        return "C", "lítil eldri íbúð – fyrstu kaupendur, minni verk"
    if b <= 1999:
        return "D", "fjölbýli '85–'99 – húsfélag sér um ytra byrði"
    return "E", "fjölbýli 2000+ – of nýlegt"


def evaluate(r, today, sent):
    r["grade"], r["reason"] = grade(r)
    year = r["utg"].year
    if not r["fullbuid"]:
        delay, kind = CFG["UNFINISHED_DAYS"], "ófullbúið (óviss)"
    elif r["byggar"] and r["byggar"] >= year - CFG["NEW_BUILD_YEARS"]:
        delay, kind = CFG["NEW_BUILD_DAYS"], "nýbygging"
    else:
        delay, kind = CFG["DELIVERY_DAYS"], "notað"
    r["delivery_kind"] = kind
    r["est_delivery"] = r["utg"] + dt.timedelta(days=delay)
    r["expires"] = r["est_delivery"] + dt.timedelta(days=CFG["MAX_DAYS_AFTER_DELIVERY"])
    days_in = (today - r["est_delivery"]).days
    r["days_since_delivery"] = days_in
    r["score"] = round(GRADE_BASE[r["grade"]] - CFG["FRESHNESS_DECAY"] * max(0, days_in), 1)

    prev = sent.get(r["fastnum"])
    resold = bool(prev and pdate(prev.get("utg")) and
                  (r["utg"] - pdate(prev["utg"])).days > CFG["RESALE_MONTHS"] * 30)
    if prev and not resold:
        r["status"] = "sent"
    elif r["grade"] not in CFG["SEND_GRADES"]:
        r["status"] = "ekki markhópur"
    elif today < r["est_delivery"]:
        r["status"] = "bíður afhendingar"
    elif today > r["expires"]:
        r["status"] = "útrunnið"
    else:
        r["status"] = "tilbúið"

    fep = r["fepilog"]
    if r["tegund"] == "Fjölbýli" and len(fep) >= 6:
        r["ibud"] = fep[2:6]
        r["label"] = "%s, íbúð %s" % (r["street"], r["ibud"])
        r["note"] = "kjallaraíbúð" if fep[2:4] == "00" else ""
    else:
        r["ibud"], r["label"], r["note"] = "", r["street"], ""
    return r


def build(args, today):
    region = REGIONS[args.region]
    ks = args.kaupskra or os.path.join(STATE_DIR, "kaupskra.csv")
    msg = "notaði %s" % ks if args.kaupskra or args.no_download else fetch_kaupskra(ks, args.refresh)
    since = today - dt.timedelta(days=CFG["LOOKBACK_DAYS"])
    rows = read_rows(ks, region, since)
    newest = max((r["utg"] for r in rows), default=None)
    warn = ""
    if newest and (today - newest).days > CFG["STALE_DATA_DAYS"]:
        warn = ("VIÐVÖRUN: nýjasti kaupsamningur í kaupskrá er frá %s (%d daga gamall) – "
                "HMS hefur líklega ekki uppfært skrána." % (newest, (today - newest).days))
    mark_bulk(rows)
    rows = dedupe(rows)
    sent = load_json(os.path.join(STATE_DIR, "sent.json"), {})
    for r in rows:
        evaluate(r, today, sent)
    return rows, sent, msg, warn, newest


# ----------------------------------------------------------------------------- úttak
COLS = [("Nafn", lambda r: "Til húseiganda"), ("Heimilisfang", lambda r: r["label"]),
        ("Póstnúmer", lambda r: r["postnr"]), ("Staður", lambda r: r["town"]),
        ("Íbúð", lambda r: r["ibud"]), ("Einkunn", lambda r: r["grade"]), ("Stig", lambda r: r["score"]),
        ("Tegund", lambda r: r["tegund"]), ("Byggt", lambda r: r["byggar"] or ""),
        ("m²", lambda r: r["m2"]), ("Herb.", lambda r: r["rooms"]),
        ("Kaupsamningur", lambda r: r["utg"].isoformat()),
        ("Áætluð afhending", lambda r: r["est_delivery"].isoformat()),
        ("Dagar frá afhendingu", lambda r: r["days_since_delivery"]),
        ("Afhendingarregla", lambda r: r["delivery_kind"]),
        ("Fastanúmer", lambda r: r["fastnum"]), ("Ástæða einkunnar", lambda r: r["reason"]),
        ("Athugasemd", lambda r: r["note"])]
DEBUG_COLS = COLS + [("Staða", lambda r: r["status"]), ("Rennur út", lambda r: r["expires"].isoformat()),
                     ("Skjalanúmer", lambda r: r["skjal"]), ("Kaupverð (þús.)", lambda r: r["verd"])]


def write_csv(path, rows, cols):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow([c for c, _ in cols])
        for r in rows:
            w.writerow([fn(r) for _, fn in cols])


def _cell(v):
    """Tölur verða tölur í Excel, en 'íbúð 0302', póstnúmer og fastanúmer halda sér sem texti."""
    if v.isdigit() and not (len(v) > 1 and v[0] == "0") and len(v) < 7:
        return int(v)
    if "." in v and v.replace(".", "", 1).replace("-", "", 1).isdigit():
        return float(v)
    return v


def csv_to_xlsx(csv_path):
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font
    except ImportError:
        return None
    wb = Workbook()
    ws = wb.active
    ws.title = "Útsending"
    with open(csv_path, encoding="utf-8-sig") as f:
        for i, row in enumerate(csv.reader(f, delimiter=";")):
            ws.append([_cell(v) for v in row])
            if i == 0:
                for c in ws[1]:
                    c.font = Font(bold=True)
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = min(44, max(8, max(len(str(c.value or "")) for c in col) + 2))
    ws.freeze_panes = "A2"
    out = csv_path[:-4] + ".xlsx"
    wb.save(out)
    return out


def week_bucket(d, today):
    return (d - today).days // 7


def summary_text(rows, picked, today, msg, warn, newest, args):
    c = collections.Counter
    lines = ["SVIF Heimsent – útgáfa %s (%s)" % (today, args.region), msg]
    if warn:
        lines.append(warn)
    lines.append("Nýjasti kaupsamningur í gögnum: %s" % newest)
    lines.append("")
    lines.append("Valin í þessa útgáfu: %d  (%s)" % (len(picked), ", ".join(
        "%d× %s" % (n, g) for g, n in sorted(c(r["grade"] for r in picked).items()))))
    typ = c(r["tegund"] for r in picked)
    lines.append("  Tegund: " + ", ".join("%d× %s" % (n, t) for t, n in typ.most_common()))
    if picked:
        d = [r["days_since_delivery"] for r in picked]
        lines.append("  Dagar frá áætlaðri afhendingu: %d–%d (miðgildi %d)" % (min(d), max(d), sorted(d)[len(d) // 2]))
    lines.append("")
    st = c(r["status"] for r in rows if r["grade"] in CFG["SEND_GRADES"])
    lines.append("Biðröð (A/B/C): eftir tilbúin %d · bíða afhendingar %d · sent áður %d · útrunnin %d" % (
        st["tilbúið"] - len(picked), st["bíður afhendingar"], st["sent"], st["útrunnið"]))
    up = collections.defaultdict(c)
    for r in rows:
        if r["status"] == "bíður afhendingar":
            up[week_bucket(r["est_delivery"], today)][r["grade"]] += 1
    lines.append("Verður tilbúið næstu vikur:")
    for w in sorted(up)[:8]:
        lines.append("  vika +%d (%s): %s" % (w + 1, today + dt.timedelta(days=7 * (w + 1)),
                                               ", ".join("%d×%s" % (n, g) for g, n in sorted(up[w].items()))))
    lines.append("")
    skipped = c(r["reason"] for r in rows if r["grade"] not in CFG["SEND_GRADES"])
    lines.append("Sleppt (ekki markhópur), síðustu %d daga:" % CFG["LOOKBACK_DAYS"])
    for reason, n in skipped.most_common():
        lines.append("  %4d  %s" % (n, reason))
    lines.append("")
    lines.append("Reglur: afhending = kaupsamningur + %d d (notað) / %d d (nýbygging) / %d d (ófullbúið); "
                 "fellur út %d d eftir afhendingu; einkunnir sendar: %s" % (
                     CFG["DELIVERY_DAYS"], CFG["NEW_BUILD_DAYS"], CFG["UNFINISHED_DAYS"],
                     CFG["MAX_DAYS_AFTER_DELIVERY"], CFG["SEND_GRADES"]))
    return "\n".join(lines)


# ----------------------------------------------------------------------------- skipanir
def cmd_run(args, today):
    rows, sent, msg, warn, newest = build(args, today)
    ready = [r for r in rows if r["status"] == "tilbúið"]
    ready.sort(key=lambda r: (-r["score"], -r["est_delivery"].toordinal(), r["street"]))
    picked = ready[: args.count]
    tag = today.isoformat()
    csv_path = os.path.join(OUT_DIR, "utgafa_%s.csv" % tag)
    write_csv(csv_path, picked, COLS)
    xlsx = csv_to_xlsx(csv_path)
    if args.debug_csv:
        allrows = sorted(rows, key=lambda r: (r["status"], -r["score"]))
        write_csv(os.path.join(OUT_DIR, "mat_%s.csv" % tag), allrows, DEBUG_COLS)
    text = summary_text(rows, picked, today, msg, warn, newest, args)
    with open(os.path.join(OUT_DIR, "utgafa_%s_samantekt.txt" % tag), "w", encoding="utf8") as f:
        f.write(text + "\n")
    print(text)
    print("\nSkrár: %s%s" % (csv_path, (" og " + xlsx) if xlsx else " (openpyxl vantar fyrir XLSX)"))
    if args.commit:
        for r in picked:
            sent[r["fastnum"]] = {"utg": r["utg"].isoformat(), "sent": tag, "label": r["label"],
                                  "postnr": r["postnr"], "grade": r["grade"]}
        save_json(os.path.join(STATE_DIR, "sent.json"), sent)
        print("Merkti %d heimilisföng sem send (%s)." % (len(picked), tag))
    else:
        print("Prufukeyrsla – ekkert merkt sem sent. Bættu við --commit þegar listinn fer til Póstdreifingar.")


def cmd_preview(args, today):
    rows, _, msg, warn, newest = build(args, today)
    print(msg, warn or "", "| nýjast:", newest)
    up = collections.defaultdict(collections.Counter)
    for r in rows:
        if r["status"] in ("tilbúið", "bíður afhendingar"):
            w = max(0, week_bucket(r["est_delivery"], today) + 1) if r["status"] != "tilbúið" else 0
            up[w][r["grade"]] += 1
    for w in sorted(up)[: args.weeks + 1]:
        lab = "tilbúið núna" if w == 0 else "vika +%d (frá %s)" % (w, today + dt.timedelta(days=7 * w))
        print("%-22s %s" % (lab, ", ".join("%3d×%s" % (n, g) for g, n in sorted(up[w].items()))))


def cmd_status(args, today):
    rows, _, msg, warn, newest = build(args, today)
    print(msg, warn or "", "| nýjast:", newest)
    c = collections.Counter((r["status"], r["grade"]) for r in rows)
    for (s, g), n in sorted(c.items()):
        print("%-20s %s %5d" % (s, g, n))


def cmd_daily(args, today):
    rows, _, msg, warn, newest = build(args, today)
    seen_path = os.path.join(STATE_DIR, "seen.json")
    seen = load_json(seen_path, {})
    new = [r for r in rows if r["fastnum"] not in seen or seen[r["fastnum"]] != r["utg"].isoformat()]
    new.sort(key=lambda r: (r["grade"], -r["score"]))
    lines = ["Ný kaup í kaupskrá (%s) – %d ný" % (today, len(new)), msg]
    if warn:
        lines.append(warn)
    for r in new:
        if r["grade"] in CFG["SEND_GRADES"]:
            lines.append("[%s] %s, %s %s (%s, byggt %s, %.0f m²) – kaupsamningur %s, áætluð afhending %s → %s"
                         % (r["grade"], r["label"], r["postnr"], r["town"], r["tegund"], r["byggar"] or "?",
                            r["m2"], r["utg"], r["est_delivery"], r["status"]))
    skipped = collections.Counter(r["grade"] for r in new if r["grade"] not in CFG["SEND_GRADES"])
    lines.append("Sleppt: " + ", ".join("%d×%s" % (n, g) for g, n in sorted(skipped.items())))
    text = "\n".join(lines)
    print(text)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "dagleg_%s.txt" % today), "w", encoding="utf8") as f:
        f.write(text + "\n")
    if not args.dry_run:
        for r in rows:
            seen[r["fastnum"]] = r["utg"].isoformat()
        save_json(seen_path, seen)


def main(argv=None):
    p = argparse.ArgumentParser(description="SVIF Heimsent v2")
    p.add_argument("cmd", choices=["run", "preview", "status", "daily", "xlsx"])
    p.add_argument("file", nargs="?", help="CSV skrá fyrir xlsx skipun")
    p.add_argument("--date", help="dagur útsendingar (sjálfgefið í dag), t.d. 2026-10-03")
    p.add_argument("--count", type=int, default=75, help="fjöldi heimilisfanga í útgáfu")
    p.add_argument("--region", default="hbs", choices=sorted(REGIONS))
    p.add_argument("--commit", action="store_true", help="merkja valin heimilisföng sem send")
    p.add_argument("--dry-run", action="store_true", help="(daily) ekki uppfæra seen.json")
    p.add_argument("--kaupskra", help="nota þessa kaupskrá í stað þess að sækja")
    p.add_argument("--no-download", action="store_true", help="nota eintak í state/ án þess að sækja")
    p.add_argument("--refresh", action="store_true", help="sækja kaupskrá þó eintak sé nýlegt")
    p.add_argument("--debug-csv", action="store_true", help="skrifa líka mat allra eigna í out/mat_*.csv")
    p.add_argument("--weeks", type=int, default=8)
    for key in CFG:
        p.add_argument("--" + key.lower().replace("_", "-"), dest=key)
    args = p.parse_args(argv)
    for key in CFG:
        v = getattr(args, key)
        if v is not None:
            CFG[key] = type(CFG[key])(v) if not isinstance(CFG[key], bool) else v.lower() in ("1", "true", "já", "ja")
    today = pdate(args.date) if args.date else dt.date.today()
    if args.date and not today:
        raise SystemExit("Ógild dagsetning: %s" % args.date)
    if args.cmd == "xlsx":
        if not args.file:
            raise SystemExit("Vantar CSV skrá")
        out = csv_to_xlsx(args.file)
        print(out or "openpyxl vantar: pip install openpyxl")
        return
    {"run": cmd_run, "preview": cmd_preview, "status": cmd_status, "daily": cmd_daily}[args.cmd](args, today)


if __name__ == "__main__":
    main()
