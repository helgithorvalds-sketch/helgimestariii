// Shared look for every episode: the same "your turn" routine, the same try badge, the same step list,
// the same arrows and labels. Consistency across episodes is part of the formula (predictable for autistic
// viewers, and nothing new to decode for dyslexic viewers).
import { W, C, clamp, prog, lerp, el, put, line, drawOn, rect, text, label } from "/lib.js";

export const HL = "#E0791A";               // the one highlight colour
export const GOOD = "#23935F";
export const pts = (a) => a.map((p) => p.join(",")).join(" ");
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
export const mix = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

export function poly(g, p, fill, o = {}) {
  return el("polygon", { points: pts(p), fill, stroke: o.stroke ?? "none", "stroke-width": o.sw ?? 0, opacity: o.opacity ?? 1, "stroke-linejoin": "round" }, g);
}
export function seg(g, a, b, color, p = 1, w = 7, key = "s") {
  put(g, drawOn(line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), { stroke: color, strokeWidth: w, roughness: 1.1 }, key), p));
}
export function mathText(g, parts, x, y, size, o = {}) {
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

// the same "your turn" routine every time: mouth icon, a short word, a bar that fills over the pause
export function turn(g, t, S, id, words = "upphátt") {
  const a = S[id].think_start, b = S[id].think_end;
  const p = prog(t, a - 0.2, 0.3) * (1 - prog(t, b - 0.1, 0.3));
  if (p <= 0) return;
  const gg = el("g", { opacity: p, transform: `translate(${W / 2} 1000)` }, g);
  put(gg, rect(560, 110, { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "turnbox"), -280, -55);
  el("ellipse", { cx: -215, cy: -8, rx: 26, ry: 14, fill: C.ink }, gg);
  text(gg, words, 20, -12, 44);
  el("rect", { x: -170, y: 26, width: 410, height: 12, rx: 6, fill: "#E9E2D3" }, gg);
  el("rect", { x: -170, y: 26, width: 410 * clamp((t - a) / (b - a)), height: 12, rx: 6, fill: HL }, gg);
}
export function tryBadge(g, t, a, str = "Prófaðu") {
  label(g, str, W / 2, 130, 60, { p: prog(t, a, 0.5), fill: C.hlTint, stroke: C.hl });
}

// a numbered list that stays on screen; active = item being worked on, done = items finished
export function steps(g, x, y, title, items, active, done, o = 1, w = 520) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  const h = 95 + items.length * 78;
  put(gg, rect(w, h, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "steps" + title + w + items.length), x, y);
  text(gg, title, x + w / 2, y + 45, 40);
  items.forEach((s, i) => {
    const yy = y + 115 + i * 78, on = active === i, ok = done > i;
    el("circle", { cx: x + 50, cy: yy, r: 26, fill: on ? HL : ok ? GOOD : C.ink }, gg);
    text(gg, ok ? "✓" : String(i + 1), x + 50, yy + 2, 32, { fill: "#FFF" });
    text(gg, s, x + 95, yy, 36, { anchor: "start", fill: on ? HL : C.ink, weight: on ? 700 : 400 });
  });
}

// a timeline along the bottom of the screen; events = [{year, word, at}], at = time it appears
export function timeline(g, t, events, o = 1, y = 900, x0 = 200, x1 = 1720, hi = -1, even = false) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  const years = events.map((e) => e.year), y0 = Math.min(...years), y1 = Math.max(...years);
  const xOf = (yr) => (even ? x0 + (years.indexOf(yr) / Math.max(1, years.length - 1)) * (x1 - x0) : y1 === y0 ? (x0 + x1) / 2 : x0 + ((yr - y0) / (y1 - y0)) * (x1 - x0));
  el("line", { x1: x0 - 40, y1: y, x2: x1 + 40, y2: y, stroke: C.ink, "stroke-width": 6, "stroke-linecap": "round" }, gg);
  events.forEach((e, i) => {
    const p = prog(t, e.at, 0.5);
    if (p <= 0) return;
    const x = xOf(e.year), on = i === hi;
    el("circle", { cx: x, cy: y, r: on ? 22 : 16, fill: on ? HL : C.ink, opacity: p }, gg);
    text(gg, String(e.year), x, y + 55, on ? 46 : 40, { opacity: p, fill: on ? HL : C.ink });
    if (e.word) text(gg, e.word, x, y - 50, 38, { opacity: p, fill: on ? HL : C.ink, weight: on ? 700 : 400 });
  });
}

// cause → effect chain of short boxes, left to right; items = [{word, at}]
export function chain(g, t, items, x0, y, w = 300, gap = 90, o = 1) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  items.forEach((it, i) => {
    const p = prog(t, it.at, 0.5);
    if (p <= 0) return;
    const x = x0 + i * (w + gap);
    put(gg, rect(w, 110, { stroke: it.color ?? C.ink, strokeWidth: 5, fill: it.fill ?? "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "chain" + it.word + w), x, y - 55, 1, p);
    text(gg, it.word, x + w / 2, y, 38, { opacity: p, fill: it.color ?? C.ink });
    if (i > 0) {
      const ax = x - gap + 12, bx = x - 12;
      el("line", { x1: ax, y1: y, x2: bx, y2: y, stroke: C.soft, "stroke-width": 6, opacity: p }, gg);
      el("polyline", { points: pts([[bx - 18, y - 14], [bx, y], [bx - 18, y + 14]]), fill: "none", stroke: C.soft, "stroke-width": 6, opacity: p }, gg);
    }
  });
}
