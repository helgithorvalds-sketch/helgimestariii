import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeGlediCoin } from '../models/coin.js';
import { background, orbit, BG, screenDisc, makeIris, updateIris, IRIS } from './common.js';
import { glediLogoHtml } from '../brand.js';

// The takeaway, then the Gleðipeningar end card.
const FROM = b(228), TO = b(250);
const L2 = b(232);
const END = b(240);
const LOGO_H = 190;

export default {
  id: 'close',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    S.yellow = el('div', 'fill', S.back);
    css(S.yellow, { background: BG.yellow, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 8, depth: 8, height: 3, opacity: 0.5, blur: 2.6 });
    v.scene.add(v.contact.group);
    S.coin = makeGlediCoin();
    S.coinG = new THREE.Group();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG.add(S.coin);
    S.coinG.position.set(3.3, 1.35, 0);
    v.scene.add(S.coinG);

    S.l1 = new Words(S.front, 'Afsláttur fær\nfólk inn.', 't-h1');
    S.l2 = new Words(S.front, 'Inneign fær það inn\nog heldur því\ní keðjunni.', 't-h1', { color: '#691FE7' });
    S.l2.root.style.fontSize = '104px';
    S.iris = makeIris(S, IRIS.yellow);
    S.logo = el('div', 'abs', S.front, glediLogoHtml({ height: LOGO_H }));
    css(S.logo, { width: '1920px', display: 'flex', justifyContent: 'center' });
    S.tag = new Words(S.front, 'Vildarkerfi fyrir veitingastaði.', 't-h3', { color: '#18003E', align: 'center' });

    cue(FROM, 'swoosh', { gain: 0.45 });
    cue(L2, 'swoosh', { gain: 0.45 });
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
    S.l1.update(t, { at: FROM + 0.1, stagger: 0.07, x: 140, y: 190, out: outT, outDur: 0.25 });
    S.l2.update(t, { at: L2, stagger: 0.07, x: 140, y: 470, out: outT, outDur: 0.25 });

    // iris from the coin into the end card
    updateIris(S.iris, t, END - b(1.1), END, screenDisc(S.coinG.position, 1.2, cam));
    const endCard = t >= END;
    css(S.yellow, { display: endCard ? 'block' : 'none' });
    css(S.iris, { visibility: endCard ? 'hidden' : 'visible' });
    v.visible = !endCard;
    const lg = spring(t - END, 2.4, 0.45);
    place(S.logo, { x: 0, y: 380, s: Math.max(0.001, lg), o: endCard ? 1 : 0, ox: '50%', oy: '50%' });
    S.tag.update(t, { at: END + b(1.5), stagger: 0.06, x: 0, y: 640 });
  },
};
