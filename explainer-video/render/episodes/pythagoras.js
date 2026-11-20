// Regla Pýþagórasar, 10. bekkur (Skali 3A bls. 50–55).
// Teen register: no cartoon characters, no praise, the book's own terms. Autism-friendly: one focal object,
// literal labels, the same "your turn" routine every time with a visible time bar, no motion that carries nothing.
import { W, H, C, clamp, prog, st, mid, lerp, el, put, drawOn, rect, line, circle, poly, path, text, label, arrow, check, card, header, sceneGroup, S, TL, root } from "/lib.js";
export { init } from "/lib.js";

const LEG = "#2F6FC0", LEG2 = "#23935F", HYP = "#E0791A", GRID = "#D9D2C3";
const tint = { [LEG]: "#DDE8F7", [LEG2]: "#DDF2E6", [HYP]: "#FDE3C8" };
const pts = (a) => a.map((p) => p.join(",")).join(" ");
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mix = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

function plainPoly(g, p, fill, o = {}) {
  return el("polygon", { points: pts(p), fill, stroke: o.stroke ?? "none", "stroke-width": o.sw ?? 0, opacity: o.opacity ?? 1, "stroke-linejoin": "round" }, g);
}
function seg(g, a, b, color, p = 1, w = 7, key = "s") {
  put(g, drawOn(line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), { stroke: color, strokeWidth: w, roughness: 1.1 }, key), p));
}
function rightBox(g, c, u, v, s = 34, o = 1) {
  // small square in the corner c, along unit directions u and v
  const a = add(c, u, s), b = add(add(c, u, s), v, s), d = add(c, v, s);
  el("polyline", { points: pts([a, b, d]), fill: "none", stroke: C.ink, "stroke-width": 5, opacity: o }, g);
}
const unit = (a, b) => { const d = sub(b, a), L = Math.hypot(d[0], d[1]); return [d[0] / L, d[1] / L]; };

// math line with superscripts: parts like ["l", ["2"], " = 4 + 25"]
function mathText(g, parts, x, y, size, o = {}) {
  const t = el("text", { x, y, "font-size": size, "font-family": "Atkinson Hyperlegible", "font-weight": o.weight ?? 700, fill: o.fill ?? C.ink,
    "text-anchor": o.anchor ?? "start", "dominant-baseline": "middle", opacity: o.opacity ?? 1 }, g);
  for (const p of parts) {
    const s = el("tspan", {}, t);
    if (Array.isArray(p)) { s.setAttribute("baseline-shift", "super"); s.setAttribute("font-size", size * 0.6); s.textContent = p[0]; }
    else if (typeof p === "object") { s.textContent = p.t; s.setAttribute("fill", p.fill); }
    else s.textContent = p;
  }
  return t;
}
// drawn root sign, so it matches the hand-drawn look and never falls back to another font
function rootSign(g, x, y, size, w, o = 1, color = C.ink) {
  const h = size * 0.9;
  el("polyline", { points: pts([[x, y + h * 0.05], [x + size * 0.12, y - h * 0.02], [x + size * 0.28, y + h * 0.42], [x + size * 0.48, y - h * 0.55], [x + size * 0.48 + w, y - h * 0.55]]),
    fill: "none", stroke: color, "stroke-width": size / 14, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: o }, g);
}

// "your turn" routine: same every time. Mouth icon + word + a bar that fills over the pause.
function turn(g, t, id, words = "upphátt") {
  const a = S[id].think_start, b = S[id].think_end;
  const p = prog(t, a - 0.2, 0.3) * (1 - prog(t, b - 0.1, 0.3));
  if (p <= 0) return;
  const gg = el("g", { opacity: p, transform: `translate(${W / 2} 990)` }, g);
  put(gg, rect(520, 110, { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "turnbox"), -260, -55);
  el("ellipse", { cx: -200, cy: -8, rx: 26, ry: 14, fill: C.ink }, gg);
  text(gg, words, 10, -12, 46);
  el("rect", { x: -150, y: 26, width: 380, height: 12, rx: 6, fill: "#E9E2D3" }, gg);
  el("rect", { x: -150, y: 26, width: 380 * clamp((t - a) / (b - a)), height: 12, rx: 6, fill: HYP }, gg);
}

function badge(g, t, a, str = "Nú þú") {
  label(g, str, W / 2, 150, 64, { p: prog(t, a, 0.5), fill: C.hlTint, stroke: C.hl });
}

function steps(g, t, x, y, lines, gap = 96, size = 64) {
  lines.forEach(([at, parts, o = {}], i) => {
    const p = prog(t, at, 0.5);
    if (p > 0) mathText(g, parts, x, y + i * gap, size, { opacity: p, fill: o.fill });
  });
}

// ---------- scenes ----------
function sceneTitle(t) {
  const g = sceneGroup(t, 0.3, st("k1") + 0.1);
  if (!g) return;
  text(g, "Regla Pýþagórasar", W / 2, 470, 110, { opacity: prog(t, 0.4, 0.6) });
  text(g, "Skali 3A · bls. 53", W / 2, 600, 48, { fill: C.soft, weight: 400, opacity: prog(t, 0.8, 0.6) });
}

// the room corner seen from above; reused in the hook and when we come back to it
const CORNER = [640, 860], SC = 6; // 6 px per cm
const A60 = [CORNER[0], CORNER[1] - 60 * SC], B80 = [CORNER[0] + 80 * SC, CORNER[1]];
function wallCorner(g, t, a, o = {}) {
  const pIn = prog(t, a, 0.8);
  put(g, drawOn(line(CORNER[0], CORNER[1], CORNER[0], 150, { stroke: C.ink, strokeWidth: 16, roughness: 0.8 }, "wallV"), pIn));
  put(g, drawOn(line(CORNER[0], CORNER[1], 1500, CORNER[1], { stroke: C.ink, strokeWidth: 16, roughness: 0.8 }, "wallH"), pIn));
  if (o.box) rightBox(g, CORNER, [1, 0], [0, -1], 40, o.box);
}

function sceneHook(t) {
  const g = sceneGroup(t, st("k1"), st("h1"));
  if (!g) return;
  wallCorner(g, t, st("k1"), { box: prog(t, mid("k1", 0.7), 0.4) });
  text(g, "90°?", CORNER[0] + 90, CORNER[1] - 70, 46, { opacity: prog(t, mid("k1", 0.7), 0.4) * (1 - prog(t, st("k2"), 0.4)) });
  // k2: the two measurements
  const p60 = prog(t, st("k2"), 0.6), p80 = prog(t, mid("k2", 0.55), 0.6);
  if (p60 > 0) {
    seg(g, [CORNER[0] - 40, CORNER[1]], [CORNER[0] - 40, A60[1]], LEG, p60, 5, "m60");
    el("circle", { cx: A60[0], cy: A60[1], r: 13, fill: LEG, opacity: p60 }, g);
    text(g, "60 cm", CORNER[0] - 150, (CORNER[1] + A60[1]) / 2, 50, { fill: LEG, opacity: p60 });
  }
  if (p80 > 0) {
    seg(g, [CORNER[0], CORNER[1] + 40], [B80[0], CORNER[1] + 40], LEG2, p80, 5, "m80");
    el("circle", { cx: B80[0], cy: B80[1], r: 13, fill: LEG2, opacity: p80 }, g);
    text(g, "80 cm", (CORNER[0] + B80[0]) / 2, CORNER[1] + 95, 50, { fill: LEG2, opacity: p80 });
  }
  // k3: exactly one metre between the points
  const pd = prog(t, mid("k3", 0.35), 0.8);
  if (pd > 0) {
    seg(g, A60, B80, HYP, pd, 8, "diag");
    label(g, "1 m", (A60[0] + B80[0]) / 2 + 90, (A60[1] + B80[1]) / 2 - 50, 54, { p: prog(t, mid("k3", 0.6), 0.5), fill: C.hlTint, stroke: HYP });
  }
  // k4: 60 + 80 = 140 – the walk around the corner
  const pa = prog(t, st("k4"), 0.5) * (1 - prog(t, st("k6"), 0.4));
  if (pa > 0) {
    const ga = el("g", { opacity: pa }, g);
    el("polyline", { points: pts([A60, CORNER, B80]), fill: "none", stroke: C.soft, "stroke-width": 10, "stroke-dasharray": "4 18", "stroke-linecap": "round" }, ga);
    mathText(ga, ["60 + 80 = 140"], 1250, 380, 64, { anchor: "middle" });
  }
  turn(g, t, "k5");
  // k6: straight is always shorter
  const p6 = prog(t, st("k6"), 0.5) * (1 - prog(t, st("k7"), 0.4));
  if (p6 > 0) {
    const g6 = el("g", { opacity: p6 }, g);
    mathText(g6, ["1 m = 100 cm"], 1250, 380, 64, { anchor: "middle", fill: HYP });
    mathText(g6, ["140?"], 1250, 480, 56, { anchor: "middle", fill: C.soft });
    seg(g6, [1185, 495], [1315, 465], C.ink, prog(t, st("k6") + 0.3, 0.4), 6, "x140");
  }
  const p7 = prog(t, st("k7"), 0.5);
  if (p7 > 0) label(g, "um 550 f.Kr.", 1250, 420, 50, { p: p7 });
}

function sceneTerms(t) {
  const g = sceneGroup(t, st("h1"), st("e1"));
  if (!g) return;
  // a clean right triangle, same shape as the wall corner
  const Cc = [700, 820], Aa = [700, 300], Bb = [1393, 820];
  const pin = prog(t, st("h1"), 0.8);
  put(g, drawOn(poly([Aa, Cc, Bb], { stroke: C.ink, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "termTri"), pin));
  header(g, "Rétthyrndur þríhyrningur", t, st("h1"));
  const pb = prog(t, mid("h2", 0.3), 0.4);
  if (pb > 0) { rightBox(g, Cc, [1, 0], [0, -1], 46, pb); text(g, "90°", Cc[0] + 95, Cc[1] - 85, 50, { opacity: pb }); }
  const pl = prog(t, mid("h3", 0.2), 0.6);
  if (pl > 0) {
    seg(g, Cc, Aa, LEG, pl, 12, "legA"); seg(g, Cc, Bb, LEG2, pl, 12, "legB");
    label(g, "skammhlið", Cc[0] - 190, (Aa[1] + Cc[1]) / 2, 46, { p: prog(t, mid("h3", 0.6), 0.4), fill: tint[LEG], stroke: LEG });
    label(g, "skammhlið", (Cc[0] + Bb[0]) / 2, Cc[1] + 75, 46, { p: prog(t, mid("h3", 0.6), 0.4), fill: tint[LEG2], stroke: LEG2 });
  }
  const ph = prog(t, mid("h4", 0.15), 0.6);
  if (ph > 0) {
    seg(g, Aa, Bb, HYP, ph, 12, "hypT");
    label(g, "langhlið", (Aa[0] + Bb[0]) / 2 + 130, (Aa[1] + Bb[1]) / 2 - 60, 50, { p: prog(t, mid("h4", 0.3), 0.4), fill: tint[HYP], stroke: HYP });
    const pa = prog(t, mid("h4", 0.6), 0.5);
    if (pa > 0) arrow(g, Cc[0] + 60, Cc[1] - 60, (Aa[0] + Bb[0]) / 2 - 20, (Aa[1] + Bb[1]) / 2 + 20, pa, C.soft, "opp");
  }
}

// grid triangle 3-4-5 with squares on every side, built from tiles
const U = 58, G0 = [780, 600];               // right angle corner
const P3 = [G0[0], G0[1] - 3 * U], P4 = [G0[0] + 4 * U, G0[1]];
const E1 = [(P4[0] - P3[0]) / 5, (P4[1] - P3[1]) / 5]; // along hypotenuse
const N1 = [3 * U / 5, -4 * U / 5];                    // outward from hypotenuse
function tilesSmall() {
  const out = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const o = [G0[0] - 3 * U + i * U, G0[1] - 3 * U + j * U]; out.push({ c: LEG, p: [o, [o[0] + U, o[1]], [o[0] + U, o[1] + U], [o[0], o[1] + U]] }); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const o = [G0[0] + i * U, G0[1] + j * U]; out.push({ c: LEG2, p: [o, [o[0] + U, o[1]], [o[0] + U, o[1] + U], [o[0], o[1] + U]] }); }
  return out;
}
function tilesBig() {
  const out = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const o = add(add(P3, E1, i), N1, j);
    out.push([o, add(o, E1), add(add(o, E1), N1), add(o, N1)]);
  }
  // fill order: blue tiles take one corner block, green the rest (any order shows the same count)
  return out;
}
const SMALL = tilesSmall(), BIG = tilesBig();

function sceneSquares(t) {
  const g = sceneGroup(t, st("e1"), st("b1"));
  if (!g) return;
  const formulaIn = prog(t, st("e10"), 0.6);
  const gs = el("g", { transform: `translate(${-330 * formulaIn} 0) scale(${1 - 0.25 * formulaIn})`, "transform-origin": "780 600" }, g);
  // grid paper
  const gp = prog(t, st("e1"), 0.6);
  for (let x = 300; x <= 1300; x += U) el("line", { x1: x, y1: 120, x2: x, y2: 1000, stroke: GRID, "stroke-width": 1.5, opacity: gp * (1 - formulaIn) }, gs);
  for (let y = 120; y <= 1000; y += U) el("line", { x1: 300, y1: y, x2: 1300, y2: y, stroke: GRID, "stroke-width": 1.5, opacity: gp * (1 - formulaIn) }, gs);
  // triangle
  plainPoly(gs, [P3, G0, P4], "#FFFFFF", { stroke: C.ink, sw: 5, opacity: prog(t, st("e1") + 0.4, 0.5) });
  rightBox(gs, G0, [1, 0], [0, -1], 24, prog(t, st("e1") + 0.6, 0.4));
  const pe2 = prog(t, st("e2"), 0.5);
  text(gs, "3", G0[0] + 32, G0[1] - 1.5 * U, 46, { fill: LEG, opacity: pe2 * (1 - prog(t, st("e4"), 0.3)) });
  text(gs, "4", G0[0] + 2 * U, G0[1] - 28, 46, { fill: LEG2, opacity: pe2 * (1 - prog(t, st("e5"), 0.3)) });
  // e3: outlines of the three squares
  const po = prog(t, st("e3") + 0.3, 0.8);
  if (po > 0) {
    plainPoly(gs, [[G0[0] - 3 * U, G0[1] - 3 * U], [G0[0], G0[1] - 3 * U], G0, [G0[0] - 3 * U, G0[1]]], "none", { stroke: LEG, sw: 5, opacity: po });
    plainPoly(gs, [G0, P4, [P4[0], P4[1] + 4 * U], [G0[0], G0[1] + 4 * U]], "none", { stroke: LEG2, sw: 5, opacity: po });
    plainPoly(gs, [P3, P4, add(P4, N1, 5), add(P3, N1, 5)], "none", { stroke: HYP, sw: 6, opacity: po });
  }
  // e4/e5: fill 9 and 16 tiles one row at a time
  const fill9 = prog(t, mid("e4", 0.25), 1.2), fill16 = prog(t, mid("e5", 0.25), 1.4);
  const fly = prog(t, mid("e7", 0.3), 2.0);
  // e6: the 25 cells of the big square
  const p25 = prog(t, mid("e6", 0.3), 0.8);
  if (p25 > 0) BIG.forEach((b) => plainPoly(gs, b, "none", { stroke: HYP, sw: 1.5, opacity: p25 * 0.8 }));
  SMALL.forEach((s, k) => {
    const isBlue = k < 9;
    const shown = isBlue ? fill9 * 9 > k : fill16 * 16 > k - 9;
    if (!shown) return;
    const dl = clamp(fly * 1.6 - (k / 25) * 0.6); // tiles leave one after another
    const p = s.p.map((q, i) => mix(q, BIG[k][i], dl));
    plainPoly(gs, p, tint[s.c], { stroke: s.c, sw: 2.5 });
  });
  // numbers in the squares
  const n9 = prog(t, mid("e4", 0.6), 0.4) * (1 - fly), n16 = prog(t, mid("e5", 0.6), 0.4) * (1 - fly);
  text(gs, "9", G0[0] - 1.5 * U, G0[1] - 1.5 * U, 70, { fill: LEG, opacity: n9 });
  text(gs, "16", G0[0] + 2 * U, G0[1] + 2 * U, 70, { fill: LEG2, opacity: n16 });
  const cBig = add(add(P3, E1, 2.5), N1, 2.5);
  text(gs, "25", cBig[0], cBig[1], 76, { fill: HYP, opacity: prog(t, mid("e6", 0.6), 0.4) });
  // e8: the sum
  const p8 = prog(t, st("e8"), 0.5) * (1 - formulaIn);
  if (p8 > 0) {
    mathText(g, [{ t: "9", fill: LEG }, " + ", { t: "16", fill: LEG2 }, " = ", { t: "25", fill: HYP }], 1600, 560, 80, { anchor: "middle", opacity: p8 });
  }
  // e9–e11: the rule in words, then the book's formula
  if (formulaIn > 0 || t > st("e9")) {
    const pn = prog(t, st("e9"), 0.5);
    if (pn > 0) label(g, "Regla Pýþagórasar", 1330, 260, 60, { p: pn, fill: C.hlTint, stroke: HYP });
    const pw = prog(t, mid("e10", 0.2), 0.6);
    if (pw > 0) {
      const gw = el("g", { opacity: pw }, g);
      plainPoly(gw, [[960, 470], [1010, 470], [1010, 520], [960, 520]], tint[LEG], { stroke: LEG, sw: 3 });
      text(gw, "+", 1050, 495, 60);
      plainPoly(gw, [[1090, 455], [1160, 455], [1160, 525], [1090, 525]], tint[LEG2], { stroke: LEG2, sw: 3 });
      text(gw, "=", 1205, 495, 60);
      plainPoly(gw, [[1250, 440], [1350, 440], [1350, 540], [1250, 540]], tint[HYP], { stroke: HYP, sw: 3 });
    }
    const pf = prog(t, mid("e11", 0.4), 0.6);
    if (pf > 0) {
      const gf = el("g", { opacity: pf }, g);
      put(gf, rect(1120, 150, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "formulaBox"), 770, 640);
      mathText(gf, [{ t: "langhlið", fill: HYP }, ["2"], " = ", { t: "skammhlið1", fill: LEG }, ["2"], " + ", { t: "skammhlið2", fill: LEG2 }, ["2"]], 1330, 715, 46, { anchor: "middle" });
      text(gf, "Skali 3A, bls. 53", 1320, 840, 36, { fill: C.soft, weight: 400 });
    }
  }
}

function sceneBack(t) {
  const g = sceneGroup(t, st("b1"), st("d1"));
  if (!g) return;
  const gl = el("g", { transform: "translate(-260 40) scale(0.85)" }, g);
  wallCorner(gl, t, st("b1") - 0.6, { box: 1 });
  seg(gl, A60, B80, HYP, prog(t, st("b1"), 0.6), 8, "diagB");
  text(gl, "60", CORNER[0] - 70, (CORNER[1] + A60[1]) / 2, 56, { fill: LEG });
  text(gl, "80", (CORNER[0] + B80[0]) / 2, CORNER[1] + 70, 56, { fill: LEG2 });
  text(gl, "?", (A60[0] + B80[0]) / 2 + 60, (A60[1] + B80[1]) / 2 - 40, 70, { fill: HYP, opacity: 1 - prog(t, st("b6"), 0.4) });
  text(gl, "100", (A60[0] + B80[0]) / 2 + 70, (A60[1] + B80[1]) / 2 - 40, 60, { fill: HYP, opacity: prog(t, st("b6"), 0.4) });
  steps(g, t, 1000, 300, [
    [st("b2") + 0.2, ["60", ["2"], " = 3 600"], { fill: LEG }],
    [st("b3") + 0.2, ["80", ["2"], " = 6 400"], { fill: LEG2 }],
    [st("b4"), ["3 600 + 6 400 = 10 000"]],
    [mid("b5", 0.75), ["100", ["2"], " = 10 000"], { fill: HYP }],
    [st("b6"), ["100 cm = 1 m"], { fill: HYP }],
  ], 110, 66);
  if (t > st("b6") + 0.6) check(g, 1560, 740, prog(t, st("b6") + 0.6, 0.5), 1);
}

function sceneExample(t) {
  const g = sceneGroup(t, st("d1"), st("n1"));
  if (!g) return;
  label(g, "Skali 3A · bls. 53 · Sýnidæmi 1", W / 2, 120, 46, { p: prog(t, st("d1"), 0.5) });
  // triangle 2 cm by 5 cm, drawn to scale (1 cm = 80 px) with squares on the legs
  const u = 60, c0 = [440, 560], a = [c0[0], c0[1] - 2 * u], b = [c0[0] + 5 * u, c0[1]];
  const pin = prog(t, st("d2"), 0.6);
  plainPoly(g, [a, c0, b], "#FFFFFF", { stroke: C.ink, sw: 5, opacity: pin });
  rightBox(g, c0, [1, 0], [0, -1], 26, pin);
  const sqIn = prog(t, st("d3") + 0.3, 0.6);
  text(g, "2 cm", c0[0] - 70 - 2 * u * sqIn, c0[1] - u, 42, { fill: LEG, opacity: pin });
  text(g, "5 cm", c0[0] + 2.5 * u, c0[1] + 50 + 5 * u * sqIn, 42, { fill: LEG2, opacity: pin });
  const hq = prog(t, mid("d2", 0.6), 0.4) * (1 - prog(t, st("d7"), 0.3));
  text(g, "?", (a[0] + b[0]) / 2 + 30, (a[1] + b[1]) / 2 - 40, 64, { fill: HYP, opacity: hq });
  seg(g, a, b, HYP, pin, 7, "exHyp");
  const sq = prog(t, st("d3") + 0.3, 0.6);
  if (sq > 0) {
    plainPoly(g, [[c0[0] - 2 * u, a[1]], [c0[0], a[1]], c0, [c0[0] - 2 * u, c0[1]]], tint[LEG], { stroke: LEG, sw: 3, opacity: sq });
    text(g, "4", c0[0] - u, c0[1] - u, 56, { fill: LEG, opacity: sq });
    plainPoly(g, [c0, b, [b[0], b[1] + 5 * u], [c0[0], c0[1] + 5 * u]], tint[LEG2], { stroke: LEG2, sw: 3, opacity: prog(t, mid("d3", 0.6), 0.6) });
    text(g, "25", c0[0] + 2.5 * u, c0[1] + 2.5 * u, 64, { fill: LEG2, opacity: prog(t, mid("d3", 0.6), 0.6) });
  }
  const ans = prog(t, st("d7"), 0.4);
  if (ans > 0) label(g, "≈ 5,4 cm", (a[0] + b[0]) / 2 + 120, (a[1] + b[1]) / 2 - 70, 46, { p: ans, fill: tint[HYP], stroke: HYP });
  // the book's solution, step by step
  const X = 1060, Y = 270, gap = 100;
  steps(g, t, X, Y, [
    [mid("d3", 0.35), ["2", ["2"], " = 4"], { fill: LEG }],
    [mid("d3", 0.7), ["5", ["2"], " = 25"], { fill: LEG2 }],
    [st("d4"), ["l", ["2"], " = 4 + 25 = 29"]],
  ], gap, 64);
  const pr = prog(t, mid("d6", 0.3), 0.5);
  if (pr > 0) {
    mathText(g, ["l = "], X, Y + 3 * gap, 64, { opacity: pr });
    rootSign(g, X + 120, Y + 3 * gap + 10, 64, 82, pr);
    mathText(g, ["29 ≈ 5,4"], X + 162, Y + 3 * gap, 64, { opacity: pr, fill: HYP });
  }
  // d5: area vs length – point at the 29 and say "flatarmál"
  const p5 = prog(t, mid("d5", 0.1), 0.4) * (1 - prog(t, st("d6"), 0.4));
  if (p5 > 0) label(g, "flatarmál, ekki lengd", X + 380, Y + 2 * gap + 80, 40, { p: p5, fill: "#FFFFFF" });
  // d8: the common mistake, crossed out
  const p8 = prog(t, st("d8"), 0.4) * (1 - prog(t, st("d9"), 0.4));
  if (p8 > 0) {
    const gm = el("g", { opacity: p8 }, g);
    mathText(gm, ["l = 29 cm"], X, Y + 4 * gap + 40, 60, { fill: C.soft });
    seg(gm, [X - 10, Y + 4 * gap + 60], [X + 290, Y + 4 * gap + 20], "#B0563F", prog(t, mid("d8", 0.5), 0.4), 8, "mistake");
  }
  // d9–d10: sanity check
  const p9 = prog(t, st("d9") + 0.3, 0.5);
  if (p9 > 0) {
    mathText(g, ["5  <  5,4  <  2 + 5"], X, Y + 4 * gap + 40, 60, { opacity: p9 });
    if (t > st("d10") + 0.8) check(g, X + 640, Y + 4 * gap + 40, prog(t, st("d10") + 0.8, 0.5), 0.8);
  }
}

function sceneTurn1(t) {
  const g = sceneGroup(t, st("n1"), st("r1"));
  if (!g) return;
  badge(g, t, st("n1"));
  label(g, "Skali 3A · verkefni 2.7", W / 2, 245, 36, { p: prog(t, st("n2"), 0.5), fill: "#FFFFFF" });
  // garage floor seen from above, 4 m by 6 m (1 m = 90 px)
  const u = 90, x0 = 260, y0 = 380;
  const pin = prog(t, st("n2"), 0.6);
  put(g, drawOn(rect(6 * u, 4 * u, { stroke: C.ink, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "garage"), pin), x0, y0);
  text(g, "6 m", x0 + 3 * u, y0 + 4 * u + 50, 46, { fill: LEG2, opacity: prog(t, mid("n2", 0.75), 0.4) });
  text(g, "4 m", x0 - 60, y0 + 2 * u, 46, { fill: LEG, opacity: prog(t, mid("n2", 0.45), 0.4) });
  const pd = prog(t, mid("n3", 0.4), 0.7);
  if (pd > 0) {
    seg(g, [x0, y0 + 4 * u], [x0 + 6 * u, y0], HYP, pd, 7, "garDiag");
    rightBox(g, [x0, y0 + 4 * u], [1, 0], [0, -1], 26, pd);
    label(g, "hornalína", x0 + 3 * u + 60, y0 + 2 * u - 70, 44, { p: prog(t, mid("n3", 0.6), 0.4), fill: tint[HYP], stroke: HYP });
  }
  turn(g, t, "n4", "reiknaðu");
  steps(g, t, 1040, 330, [
    [mid("n5", 0.1), ["4", ["2"], " = 16"], { fill: LEG }],
    [mid("n5", 0.55), ["6", ["2"], " = 36"], { fill: LEG2 }],
    [st("n6"), ["16 + 36 = 52"]],
  ], 100, 64);
  const pr = prog(t, mid("n6", 0.45), 0.5);
  if (pr > 0) {
    rootSign(g, 1040, 640, 64, 82, pr);
    mathText(g, ["52 ≈ 7,2 m"], 1082, 630, 64, { opacity: pr, fill: HYP });
  }
  if (t > st("n7")) check(g, 1560, 630, prog(t, st("n7") + 0.3, 0.5), 0.8);
}

function sceneReverse(t) {
  const g = sceneGroup(t, st("r1"), st("m1"));
  if (!g) return;
  header(g, "Reglan virkar líka öfugt", t, st("r1"));
  const p = prog(t, mid("r2", 0.05), 0.6);
  const gg = el("g", { opacity: p }, g);
  mathText(gg, ["9 + 16 = 25"], 560, 520, 80, { anchor: "middle" });
  arrow(gg, 820, 520, 1040, 520, prog(t, mid("r2", 0.3), 0.5), C.ink, "rev");
  const c = [1180, 640];
  plainPoly(gg, [[c[0], c[1] - 180], c, [c[0] + 240, c[1]]], "#FFFFFF", { stroke: C.ink, sw: 5 });
  const pb = prog(t, mid("r2", 0.45), 0.4);
  rightBox(gg, c, [1, 0], [0, -1], 40, pb);
  text(gg, "90°", c[0] + 80, c[1] - 70, 46, { opacity: pb });
  if (t > mid("r2", 0.7)) {
    const pw = prog(t, mid("r2", 0.7), 0.5);
    el("polyline", { points: pts([[c[0] + 420, c[1] - 240], [c[0] + 420, c[1]], [c[0] + 640, c[1]]]), fill: "none", stroke: C.ink, "stroke-width": 14, opacity: pw }, gg);
    text(gg, "60 · 80 · 100", c[0] + 530, c[1] + 80, 42, { fill: C.soft, opacity: pw });
  }
}

function sceneTurn2(t) {
  const g = sceneGroup(t, st("m1"), st("u1"));
  if (!g) return;
  badge(g, t, st("m1"));
  label(g, "Skali 3A · verkefni 2.4a", W / 2, 245, 36, { p: prog(t, st("m2"), 0.5), fill: "#FFFFFF" });
  // triangle with sides 5, 7, 9 (1 = 55 px), base 9 along the bottom
  const u = 55, base = 9 * u, x0 = 220, y0 = 760;
  const ax = (25 - 49 + 81) / (2 * 9); // distance from left corner along base to the foot of the apex, sides 5 (left) and 7 (right)
  const ay = Math.sqrt(25 - ax * ax);
  const A = [x0, y0], B = [x0 + base, y0], Ap = [x0 + ax * u, y0 - ay * u];
  const pin = prog(t, st("m2"), 0.6);
  plainPoly(g, [A, Ap, B], "#FFFFFF", { stroke: C.ink, sw: 5, opacity: pin });
  text(g, "5", (A[0] + Ap[0]) / 2 - 40, (A[1] + Ap[1]) / 2, 50, { fill: LEG, opacity: pin });
  text(g, "7", (B[0] + Ap[0]) / 2 + 40, (B[1] + Ap[1]) / 2, 50, { fill: LEG2, opacity: pin });
  text(g, "9", (A[0] + B[0]) / 2, y0 + 55, 50, { fill: HYP, opacity: pin });
  const q = prog(t, mid("m2", 0.7), 0.4) * (1 - prog(t, st("m6"), 0.3));
  text(g, "90° ?", Ap[0], Ap[1] - 50, 46, { opacity: q });
  turn(g, t, "m3", "já eða nei?");
  steps(g, t, 1000, 330, [
    [mid("m4", 0.1), ["5", ["2"], " + 7", ["2"], " = 25 + 49 = 74"]],
    [mid("m5", 0.1), ["9", ["2"], " = 81"], { fill: HYP }],
    [mid("m5", 0.55), ["74 ≠ 81"]],
  ], 110, 60);
  const pn = prog(t, st("m6"), 0.4);
  if (pn > 0) label(g, "Nei", 1180, 720, 64, { p: pn, fill: "#FFFFFF", stroke: C.ink });
}

function sceneRecap(t) {
  const g = sceneGroup(t, st("u1"), st("a1"));
  if (!g) return;
  header(g, "Rifjum upp", t, st("u1"));
  const slots = [{ x: 140, q: "u2", a: "u3" }, { x: 720, q: "u4", a: "u5" }, { x: 1300, q: "u6", a: "u7" }];
  slots.forEach((s, i) => {
    const sw = 480, sh = 500, sy = 260;
    const inP = prog(t, st("u1") + 0.4 + i * 0.35, 0.5);
    const asked = t >= st(s.q), ans = prog(t, st(s.a), 0.5);
    put(g, drawOn(rect(sw, sh, { stroke: asked ? C.hl : C.ink, strokeWidth: asked && !ans ? 8 : 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "pslot" + i + (asked ? "a" : "")), inP), s.x, sy);
    el("circle", { cx: s.x + 50, cy: sy + 50, r: 34, fill: asked ? C.hl : C.ink, opacity: inP }, g);
    text(g, String(i + 1), s.x + 50, sy + 52, 44, { fill: "#FFF", opacity: inP });
    const cx = s.x + sw / 2;
    if (asked && ans < 1) text(g, "?", cx, sy + sh / 2, 200, { fill: C.hl, opacity: 1 - ans });
    if (ans <= 0) return;
    const ga = el("g", { opacity: ans }, g);
    if (i === 0) {
      const c0 = [s.x + 120, sy + 380], a = [c0[0], c0[1] - 200], b = [c0[0] + 260, c0[1]];
      plainPoly(ga, [a, c0, b], "#FFFFFF", { stroke: C.ink, sw: 4 });
      rightBox(ga, c0, [1, 0], [0, -1], 24);
      seg(ga, a, b, HYP, 1, 10, "rcHyp");
      text(ga, "langhlið", cx + 40, sy + 440, 40, { fill: HYP });
    } else if (i === 1) {
      plainPoly(ga, [[s.x + 60, sy + 220], [s.x + 120, sy + 220], [s.x + 120, sy + 280], [s.x + 60, sy + 280]], tint[LEG], { stroke: LEG, sw: 3 });
      text(ga, "+", s.x + 150, sy + 250, 50);
      plainPoly(ga, [[s.x + 180, sy + 205], [s.x + 270, sy + 205], [s.x + 270, sy + 295], [s.x + 180, sy + 295]], tint[LEG2], { stroke: LEG2, sw: 3 });
      text(ga, "=", s.x + 305, sy + 250, 50);
      plainPoly(ga, [[s.x + 335, sy + 190], [s.x + 455, sy + 190], [s.x + 455, sy + 310], [s.x + 335, sy + 310]], tint[HYP], { stroke: HYP, sw: 3 });
      mathText(ga, ["9 + 16 = 25"], cx, sy + 420, 48, { anchor: "middle" });
    } else {
      rootSign(ga, cx - 110, sy + 270, 120, 120, 1, HYP);
      text(ga, "29", cx + 40, sy + 250, 90, { fill: HYP });
      text(ga, "ferningsrót", cx, sy + 420, 42);
    }
  });
  [["u2"], ["u4"], ["u6"]].forEach(([q]) => turn(g, t, q));
}

function sceneTask(t) {
  const g = sceneGroup(t, st("a1"), TL.duration + 5);
  if (!g) return;
  header(g, "Verkefni", t, st("a1"));
  label(g, "Skali 3A · verkefni 2.3", W / 2, 245, 36, { p: prog(t, st("a1") + 0.4, 0.5), fill: "#FFFFFF" });
  // desk from above
  const pd = prog(t, st("a2"), 0.6);
  put(g, drawOn(rect(620, 360, { stroke: C.ink, strokeWidth: 6, fill: "#F1E3C8", fillStyle: "solid", roughness: 1 }, "desk"), pd), 220, 380);
  text(g, "lengd", 530, 790, 44, { fill: LEG2, opacity: prog(t, mid("a2", 0.4), 0.4) });
  text(g, "breidd", 140, 560, 44, { fill: LEG, opacity: prog(t, mid("a2", 0.7), 0.4) });
  const pdg = prog(t, st("a3"), 0.7);
  if (pdg > 0) seg(g, [220, 740], [840, 380], HYP, pdg, 7, "deskDiag");
  // a screen measured on the diagonal
  const ps = prog(t, st("a4"), 0.6);
  if (ps > 0) {
    put(g, drawOn(rect(560, 330, { stroke: C.ink, strokeWidth: 10, fill: "#2A3346", fillStyle: "solid", roughness: 0.8 }, "tv"), ps), 1120, 400);
    seg(g, [1135, 715], [1665, 415], HYP, prog(t, mid("a4", 0.3), 0.6), 7, "tvDiag");
    label(g, "mælt á ská", 1400, 800, 44, { p: prog(t, mid("a4", 0.5), 0.4), fill: tint[HYP], stroke: HYP });
  }
}

export function render(t) {
  root.replaceChildren();
  sceneTitle(t);
  sceneHook(t);
  sceneTerms(t);
  sceneSquares(t);
  sceneBack(t);
  sceneExample(t);
  sceneTurn1(t);
  sceneReverse(t);
  sceneTurn2(t);
  sceneRecap(t);
  sceneTask(t);
  text(root, TL.series_tag, 48, 52, 30, { anchor: "start", fill: C.soft, weight: 400 });
}
