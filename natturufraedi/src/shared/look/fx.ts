// 2D effect drawings for the Geysir short, drawn with the same Pen (plum ink, flat fills, soft crescents) as the cast.
// Every drawing is a pure function of its arguments so the pool can cache canvases by key.
import { Pen, INK, shade } from "./toon";

type P2 = [number, number];
const r1 = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

/** the erupting water column body (400 x 1600 design): white core, pale blue shading, ragged edges, falling spray at the sides */
export const fxColumn = (p: Pen, ph: number) => {
  const W = 400, H = 1600, pts: P2[] = [], pts2: P2[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const v = i / n, y = H - v * H;
    const w = 70 + 110 * v ** 0.8 + 16 * Math.sin(v * 21 + ph * 6.3) + 10 * Math.sin(v * 47 - ph * 9);
    pts.push([W / 2 - w, y]);
    pts2.unshift([W / 2 + w * (0.92 + 0.08 * Math.sin(v * 13 + ph * 5)), y]);
  }
  const outline = [...pts, ...pts2];
  p.poly(outline, "#cfe9f5", 7);
  // lit core
  const core: P2[] = outline.map(([x, y]) => [W / 2 + (x - W / 2) * 0.62 - 14, y]);
  p.poly(core, "#ffffff", 0);
  // streaks
  for (let k = 0; k < 7; k++) {
    const x = W / 2 + (r1(k + 3) - 0.5) * 160, y0 = ((r1(k) + ph * 0.8) % 1) * H;
    p.stroke([[x, y0], [x + 6, y0 + 160]], 6, "#a9d6ec");
  }
};

/** frothy cauliflower crown of the column (500 x 420) */
export const fxCrown = (p: Pen, ph: number) => {
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + ph * 0.9;
    blobs.push([250 + Math.cos(a) * 150 * (0.8 + 0.3 * r1(i)), 230 + Math.sin(a) * 90 * (0.8 + 0.3 * r1(i + 9)), 70 + 35 * r1(i + 4)]);
  }
  blobs.push([250, 210, 120]);
  for (const [x, y, r] of blobs) p.ell(x, y, r, r * 0.92, "#d6ecf7", 7);
  for (const [x, y, r] of blobs) p.ell(x - r * 0.18, y - r * 0.2, r * 0.72, r * 0.66, "#ffffff", 0);
};

/** soft steam puff (256 x 256), alpha falls off at the edges; tone 0 white .. 1 grey */
export const fxSteam = (p: Pen, tone: number) => {
  const g = p.g, c = Math.round(255 - 40 * tone);
  for (const [x, y, r, a] of [[128, 140, 100, 0.55], [92, 120, 64, 0.5], [170, 112, 70, 0.45], [128, 92, 60, 0.5]] as const) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${c},${c},${c + 2 > 255 ? 255 : c + 2},${a})`);
    gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
};

/** soap foam cluster lying flat on the pool (400 x 400) */
export const fxFoam = (p: Pen, seed: number) => {
  for (let i = 0; i < 16; i++) {
    const a = r1(seed + i) * Math.PI * 2, d = 140 * Math.sqrt(r1(seed + i + 40));
    const x = 200 + Math.cos(a) * d, y = 200 + Math.sin(a) * d, r = 22 + 30 * r1(seed + i + 80);
    p.ell(x, y, r, r, "#f4fbff", 4);
    p.ell(x - r * 0.3, y - r * 0.3, r * 0.28, r * 0.22, ["#ffd2f4", "#c8f2ff", "#fff3b8"][i % 3], 0);
  }
};

/** single soap bubble (128 x 128) */
export const fxBubble = (p: Pen) => {
  p.ell(64, 64, 52, 52, "rgba(225,245,255,0.35)", 5);
  p.arc(64, 64, 36, 36, 200, 260, 6, "#ffffff");
  p.dot(46, 44, 6, "#ffffff");
};

/** "Z" letter (200 x 200) */
export const fxZ = (p: Pen) => {
  const z: P2[] = [[40, 40], [160, 40], [50, 160], [165, 160]];
  p.line(z, "#f2f6ff", 30);
};

/** water drop (100 x 150) */
export const fxDrop = (p: Pen) => {
  p.poly([[50, 10], [78, 80], [74, 110], [50, 135], [26, 110], [22, 80]], "#7cc4ef", 5);
  p.ell(42, 100, 9, 14, "#d6f0ff", 0);
};

/** question mark (200 x 260) */
export const fxQuestion = (p: Pen) => {
  const g = p.g;
  g.font = "900 220px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 22; g.strokeStyle = INK; g.lineJoin = "round"; g.strokeText("?", 100, 138);
  g.fillStyle = "#ffd23f"; g.fillText("?", 100, 138);
};

/** a top hat on its own (200 x 200) */
export const fxTopHat = (p: Pen, col = "#24232b") => {
  p.poly([[60, 150], [140, 150], [132, 40], [68, 40]], col, 7);
  p.poly([[63, 128], [137, 128], [136, 112], [64, 112]], "#b8323a", 0);
  p.ell(100, 152, 70, 14, shade(col, 0.8), 7);
};

/** bottle cap (100 x 100) */
export const fxCap = (p: Pen) => { p.ell(50, 50, 30, 30, "#e8473f", 5); p.ell(50, 50, 18, 18, "#f17a6f", 0); };

/** soda foam jet (300 x 600): brown-white spray widening upward */
export const fxSoda = (p: Pen, ph: number) => {
  const pts: P2[] = [[140, 600], [160, 600]];
  for (let i = 0; i <= 10; i++) { const v = i / 10; pts.push([160 + v * 110 + 14 * Math.sin(v * 9 + ph * 7), 600 - v * 560]); }
  for (let i = 10; i >= 0; i--) { const v = i / 10; pts.push([140 - v * 110 - 14 * Math.sin(v * 11 + ph * 5), 600 - v * 560]); }
  p.poly(pts, "#f3e2c0", 6);
  for (let k = 0; k < 8; k++) p.ell(150 + (r1(k) - 0.5) * 200, 80 + r1(k + 5) * 380, 18, 18, "#ffffff", 4);
};

/** soap flakes / powder clump (160 x 160) */
export const fxFlakes = (p: Pen, seed: number) => {
  for (let i = 0; i < 9; i++) {
    const x = 30 + r1(seed + i) * 100, y = 30 + r1(seed + i + 9) * 100;
    p.ell(x, y, 10 + 6 * r1(i), 10 + 6 * r1(i), i % 3 ? "#ffffff" : "#bfe6ff", 3);
  }
};

/** the wooden "GEYSIR" sign face (700 x 300) */
export const fxSignFace = (p: Pen) => {
  const g = p.g;
  p.poly([[10, 10], [690, 10], [690, 290], [10, 290]], "#7a4a2a", 10);
  p.poly([[34, 34], [666, 34], [666, 266], [34, 266]], "#8f5c35", 0);
  for (let i = 0; i < 5; i++) p.stroke([[34, 70 + i * 45], [666, 74 + i * 45]], 3, "#6b3f22");
  g.font = "900 150px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 14; g.strokeStyle = "#3b2112"; g.lineJoin = "round"; g.strokeText("GEYSIR", 350, 160);
  g.fillStyle = "#fff4dc"; g.fillText("GEYSIR", 350, 160);
};

/** dome of water bulging out of the pool (500 x 260) */
export const fxDome = (p: Pen) => {
  p.ell(250, 250, 230, 210, "#62c6e6", 7, 180, 360);
  p.ell(230, 235, 150, 120, "#b9ecfb", 0, 200, 340);
};

/** little crown for Strokkur the show-off (200 x 160) */
export const fxCrownGold = (p: Pen) => {
  p.poly([[20, 140], [180, 140], [190, 40], [140, 90], [100, 20], [60, 90], [10, 40]], "#ffd23f", 7);
  for (const x of [55, 100, 145]) p.dot(x, 118, 10, "#e8473f");
};
