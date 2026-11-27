// Prints the timeline + SFX cue table as JSON for scripts/mix-audio.py (single source of truth: src/sfx.ts, src/timeline.ts, src/Main.tsx BGM)
import { SFX } from '../src/sfx';
import { SHOTS, TOTAL } from '../src/timeline';
import { BGM } from '../src/Main';
console.log(JSON.stringify({ fps: 30, total: TOTAL, shots: SHOTS, bgm: BGM, sfx: SFX }, null, 1));
