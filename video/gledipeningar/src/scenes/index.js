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
import chart from './s10_chart.js';
import margins from './s11_margins.js';
import offers from './s12_offers.js';
import gledi from './s13_gledi.js';
import math from './s14_math.js';
import night from './s15_night.js';
import morning from './s16_morning.js';
import goal from './s17_goal.js';
import close from './s18_close.js';
import gallery from './gallery.js';

// Chapter cards: each one is reached through an iris out of an object in the scene before it.
const c1 = chapter({ id: 'c1', at: 8, next: 12, bg: 'purple', kickerColor: '#DBC7FF', kicker: 'Kafli 1', title: 'Af hverju hafa\nsvona margir\nskráð sig?', num: 1 });
const c2 = chapter({ id: 'c2', at: 40, next: 44, bg: 'lavender', text: '#18003E', kickerColor: '#691FE7', kicker: 'Kafli 2', title: 'Hvernig\nvirkar Takk?', num: 2 });
const c3 = chapter({ id: 'c3', at: 64, next: 68, bg: 'pink', text: '#18003E', kickerColor: '#FFFFFF', kicker: 'Kafli 3', title: 'Afsláttur\neða inneign?', num: 3 });
const c4 = chapter({ id: 'c4', at: 96, next: 100, bg: 'ink', kickerColor: '#DBC7FF', kicker: 'Kafli 4', title: 'Hver er\ngallinn?', num: 4 });
const c5 = chapter({ id: 'c5', at: 132, next: 136, bg: 'yellow', text: '#18003E', kickerColor: '#691FE7', kicker: 'Kafli 5 · Hugmyndin', title: 'Hvað ef veitingastaðir\ngerðu það sama?', num: 5, size: 116 });
const i1 = chapter({ id: 'i1', at: 164, next: 168, bg: 'yellow', text: '#18003E', kicker: 'Hugmynd 1', title: 'Tilboð', icon: true, size: 200 });
const i2 = chapter({ id: 'i2', at: 188, next: 192, bg: 'yellow', text: '#18003E', kicker: 'Hugmynd 2', title: 'Stóra kvöldið', icon: true, size: 200 });
const i3 = chapter({ id: 'i3', at: 208, next: 212, bg: 'yellow', text: '#18003E', kicker: 'Hugmynd 3', title: 'Verðlaun', icon: true, size: 200 });

// Order matters only for layering of overlapping scenes; cards raise themselves above the rest.
export const SCENES = [coin, c1, crowd, free, store, c2, how, c3, dvc, flow, c4, butter, chart, c5, margins, offers, gledi, i1, math, i2, night, morning, i3, goal, close];
// Test-only scenes, loaded with ?scene=<id>.
export const TEST_SCENES = [gallery];
export const DURATION = b(250);
