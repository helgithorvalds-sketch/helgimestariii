import { W, H, C, FRIENDS, clamp, ease, prog, st, en, mid, lerp, el, put, drawOn, rect, line, circle, poly, path, text, frac, label, arrow, check, piece, bar, friend, pizza, card, think, header, sceneGroup, S, TL, root } from "/lib.js";
export { init } from "/lib.js";

// ---------- scenes ----------
function sceneTitle(t) {
  const g = sceneGroup(t, 0.35, st("k1") + 0.1);
  if (!g) return;
  frac(g, W / 2 - 260, 470, "1", "4", 150, { p: prog(t, 0.4, 0.9) });
  text(g, "?", W / 2, 490, 170, { fill: C.hl, opacity: prog(t, 0.9, 0.5) });
  frac(g, W / 2 + 260, 470, "1", "8", 150, { p: prog(t, 0.7, 0.9) });
  text(g, "Brot", W / 2, 820, 96, { opacity: prog(t, 1.0, 0.6) });
}

function sceneHook(t) {
  const g = sceneGroup(t, st("k1"), st("h1"));
  if (!g) return;
  const bw = 760, bh = 230;
  const bx = W / 2 - bw / 2, by = 170;
  bar(g, bx, by, bw, bh, 1, { p: prog(t, st("k1"), 1.1) });
  const cy = 520;
  card(g, 330, cy, 460, 360, C.green, C.greenTint, { p: prog(t, st("k2"), 0.6) });
  frac(g, 560, cy + 150, "1", "4", 130, { p: prog(t, st("k2") + 0.3, 0.6) });
  card(g, 1130, cy, 460, 360, C.blue, C.blueTint, { p: prog(t, mid("k2", 0.5), 0.6) });
  frac(g, 1360, cy + 150, "1", "8", 130, { p: prog(t, mid("k2", 0.5) + 0.3, 0.6) });
  text(g, "?", W / 2, cy + 170, 170, { fill: C.hl, opacity: prog(t, st("k3"), 0.4) });
  think(g, t, S.k4.think_start - 0.6, S.k4.think_end + 0.1);
}

function sceneParts(t) {
  const g = sceneGroup(t, st("h1"), st("e1"));
  if (!g) return;
    const fx = 520, fy = 520, fs = 190;
  const hlDen = prog(t, st("h3"), 0.4) * (1 - prog(t, st("h5"), 0.4));
  const hlNum = prog(t, st("h5"), 0.4);
  frac(g, fx, fy, "1", "4", fs, { p: prog(t, st("h2"), 0.9), hlDen, hlNum });
  // the two words, as pills next to the number they name
  const top = { x: 1000, y: 395 }, bot = { x: 1000, y: 735 };
  label(g, "nefnari", bot.x + 30, bot.y, 60, { p: prog(t, st("h3") + 0.2, 0.6), fill: C.hlTint });
  if (t > st("h3")) arrow(g, bot.x - 140, bot.y, fx + 120, fy + 105, prog(t, st("h3") + 0.5, 0.5), C.hl, "an");
  label(g, "teljari", top.x + 30, top.y, 60, { p: prog(t, st("h5") + 0.2, 0.6), fill: C.hlTint });
  if (t > st("h5")) arrow(g, top.x - 130, top.y, fx + 110, fy - 95, prog(t, st("h5") + 0.5, 0.5), C.hl, "at");
  // the bar: cut into 4 while "við skiptum" is said, then one piece is "yours"
  const bx = 1290, by = 470, bw = 520, bh = 180;
  const showBar = prog(t, st("h4") - 0.2, 0.5);
  if (showBar > 0) {
    const cut = prog(t, mid("h4", 0.35), 1.2);
    const lift = prog(t, mid("h6", 0.45), 0.6);
    const g2 = el("g", { opacity: showBar }, g);
    bar(g2, bx, by, bw, bh, 4, { cut, hl: lift > 0 ? [0] : [], dimOthers: lift > 0.5, offsets: { 0: [0, -40 * lift] } });
    for (let i = 0; i < 4; i++) {
      const cp = prog(t, mid("h4", 0.35) + 0.32 * i + 0.3, 0.3);
      text(g2, String(i + 1), bx + bw / 8 + (bw / 4) * i, by + bh + 60, 48, { fill: C.soft, opacity: cp * (1 - lift * 0.8) });
    }
  }
}

function sceneHard(t) {
  const g = sceneGroup(t, st("e1"), st("n1"));
  if (!g) return;
  // e1–e3: the wrong idea, shown in a thought cloud, then popped
  const wrongOut = prog(t, st("e3") + 0.2, 0.5);
  if (t < st("e4")) {
    const gw = el("g", { opacity: 1 - wrongOut }, g);
    friend(gw, 560, 650, 1.6, FRIENDS[4], { smile: 0.4 });
    const cl = prog(t, st("e1"), 0.6);
    put(gw, drawOn(path("M 820 470 C 760 420 780 300 880 300 C 900 210 1060 200 1100 260 C 1180 200 1330 240 1320 330 C 1420 360 1400 500 1300 500 C 1270 580 1100 580 1060 520 C 980 580 840 560 820 470 Z",
      { stroke: C.ink, strokeWidth: 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.3 }, "cloud"), cl));
    el("circle", { cx: 760, cy: 520, r: 18, fill: "#FFF", stroke: C.ink, "stroke-width": 4, opacity: cl }, gw);
    el("circle", { cx: 715, cy: 560, r: 11, fill: "#FFF", stroke: C.ink, "stroke-width": 4, opacity: cl }, gw);
    frac(gw, 960, 400, "1", "8", 100, { p: prog(t, st("e1") + 0.4, 0.5) });
    text(gw, ">", 1070, 400, 100, { opacity: prog(t, st("e1") + 0.7, 0.4) });
    frac(gw, 1180, 400, "1", "4", 100, { p: prog(t, st("e1") + 0.9, 0.5) });
    // e2: "8 is a bigger number than 4"
    const e2 = prog(t, st("e2"), 0.5);
    if (e2 > 0) {
      text(gw, "8", 1450, 700, 120 + 120 * e2, { fill: C.blue, opacity: e2 });
      text(gw, "4", 1700, 720, 120, { fill: C.green, opacity: e2 });
    }
    // e3: "but let's look at what really happens" – cross the wrong claim out
    if (t > st("e3")) put(gw, drawOn(line(880, 470, 1300, 300, { stroke: C.hl, strokeWidth: 12, roughness: 1.5 }, "x1"), prog(t, st("e3"), 0.4)));
  }
  // e4 onwards: the same bar shared by 4 friends, then by 8
  if (t >= st("e4") - 0.3 && t < st("e10")) {
    const g2 = el("g", { opacity: prog(t, st("e4") - 0.3, 0.4) * (1 - prog(t, st("e10") - 0.55, 0.4)) }, g);
    const bw = 720, bh = 220, bx = W / 2 - bw / 2, by = 150;
    const eight = t >= st("e6");
    const walkIn = prog(t, st("e6"), 1.4);
    const n4 = 4;
    const fy = 760;
    // friend positions: 4 spread out; when 4 more arrive everyone squeezes up
    const pos4 = (i) => 330 + i * 420;
    const pos8 = (i) => 180 + i * 223;
    for (let i = 0; i < 8; i++) {
      if (i >= 4 && !eight) continue;
      let x, s;
      if (i < 4) { x = lerp(pos4(i), pos8(i), eight ? walkIn : 0); s = lerp(1.25, 0.95, eight ? walkIn : 0); }
      else { x = lerp(W + 200 + (i - 4) * 220, pos8(i), walkIn); s = 0.95; }
      friend(g2, x, fy, s, FRIENDS[i], { smile: 1 });
    }
    // phase A: 4 pieces
    if (t < st("e7")) {
      const cut = prog(t, mid("e4", 0.55), 1.0);
      const give = prog(t, st("e5"), 1.0);
      const back = prog(t, st("e7") - 0.6, 0.5);
      const offsets = {};
      for (let i = 0; i < n4; i++) {
        const tx = pos4(i) - (bx + (bw / 4) * i + bw / 8), ty = fy - 250 - by - bh / 2;
        offsets[i] = [tx * give * (1 - back), ty * give * (1 - back)];
      }
      bar(g2, bx, by, bw, bh, 4, { cut, offsets, hl: give > 0.9 ? [0] : [], p: prog(t, st("e4"), 0.6) });
      if (give > 0.9) frac(g2, pos4(0), fy - 450, "1", "4", 80, { p: prog(t, mid("e5", 0.6), 0.5), color: C.hl });
    } else {
      // phase B: the same bar, 8 pieces
      const cut = prog(t, st("e8") + 0.2, 1.3);
      const give = prog(t, st("e9"), 1.0);
      const offsets = {};
      for (let i = 0; i < 8; i++) {
        const tx = pos8(i) - (bx + (bw / 8) * i + bw / 16), ty = fy - 200 - by - bh / 2;
        offsets[i] = [tx * give, ty * give];
      }
      bar(g2, bx, by, bw, bh, 8, { cut: t < st("e8") ? 0 : cut, offsets, hl: give > 0.9 ? [0] : [] });
      if (t >= st("e7") && t < st("e8")) label(g2, "sama plata", W / 2, by + bh + 80, 50, { p: prog(t, mid("e7", 0.5), 0.5) });
      if (give > 0.9) frac(g2, pos8(0), fy - 380, "1", "8", 70, { p: prog(t, mid("e9", 0.6), 0.5), color: C.hl });
    }
  }
  // e10–e12: compare one piece of each, then the rule in one picture
  if (t >= st("e10") - 0.1) {
    const g3 = el("g", { opacity: prog(t, st("e10") - 0.1, 0.4) }, g);
    const pw4 = 280, pw8 = 140, ph = 340;
    const lx = 840, rx = 1300, py = 260;
    const ruleIn = prog(t, st("e12"), 0.5);
    const g4 = el("g", { opacity: 1 - ruleIn }, g3);
    const slide = prog(t, mid("e11", 0.3), 1.2);
    piece(g4, lx - pw4 / 2, py, pw4, ph, { hl: 1, k: "cmp4", opacity: lerp(1, 0.38, slide) });
    frac(g4, lx, py + ph + 130, "1", "4", 90);
    const x8 = lerp(rx - pw8 / 2, lx - pw4 / 2, slide);
    if (slide > 0.95) put(g4, rect(pw8, ph, { stroke: C.ink, strokeWidth: 4, strokeLineDash: [14, 12], roughness: 1 }, "ghost"), lx, py, 1, prog(t, mid("e11", 0.3) + 1.2, 0.4));
    piece(g4, x8, py + (slide > 0 ? 0 : 0), pw8, ph, { hl: 1, k: "cmp8" });
    frac(g4, lerp(rx, lx - pw4 / 2 + pw8 / 2, slide), lerp(py + ph + 130, py - 120, slide), "1", "8", 90, { opacity: 1 });
    if (slide > 0.95) label(g4, "helmingur", lx + 360, py + ph / 2, 56, { p: prog(t, mid("e11", 0.3) + 1.3, 0.5), fill: C.hlTint });
    // rule picture: many friends -> small piece
    if (ruleIn > 0) {
      const g5 = el("g", { opacity: ruleIn }, g3);
      for (let i = 0; i < 4; i++) friend(g5, 200 + i * 120, 470, 0.55, FRIENDS[i]);
      for (let i = 0; i < 8; i++) friend(g5, 1080 + i * 95, 470, 0.45, FRIENDS[i]);
      arrow(g5, 430, 600, 430, 700, prog(t, st("e12") + 0.3, 0.4), C.ink, "r1");
      arrow(g5, 1410, 600, 1410, 700, prog(t, mid("e12", 0.5), 0.4), C.ink, "r2");
      piece(g5, 430 - 90, 740, 180, 160, { hl: 1, k: "rb4" });
      piece(g5, 1410 - 45, 740, 90, 160, { hl: 1, k: "rb8" });
      label(g5, "fleiri", 1410, 300, 56, { p: prog(t, st("e12") + 0.2, 0.5), fill: C.hlTint });
      label(g5, "minni biti", 1410 + 330, 820, 52, { p: prog(t, mid("e12", 0.6), 0.5), fill: C.hlTint });
    }
  }
}

function choiceCards(g, t, a, n1, n2, opts = {}) {
  const cy = 300, cw = 600, ch = 520, lx = 260, rx = 1060;
  const glowL = opts.glowL ?? 0, dimR = opts.dimR ?? 0;
  card(g, lx, cy, cw, ch, C.green, C.greenTint, { p: prog(t, a, 0.6), glow: glowL });
  card(g, rx, cy, cw, ch, C.blue, C.blueTint, { p: prog(t, a + 0.3, 0.6), opacity: 1 - 0.15 * dimR });
  frac(g, lx + cw / 2, cy + 150, "1", n1, 120, { p: prog(t, a + 0.3, 0.6) });
  frac(g, rx + cw / 2, cy + 150, "1", n2, 120, { p: prog(t, a + 0.6, 0.6) });
  if (opts.bars) {
    const bp = prog(t, opts.barsAt ?? a + 0.8, 0.6);
    bar(g, lx + 60, cy + 360, cw - 120, 110, +n1, { hl: [0], dimOthers: true, opacity: bp });
    bar(g, rx + 60, cy + 360, cw - 120, 110, +n2, { hl: [0], dimOthers: true, opacity: bp });
  }
  return { lx, rx, cy, cw, ch };
}

function turnBadge(g, t, a) {
  const p = prog(t, a, 0.5);
  if (p <= 0) return;
  label(g, "Nú þú!", W / 2, 150, 70, { p, fill: C.hlTint, stroke: C.hl });
}

function sceneTurn1(t) {
  const g = sceneGroup(t, st("n1"), st("r1"));
  if (!g) return;
  turnBadge(g, t, st("n1"));
  if (t < st("n2") - 0.3) {
    const op = 1 - prog(t, st("n2") - 0.6, 0.3);
    const gm = el("g", { opacity: op }, g);
    put(gm, rect(260, 260, { stroke: C.ink, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.4 }, "bigmouth"), W / 2 - 130, 420);
    const open = 0.5 + 0.5 * Math.abs(Math.sin((t - st("n1")) * 5));
    el("ellipse", { cx: W / 2, cy: 550, rx: 70, ry: 20 + 40 * open, fill: C.ink }, gm);
    return;
  }
  const answer = prog(t, st("n5"), 0.5);
  const c = choiceCards(g, t, st("n2"), "3", "6", { bars: true, glowL: answer, dimR: answer * 0.0 });
  // colour words under the cards while n3 is said
  label(g, "græna", c.lx + c.cw / 2, c.cy + c.ch + 70, 50, { p: prog(t, mid("n3", 0.1), 0.4), fill: C.greenTint, stroke: C.green });
  label(g, "bláa", c.rx + c.cw / 2, c.cy + c.ch + 70, 50, { p: prog(t, mid("n3", 0.4), 0.4), fill: C.blueTint, stroke: C.blue });
  // pause sign while "you may pause"
  const ps = prog(t, st("n4"), 0.4) * (1 - prog(t, S.n4.think_start, 0.3));
  if (ps > 0) {
    const gp = el("g", { opacity: ps, transform: `translate(${W / 2} 560)` }, g);
    put(gp, circle(150, { stroke: C.ink, strokeWidth: 6, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.3 }, "pausec"));
    el("rect", { x: -30, y: -35, width: 20, height: 70, rx: 4, fill: C.ink }, gp);
    el("rect", { x: 10, y: -35, width: 20, height: 70, rx: 4, fill: C.ink }, gp);
  }
  think(g, t, S.n4.think_start, S.n4.think_end);
  if (answer > 0) check(g, c.lx + c.cw - 40, c.cy + 40, prog(t, st("n5") + 0.2, 0.5), 1.1);
  // n6–n7: "if you picked blue, you are in good company" – then why the pieces are smaller
  const comp = prog(t, st("n6"), 0.5) * (1 - prog(t, st("n7"), 0.4));
  if (comp > 0) for (let i = 0; i < 3; i++) friend(g, c.rx + 150 + i * 150, c.cy + c.ch + 30, 0.45, FRIENDS[i + 5], { opacity: comp });
  const why = prog(t, st("n7"), 0.5);
  if (why > 0) {
    put(g, rect(Math.round(c.cw / 6 + 24), 134, { stroke: C.hl, strokeWidth: 9, roughness: 1.6 }, "whyb"), c.rx + 48, c.cy + 348, 1, why);
    put(g, rect(Math.round(c.cw / 3 + 24), 134, { stroke: C.hl, strokeWidth: 9, roughness: 1.6 }, "whyg"), c.lx + 48, c.cy + 348, 1, prog(t, mid("n7", 0.6), 0.5));
  }
}

function sceneRule(t) {
  const g = sceneGroup(t, st("r1"), st("m1"));
  if (!g) return;
  if (t < st("r3")) {
    header(g, "Munum þetta", t, st("r1"), C.ink);
    // a ladder: as the bottom number grows, the piece shrinks
    const rows = [["2", 2], ["4", 4], ["8", 8]];
    rows.forEach(([d, n], i) => {
      const a = st("r2") + i * 0.7;
      const y = 300 + i * 230;
      frac(g, 520, y + 60, "1", d, 84, { p: prog(t, a, 0.5), hlDen: prog(t, a + 0.3, 0.4) });
      bar(g, 700, y, 720, 130, n, { hl: [0], dimOthers: true, opacity: prog(t, a + 0.2, 0.5) });
    });
    arrow(g, 1560, 300, 1560, 830, prog(t, mid("r2", 0.6), 0.6), C.hl, "ladder");
    label(g, "minni", 1700, 860, 50, { p: prog(t, mid("r2", 0.75), 0.4), fill: C.hlTint });
    return;
  }
  if (t < st("r7")) {
    // the same rule on a pizza: 2 people, then 10
    const p2 = prog(t, st("r4"), 0.6), p10 = prog(t, st("r5"), 0.6), same = prog(t, st("r6"), 0.5);
    const pzIn = prog(t, st("r3"), 0.6);
    const gl = el("g", { opacity: 1 - same }, g);
    pizza(gl, 560, 470, 250, t < st("r4") ? 1 : 2, { p: pzIn, hl: [0], push: 40 * p2 });
    if (p2 > 0) { friend(gl, 330, 880, 0.7, FRIENDS[0]); friend(gl, 790, 880, 0.7, FRIENDS[1]); frac(gl, 560, 860, "1", "2", 70, { p: prog(t, mid("r4", 0.6), 0.5), color: C.hl }); }
    if (p10 > 0) {
      pizza(gl, 1360, 470, 250, 10, { opacity: p10, hl: [0], push: 50 * prog(t, mid("r5", 0.5), 0.6), dimOthers: true });
      for (let i = 0; i < 10; i++) friend(gl, 1100 + i * 58, 900, 0.32, FRIENDS[i], { opacity: p10 });
      frac(gl, 1700, 300, "1", "10", 70, { p: prog(t, mid("r5", 0.7), 0.5), color: C.hl });
    }
    if (same > 0) {
      const gs = el("g", { opacity: same }, g);
      bar(gs, 230, 420, 640, 200, 8, { hl: [0], dimOthers: true });
      pizza(gs, 1380, 520, 230, 8, { hl: [0], push: 35, dimOthers: true });
      text(gs, "=", W / 2 + 20, 520, 140, { fill: C.hl });
      label(gs, "sama reglan", W / 2, 860, 56, { p: prog(t, mid("r6", 0.4), 0.5), fill: C.hlTint });
    }
    return;
  }
  // r7–r8: back to the opening question, with the answer
  const ans = prog(t, mid("r8", 0.1), 0.5);
  const c = choiceCards(g, t, st("r7"), "4", "8", { bars: true, barsAt: mid("r8", 0.2), glowL: ans });
  if (ans > 0) check(g, c.lx + c.cw - 40, c.cy + 40, prog(t, mid("r8", 0.15), 0.5), 1.1);
}

function sceneTurn2(t) {
  const g = sceneGroup(t, st("m1"), st("u1"));
  if (!g) return;
  turnBadge(g, t, st("m1"));
  if (t < st("m2") - 0.2) return;
  const ans = prog(t, st("m4"), 0.5);
  const c = choiceCards(g, t, st("m2"), "10", "100", { bars: t > st("m5"), barsAt: st("m5"), glowL: ans });
  think(g, t, S.m3.think_start, S.m3.think_end);
  if (ans > 0) check(g, c.lx + c.cw - 40, c.cy + 40, prog(t, st("m4") + 0.2, 0.5), 1.1);
  if (t > st("m5")) arrow(g, c.rx + 60 + 3, c.cy + 300, c.rx + 60 + 3, c.cy + 350, prog(t, mid("m5", 0.5), 0.4), C.hl, "sliver");
  if (t > st("m5")) label(g, "pínulítill moli", c.rx + c.cw / 2, c.cy + c.ch + 75, 48, { p: prog(t, mid("m5", 0.6), 0.5), fill: C.hlTint });
}

function sceneRecap(t) {
  const g = sceneGroup(t, st("u1"), st("a1"));
  if (!g) return;
  header(g, "Rifjum upp", t, st("u1"));
  const slots = [{ x: 140, q: "u2", a: "u3" }, { x: 720, q: "u4", a: "u5" }, { x: 1300, q: "u6", a: "u7" }];
  slots.forEach((s, i) => {
    const sw = 480, sh = 560, sy = 260;
    const inP = prog(t, st("u1") + 0.4 + i * 0.35, 0.5);
    const asked = t >= st(s.q), answered = prog(t, st(s.a), 0.5);
    put(g, drawOn(rect(sw, sh, { stroke: asked ? C.hl : C.ink, strokeWidth: asked && !answered ? 8 : 5, fill: "#FFFFFF", fillStyle: "solid", roughness: 1.3 }, "slot" + i + (asked ? "a" : "")), inP), s.x, sy);
    el("circle", { cx: s.x + 50, cy: sy + 50, r: 34, fill: asked ? C.hl : C.ink, opacity: inP }, g);
    text(g, String(i + 1), s.x + 50, sy + 52, 44, { fill: "#FFF", opacity: inP });
    const cx = s.x + sw / 2;
    if (asked && answered < 1) text(g, "?", cx, sy + sh / 2, 220, { fill: C.hl, opacity: 1 - answered });
    if (answered > 0) {
      const ga = el("g", { opacity: answered }, g);
      if (i === 0) {
        frac(ga, cx - 80, sy + 230, "1", "4", 120, { hlDen: 1 });
        label(ga, "nefnari", cx + 120, sy + 300, 40, { fill: C.hlTint });
        bar(ga, s.x + 60, sy + 420, sw - 120, 90, 4);
      } else if (i === 1) {
        for (let k = 0; k < 4; k++) friend(ga, s.x + 80 + k * 70, sy + 200, 0.3, FRIENDS[k]);
        for (let k = 0; k < 8; k++) friend(ga, s.x + 60 + k * 50, sy + 360, 0.22, FRIENDS[k]);
        piece(ga, s.x + 370, sy + 150, 80, 90, { hl: 1, k: "rc4" });
        piece(ga, s.x + 395, sy + 320, 40, 90, { hl: 1, k: "rc8" });
        label(ga, "minni", cx, sy + 500, 40, { fill: C.hlTint });
      } else {
        frac(ga, cx - 110, sy + 220, "1", "4", 110, { color: C.green });
        text(ga, ">", cx, sy + 220, 100);
        frac(ga, cx + 110, sy + 220, "1", "8", 110, { color: C.blue });
        piece(ga, cx - 160, sy + 380, 100, 120, { hl: 1, k: "rc4b" });
        piece(ga, cx + 85, sy + 380, 50, 120, { k: "rc8b" });
      }
    }
  });
  [["u2", "u3"], ["u4", "u5"], ["u6", "u7"]].forEach(([q]) => think(g, t, S[q].think_start, S[q].think_end, W / 2, 960));
}

function paper(g, x, y, w, h, folds, t0, t, shadeIdx = 0) {
  put(g, rect(w, h, { stroke: C.ink, strokeWidth: 5, fill: C.paperSheet, fillStyle: "solid", roughness: 1.2 }, "paper" + w), x, y);
  // folds: list of [x1,y1,x2,y2] in 0..1 coordinates, drawn one after another
  folds.forEach((f, i) => {
    const p = prog(t, t0 + i * 0.9, 0.7);
    if (p > 0) put(g, drawOn(line(f[0] * w, f[1] * h, f[2] * w, f[3] * h, { stroke: C.soft, strokeWidth: 5, strokeLineDash: [16, 12], roughness: 0.8 }, "fold" + i + w + folds.length), p), x, y);
  });
  const done = prog(t, t0 + folds.length * 0.9, 0.5);
  if (done > 0) {
    const cols = folds.length === 3 ? 4 : 2, rows = 2;
    const cw = w / cols, chh = h / rows;
    el("rect", { x: x + 6, y: y + 6, width: cw - 12, height: chh - 12, fill: C.hl, opacity: 0.75 * done }, g);
  }
}

function sceneChallenge(t) {
  const g = sceneGroup(t, st("a1"), TL.duration + 5);
  if (!g) return;
  if (t < st("a5")) {
    header(g, "Áskorun", t, st("a1"), C.ink);
    const pw = 600, ph = 400;
    if (t >= st("a2") - 0.2) {
      paper(g, 200, 330, pw, ph, [[0.5, 0, 0.5, 1], [0, 0.5, 1, 0.5]], mid("a2", 0.1), t);
      frac(g, 200 + pw / 2, 860, "1", "4", 80, { p: prog(t, mid("a2", 0.8), 0.5) });
    }
    if (t >= st("a3") - 0.2) {
      paper(g, 1120, 330, pw, ph, [[0.5, 0, 0.5, 1], [0, 0.5, 1, 0.5], [0.25, 0, 0.25, 1], [0.75, 0, 0.75, 1]].slice(0, 4), mid("a3", 0.05), t);
      frac(g, 1120 + pw / 2, 860, "1", "8", 80, { p: prog(t, mid("a3", 0.85), 0.5) });
    }
    const show = prog(t, st("a4"), 0.5);
    if (show > 0) {
      text(g, ">", W / 2, 530, 130, { fill: C.hl, opacity: show });
      think(g, t, mid("a4", 0.4), st("a5") + 0.2, W / 2, 980);
    }
    return;
  }
  // end card: everyone waves
  const p = prog(t, st("a5"), 0.6);
  for (let i = 0; i < 8; i++) friend(g, 300 + i * 190, 640 + Math.sin(t * 6 + i) * 10 * p, 0.9, FRIENDS[i], { opacity: p });
  text(g, "Sjáumst!", W / 2, 300, 120, { opacity: p });
  bar(g, W / 2 - 200, 880, 400, 110, 8, { hl: [0], opacity: p * 0.9 });
}

export function render(t) {
  root.replaceChildren();
  sceneTitle(t);
  sceneHook(t);
  sceneParts(t);
  sceneHard(t);
  sceneTurn1(t);
  sceneRule(t);
  sceneTurn2(t);
  sceneRecap(t);
  sceneChallenge(t);
  // series tag: always top-left, small
  text(root, TL.series_tag, 48, 52, 30, { anchor: "start", fill: C.soft, weight: 400 });
}

// The old way, for the before/after comparison: a generic flat icon plus a full-sentence caption.
export function renderOld(sentenceId) {
  root.replaceChildren();
  el("rect", { x: 0, y: 0, width: W, height: H, fill: "#FFFFFF" }, root);
  text(root, "Brot", W / 2, 190, 90, { fill: "#333" });
  const g = el("g", { transform: `translate(${W / 2} 500)` }, root);
  el("circle", { cx: 0, cy: 0, r: 190, fill: "#5B8DEF" }, g);
  el("path", { d: "M 0 0 L 0 -190 A 190 190 0 0 1 190 0 Z", fill: "#FFC857" }, g);
  el("rect", { x: 260, y: -120, width: 170, height: 240, rx: 24, fill: "#7FD1AE" }, g);
  el("rect", { x: -430, y: -120, width: 170, height: 240, rx: 24, fill: "#F28482" }, g);
  el("rect", { x: 0, y: 860, width: W, height: 220, fill: "rgba(0,0,0,0.78)" }, root);
  text(root, S[sentenceId].text, W / 2, 935, 50, { fill: "#FFF", weight: 400 });
  text(root, "Mikilvægt er að skilja hvernig brot virka í stærðfræði.", W / 2, 1010, 50, { fill: "#FFF", weight: 400 });
}
