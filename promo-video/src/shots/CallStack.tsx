// Shot 5 · list-stack-press (demos/ui-entrance/list-stack-press/ListStackPress.tsx).
// The real "Á eftir að hringja" (still to call) list on the board: its first five rows fly up from below and
// stack into their real slots; each landing presses the settled stack; a counter rolls one digit per row.
//
// Kept from the tuned demo: 88f; counter anticipation 0→6f; CUES 6/18/30/42/54, 22f flight bezier(.45,.05,.25,1.12)
// from +600px with ±2° tilts and 1.06→1 scale; 6px/8f stack press; highlighter grows 3f after landing (5f/2f for
// the last); glaze after the last card, clipped to each card's radius; continuous odometer (8f per step); one
// continuous camera curve fed per-frame to PageCam2D; frontal camera for list shots (Q6).
// Adapted: page = board-full.png (true final state), five slots patched with the panel colour until each lands;
// camera re-solved to start tight on the panel and end on the whole call section; warm → product colours.
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../fixtures/PageCam2D';
import { SpeedBlur, bezier, softShadow, velocity } from '../fixtures/Polish';
import layout from '../../public/textures/live/layout.json';
import { C, FONTS } from '../brand';

export const CALL_STACK_DURATION = 88;

const cards = layout.board.callRows.slice(0, 5);
const PAGE_H = layout.board.pageH;
const PANEL_BG = '#fefeff';
const RADIUS = 8; // rounded-lg rows
// measured from the cutouts: the company-name line of each row (row-local px)
const HL_TOP = 10, HL_H = 19, HL_LEFT = 10;
const HL_W = [101, 68, 108, 130, 143];

const CUES = [6, 18, 30, 42, 54];
const DUR = 22;
const FLY_EASE = Easing.bezier(0.45, 0.05, 0.25, 1.12);
const TILTS = [2, -2, 2, -2, 2];

const CAM_END = 82;
const CY_EASE = bezier(0.42, 0, 0.2, 1);
const Z_EASE = bezier(0.3, 0, 0.18, 1);
const camAt = (f: number) => {
  const u = Math.min(1, Math.max(0, f / CAM_END));
  return { cx: 720 + (960 - 720) * CY_EASE(u), cy: 400 + (640 - 400) * CY_EASE(u), zoom: 1.35 + (0.86 - 1.35) * Z_EASE(u) };
};
const CAM_KEYS: CamKey2D[] = Array.from({ length: CALL_STACK_DURATION }, (_, f) => ({ frame: f, ...camAt(f) }));
const LINEAR = (t: number) => t;

const DIGITS = '0123456789';
const ROLL_DUR = 8;
const ROLL_EASE = Easing.bezier(0.25, 0.8, 0.25, 1);
const rollAt = (frame: number) => {
  let pos = 0;
  for (const c of CUES) pos += interpolate(frame, [c + DUR, c + DUR + ROLL_DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ROLL_EASE });
  return pos;
};
const DigitRoll: React.FC<{ pos: number; lineH: number; color: string; blur: number }> = ({ pos, lineH, color, blur }) => (
  <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
    <span style={{ display: 'inline-block', height: lineH }}>
      <span style={{ display: 'block', transform: `translateY(${-pos * lineH}px)`, filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span key={j} style={{ display: 'block', fontFamily: FONTS.display, fontWeight: 800, fontSize: 104, letterSpacing: '-0.04em', lineHeight: `${lineH}px`, color, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
        ))}
      </span>
    </span>
  </span>
);

const flyT = (i: number, f: number) => interpolate(f, [CUES[i], CUES[i] + DUR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: FLY_EASE });
const flyY = (i: number, f: number) => 600 * (1 - flyT(i, f));

export const CallStack: React.FC<{ label?: string; sub?: string }> = ({ label = 'Á eftir að hringja', sub = 'af 11 á listanum' }) => {
  const frame = useCurrentFrame();
  const rollPos = rollAt(frame);
  const rollV = Math.abs(velocity(rollAt, frame));
  const antT = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });

  const stackPress = (settledIndex: number) => {
    let press = 0;
    for (let j = settledIndex + 1; j < CUES.length; j++) {
      const cue = CUES[j];
      press = Math.max(press, interpolate(frame, [cue, cue + 4, cue + 8], [0, 6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin) }));
    }
    return press;
  };

  const glazeX = interpolate(frame, [74, 87], [-500, 2300], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.35, 1) });
  const glazeVis = interpolate(frame, [74, 77, 84, 87], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <PageCam2D src="textures/live/board-full.png" pageH={PAGE_H} keys={CAM_KEYS} ease={LINEAR} bg={C.bg}>
        {cards.map((c, i) => (
          <div key={`slot-${i}`} style={{ position: 'absolute', left: c.x - 4, top: c.y - 3, width: c.w + 8, height: c.h + 6, background: PANEL_BG, opacity: frame >= CUES[i] + DUR - 2 ? 0 : 1 }} />
        ))}

        {cards.map((c, i) => {
          const cue = CUES[i];
          const t = flyT(i, frame);
          if (t <= 0) return null;
          const settled = t >= 0.999;
          const dy = flyY(i, frame) + (settled ? stackPress(i) : 0);
          const rot = TILTS[i] * (1 - t);
          const scale = 1.06 - 0.06 * t;
          const elev = settled ? 3 - stackPress(i) * 0.3 : 3 + 53 * Math.min(1, Math.max(0, 1 - t));
          const vy = settled ? 0 : velocity((f) => flyY(i, f), frame);
          const lastCard = i === CUES.length - 1;
          const hlStart = cue + DUR + (lastCard ? 2 : 3);
          const hlLen = lastCard ? 5 : 7;
          const hlGrow = interpolate(frame, [hlStart, hlStart + hlLen], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) });
          const hlFade = interpolate(frame, [hlStart + hlLen, hlStart + hlLen + (lastCard ? 4 : 5)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

          const card = (
            <div style={{
              position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
              transform: `translateY(${dy.toFixed(3)}px) rotate(${rot.toFixed(4)}deg) scale(${scale.toFixed(5)})`,
              transformOrigin: 'center center', borderRadius: RADIUS, boxShadow: softShadow(elev, { color: '#1e293b', strength: 1.1 }),
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden' }}>
                <Img src={staticFile(`textures/live/${c.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
                {hlGrow > 0 && hlFade > 0 ? (
                  <div style={{ position: 'absolute', left: HL_LEFT, top: HL_TOP, height: HL_H, width: HL_W[i] * hlGrow, borderRadius: 3, background: '#cfe0fd', mixBlendMode: 'multiply', opacity: 0.9 * hlFade, pointerEvents: 'none' }} />
                ) : null}
                {glazeVis > 0 && (
                  <div style={{
                    position: 'absolute', top: -200, height: c.h + 400, left: glazeX - c.x - (c.y - 200) * 0.25, width: 360,
                    transform: 'rotate(14deg)', opacity: glazeVis * 0.55, mixBlendMode: 'soft-light',
                    background: 'linear-gradient(90deg, rgba(220,232,255,0), rgba(190,212,255,0.95) 45%, rgba(190,212,255,0.95) 55%, rgba(220,232,255,0))', pointerEvents: 'none',
                  }} />
                )}
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)', pointerEvents: 'none' }} />
            </div>
          );
          return Math.abs(vy) > 1 ? (
            <SpeedBlur key={c.file} vx={0} vy={vy} amount={0.22} max={14}>{card}</SpeedBlur>
          ) : (
            <React.Fragment key={c.file}>{card}</React.Fragment>
          );
        })}
      </PageCam2D>

      {/* frosted backing so the counter reads cleanly over the page it floats above */}
      <div style={{ position: 'absolute', top: 120, right: 30, width: 520, height: 330, pointerEvents: 'none', opacity: 0.3 + 0.7 * antT,
        background: 'radial-gradient(ellipse 50% 50% at 62% 50%, rgba(250,251,253,0.96) 0%, rgba(250,251,253,0.9) 55%, rgba(250,251,253,0) 100%)', filter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', top: 170, right: 96, textAlign: 'right', pointerEvents: 'none', opacity: 0.3 + 0.7 * antT, transform: `scale(${0.96 + 0.04 * antT})`, transformOrigin: 'top right' }}>
        <div style={{ fontFamily: FONTS.sans, fontSize: 22, fontWeight: 600, letterSpacing: '0.18em', color: C.muted, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <DigitRoll pos={rollPos} lineH={104 * 1.12} color={C.primary} blur={Math.min(6, rollV * 30)} />
        </div>
        <div style={{ height: 1, background: C.border, margin: '8px 0 10px auto', width: 220 }} />
        <div style={{ fontFamily: FONTS.sans, fontSize: 19, fontWeight: 600, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase' }}>{sub}</div>
      </div>
    </AbsoluteFill>
  );
};
