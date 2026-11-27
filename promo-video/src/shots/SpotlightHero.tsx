// Shot 2 · spotlight-hero-card (demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx).
// Hero = the real expanded company card "Ljósmyndastofa Lóu" on the captured board (hero-page.png):
// owner, website, "Næsta símtal … Í dag", price, and the three actions — the product's atomic unit.
// Its centre x is 960, the same composition choice as the demo's cards[3].
//
// Kept verbatim from the tuned demo (timing/easing/camera are the card's parameter truth):
//   lamp 1→6f (on–flicker–steady), 3-station hunt 4→28f, LOCK 34, PUSH 40→58 to rotY 34° / rotX 8° / zoom 2.6
//   (focus = card centre −105px x, −10px y), rise 56→66 bezier(.2,1.25,.3,1), bob 40f / 4px, beam lap1 68→82,
//   lap2 88→108, note 70→84 + marker 84→96, reseat 124→142, 30f locked hold. Card-shaped page-space darkness,
//   note layer on the same camera above the lights (known pitfalls from the card).
// Re-skinned: warm-black theatre → the app's dark-mode navy; tungsten → cool white; champagne → product blue.
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D, CamKey2D } from '../fixtures/PageCam2D';
import { EASE, Grain, ramp } from '../fixtures/Polish';
import { Dust, alpha } from '../fixtures/Look';
import layout from '../../public/textures/live/layout.json';
import { C, FONTS, NAVY } from '../brand';

export const SPOTLIGHT_HERO_DURATION = 177; // demo 172 + 5f extra locked hold so the next cut lands on a BGM beat

const L = NAVY;
const BEAM = C.primaryDark; // product blue (dark-mode primary) for beam / marker / landing light
const BEAM_CORE = 'rgba(246,250,255,0.98)';
const LAMP = '232,240,255'; // cool white key light
const DARK = '6,10,22'; // multiply colour ≈ app .dark background, keeps the page's hue
const PATCH = '#f8fafc';

const PAGE_H = layout.heroPage.pageH;
const CARD = { ...layout.heroPage.card, file: 'hero-card.png' };
const MCX = CARD.x + CARD.w / 2; // ≈ 960
const MCY = CARD.y + CARD.h / 2;
const RADIUS = 12; // rounded-xl in the app

// wide framing: put the card where the demo's card sat on screen (y ≈ 677px at zoom .8)
const CY0 = MCY - (677 - 540) / 0.8;

const LOCK = 34;
const PUSH0 = 40;
const PUSH1 = 58;
const RISE0 = 56;
const RISE1 = 66;
const RESEAT0 = 124;
const LAND = 142;

const CAM_KEYS: CamKey2D[] = [
  { frame: 0, cx: 960, cy: CY0, zoom: 0.8, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: PUSH0, cx: 960, cy: CY0, zoom: 0.8, rotX: 0, rotY: 0, rotZ: 0, persp: 1200 },
  { frame: PUSH1, cx: MCX - 105, cy: MCY - 10, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
  { frame: SPOTLIGHT_HERO_DURATION, cx: MCX - 105, cy: MCY - 10, zoom: 2.6, rotX: 8, rotY: 34, rotZ: 2, persp: 1200 },
];
const PUSH_EASE = Easing.bezier(0.35, 0, 0.2, 1);
const POP_EASE = Easing.bezier(0.2, 1.25, 0.3, 1);
const RESEAT_EASE = Easing.bezier(0.4, 0, 0.3, 1.05);
const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const camAt = (frame: number) => {
  let a = CAM_KEYS[0];
  let b = CAM_KEYS[CAM_KEYS.length - 1];
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    if (frame >= CAM_KEYS[i].frame && frame <= CAM_KEYS[i + 1].frame) { a = CAM_KEYS[i]; b = CAM_KEYS[i + 1]; break; }
  }
  const t = a.frame === b.frame ? 1 : interpolate(frame, [a.frame, b.frame], [0, 1], { ...clampOpt, easing: PUSH_EASE });
  const m = (x?: number, y?: number) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  return { cx: m(a.cx, b.cx), cy: m(a.cy, b.cy), zoom: m(a.zoom, b.zoom), rotX: m(a.rotX, b.rotX), rotY: m(a.rotY, b.rotY), rotZ: m(a.rotZ, b.rotZ), persp: m(a.persp, b.persp) };
};
const NoteCam: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const c = camAt(frame);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, perspective: `${c.persp * c.zoom}px`, perspectiveOrigin: '960px 540px' }}>
        <div style={{
          position: 'absolute', width: 1920, height: PAGE_H, zoom: c.zoom, transformOrigin: `${c.cx}px ${c.cy}px`, transformStyle: 'preserve-3d',
          transform: `translate(${960 / c.zoom - c.cx}px, ${540 / c.zoom - c.cy}px) rotateY(${c.rotY}deg) rotateX(${c.rotX}deg) rotateZ(${c.rotZ}deg)`,
        }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const SpotlightHero: React.FC<{ line1?: string; line2?: string }> = ({ line1 = 'Hvert símtal,', line2 = 'á hreinu.' }) => {
  const frame = useCurrentFrame();

  const lamp = interpolate(frame, [1, 3, 4, 6], [0, 1, 0.62, 1], clampOpt);

  // hunt stations (screen %) land on real content in this framing: e-mail rows → stage header → "Vildi forskoðun" column → lock
  const ST = [4, 10, 13, 19, 22, 28, LOCK, PUSH1];
  const spotX = interpolate(frame, ST, [24, 24, 72, 72, 38, 38, 50, 60], { ...clampOpt, easing: EASE.smooth });
  const spotY = interpolate(frame, ST, [30, 30, 40, 40, 62, 62, 64, 55], { ...clampOpt, easing: EASE.smooth });
  const poolBase = interpolate(frame, [22, LOCK, PUSH1], [400, 300, 470], { ...clampOpt, easing: EASE.swift });
  const pulse = interpolate(frame, [LOCK, LOCK + 4, LOCK + 10], [0, 0.06, 0], clampOpt);
  const breathe = 1 + 0.015 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);
  const poolRx = poolBase * (1 + pulse) * breathe;
  const poolRy = poolBase * interpolate(frame, [PUSH0, PUSH1], [0.8, 0.92], clampOpt) * (1 + pulse) * breathe;
  const dark = interpolate(frame, [0, LOCK, PUSH1], [0.9, 0.92, 0.94], clampOpt);
  const cardLight = ramp(frame, LOCK + 4, PUSH1 - LOCK - 4, EASE.smooth);
  const holdBreath = 1 + 0.012 * Math.sin((frame - LAND) / 14) * ramp(frame, LAND, 20, EASE.out);

  const rise = interpolate(frame, [RISE0, RISE1], [0, 1], { ...clampOpt, easing: POP_EASE });
  const reseat = interpolate(frame, [RESEAT0, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const lift = rise * (1 - reseat);
  const bob = Math.sin(((frame - RISE1) / 40) * Math.PI * 2) * 4 * lift;
  const z = 110 * lift + bob;
  const landed = frame >= LAND;
  const press = interpolate(frame, [LAND - 4, LAND - 1, LAND], [1, 0.997, 1], clampOpt);
  const shadow = `${-10 * lift}px ${10 * lift}px ${12 + 12 * lift}px rgba(4,8,20,${0.35 * lift}), ${-36 * lift}px ${48 * lift}px ${90 * lift}px rgba(4,8,20,${0.42 * lift})`;

  const slotVis = Math.min(1, rise * 2) * (1 - reseat);
  const landPulse = interpolate(frame, [LAND - 4, LAND, LAND + 14], [0, 1, 0], clampOpt);
  const slotEdge = Math.min(1, 0.45 * (1 - reseat)) + landPulse * 0.5;

  const beam1Prog = interpolate(frame, [68, 82], [0, 1], { ...clampOpt, easing: EASE.linear });
  const beam1On = frame >= 67 && frame <= 83;
  const beam2Prog = interpolate(frame, [88, 108], [0, 1], { ...clampOpt, easing: EASE.swift });
  const beam2On = frame >= 87 && frame <= 109;
  const beamTrail = interpolate(frame, [108, 122], [0.4, 0], clampOpt);
  const bw = CARD.w + 6;
  const bh = CARD.h + 6;

  const hiresIn = interpolate(frame, [PUSH0, PUSH0 + 6], [0, 1], clampOpt);
  const rimOn = 0.5 * Math.min(1, lift + ramp(frame, PUSH0, 16, EASE.linear));

  const noteIn = ramp(frame, 70, 14, EASE.out);
  const noteSettle = interpolate(frame, [RESEAT0 - 4, LAND], [0, 1], { ...clampOpt, easing: RESEAT_EASE });
  const noteZ = 4 + (88 + Math.sin(((frame - 70) / 44) * Math.PI * 2) * 3) * (1 - noteSettle);
  const hl = ramp(frame, 84, 12, EASE.swift);

  const px = (spotX / 100) * 1920;
  const py = (spotY / 100) * 1080;
  const sx = px + 420;
  const sy = -720;
  const coneW = poolRx * 0.6;
  const cone = `${sx - 26}px ${sy}px, ${sx + 26}px ${sy}px, ${px + coneW}px ${py}px, ${px - coneW}px ${py}px`;

  // annotation sits left of the card (same offsets as the demo: right edge stops before the card's left edge)
  const NOTE_X = CARD.x - 251;
  const NOTE_Y = CARD.y + 24;

  return (
    <AbsoluteFill style={{ backgroundColor: L.bg[2] }}>
      <PageCam2D src="textures/live/hero-page.png" pageH={PAGE_H} keys={CAM_KEYS} ease={PUSH_EASE} bg={L.bg[1]}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(225,236,255,0.8)', filter: 'blur(6px)', opacity: rimOn, pointerEvents: 'none' }} />

        {cardLight > 0.001 ? (
          <svg width={1920} height={PAGE_H} style={{ position: 'absolute', left: 0, top: 0, transform: 'translateZ(1px)', opacity: cardLight, pointerEvents: 'none' }}>
            <defs>
              <filter id="shc-tight" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
              <filter id="shc-wide" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="60" /></filter>
              <mask id="shc-hole" maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={PAGE_H}>
                <rect x={0} y={0} width={1920} height={PAGE_H} fill="white" />
                <rect x={CARD.x - 60} y={CARD.y - 50} width={CARD.w + 120} height={CARD.h + 100} rx={70} fill="#262626" filter="url(#shc-wide)" />
                <rect x={CARD.x - 14} y={CARD.y - 14} width={CARD.w + 28} height={CARD.h + 28} rx={RADIUS + 14} fill="black" filter="url(#shc-tight)" />
              </mask>
            </defs>
            <rect x={0} y={0} width={1920} height={PAGE_H} fill={`rgb(${DARK})`} fillOpacity={Math.min(0.97, 0.94 * holdBreath)} mask="url(#shc-hole)" />
          </svg>
        ) : null}

        <div style={{ transformStyle: 'preserve-3d' }}>
          {slotVis > 0.02 || landPulse > 0.02 ? (
            <div style={{
              position: 'absolute', left: CARD.x - 2, top: CARD.y - 2, width: CARD.w + 4, height: CARD.h + 4, transform: 'translateZ(1.5px)',
              background: slotVis > 0.02 ? PATCH : 'transparent', borderRadius: RADIUS,
              boxShadow: `inset 0 0 26px rgba(36,99,235,${(0.16 * slotEdge).toFixed(3)})`, opacity: Math.max(slotVis, landPulse),
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, border: `1.5px solid ${BEAM}`, opacity: slotEdge, boxShadow: landPulse > 0.02 ? `0 0 ${(24 * landPulse).toFixed(1)}px ${alpha(BEAM, 0.8)}` : undefined }} />
            </div>
          ) : null}

          <div style={{
            position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h,
            transform: `translateZ(${(z + 2).toFixed(2)}px) scale(${press})`, transformOrigin: 'center center', transformStyle: 'preserve-3d',
          }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS, overflow: 'hidden', boxShadow: landed ? 'none' : shadow }}>
              <Img src={staticFile(`textures/live/${CARD.file}`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
              <Img src={staticFile('textures/live/hero-card-hires.png')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: hiresIn }} />
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(200deg, rgba(${LAMP},0.3), rgba(${LAMP},0) 45%, rgba(8,14,30,0.08) 100%)`, opacity: lift, pointerEvents: 'none' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, borderRadius: RADIUS,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,${(0.7 * lift).toFixed(3)}), 0 0 0 1.5px rgba(205,222,255,${(0.7 * cardLight).toFixed(3)}), 0 0 44px rgba(120,165,255,${(0.2 * cardLight).toFixed(3)})`, pointerEvents: 'none' }} />

            {(beam1On || beam2On) && lift > 0.4 ? (
              <svg width={bw} height={bh} viewBox={`0 0 ${bw} ${bh}`} style={{
                position: 'absolute', left: -3, top: -3, overflow: 'visible', pointerEvents: 'none', opacity: beam1On ? 1 : 0.62,
                filter: `drop-shadow(0 0 6px ${alpha(BEAM, 0.9)}) drop-shadow(0 0 18px rgba(200,220,255,0.55))`,
              }}>
                <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={BEAM} strokeWidth={beam1On ? 5 : 3.5} strokeLinecap="round"
                  pathLength={1} strokeDasharray="0.16 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
                <rect x={2} y={2} width={bw - 4} height={bh - 4} rx={RADIUS} fill="none" stroke={BEAM_CORE} strokeWidth={beam1On ? 2.5 : 1.75} strokeLinecap="round"
                  pathLength={1} strokeDasharray="0.16 1" strokeDashoffset={-(beam1On ? beam1Prog : beam2Prog)} />
              </svg>
            ) : null}
            {beamTrail > 0.01 ? (
              <div style={{ position: 'absolute', inset: -3, borderRadius: RADIUS + 3, border: `1.5px solid ${BEAM}`, opacity: beamTrail, pointerEvents: 'none' }} />
            ) : null}
          </div>
        </div>
      </PageCam2D>

      <AbsoluteFill style={{
        background: `radial-gradient(${(poolRx * 1.35).toFixed(1)}px ${(poolRy * 1.35).toFixed(1)}px at ${spotX}% ${spotY}%, rgba(${DARK},0) 0%, rgba(${DARK},0) 26%, rgba(${DARK},${(dark * 0.25).toFixed(3)}) 44%, rgba(${DARK},${(dark * 0.62).toFixed(3)}) 62%, rgba(${DARK},${(dark * 0.9).toFixed(3)}) 80%, rgba(${DARK},${dark.toFixed(3)}) 100%)`,
        mixBlendMode: 'multiply', pointerEvents: 'none', opacity: lamp * (1 - cardLight),
      }} />
      <AbsoluteFill style={{ background: `rgba(${DARK},1)`, mixBlendMode: 'multiply', opacity: 0.84 * (1 - lamp), pointerEvents: 'none' }} />
      <AbsoluteFill style={{
        background: `radial-gradient(${(poolRx * 1.2).toFixed(1)}px ${(poolRy * 1.2).toFixed(1)}px at ${spotX}% ${spotY}%, rgba(${LAMP},0.24) 0%, rgba(${LAMP},0.12) 50%, rgba(${LAMP},0) 80%)`,
        mixBlendMode: 'soft-light', pointerEvents: 'none', opacity: lamp * (1 - cardLight),
      }} />
      <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none', opacity: lamp * (1 - 0.45 * ramp(frame, PUSH0, 18, EASE.smooth)) }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(28px)' }}>
          <div style={{
            position: 'absolute', inset: 0, clipPath: `polygon(${cone})`,
            background: `linear-gradient(${(Math.atan2(py - sy, px - sx) * 180 / Math.PI - 90).toFixed(1)}deg, rgba(${LAMP},0.34) 0%, rgba(${LAMP},0.16) 60%, rgba(${LAMP},0.06) 100%)`,
          }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, clipPath: `polygon(${cone})` }}>
          <Dust look={L} count={36} seed={4} drift={0.3} opacity={0.6} color="#e4eeff" />
        </div>
      </AbsoluteFill>

      <NoteCam frame={frame}>
        {frame >= 70 ? (
          <div style={{ transformStyle: 'preserve-3d', pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', left: NOTE_X - 8, top: NOTE_Y + 98, width: 240, height: 70, transform: 'translateZ(2px)',
              background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.55), transparent 70%)', filter: 'blur(12px)',
              opacity: 0.5 * noteIn * (1 - noteSettle),
            }} />
            <div style={{
              position: 'absolute', left: CARD.x - 381, top: CARD.y - 40, width: 380, height: 240,
              transform: `translateZ(${(noteZ - 1).toFixed(2)}px) translateY(${((1 - noteIn) * 26).toFixed(2)}px)`,
              background: 'radial-gradient(ellipse 50% 50% at 52% 50%, rgba(8,12,26,0.97) 0%, rgba(8,12,26,0.9) 60%, rgba(8,12,26,0) 100%)',
              filter: 'blur(6px)', opacity: noteIn,
            }} />
            <div style={{
              position: 'absolute', left: NOTE_X, top: NOTE_Y, width: 'max-content', whiteSpace: 'nowrap',
              transform: `translateZ(${noteZ.toFixed(2)}px) translateY(${((1 - noteIn) * 26).toFixed(2)}px)`,
              opacity: noteIn, filter: noteIn < 1 ? `blur(${((1 - noteIn) * 4).toFixed(2)}px)` : undefined,
              fontFamily: FONTS.display, letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#f3f6fc', textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>{line1}</div>
              <div style={{ position: 'relative', display: 'inline-block', marginTop: 2 }}>
                <div style={{ position: 'absolute', left: -6, top: '8%', bottom: '2%', width: `calc(${hl.toFixed(4)} * (100% + 12px))`, background: C.primary, borderRadius: 4 }} />
                <div style={{ position: 'relative', fontSize: 34, fontWeight: 800, color: '#ffffff' }}>{line2}</div>
              </div>
            </div>
          </div>
        ) : null}
      </NoteCam>
      <Grain opacity={0.07} blend="soft-light" />
    </AbsoluteFill>
  );
};
