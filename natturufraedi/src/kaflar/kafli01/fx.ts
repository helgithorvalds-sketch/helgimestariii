// 2D effect drawings for the Heimaey eruption, drawn with the cast's Pen (plum ink, flat fills) so fire, steam and
// water sit in the same inked cartoon world. Fire and kvika are painted in plain colours: the cards are tinted HDR
// (> 1) by cast.ts, so the bloom (threshold 1.0) catches them. Every drawing is a pure function of its arguments.
import { Pen } from "../../shared/look/toon";

type P2 = [number, number];
const r1 = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };

/** a fire fountain (300 x 1000): a jet of kvika widening upward, ragged top breaking into spatter; ph = flicker phase */
export const fxFountain = (p: Pen, ph: number) => {
  const W = 300, H = 1000, n = 22, L: P2[] = [], R: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const v = i / n, y = H - 20 - v * (H - 150);
    const w = 22 + 95 * v ** 0.9 + 18 * Math.sin(v * 17 + ph * 6.3) * v + 10 * Math.sin(v * 41 - ph * 9);
    L.push([W / 2 - w, y]); R.unshift([W / 2 + w * (0.9 + 0.1 * Math.sin(v * 11 + ph * 5)), y]);
  }
  const top: P2[] = []; // ragged crown between the two sides
  for (let k = 1; k < 7; k++) top.push([L[n][0] + ((R[0][0] - L[n][0]) * k) / 7, 150 - 70 * r1(k + ph * 13) - (k % 2 ? 40 : 0)]);
  const outline = [...L, ...top, ...R];
  p.poly(outline, "#e8431f", 7);
  const mid = outline.map(([x, y]) => [W / 2 + (x - W / 2) * 0.66, y + (H - y) * 0.06] as P2);
  p.poly(mid, "#ff8a1e", 0);
  const core = outline.map(([x, y]) => [W / 2 + (x - W / 2) * 0.32, y + (H - y) * 0.2] as P2);
  p.poly(core, "#fff0a0", 0);
  for (let k = 0; k < 9; k++) { // spatter above and beside the crown
    const x = 40 + 220 * r1(k * 3 + ph * 7), y = 30 + 160 * r1(k * 5 + ph * 11), r = 9 + 10 * r1(k + 2);
    p.ell(x, y, r, r * 1.15, k % 3 ? "#ff8a1e" : "#fff0a0", 5);
  }
};

/** a glowing lava bomb (96 x 96) */
export const fxBomb = (p: Pen) => { p.ell(48, 48, 30, 34, "#ff8a1e", 6); p.ell(42, 42, 14, 16, "#fff0a0", 0); };

/** a soft round glow (256 x 256) for additive halos: white core, smooth fall-off */
export const fxGlow = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(0.6, "rgba(255,255,255,0.16)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};

/** a length of hose-water jet (160 x 64), pointing right: pale blue rope with a white core and a few flying drops.
 *  No ink rim, so overlapping lengths along the arc read as one continuous jet. */
export const fxSpray = (p: Pen, seed: number) => {
  p.stroke([[18, 32], [142, 32]], 30, "#bfe3f6");
  p.stroke([[18, 30], [142, 30]], 13, "#ffffff");
  for (let i = 0; i < 4; i++) p.dot(20 + 120 * r1(seed + i), 32 + (r1(seed + i + 9) > 0.5 ? 1 : -1) * (19 + 8 * r1(seed + i + 3)), 3.5 + 2 * r1(seed + i + 5), "#e6f5fc");
};

/** foam wake on the water (400 x 400, lying flat): a V of white scallops opening backward (-y) */
export const fxWake = (p: Pen, seed: number) => {
  for (let i = 0; i < 14; i++) {
    const t = i / 13, s = i % 2 ? 1 : -1, x = 200 + s * (20 + 150 * t), y = 60 + 320 * t, r = 16 + 14 * (1 - t) * r1(seed + i);
    p.ell(x, y, r * 1.4, r, "#f4fbff", 3);
  }
  p.ell(200, 50, 40, 26, "#ffffff", 3);
};

/** the moon (128 x 128): pale disc, a few soft maria */
export const fxMoon = (p: Pen) => {
  p.ell(64, 64, 54, 54, "#f3f1e4", 0);
  p.ell(48, 52, 14, 11, "#dcdcd0", 0); p.ell(78, 74, 10, 8, "#dcdcd0", 0); p.ell(70, 40, 7, 6, "#e2e2d6", 0);
};

/** Heimaey seen from Amma's window today (1024 x 768): summer sky, the harbour, Heimaklettur, red-brown Eldfell with
 *  green slopes over the coloured roofs. Painted flat with ink lines, like the boards. */
export const fxWindowView = (p: Pen) => {
  const g = p.g, W = 1024, H = 768;
  const sky = g.createLinearGradient(0, 0, 0, H * 0.6); sky.addColorStop(0, "#5a96dc"); sky.addColorStop(1, "#bcd6ef");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (const [x, y, s] of [[180, 120, 1], [700, 90, 1.3], [930, 170, 0.8]] as const) for (const [dx, dy, r] of [[0, 0, 46], [44, -16, 56], [96, 2, 42]] as const) p.ell(x + dx * s, y + dy * s, r * s, r * 0.72 * s, "#ffffff", 0);
  g.fillStyle = "#3f7fb8"; g.fillRect(0, H * 0.56, W, H * 0.44);                    // sea
  p.poly([[0, 300], [80, 210], [190, 170], [300, 200], [360, 290], [380, 440], [0, 440]], "#6f9e48", 7);          // Heimaklettur
  p.poly([[60, 330], [120, 300], [200, 330], [230, 440], [40, 440]], "#7d8a4a", 0);
  p.stroke([[110, 260], [150, 360]], 6, "#5b4f4a"); p.stroke([[250, 240], [290, 380]], 6, "#5b4f4a");
  p.poly([[560, 470], [700, 250], [770, 232], [820, 250], [960, 470]], "#9a4a32", 7);                              // Eldfell
  p.poly([[560, 470], [640, 360], [700, 400], [760, 340], [860, 380], [960, 470]], "#6f9e48", 0);
  p.poly([[560, 470], [700, 250], [770, 232], [820, 250], [960, 470]], null, 7);
  p.poly([[700, 250], [770, 270], [820, 250], [770, 232]], "#6a3324", 4);
  p.poly([[330, 500], [1024, 470], [1024, 560], [330, 560]], "#7ea85a", 0);                                        // town shore
  const cols = ["#c4473a", "#efe9dc", "#e9bf4c", "#3f6fa8"], roofs = ["#b33a2e", "#3f7a4e"];
  for (let i = 0; i < 16; i++) {
    const x = 360 + i * 42 + 8 * r1(i), y = 492 + 30 * r1(i + 9), w = 30, h = 20;
    p.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], cols[i % 4], 3);
    p.poly([[x - 4, y], [x + w / 2, y - 14], [x + w + 4, y]], roofs[i % 2], 3);
  }
  g.fillStyle = "#2f5d8f"; g.fillRect(0, 560, W, 6);
  p.poly([[300, 600], [520, 596], [522, 606], [300, 610]], "#b9b4aa", 3);                                          // breakwater
  for (const [x, y, c] of [[420, 640, "#2f5d8f"], [620, 680, "#b8402e"]] as const) { p.poly([[x, y], [x + 70, y], [x + 60, y + 16], [x + 8, y + 16]], c, 4); p.poly([[x + 12, y - 16], [x + 34, y - 16], [x + 34, y], [x + 12, y]], "#f2eee4", 3); }
};

/** an inked cartoon cloud puff (256 x 224): 4-5 overlapping lobes, flat fill with a lighter crown and a plum outline.
 *  tone 0 = ash (dark grey-violet), 1 = steam (white); the card tint lights it (orange near the fire). */
export const fxPuff = (p: Pen, tone: number, seed: number) => {
  const base = tone > 0.5 ? "#f2f2f6" : "#5d5462", top = tone > 0.5 ? "#ffffff" : "#776c7c";
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.95 + 1.1 * (i / 4)), d = 52 + 14 * r1(seed + i);
    lobes.push([128 + Math.cos(a) * d * 1.15, 128 + Math.sin(a) * d * 0.75, 40 + 18 * r1(seed + i + 7)]);
  }
  lobes.push([128, 140, 66]);
  for (const [x, y, r] of lobes) p.ell(x, y, r, r * 0.9, base, 8);
  for (const [x, y, r] of lobes) p.ell(x, y, r - 5, r * 0.9 - 5, base, 0);
  for (const [x, y, r] of lobes.slice(0, 3)) p.arc(x, y, r * 0.62, r * 0.55, 200, 290, 7, top); // a light crescent on the upper lobes
};
