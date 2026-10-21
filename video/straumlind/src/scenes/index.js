import { b } from '../core/util.js';
import { chapter } from './chapter.js';
import city from './s01_city.js';
import grid from './s04_grid.js';
import bill from './s05_bill.js';
import lean from './s07_lean.js';
import forecast from './s08_forecast.js';
import balance from './s09_balance.js';
import auto from './s10_auto.js';
import recap from './s11_recap.js';
import chart from './s13_chart.js';
import home from './s14_home.js';
import growth from './s16_growth.js';
import sw from './s18_switch.js';
import end from './s19_end.js';

const NAVY = '#0B3446';
// Question cards. Each is reached through an iris out of an object in the scene before it,
// or (for Kafli 1) by the main question card sliding up off it.
const q0 = chapter({ id: 'q0', at: 16, next: 20, bg: 'navy', text: '#FFFFFF', kickerColor: '#00BDD0', kicker: 'Spurningin', title: 'Hvernig er\nþað hægt?', num: '?', numColor: '#00BDD0', numOpacity: 0.95, size: 128, z: 6 });
const k1 = chapter({ id: 'k1', at: 20, next: 24, bg: 'cyan', text: NAVY, kickerColor: NAVY, kicker: 'Kafli 1', title: 'Er þetta sama\nrafmagnið?', num: 1, size: 116, z: 5, markOn: 'dark' });
const k2 = chapter({ id: 'k2', at: 52, next: 56, bg: 'navy', text: '#FFFFFF', kickerColor: '#00BDD0', kicker: 'Kafli 2', title: 'Hvernig getur\norkan verið\nódýrari?', num: 2, size: 108, z: 5 });
const k3 = chapter({ id: 'k3', at: 108, next: 112, bg: 'orange', text: '#FFFFFF', kickerColor: '#FFFFFF', kicker: 'Kafli 3', title: 'Hvað þýðir það\nfyrir þig?', num: 3, size: 116, z: 5, markOn: 'dark' });
const k4 = chapter({ id: 'k4', at: 156, next: 160, bg: 'cyan', text: NAVY, kickerColor: NAVY, kicker: 'Kafli 4', title: 'Hvernig\nskipti ég?', num: 4, size: 128, z: 5, markOn: 'dark' });

// Order matters only for layering of overlapping scenes; cards raise themselves above the rest.
export const SCENES = [city, q0, k1, grid, bill, k2, lean, forecast, balance, auto, recap, k3, chart, home, growth, k4, sw, end];
export const TEST_SCENES = [];
export const DURATION = b(190);
