"""Extract a simplified national road network from a Denmark OSM extract.

Writes data/dk-roads.json: {"roads": [{"c": class, "p": [[x_km, y_km], ...]}, ...]}
in the same local projection as data/denmark.json (centre 10.4E 56.1N).

Usage: python3 scripts/extract-dk-roads.py denmark-latest.osm.pbf
Data © OpenStreetMap contributors (ODbL).
"""
import json
import math
import sys

import osmium

LON0, LAT0 = 10.4, 56.1
KX = 111.32 * math.cos(math.radians(LAT0))
KY = 110.54
CLASS = {
    "motorway": 4, "trunk": 4, "motorway_link": 3, "trunk_link": 3,
    "primary": 3, "secondary": 2, "tertiary": 1, "unclassified": 0, "residential": 0,
}
TOL = {4: 0.08, 3: 0.08, 2: 0.1, 1: 0.12, 0: 0.15}  # km simplification tolerance


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    best, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * (x - x1) - dx * (y - y1)) / norm if norm > 1e-9 else math.hypot(x - x1, y - y1)
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[: idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.roads = []
        self.length = 0.0

    def way(self, w):
        c = CLASS.get(w.tags.get("highway"))
        if c is None:
            return
        try:
            pts = [((n.lon - LON0) * KX, -(n.lat - LAT0) * KY) for n in w.nodes]
        except osmium.InvalidLocationError:
            return
        if len(pts) < 2:
            return
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            self.length += math.hypot(bx - ax, by - ay)
        pts = simplify(pts, TOL[c])
        # Residential streets are very numerous; drop the shortest stubs.
        if c == 0 and math.hypot(pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]) < 0.25:
            return
        self.roads.append({"c": c, "p": [[round(x, 2), round(y, 2)] for x, y in pts]})


h = Handler()
h.apply_file(sys.argv[1], locations=True, idx="flex_mem")
json.dump({"roads": h.roads}, open("data/dk-roads.json", "w"), separators=(",", ":"))
print(len(h.roads), "roads", round(h.length), "km total")
