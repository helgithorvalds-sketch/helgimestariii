import * as THREE from 'three';
import { b, cue, isk } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words, Counter } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeCounter, makeCoupe, makeHighball, makeBeer, makeShot, makeWine } from '../models/places.js';
import { background, orbit } from './common.js';

const FROM = b(124), TO = b(132);
const TOP = 1.09;
const DRINKS = [
  { make: () => makeCoupe('#FF7AB6'), x: -1.4, at: b(124), add: 3900 },
  { make: () => makeHighball('#8C5CF5'), x: -0.2, at: b(125), add: 4600 },
  { make: () => makeBeer(), x: 1.0, at: b(126), add: 6400 },
  { make: () => makeShot('#FFD24D'), x: 1.95, at: b(127), add: 5200 },
  { make: () => makeShot('#FFD24D'), x: 2.4, at: b(127.5), add: 5200 },
  { make: () => makeWine('#8E2A6B'), x: 3.4, at: b(128), add: 6800 },
  { make: () => makeHighball('#FF7AB6'), x: 4.6, at: b(129), add: 7900 },
];
const OFF = b(131);

export default {
  id: 'night',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'night');
    // soft out-of-focus bar lights behind the counter
    S.bokeh = [];
    const cols = ['255,122,182', '140,92,245', '219,199,255', '255,210,77'];
    for (let i = 0; i < 11; i++) {
      const d = el('div', 'abs', S.back);
      const r = 60 + ((i * 37) % 90);
      const c = cols[i % cols.length];
      css(d, { width: `${r * 2}px`, height: `${r * 2}px`, borderRadius: '50%', background: `radial-gradient(circle, rgba(${c},0.32) 0%, rgba(${c},0.18) 45%, rgba(${c},0) 70%)` });
      S.bokeh.push({ d, r, x: 700 + ((i * 263) % 1300), y: 80 + ((i * 151) % 380), s: 0.3 + (i % 5) * 0.12 });
    }
    const v = ctx.stage.makeScene({ fov: 26, light: 'night', envIntensity: 0.45 });
    S.view = v;
    S.pink = new THREE.PointLight('#FF7AB6', 18, 14, 2);
    S.pink.position.set(5, 3.2, 2.5);
    S.violet = new THREE.PointLight('#8C5CF5', 22, 16, 2);
    S.violet.position.set(-3, 3.5, 2);
    v.scene.add(S.pink, S.violet);
    S.counter = makeCounter(18);
    S.counter.position.set(1.5, 0, 0);
    v.scene.add(S.counter);
    S.drinks = DRINKS.map((d) => {
      const g = new THREE.Group();
      g.add(d.make());
      v.scene.add(g);
      return { ...d, g };
    });
    S.kick = el('div', 'abs t-label', S.front, 'Föstudagskvöld');
    css(S.kick, { color: '#DBC7FF' });
    S.tab = new Counter(S.front, 't-mega white', { format: (x) => `${isk(x)} kr.` });
    css(S.tab.root, { fontSize: '168px' });
    S.black = el('div', 'fill', S.front);
    css(S.black, { background: '#05010D', opacity: '0' });
    S.drinks.forEach((d, i) => {
      cue(d.at - 0.32, 'slide', { dur: 0.36, gain: 0.35 });
      cue(d.at, 'glass', { gain: 0.6, pitch: 1 + (i % 4) * 0.07 });
    });
    cue(OFF + 0.2, 'lightsoff', { gain: 0.6 });
  },

  update(lt, t, S) {
    const v = S.view;
    orbit(v.camera, [1.4, 1.55, 0.2], lerp(-16, -8, prog(t, FROM, TO)) * DEG, 9 * DEG, lerp(10.2, 9.0, ease.inOutSine(prog(t, FROM, TO))), { t, seed: 51 });
    let total = 0;
    S.drinks.forEach((d) => {
      const p = prog(t, d.at - 0.34, d.at);
      d.g.visible = t > d.at - 0.34;
      const x = lerp(d.x + 9, d.x, ease.outCubic(p));
      const tilt = t > d.at ? wobble(t - d.at, 3.5, 7) * 0.12 : -0.18 * (1 - p);
      d.g.position.set(x, TOP, 0.1);
      d.g.rotation.set(0, 0, tilt);
      if (t >= d.at) total += d.add;
    });
    // tab rolls up quickly to the new total
    if (S.tabVal === undefined || t < FROM + 0.01) S.tabVal = 0;
    const last = S.drinks.filter((d) => t >= d.at).pop();
    const prevTotal = total - (last ? last.add : 0);
    const rp = last ? ease.outCubic(prog(t, last.at, last.at + 0.3)) : 0;
    S.tab.set(Math.round(lerp(prevTotal, total, rp) / 100) * 100);
    S.bokeh.forEach((k, i) => place(k.d, { x: k.x - k.r + Math.sin(t * k.s + i) * 30, y: k.y - k.r + Math.cos(t * k.s * 0.8 + i) * 14, o: 0.9 }));
    const kIn = ease.outExpo(prog(t, FROM + 0.05, FROM + 0.5));
    place(S.kick, { x: 150, y: 168 + (1 - kIn) * 16, o: kIn });
    place(S.tab.root, { x: 136, y: 200 + (1 - kIn) * 24, o: kIn });
    // the lights go out
    const off = ease.inQuad(prog(t, OFF, TO - 0.12));
    css(S.black, { opacity: off.toFixed(3) });
    S.pink.intensity = 18 * (1 - off);
    S.violet.intensity = 22 * (1 - off);
  },
};
