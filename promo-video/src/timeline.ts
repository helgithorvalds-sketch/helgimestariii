// Single source of truth for shot timing (frames @30fps). Captions/SFX derive from it.
import { BRAND_OPEN_DURATION } from './shots/BrandOpen';
import { SPOTLIGHT_HERO_DURATION } from './shots/SpotlightHero';
import { TITLE_CARD_DURATION } from './shots/TitleCard';
import { DECK_DEAL_DURATION } from './shots/DeckDeal';
import { CALL_STACK_DURATION } from './shots/CallStack';
import { OUTRO_DURATION } from './shots/Outro';

export const ORDER = [
  ['open', BRAND_OPEN_DURATION],
  ['hero', SPOTLIGHT_HERO_DURATION],
  ['title', TITLE_CARD_DURATION],
  ['deal', DECK_DEAL_DURATION],
  ['calls', CALL_STACK_DURATION],
  ['outro', OUTRO_DURATION],
] as const;
export type ShotKey = (typeof ORDER)[number][0];
export const SHOTS = (() => {
  let from = 0;
  const out = {} as Record<ShotKey, { from: number; dur: number }>;
  for (const [k, dur] of ORDER) { out[k] = { from, dur }; from += dur; }
  return out;
})();
export const TOTAL = ORDER.reduce((s, [, d]) => s + d, 0);
