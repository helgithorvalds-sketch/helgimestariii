import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeVildCoin } from '../models/coin.js';
import { background, orbit, BG, screenDisc, makeIris, updateIris, IRIS } from './common.js';
import { vildLogoSvg } from '../brand.js';

// The takeaway, then the VILD end card (mark above the thin wordmark, as in the brand artwork).
const FROM = b(236), TO = b(254);
const END = b(244);
const LOGO_W = 600;

export default {
  id: 'close',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    S.green = el('div', 'fill', S.back);
    css(S.green, { background: BG.green, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 8, depth: 8, height: 3, opacity: 0.5, blur: 2.6 });
    v.scene.add(v.contact.group);
    S.coin = makeVildCoin();
    S.coinG = new THREE.Group();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG.add(S.coin);
    S.coinG.position.set(3.3, 1.35, 0);
    v.scene.add(S.coinG);

    S.l1 = new Words(S.front, 'Inneign fær\nfólk inn.', 't-h1');
    S.l2 = new Words(S.front, 'Og heldur því\ní keðjunni.', 't-h1', { color: '#691FE7' });
    S.iris = makeIris(S, IRIS.green);
    S.logo = el('div', 'abs', S.front, vildLogoSvg({ width: LOGO_W }));
    S.mark = S.logo.querySelector('.vm');
    S.letters = Array.from(S.logo.querySelectorAll('.vw'));
    S.letters.forEach((p) => { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });

    cue(FROM, 'swoosh', { gain: 0.45 });
    cue(FROM + b(2), 'swoosh', { gain: 0.45 });
    cue(END - b(1.1), 'whoosh', { dur: b(1.1), gain: 0.55, from: 300, to: 2400 });
    cue(END + 0.05, 'clink', { gain: 0.9, pitch: 1.0 });
    cue(END + 0.05, 'final', { gain: 0.9 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    const push = ease.inQuart(prog(t, END - b(1.1), END));
    const cp = S.coinG.position;
    orbit(cam, [lerp(0.6, cp.x, push), lerp(1.3, cp.y, push), 0], lerp(-3, 3, prog(t, FROM, END)) * (1 - push) * DEG, 6 * (1 - push) * DEG, lerp(10.2, 3.2, push), { t, seed: 91 });
    const cIn = spring(t - FROM - 0.1, 2.6, 0.5);
    S.coinG.scale.setScalar(Math.max(1e-4, 1.2 * cIn));
    // a half turn on every bar, landing face-on
    const bar = b(4);
    const turns = Math.floor((t - FROM) / bar);
    const local = ((t - FROM) % bar) / bar;
    S.coinG.rotation.y = (turns + ease.inOutBack(clamp(local / 0.3), 1.2)) * Math.PI;
    if (push > 0) S.coinG.rotation.y = Math.round(S.coinG.rotation.y / Math.PI) * Math.PI;
    S.coinG.position.y = 1.35 + Math.sin(t * 1.8) * 0.06;

    const outT = END - b(1.3);
    S.l1.update(t, { at: FROM + 0.1, stagger: 0.07, x: 140, y: 230, out: outT, outDur: 0.25 });
    S.l2.update(t, { at: FROM + b(2), stagger: 0.07, x: 140, y: 500, out: outT, outDur: 0.25 });

    // iris from the coin into the end card
    updateIris(S.iris, t, END - b(1.1), END, screenDisc(S.coinG.position, 1.2, cam));
    const endCard = t >= END;
    css(S.green, { display: endCard ? 'block' : 'none' });
    css(S.iris, { visibility: endCard ? 'hidden' : 'visible' });
    v.visible = !endCard;
    // the mark lands with a quarter turn back along its own arrow, then the wordmark draws in
    const m = spring(t - END, 2.4, 0.5);
    css(S.mark, { transformOrigin: '586px 330px', transformBox: 'view-box', transform: `scale(${Math.max(0.001, m).toFixed(4)}) rotate(${((1 - m) * -90).toFixed(2)}deg)` });
    S.letters.forEach((p, i) => {
      const d = ease.inOutCubic(prog(t, END + b(1) + i * 0.12, END + b(1) + i * 0.12 + 0.55));
      p.style.strokeDashoffset = (1 - d).toFixed(4);
    });
    place(S.logo, { x: 960 - LOGO_W / 2, y: 540 - (LOGO_W * 560) / 520 / 2, o: endCard ? 1 : 0 });
  },
};
