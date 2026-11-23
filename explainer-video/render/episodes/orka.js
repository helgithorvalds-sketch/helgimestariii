// Orkan breytir bara um form. Náttúrufræði 10. bekkur (Eðlisfræði 3, bls. 42–52).
// Formula: real things first (kettle, bag, swing, toaster, ball, dam, shower, radiator), each energy form taught
// with a fixed colour before it is used, energy drawn as blocks that change colour but never disappear.
import { W, H, C, clamp, prog, st, mid, lerp, el, put, drawOn, rect, line, circle, text, label, arrow, check, header, sceneGroup, S, TL, root } from "/lib.js";
import { HL, pts, poly, seg, turn, tryBadge, chain } from "/kit.js";
export { init } from "/lib.js";

// one fixed colour per energy form, used everywhere in the episode
const F = {
  sto: { c: "#2F6FC0", t: "#DCE7F7", name: "stöðuorka" },
  hre: { c: "#23935F", t: "#DDF2E6", name: "hreyfiorka" },
  raf: { c: "#D9A400", t: "#FBF0C8", name: "raforka" },
  var: { c: "#D2473A", t: "#F8DCD8", name: "varmaorka" },
};
const ORDER = ["sto", "hre", "raf", "var"];
const WATER = "#5DA9E9", ROCK = "#6E5B4E", GRASS = "#5E9E4A";

// the forms taught so far, as a legend top-right (like the step list in the maths episode)
function legend(g, t, o = 1, hi = null, x = 1500, y = 90) {
  if (o <= 0) return;
  const taught = [st("s1"), st("s4"), st("r1"), st("r2")];
  const gg = el("g", { opacity: o }, g);
  put(gg, rect(380, 330, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "legend"), x, y);
  text(gg, "Orkuform", x + 190, y + 42, 38);
  ORDER.forEach((k, i) => {
    const p = prog(t, taught[i], 0.5);
    if (p <= 0) return;
    const yy = y + 105 + i * 62, on = hi === k;
    el("rect", { x: x + 30, y: yy - 20, width: 40, height: 40, rx: 6, fill: F[k].c, opacity: p }, gg);
    text(gg, F[k].name, x + 90, yy, 34, { anchor: "start", opacity: p, weight: on ? 700 : 400, fill: on ? F[k].c : C.ink });
  });
}

// energy blocks: n blocks, each with a form key; positions given by a function of index
function blocks(g, list, s = 46, o = 1) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  for (const b of list) el("rect", { x: b.x - s / 2, y: b.y - s / 2, width: s, height: s, rx: 8, fill: F[b.k].c, stroke: "#FFFFFF", "stroke-width": 3, opacity: b.o ?? 1 }, gg);
}
// staggered change from one form to another: block i switches when p passes i/n
const formAt = (from, to, p, i, n = 8) => (p * (n + 1) > i + 1 ? to : from);

// ---------- real objects ----------
function kettle(g, x, y, s = 1, o = 1, steam = 0, glow = 0) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("path", { d: "M -90 0 L -110 -170 Q -100 -200 0 -205 Q 100 -200 110 -170 L 90 0 Z", fill: "#DADDE3", stroke: C.ink, "stroke-width": 5 }, gg);
  el("path", { d: "M 105 -150 Q 170 -140 160 -60 Q 150 -20 100 -30", fill: "none", stroke: C.ink, "stroke-width": 14 }, gg);
  el("path", { d: "M -105 -150 L -160 -185 L -150 -150 Z", fill: "#DADDE3", stroke: C.ink, "stroke-width": 5 }, gg);
  el("rect", { x: -110, y: 0, width: 220, height: 26, rx: 8, fill: "#4A5466" }, gg);
  if (glow > 0) el("rect", { x: -80, y: -40, width: 160, height: 30, rx: 10, fill: F.var.c, opacity: 0.7 * glow }, gg);
  if (steam > 0) for (let i = 0; i < 3; i++) {
    const ph = (steam * 2 + i / 3) % 1;
    el("path", { d: `M ${-150 + i * 14} ${-200 - ph * 120} q 20 -25 0 -50 q -20 -25 0 -50`, fill: "none", stroke: "#B9C2CF", "stroke-width": 10, "stroke-linecap": "round", opacity: (1 - ph) * 0.9 }, gg);
  }
}
function outlet(g, x, y, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: x - 55, y: y - 55, width: 110, height: 110, rx: 14, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 4 }, gg);
  el("circle", { cx: x - 18, cy: y, r: 9, fill: C.ink }, gg); el("circle", { cx: x + 18, cy: y, r: 9, fill: C.ink }, gg);
}
function cord(g, pts2, flow = 0, o = 1, color = C.ink) {
  const gg = el("g", { opacity: o }, g);
  el("polyline", { points: pts(pts2), fill: "none", stroke: color, "stroke-width": 10, "stroke-linejoin": "round", "stroke-linecap": "round" }, gg);
  if (flow > 0) el("polyline", { points: pts(pts2), fill: "none", stroke: F.raf.c, "stroke-width": 10, "stroke-dasharray": "14 26", "stroke-dashoffset": String(-flow * 400), "stroke-linecap": "round" }, gg);
}
function bag(g, x, y, s = 1, o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("rect", { x: -70, y: -100, width: 140, height: 100, rx: 18, fill: "#3E6E9E", stroke: C.ink, "stroke-width": 5 }, gg);
  el("path", { d: "M -35 -100 Q -35 -150 0 -150 Q 35 -150 35 -100", fill: "none", stroke: C.ink, "stroke-width": 9 }, gg);
  el("rect", { x: -45, y: -70, width: 90, height: 40, rx: 8, fill: "#5B89B8" }, gg);
}
function table(g, x, y, w = 420, h = 300, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: w, height: 22, fill: "#A8763E", stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: x + 25, y: y + 22, width: 18, height: h - 22, fill: "#8A5E2E" }, gg);
  el("rect", { x: x + w - 43, y: y + 22, width: 18, height: h - 22, fill: "#8A5E2E" }, gg);
}
function floorLine(g, y, o = 1) { el("rect", { x: 0, y, width: W, height: H - y, fill: "#EFE6D6", opacity: o }, g); el("line", { x1: 0, y1: y, x2: W, y2: y, stroke: C.ink, "stroke-width": 5, opacity: o }, g); }

function toaster(g, x, y, o = 1, heat = 0) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: x - 150, y: y - 170, width: 300, height: 170, rx: 40, fill: "#C9CED6", stroke: C.ink, "stroke-width": 5 }, gg);
  for (const dx of [-55, 55]) {
    el("rect", { x: x + dx - 40, y: y - 230 + 20 * heat, width: 80, height: 90, rx: 14, fill: heat > 0.6 ? "#B5782F" : "#EAD7A8", stroke: C.ink, "stroke-width": 4 }, gg);
    el("rect", { x: x + dx - 45, y: y - 172, width: 90, height: 12, fill: heat > 0 ? F.var.c : "#4A5466", opacity: 0.6 + 0.4 * heat }, gg);
  }
  el("rect", { x: x + 150, y: y - 100, width: 20, height: 40, rx: 6, fill: "#4A5466" }, gg);
}
function lamp(g, x, y, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("circle", { cx: x, cy: y, r: 70, fill: "#FFF1A8", stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: x - 30, y: y + 60, width: 60, height: 50, rx: 6, fill: "#9AA3B0", stroke: C.ink, "stroke-width": 4 }, gg);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; el("line", { x1: x + Math.cos(a) * 90, y1: y + Math.sin(a) * 90, x2: x + Math.cos(a) * 120, y2: y + Math.sin(a) * 120, stroke: "#E8C15A", "stroke-width": 7, "stroke-linecap": "round" }, gg); }
}
function cup(g, x, y, o = 1, t = 0) {
  const gg = el("g", { opacity: o }, g);
  el("path", { d: `M ${x - 70} ${y - 120} L ${x - 55} ${y} L ${x + 55} ${y} L ${x + 70} ${y - 120} Z`, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 5 }, gg);
  el("rect", { x: x - 66, y: y - 112, width: 132, height: 30, fill: "#8B5A3C" }, gg);
  for (let i = 0; i < 2; i++) { const ph = (t * 0.6 + i / 2) % 1; el("path", { d: `M ${x - 20 + i * 40} ${y - 140 - ph * 80} q 15 -20 0 -40`, fill: "none", stroke: "#B9C2CF", "stroke-width": 8, "stroke-linecap": "round", opacity: 1 - ph }, gg); }
}

// ---------- scenes ----------
function sceneTitle(t) {
  const g = sceneGroup(t, 0.3, st("k1") + 0.1);
  if (!g) return;
  text(g, "Orkan breytir bara um form", W / 2, 470, 96, { opacity: prog(t, 0.4, 0.6) });
  text(g, "Eðlisfræði 3 · bls. 42–52", W / 2, 590, 48, { fill: C.soft, weight: 400, opacity: prog(t, 0.8, 0.6) });
}

function sceneKitchen(t) {
  const g = sceneGroup(t, st("k1"), st("o1"));
  if (!g) return;
  el("rect", { x: 0, y: 700, width: W, height: 40, fill: "#A8763E" }, g);
  el("rect", { x: 0, y: 740, width: W, height: 340, fill: "#E9DDC8" }, g);
  const on = t > mid("k1", 0.3);
  kettle(g, 760, 700, 1.3, 1, on ? (t * 0.4) % 1 : 0, prog(t, mid("k1", 0.3), 0.6));
  outlet(g, 1300, 470);
  cord(g, [[900, 670], [1060, 670], [1060, 470], [1245, 470]], prog(t, st("k2"), 0.5) > 0 ? t : 0);
  if (t > st("k2")) label(g, "innstunga", 1300, 360, 44, { p: prog(t, mid("k2", 0.5), 0.4), fill: "#FFFFFF" });
  const q = prog(t, st("k3"), 0.5);
  if (q > 0) {
    arrow(g, 1360, 470, 1620, 300, q, C.soft, "kq1");
    text(g, "?", 1680, 260, 110, { fill: HL, opacity: q });
    text(g, "?", 560, 260, 110, { fill: HL, opacity: prog(t, mid("k3", 0.6), 0.4) });
  }
  const p4 = prog(t, st("k4"), 0.6);
  if (p4 > 0) {
    // the highlands far away, where the trip ends
    poly(g, [[1380, 200], [1520, 90], [1640, 170], [1760, 70], [1920, 200]], "#C9D6E3", { opacity: p4 });
    poly(g, [[1700, 110], [1760, 70], [1800, 100]], "#FFFFFF", { opacity: p4 });
    label(g, "hálendið", 1660, 250, 40, { p: p4, fill: "#FFFFFF" });
  }
}

function sceneEnergy(t) {
  const g = sceneGroup(t, st("o1"), st("s1"));
  if (!g) return;
  header(g, "Orka", t, st("o1"));
  label(g, "hreyfast · hitna · lýsa", W / 2, 260, 52, { p: prog(t, mid("o2", 0.3), 0.5), fill: "#FFFFFF" });
  const p3 = prog(t, st("o3"), 0.4);
  if (p3 > 0) {
    const bx = lerp(300, 620, clamp((t - st("o3")) / 2.5));
    el("circle", { cx: bx, cy: 560, r: 70, fill: "#E86A4A", stroke: C.ink, "stroke-width": 5, opacity: p3 }, g);
    el("path", { d: `M ${bx - 50} ${560} A 50 50 0 0 1 ${bx + 50} 560`, fill: "none", stroke: "#FFFFFF", "stroke-width": 6, transform: `rotate(${(t * 220) % 360} ${bx} 560)`, opacity: p3 }, g);
    el("line", { x1: 180, y1: 632, x2: 760, y2: 632, stroke: C.ink, "stroke-width": 5, opacity: p3 }, g);
    cup(g, 980, 640, prog(t, mid("o3", 0.35), 0.4), t);
    lamp(g, 1420, 520, prog(t, mid("o3", 0.65), 0.4));
  }
  const p4 = prog(t, st("o4"), 0.5);
  if (p4 > 0) ORDER.forEach((k, i) => {
    const x = 300 + i * 440;
    put(g, rect(360, 110, { stroke: C.ink, strokeWidth: 4, strokeLineDash: [14, 10], roughness: 1 }, "emptycard" + i), x - 180, 790, 1, prog(t, mid("o4", 0.4) + i * 0.2, 0.4));
    text(g, "?", x, 845, 60, { fill: C.soft, opacity: prog(t, mid("o4", 0.4) + i * 0.2, 0.4) });
  });
}

function sceneForms(t) {
  const g = sceneGroup(t, st("s1"), st("l1"));
  if (!g) return;
  const hi = t < st("s4") ? "sto" : t < st("r1") ? "hre" : t < st("r2") ? "raf" : t < st("p5") ? "var" : null;
  legend(g, t, 1, hi);
  // s1–s5: the bag lifted onto the table, then falling
  if (t < st("p1") - 0.3) {
    const go = 1 - prog(t, st("p1") - 0.7, 0.4);
    const gg = el("g", { opacity: go }, g);
    floorLine(gg, 860);
    table(gg, 520, 560, 440, 300);
    const lift = prog(t, mid("s2", 0.2), 1.4);
    const fall = clamp((t - mid("s5", 0.2)) / 0.7);
    const bx = lerp(lerp(300, 740, lift), 1180, fall);
    const by = fall > 0 ? lerp(560, 860, fall * fall) : lerp(860, 560, lift);
    bag(gg, bx, by, 1.1);
    if (t > st("s1")) label(gg, F.sto.name, 740, 230, 56, { p: prog(t, st("s1"), 0.4), fill: F.sto.t, stroke: F.sto.c, color: F.sto.c });
    const p3 = prog(t, mid("s3", 0.45), 0.5) * (1 - prog(t, st("s4"), 0.4));
    if (p3 > 0) { arrow(gg, 1060, 520, 1060, 330, p3, F.sto.c, "higher"); text(gg, "hærra = meiri", 1200, 420, 44, { anchor: "start", fill: F.sto.c, opacity: p3 }); }
    if (t > st("s4")) label(gg, F.hre.name, 1180, 330, 56, { p: prog(t, st("s4"), 0.4), fill: F.hre.t, stroke: F.hre.c, color: F.hre.c });
    if (fall > 0 && fall < 1) for (let i = 0; i < 3; i++) el("line", { x1: bx - 90 - i * 30, y1: by - 140 + i * 40, x2: bx - 150 - i * 30, y2: by - 190 + i * 40, stroke: F.hre.c, "stroke-width": 6, "stroke-linecap": "round" }, gg);
    return;
  }
  // p1–p4: the swing
  if (t < st("r1") - 0.3) {
    const gs = el("g", { opacity: 1 - prog(t, st("r1") - 0.7, 0.4) }, g);
    tryBadge(gs, t, st("p1"));
    const piv = [760, 230], L = 480;
    el("rect", { x: 460, y: 200, width: 600, height: 26, rx: 8, fill: "#8A5E2E" }, gs);
    for (const x of [470, 1050]) el("line", { x1: x, y1: 213, x2: x + (x < 760 ? -120 : 120), y2: 900, stroke: "#8A5E2E", "stroke-width": 20 }, gs);
    floorLine(gs, 900);
    // angle: swing freely until p2, hold at the top during the question, then swing again
    let ang;
    if (t < st("p2")) ang = 0.7 * Math.cos((t - st("p1")) * 2.4);
    else if (t < st("p3") + 0.8) ang = 0.7;
    else if (t < st("p4")) ang = 0.7 * Math.cos((t - st("p3") - 0.8) * 2.4);
    else ang = 0.7 * Math.cos(clamp((t - st("p4")) / 0.65) * Math.PI / 2) ;
    const seat = [piv[0] + Math.sin(ang) * L, piv[1] + Math.cos(ang) * L];
    el("line", { x1: piv[0] - 50, y1: piv[1], x2: seat[0] - 50, y2: seat[1], stroke: C.ink, "stroke-width": 5 }, gs);
    el("line", { x1: piv[0] + 50, y1: piv[1], x2: seat[0] + 50, y2: seat[1], stroke: C.ink, "stroke-width": 5 }, gs);
    el("rect", { x: seat[0] - 70, y: seat[1] - 10, width: 140, height: 24, rx: 6, fill: "#3E6E9E", stroke: C.ink, "stroke-width": 4 }, gs);
    const top = [piv[0] + Math.sin(0.7) * L, piv[1] + Math.cos(0.7) * L], bottom = [piv[0], piv[1] + L];
    if (t > st("p2")) el("circle", { cx: top[0], cy: top[1], r: 90, fill: "none", stroke: HL, "stroke-width": 6, "stroke-dasharray": "14 10", opacity: prog(t, st("p2"), 0.4) }, gs);
    turn(gs, t, S, "p2", "stöðu- eða hreyfi-?");
    if (t > st("p3")) label(gs, F.sto.name, top[0] + 170, top[1] - 40, 48, { p: prog(t, st("p3"), 0.4), fill: F.sto.t, stroke: F.sto.c, color: F.sto.c });
    if (t > st("p3") + 0.4) check(gs, top[0] + 360, top[1] - 40, prog(t, st("p3") + 0.4, 0.4), 0.8);
    if (t > st("p4")) label(gs, F.hre.name, bottom[0], bottom[1] + 110, 48, { p: prog(t, mid("p4", 0.4), 0.4), fill: F.hre.t, stroke: F.hre.c, color: F.hre.c });
    return;
  }
  // r1–r3: cord (raforka), heat (varmaorka), the kettle turns one into the other
  if (t < st("p5") - 0.3) {
    const gr = el("g", { opacity: 1 - prog(t, st("p5") - 0.7, 0.4) }, g);
    outlet(gr, 200, 560);
    const flow = t > st("r1") ? t : 0;
    cord(gr, [[255, 560], [560, 560], [560, 700], [640, 700]], flow);
    if (t > st("r1")) label(gr, F.raf.name, 420, 450, 52, { p: prog(t, mid("r1", 0.2), 0.4), fill: F.raf.t, stroke: F.raf.c, color: F.raf.c });
    const heat = prog(t, st("r2"), 0.6);
    kettle(gr, 800, 760, 1.1, 1, heat > 0 ? (t * 0.4) % 1 : 0, heat);
    if (t > st("r2")) label(gr, F.var.name, 820, 330, 52, { p: prog(t, mid("r2", 0.2), 0.4), fill: F.var.t, stroke: F.var.c, color: F.var.c });
    const p3 = prog(t, st("r3"), 0.5);
    if (p3 > 0) {
      el("rect", { x: 1060, y: 560, width: 60, height: 60, rx: 8, fill: F.raf.c, opacity: p3 }, gr);
      arrow(gr, 1140, 590, 1260, 590, p3, C.ink, "rv");
      el("rect", { x: 1280, y: 560, width: 60, height: 60, rx: 8, fill: F.var.c, opacity: prog(t, mid("r3", 0.5), 0.4) }, gr);
    }
    return;
  }
  // p5–p7: the toaster
  const gt = el("g", {}, g);
  tryBadge(gt, t, st("p5"));
  outlet(gt, 200, 620);
  const ans = t > st("p7");
  cord(gt, [[255, 620], [560, 620], [560, 700], [650, 700]], ans ? t : 0);
  toaster(gt, 820, 760, 1, prog(t, st("p7") + 0.6, 1.2));
  turn(gt, t, S, "p6", "inn og út?");
  if (ans) {
    label(gt, "inn: " + F.raf.name, 410, 500, 46, { p: prog(t, st("p7"), 0.4), fill: F.raf.t, stroke: F.raf.c, color: F.raf.c });
    label(gt, "út: " + F.var.name, 820, 420, 46, { p: prog(t, mid("p7", 0.5), 0.4), fill: F.var.t, stroke: F.var.c, color: F.var.c });
  }
}

function sceneRule(t) {
  const g = sceneGroup(t, st("l1"), st("v1"));
  if (!g) return;
  legend(g, t, 1 - prog(t, st("l7") - 0.4, 0.4) + prog(t, st("p8"), 0.4));
  if (t < st("p8") - 0.3) {
    const gr = el("g", { opacity: 1 - prog(t, st("p8") - 0.7, 0.4) }, g);
    if (t < st("l7")) {
      floorLine(gr, 880);
      table(gr, 260, 580, 420, 300);
      const fall = clamp((t - mid("l4", 0.1)) / 0.8);
      const bx = lerp(470, 860, fall), by = lerp(580, 880, fall * fall);
      bag(gr, bx, by, 1);
      // eight blocks above the bag (or around where it landed), changing colour but staying eight
      const p3 = prog(t, st("l3"), 0.5);
      if (p3 > 0) {
        const toH = prog(t, mid("l4", 0.15), 1.0), toV = prog(t, mid("l5", 0.35), 1.2);
        const list = [];
        for (let i = 0; i < 8; i++) {
          let k = "sto";
          k = formAt(k, "hre", toH, i); if (toV > 0) k = formAt("hre", "var", toV, i);
          const landed = toV > 0;
          const x = landed ? 700 + (i % 4) * 70 + i * 14 : bx - 105 + (i % 4) * 70;
          const y = landed ? 940 + Math.floor(i / 4) * 62 - (i % 2) * 10 : by - 250 + Math.floor(i / 4) * 62;
          list.push({ x, y, k });
        }
        blocks(gr, list, 52, p3);
        const count = el("g", { opacity: p3 }, gr);
        put(count, rect(260, 120, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "count8"), 1130, 470);
        text(count, "8 kubbar", 1260, 530, 54);
      }
      const p6 = prog(t, st("l6"), 0.5);
      if (p6 > 0) label(gr, "hverfa aldrei · skipta um lit", 760, 230, 50, { p: p6, fill: C.hlTint, stroke: HL });
      if (t < st("l3")) label(gr, "1 kubbur = smá orka", 760, 250, 44, { p: prog(t, mid("l2", 0.3), 0.4), fill: "#FFFFFF" });
      return;
    }
    // l7–l8: the law, as the book writes it
    header(gr, "Lögmálið um varðveislu orkunnar", t, st("l7"));
    const pq = prog(t, st("l8"), 0.6);
    if (pq > 0) {
      put(gr, rect(1300, 300, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "quote"), 110, 360, 1, pq);
      text(gr, "Orka getur hvorki myndast né eyðst,", 760, 450, 52, { opacity: pq });
      text(gr, "heldur getur hún eingöngu breyst", 760, 525, 52, { opacity: prog(t, mid("l8", 0.35), 0.4) });
      text(gr, "úr einu formi í annað.", 760, 600, 52, { opacity: prog(t, mid("l8", 0.6), 0.4) });
    }
    label(gr, "Eðlisfræði 3 · bls. 44", 760, 760, 40, { p: prog(t, mid("l7", 0.6), 0.4), fill: "#FFFFFF" });
    return;
  }
  // p8–p10: a bouncing ball
  const gb = el("g", {}, g);
  tryBadge(gb, t, st("p8"));
  floorLine(gb, 860);
  const tb = clamp((t - st("p8") - 0.6) / 3.2);
  const bounce = Math.abs(Math.cos(tb * Math.PI * 3.5)) * Math.pow(1 - tb, 1.6);
  const bx = lerp(300, 1000, tb), by = 860 - 60 - bounce * 420;
  el("circle", { cx: bx, cy: by, r: 60, fill: "#E86A4A", stroke: C.ink, "stroke-width": 5 }, gb);
  turn(gb, t, S, "p9", "horfin?");
  const ans = prog(t, st("p10"), 1.6);
  if (t > st("p10")) {
    const list = [];
    for (let i = 0; i < 8; i++) {
      const spread = prog(t, mid("p10", 0.5), 1.2);
      const x = lerp(bx - 105 + (i % 4) * 70, 300 + i * 120, spread);
      const y = lerp(by - 160 + Math.floor(i / 4) * 62, 930, spread);
      list.push({ x, y, k: formAt("hre", "var", ans, i), o: lerp(1, 0.55, spread) });
    }
    blocks(gb, list, 46, 1);
    label(gb, "enn 8 · bara dreifð", 760, 320, 50, { p: prog(t, mid("p10", 0.6), 0.4), fill: C.hlTint, stroke: HL });
  }
}

// the landscape from the highland reservoir to the kitchen
const DAM = { x: 360, y: 300 }, PIPE = [[420, 330], [520, 430], [620, 560], [700, 700]], STATION = { x: 700, y: 640 };
function landscape(g, t, o = 1) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: 0, y: 0, width: W, height: H, fill: "#EEF4F8" }, gg);
  poly(gg, [[0, 330], [200, 230], [420, 300], [560, 420], [760, 640], [1000, 760], [W, 760], [W, H], [0, H]], "#B8C9A3");
  poly(gg, [[0, 760], [W, 760], [W, H], [0, H]], "#9DB988");
  poly(gg, [[40, 330], [340, 330], [340, 380], [40, 380]], WATER, { opacity: 0.95 });          // the reservoir
  el("rect", { x: DAM.x - 20, y: 300, width: 34, height: 110, fill: "#9AA3B0", stroke: C.ink, "stroke-width": 4 }, gg); // the dam
}

function sceneHydro(t) {
  const g = sceneGroup(t, st("v1"), st("j1"));
  if (!g) return;
  if (t > st("p11") - 0.3) return sceneHydroTry(t, g);
  const lo = prog(t, st("v2"), 0.6);
  if (t < st("v2")) { header(g, "Hvaðan kemur rafmagnið?", t, st("v1")); kettle(g, W / 2, 760, 1, prog(t, st("v1"), 0.5), (t * 0.4) % 1, 1); return; }
  landscape(g, t, lo);
  label(g, "Búrfellsvirkjun · Þjórsá", 1050, 120, 44, { p: prog(t, mid("v2", 0.6), 0.5), fill: "#FFFFFF" });
  label(g, "um 7 af 10", 1050, 210, 44, { p: prog(t, mid("v2", 0.3), 0.5), fill: C.hlTint, stroke: HL });
  // labels and machinery appear sentence by sentence
  if (t > st("v3")) { label(g, "stífla", DAM.x + 120, 250, 44, { p: prog(t, mid("v3", 0.2), 0.4), fill: "#FFFFFF" }); label(g, "lón", 190, 450, 44, { p: prog(t, mid("v3", 0.6), 0.4), fill: "#FFFFFF" }); }
  const pPipe = prog(t, st("v5"), 0.8);
  if (pPipe > 0) put(g, drawOn(cachedPipe(), pPipe));
  // station with turbine (hverfill) and generator (rafall)
  const pSt = prog(t, st("v6"), 0.5);
  if (pSt > 0) {
    el("rect", { x: STATION.x - 20, y: STATION.y, width: 360, height: 160, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 5, opacity: pSt }, g);
    const spin = t > st("v6") ? (t - st("v6")) * 260 : 0;
    const hc = [STATION.x + 70, STATION.y + 85];
    const gw = el("g", { opacity: pSt, transform: `rotate(${spin} ${hc[0]} ${hc[1]})` }, g);
    el("circle", { cx: hc[0], cy: hc[1], r: 55, fill: "#DCE7F7", stroke: C.ink, "stroke-width": 4 }, gw);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; el("line", { x1: hc[0], y1: hc[1], x2: hc[0] + Math.cos(a) * 55, y2: hc[1] + Math.sin(a) * 55, stroke: C.ink, "stroke-width": 7 }, gw); }
    label(g, "hverfill", hc[0], STATION.y + 220, 42, { p: prog(t, mid("v6", 0.4), 0.4), fill: "#FFFFFF" });
  }
  const pRf = prog(t, st("v7"), 0.5);
  if (pRf > 0) {
    const rc = [STATION.x + 230, STATION.y + 85];
    el("line", { x1: STATION.x + 125, y1: rc[1], x2: rc[0] - 60, y2: rc[1], stroke: C.ink, "stroke-width": 10, opacity: pRf }, g);
    el("rect", { x: rc[0] - 60, y: rc[1] - 55, width: 120, height: 110, rx: 14, fill: F.raf.t, stroke: C.ink, "stroke-width": 4, opacity: pRf }, g);
    el("path", { d: `M ${rc[0] - 25} ${rc[1] - 25} L ${rc[0] + 5} ${rc[1] - 5} L ${rc[0] - 10} ${rc[1] + 5} L ${rc[0] + 25} ${rc[1] + 30}`, fill: "none", stroke: F.raf.c, "stroke-width": 8, "stroke-linejoin": "round", opacity: pRf }, g);
    label(g, "rafall", rc[0] + 20, STATION.y + 220, 42, { p: prog(t, mid("v7", 0.6), 0.4), fill: "#FFFFFF" });
  }
  // pylons and the line to the house with the kettle
  const pL = prog(t, st("v9"), 1.0);
  if (pL > 0) {
    const xs = [1150, 1400, 1650];
    xs.forEach((x, i) => { const p = prog(t, st("v9") + i * 0.25, 0.4); el("polyline", { points: pts([[x - 40, 760], [x, 540], [x + 40, 760]]), fill: "none", stroke: C.ink, "stroke-width": 6, opacity: p }, g); el("line", { x1: x - 50, y1: 570, x2: x + 50, y2: 570, stroke: C.ink, "stroke-width": 6, opacity: p }, g); });
    el("polyline", { points: pts([[1060, 690], [1150, 575], [1400, 575], [1650, 575], [1760, 640]]), fill: "none", stroke: F.raf.c, "stroke-width": 6, "stroke-dasharray": "14 18", "stroke-dashoffset": String(-t * 300), opacity: pL }, g);
    label(g, "háspennulína", 1400, 480, 40, { p: prog(t, mid("v9", 0.5), 0.4), fill: "#FFFFFF" });
    poly(g, [[1720, 760], [1720, 650], [1810, 590], [1900, 650], [1900, 760]], "#F2E3C9", { stroke: C.ink, sw: 4, opacity: pL });
  }
  if (t > st("v10")) kettle(g, 1810, 740, 0.45, prog(t, st("v10"), 0.4), (t * 0.4) % 1, 1);
  // v11: sun, evaporation, clouds, rain on the highland
  const pS = prog(t, st("v11"), 0.6);
  if (pS > 0) {
    el("circle", { cx: 1780, cy: 120, r: 70, fill: "#F5C542", opacity: pS }, g);
    for (let i = 0; i < 4; i++) { const ph = (t * 0.5 + i / 4) % 1; el("line", { x1: 1500 + i * 60, y1: 740 - ph * 400, x2: 1500 + i * 60, y2: 720 - ph * 400, stroke: WATER, "stroke-width": 6, opacity: pS * (1 - ph) }, g); }
    const cx = lerp(1500, 240, prog(t, mid("v11", 0.5), 2.0));
    for (const [dx, r] of [[-60, 50], [0, 70], [70, 55]]) el("circle", { cx: cx + dx, cy: 160, r, fill: "#FFFFFF", stroke: "#B9C2CF", "stroke-width": 3, opacity: pS }, g);
    if (t > mid("v11", 0.8)) for (let i = 0; i < 8; i++) { const ph = (t * 1.6 + i / 8) % 1; el("line", { x1: cx - 80 + i * 22, y1: 220 + ph * 100, x2: cx - 90 + i * 22, y2: 245 + ph * 100, stroke: WATER, "stroke-width": 4, opacity: 0.9 }, g); }
  }
  // the energy blocks travel along the chain and change colour at each machine
  const stage = t < st("v4") ? -1 : t < st("v5") ? 0 : t < mid("v8", 0.2) ? 1 : t < st("v10") ? 2 : 3;
  if (stage >= 0 && t < st("v11")) {
    const posBy = [[190, 280], [560, 470], [990, 690], [1560, 500]];
    const keys = ["sto", "hre", "raf", "var"];
    let p0 = posBy[stage];
    if (stage === 3) p0 = [1640, 440];
    const list = [];
    for (let i = 0; i < 8; i++) list.push({ x: p0[0] - 70 + (i % 4) * 46, y: p0[1] - 40 + Math.floor(i / 4) * 46, k: keys[stage] });
    blocks(g, list, 40, 0.95);
  }
  legend(g, t, prog(t, st("v4"), 0.5) * (1 - prog(t, st("v11"), 0.4)), ["sto", "hre", "raf", "var"][Math.max(0, stage)], 60, 715);
}
let pipeNode = null;
function cachedPipe() {
  if (!pipeNode) pipeNode = (() => { const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); const p = document.createElementNS("http://www.w3.org/2000/svg", "polyline"); p.setAttribute("points", pts(PIPE)); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#4A5466"); p.setAttribute("stroke-width", "22"); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round"); g.appendChild(p); const q = p.cloneNode(); q.setAttribute("stroke", WATER); q.setAttribute("stroke-width", "10"); g.appendChild(q); return g; })();
  return pipeNode.cloneNode(true);
}

function sceneHydroTry(t, g) {
  tryBadge(g, t, st("p11"));
  const cards = [["rafall", F.raf], ["lón", F.sto], ["ketill", F.var], ["hverfill", F.hre]];
  const ordered = ["lón", "hverfill", "rafall", "ketill"];
  const solved = prog(t, st("p13"), 1.2);
  cards.forEach(([w, f], i) => {
    const j = ordered.indexOf(w);
    const x = lerp(160 + i * 420, 160 + j * 420, solved), y = lerp(i % 2 ? 470 : 380, 430, solved);
    const p = prog(t, st("p11") + 0.3 + i * 0.2, 0.4);
    put(g, rect(320, 120, { stroke: solved > 0.9 ? f.c : C.ink, strokeWidth: 5, fill: solved > 0.9 ? f.t : "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "card" + w + (solved > 0.9 ? "s" : "")), x, y, 1, p);
    text(g, w, x + 160, y + 60, 48, { opacity: p });
  });
  if (solved > 0.9) for (let i = 0; i < 3; i++) arrow(g, 160 + i * 420 + 330, 490, 160 + (i + 1) * 420 - 10, 490, prog(t, st("p13") + 1.2 + i * 0.2, 0.3), C.soft, "ord" + i);
  turn(g, t, S, "p12", "rétt röð?");
  if (t > st("p14")) {
    const keys = ["sto", "hre", "raf", "var"];
    keys.forEach((k, i) => { const p = prog(t, mid("p14", i * 0.25), 0.4); el("rect", { x: 160 + i * 420 + 130, y: 640, width: 60, height: 60, rx: 8, fill: F[k].c, opacity: p }, g); text(g, F[k].name, 160 + i * 420 + 160, 750, 36, { opacity: p, fill: F[k].c }); });
  }
}

function sceneGeo(t) {
  const g = sceneGroup(t, st("j1"), st("b1"));
  if (!g) return;
  if (t > st("p15") - 0.3) {
    // p15–p17: the radiator in the living room
    tryBadge(g, t, st("p15"));
    el("rect", { x: 0, y: 820, width: W, height: 260, fill: "#E9DDC8" }, g);
    const rx = 500, ry = 520;
    for (let i = 0; i < 8; i++) el("rect", { x: rx + i * 50, y: ry, width: 38, height: 280, rx: 14, fill: "#F4F4F4", stroke: C.ink, "stroke-width": 4 }, g);
    el("line", { x1: rx - 20, y1: ry + 270, x2: rx + 420, y2: ry + 270, stroke: C.ink, "stroke-width": 10 }, g);
    for (let i = 0; i < 4; i++) { const ph = (t * 0.4 + i / 4) % 1; el("path", { d: `M ${rx + 40 + i * 100} ${ry - 20 - ph * 140} q 18 -25 0 -50 q -18 -25 0 -50`, fill: "none", stroke: F.var.c, "stroke-width": 6, "stroke-linecap": "round", opacity: (1 - ph) * 0.8 }, g); }
    const ans = t > st("p17");
    put(g, rect(400, 110, { stroke: ans ? C.soft : C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "c-vatn"), 1150, 420, 1, prog(t, st("p16"), 0.4) * (ans ? 0.5 : 1));
    text(g, "vatnsorkuver", 1350, 475, 44, { opacity: prog(t, st("p16"), 0.4) * (ans ? 0.5 : 1) });
    put(g, rect(400, 110, { stroke: ans ? F.var.c : C.ink, strokeWidth: ans ? 8 : 5, fill: ans ? F.var.t : "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "c-jard" + (ans ? "a" : "")), 1150, 580, 1, prog(t, mid("p16", 0.5), 0.4));
    text(g, "jarðhiti", 1350, 635, 44, { opacity: prog(t, mid("p16", 0.5), 0.4) });
    if (ans) check(g, 1620, 635, prog(t, st("p17") + 0.3, 0.4), 0.9);
    turn(g, t, S, "p16", "hvort?");
    return;
  }
  if (t < st("j3")) header(g, "Heita vatnið í sturtunni", t, st("j1"));
  // cross-section of the ground
  const pIn = prog(t, st("j2"), 0.6);
  if (t < st("j2")) {
    // shower first
    const gs = el("g", { opacity: prog(t, st("j1") + 0.2, 0.5) }, g);
    el("rect", { x: 820, y: 300, width: 280, height: 20, rx: 8, fill: "#9AA3B0" }, gs);
    for (let i = 0; i < 10; i++) { const ph = (t * 1.5 + i / 10) % 1; el("line", { x1: 840 + i * 25, y1: 330 + ph * 380, x2: 835 + i * 25, y2: 350 + ph * 380, stroke: WATER, "stroke-width": 5 }, gs); }
    for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; el("path", { d: `M ${880 + i * 70} ${700 - ph * 200} q 15 -25 0 -50`, fill: "none", stroke: "#B9C2CF", "stroke-width": 8, opacity: 1 - ph }, gs); }
    return;
  }
  const p7 = prog(t, st("j7"), 0.5);
  const gx = el("g", { opacity: pIn * (1 - 0.8 * p7) }, g);
  el("rect", { x: 0, y: 380, width: W, height: 700, fill: "#B8A58F" }, gx);
  el("rect", { x: 0, y: 380, width: W, height: 26, fill: GRASS }, gx);
  // hot rock deep down
  const pHot = prog(t, st("j3"), 0.6);
  el("rect", { x: 0, y: 880, width: W, height: 200, fill: "#C8553D", opacity: pHot }, gx);
  if (pHot > 0) label(gx, "heitt berg", 300, 980, 44, { p: pHot, fill: "#FFFFFF" });
  // cracks
  for (const cx of [420, 640, 860]) el("polyline", { points: pts([[cx, 406], [cx + 30, 560], [cx - 10, 720], [cx + 20, 880]]), fill: "none", stroke: ROCK, "stroke-width": 8, opacity: pHot }, gx);
  // rain sinking down (blue), heating up, rising (red)
  const pR = prog(t, st("j4"), 0.5);
  if (pR > 0) {
    for (let i = 0; i < 8; i++) { const ph = (t * 0.7 + i / 8) % 1; el("line", { x1: 380 + i * 60, y1: 120 + ph * 240, x2: 375 + i * 60, y2: 145 + ph * 240, stroke: WATER, "stroke-width": 5, opacity: pR }, gx); }
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.25 + i / 6) % 1, down = ph < 0.5;
      const x = down ? 650 + Math.sin(i) * 10 : 1100, y = down ? 420 + ph * 2 * 440 : 860 - (ph - 0.5) * 2 * 440;
      el("circle", { cx: x, cy: y, r: 14, fill: down ? WATER : F.var.c, opacity: pR }, gx);
    }
    arrow(gx, 700, 470, 700, 820, pR, WATER, "down");
    arrow(gx, 1060, 840, 1060, 460, prog(t, mid("j4", 0.6), 0.4), F.var.c, "up");
  }
  if (t > st("j5")) label(gx, "jarðhiti · jarðvarmi", 1350, 650, 50, { p: prog(t, mid("j5", 0.2), 0.4), fill: F.var.t, stroke: F.var.c, color: F.var.c });
  // borehole, pipe and the house with the shower
  const pB = prog(t, st("j6"), 0.8);
  if (pB > 0) {
    el("rect", { x: 1094, y: 300, width: 14, height: 580, fill: "#4A5466", opacity: pB }, gx);
    label(gx, "borhola", 1240, 330, 40, { p: pB, fill: "#FFFFFF" });
    el("polyline", { points: pts([[1100, 300], [1100, 250], [1560, 250], [1560, 300]]), fill: "none", stroke: F.var.c, "stroke-width": 14, opacity: prog(t, mid("j6", 0.4), 0.5) }, gx);
    poly(gx, [[1500, 380], [1500, 260], [1620, 190], [1740, 260], [1740, 380]], "#F2E3C9", { stroke: C.ink, sw: 4, opacity: prog(t, mid("j6", 0.4), 0.5) });
    label(gx, "hitaveita", 1330, 180, 46, { p: prog(t, mid("j6", 0.75), 0.4), fill: F.var.t, stroke: F.var.c, color: F.var.c });
  }
  // 9 of 10 houses
  if (p7 > 0) {
    const gh = el("g", { opacity: p7 }, g);
    put(gh, rect(1500, 360, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "houses"), 210, 400);
    for (let i = 0; i < 10; i++) { const x = 280 + i * 140, warm = i < 9; poly(gh, [[x, 640], [x, 540], [x + 55, 480], [x + 110, 540], [x + 110, 640]], warm ? F.var.c : "#C9CED6", { stroke: C.ink, sw: 4 }); }
    text(gh, "9 af 10 húsum: jarðhiti", W / 2, 700, 50, { fill: F.var.c });
  }
}

function sceneBack(t) {
  const g = sceneGroup(t, st("b1"), st("q1"));
  if (!g) return;
  el("rect", { x: 0, y: 700, width: W, height: 40, fill: "#A8763E" }, g);
  el("rect", { x: 0, y: 740, width: W, height: 340, fill: "#E9DDC8" }, g);
  kettle(g, 560, 700, 1.2, 1, t < st("b2") ? (t * 0.4) % 1 : 0, 1 - prog(t, st("b2"), 1.5));
  // the heat leaves the kettle and spreads out in the kitchen air, still eight blocks
  const spread = prog(t, mid("b2", 0.2), 2.0);
  const list = [];
  for (let i = 0; i < 8; i++) list.push({ x: lerp(500 + (i % 4) * 46, 300 + i * 170, spread), y: lerp(420 + Math.floor(i / 4) * 46, 220 + ((i * 37) % 4) * 90, spread), k: "var", o: lerp(1, 0.6, spread) });
  blocks(g, list, 44, prog(t, st("b2"), 0.4));
  if (t > mid("b2", 0.6)) label(g, "hverfur ekki", 1500, 420, 50, { p: prog(t, mid("b2", 0.6), 0.4), fill: C.hlTint, stroke: HL });
  const p3 = prog(t, st("b3"), 0.5);
  if (p3 > 0) {
    text(g, "orkunotkun", 1300, 560, 70, { opacity: p3, fill: C.soft });
    if (t > mid("b3", 0.3)) seg(g, [1110, 580], [1490, 540], F.var.c, prog(t, mid("b3", 0.3), 0.4), 8, "strikeNot");
    label(g, "við breytum orkunni", 1300, 680, 50, { p: prog(t, mid("b3", 0.7), 0.4), fill: C.hlTint, stroke: HL });
    label(g, "Eðlisfræði 3 · bls. 65, spurning 8", 1300, 790, 34, { p: prog(t, mid("b3", 0.2), 0.4), fill: "#FFFFFF" });
  }
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
    put(g, drawOn(rect(sw, sh, { stroke: asked ? C.hl : C.ink, strokeWidth: asked && !ans ? 8 : 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "oslot" + i + (asked ? "a" : "")), inP), s.x, sy);
    el("circle", { cx: s.x + 50, cy: sy + 50, r: 34, fill: asked ? C.hl : C.ink, opacity: inP }, g);
    text(g, String(i + 1), s.x + 50, sy + 52, 44, { fill: "#FFF", opacity: inP });
    const cx = s.x + sw / 2;
    if (asked && ans < 1) text(g, "?", cx, sy + sh / 2, 200, { fill: C.hl, opacity: 1 - ans });
    if (ans <= 0) return;
    const ga = el("g", { opacity: ans }, g);
    if (i === 0) { poly(ga, [[s.x + 60, sy + 200], [s.x + 420, sy + 200], [s.x + 420, sy + 280], [s.x + 60, sy + 280]], WATER); el("rect", { x: s.x + 200, y: sy + 120, width: 80, height: 80, rx: 10, fill: F.sto.c }, ga); text(ga, F.sto.name, cx, sy + 420, 50, { fill: F.sto.c }); }
    else if (i === 1) { el("rect", { x: cx - 80, y: sy + 140, width: 160, height: 150, rx: 16, fill: F.raf.t, stroke: C.ink, "stroke-width": 4 }, ga); el("path", { d: `M ${cx - 30} ${sy + 170} L ${cx + 8} ${sy + 210} L ${cx - 12} ${sy + 220} L ${cx + 30} ${sy + 265}`, fill: "none", stroke: F.raf.c, "stroke-width": 9 }, ga); text(ga, "rafall", cx, sy + 420, 56); }
    else { ["sto", "hre", "raf", "var"].forEach((k, j) => el("rect", { x: s.x + 70 + j * 90, y: sy + 190, width: 70, height: 70, rx: 10, fill: F[k].c }, ga)); text(ga, "Nei", cx, sy + 400, 70); }
  });
  ["q2", "q4", "q6"].forEach((q) => turn(g, t, S, q));
}

function sceneTask(t) {
  const g = sceneGroup(t, st("w1"), TL.duration + 5);
  if (!g) return;
  header(g, "Verkefni heima", t, st("w1"));
  legend(g, t, prog(t, st("w2"), 0.5));
  // hair dryer: both forms
  const p3 = prog(t, st("w3"), 0.5);
  const gd = el("g", { opacity: prog(t, st("w1") + 0.4, 0.5) }, g);
  el("path", { d: "M 300 420 Q 300 330 420 330 L 760 360 L 760 460 L 420 490 Q 300 490 300 420 Z", fill: "#7C6BB0", stroke: C.ink, "stroke-width": 5 }, gd);
  el("rect", { x: 380, y: 470, width: 90, height: 260, rx: 30, fill: "#7C6BB0", stroke: C.ink, "stroke-width": 5 }, gd);
  el("polyline", { points: pts([[425, 730], [425, 800], [200, 800]]), fill: "none", stroke: C.ink, "stroke-width": 10 }, gd);
  if (p3 > 0) {
    for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; el("path", { d: `M ${790 + ph * 300} ${380 + i * 30} q 25 -15 50 0 q 25 15 50 0`, fill: "none", stroke: F.var.c, "stroke-width": 6, opacity: 1 - ph }, g); }
    label(g, F.var.name, 1060, 300, 44, { p: p3, fill: F.var.t, stroke: F.var.c, color: F.var.c });
    label(g, F.hre.name, 1060, 560, 44, { p: prog(t, mid("w3", 0.5), 0.4), fill: F.hre.t, stroke: F.hre.c, color: F.hre.c });
    label(g, "vifta", 1060, 630, 34, { p: prog(t, mid("w3", 0.5), 0.4), fill: "#FFFFFF" });
  }
  if (t > st("w2")) { el("rect", { x: 160, y: 760, width: 50, height: 50, rx: 8, fill: F.raf.c, opacity: prog(t, st("w2"), 0.4) }, g); text(g, "inn: raforka", 240, 870, 40, { anchor: "start", fill: F.raf.c, opacity: prog(t, st("w2"), 0.4) }); }
}

export function render(t) {
  root.replaceChildren();
  sceneTitle(t);
  sceneKitchen(t);
  sceneEnergy(t);
  sceneForms(t);
  sceneRule(t);
  sceneHydro(t);
  sceneGeo(t);
  sceneBack(t);
  sceneRecap(t);
  sceneTask(t);
  text(root, TL.series_tag, 48, 52, 30, { anchor: "start", fill: C.soft, weight: 400 });
}
