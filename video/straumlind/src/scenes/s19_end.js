import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { extrudeSvg } from '../three/geo.js';
import { gloss } from '../three/materials.js';
import { LOGO, logoSvg } from '../brand.js';
import { background, C } from './common.js';

// End card: the bolt's two halves slide straight in from the sides and lock on the hit. Every row of
// the orange half lies left of the cyan half, so a purely sideways move never lets them intersect.
// Once locked, the mark turns gently as one piece.
const FROM = b(174), TO = b(190);
const LOCK = b(176);

export default {
  id: 'end',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 24 });
    S.view = v;
    v.rig.key.position.set(-4, 6, 9);
    v.rig.key.intensity = 1.9;
    v.camera.position.set(0, 0.6, 16);
    v.camera.lookAt(0, 0.6, 0);
    const opts = { scale: 0.2, cx: 5.06, cy: 4.905, depth: 0.42, bevel: 0.045, bevelSegs: 5, curveSegs: 36 };
    S.mark = new THREE.Group();
    S.halves = [
      new THREE.Mesh(extrudeSvg(LOGO.orange, opts), gloss('#FF7800', { rough: 0.3, coat: 0.8 })),
      new THREE.Mesh(extrudeSvg(LOGO.cyan, opts), gloss('#00BDD0', { rough: 0.3, coat: 0.8 })),
    ];
    S.halves.forEach((h) => S.mark.add(h));
    S.mark.position.set(0, 1.45, 0);
    v.scene.add(S.mark);

    S.word = el('div', 'abs', S.front, `<div style="width:1920px;display:flex;justify-content:center">${logoSvg({ height: 46, mark: false })}</div>`);
    S.line = new Words(S.front, 'Sama rafmagn, bara ódýrara.', 't-h2', { align: 'center', width: 1920 });
    S.line.root.style.fontSize = '68px';
    S.line.words.slice(2).forEach((w) => { w.inner.style.color = C.orangeInk; });
    S.url = el('div', 'abs t-h4 nowrap', S.front, '<div style="width:1920px;display:flex;justify-content:center"><span style="display:inline-flex;align-items:center;gap:14px"><span class="dot" style="width:14px;height:14px"></span>straumlind.is</span></div>');
    css(S.url, { color: C.cyanInk, fontSize: '36px' });

    cue(FROM + 0.05, 'swell', { dur: LOCK - FROM - 0.05, gain: 0.45 });
    cue(LOCK, 'final', { gain: 0.8 });
    cue(LOCK + b(1.5), 'tick', { gain: 0.3 });
  },

  update(lt, t, S) {
    // halves slide in sideways: decelerating, no overshoot, so they meet exactly once
    S.halves.forEach((h, i) => {
      const u = ease.outCubic(prog(t, FROM + 0.05 + i * 0.08, LOCK));
      h.position.x = (i ? 1 : -1) * lerp(6, 0, u);
      h.visible = t > FROM;
    });
    const settle = t > LOCK ? Math.exp(-(t - LOCK) * 7) * Math.sin((t - LOCK) * 40) * 0.025 : 0;
    S.mark.scale.setScalar(1 + settle);
    const turn = prog(t, LOCK + 0.3, TO);
    S.mark.rotation.y = -0.18 * (1 - ease.outCubic(prog(t, FROM, LOCK))) + Math.sin(turn * Math.PI * 1.2) * 0.22;
    S.mark.rotation.x = 0.06 * Math.sin(turn * Math.PI);

    const kw = ease.outExpo(prog(t, LOCK + b(0.5), LOCK + b(1.5)));
    place(S.word, { x: 0, y: 600 + (1 - kw) * 26, o: kw });
    S.line.update(t, { at: LOCK + b(1), stagger: 0.07, x: 0, y: 690 });
    const ku = ease.outExpo(prog(t, LOCK + b(2.5), LOCK + b(3.5)));
    place(S.url, { x: 0, y: 820 + (1 - ku) * 20, o: ku });
  },
};
