// Every shot of the episode, drawn as a function of time t (seconds).
// Formula rules used here: one focal point per shot, the named thing lights up and the rest dims,
// diagrams build up one part per sentence, labels are 1–3 words next to the thing they name,
// no text in full sentences, no music or decoration under the explanation.
import rough from "/node_modules/roughjs/bundled/rough.esm.js";
export { W, H, C, FRIENDS, clamp, ease, prog, st, en, mid, lerp, el, put, drawOn, rect, line, circle, poly, path, text, frac, label, arrow, check, piece, bar, friend, pizza, card, think, header, sceneGroup, S, TL, root };

const NS = "http://www.w3.org/2000/svg";
const W = 1920, H = 1080;
const C = {
  ink: "#22304A", soft: "#6B7385", paper: "#FBF6EC",
  choc: "#7A4A2B", chocEdge: "#4A2B17", hl: "#F08A24", hlTint: "#FDE3C8",
  green: "#23935F", greenTint: "#DDF2E6", blue: "#2F6FC0", blueTint: "#DDE8F7",
  cheese: "#F4C65F", crust: "#C98A2E", pep: "#C4412E", paperSheet: "#FFFFFF",
};
const FRIENDS = ["#E07A5F", "#3D9970", "#4A7FC1", "#E8A93B", "#9B6BC2", "#2BA3A0", "#E46D93", "#7C8C9C", "#D9653B", "#5C9E4A"];

let svg, root, rc, TL, S = {};
const cache = new Map();

export function init(timeline) {
  TL = timeline;
  TL.sentences.forEach((e) => (S[e.id] = e));
  svg = document.getElementById("stage");
  root = document.getElementById("root");
  rc = rough.svg(svg);
}

// ---------- time helpers ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const prog = (t, a, d = 0.6) => ease((t - a) / d);
const st = (id) => S[id].start;
const en = (id) => S[id].end;
const mid = (id, f) => S[id].start + (S[id].end - S[id].start) * f;
const thinkEnd = (id) => S[id].think_end ?? S[id].end;
const lerp = (a, b, p) => a + (b - a) * p;

// ---------- drawing helpers ----------
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key).cloneNode(true);
}
function seedOf(s) { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h || 1; }
function put(parent, node, x = 0, y = 0, s = 1, o = 1, rot = 0) {
  const g = el("g", { transform: `translate(${x} ${y}) rotate(${rot}) scale(${s})`, opacity: o }, parent);
  g.appendChild(node);
  return g;
}
function drawOn(node, p) {
  if (p >= 1) return node;
  node.querySelectorAll("path").forEach((pth) => {
    pth.setAttribute("pathLength", "1");
    pth.setAttribute("stroke-dasharray", "1 1");
    pth.setAttribute("stroke-dashoffset", String(1 - p));
    if (pth.getAttribute("fill") && pth.getAttribute("fill") !== "none") pth.setAttribute("fill-opacity", String(clamp(p * 1.4 - 0.4)));
  });
  return node;
}
const rect = (w, h, o, key) => cached(`r${w}|${h}|${key}|${JSON.stringify(o)}`, () => rc.rectangle(0, 0, w, h, { seed: seedOf(key + w + h), ...o }));
const line = (x1, y1, x2, y2, o, key) => cached(`l${x1}|${y1}|${x2}|${y2}|${key}|${JSON.stringify(o)}`, () => rc.line(x1, y1, x2, y2, { seed: seedOf(key + x1 + y2), ...o }));
const circle = (d, o, key) => cached(`c${d}|${key}|${JSON.stringify(o)}`, () => rc.circle(0, 0, d, { seed: seedOf(key + d), ...o }));
const poly = (pts, o, key) => cached(`p${key}|${pts.length}|${JSON.stringify(o)}|${pts[1]}`, () => rc.polygon(pts, { seed: seedOf(key), ...o }));
const path = (d, o, key) => cached(`d${d}|${key}|${JSON.stringify(o)}`, () => rc.path(d, { seed: seedOf(key + d.length), ...o }));

function text(parent, str, x, y, size, o = {}) {
  const t = el("text", {
    x, y, "font-size": size, "font-family": "Atkinson Hyperlegible", "font-weight": o.weight ?? 700,
    fill: o.fill ?? C.ink, "text-anchor": o.anchor ?? "middle", "dominant-baseline": "middle", opacity: o.opacity ?? 1,
  }, parent);
  t.textContent = str;
  return t;
}

// stacked fraction: numerator / line / denominator
function frac(parent, x, y, num, den, size, o = {}) {
  const g = el("g", { opacity: o.opacity ?? 1 }, parent);
  const p = o.p ?? 1;
  const half = size * (String(den).length > 2 ? 0.75 : 0.5);
  if (o.hlNum) put(g, circle(size * 1.05, { stroke: C.hl, strokeWidth: 7, roughness: 1.6 }, "hn" + size), x, y - size * 0.48, 1, o.hlNum);
  if (o.hlDen) put(g, circle(size * 1.05 * (String(den).length > 2 ? 1.5 : 1), { stroke: C.hl, strokeWidth: 7, roughness: 1.6 }, "hd" + size + den), x, y + size * 0.55, 1, o.hlDen);
  text(g, num, x, y - size * 0.48, size, { fill: o.color ?? C.ink, opacity: clamp(p * 2 - 0.3) });
  put(g, drawOn(line(-half, 0, half, 0, { stroke: o.color ?? C.ink, strokeWidth: size / 13, roughness: 0.8 }, "fl" + size + den), p), x, y);
  text(g, den, x, y + size * 0.55, size, { fill: o.color ?? C.ink, opacity: clamp(p * 2 - 0.8) });
  return g;
}

function label(parent, str, x, y, size = 52, o = {}) {
  const w = str.length * size * 0.56 + size * 1.0, h = size * 1.55;
  const g = el("g", { opacity: o.opacity ?? 1 }, parent);
  put(g, drawOn(rect(w, h, { stroke: o.stroke ?? C.ink, strokeWidth: 4, fill: o.fill ?? "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "lb" + str), o.p ?? 1), x - w / 2, y - h / 2);
  text(g, str, x, y + 2, size, { fill: o.color ?? C.ink, opacity: clamp((o.p ?? 1) * 2 - 0.6) });
  return g;
}

function arrow(parent, x1, y1, x2, y2, p = 1, color = C.ink, key = "a") {
  const g = el("g", {}, parent);
  put(g, drawOn(line(x1, y1, x2, y2, { stroke: color, strokeWidth: 6, roughness: 1.3 }, key), p));
  const a = Math.atan2(y2 - y1, x2 - x1), L = 26;
  if (p > 0.85) {
    put(g, line(x2, y2, x2 - L * Math.cos(a - 0.5), y2 - L * Math.sin(a - 0.5), { stroke: color, strokeWidth: 6, roughness: 1 }, key + "h1"));
    put(g, line(x2, y2, x2 - L * Math.cos(a + 0.5), y2 - L * Math.sin(a + 0.5), { stroke: color, strokeWidth: 6, roughness: 1 }, key + "h2"));
  }
  return g;
}

function check(parent, x, y, p, s = 1) {
  put(parent, drawOn(path("M -45 0 L -12 34 L 55 -48", { stroke: C.green, strokeWidth: 14, roughness: 1.2 }, "chk"), p), x, y, s);
}

// a piece of chocolate (or a whole bar when it is one piece)
function piece(parent, x, y, w, h, o = {}) {
  const key = `pc${Math.round(w)}x${Math.round(h)}${o.k ?? ""}`;
  const node = rect(Math.round(w), Math.round(h), { stroke: C.chocEdge, strokeWidth: 3, fill: C.choc, fillStyle: "solid", roughness: 1.1 }, key);
  const g = put(parent, drawOn(node, o.p ?? 1), x, y, 1, o.opacity ?? 1);
  if (w > 40 && h > 40 && (o.p ?? 1) >= 1) el("path", { d: `M ${w * 0.12} ${h * 0.2} L ${w * 0.12} ${h * 0.75}`, stroke: "#A06A44", "stroke-width": Math.min(8, w / 12), "stroke-linecap": "round", opacity: 0.7 }, g);
  if (o.hl) put(parent, rect(Math.round(w + 16), Math.round(h + 16), { stroke: C.hl, strokeWidth: 8, roughness: 1.4 }, key + "hl"), x - 8, y - 8, 1, o.hl);
  return g;
}

// a bar of width w split into n equal pieces; cut (0..1) draws the cut lines one after another
function bar(parent, x, y, w, h, n, o = {}) {
  const g = el("g", { opacity: o.opacity ?? 1 }, parent);
  const cut = o.cut ?? 1, pw = w / n;
  if (cut < 1 || n === 1) {
    piece(g, x, y, w, h, { p: o.p ?? 1, k: "bar" + w });
    for (let i = 1; i < n; i++) {
      const lp = clamp(cut * (n - 1) - (i - 1));
      if (lp > 0) put(g, drawOn(line(0, -14, 0, h + 14, { stroke: C.paper, strokeWidth: n > 20 ? 2 : 6, roughness: 0.9 }, "cut" + i + n), lp), x + pw * i, y);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const hl = o.hl?.includes(i);
      const off = o.offsets?.[i] ?? [0, 0];
      const op = o.dimOthers && !hl ? 0.28 : 1;
      if (n > 20) {
        el("rect", { x: x + pw * i + off[0], y: y + off[1] - (hl ? 10 : 0), width: hl ? Math.max(7, pw) : Math.max(1, pw - 1.5), height: h + (hl ? 20 : 0), fill: hl ? C.hl : C.choc, opacity: op }, g);
      } else {
        piece(g, x + pw * i + off[0], y + off[1], pw, h, { k: "bp" + n + "_" + Math.round(w), hl: hl ? 1 : 0, opacity: op });
      }
    }
  }
  return g;
}

function friend(parent, x, y, s, color, o = {}) {
  const g = el("g", { transform: `translate(${x} ${y}) scale(${s})`, opacity: o.opacity ?? 1 }, parent);
  const k = "fr" + color;
  put(g, path("M -70 150 Q -70 40 0 40 Q 70 40 70 150 Z", { stroke: C.ink, strokeWidth: 4, fill: color, fillStyle: "solid", roughness: 1.2 }, k + "b"));
  put(g, circle(110, { stroke: C.ink, strokeWidth: 4, fill: "#F6D7B8", fillStyle: "solid", roughness: 1.1 }, k + "h"), 0, -20);
  el("circle", { cx: -18, cy: -26, r: 7, fill: C.ink }, g);
  el("circle", { cx: 18, cy: -26, r: 7, fill: C.ink }, g);
  const smile = o.smile ?? 1;
  el("path", { d: `M -22 2 Q 0 ${2 + 18 * smile} 22 2`, stroke: C.ink, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, g);
  return g;
}

function pizza(parent, cx, cy, r, n, o = {}) {
  const g = el("g", { opacity: o.opacity ?? 1 }, parent);
  if (n === 1) {
    put(g, drawOn(circle(r * 2, { stroke: C.crust, strokeWidth: 10, fill: C.cheese, fillStyle: "solid", roughness: 1.3 }, "pz" + r), o.p ?? 1), cx, cy);
  } else {
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n, am = (a0 + a1) / 2;
      const hl = o.hl?.includes(i), push = hl ? (o.push ?? 0) : 0;
      const ox = Math.cos(am) * push, oy = Math.sin(am) * push;
      const pts = [[0, 0]];
      for (let k = 0; k <= 12; k++) { const a = a0 + ((a1 - a0) * k) / 12; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      const node = poly(pts, { stroke: hl ? C.hl : C.crust, strokeWidth: hl ? 9 : 6, fill: C.cheese, fillStyle: "solid", roughness: 1.1 }, `pw${n}_${i}_${r}_${hl ? 1 : 0}`);
      put(g, node, cx + ox, cy + oy, 1, o.dimOthers && !hl ? 0.3 : 1);
    }
  }
  const dots = [[0.35, -0.3], [-0.4, 0.2], [0.1, 0.5], [-0.15, -0.55], [0.55, 0.3]];
  if (n === 1) dots.forEach(([a, b], i) => el("circle", { cx: cx + a * r, cy: cy + b * r, r: r * 0.09, fill: C.pep, opacity: 0.85 * (o.p ?? 1) }, g));
  return g;
}

function card(parent, x, y, w, h, color, tint, o = {}) {
  const g = el("g", { opacity: o.opacity ?? 1 }, parent);
  if (o.glow) put(g, rect(w + 36, h + 36, { stroke: color, strokeWidth: 3, fill: tint, fillStyle: "solid", roughness: 2 }, "glow" + color + w), x - 18, y - 18, 1, o.glow * 0.9);
  put(g, drawOn(rect(w, h, { stroke: color, strokeWidth: 8, fill: tint, fillStyle: "solid", roughness: 1.3 }, "card" + color + w + h), o.p ?? 1), x, y);
  return g;
}

// "your turn" indicator: a speech bubble with a talking mouth and the word "upphátt"
function think(parent, t, a, b, x = W / 2, y = 995) {
  const p = prog(t, a, 0.35) * (1 - prog(t, b - 0.25, 0.3));
  if (p <= 0) return;
  const g = el("g", { opacity: p, transform: `translate(${x} ${y}) scale(${0.9 + 0.1 * p})` }, parent);
  put(g, rect(380, 120, { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.4 }, "bub"), -190, -60);
  put(g, path("M -60 58 L -90 105 L -20 58", { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "bubt"));
  const open = 0.5 + 0.5 * Math.abs(Math.sin((t - a) * 5));
  el("ellipse", { cx: -120, cy: 0, rx: 30, ry: 8 + 16 * open, fill: C.ink }, g);
  text(g, "upphátt", 45, 2, 50, { fill: C.ink });
}

function header(parent, str, t, a, color = C.ink) {
  const p = prog(t, a, 0.5);
  text(parent, str, W / 2, 120, 76, { fill: color, opacity: p });
  put(parent, drawOn(line(-str.length * 22, 0, str.length * 22, 0, { stroke: C.hl, strokeWidth: 8, roughness: 1.5 }, "hdr" + str), prog(t, a + 0.2, 0.6)), W / 2, 170);
}

// fade the whole scene in and out around its window
function sceneGroup(t, a, b) {
  const o = prog(t, a - 0.35, 0.35) * (1 - prog(t, b - 0.45, 0.4));
  if (o <= 0) return null;
  return el("g", { opacity: o }, root);
}

