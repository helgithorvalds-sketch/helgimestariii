// Regla Pýþagórasar, 10. bekkur (Skali 3A bls. 50–55). Version 2, after viewer feedback:
// - every idea is shown on a real object first (house, ground, ladder, book, door, phone, ramp, TV, garage)
// - every term is taught, with a picture, before it is used; no term first appears inside an exercise
// - prerequisites (annað veldi, ferningsrót) are taught and tried before the rule
// - show → try → add one new thing → show → try; the three steps stay on screen as a checklist
import { W, H, C, clamp, prog, st, mid, lerp, el, put, drawOn, rect, line, text, label, arrow, check, header, sceneGroup, S, TL, root } from "/lib.js";
export { init } from "/lib.js";

const BRICK = "#B5583A", BRICK2 = "#C97A5C", GRASS = "#5E9E4A", SKY = "#EAF2F8", WOOD = "#C98A2E";
const LEGG = "#3D8B3D", LEGW = "#A4452A", HYP = "#E0791A", CALC = "#2A3346";
const tintOf = { [LEGG]: "#E1F0DC", [LEGW]: "#F6E0D8", [HYP]: "#FDE3C8" };
const pts = (a) => a.map((p) => p.join(",")).join(" ");
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const mix = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

function poly(g, p, fill, o = {}) {
  return el("polygon", { points: pts(p), fill, stroke: o.stroke ?? "none", "stroke-width": o.sw ?? 0, opacity: o.opacity ?? 1, "stroke-linejoin": "round" }, g);
}
function seg(g, a, b, color, p = 1, w = 7, key = "s") {
  put(g, drawOn(line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), { stroke: color, strokeWidth: w, roughness: 1.1 }, key), p));
}
function rightBox(g, c, u, v, s = 34, o = 1, color = C.ink) {
  const a = add(c, u, s), b = add(add(c, u, s), v, s), d = add(c, v, s);
  el("polyline", { points: pts([a, b, d]), fill: "none", stroke: color, "stroke-width": 5, opacity: o }, g);
}
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
function rootSign(g, x, y, size, w, o = 1, color = C.ink) {
  const h = size * 0.9;
  el("polyline", { points: pts([[x, y + h * 0.05], [x + size * 0.12, y - h * 0.02], [x + size * 0.28, y + h * 0.42], [x + size * 0.48, y - h * 0.55], [x + size * 0.48 + w, y - h * 0.55]]),
    fill: "none", stroke: color, "stroke-width": size / 14, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: o }, g);
}
// "√29": root sign drawn over a number; returns the x where the next text can start
function rootOf(g, x, y, size, num, o = {}) {
  const w = String(num).length * size * 0.62 + 12;
  rootSign(g, x, y + size * 0.15, size, w, o.opacity ?? 1, o.fill ?? C.ink);
  mathText(g, [String(num)], x + size * 0.56, y, size, { opacity: o.opacity ?? 1, fill: o.fill });
  return x + size * 0.56 + w;
}
function tiles(g, x, y, n, u, color, o = 1, count = n * n) {
  for (let k = 0; k < Math.min(count, n * n); k++) {
    const i = k % n, j = Math.floor(k / n);
    el("rect", { x: x + i * u, y: y + j * u, width: u, height: u, fill: tintOf[color] ?? "#FFF", stroke: color, "stroke-width": 2.5, opacity: o }, g);
  }
}

// the same "your turn" routine every time: mouth icon, a short word, and a bar that fills over the pause
function turn(g, t, id, words = "upphátt") {
  const a = S[id].think_start, b = S[id].think_end;
  const p = prog(t, a - 0.2, 0.3) * (1 - prog(t, b - 0.1, 0.3));
  if (p <= 0) return;
  const gg = el("g", { opacity: p, transform: `translate(${W / 2} 1000)` }, g);
  put(gg, rect(560, 110, { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "turnbox"), -280, -55);
  el("ellipse", { cx: -215, cy: -8, rx: 26, ry: 14, fill: C.ink }, gg);
  text(gg, words, 20, -12, 44);
  el("rect", { x: -170, y: 26, width: 410, height: 12, rx: 6, fill: "#E9E2D3" }, gg);
  el("rect", { x: -170, y: 26, width: 410 * clamp((t - a) / (b - a)), height: 12, rx: 6, fill: HYP }, gg);
}
function tryBadge(g, t, a, str = "Prófaðu") {
  label(g, str, W / 2, 130, 60, { p: prog(t, a, 0.5), fill: C.hlTint, stroke: C.hl });
}

// the three steps, as a checklist on the right; active = step being done now, done = steps finished
function checklist(g, t, x, y, active, done, o = 1) {
  const items = [["1", "Í annað veldi"], ["2", "Leggja saman"], ["3", "Ferningsrót"]];
  const gg = el("g", { opacity: o }, g);
  put(gg, rect(470, 330, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "checklist"), x, y);
  text(gg, "Skrefin þrjú", x + 235, y + 45, 40);
  items.forEach(([n, s], i) => {
    const yy = y + 115 + i * 78, on = active === i, ok = done > i;
    el("circle", { cx: x + 50, cy: yy, r: 26, fill: on ? HYP : ok ? "#23935F" : C.ink }, gg);
    text(gg, ok ? "✓" : n, x + 50, yy + 2, 32, { fill: "#FFF" });
    text(gg, s, x + 95, yy, 38, { anchor: "start", fill: on ? HYP : C.ink, weight: on ? 700 : 400 });
  });
}

// ---------- real objects ----------
const GROUND_Y = 900, M = 110;                 // 1 metre = 110 px in the house scene
const WALL_X = 1180;                            // left wall of the house
const FOOT = [WALL_X - 3 * M, GROUND_Y], TOP = [WALL_X, GROUND_Y - 4 * M], CORNER = [WALL_X, GROUND_Y];

function house(g, o = 1, wallHi = 0) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: WALL_X, y: 300, width: 620, height: GROUND_Y - 300, fill: BRICK }, gg);
  for (let y = 300, r = 0; y < GROUND_Y; y += 38, r++) {
    el("line", { x1: WALL_X, y1: y, x2: WALL_X + 620, y2: y, stroke: BRICK2, "stroke-width": 3 }, gg);
    for (let x = WALL_X + (r % 2 ? 40 : 0); x < WALL_X + 620; x += 80) el("line", { x1: x, y1: y, x2: x, y2: y + 38, stroke: BRICK2, "stroke-width": 3 }, gg);
  }
  poly(gg, [[WALL_X - 40, 300], [WALL_X + 310, 120], [WALL_X + 660, 300]], "#5A3E36", { stroke: C.ink, sw: 4 });
  // window at 4 m: its sill sits exactly at the ladder top
  el("rect", { x: WALL_X + 40, y: TOP[1] - 150, width: 160, height: 150, fill: SKY, stroke: "#FFFFFF", "stroke-width": 10 }, gg);
  el("line", { x1: WALL_X + 120, y1: TOP[1] - 150, x2: WALL_X + 120, y2: TOP[1], stroke: "#FFFFFF", "stroke-width": 8 }, gg);
  el("rect", { x: WALL_X + 380, y: GROUND_Y - 260, width: 130, height: 260, fill: "#7A4A2B", stroke: C.ink, "stroke-width": 4 }, gg);
  el("circle", { cx: WALL_X + 490, cy: GROUND_Y - 130, r: 8, fill: "#E8C15A" }, gg);
  el("rect", { x: WALL_X - 6, y: 300, width: 12, height: GROUND_Y - 300, fill: "#7E3A25" }, gg);
  if (wallHi) el("rect", { x: WALL_X - 7, y: TOP[1], width: 14, height: GROUND_Y - TOP[1], fill: LEGW, opacity: wallHi }, gg);
}
function ground(g, o = 1, hi = 0, x0 = -400, x1 = W + 400, depth = 480) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: x0, y: GROUND_Y, width: x1 - x0, height: depth, fill: "#D9E8CF" }, gg);
  el("rect", { x: x0, y: GROUND_Y - 4, width: x1 - x0, height: 10, fill: GRASS }, gg);
  if (hi) el("rect", { x: FOOT[0], y: GROUND_Y - 6, width: WALL_X - FOOT[0], height: 14, fill: LEGG, opacity: hi }, gg);
}
function ladder(g, a, b, p = 1, hi = false) {
  // two rails and rungs from foot a to top b
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * 16, ny = ux * 16;
  const end = [a[0] + dx * p, a[1] + dy * p];
  const gg = el("g", {}, g);
  for (const s of [-1, 1]) el("line", { x1: a[0] + nx * s, y1: a[1] + ny * s, x2: end[0] + nx * s, y2: end[1] + ny * s, stroke: hi ? HYP : WOOD, "stroke-width": 9, "stroke-linecap": "round" }, gg);
  for (let d = 30; d < L * p; d += 46) {
    const c = [a[0] + ux * d, a[1] + uy * d];
    el("line", { x1: c[0] + nx, y1: c[1] + ny, x2: c[0] - nx, y2: c[1] - ny, stroke: hi ? HYP : WOOD, "stroke-width": 6 }, gg);
  }
}
function dimV(g, x, y1, y2, txt, color, o = 1, right = false) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  el("line", { x1: x, y1, x2: x, y2, stroke: color, "stroke-width": 4 }, gg);
  for (const y of [y1, y2]) el("line", { x1: x - 14, y1: y, x2: x + 14, y2: y, stroke: color, "stroke-width": 4 }, gg);
  if (txt && right) label(gg, txt, x + 70, (y1 + y2) / 2, 42, { fill: "#FFFFFF", stroke: LEGW, color: LEGW });
  else if (txt) text(gg, txt, x - 22, (y1 + y2) / 2, 46, { fill: color, anchor: "end" });
}
function dimH(g, x1, x2, y, txt, color, o = 1) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  el("line", { x1, y1: y, x2, y2: y, stroke: color, "stroke-width": 4 }, gg);
  for (const x of [x1, x2]) el("line", { x1: x, y1: y - 14, x2: x, y2: y + 14, stroke: color, "stroke-width": 4 }, gg);
  if (txt) text(gg, txt, (x1 + x2) / 2, y + 45, 46, { fill: color });
}

function book(g, x, y, o) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: 200, height: 260, fill: "#2F6FC0", stroke: C.ink, "stroke-width": 4, rx: 4 }, gg);
  el("rect", { x: x + 20, y: y + 30, width: 160, height: 40, fill: "#FFFFFF", opacity: 0.85 }, gg);
  rightBox(gg, [x, y + 260], [1, 0], [0, -1], 34, 1, HYP);
  text(gg, "bók", x + 100, y + 310, 40);
}
function door(g, x, y, o) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: 160, height: 300, fill: "#8A5A35", stroke: C.ink, "stroke-width": 4 }, gg);
  el("circle", { cx: x + 135, cy: y + 160, r: 9, fill: "#E8C15A" }, gg);
  rightBox(gg, [x, y + 300], [1, 0], [0, -1], 34, 1, HYP);
  text(gg, "hurð", x + 80, y + 350, 40);
}
function phone(g, x, y, o) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: 140, height: 270, rx: 22, fill: CALC, stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: x + 12, y: y + 22, width: 116, height: 220, rx: 6, fill: "#9CC3E6" }, gg);
  rightBox(gg, [x + 12, y + 242], [1, 0], [0, -1], 30, 1, HYP);
  text(gg, "sími", x + 70, y + 320, 40);
}

// a wheelchair ramp seen from the side; letters A (ground), B (height), C (ramp)
function ramp(g, x, y, wpx, hpx, o = 1, opts = {}) {
  const gg = el("g", { opacity: o }, g);
  el("line", { x1: x - 120, y1: y, x2: x + wpx + 360, y2: y, stroke: GRASS, "stroke-width": 8 }, gg);
  poly(gg, [[x, y], [x + wpx, y], [x + wpx, y - hpx]], "#C9CED6", { stroke: C.ink, sw: 4 });
  el("rect", { x: x + wpx, y: y - hpx, width: 220, height: hpx, fill: "#A9AFB9", stroke: C.ink, "stroke-width": 4 }, gg); // landing at the door
  el("rect", { x: x + wpx + 110, y: y - hpx - 230, width: 100, height: 230, fill: "#7A4A2B", stroke: C.ink, "stroke-width": 4 }, gg);
  rightBox(gg, [x + wpx, y], [-1, 0], [0, -1], 30);
  if (opts.letters) {
    const lp = opts.letters;
    const lab = (s, px, py, hi) => { el("circle", { cx: px, cy: py, r: 34, fill: hi ? HYP : "#FFFFFF", stroke: C.ink, "stroke-width": 4, opacity: lp }, gg); text(gg, s, px, py + 2, 40, { opacity: lp, fill: hi ? "#FFF" : C.ink }); };
    lab("A", x + wpx / 2, y + 55, false);
    lab("B", x + wpx - 60, y - hpx / 2 + 40, false);
    lab("C", x + wpx / 2 - 40, y - hpx / 2 - 60, opts.hiC);
  }
}

function tv(g, x, y, w, h, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: w, height: h, fill: "#1E2533", stroke: C.ink, "stroke-width": 10, rx: 8 }, gg);
  el("rect", { x: x + w / 2 - 20, y: y + h, width: 40, height: 50, fill: "#555" }, gg);
  el("rect", { x: x + w / 2 - 120, y: y + h + 50, width: 240, height: 14, rx: 6, fill: "#555" }, gg);
}
function calculator(g, x, y, o, hiKey) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: 300, height: 420, rx: 24, fill: CALC, stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: x + 25, y: y + 25, width: 250, height: 80, rx: 8, fill: "#CFE3C4" }, gg);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const kx = x + 25 + c * 64, ky = y + 130 + r * 68, isRoot = r === 0 && c === 3;
    el("rect", { x: kx, y: ky, width: 54, height: 54, rx: 8, fill: isRoot && hiKey ? HYP : "#4A5466" }, gg);
    if (isRoot) rootSign(gg, kx + 12, ky + 30, 30, 14, 1, "#FFF");
  }
}

// ---------- scenes ----------
function sceneTitle(t) {
  const g = sceneGroup(t, 0.3, st("k1") + 0.1);
  if (!g) return;
  text(g, "Regla Pýþagórasar", W / 2, 470, 110, { opacity: prog(t, 0.4, 0.6) });
  text(g, "Skali 3A · bls. 53", W / 2, 600, 48, { fill: C.soft, weight: 400, opacity: prog(t, 0.8, 0.6) });
}

// the house problem, the right angle and the names of the sides, all on the same real picture
function sceneHouse(t) {
  const g = sceneGroup(t, st("k1"), st("p1"));
  if (!g) return;
  const insets = prog(t, st("r4"), 0.5) * (1 - prog(t, st("r5"), 0.5));
  const scene = el("g", { opacity: 1 - 0.85 * insets }, g);
  ground(scene, prog(t, st("k1"), 0.6), prog(t, mid("s3", 0.3), 0.5));
  house(scene, prog(t, st("k1"), 0.6), prog(t, mid("s3", 0.1), 0.5));
  // k2: window height; k3: ladder foot distance; k4: the ladder with a question mark
  dimV(scene, WALL_X + 30, GROUND_Y, TOP[1], "4 m", "#FFFFFF", prog(t, mid("k2", 0.3), 0.5) * (1 - prog(t, st("r1"), 0.4)), true);
  dimH(scene, FOOT[0], WALL_X, GROUND_Y + 50, "3 m", LEGG, prog(t, mid("k3", 0.3), 0.5) * (1 - prog(t, st("r1"), 0.4)));
  const pl = prog(t, st("k4"), 1.0);
  if (pl > 0) ladder(scene, FOOT, TOP, pl, prog(t, mid("s4", 0.2), 0.5) > 0.5);
  const q = prog(t, mid("k4", 0.6), 0.4) * (1 - prog(t, st("r1"), 0.4));
  if (q > 0) text(scene, "?", (FOOT[0] + TOP[0]) / 2 - 70, (FOOT[1] + TOP[1]) / 2 - 40, 110, { fill: HYP, opacity: q });
  // r1–r3: the right angle where the wall meets the ground
  const outR = (1 - prog(t, st("s1"), 0.4)) * (1 - insets);
  const pa = prog(t, mid("r1", 0.4), 0.5);
  if (pa > 0) {
    el("circle", { cx: CORNER[0], cy: CORNER[1], r: 70, fill: "none", stroke: HYP, "stroke-width": 6, opacity: pa * outR }, scene);
    rightBox(scene, CORNER, [-1, 0], [0, -1], 46, prog(t, st("r2"), 0.4), C.ink);
  }
  const pr = prog(t, mid("r2", 0.55), 0.4) * outR;
  if (pr > 0) label(scene, "rétt horn", CORNER[0] - 250, CORNER[1] - 120, 46, { p: pr, fill: C.hlTint, stroke: HYP });
  const p90 = prog(t, st("r3"), 0.4) * outR;
  if (p90 > 0) text(scene, "90°", CORNER[0] - 250, CORNER[1] - 210, 60, { opacity: p90 });
  // r4: right angles on everyday things
  if (insets > 0) {
    const gi = el("g", { opacity: insets }, g);
    book(gi, 330, 330, prog(t, mid("r4", 0.3), 0.4));
    door(gi, 860, 290, prog(t, mid("r4", 0.55), 0.4));
    phone(gi, 1360, 320, prog(t, mid("r4", 0.75), 0.4));
  }
  // r5: the little square is the sign for a right angle
  const p5 = prog(t, st("r5") + 0.3, 0.5) * outR;
  if (p5 > 0) { el("circle", { cx: CORNER[0] - 23, cy: CORNER[1] - 23, r: 46, fill: "none", stroke: HYP, "stroke-width": 5, opacity: p5 }, scene); label(scene, "merki fyrir rétt horn", CORNER[0] - 250, GROUND_Y + 80, 42, { p: p5, fill: "#FFFFFF" }); }
  // s1–s5: the triangle and the names of its sides
  const pt = prog(t, st("s1"), 0.6);
  if (pt > 0) {
    poly(scene, [FOOT, CORNER, TOP], HYP, { opacity: 0.14 * pt });
    el("polygon", { points: pts([FOOT, CORNER, TOP]), fill: "none", stroke: C.ink, "stroke-width": 4, "stroke-dasharray": "14 10", opacity: pt }, scene);
  }
  const p2b = prog(t, mid("s2", 0.5), 0.4);
  if (p2b > 0) label(scene, "rétthyrndur þríhyrningur", 520, 230, 46, { p: p2b, fill: "#FFFFFF" });
  const ps = prog(t, mid("s3", 0.6), 0.5);
  if (ps > 0) {
    label(scene, "skammhlið", WALL_X + 300, TOP[1] + 190, 44, { p: ps, fill: tintOf[LEGW], stroke: LEGW });
    arrow(scene, WALL_X + 160, TOP[1] + 190, WALL_X + 18, TOP[1] + 230, ps, LEGW, "shW");
    label(scene, "skammhlið", (FOOT[0] + WALL_X) / 2, GROUND_Y + 110, 44, { p: ps, fill: tintOf[LEGG], stroke: LEGG });
  }
  const ph = prog(t, mid("s4", 0.5), 0.5);
  if (ph > 0) label(scene, "langhlið", FOOT[0] - 40, (FOOT[1] + TOP[1]) / 2 - 60, 50, { p: ph, fill: tintOf[HYP], stroke: HYP });
  const po = prog(t, mid("s5", 0.3), 0.6);
  if (po > 0) arrow(scene, CORNER[0] - 60, CORNER[1] - 60, (FOOT[0] + TOP[0]) / 2 + 30, (FOOT[1] + TOP[1]) / 2 + 30, po, C.soft, "oppHouse");
}

function sceneRampTry(t) {
  const g = sceneGroup(t, st("p1"), st("v1"));
  if (!g) return;
  tryBadge(g, t, st("p1"));
  const hi = prog(t, st("p3"), 0.4);
  ramp(g, 360, 820, 900, 330, prog(t, st("p1") + 0.3, 0.6), { letters: prog(t, st("p2"), 0.5), hiC: hi > 0.5 });
  turn(g, t, "p2", "A, B eða C?");
  if (hi > 0) {
    label(g, "langhlið", 640, 400, 50, { p: hi, fill: tintOf[HYP], stroke: HYP });
    check(g, 1620, 300, prog(t, st("p3") + 0.3, 0.5), 1);
  }
}

function sceneSquare(t) {
  const g = sceneGroup(t, st("v1"), st("g1"));
  if (!g) return;
  if (t < st("p4") - 0.3) header(g, "Annað veldi", t, st("v1"));
  const pv2 = prog(t, st("v2"), 0.5) * (1 - prog(t, st("p4") - 0.3, 0.3));
  if (pv2 > 0) label(g, "talan sinnum sjálf sig", W / 2, 270, 48, { p: pv2, fill: "#FFFFFF" });
  if (t < st("p4") - 0.2) {
    const u = 80, x0 = 360, y0 = 380;
    const count = Math.floor(9 * prog(t, mid("v3", 0.3), 1.6));
    if (count > 0) tiles(g, x0, y0, 3, u, LEGW, 1, count);
    const pm = prog(t, mid("v3", 0.2), 0.5);
    if (pm > 0) { text(g, "3", x0 + 1.5 * u, y0 - 40, 50, { opacity: pm }); text(g, "3", x0 - 40, y0 + 1.5 * u, 50, { opacity: pm }); }
    const pf = prog(t, mid("v4", 0.6), 0.5);
    if (pf > 0) { el("rect", { x: x0 - 6, y: y0 - 6, width: 3 * u + 12, height: 3 * u + 12, fill: "none", stroke: HYP, "stroke-width": 7, opacity: pf }, g); label(g, "ferningur", x0 + 1.5 * u, y0 + 3 * u + 80, 44, { p: pf, fill: tintOf[HYP], stroke: HYP }); }
    mathText(g, ["3 · 3 = 9"], 1000, 470, 90, { opacity: prog(t, mid("v3", 0.5), 0.5) });
    const pw = prog(t, mid("v5", 0.3), 0.5);
    if (pw > 0) {
      mathText(g, ["3", ["2"], " = 9"], 1000, 640, 90, { opacity: pw, fill: HYP });
      arrow(g, 1130, 540, 1068, 590, prog(t, mid("v5", 0.5), 0.4), C.soft, "sup");
    }
    return;
  }
  // p4–p5: try 4²
  tryBadge(g, t, st("p4"));
  mathText(g, ["4", ["2"], " = ?"], W / 2, 430, 110, { anchor: "middle", opacity: prog(t, st("p4"), 0.5) * (1 - prog(t, st("p5"), 0.3)) });
  turn(g, t, "p4");
  const pa = prog(t, st("p5"), 0.5);
  if (pa > 0) {
    tiles(g, 480, 330, 4, 70, LEGG, pa, Math.floor(16 * prog(t, st("p5"), 1.2)));
    mathText(g, ["4", ["2"], " = 4 · 4 = 16"], 900, 470, 90, { opacity: pa, fill: LEGG });
  }
}

// the rule on the ladder triangle (3, 4, 5), drawn in the colours of the real things
const U = 62, R0 = [760, 640];                              // right angle corner (wall meets ground)
const RF = [R0[0] - 3 * U, R0[1]], RT = [R0[0], R0[1] - 4 * U];  // foot (ground side 3) and top (wall side 4)
const HE1 = [(RT[0] - RF[0]) / 5, (RT[1] - RF[1]) / 5];           // along the ladder, foot → top
const HN = [-4 * U / 5, -3 * U / 5];                               // outward from the ladder (up-left)
function bigTiles() {
  const out = [];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const o = add(add(RF, HE1, i), HN, j); out.push([o, add(o, HE1), add(add(o, HE1), HN), add(o, HN)]); }
  return out;
}
function smallTiles() {
  const out = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const o = [RF[0] + i * U, R0[1] + j * U]; out.push({ c: LEGG, p: [o, [o[0] + U, o[1]], [o[0] + U, o[1] + U], [o[0], o[1] + U]] }); }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const o = [R0[0] + i * U, RT[1] + j * U]; out.push({ c: LEGW, p: [o, [o[0] + U, o[1]], [o[0] + U, o[1] + U], [o[0], o[1] + U]] }); }
  return out;
}
const BIG = bigTiles(), SMALL = smallTiles();

function sceneRule(t) {
  const g = sceneGroup(t, st("g1"), st("f1"));
  if (!g) return;
  header(g, "Regla Pýþagórasar", t, st("g1"));
  const pr = prog(t, mid("g2", 0.1), 0.6) * (1 - prog(t, st("g3"), 0.5));
  if (pr > 0) mathText(el("g", { opacity: pr }, g), [{ t: "skammhlið", fill: LEGG }, ["2"], " + ", { t: "skammhlið", fill: LEGW }, ["2"], " = ", { t: "langhlið", fill: HYP }, ["2"]], W / 2, 520, 70, { anchor: "middle" });
  if (t < st("g3") - 0.2) return;
  // the ladder triangle: ground side green, wall side brick, ladder orange
  const pin = prog(t, st("g3"), 0.6);
  el("rect", { x: R0[0] - 3, y: RT[1] - 20, width: 6, height: 4 * U + 20, fill: LEGW, opacity: pin }, g);
  el("rect", { x: RF[0] - 20, y: R0[1] - 3, width: 3 * U + 20, height: 6, fill: LEGG, opacity: pin }, g);
  if (pin > 0) ladder(g, RF, RT, pin, true);
  rightBox(g, R0, [-1, 0], [0, -1], 24, pin);
  text(g, "jörð 3 m", RF[0] + 1.5 * U, R0[1] - 30, 34, { fill: LEGG, opacity: pin * (1 - prog(t, st("g4"), 0.3)) });
  text(g, "veggur 4 m", R0[0] + 120, RT[1] + 2 * U, 34, { fill: LEGW, opacity: pin * (1 - prog(t, st("g5"), 0.3)) });
  const fly = prog(t, mid("g6", 0.25), 1.8);
  const p25 = prog(t, mid("g6", 0.1), 0.5);
  if (p25 > 0) BIG.forEach((b) => poly(g, b, "none", { stroke: HYP, sw: 2, opacity: p25 }));
  const f9 = prog(t, mid("g4", 0.5), 1.0), f16 = prog(t, mid("g5", 0.5), 1.2);
  SMALL.forEach((s, k) => {
    const isG = k < 9;
    if (isG ? f9 * 9 <= k : f16 * 16 <= k - 9) return;
    const dl = clamp(fly * 1.6 - (k / 25) * 0.6);
    poly(g, s.p.map((q, i) => mix(q, BIG[k][i], dl)), tintOf[s.c], { stroke: s.c, sw: 2.5 });
  });
  text(g, "9", RF[0] + 1.5 * U, R0[1] + 1.5 * U, 64, { fill: LEGG, opacity: prog(t, mid("g4", 0.7), 0.4) * (1 - fly) });
  text(g, "16", R0[0] + 2 * U, RT[1] + 2 * U, 64, { fill: LEGW, opacity: prog(t, mid("g5", 0.7), 0.4) * (1 - fly) });
  const cB = add(add(RF, HE1, 2.5), HN, 2.5);
  text(g, "25", cB[0], cB[1], 70, { fill: HYP, opacity: prog(t, mid("g6", 0.6), 0.4) });
  const X = 1250;
  if (t > st("g4")) mathText(g, ["3", ["2"], " = 9"], X, 330, 70, { opacity: prog(t, mid("g4", 0.5), 0.5), fill: LEGG });
  if (t > st("g5")) mathText(g, ["4", ["2"], " = 16"], X, 440, 70, { opacity: prog(t, mid("g5", 0.5), 0.5), fill: LEGW });
  if (t > st("g6")) mathText(g, ["9 + 16 = 25"], X, 550, 70, { opacity: prog(t, st("g6"), 0.5) });
  if (t > mid("g6", 0.6)) label(g, "stiginn í öðru veldi", X + 230, 650, 40, { p: prog(t, mid("g6", 0.6), 0.5), fill: tintOf[HYP], stroke: HYP });
}

function sceneRoot(t) {
  const g = sceneGroup(t, st("f1"), st("u1"));
  if (!g) return;
  if (t < st("p6") - 0.3) header(g, "Ferningsrót", t, st("f1"));
  if (t < st("p6") - 0.2) {
    const u = 64, x0 = 330, y0 = 300;
    tiles(g, x0, y0, 5, u, HYP, prog(t, st("f1"), 0.5));
    const ps = prog(t, mid("f2", 0.2), 0.5) * (1 - prog(t, st("f3"), 0.3));
    if (ps > 0) text(g, "25", x0 + 2.5 * u, y0 + 2.5 * u, 80, { fill: HYP, opacity: ps });
    const pside = prog(t, mid("f2", 0.6), 0.4);
    if (pside > 0) { el("rect", { x: x0 - 4, y: y0 + 5 * u + 16, width: 5 * u + 8, height: 10, fill: C.ink, opacity: pside }, g); text(g, t > st("f3") + 0.3 ? "5" : "?", x0 + 2.5 * u, y0 + 5 * u + 70, 60, { opacity: pside }); }
    const pq = prog(t, mid("f2", 0.4), 0.5) * (1 - prog(t, st("f3"), 0.3));
    if (pq > 0) mathText(g, ["? · ? = 25"], 900, 420, 80, { opacity: pq });
    const p3 = prog(t, st("f3"), 0.5);
    if (p3 > 0) mathText(g, ["5 · 5 = 25"], 900, 420, 80, { opacity: p3 });
    const p4 = prog(t, st("f4"), 0.5);
    if (p4 > 0) {
      const e = rootOf(g, 900, 570, 80, 25, { opacity: p4, fill: HYP });
      mathText(g, [" = 5"], e, 570, 80, { opacity: p4, fill: HYP });
      calculator(g, 1460, 300, prog(t, mid("f4", 0.5), 0.5), prog(t, mid("f4", 0.7), 0.3) > 0.5);
    }
    return;
  }
  tryBadge(g, t, st("p6"));
  const q = prog(t, st("p6"), 0.5), solved = prog(t, st("p7"), 0.3) > 0.5;
  const e = rootOf(g, 720, 450, 110, 49, { opacity: q });
  mathText(g, [solved ? " = 7" : " = ?"], e, 450, 110, { opacity: q, fill: solved ? HYP : C.ink });
  turn(g, t, "p6");
  if (t > st("p7")) mathText(g, ["7 · 7 = 49"], W / 2, 660, 70, { anchor: "middle", opacity: prog(t, st("p7"), 0.5) });
}

// small version of the house, ladder and measurements, for when we solve it
function miniHouse(g, x, y, s, o, solved) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  ground(gg, 1, 1, FOOT[0] - 250, WALL_X + 700, 160); house(gg, 1, 1); ladder(gg, FOOT, TOP, 1, true);
  dimV(gg, WALL_X + 30, GROUND_Y, TOP[1], "4 m", "#FFFFFF", 1, true);
  dimH(gg, FOOT[0], WALL_X, GROUND_Y + 50, "3 m", LEGG, 1);
  text(gg, solved ? "5 m" : "?", (FOOT[0] + TOP[0]) / 2 - 100, (FOOT[1] + TOP[1]) / 2 - 40, 90, { fill: HYP });
}

function sceneSteps(t) {
  const g = sceneGroup(t, st("u1"), st("b1"));
  if (!g) return;
  const active = t < st("u2") ? -1 : t < st("u3") ? 0 : t < st("u4") ? 1 : t < st("u5") ? 2 : -1;
  const done = t < st("u5") ? 0 : t < mid("u5", 0.5) ? 2 : 3;
  checklist(g, t, 1340, 180, active, done, prog(t, st("u1"), 0.5));
  miniHouse(g, -60, 140, 0.68, prog(t, st("u1"), 0.5), t > st("u6"));
  const X = 1340, Y = 620;
  if (t > st("u5")) {
    mathText(g, ["9 + 16 = 25"], X, Y, 64, { opacity: prog(t, st("u5"), 0.5) });
    const pr = prog(t, mid("u5", 0.5), 0.5);
    if (pr > 0) { const e = rootOf(g, X, Y + 100, 64, 25, { opacity: pr, fill: HYP }); mathText(g, [" = 5"], e, Y + 100, 64, { opacity: pr, fill: HYP }); }
  }
  if (t > st("u6")) { label(g, "stiginn: 5 m", X + 235, Y + 230, 52, { p: prog(t, st("u6"), 0.5), fill: tintOf[HYP], stroke: HYP }); check(g, 1820, Y + 100, prog(t, st("u6") + 0.3, 0.5), 0.9); }
}

function sceneBook(t) {
  const g = sceneGroup(t, st("b1"), st("p8"));
  if (!g) return;
  label(g, "Skali 3A · bls. 53 · Sýnidæmi 1", W / 2, 120, 44, { p: prog(t, st("b1"), 0.5) });
  // a small triangle drawn on paper, 2 cm by 5 cm (1 cm = 90 px)
  const u = 90, c0 = [260, 640], a = [c0[0], c0[1] - 2 * u], b = [c0[0] + 5 * u, c0[1]];
  const pin = prog(t, st("b2"), 0.6);
  put(g, rect(620, 420, { stroke: "#CFC6B4", strokeWidth: 3, fill: "#FFFFFF", fillStyle: "solid", roughness: 0.8 }, "paper"), 150, 320, 1, pin);
  poly(g, [a, c0, b], "#FFFFFF", { stroke: C.ink, sw: 5, opacity: pin });
  el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: HYP, "stroke-width": 7, opacity: pin }, g);
  rightBox(g, c0, [1, 0], [0, -1], 24, pin);
  text(g, "2 cm", c0[0] - 60, c0[1] - u, 38, { fill: LEGW, opacity: pin });
  text(g, "5 cm", c0[0] + 2.5 * u, c0[1] + 45, 38, { fill: LEGG, opacity: pin });
  text(g, t > st("b6") ? "≈ 5,4 cm" : "?", (a[0] + b[0]) / 2 + 40, (a[1] + b[1]) / 2 - 50, 50, { fill: HYP, opacity: pin });
  const active = t < st("b3") ? -1 : t < st("b4") ? 0 : t < st("b5") ? 1 : t < st("b6") ? 2 : -1;
  const done = t < st("b4") ? 0 : t < st("b5") ? 1 : t < st("b6") ? 2 : 3;
  checklist(g, t, 1380, 200, active, done, prog(t, st("b1"), 0.5));
  const X = 820, Y = 330, gap = 105;
  if (t > st("b3")) { mathText(g, ["2", ["2"], " = 4"], X, Y, 64, { opacity: prog(t, mid("b3", 0.2), 0.5), fill: LEGW }); mathText(g, ["5", ["2"], " = 25"], X, Y + gap, 64, { opacity: prog(t, mid("b3", 0.6), 0.5), fill: LEGG }); }
  if (t > st("b4")) mathText(g, ["4 + 25 = 29"], X, Y + 2 * gap, 64, { opacity: prog(t, st("b4"), 0.5) });
  if (t > st("b5")) {
    const pr = prog(t, st("b5"), 0.5);
    const e = rootOf(g, X, Y + 3 * gap, 64, 29, { opacity: pr, fill: HYP });
    if (t > mid("b5", 0.6)) mathText(g, [" ≈ 5,4"], e, Y + 3 * gap, 64, { opacity: prog(t, mid("b5", 0.6), 0.5), fill: HYP });
    calculator(g, 1460, 590, prog(t, mid("b5", 0.5), 0.5), true);
  }
  if (t > st("b6")) check(g, X + 420, Y + 3 * gap, prog(t, st("b6") + 0.3, 0.5), 0.8);
}

function sceneRampSolve(t) {
  const g = sceneGroup(t, st("p8"), st("h1"));
  if (!g) return;
  tryBadge(g, t, st("p8"), "Nú prófar þú");
  ramp(g, 160, 820, 600, 200, prog(t, st("p8"), 0.6), {});
  dimV(g, 760 + 260, 820, 620, "1 m", LEGW, prog(t, mid("p8", 0.35), 0.4));
  dimH(g, 160, 760, 880, "3 m", LEGG, prog(t, mid("p8", 0.7), 0.4));
  text(g, t > st("p12") ? "≈ 3,2 m" : "?", 400, 650, 56, { fill: HYP, opacity: prog(t, st("p9"), 0.4) });
  const active = t < st("p10") ? -1 : t < st("p11") ? 0 : t < mid("p11", 0.5) ? 1 : t < st("p12") ? 2 : -1;
  const done = t < st("p11") ? (t < st("p10") ? 0 : 0) : t < mid("p11", 0.5) ? 1 : t < st("p12") ? 2 : 3;
  checklist(g, t, 1380, 200, active, done, prog(t, st("p9"), 0.5));
  turn(g, t, "p9", "reiknaðu");
  const X = 1290, Y = 640;
  if (t > st("p10")) { mathText(g, ["1", ["2"], " = 1"], X, Y, 56, { opacity: prog(t, mid("p10", 0.1), 0.5), fill: LEGW }); mathText(g, ["3", ["2"], " = 9"], X + 250, Y, 56, { opacity: prog(t, mid("p10", 0.6), 0.5), fill: LEGG }); }
  if (t > st("p11")) mathText(g, ["1 + 9 = 10"], X, Y + 90, 56, { opacity: prog(t, st("p11"), 0.5) });
  if (t > mid("p11", 0.5)) { const pr = prog(t, mid("p11", 0.5), 0.5); const e = rootOf(g, X, Y + 180, 56, 10, { opacity: pr, fill: HYP }); mathText(g, [" ≈ 3,2"], e, Y + 180, 56, { opacity: pr, fill: HYP }); }
  if (t > st("p12")) check(g, 1800, Y + 180, prog(t, st("p12") + 0.3, 0.5), 0.8);
}

function sceneTV(t) {
  const g = sceneGroup(t, st("h1"), st("p13"));
  if (!g) return;
  header(g, "Nýtt orð: hornalína", t, st("h1"));
  const x = 180, y = 280, w = 800, h = 450;
  tv(g, x, y, w, h, prog(t, st("h1") + 0.3, 0.6));
  const pd = prog(t, mid("h2", 0.3), 0.8);
  if (pd > 0) {
    el("circle", { cx: x, cy: y + h, r: 16, fill: HYP, opacity: pd }, g);
    el("circle", { cx: x + w, cy: y, r: 16, fill: HYP, opacity: prog(t, mid("h2", 0.7), 0.3) }, g);
    seg(g, [x, y + h], [x + w, y], HYP, pd, 8, "tvdiag");
    if (t < st("h7")) label(g, "hornalína", x + w / 2 + 60, y + h / 2 - 70, 46, { p: prog(t, mid("h2", 0.6), 0.4), fill: tintOf[HYP], stroke: HYP });
  }
  const ptri = prog(t, st("h3"), 0.6);
  if (ptri > 0) {
    poly(g, [[x, y + h], [x + w, y + h], [x + w, y]], "#3B4A66", { opacity: 0.8 * ptri * (1 - prog(t, st("h4"), 0.5)) });
    rightBox(g, [x + w, y + h], [-1, 0], [0, -1], 34, ptri, "#FFFFFF");
    rightBox(g, [x, y], [1, 0], [0, 1], 34, ptri, "#FFFFFF");
  }
  const pm = prog(t, mid("h4", 0.45), 0.5);
  if (pm > 0) { dimH(g, x, x + w, y + h + 110, "80 cm", LEGG, pm); dimV(g, x + w + 50, y + h, y, "", LEGW, pm); text(g, "60 cm", x + w + 80, y + h / 2, 46, { fill: LEGW, anchor: "start", opacity: pm }); }
  const active = t < st("h5") ? -1 : t < st("h6") ? 0 : t < mid("h6", 0.5) ? 1 : t < st("h7") ? 2 : -1;
  const done = t < st("h6") ? 0 : t < mid("h6", 0.5) ? 1 : t < st("h7") ? 2 : 3;
  checklist(g, t, 1380, 200, active, done, prog(t, st("h5"), 0.5));
  const X = 1250, Y = 640;
  if (t > st("h5")) { mathText(g, ["80", ["2"], " = 6 400"], X, Y, 54, { opacity: prog(t, mid("h5", 0.1), 0.5), fill: LEGG }); mathText(g, ["60", ["2"], " = 3 600"], X, Y + 80, 54, { opacity: prog(t, mid("h5", 0.6), 0.5), fill: LEGW }); }
  if (t > st("h6")) mathText(g, ["6 400 + 3 600 = 10 000"], X, Y + 160, 54, { opacity: prog(t, st("h6"), 0.5) });
  if (t > mid("h6", 0.5)) { const pr = prog(t, mid("h6", 0.5), 0.5); const e = rootOf(g, X, Y + 240, 54, "10 000", { opacity: pr, fill: HYP }); mathText(g, [" = 100"], e, Y + 240, 54, { opacity: pr, fill: HYP }); }
  if (t > st("h7")) label(g, "100 cm", x + w / 2 + 60, y + h / 2 - 70, 46, { p: prog(t, st("h7"), 0.4), fill: tintOf[HYP], stroke: HYP });
}

function sceneGarage(t) {
  const g = sceneGroup(t, st("p13"), st("q1"));
  if (!g) return;
  tryBadge(g, t, st("p13"), "Nú prófar þú");
  label(g, "Skali 3A · verkefni 2.7", W / 2, 230, 36, { p: prog(t, st("p13"), 0.5), fill: "#FFFFFF" });
  // garage floor from above, 6 m by 4 m (1 m = 110 px), with a car parked
  const u = 110, x0 = 170, y0 = 340, w = 6 * u, h = 4 * u;
  const pin = prog(t, st("p13") + 0.4, 0.6);
  el("rect", { x: x0, y: y0, width: w, height: h, fill: "#D8D4CC", stroke: C.ink, "stroke-width": 8, opacity: pin }, g);
  el("rect", { x: x0 + 150, y: y0 + 95, width: 360, height: 170, rx: 50, fill: "#4A7FC1", stroke: C.ink, "stroke-width": 4, opacity: pin }, g);
  el("rect", { x: x0 + 230, y: y0 + 115, width: 120, height: 130, rx: 18, fill: "#9CC3E6", opacity: pin }, g);
  dimH(g, x0, x0 + w, y0 + h + 50, "6 m", LEGG, prog(t, mid("p13", 0.85), 0.4));
  dimV(g, x0 - 40, y0 + h, y0, "4 m", LEGW, prog(t, mid("p13", 0.7), 0.4));
  const pd = prog(t, st("p14"), 0.7);
  if (pd > 0) { seg(g, [x0, y0 + h], [x0 + w, y0], HYP, pd, 8, "garDiag"); text(g, t > st("p17") ? "≈ 7,2 m" : "?", x0 + w - 120, y0 + 70, 60, { fill: HYP, opacity: pd }); }
  const active = t < st("p15") ? -1 : t < st("p16") ? 0 : t < mid("p16", 0.45) ? 1 : t < st("p17") ? 2 : -1;
  const done = t < st("p16") ? 0 : t < mid("p16", 0.45) ? 1 : t < st("p17") ? 2 : 3;
  checklist(g, t, 1380, 200, active, done, prog(t, st("p14"), 0.5));
  turn(g, t, "p14", "reiknaðu");
  const X = 1000, Y = 640;
  if (t > st("p15")) { mathText(g, ["4", ["2"], " = 16"], X, Y, 56, { opacity: prog(t, mid("p15", 0.1), 0.5), fill: LEGW }); mathText(g, ["6", ["2"], " = 36"], X + 280, Y, 56, { opacity: prog(t, mid("p15", 0.6), 0.5), fill: LEGG }); }
  if (t > st("p16")) mathText(g, ["16 + 36 = 52"], X, Y + 90, 56, { opacity: prog(t, st("p16"), 0.5) });
  if (t > mid("p16", 0.45)) { const pr = prog(t, mid("p16", 0.45), 0.5); const e = rootOf(g, X, Y + 180, 56, 52, { opacity: pr, fill: HYP }); mathText(g, [" ≈ 7,2"], e, Y + 180, 56, { opacity: pr, fill: HYP }); }
  if (t > st("p17")) check(g, X + 470, Y + 180, prog(t, st("p17") + 0.3, 0.5), 0.8);
}

function sceneRecap(t) {
  const g = sceneGroup(t, st("q1"), st("w1"));
  if (!g) return;
  header(g, "Rifjum upp", t, st("q1"));
  const slots = [{ x: 140, q: "q2", a: "q3" }, { x: 720, q: "q4", a: "q5" }, { x: 1300, q: "q6", a: "q7" }];
  slots.forEach((s, i) => {
    const sw = 480, sh = 520, sy = 240;
    const inP = prog(t, st("q1") + 0.4 + i * 0.35, 0.5);
    const asked = t >= st(s.q), ans = prog(t, st(s.a), 0.5);
    put(g, drawOn(rect(sw, sh, { stroke: asked ? C.hl : C.ink, strokeWidth: asked && !ans ? 8 : 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "rslot" + i + (asked ? "a" : "")), inP), s.x, sy);
    el("circle", { cx: s.x + 50, cy: sy + 50, r: 34, fill: asked ? C.hl : C.ink, opacity: inP }, g);
    text(g, String(i + 1), s.x + 50, sy + 52, 44, { fill: "#FFF", opacity: inP });
    const cx = s.x + sw / 2;
    if (asked && ans < 1) text(g, "?", cx, sy + sh / 2, 200, { fill: C.hl, opacity: 1 - ans });
    if (ans <= 0) return;
    const ga = el("g", { opacity: ans }, g);
    // clip the little house pictures to their card
    const clipId = "clip" + i;
    const cp = el("clipPath", { id: clipId }, ga); el("rect", { x: s.x + 8, y: sy + 8, width: sw - 16, height: 360 }, cp);
    if (i === 1) {
      ["Í annað veldi", "Leggja saman", "Ferningsrót"].forEach((w, k) => { el("circle", { cx: s.x + 60, cy: sy + 170 + k * 100, r: 26, fill: C.ink }, ga); text(ga, String(k + 1), s.x + 60, sy + 172 + k * 100, 32, { fill: "#FFF" }); text(ga, w, s.x + 100, sy + 170 + k * 100, 40, { anchor: "start" }); });
    } else {
      const holder = el("g", { "clip-path": `url(#${clipId})` }, ga);
      const gg = el("g", { transform: `translate(${s.x - 150} ${sy - 120}) scale(0.42)` }, holder);
      ground(gg, 1, 0); house(gg, 1, 0); ladder(gg, FOOT, TOP, 1, true);
      text(ga, i === 0 ? "langhlið" : "5 m", cx, sy + 440, i === 0 ? 50 : 64, { fill: HYP });
    }
  });
  ["q2", "q4", "q6"].forEach((q) => turn(g, t, q));
}

function sceneTask(t) {
  const g = sceneGroup(t, st("w1"), TL.duration + 5);
  if (!g) return;
  header(g, "Verkefni heima", t, st("w1"));
  label(g, "Skali 3A · verkefni 2.3", W / 2, 245, 36, { p: prog(t, st("w1") + 0.4, 0.5), fill: "#FFFFFF" });
  const x0 = 260, y0 = 360, w = 700, h = 400;
  put(g, drawOn(rect(w, h, { stroke: C.ink, strokeWidth: 6, fill: "#E9D3AE", fillStyle: "solid", roughness: 1 }, "desk"), prog(t, st("w1"), 0.6)), x0, y0);
  el("rect", { x: x0 + 80, y: y0 + 90, width: 220, height: 150, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 3, opacity: prog(t, st("w1"), 0.6) }, g);
  dimH(g, x0, x0 + w, y0 + h + 50, "lengd", LEGG, prog(t, mid("w1", 0.7), 0.4));
  dimV(g, x0 - 40, y0 + h, y0, "breidd", LEGW, prog(t, mid("w1", 0.6), 0.4));
  const pd = prog(t, st("w2"), 0.7);
  if (pd > 0) { seg(g, [x0, y0 + h], [x0 + w, y0], HYP, pd, 8, "deskDiag"); label(g, "hornalína", x0 + w / 2 + 70, y0 + h / 2 - 60, 44, { p: prog(t, mid("w2", 0.2), 0.4), fill: tintOf[HYP], stroke: HYP }); }
  checklist(g, t, 1260, 330, -1, 0, prog(t, mid("w2", 0.3), 0.5));
}

export function render(t) {
  root.replaceChildren();
  sceneTitle(t);
  sceneHouse(t);
  sceneRampTry(t);
  sceneSquare(t);
  sceneRule(t);
  sceneRoot(t);
  sceneSteps(t);
  sceneBook(t);
  sceneRampSolve(t);
  sceneTV(t);
  sceneGarage(t);
  sceneRecap(t);
  sceneTask(t);
  text(root, TL.series_tag, 48, 52, 30, { anchor: "start", fill: C.soft, weight: 400 });
}
