import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { M } from '../three/kit.js';
import { clay } from '../three/materials.js';
import { makeBottle, makeCard } from '../models/places.js';
import { makeTag, font } from '../models/devices.js';
import { makeCoin } from '../models/coin.js';
import { text3d } from '../three/text3d.js';
import { background, orbit, popObj } from './common.js';

const FROM = b(160), TO = b(168);
const FLIP = b(162);
const PARTB = b(164);
const KNOCK = b(165);

function tagFace(text, sub, color = '#FFFFFF', fg = '#18003E') {
  return makeTag({
    w: 2.2, h: 0.95, color, depth: 0.03,
    draw: (c, w, h) => {
      c.fillStyle = fg;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (sub) {
        font(c, 700, 70);
        c.globalAlpha = 0.6;
        c.fillText(sub, w * 0.57, h * 0.3);
        c.globalAlpha = 1;
        font(c, 800, 128);
        c.fillText(text, w * 0.57, h * 0.64);
      } else {
        font(c, 800, text.length > 9 ? 118 : 150);
        c.fillText(text, w * 0.57, h / 2 + 6);
      }
    },
  });
}

export default {
  id: 'cost',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 14, depth: 10, height: 4, opacity: 0.5, blur: 2.4 });
    v.scene.add(v.contact.group);

    // part A: bottle with a two-sided tag on a string
    S.A = new THREE.Group();
    v.scene.add(S.A);
    S.bottle = makeBottle();
    S.bottle.scale.setScalar(1.55);
    S.bottle.position.set(2.3, 0, 0);
    S.A.add(S.bottle);
    S.tagPivot = new THREE.Group();
    S.tagPivot.position.set(2.3, 2.55, 0.25);
    S.A.add(S.tagPivot);
    const front = tagFace('20.000 kr.', 'Verð á matseðli');
    const back = tagFace('Innkaupsverð', null, '#691FE7', '#FFFFFF');
    back.root.rotation.y = Math.PI;
    back.root.position.z = -0.035;
    S.tagFlip = new THREE.Group();
    S.tagFlip.add(front.root, back.root);
    S.tagHang = new THREE.Group();
    S.tagHang.add(S.tagFlip);
    S.tagFlip.position.set(0.95, -0.78, 0);
    S.tagFlip.rotation.z = -0.12;
    S.string = M(new THREE.CylinderGeometry(0.01, 0.01, 0.72, 6), clay('#FFFFFF'), { p: [0.0, -0.28, 0], r: [0, 0, 0.0] });
    S.tagHang.add(S.string);
    S.tagPivot.add(S.tagHang);

    // part B: a card with a fee badge gets knocked out by a coin
    S.B = new THREE.Group();
    v.scene.add(S.B);
    S.card = makeCard();
    S.cardG = new THREE.Group();
    S.cardG.add(S.card);
    S.card.scale.setScalar(1.9);
    S.B.add(S.cardG);
    S.fee = new THREE.Group();
    const pct = M(text3d(ctx.font3d, '%', { size: 0.9, depth: 0.2, bevel: 0.03 }), clay('#FF4F8B', { rough: 0.35, coat: 0.6 }));
    S.fee.add(pct);
    S.cardG.add(S.fee);
    S.fee.position.set(1.55, 0.95, 0.12);
    S.coin = makeCoin();
    S.coinG = new THREE.Group();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG.add(S.coin);
    S.coinG.scale.setScalar(1.3);
    S.B.add(S.coinG);

    S.a1 = new Words(S.front, 'Gesturinn sér\n20.000 kr.', 't-h2');
    S.a2 = new Words(S.front, 'Þú borgar\ninnkaupsverðið.', 't-h2', { color: '#691FE7' });
    S.b1 = new Words(S.front, 'Engin kortagjöld\naf krónum.', 't-h2');

    cue(FROM, 'swing', { gain: 0.45 });
    cue(FLIP, 'flip', { gain: 0.7 });
    cue(PARTB - 0.08, 'whoosh', { dur: 0.35, gain: 0.45, from: 2200, to: 500 });
    cue(KNOCK, 'knock', { gain: 0.8 });
    cue(KNOCK + 0.05, 'clink', { gain: 0.6, pitch: 1.15 });
  },

  update(lt, t, S) {
    const v = S.view;
    const partB = t >= PARTB;
    S.A.visible = !partB;
    S.B.visible = partB;
    if (!partB) {
      orbit(v.camera, [1.75, 1.6, 0], lerp(-6, 4, prog(t, FROM, PARTB)) * DEG, 8 * DEG, lerp(9.6, 8.9, ease.outCubic(prog(t, FROM, PARTB))), { t, seed: 81 });
      popObj(S.bottle, t, FROM, { base: 1.55, freq: 2.6, zeta: 0.55 });
      const dt = t - FROM;
      S.tagHang.rotation.z = 0.35 * Math.cos(dt * 5.5) * Math.exp(-dt * 2.2);
      popObj(S.tagHang, t, FROM + 0.15, { base: 1, freq: 3, zeta: 0.5 });
      const f = ease.inOutBack(prog(t, FLIP, FLIP + 0.45), 1.3);
      S.tagFlip.rotation.y = f * Math.PI;
    } else {
      orbit(v.camera, [0.6, 1.25, 0], lerp(-3, 3, prog(t, PARTB, TO)) * DEG, 10 * DEG, 9.0, { t, seed: 82 });
      // card sits, the coin rolls in and knocks it away
      const cIn = spring(t - PARTB, 2.8, 0.55);
      const knocked = ease.inQuad(prog(t, KNOCK, KNOCK + 0.55));
      S.cardG.position.set(2.75 + knocked * 7, 1.35 + Math.sin(knocked * Math.PI) * 0.8, 0);
      S.cardG.rotation.set(-0.2, -0.35 + knocked * 0.6, -0.05 - knocked * 1.6);
      S.cardG.scale.setScalar(Math.max(1e-4, cIn));
      S.fee.rotation.y = Math.sin(t * 2) * 0.2;
      S.fee.position.y = 0.95 + Math.abs(Math.sin((t - PARTB) * 4)) * 0.08 * (t < KNOCK ? 1 : 0);
      const roll = ease.outCubic(prog(t, KNOCK - 0.45, KNOCK));
      const settle = ease.outCubic(prog(t, KNOCK, KNOCK + 0.6));
      S.coinG.visible = t > KNOCK - 0.45;
      S.coinG.position.set(lerp(-6.5, 1.55, roll) + settle * 1.15, 1.3, 0.1);
      S.coinG.rotation.set(0, 0, -(1 - roll) * 6 - settle * 0.4);
    }
    const outA = PARTB - 0.35;
    S.a1.update(t, { at: FROM + 0.05, stagger: 0.05, x: 140, y: 300, out: outA, outDur: 0.28 });
    S.a2.update(t, { at: FLIP + 0.1, stagger: 0.07, x: 140, y: 520, out: outA, outDur: 0.28 });
    S.b1.update(t, { at: PARTB + 0.05, stagger: 0.07, x: 140, y: 330, out: TO - 0.35, outDur: 0.28 });
  },
};
