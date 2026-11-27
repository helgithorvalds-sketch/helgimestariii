// Central SFX table, pinned relative to SHOTS. Each `from` = action frame − the sample's measured energy peak
// (public/audio/sfx/audio-manifest.json → analysis.energy_peak_seconds × 30), so the peak lands on the action.
// All sounds: Freesound CC0 previews (see public/audio/sfx/FREESOUND-CREDITS.md).
import { SHOTS } from './timeline';

export type Sfx = { from: number; src: string; volume: number; dur?: number; trim?: number; note: string };
const at = (shot: keyof typeof SHOTS, offset: number, peakSec: number) => SHOTS[shot].from + offset - Math.round(peakSec * 30);

const LAMP = 'audio/sfx/fs-253659.mp3'; // StandardLamp-Switch, peak 0.005s
const WOOSH = 'audio/sfx/fs-683096.mp3'; // Woosh, peak 0.955s
const DEAL = 'audio/sfx/fs-571577.mp3'; // Playing Card Deal, peak 0.335s
const SWOOSH_LONG = 'audio/sfx/fs-632763.mp3'; // Transition Swoosh, peak 0.075s
const SWOOSH_SHORT = 'audio/sfx/fs-786514.mp3'; // swoosh_v2, peak 0.185s
const SLIDE = 'audio/sfx/fs-648387-norm.mp3'; // SlidePaperOnPaper (+31 dB, limited), peak 0.335s
const RISER = 'audio/sfx/fs-503813.mp3'; // reverse fx 12, peak 0.335s
const IMPACT = 'audio/sfx/fs-754564.mp3'; // Impact SFX PS 016, peak 0.605s
const SHIMMER = 'audio/sfx/fs-714565.mp3'; // Fashion Shimmer stinger, peak 0.735s

export const SFX: Sfx[] = [
  // hero: the stage lamp is switched on (f2), push-in + card rise (peak at the pop, f60), card reseats (f142)
  { from: at('hero', 2, 0.005), src: LAMP, volume: 0.9, dur: 20, note: 'hero lamp on' },
  { from: at('hero', 60, 0.955), src: WOOSH, volume: 0.45, dur: 54, note: 'hero push + rise' },
  { from: at('hero', 142, 0.335), src: DEAL, volume: 0.45, dur: 26, note: 'hero card reseats' },
  // title card: first word presses in (f4)
  { from: at('title', 5, 0.185), src: SWOOSH_SHORT, volume: 0.35, dur: 12, note: 'title words press in' },
  // deal: first four cards get their own deal sound (decreasing), the accelerating run collapses into one swoosh
  { from: at('deal', 46, 0.335), src: DEAL, volume: 0.55, dur: 24, note: 'deal card 1 lands' },
  { from: at('deal', 50, 0.335), src: DEAL, volume: 0.42, dur: 24, note: 'deal card 2 lands' },
  { from: at('deal', 54, 0.335), src: DEAL, volume: 0.34, dur: 24, note: 'deal card 3 lands' },
  { from: at('deal', 58, 0.335), src: DEAL, volume: 0.26, dur: 24, note: 'deal card 4 lands' },
  { from: at('deal', 62, 0.075), src: SWOOSH_LONG, volume: 0.3, dur: 45, note: 'deal run + camera rise' },
  // call list: five rows land (cue + 22), alternating levels to avoid a machine-gun feel
  ...[28, 40, 52, 64, 76].map((f, i) => ({ from: at('calls', f, 0.335), src: SLIDE, volume: [0.5, 0.38, 0.46, 0.34, 0.42][i], dur: 16, note: `call row ${i + 1} lands` })),
  // outro: elements fly in, riser → impact on the mark/wordmark (f42–46) → shimmer on the rule + tagline (f58–68)
  { from: at('outro', 6, 0.075), src: SWOOSH_LONG, volume: 0.26, dur: 45, note: 'group photo fly-in' },
  { from: at('outro', 40, 0.335), src: RISER, volume: 0.45, dur: 16, note: 'riser into wordmark' },
  { from: at('outro', 44, 0.605), src: IMPACT, volume: 0.42, dur: 82, note: 'wordmark impact' },
  { from: at('outro', 62, 0.735), src: SHIMMER, volume: 0.28, dur: 81, note: 'rule + tagline shimmer' },
];
