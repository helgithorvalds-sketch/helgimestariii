// Frá hernámi til lýðveldis. Saga 10. bekkur (Styrjaldir og kreppa, bls. 37 og 129–137).
// Formula applied to history: a real morning as the hook, each term taught on a real event before it is used,
// a timeline that stays on screen (like the step list in maths), one new thing at a time, try after each idea.
// Numbers the sources disagree on (warships, soldiers on day one, American troops) are never shown.
import { W, H, C, clamp, prog, st, mid, lerp, el, put, drawOn, rect, line, text, label, arrow, check, header, sceneGroup, S, TL, root } from "/lib.js";
import { HL, pts, poly, turn, tryBadge, timeline } from "/kit.js";
export { init } from "/lib.js";

const SEA = "#CFE3F2", SEA2 = "#9FC4E2", LAND = "#D8D0B8", ICE = "#F4F1E8", DK = "#C8102E", IS_BLUE = "#02529C", IS_RED = "#DC1E35";
const UK = "#3E6E9E", DE = "#5A5A5A", US = "#2F6F4F";

// the timeline along the bottom: each event appears when it is first told, the current one lights up
function line1944(g, t, o = 1) {
  const ev = [
    { year: 1918, word: "fullveldi", at: st("f2") },
    { year: 1939, word: "stríðið hefst", at: st("h4") },
    { year: 1940, word: "hernám", at: st("h5") },
    { year: 1941, word: "Bandaríkin", at: st("l5") },
    { year: 1944, word: "lýðveldi", at: st("y6") },
  ];
  const now = t < st("h4") ? 0 : t < st("h5") ? 1 : t < st("l5") ? 2 : t < st("y3") ? 3 : t < st("t1") ? 4 : -1;
  timeline(g, t, ev, o, 975, 260, 1660, now, true);
}

// ---------- real objects ----------
function crown(g, x, y, s = 1, o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("path", { d: "M -80 40 L -90 -40 L -45 0 L 0 -60 L 45 0 L 90 -40 L 80 40 Z", fill: "#E8C15A", stroke: C.ink, "stroke-width": 5, "stroke-linejoin": "round" }, gg);
  el("rect", { x: -82, y: 40, width: 164, height: 26, rx: 6, fill: "#D4A73A", stroke: C.ink, "stroke-width": 5 }, gg);
  for (const [cx, cy] of [[-90, -40], [0, -60], [90, -40]]) el("circle", { cx, cy, r: 9, fill: "#C8102E", stroke: C.ink, "stroke-width": 3 }, gg);
}
function flagDK(g, x, y, w, o = 1) {
  const h = w * 0.75, gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: w, height: h, fill: DK, stroke: C.ink, "stroke-width": 3 }, gg);
  el("rect", { x: x + w * 0.33, y, width: w * 0.12, height: h, fill: "#FFF" }, gg);
  el("rect", { x, y: y + h * 0.44, width: w, height: h * 0.12, fill: "#FFF" }, gg);
}
function flagIS(g, x, y, w, o = 1) {
  const h = w * 0.72, gg = el("g", { opacity: o }, g);
  el("rect", { x, y, width: w, height: h, fill: IS_BLUE, stroke: C.ink, "stroke-width": 3 }, gg);
  el("rect", { x: x + w * 0.28, y, width: w * 0.16, height: h, fill: "#FFF" }, gg);
  el("rect", { x, y: y + h * 0.39, width: w, height: h * 0.22, fill: "#FFF" }, gg);
  el("rect", { x: x + w * 0.32, y, width: w * 0.08, height: h, fill: IS_RED }, gg);
  el("rect", { x, y: y + h * 0.445, width: w, height: h * 0.11, fill: IS_RED }, gg);
}
function soldier(g, x, y, s = 1, color = UK, o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("circle", { cx: 0, cy: -150, r: 22, fill: "#E9C9A8", stroke: C.ink, "stroke-width": 3 }, gg);
  el("path", { d: "M -30 -160 Q 0 -195 30 -160 Z", fill: color, stroke: C.ink, "stroke-width": 3 }, gg);
  el("rect", { x: -26, y: -126, width: 52, height: 80, rx: 10, fill: color, stroke: C.ink, "stroke-width": 3 }, gg);
  el("rect", { x: -22, y: -46, width: 18, height: 46, fill: color, stroke: C.ink, "stroke-width": 3 }, gg);
  el("rect", { x: 4, y: -46, width: 18, height: 46, fill: color, stroke: C.ink, "stroke-width": 3 }, gg);
}
function ship(g, x, y, s = 1, o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("path", { d: "M -200 0 L 200 0 L 160 50 L -170 50 Z", fill: "#6B7385", stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: -70, y: -50, width: 120, height: 50, fill: "#7E8798", stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: -20, y: -95, width: 30, height: 45, fill: "#7E8798", stroke: C.ink, "stroke-width": 4 }, gg);
  el("line", { x1: 80, y1: -20, x2: 150, y2: -35, stroke: C.ink, "stroke-width": 8 }, gg);
}
function plane(g, x, y, s = 1, o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("ellipse", { cx: 0, cy: 0, rx: 70, ry: 14, fill: "#7E8798", stroke: C.ink, "stroke-width": 3 }, gg);
  el("path", { d: "M -15 0 L -40 -50 L 10 -50 L 20 0 Z", fill: "#6B7385", stroke: C.ink, "stroke-width": 3 }, gg);
  el("path", { d: "M -60 0 L -75 -25 L -55 -25 L -45 0 Z", fill: "#6B7385", stroke: C.ink, "stroke-width": 3 }, gg);
}
function braggi(g, x, y, w = 260, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("path", { d: `M ${x} ${y} A ${w / 2} ${w / 2.4} 0 0 1 ${x + w} ${y} Z`, fill: "#A9AFB9", stroke: C.ink, "stroke-width": 4 }, gg);
  for (let i = 1; i < 6; i++) el("line", { x1: x + (w * i) / 6, y1: y - Math.sqrt(Math.max(0, 1 - Math.pow((2 * i) / 6 - 1, 2))) * (w / 2.4), x2: x + (w * i) / 6, y2: y, stroke: "#8A919E", "stroke-width": 3 }, gg);
  el("rect", { x: x + w / 2 - 22, y: y - 60, width: 44, height: 60, fill: "#5A3E36" }, gg);
}
function house(g, x, y, s = 1, roof = "#B5583A", o = 1) {
  const gg = el("g", { opacity: o, transform: `translate(${x} ${y}) scale(${s})` }, g);
  el("rect", { x: -60, y: -90, width: 120, height: 90, fill: "#F2E3C9", stroke: C.ink, "stroke-width": 4 }, gg);
  el("path", { d: "M -75 -90 L 0 -150 L 75 -90 Z", fill: roof, stroke: C.ink, "stroke-width": 4 }, gg);
  el("rect", { x: -40, y: -70, width: 30, height: 30, fill: "#CFE3F2", stroke: C.ink, "stroke-width": 3 }, gg);
}
function radio(g, x, y, o = 1) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: x - 120, y: y - 90, width: 240, height: 180, rx: 24, fill: "#8A5E2E", stroke: C.ink, "stroke-width": 5 }, gg);
  el("circle", { cx: x - 40, cy: y, r: 55, fill: "#E9D3AE", stroke: C.ink, "stroke-width": 4 }, gg);
  el("circle", { cx: x + 70, cy: y - 25, r: 18, fill: "#E9D3AE", stroke: C.ink, "stroke-width": 3 }, gg);
  el("circle", { cx: x + 70, cy: y + 35, r: 18, fill: "#E9D3AE", stroke: C.ink, "stroke-width": 3 }, gg);
}
function ballotBox(g, x, y, o = 1, paper = 0) {
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: x - 120, y: y - 140, width: 240, height: 180, fill: "#E9D3AE", stroke: C.ink, "stroke-width": 5 }, gg);
  el("rect", { x: x - 60, y: y - 146, width: 120, height: 12, fill: C.ink }, gg);
  if (paper > 0) { const py = lerp(y - 300, y - 150, paper); el("rect", { x: x - 40, y: py, width: 80, height: 100, fill: "#FFFFFF", stroke: C.ink, "stroke-width": 3 }, gg); text(gg, "já", x, py + 50, 40); }
}

// schematic North Atlantic map: rough shapes, labelled, Iceland in the middle
function map(g, t, o = 1, hi = {}) {
  if (o <= 0) return;
  const gg = el("g", { opacity: o }, g);
  el("rect", { x: 0, y: 0, width: W, height: 880, fill: SEA }, gg);
  poly(gg, [[0, 120], [260, 80], [380, 260], [300, 520], [120, 760], [0, 820]], LAND, { stroke: C.ink, sw: 3 });                 // North America
  poly(gg, [[330, 40], [560, 30], [600, 180], [470, 330], [360, 220]], ICE, { stroke: C.ink, sw: 3 });                             // Greenland
  poly(gg, [[820, 300], [880, 270], [960, 280], [1010, 310], [990, 350], [900, 365], [840, 345]], hi.is ? "#F3D7A0" : LAND, { stroke: C.ink, sw: 4 }); // Iceland
  poly(gg, [[1160, 520], [1210, 470], [1250, 520], [1260, 640], [1230, 720], [1180, 700], [1170, 610]], hi.uk ? "#C9D9EA" : LAND, { stroke: C.ink, sw: 3 }); // Britain
  poly(gg, [[1330, 380], [1420, 170], [1560, 90], [1650, 200], [1560, 420], [1480, 520], [1420, 500]], LAND, { stroke: C.ink, sw: 3 }); // Scandinavia
  poly(gg, [[1430, 560], [1480, 540], [1500, 600], [1460, 620]], hi.dk ? "#F2B6B6" : LAND, { stroke: C.ink, sw: 3 });             // Denmark
  poly(gg, [[1400, 640], [1640, 620], [1760, 760], [1500, 900], [1360, 820]], hi.de ? "#C9C9C9" : LAND, { stroke: C.ink, sw: 3 }); // Germany
  text(gg, "Ameríka", 170, 470, 40);
  text(gg, "Ísland", 915, 410, 42, { weight: 700 });
  text(gg, "Bretland", 1110, 760, 36);
  text(gg, "Danmörk", 1600, 560, 34);
  text(gg, "Þýskaland", 1560, 770, 36);
  text(gg, "Norður-Atlantshaf", 700, 640, 40, { fill: "#4F7FA8", weight: 400 });
}

// ---------- scenes ----------
function sceneTitle(t) {
  const g = sceneGroup(t, 0.3, st("k1") + 0.1);
  if (!g) return;
  text(g, "Frá hernámi til lýðveldis", W / 2, 460, 100, { opacity: prog(t, 0.4, 0.6) });
  text(g, "Ísland 1918–1944 · Styrjaldir og kreppa", W / 2, 580, 46, { fill: C.soft, weight: 400, opacity: prog(t, 0.8, 0.6) });
}

function harbour(g, t, a, o = 1) {
  // Reykjavík at dawn: houses, the harbour, ships at the quay, a plane, soldiers walking up from the quay
  el("rect", { x: 0, y: 0, width: W, height: 620, fill: "#F3E2C7", opacity: o }, g);
  el("rect", { x: 0, y: 620, width: W, height: 330, fill: SEA2, opacity: o }, g);
  el("rect", { x: 0, y: 560, width: 1100, height: 70, fill: "#B8B0A0", opacity: o }, g);    // the quay
  for (let i = 0; i < 7; i++) house(g, 120 + i * 140, 560, 0.9, ["#B5583A", "#3E6E9E", "#7A8B6A"][i % 3], o);
  el("path", { d: "M 1150 620 L 1300 380 L 1500 450 L 1700 330 L 1920 420 L 1920 620 Z", fill: "#B9C3CC", opacity: o }, g);   // Esja behind the bay
  const pShips = prog(t, mid(a, 0.5), 0.8);
  ship(g, 1300, 700, 1, pShips * o); ship(g, 1650, 760, 0.8, pShips * o);
  const px = lerp(-200, 2100, clamp((t - st(a)) / 6));
  if (px < 2050) plane(g, px, 160, 1, o);
  const walk = clamp((t - mid(a, 0.6)) / 6);
  for (let i = 0; i < 5; i++) soldier(g, lerp(1000 + i * 40, 520 + i * 70, walk), 600, 0.8, UK, pShips * o);
}

function sceneHook(t) {
  const g = sceneGroup(t, st("k1"), st("f1"));
  if (!g) return;
  harbour(g, t, "k2", 1);
  label(g, "10. maí 1940", 300, 140, 52, { p: prog(t, st("k1"), 0.5), fill: "#FFFFFF" });
  label(g, "Reykjavík", 300, 230, 44, { p: prog(t, mid("k1", 0.6), 0.5), fill: "#FFFFFF" });
  const q = prog(t, st("k3"), 0.5);
  if (q > 0) text(g, "?", 800, 360, 140, { fill: HL, opacity: q });
  const p4 = prog(t, st("k4"), 0.5);
  if (p4 > 0) { label(g, "1944: lýðveldi", 1500, 180, 50, { p: p4, fill: C.hlTint, stroke: HL }); arrow(g, 420, 140, 1240, 170, prog(t, mid("k4", 0.3), 0.6), C.soft, "hookArrow"); }
}

function sceneSovereignty(t) {
  const g = sceneGroup(t, st("f1"), st("h1"));
  if (!g) return;
  line1944(g, t);
  if (t < st("p1") - 0.3) header(g, "1918: fullveldi", t, st("f1"));
  // f2–f3: Iceland decides for itself
  const pI = prog(t, st("f2"), 0.6);
  if (pI > 0) {
    poly(g, [[260, 470], [380, 410], [560, 420], [650, 480], [620, 560], [440, 590], [300, 560]], "#F3D7A0", { stroke: C.ink, sw: 5, opacity: pI });
    text(g, "Ísland", 460, 500, 50, { opacity: pI });
    label(g, "fullvalda ríki", 460, 660, 50, { p: prog(t, mid("f2", 0.5), 0.4), fill: C.hlTint, stroke: HL });
  }
  const p3 = prog(t, mid("f3", 0.2), 0.5) * (1 - prog(t, st("f4"), 0.4));
  if (p3 > 0) {
    label(g, "Íslendingar ráða sjálfir", 1200, 400, 46, { p: p3, fill: "#FFFFFF" });
    label(g, "enginn utan landsins ræður", 1200, 520, 42, { p: prog(t, mid("f3", 0.6), 0.4) * p3, fill: "#FFFFFF" });
  }
  // f4: the same king as Denmark
  const p4 = prog(t, st("f4"), 0.5);
  if (p4 > 0) {
    crown(g, 1060, 420, 1.1, p4);
    flagDK(g, 1400, 360, 180, p4);
    text(g, "Kaupmannahöfn", 1490, 530, 40, { opacity: prog(t, mid("f4", 0.5), 0.4) });
    arrow(g, 960, 440, 660, 480, p4, C.soft, "kingIS");
    label(g, "sami konungur", 1060, 600, 44, { p: prog(t, mid("f4", 0.2), 0.4), fill: "#FFFFFF" });
  }
  // f5: the contract could be ended after 25 years
  const p5 = prog(t, st("f5"), 0.5);
  if (p5 > 0) {
    put(g, rect(250, 320, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "contract"), 1665, 300, 1, p5);
    text(g, "samningur", 1790, 350, 36, { opacity: p5 });
    text(g, "25 ár", 1790, 470, 76, { opacity: prog(t, mid("f5", 0.6), 0.4), fill: HL });
  }
  // p1–p2: 1918 + 25
  if (t > st("p1") - 0.4) {
    const gp = el("g", {}, g);
    tryBadge(gp, t, st("p1"));
    const pq = prog(t, st("p1"), 0.5);
    put(gp, rect(900, 140, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "sum"), 510, 740, 1, pq);
    text(gp, prog(t, st("p2"), 0.3) > 0.5 ? "1918 + 25 = 1943" : "1918 + 25 = ?", W / 2, 810, 70, { opacity: pq, fill: prog(t, st("p2"), 0.3) > 0.5 ? HL : C.ink });
    turn(gp, t, S, "p1", "hvaða ár?");
  }
}

function sceneNeutral(t) {
  const g = sceneGroup(t, st("h1"), st("b1"));
  if (!g) return;
  line1944(g, t);
  if (t < st("h4")) {
    header(g, "Hlutleysi", t, st("h1"));
    // h2: no army; h3: stands with no one
    const p2 = prog(t, st("h2"), 0.5);
    if (p2 > 0) {
      poly(g, [[260, 470], [380, 410], [560, 420], [650, 480], [620, 560], [440, 590], [300, 560]], "#F3D7A0", { stroke: C.ink, sw: 5, opacity: p2 });
      text(g, "Ísland", 460, 500, 50, { opacity: p2 });
      soldier(g, 900, 620, 1.1, "#9AA3B0", p2 * 0.6);
      if (t > mid("h2", 0.3)) { el("line", { x1: 830, y1: 380, x2: 970, y2: 640, stroke: "#B0563F", "stroke-width": 10, opacity: prog(t, mid("h2", 0.3), 0.3) }, g); }
      label(g, "enginn her", 900, 720, 44, { p: prog(t, mid("h2", 0.3), 0.4), fill: "#FFFFFF" });
    }
    const p3 = prog(t, st("h3"), 0.5);
    if (p3 > 0) {
      soldier(g, 1300, 640, 1, UK, p3); soldier(g, 1700, 640, 1, DE, p3);
      el("line", { x1: 1370, y1: 520, x2: 1630, y2: 520, stroke: "#B0563F", "stroke-width": 6, "stroke-dasharray": "14 10", opacity: p3 }, g);
      label(g, "hlutlaust: með engum", 1500, 300, 46, { p: prog(t, mid("h3", 0.4), 0.4), fill: C.hlTint, stroke: HL });
    }
    return;
  }
  // h4–h8 on the map
  const hiDK = t > st("h5");
  map(g, t, prog(t, st("h4"), 0.6), { dk: hiDK, de: t > st("h4") });
  label(g, "1939: seinni heimsstyrjöldin", W / 2, 90, 46, { p: prog(t, st("h4"), 0.5) * (1 - prog(t, st("h5"), 0.4)), fill: "#FFFFFF" });
  if (t > st("h5")) {
    arrow(g, 1520, 700, 1475, 600, prog(t, mid("h5", 0.4), 0.5), DE, "deDK");
    label(g, "9. apríl 1940", W / 2, 90, 46, { p: prog(t, st("h5"), 0.4), fill: "#FFFFFF" });
  }
  if (t > st("h6")) label(g, "hernám", 1640, 470, 50, { p: prog(t, st("h6"), 0.4), fill: C.hlTint, stroke: HL });
  const p7 = prog(t, st("h7"), 0.5);
  if (p7 > 0) {
    crown(g, 1120, 300, 0.7, p7 * (1 - prog(t, mid("h7", 0.5), 0.6)));
    const cx = lerp(1460, 915, prog(t, mid("h7", 0.5), 1.2)), cy = lerp(560, 230, prog(t, mid("h7", 0.5), 1.2));
    crown(g, cx, cy, 0.6, prog(t, mid("h7", 0.5), 0.4));
    label(g, "Alþingi tekur við konungsvaldi", 560, 210, 40, { p: prog(t, mid("h7", 0.7), 0.4), fill: "#FFFFFF" });
  }
  const p8 = prog(t, st("h8"), 0.5);
  if (p8 > 0) {
    arrow(g, 1150, 520, 990, 380, p8, UK, "ukOffer");
    label(g, "Bretar: við verjum ykkur", 1150, 470, 38, { p: p8, fill: "#FFFFFF", stroke: UK });
    label(g, "nei", 820, 470, 44, { p: prog(t, mid("h8", 0.5), 0.4), fill: "#FFFFFF" });
  }
}

function sceneOccupation(t) {
  const g = sceneGroup(t, st("b1"), st("l1"));
  if (!g) return;
  line1944(g, t);
  if (t < st("b3")) {
    harbour(g, t, "b1", 1);
    label(g, "10. maí 1940", 300, 140, 52, { p: prog(t, st("b1"), 0.5), fill: "#FFFFFF" });
    if (t > st("b2")) label(g, "breskir hermenn", 860, 330, 50, { p: prog(t, st("b2"), 0.4), fill: "#FFFFFF", stroke: UK, color: UK });
    if (t > mid("b2", 0.5)) label(g, "hernám", 860, 430, 50, { p: prog(t, mid("b2", 0.5), 0.4), fill: C.hlTint, stroke: HL });
    return;
  }
  if (t < st("b5")) {
    map(g, t, 1, { is: true, uk: true, de: true });
    const p3 = prog(t, mid("b3", 0.4), 0.6);
    if (p3 > 0) { el("line", { x1: 300, y1: 420, x2: 1250, y2: 560, stroke: HL, "stroke-width": 6, "stroke-dasharray": "16 12", opacity: p3 }, g); label(g, "á milli Ameríku og Evrópu", 700, 180, 44, { p: p3, fill: "#FFFFFF" }); }
    const p4 = prog(t, st("b4"), 0.5);
    if (p4 > 0) {
      arrow(g, 1190, 500, 960, 360, p4, UK, "ukIS");
      arrow(g, 1500, 640, 1010, 330, prog(t, mid("b4", 0.5), 0.5), DE, "deIS");
      text(g, "?", 1250, 400, 70, { fill: DE, opacity: prog(t, mid("b4", 0.5), 0.5) });
      label(g, "verða á undan", 1170, 860, 44, { p: prog(t, mid("b4", 0.4), 0.4), fill: "#FFFFFF", stroke: UK, color: UK });
    }
    return;
  }
  if (t < st("p3") - 0.3) {
    // b5: no shot fired; b6: the radio speech
    const p5 = prog(t, st("b5"), 0.5) * (1 - prog(t, st("b6"), 0.4));
    if (p5 > 0) { label(g, "engin mótspyrna", W / 2, 380, 56, { p: p5, fill: "#FFFFFF" }); label(g, "ekkert skot", W / 2, 520, 56, { p: prog(t, mid("b5", 0.5), 0.4) * p5, fill: "#FFFFFF" }); }
    const p6 = prog(t, st("b6"), 0.5);
    if (p6 > 0) {
      radio(g, 620, 520, p6);
      for (let i = 0; i < 3; i++) { const ph = (t * 0.8 + i / 3) % 1; el("path", { d: `M ${760 + ph * 120} ${470} q 30 50 0 100`, fill: "none", stroke: C.soft, "stroke-width": 6, opacity: (1 - ph) * p6 }, g); }
      label(g, "Hermann Jónasson, forsætisráðherra", 1300, 380, 42, { p: prog(t, mid("b6", 0.2), 0.4), fill: "#FFFFFF" });
      label(g, "lítið á hermennina sem gesti", 1300, 520, 46, { p: prog(t, mid("b6", 0.6), 0.4), fill: C.hlTint, stroke: HL });
    }
    return;
  }
  // p3–p4
  map(g, t, 0.9, { is: true });
  tryBadge(g, t, st("p3"));
  turn(g, t, S, "p3", "af hverju?");
  if (t > st("p4")) {
    el("line", { x1: 300, y1: 420, x2: 1250, y2: 560, stroke: HL, "stroke-width": 6, "stroke-dasharray": "16 12", opacity: prog(t, st("p4"), 0.4) }, g);
    label(g, "staðsetningin", 700, 260, 46, { p: prog(t, st("p4"), 0.4), fill: C.hlTint, stroke: HL });
    label(g, "á undan Þjóðverjum", 1250, 260, 46, { p: prog(t, mid("p4", 0.5), 0.4), fill: C.hlTint, stroke: HL });
    check(g, 1640, 260, prog(t, mid("p4", 0.7), 0.4), 0.8);
  }
}

function sceneLife(t) {
  const g = sceneGroup(t, st("l1"), st("y1"));
  if (!g) return;
  line1944(g, t);
  if (t < st("l5")) {
    header(g, "Hvernig breyttist lífið?", t, st("l1"));
    el("rect", { x: 0, y: 760, width: W, height: 120, fill: "#C9D6B4" }, g);
    const p2 = prog(t, st("l2"), 0.6);
    if (p2 > 0) {
      for (let i = 0; i < 4; i++) braggi(g, 140 + i * 300, 760, 260, prog(t, st("l2") + i * 0.3, 0.4));
      label(g, "braggi úr bárujárni", 560, 560, 44, { p: prog(t, mid("l2", 0.6), 0.4), fill: "#FFFFFF" });
      label(g, "um 25.000 breskir hermenn", 560, 300, 44, { p: prog(t, mid("l2", 0.15), 0.4), fill: "#FFFFFF", stroke: UK, color: UK });
    }
    const p3 = prog(t, st("l3"), 0.5);
    if (p3 > 0) {
      el("rect", { x: 1350, y: 790, width: 540, height: 40, fill: "#6B7385", opacity: p3 }, g);
      for (let i = 0; i < 6; i++) el("rect", { x: 1370 + i * 90, y: 806, width: 50, height: 8, fill: "#FFFFFF", opacity: p3 }, g);
      plane(g, 1640, 720, 1.2, prog(t, mid("l3", 0.4), 0.4));
      soldier(g, 1380, 790, 0.7, "#8A6E4B", p3); soldier(g, 1460, 790, 0.7, "#8A6E4B", p3);
      label(g, "vinna: braggar, vegir, flugvellir", 1500, 560, 40, { p: p3, fill: "#FFFFFF" });
      label(g, "atvinnuleysi hvarf", 1500, 460, 44, { p: prog(t, mid("l3", 0.7), 0.4), fill: C.hlTint, stroke: HL });
    }
    const p4 = prog(t, st("l4"), 0.5);
    if (p4 > 0) {
      const gf = el("g", { opacity: p4 }, g);
      el("ellipse", { cx: 980, cy: 360, rx: 90, ry: 40, fill: "#8FA9C4", stroke: C.ink, "stroke-width": 4 }, gf);
      el("path", { d: "M 1065 360 L 1120 320 L 1120 400 Z", fill: "#8FA9C4", stroke: C.ink, "stroke-width": 4 }, gf);
      arrow(gf, 1180, 410, 1180, 290, prog(t, mid("l4", 0.3), 0.4), HL, "price");
      label(gf, "verð á fiski margfaldaðist", 1060, 230, 40, { fill: "#FFFFFF" });
    }
    return;
  }
  // l5–l6: Americans by agreement; then the try
  const isTry = t > st("p5") - 0.3;
  if (!isTry) {
    header(g, "Sumarið 1941", t, st("l5"));
    for (let i = 0; i < 5; i++) soldier(g, 260 + i * 110, 700, 0.9, US, prog(t, mid("l5", 0.3) + i * 0.15, 0.4));
    label(g, "Bandaríkjamenn", 480, 340, 46, { p: prog(t, mid("l5", 0.4), 0.4), fill: "#FFFFFF", stroke: US, color: US });
    const p6 = prog(t, st("l6"), 0.5);
    if (p6 > 0) {
      put(g, rect(360, 420, { stroke: C.ink, strokeWidth: 4, fill: "#FFFFFF", fillStyle: "solid", roughness: 1 }, "agree"), 1100, 300, 1, p6);
      text(g, "samningur", 1280, 360, 40, { opacity: p6 });
      for (let i = 0; i < 4; i++) el("line", { x1: 1150, y1: 430 + i * 50, x2: 1410, y2: 430 + i * 50, stroke: C.soft, "stroke-width": 5, opacity: p6 }, g);
      el("path", { d: "M 1160 660 q 30 -30 60 0 q 30 30 60 0", fill: "none", stroke: IS_BLUE, "stroke-width": 5, opacity: p6 }, g);
      el("path", { d: "M 1300 660 q 30 -30 60 0 q 30 30 60 0", fill: "none", stroke: US, "stroke-width": 5, opacity: p6 }, g);
      label(g, "ekki hernám", 1280, 800, 50, { p: prog(t, mid("l6", 0.5), 0.4), fill: C.hlTint, stroke: HL });
    }
    return;
  }
  tryBadge(g, t, st("p5"));
  const pc = prog(t, st("p5"), 0.5), ans = t > st("p6");
  const cards = [{ x: 330, w: "Bretar 1940", c: UK, right: true }, { x: 1070, w: "Bandaríkjamenn 1941", c: US, right: false }];
  cards.forEach((cd, i) => {
    const on = ans && cd.right;
    put(g, rect(520, 300, { stroke: on ? HL : cd.c, strokeWidth: on ? 9 : 6, fill: on ? C.hlTint : "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "occ" + i + (on ? "a" : "")), cd.x, 330, 1, pc);
    text(g, cd.w, cd.x + 260, 400, 46, { opacity: pc, fill: cd.c });
    for (let k = 0; k < 3; k++) soldier(g, cd.x + 150 + k * 110, 600, 0.6, cd.c, pc);
    if (ans) label(g, cd.right ? "án samþykkis: hernám" : "með samningi", cd.x + 260, 700, 40, { p: prog(t, st("p6") + i * 0.8, 0.4), fill: "#FFFFFF" });
  });
  if (ans) check(g, 860, 360, prog(t, st("p6") + 0.3, 0.4), 0.9);
  turn(g, t, S, "p5", "hvor?");
}

function sceneRepublic(t) {
  const g = sceneGroup(t, st("y1"), st("t1"));
  if (!g) return;
  line1944(g, t);
  if (t < st("y3")) {
    header(g, "Lýðveldi", t, st("y1"));
    const p2 = prog(t, st("y2"), 0.5);
    if (p2 > 0) {
      crown(g, 560, 480, 1.1, p2);
      el("line", { x1: 440, y1: 380, x2: 680, y2: 580, stroke: "#B0563F", "stroke-width": 12, opacity: prog(t, mid("y2", 0.2), 0.3) }, g);
      label(g, "enginn konungur", 560, 680, 46, { p: prog(t, mid("y2", 0.2), 0.4), fill: "#FFFFFF" });
      ballotBox(g, 1320, 600, prog(t, mid("y2", 0.5), 0.4), prog(t, mid("y2", 0.6), 0.8));
      label(g, "forseti kosinn", 1320, 680, 46, { p: prog(t, mid("y2", 0.7), 0.4), fill: C.hlTint, stroke: HL });
    }
    return;
  }
  if (t < st("y6")) {
    // y3: waiting while Denmark was occupied; y4–y5: the vote
    const p3 = prog(t, st("y3"), 0.5) * (1 - prog(t, st("y4"), 0.4));
    if (p3 > 0) {
      flagDK(g, 300, 340, 260, p3);
      soldier(g, 680, 640, 1, DE, p3);
      label(g, "Danmörk enn hernumin", 520, 760, 44, { p: p3, fill: "#FFFFFF" });
      label(g, "bíða til 1944", 1300, 500, 56, { p: prog(t, mid("y3", 0.6), 0.4) * p3, fill: C.hlTint, stroke: HL });
    }
    const p4 = prog(t, st("y4"), 0.5);
    if (p4 > 0) {
      ballotBox(g, 520, 700, p4, prog(t, mid("y4", 0.2), 1.0));
      label(g, "maí 1944", 520, 280, 46, { p: p4, fill: "#FFFFFF" });
      label(g, "þjóðaratkvæðagreiðsla", 1250, 300, 48, { p: prog(t, mid("y4", 0.7), 0.4), fill: C.hlTint, stroke: HL });
    }
    const p5 = prog(t, st("y5"), 0.5);
    if (p5 > 0) {
      // 100 squares, 97 marked "já"
      for (let i = 0; i < 100; i++) { const x = 950 + (i % 20) * 40, y = 420 + Math.floor(i / 20) * 40; el("rect", { x, y, width: 32, height: 32, rx: 4, fill: i < 97 ? HL : "#C9CED6", opacity: prog(t, mid("y5", 0.5) + i * 0.01, 0.3) }, g); }
      label(g, "97 af hverjum 100 sögðu já", 1340, 700, 44, { p: prog(t, mid("y5", 0.7), 0.4), fill: "#FFFFFF" });
    }
    return;
  }
  if (t < st("p7") - 0.3) {
    // y6–y7: Þingvellir in heavy rain
    el("rect", { x: 0, y: 0, width: W, height: 880, fill: "#D7DCE2" }, g);
    el("path", { d: "M 0 300 L 500 220 L 900 260 L 900 880 L 0 880 Z", fill: "#7D776E" }, g);       // Almannagjá wall
    el("rect", { x: 0, y: 760, width: W, height: 120, fill: "#8FA27A" }, g);
    el("line", { x1: 1100, y1: 760, x2: 1100, y2: 360, stroke: C.ink, "stroke-width": 8 }, g);
    flagIS(g, 1104, 360, 220, 1);
    for (let i = 0; i < 14; i++) { const x = 300 + i * 100; el("path", { d: `M ${x - 45} ${720} Q ${x} ${660} ${x + 45} ${720} Z`, fill: ["#2A3346", "#5A3E36", "#3E6E9E"][i % 3] }, g); el("line", { x1: x, y1: 720, x2: x, y2: 770, stroke: C.ink, "stroke-width": 4 }, g); }
    for (let i = 0; i < 60; i++) { const ph = (t * 1.4 + i / 60) % 1, x = (i * 97) % W; el("line", { x1: x, y1: ph * 900, x2: x - 10, y2: ph * 900 + 30, stroke: "#7FA3C7", "stroke-width": 3 }, g); }
    label(g, "17. júní 1944 · Þingvellir", W / 2, 120, 50, { p: prog(t, st("y6"), 0.5), fill: "#FFFFFF" });
    label(g, "lýðveldi stofnað", 1450, 260, 50, { p: prog(t, mid("y6", 0.4), 0.4), fill: C.hlTint, stroke: HL });
    if (t > st("y7")) label(g, "fyrsti forseti: Sveinn Björnsson", 1300, 560, 46, { p: prog(t, st("y7"), 0.4), fill: "#FFFFFF" });
    return;
  }
  // p7–p8: 1918 vs 1944
  tryBadge(g, t, st("p7"));
  const pc = prog(t, st("p7"), 0.5), ans = t > st("p8");
  [[330, "1918", "fullveldi"], [1070, "1944", "lýðveldi"]].forEach(([x, yr, w], i) => {
    put(g, rect(520, 420, { stroke: C.ink, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "cmp" + i), x, 280, 1, pc);
    text(g, yr + ": " + w, x + 260, 340, 50, { opacity: pc });
    if (ans) {
      const p = prog(t, mid("p8", i * 0.5), 0.4);
      if (i === 0) { crown(g, x + 260, 500, 0.8, p); label(g, "ráða sjálf · enn konungur", x + 260, 640, 36, { p, fill: "#FFFFFF" }); }
      else { ballotBox(g, x + 260, 580, p, 1); label(g, "enginn konungur · forseti", x + 260, 640, 36, { p, fill: C.hlTint, stroke: HL }); }
    }
  });
  turn(g, t, S, "p7", "munurinn?");
}

function sceneBack(t) {
  const g = sceneGroup(t, st("t1"), st("q1"));
  if (!g) return;
  header(g, "Manstu morguninn?", t, st("t1"));
  const items = [
    { w: "stríðið", at: st("t2"), x: 140 },
    { w: "Danmörk hernumin", at: mid("t2", 0.25), x: 520 },
    { w: "Íslendingar stjórna sjálfir", at: mid("t2", 0.6), x: 980 },
    { w: "1944: lýðveldi", at: mid("t3", 0.4), x: 1500 },
  ];
  items.forEach((it, i) => {
    const p = prog(t, it.at, 0.5);
    if (p <= 0) return;
    const on = i === items.length - 1, y = 290 + i * 160;
    label(g, it.w, 760, y, 48, { p, fill: on ? C.hlTint : "#FFFFFF", stroke: on ? HL : C.ink });
    if (i > 0) arrow(g, 760, y - 120, 760, y - 45, p, C.soft, "back" + i);
  });
  if (t > mid("t3", 0.4)) flagIS(g, 1250, 600, 300, prog(t, mid("t3", 0.4), 0.5));
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
    put(g, drawOn(rect(sw, sh, { stroke: asked ? C.hl : C.ink, strokeWidth: asked && !ans ? 8 : 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.2 }, "hslot" + i + (asked ? "a" : "")), inP), s.x, sy);
    el("circle", { cx: s.x + 50, cy: sy + 50, r: 34, fill: asked ? C.hl : C.ink, opacity: inP }, g);
    text(g, String(i + 1), s.x + 50, sy + 52, 44, { fill: "#FFF", opacity: inP });
    const cx = s.x + sw / 2;
    if (asked && ans < 1) text(g, "?", cx, sy + sh / 2, 200, { fill: C.hl, opacity: 1 - ans });
    if (ans <= 0) return;
    const ga = el("g", { opacity: ans }, g);
    if (i === 0) { text(ga, "1918", cx, sy + 250, 110, { fill: HL }); text(ga, "fullveldi", cx, sy + 400, 50); }
    else if (i === 1) { for (let k = 0; k < 3; k++) soldier(ga, s.x + 140 + k * 100, sy + 330, 0.7, UK); text(ga, "hernám", cx, sy + 420, 56); }
    else { flagIS(ga, cx - 110, sy + 140, 220); text(ga, "17. júní 1944", cx, sy + 370, 46, { fill: HL }); text(ga, "Þingvellir", cx, sy + 440, 46); }
  });
  ["q2", "q4", "q6"].forEach((q) => turn(g, t, S, q));
}

function sceneTask(t) {
  const g = sceneGroup(t, st("w1"), TL.duration + 5);
  if (!g) return;
  header(g, "Verkefni heima", t, st("w1"));
  label(g, "Styrjaldir og kreppa · bls. 133", W / 2, 250, 40, { p: prog(t, st("w1") + 0.4, 0.5), fill: "#FFFFFF" });
  const p = prog(t, st("w2"), 0.5);
  if (p > 0) {
    [[330, "Bretar 1940", UK], [1070, "Bandaríkjamenn 1941", US]].forEach(([x, w, c], i) => {
      put(g, rect(520, 380, { stroke: c, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.1 }, "task" + i), x, 360, 1, p);
      text(g, w, x + 260, 430, 44, { opacity: p, fill: c });
      for (let k = 0; k < 3; k++) soldier(g, x + 150 + k * 110, 660, 0.6, c, p);
    });
    text(g, "?", W / 2, 560, 120, { fill: HL, opacity: prog(t, mid("w2", 0.5), 0.4) });
  }
}

export function render(t) {
  root.replaceChildren();
  sceneTitle(t);
  sceneHook(t);
  sceneSovereignty(t);
  sceneNeutral(t);
  sceneOccupation(t);
  sceneLife(t);
  sceneRepublic(t);
  sceneBack(t);
  sceneRecap(t);
  sceneTask(t);
  text(root, TL.series_tag, 48, 52, 30, { anchor: "start", fill: C.soft, weight: 400 });
}
