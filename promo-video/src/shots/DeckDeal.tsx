// Shot 4 · deck-deal-flyin (demos/ui-entrance/deck-deal-flyin/DeckDealFlyin.tsx).
// The real board's 19 stage-grid company cards (Vill sýnishorn / Lokið / Greitt, cut out of board-full.png)
// are dealt from a pile on the table into their real slots on the empty board backplate (board-empty.png).
// The "Tölvupóstur sendur" rows are full-width list rows, not grid cards, so they stay printed on the board.
//
// Kept from the tuned demo: pile close-up orbit (0–28f), anticipation 26–36f (pile −48px, top card pulls 30px),
// accelerating cue = 36 + 4k − 0.0792·k(k−1), 8f dive with z-arc + 1.06 peak, 4f overshoot settle + 2f press,
// motion ghost, light pool spreading from the pile 34→64f, monotone-Hermite camera spline ending in a
// "runway" overhead, far-end fog, title words rising from f100, live landed counter.
// Adapted: graphite table → the app's dark navy; cards are centred on the pile (mixed widths 262–565px);
// camera anchors re-solved for this board's geometry; title in the product heading face.
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { EASE, ramp } from '../fixtures/Polish';
import { Stage, TextReveal, alpha, type } from '../fixtures/Look';
import layout from '../../public/textures/live/layout.json';
import { C, FONTS, NAVY } from '../brand';

export const DECK_DEAL_DURATION = 162; // demo 150 + 12f longer full-board hold (title reads ≥1s) → 11 beats, cut on a BGM beat

const L = NAVY;
const all = layout.board.cards;
const PRINTED = all.filter((c) => c.w > 1000); // e-mail rows: part of the board
const DEALT = all.filter((c) => c.w <= 1000);
const BOARD = { x: 317, w: 1286 };
const BOARD_H = 2190; // header → end of the "Greitt" stage
const PAPER = C.bg;
const RADIUS = 12;

const N_CARDS = DEALT.length;
const PILE = { x: 1660, y: 1175 };
const PILE_CX = PILE.x + 182;
const PILE_CY = PILE.y + 21;
const DEAL_START = 36;
const STACK_STEP = 5; // thin 42px rows → a little more height per card so the deck reads as a deck

const grid = DEALT.map((c) => ({ file: c.file, x: c.x, y: c.y, w: c.w, h: c.h }))
  .sort((a, b) => a.y - b.y || a.x - b.x)
  .map((c, k) => ({
    ...c,
    cue: DEAL_START + 4 * k - 0.0792 * k * (k - 1),
    px: PILE_CX - c.w / 2 + (((k * 7) % 9) - 4) * 2,
    py: PILE.y + (((k * 5) % 7) - 3) * 2,
    protZ: ((k * 11) % 7) - 3,
    pz: (N_CARDS - k) * STACK_STEP,
  }));

const HOVER_H = 40;
const SETTLE_EASE = Easing.bezier(0.3, 0, 0.25, 1.15);
const DIVE_EASE = Easing.bezier(0.3, 0, 0.2, 1);
const ANTICIPATE = { from: 26, to: 36, pileDown: 48, topPull: 30 };

type Cam = { cx: number; cy: number; zoom: number; rotX: number; rotY: number; rotZ: number; persp: number; sx: number };
type Key = Cam & { frame: number };
const ANCHORS: Key[] = [
  { frame: 0, cx: PILE_CX - 40, cy: PILE_CY + 30, zoom: 1.9, rotX: 48, rotY: -30, rotZ: 9, persp: 1100, sx: 0 },
  { frame: 30, cx: PILE_CX + 20, cy: PILE_CY + 20, zoom: 1.8, rotX: 42, rotY: 24, rotZ: -6, persp: 1100, sx: 0 },
  { frame: 62, cx: 1100, cy: 1420, zoom: 0.8, rotX: 22, rotY: 0, rotZ: 2, persp: 1700, sx: 0 },
  { frame: 86, cx: 990, cy: 1600, zoom: 0.64, rotX: 38, rotY: -4, rotZ: -9, persp: 2500, sx: 200 },
  { frame: 110, cx: 960, cy: 1640, zoom: 0.6, rotX: 50, rotY: -6, rotZ: -20, persp: 3000, sx: 540 },
  { frame: 162, cx: 960, cy: 1645, zoom: 0.612, rotX: 50, rotY: -6, rotZ: -20, persp: 3000, sx: 540 },
];
const PARAMS: (keyof Cam)[] = ['cx', 'cy', 'zoom', 'rotX', 'rotY', 'rotZ', 'persp', 'sx'];
const hermite = (xs: number[], ys: number[]) => {
  const n = xs.length;
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
};
const CURVES = Object.fromEntries(PARAMS.map((p) => [p, hermite(ANCHORS.map((k) => k.frame), ANCHORS.map((k) => k[p]))])) as Record<keyof Cam, (x: number) => number>;
const camAt = (f: number): Cam => Object.fromEntries(PARAMS.map((p) => [p, CURVES[p](f)])) as Cam;

// brushed navy table (deterministic feTurbulence: very low x / high y frequency = horizontal brushing)
const BRUSH_TILE = (() => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'>` +
    `<filter id='b' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.0018 0.62' numOctaves='3' seed='11' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.4 0.4 0.4 0 -0.5'/>` +
    `</filter><rect width='100%' height='100%' filter='url(#b)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();
const T = 4000;

export const DeckDeal: React.FC<{ line1?: string; line2?: string; countLabel?: string }> = ({
  line1 = 'Sýnishorn. Lokið.', line2 = 'Greitt.', countLabel = 'flokkuð fyrirtæki',
}) => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);

  const lightUp = interpolate(frame, [34, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.5, 0, 0.6, 1) });
  const holeR = 4200 * lightUp;
  const feather = 600 + 1000 * lightUp;
  const fog = ramp(frame, 80, 34, EASE.smooth);
  const antT = interpolate(frame, [ANTICIPATE.from, ANTICIPATE.to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
  const landed = grid.filter((c) => frame >= c.cue + 8).length;
  const statIn = ramp(frame, 90, 12, EASE.out);

  const tableBg = [
    `radial-gradient(${1100 + 1400 * lightUp}px ${800 + 1600 * lightUp}px at ${T + PILE_CX - 600 * lightUp}px ${T + PILE_CY + 900 * lightUp}px, rgba(214,226,250,${0.2 - 0.08 * lightUp}), rgba(200,214,240,0.05) 45%, transparent 70%)`,
    `linear-gradient(104deg, transparent ${T + PILE_CX - 1600}px, rgba(200,216,246,0.07) ${T + PILE_CX - 500}px, rgba(226,236,255,0.11) ${T + PILE_CX}px, rgba(200,216,246,0.05) ${T + PILE_CX + 600}px, transparent ${T + PILE_CX + 1800}px)`,
    `${BRUSH_TILE} 0 0 / 640px 640px repeat`,
    'linear-gradient(115deg, #0e1628 0%, #152036 30%, #0c1324 56%, #131c31 80%, #090f1d 100%)',
  ].join(', ');
  const persp = cam.persp * cam.zoom;

  return (
    <AbsoluteFill style={{ fontFamily: FONTS.sans, overflow: 'hidden' }}>
      <Stage look={L} keyLight={{ x: 0.6, y: 0.2 }} fill={null} intensity={0.5} grain={0} vignette={0} />

      <AbsoluteFill style={{ transform: `translateX(${cam.sx.toFixed(2)}px)` }}>
        <div style={{ position: 'absolute', inset: 0, perspective: `${persp.toFixed(2)}px`, perspectiveOrigin: '960px 540px' }}>
          <div style={{
            position: 'absolute', width: 1920, height: BOARD_H, zoom: cam.zoom,
            transform: `translate(${(960 / cam.zoom - cam.cx).toFixed(3)}px, ${(540 / cam.zoom - cam.cy).toFixed(3)}px) rotateY(${cam.rotY.toFixed(3)}deg) rotateX(${cam.rotX.toFixed(3)}deg) rotateZ(${cam.rotZ.toFixed(3)}deg)`,
            transformOrigin: `${cam.cx.toFixed(2)}px ${cam.cy.toFixed(2)}px`, transformStyle: 'preserve-3d',
          }}>
            <div style={{
              position: 'absolute', left: -T, top: -T, width: 1920 + 2 * T, height: BOARD_H + 2 * T, background: tableBg,
              WebkitMaskImage: `radial-gradient(ellipse 2600px 3600px at ${T + 960}px ${T + BOARD_H / 2}px, #000 40%, transparent 100%)`,
              maskImage: `radial-gradient(ellipse 2600px 3600px at ${T + 960}px ${T + BOARD_H / 2}px, #000 40%, transparent 100%)`,
            }} />

            {/* the board: real capture with the grid cards lifted out; e-mail rows stay printed */}
            <div style={{
              position: 'absolute', left: BOARD.x, top: 0, width: BOARD.w, height: BOARD_H, overflow: 'hidden', borderRadius: 18, background: PAPER,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 60px 160px rgba(0,0,0,0.7), 0 12px 40px rgba(0,0,0,0.5)',
            }}>
              <Img src={staticFile('textures/live/board-empty.png')} style={{ position: 'absolute', left: -BOARD.x - layout.texture.offsetX, top: 0, width: layout.texture.width, height: layout.texture.height }} />
              {PRINTED.map((c) => (
                <Img key={c.file} src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', left: c.x - BOARD.x, top: c.y, width: c.w, height: c.h }} />
              ))}
              {lightUp < 1 && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(8,12,24,0.88)',
                  WebkitMaskImage: lightUp > 0 ? `radial-gradient(circle at ${PILE_CX - BOARD.x}px ${PILE_CY}px, transparent ${holeR.toFixed(0)}px, #000 ${(holeR + feather).toFixed(0)}px)` : undefined,
                  maskImage: lightUp > 0 ? `radial-gradient(circle at ${PILE_CX - BOARD.x}px ${PILE_CY}px, transparent ${holeR.toFixed(0)}px, #000 ${(holeR + feather).toFixed(0)}px)` : undefined,
                }} />
              )}
            </div>

            {grid.map((c, i) => {
              const { cue } = c;
              const diveT = interpolate(frame, [cue, cue + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: DIVE_EASE });
              const settleT = interpolate(frame, [cue + 8, cue + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: SETTLE_EASE });
              const dx = (c.px - c.x) * (1 - diveT);
              const dy = (c.py - c.y) * (1 - diveT);
              const rotFlight = c.protZ * (1 - diveT);
              const arc = Math.sin(diveT * Math.PI) * 110;
              const zDive = interpolate(diveT, [0, 1], [c.pz, HOVER_H]) + arc;
              const z = frame < cue ? c.pz : zDive * (1 - settleT);
              const dealScale = 1 + Math.sin(diveT * Math.PI) * 0.06;
              const press = interpolate(frame, [cue + 10, cue + 11, cue + 12], [1, 0.996, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const scale = dealScale * press;
              const isLanded = frame >= cue + 12;
              const inPile = frame < cue;
              const antDy = inPile ? ANTICIPATE.pileDown * antT * (frame < ANTICIPATE.to + 2 ? 1 : 0) : 0;
              const antPull = i === 0 && inPile ? ANTICIPATE.topPull * antT : 0;
              const transform = isLanded
                ? 'translate3d(0px, 0px, 0px)'
                : inPile
                  ? `translate3d(${c.px - c.x - antPull}px, ${c.py - c.y + antDy}px, ${c.pz}px) rotateZ(${c.protZ}deg)`
                  : `translate3d(${dx}px, ${dy}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`;
              const shadowLag = interpolate(frame, [cue + 8, cue + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.out });
              const shadow = isLanded
                ? `0 ${(2 + 14 * (1 - shadowLag)).toFixed(1)}px ${(6 + 30 * (1 - shadowLag)).toFixed(1)}px rgba(15,23,41,${(0.08 + 0.12 * (1 - shadowLag)).toFixed(3)})`
                : inPile
                  ? i === N_CARDS - 1 ? '0 1px 3px rgba(0,0,0,.4), 0 26px 60px rgba(0,0,0,0.75)' : '0 1px 2px rgba(0,0,0,.35)'
                  : `0 ${36 - 24 * settleT}px ${70 - 50 * settleT}px rgba(0,0,0,${(0.45 - 0.25 * settleT).toFixed(3)})`;
              const showGhost = diveT > 0.02 && diveT < 0.98;
              const gx = (c.px - c.x) * 0.06;
              const gy = (c.py - c.y) * 0.06;
              const dist = Math.hypot(c.x + c.w / 2 - PILE_CX, c.y + c.h / 2 - PILE_CY);
              const dark = Math.min(1, Math.max(0, (dist - holeR) / feather)) * 0.88 * (lightUp < 1 ? 1 : 0);
              const pileShade = inPile ? 0.08 * (1 - lightUp) : diveT > 0.6 ? dark * Math.min(1, (diveT - 0.6) / 0.4) : 0;
              return (
                <div key={`${c.file}-${i}`} style={{ transformStyle: 'preserve-3d' }}>
                  {showGhost ? (
                    <div style={{
                      position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
                      transform: `translate3d(${dx + gx}px, ${dy + gy}px, ${z}px) rotateZ(${rotFlight}deg) scale(${scale})`,
                      opacity: 0.28 * (1 - diveT), filter: 'blur(7px)', borderRadius: RADIUS, overflow: 'hidden',
                    }}>
                      <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                    </div>
                  ) : null}
                  <div style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, transform, boxShadow: shadow, borderRadius: RADIUS, overflow: 'hidden' }}>
                    <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                    {pileShade > 0.005 && <div style={{ position: 'absolute', inset: 0, background: `rgba(8,12,24,${pileShade.toFixed(3)})` }} />}
                  </div>
                </div>
              );
            })}

            {fog > 0 && (
              <div style={{
                position: 'absolute', left: BOARD.x - 2, top: -2, width: BOARD.w + 4, height: BOARD_H + 4, pointerEvents: 'none', borderRadius: 18, transform: 'translateZ(1px)',
                background: `linear-gradient(180deg, rgba(8,12,24,${(0.62 * fog).toFixed(3)}) 0%, rgba(8,12,24,${(0.3 * fog).toFixed(3)}) 35%, rgba(8,12,24,0) 60%)`,
              }} />
            )}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse 75% 75% at 58% 46%, transparent 45%, ${alpha('#03060e', 0.55)} 100%)` }} />

      <div style={{ position: 'absolute', left: 120, top: 664, color: L.ink }}>
        <div style={{ ...type(108, 800), fontFamily: FONTS.display, letterSpacing: '-0.035em' }}>
          <TextReveal text={line1} by="word" variant="rise" start={100} each={16} gap={4} />
        </div>
        <div style={{ ...type(108, 300), fontFamily: FONTS.display, letterSpacing: '-0.035em', color: L.ink2, marginTop: 4 }}>
          <TextReveal text={line2} by="word" variant="rise" start={106} each={16} gap={4} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 124, top: 598, display: 'flex', alignItems: 'center', gap: 16, opacity: statIn, ...type(32, 600, { caps: true }), letterSpacing: '0.14em', color: L.ink2 }}>
        <Img src={staticFile('brand/logo-icon.png')} style={{ width: 40, height: 38, margin: '-6px 0', filter: 'brightness(1.25)' }} />
        <span style={{ color: L.ink, fontVariantNumeric: 'tabular-nums', minWidth: '2.2ch' }}>{String(landed).padStart(2, '0')}</span>
        {countLabel}
      </div>
    </AbsoluteFill>
  );
};
