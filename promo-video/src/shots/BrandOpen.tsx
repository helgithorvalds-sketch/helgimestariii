// Shot 1 · brand-ink-open (demos/typography/brand-ink-open/BrandInkOpen.tsx), re-skinned for Verkefnastjórnun.
// Kept from the tuned demo: crosshair draw-on (v 0→9f, h 8→18f, fade 24→34f), per-glyph letterpress
// (delay 10 + i·3, 12f, bezier(.2,.7,.25,1), scale 1.6→1 + blur 6→0), under-glint, kicker typewriter
// 0.7f/char from f28 with block cursor, ≥30f clean hold of the complete title, 7f lift+shrink+fade exit (97→104).
// Adapted: the crosshair now "targets" the product's briefcase mark, which letterpresses in where the
// crosshair met as it fades; wordmark in the product's heading face (Plus Jakarta Sans 800, tracking-tight);
// amber → product primary blue; paper → the app's own background wash; mono kicker → Inter caps (product badge style).
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { APP_BG, C, FONTS } from '../brand';

export const BRAND_OPEN_DURATION = 104;

const WORDMARK = 'Verkefnastjórnun';
const KICKER = 'Verkefni · Símtöl · Sala';

export const BrandOpen: React.FC<{ kicker?: string }> = ({ kicker = KICKER }) => {
  const frame = useCurrentFrame();

  const vDraw = interpolate(frame, [0, 9], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const hDraw = interpolate(frame, [8, 18], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.linear });
  const crossFade = interpolate(frame, [24, 34], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // briefcase mark: same letterpress triad as the glyphs, landing as the crosshair lets go
  const markT = interpolate(frame, [18, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.25, 1) });

  const perChar = 0.7;
  const kickStart = 28;
  const kickChars = Math.floor(Math.max(0, frame - kickStart) / perChar);
  const kickDone = kickStart + kicker.length * perChar;
  const cursorOn = (() => {
    if (frame < kickStart) return false;
    if (frame < kickDone) return true;
    if (frame > 95) return false;
    return Math.floor((frame - kickDone) / 2) % 2 === 0;
  })();

  const brandOut = interpolate(frame, [97, 104], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.5, 1) });

  return (
    <AbsoluteFill style={{ background: APP_BG, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', opacity: 1 - brandOut, transform: `translateY(${-brandOut * 40}px) scale(${1 - brandOut * 0.12})` }}>
        <div style={{ position: 'relative', width: 132, height: 128, margin: '0 auto 30px' }}>
          <svg width={64} height={64} viewBox="0 0 64 64" style={{ position: 'absolute', left: 34, top: 32, opacity: crossFade }}>
            <line x1={32} y1={2} x2={32} y2={62} stroke={C.primary} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={vDraw} />
            <line x1={2} y1={32} x2={62} y2={32} stroke={C.primary} strokeWidth={5} strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={hDraw} />
          </svg>
          <Img
            src={staticFile('brand/logo-icon.png')}
            style={{
              position: 'absolute', inset: 0, width: 132, height: 128, objectFit: 'contain',
              opacity: markT, transform: `scale(${1.6 - 0.6 * markT})`, filter: `blur(${(1 - markT) * 6}px)`,
            }}
          />
        </div>

        <div style={{ fontFamily: FONTS.display, fontSize: 132, fontWeight: 800, color: C.ink, letterSpacing: '-0.025em', lineHeight: 1.08, whiteSpace: 'pre', display: 'inline-flex', alignItems: 'flex-end' }}>
          {WORDMARK.split('').map((ch, i) => {
            const delay = 10 + i * 3;
            const t = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.7, 0.25, 1) });
            const g = delay + 12;
            const glint = interpolate(frame, [g - 4, g, g + 4], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: t, transform: `scale(${1.6 - 0.6 * t})`, transformOrigin: 'center bottom', filter: `blur(${(1 - t) * 6}px)` }}>
                {ch}
                <span style={{ position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)', width: `${glint * 100}%`, height: 3, background: C.primary, opacity: glint, borderRadius: 2 }} />
              </span>
            );
          })}
        </div>

        <div style={{ fontFamily: FONTS.sans, fontSize: 32, fontWeight: 600, letterSpacing: '0.16em', color: C.muted, marginTop: 30, textTransform: 'uppercase', height: 38, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ whiteSpace: 'pre' }}>{kicker.slice(0, kickChars)}</span>
          <span style={{ display: 'inline-block', width: 16, height: 30, marginLeft: 6, background: C.primary, opacity: cursorOn ? 0.85 : 0, borderRadius: 2 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
