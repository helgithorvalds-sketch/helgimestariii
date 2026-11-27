// Shot 3 · paper-title-card (demos/typography/paper-title-card/PaperTitleCard.tsx) — breathing card.
// Kept: 55f, word-by-word letterpress (delay 4 + i·4, 9f, scale 1.28→1, blur 7→0), exactly one accent word in
// italic, rule scaleX 16→34f, sub line from f10 with a DigitRoll that settles before the fade, 8f fade-out.
// Re-skinned: serif/amber/paper → product heading face (Plus Jakarta Sans 800), primary blue, app background;
// mono sub → Inter caps. The number is the real header count on the captured board ("27 fyrirtæki samtals").
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { APP_BG, C, FONTS } from '../brand';

export const TITLE_CARD_DURATION = 59; // 55 + 4f read time → cut on a BGM beat

type W = { text: string; accent?: boolean; br?: boolean };
const WORDS: W[] = [{ text: 'Frá' }, { text: 'fyrsta' }, { text: 'pósti', br: true }, { text: 'til' }, { text: 'greiðslu.', accent: true }];

const DIGITS = '0123456789';
const DigitColumn: React.FC<{ ch: string; delay: number; lineH: number }> = ({ ch, delay, lineH }) => {
  const frame = useCurrentFrame();
  const target = DIGITS.indexOf(ch);
  const t = interpolate(frame, [delay, delay + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
  return (
    <span style={{ display: 'inline-block', height: lineH }}>
      <span style={{ display: 'block', transform: `translateY(${-(10 + target) * t * lineH}px)` }}>
        {(DIGITS + DIGITS).split('').map((d, j) => (
          <span key={j} style={{ display: 'block', fontSize: 28, fontWeight: 800, lineHeight: `${lineH}px`, color: C.primary, fontVariantNumeric: 'tabular-nums' }}>{d}</span>
        ))}
      </span>
    </span>
  );
};

export const TitleCard: React.FC<{ words?: W[]; sub?: string; subDigits?: string }> = ({ words = WORDS, sub = 'fyrirtæki samtals', subDigits = '27' }) => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [TITLE_CARD_DURATION - 8, TITLE_CARD_DURATION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const underline = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const subT = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineH = 28 * 1.15;

  return (
    <AbsoluteFill style={{ background: APP_BG, justifyContent: 'center', alignItems: 'center', opacity: fadeOut }}>
      <div style={{ textAlign: 'center', maxWidth: 1500 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 124, fontWeight: 800, lineHeight: 1.12, color: C.ink, letterSpacing: '-0.03em', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.24em' }}>
          {words.map((w, i) => {
            const delay = 4 + i * 4;
            const t = interpolate(frame, [delay, delay + 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.75, 0.3, 1) });
            return (
              <React.Fragment key={i}>
                <span style={{ opacity: t, transform: `scale(${1.28 - 0.28 * t})`, filter: `blur(${(1 - t) * 7}px)`, display: 'inline-block', fontStyle: w.accent ? 'italic' : 'normal', color: w.accent ? C.primary : undefined }}>
                  {w.text}
                </span>
                {w.br && <span style={{ flexBasis: '100%', height: 0 }} />}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ height: 6, width: 220, margin: '38px auto 0', borderRadius: 3, background: C.primary, transform: `scaleX(${underline})` }} />
        <div style={{ fontFamily: FONTS.sans, fontSize: 26, fontWeight: 600, letterSpacing: '0.14em', color: C.muted, marginTop: 34, opacity: subT, textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5em' }}>
          <span style={{ display: 'inline-flex', overflow: 'hidden', height: lineH, verticalAlign: 'bottom' }}>
            {subDigits.split('').map((c, i) => <DigitColumn key={i} ch={c} delay={12 + i * 4} lineH={lineH} />)}
          </span>
          <span>{sub}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
