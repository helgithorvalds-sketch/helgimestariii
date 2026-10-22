import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeVildCoin } from '../models/coin.js';
import { background, orbit, GREEN, screenDisc } from './common.js';
import { vildWordSvg } from '../brand.js';
import { wipe } from '../fx.js';

// THE DROP: Chapter 5 "Hugmyndin" lands on VILD, then asks the question.
const FROM = b(112), TO = b(120);
const WORD = b(113), LINE = b(114.5), ASK = b(116);

export default {
  id: 'vild',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'forest');
    const v = ctx.stage.makeScene({ fov: 26, envIntensity: 0.9 });
    S.view = v;
    v.rig.hemi.groundColor.set('#0C5C3B');
    v.contact = new ContactShadow({ width: 22, depth: 12, height: 4, res: 1024, opacity: 0.45, blur: 2.2, color: '#03140C' });
    v.scene.add(v.contact.group);

    S.hero = makeVildCoin();
    S.heroG = new THREE.Group();
    S.hero.rotation.x = Math.PI / 2;
    S.heroG.add(S.hero);
    v.scene.add(S.heroG);

    S.kick = el('div', 'abs t-label nowrap', S.front, 'Hugmyndin');
    css(S.kick, { color: GREEN, fontSize: '28px' });
    S.word = el('div', 'abs', S.front, vildWordSvg({ color: GREEN, height: 168, stroke: 6 }));
    S.paths = Array.from(S.word.querySelectorAll('.vw'));
    S.paths.forEach((p) => { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });
    S.line = new Words(S.front, 'Vildarpeningar fyrir veitingastaði.', 't-h3', { color: '#FFFFFF' });
    S.ask = new Words(S.front, 'Hvað ef veitingastaðir\ngerðu það sama og Takk?', 't-h3', { color: GREEN });
    S.ring = el('div', 'abs', S.front);
    css(S.ring, { borderRadius: '50%', border: `8px solid ${GREEN}` });
    S.flash = el('div', 'fill', S.front);
    css(S.flash, { background: '#FFFFFF', opacity: '0' });

    cue(FROM, 'impact', { gain: 1.0 });
    cue(FROM, 'clink', { gain: 0.8, pitch: 0.8 });
    cue(WORD, 'ruler', { dur: 0.6, gain: 0.5, pitch: 1.2 });
    cue(LINE, 'swoosh', { gain: 0.45 });
    cue(ASK, 'tick', { gain: 0.4 });
    wipe(TO, { kind: 'panel', dur: 0.56, color: '#F0EBF7', dir: -1, angle: 10 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const sh = wobble(t - FROM, 11, 8);
    orbit(cam, [0.9, 1.5, 0], (lerp(-4, 3, prog(t, FROM, TO)) + sh * 0.6) * DEG, (8 + sh * 0.5) * DEG, lerp(11.2, 10.4, ease.outCubic(prog(t, FROM, TO))), { t, seed: 81 });
    const s = spring(t - FROM + 0.02, 2.3, 0.38);
    S.heroG.scale.setScalar(Math.max(1e-4, 1.35 * s));
    S.heroG.position.set(3.35, 1.6 + Math.sin((t - FROM) * 1.8) * 0.06, 0);
    S.heroG.rotation.y = (1 - ease.outCubic(prog(t, FROM, FROM + 1.4))) * Math.PI * 3 + Math.sin((t - FROM) * 1.2) * 0.14;
    css(S.flash, { opacity: (Math.exp(-(t - FROM) * 9) * 0.55 * (t >= FROM ? 1 : 0)).toFixed(3) });
    const c = screenDisc(S.heroG.position, 1.35, cam);
    const rp = ease.outCubic(prog(t, FROM, FROM + 0.8));
    const rr = c.r * (1 + rp * 1.6);
    css(S.ring, { width: `${rr * 2}px`, height: `${rr * 2}px`, transform: `translate3d(${(c.x - rr).toFixed(1)}px, ${(c.y - rr).toFixed(1)}px, 0)`, opacity: String((1 - rp) * 0.9) });

    const out = ease.inCubic(prog(t, TO - 0.4, TO - 0.1));
    const kIn = ease.outExpo(prog(t, FROM + 0.25, FROM + 0.8));
    place(S.kick, { x: 152, y: 250 + (1 - kIn) * 16, o: kIn * (1 - out) });
    // the thin wordmark draws itself, one letter after another
    S.paths.forEach((p, i) => {
      const d = ease.inOutCubic(prog(t, WORD + i * 0.12, WORD + i * 0.12 + 0.5));
      p.style.strokeDashoffset = (1 - d).toFixed(4);
    });
    place(S.word, { x: 132, y: 300, o: 1 - out });
    S.line.update(t, { at: LINE, stagger: 0.05, x: 148, y: 520, out: TO - 0.4, outDur: 0.28 });
    S.ask.update(t, { at: ASK, stagger: 0.06, x: 148, y: 620, out: TO - 0.4, outDur: 0.28 });
  },
};
