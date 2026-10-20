import { b } from '../core/util.js';
import { chapter } from './chapter.js';
import coin from './s01_coin.js';
import crowd from './s02_crowd.js';
import free from './s03_free.js';
import store from './s04_store.js';
import how from './s05_how.js';
import dvc from './s07_dvc.js';
import flow from './s08_flow.js';
import butter from './s09_butter.js';
import gledi from './s10_gledi.js';
import margins from './s11_margins.js';
import offers from './s12_offers.js';
import compare from './s13_compare.js';
import math from './s15_math.js';
import night from './s16_night.js';
import morning from './s17_morning.js';
import goal from './s18_goal.js';
import close from './s19_close.js';
import gallery from './gallery.js';

// Chapter cards: each one is reached through an iris out of an object in the scene before it.
const ink = '#18003E';
const c1 = chapter({ id: 'c1', at: 16, next: 20, bg: 'lavender', text: ink, kickerColor: '#691FE7', kicker: 'Kafli 1', title: 'Af hverju?', num: 1, size: 200 });
const c2 = chapter({ id: 'c2', at: 40, next: 44, bg: 'pink', text: ink, kickerColor: '#FFFFFF', kicker: 'Kafli 2', title: 'Hvernig\nvirkar Takk?', num: 2 });
const c3 = chapter({ id: 'c3', at: 56, next: 60, bg: 'purple', kickerColor: '#DBC7FF', kicker: 'Kafli 3', title: 'Afsláttur\neða inneign?', num: 3 });
const c4 = chapter({ id: 'c4', at: 88, next: 92, bg: 'ink', kickerColor: '#DBC7FF', kicker: 'Kafli 4', title: 'Hver er\ngallinn?', num: 4 });
const c5 = chapter({ id: 'c5', at: 108, next: 112, bg: 'yellow', text: ink, kickerColor: '#691FE7', kicker: 'Kafli 5', title: 'Hugmyndin', num: 5, size: 200, riser: true });
const i1 = chapter({ id: 'i1', at: 152, next: 156, bg: 'yellow', text: ink, kicker: 'Kafli 5 · Hugmyndin', title: 'Hugmynd 1', sub: 'Inneign í stað afsláttar', icon: true, size: 180 });
const i2 = chapter({ id: 'i2', at: 196, next: 200, bg: 'yellow', text: ink, kicker: 'Kafli 5 · Hugmyndin', title: 'Hugmynd 2', sub: 'Djamm í kvöld', icon: true, size: 180 });
const i3 = chapter({ id: 'i3', at: 216, next: 220, bg: 'yellow', text: ink, kicker: 'Kafli 5 · Hugmyndin', title: 'Hugmynd 3', sub: 'Söfnun', icon: true, size: 180 });

// Order matters only for layering of overlapping scenes; cards raise themselves above the rest.
export const SCENES = [coin, crowd, c1, free, store, c2, how, c3, dvc, flow, c4, butter, c5, gledi, margins, offers, compare, i1, math, i2, night, morning, i3, goal, close];
// Test-only scenes, loaded with ?scene=<id>.
export const TEST_SCENES = [gallery];
export const DURATION = b(254);
