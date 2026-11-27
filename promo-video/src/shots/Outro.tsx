// Shot 6 · outro-group-photo-launch (demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx) — film peak.
// Every element shown earlier flies in from all sides for a "group photo" around the wordmark.
// Kept from the tuned demo: background page blurs 0→14px over 24f; 9 elements, cue 4 + 3f each, 12f flight
// bezier(.34,1.4,.44,1) with true overshoot, render order = cue order, direction-of-travel SpeedBlur, 1.5% landing
// press; crane rotateX 4°→0 + scale settle then slow push; opening light sweep 2–14f; stage light behind the
// wordmark 42–58f; recede of the group (−12% opacity / −8% saturation) at 42–50f; mark pressed 4f before the
// letters (delay 42 + i·1.8, 8f); rule + 190px extension lines; tagline at 68f; dust + foreground bokeh; final
// 12f fade to the dark background.
// Re-skinned: video-shotcraft mark/wordmark → the product's briefcase mark + "Verkefnastjórnun" in its heading
// face; amber → primary blue; warm scrim, gold dust and brown vignette → the app's cool whites/blues and navy.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { PageCam2D } from '../fixtures/PageCam2D';
import { EASE, Grain, SpeedBlur, ramp, velocity } from '../fixtures/Polish';
import layout from '../../public/textures/live/layout.json';
import { C, FONTS } from '../brand';

export const OUTRO_DURATION = 145;

const WORD = 'Verkefnastjórnun';
const PAGE_H = layout.texture.height;
const TEX = { x: layout.texture.offsetX, w: layout.texture.width };
const FLY_EASE = Easing.bezier(0.34, 1.4, 0.44, 1);
const CRANE_EASE = Easing.bezier(0.3, 0, 0.2, 1);
const sched = (title: string) => layout.board.sched.find((s) => s.title === title)!;

type FlyEl = { key: string; file: string; w: number; h: number; cx: number; cy: number; scale: number; rot: number; dx: number; dy: number; radius: number; cue: number };
const S = (title: string) => { const s = sched(title); return { file: s.file, w: s.w, h: s.h }; };
const ELS: FlyEl[] = [
  { key: 'nav', file: 'nav.png', w: layout.texture.width, h: layout.board.header.h, cx: 960, cy: 84, scale: 0.52, rot: 0, dx: 0, dy: -120, radius: 10, cue: 4 },
  { key: 'hero', file: 'hero-card-hires.png', w: layout.heroPage.card.w, h: layout.heroPage.card.h, cx: 300, cy: 300, scale: 0.92, rot: -5, dx: -500, dy: 0, radius: 12, cue: 7 },
  { key: 'paid', ...S('Gistiheimilið Lind'), cx: 1630, cy: 318, scale: 1.18, rot: 4, dx: 500, dy: 0, radius: 12, cue: 10 },
  { key: 'scheduled', ...S('Hestaleiga Heklu'), cx: 1440, cy: 760, scale: 0.72, rot: -3, dx: 450, dy: 260, radius: 12, cue: 13 },
  { key: 'finished', ...S('Fiskbúð Fróða'), cx: 290, cy: 800, scale: 1.12, rot: 3, dx: -400, dy: 300, radius: 12, cue: 16 },
  { key: 'call', file: layout.board.callRows[0].file, w: layout.board.callRows[0].w, h: layout.board.callRows[0].h, cx: 640, cy: 935, scale: 0.9, rot: 2, dx: 0, dy: 320, radius: 8, cue: 19 },
  { key: 'badge', file: 'badge-preview.png', w: layout.board.sections.find((s) => s.label === 'Vill sýnishorn')!.badge.w + 4, h: layout.board.sections.find((s) => s.label === 'Vill sýnishorn')!.badge.h + 4, cx: 760, cy: 196, scale: 1.6, rot: -1.5, dx: 0, dy: -240, radius: 18, cue: 22 },
  { key: 'registered', ...S('Blómabúðin Sóley'), cx: 1560, cy: 960, scale: 1.0, rot: -2, dx: 380, dy: 0, radius: 12, cue: 25 },
  { key: 'email', ...S('Kaffi Kría'), cx: 1250, cy: 178, scale: 0.9, rot: 2.5, dx: 360, dy: -200, radius: 12, cue: 28 },
];

const DUST = Array.from({ length: 20 }, (_, i) => ({
  x: (i * 439 + 137) % 1920, y0: (i * 613 + 271) % 1080, rise: 0.3 + (i % 5) * 0.11, swayAmp: 9 + (i % 4) * 5,
  swayFreq: 0.022 + (i % 3) * 0.008, phase: (i * 0.83) % (Math.PI * 2), size: 2.4 + (i % 3) * 0.9, opacity: 0.35 + ((i * 7) % 5) * 0.09,
}));
const BOKEH = Array.from({ length: 6 }, (_, i) => ({ x: (i * 701 + 260) % 1920, y0: (i * 389 + 640) % 1080, rise: 0.55 + (i % 3) * 0.2, size: 14 + (i % 3) * 7, opacity: 0.1 + (i % 2) * 0.06 }));

export const Outro: React.FC<{ tagline?: string }> = ({ tagline = 'Söluferlið á einum stað' }) => {
  const frame = useCurrentFrame();
  const duration = OUTRO_DURATION;
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

  const blur = interpolate(frame, [0, 24], [0, 14], { ...clamp, easing: Easing.bezier(0.4, 0, 0.4, 1) });
  const rule = interpolate(frame, [58, 70], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const tag = ramp(frame, 68, 12, EASE.out);
  const fadeOut = 1 - ramp(frame, duration - 12, 11, EASE.exit);
  const recede = interpolate(frame, [42, 50], [0, 1], clamp);
  const craneT = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: CRANE_EASE });
  const pushT = ramp(frame, 36, duration - 36, EASE.smooth);
  // crane eases in from rest (scale 1, no tilt) so f0 matches the previous shot's last frame exactly
  const craneIn = interpolate(frame, [0, 6], [0, 1], { ...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1) });
  const camScale = 1 + (0.06 - 0.06 * craneT) * craneIn + 0.035 * pushT;
  const camTilt = 4 * (1 - craneT) * craneIn;
  const sweepX = interpolate(frame, [2, 14], [-700, 2020], { ...clamp, easing: Easing.bezier(0.4, 0, 0.6, 1) });
  const sweepOpacity = interpolate(frame, [2, 5, 11, 14], [0, 0.12, 0.12, 0], clamp);
  const stageLight = interpolate(frame, [42, 50, 58], [0, 0.55, 0.32], clamp);
  const vignette = interpolate(frame, [42, 54], [0, 0.1], clamp);
  const ruleExt = interpolate(frame, [58, 66], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const ruleExtFade = interpolate(frame, [66, 72], [1, 0], clamp);
  const wordSpacing = interpolate(frame, [62, 66], [-0.01, 0.005], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });

  return (
    <AbsoluteFill style={{ background: C.darkBg }}>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <AbsoluteFill style={{ transform: `perspective(1400px) rotateX(${camTilt}deg) scale(${camScale})`, transformOrigin: '50% 45%' }}>
          <PageCam2D src="textures/live/board-full.png" pageH={PAGE_H} keys={[{ frame: 0, cx: 960, cy: 640, zoom: 0.86 }, { frame: 40, cx: 960, cy: 700, zoom: 0.75 }]} blur={blur} bg={C.bg} tex={TEX} />
          <AbsoluteFill style={{ background: 'radial-gradient(1200px 800px at 50% 48%, rgba(250,251,253,0.84), rgba(250,251,253,0.58) 60%, rgba(250,251,253,0.38))', pointerEvents: 'none', opacity: interpolate(frame, [0, 16], [0, 1], clamp) }} />

          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            {ELS.map((el) => {
              if (frame < el.cue) return null;
              const t = interpolate(frame, [el.cue, el.cue + 12], [0, 1], { ...clamp, easing: FLY_EASE });
              const opacity = interpolate(frame, [el.cue, el.cue + 3], [0, 1], clamp);
              const x = el.dx * (1 - t);
              const y = el.dy * (1 - t);
              const rot = el.rot * (2 - t);
              const scale = el.scale * (1.12 - 0.12 * t);
              const air = Math.max(0, 1 - t);
              const shadow = air > 0.01
                ? `0 ${10 + 26 * air}px ${24 + 46 * air}px rgba(15,23,41,${0.14 + 0.1 * air}), 0 2px 6px rgba(15,23,41,.07)`
                : '0 10px 24px rgba(15,23,41,.14), 0 2px 6px rgba(15,23,41,.07)';
              const posAt = (fr: number) => {
                const tt = interpolate(fr, [el.cue, el.cue + 12], [0, 1], { ...clamp, easing: FLY_EASE });
                return [el.dx * (1 - tt), el.dy * (1 - tt)];
              };
              const vx = velocity((fr) => posAt(fr)[0], frame);
              const vy = velocity((fr) => posAt(fr)[1], frame);
              const land = interpolate(frame, [el.cue + 9, el.cue + 12, el.cue + 16], [0, 1, 0], clamp);
              return (
                <SpeedBlur key={el.key} vx={vx} vy={vy} amount={0.3} max={22}>
                  <div style={{
                    position: 'absolute', left: el.cx - el.w / 2, top: el.cy - el.h / 2, width: el.w, height: el.h,
                    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale * (1 - 0.015 * land)})`, transformOrigin: 'center center',
                    borderRadius: el.radius, overflow: 'hidden',
                    boxShadow: land > 0.01 ? `0 ${10 - 5 * land}px ${24 - 12 * land}px rgba(15,23,41,${0.14 + 0.06 * land}), 0 2px 6px rgba(15,23,41,${0.07 + 0.06 * land})` : shadow,
                    opacity: opacity * (1 - 0.12 * recede), filter: `saturate(${1 - 0.08 * recede})`, background: '#fff',
                  }}>
                    <Img src={staticFile(`textures/live/${el.file}`)} style={{ position: 'absolute', inset: 0, width: el.w, height: el.h, display: 'block' }} />
                  </div>
                </SpeedBlur>
              );
            })}
          </AbsoluteFill>
        </AbsoluteFill>

        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {DUST.map((d, i) => {
            const y = (((d.y0 - frame * d.rise) % 1080) + 1080) % 1080;
            const x = d.x + Math.sin(frame * d.swayFreq + d.phase) * d.swayAmp;
            const twinkle = 0.7 + 0.3 * Math.sin(frame * 0.21 + d.phase * 3);
            return <div key={i} style={{ position: 'absolute', left: x, top: y, width: d.size, height: d.size, borderRadius: '50%', background: 'oklch(70% 0.13 258)', opacity: d.opacity * twinkle * 0.8, boxShadow: `0 0 ${d.size * 2.5}px ${d.size * 0.6}px oklch(80% 0.1 258 / 0.55)` }} />;
          })}
          {BOKEH.map((b, i) => {
            const y = (((b.y0 - frame * b.rise) % 1180) + 1180) % 1180 - 50;
            return <div key={`b${i}`} style={{ position: 'absolute', left: b.x, top: y, width: b.size, height: b.size, borderRadius: '50%', background: 'radial-gradient(circle, oklch(82% 0.09 258 / 0.9) 0%, oklch(82% 0.09 258 / 0.35) 55%, oklch(82% 0.09 258 / 0) 72%)', opacity: b.opacity, filter: 'blur(2px)' }} />;
          })}
        </AbsoluteFill>

        {sweepOpacity > 0 ? (
          <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: sweepX - 300, width: 600, background: 'linear-gradient(90deg, rgba(236,243,255,0), rgba(236,243,255,1) 50%, rgba(236,243,255,0))', opacity: sweepOpacity }} />
          </AbsoluteFill>
        ) : null}
        {stageLight > 0 ? (
          <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(760px 380px at 960px 470px, rgba(252,253,255,0.97), rgba(250,252,255,0.4) 55%, rgba(250,252,255,0) 75%)', opacity: stageLight }} />
        ) : null}
        {vignette > 0 ? (
          <AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(1400px 900px at 50% 50%, rgba(15,23,41,0) 55%, rgba(15,23,41,0.7) 100%)', opacity: vignette }} />
        ) : null}

        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONTS.display, fontSize: 118, fontWeight: 800, lineHeight: 1.18, color: C.ink, letterSpacing: `${-0.025 + wordSpacing}em`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 0 rgba(255,255,255,0.75), 0 14px 36px rgba(15,23,41,0.12)',
            }}>
              {(() => {
                const t = interpolate(frame, [38, 46], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
                return (
                  <div style={{ marginRight: 30, opacity: t, transform: `translateY(${(1 - t) * 28}px) scale(${1.35 - 0.35 * t})`, filter: t < 0.995 ? `blur(${(1 - t) * 8}px)` : undefined }}>
                    <Img src={staticFile('brand/logo-icon.png')} style={{ width: 150, height: 145, display: 'block' }} />
                  </div>
                );
              })()}
              {WORD.split('').map((ch, i) => {
                const delay = Math.round(42 + i * 1.8);
                const t = interpolate(frame, [delay, delay + 8], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
                return <span key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * 28}px) scale(${1.35 - 0.35 * t})`, filter: `blur(${(1 - t) * 8}px)`, display: 'inline-block', whiteSpace: 'pre' }}>{ch}</span>;
              })}
            </div>
            <div style={{ position: 'relative', height: 6, width: 260, margin: '30px auto 0' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: C.primary, transform: `scaleX(${rule})` }} />
              {ruleExt > 0 && ruleExtFade > 0 ? (
                <>
                  <div style={{ position: 'absolute', top: 2.5, height: 1, right: '100%', width: 190 * ruleExt, background: C.primary, opacity: ruleExtFade }} />
                  <div style={{ position: 'absolute', top: 2.5, height: 1, left: '100%', width: 190 * ruleExt, background: C.primary, opacity: ruleExtFade }} />
                </>
              ) : null}
            </div>
            <div style={{ fontFamily: FONTS.sans, fontSize: 32, fontWeight: 600, letterSpacing: '0.16em', color: C.muted, marginTop: 30, textTransform: 'uppercase', opacity: tag, transform: `translateY(${(1 - tag) * 6}px)` }}>
              {tagline}
            </div>
          </div>
        </AbsoluteFill>
        <Grain opacity={0.045} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
