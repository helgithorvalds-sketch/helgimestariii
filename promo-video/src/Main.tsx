// Verkefnastjórnun — product film (≈23.8s @30fps, 1920×1080).
// SHOTS is the single source of truth for the timeline; the SFX table is pinned relative to it.
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { C } from './brand';
import { BrandOpen } from './shots/BrandOpen';
import { SpotlightHero } from './shots/SpotlightHero';
import { TitleCard } from './shots/TitleCard';
import { DeckDeal } from './shots/DeckDeal';
import { CallStack } from './shots/CallStack';
import { Outro } from './shots/Outro';
import { SFX } from './sfx';

import { SHOTS, TOTAL } from './timeline';
export { SHOTS, TOTAL };

const order = [
  ['open', BrandOpen],
  ['hero', SpotlightHero],
  ['title', TitleCard],
  ['deal', DeckDeal],
  ['calls', CallStack],
  ['outro', Outro],
] as const;

export const BGM = { src: 'audio/bgm/house-vibez.mp3', volume: 0.42, fadeIn: 8, fadeOut: 24 };

export const Main: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => (
  <AbsoluteFill style={{ backgroundColor: C.darkBg }}>
    {order.map(([k, Comp]) => (
      <Sequence key={k} from={SHOTS[k].from} durationInFrames={SHOTS[k].dur} name={k}>
        <Comp />
      </Sequence>
    ))}
    {bgm ? (
      <Audio
        src={staticFile(BGM.src)}
        volume={(f) => BGM.volume * interpolate(f, [0, BGM.fadeIn, TOTAL - BGM.fadeOut, TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    ) : null}
    {SFX.map((s, i) => (
      <Sequence key={`sfx-${i}`} from={s.from} durationInFrames={s.dur ?? 90} name={`sfx ${s.note}`}>
        <Audio src={staticFile(s.src)} volume={s.volume} startFrom={s.trim ?? 0} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
