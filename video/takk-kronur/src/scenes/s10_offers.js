import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeTag, font } from '../models/devices.js';
import { makePerson, walkPose, SKIN, HAIR } from '../models/people.js';
import { background, orbit } from './common.js';

const FROM = b(92), TO = b(100);
const OFFERS = [
  { text: 'Hádegistilboð', bg: '#FFFFFF', fg: '#691FE7', pos: [1.9, -1.9], rot: 0.13 },
  { text: 'Þriðjudagstilboð', bg: '#691FE7', fg: '#FFFFFF', pos: [4.9, -0.75], rot: -0.09 },
  { text: 'Happy hour', bg: '#FF7AB6', fg: '#FFFFFF', pos: [2.3, 0.55], rot: 0.06 },
  { text: '2 fyrir 1', bg: '#FFD24D', fg: '#18003E', pos: [4.7, 1.75], rot: -0.12 },
];
const LEAVE = b(96);

export default {
  id: 'offers',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    const v = ctx.stage.makeScene({ fov: 28 });
    S.view = v;
    v.rig.key.position.set(-5, 11, 6);
    v.contact = new ContactShadow({ width: 22, depth: 16, height: 4, res: 1024, opacity: 0.5, blur: 1.8 });
    v.contact.group.position.set(3, 0, 0.5);
    v.scene.add(v.contact.group);
    S.tags = OFFERS.map((o, i) => {
      const tg = makeTag({
        w: 3.7, h: 1.2, color: o.bg, depth: 0.05,
        draw: (c, w, h) => {
          c.fillStyle = o.fg;
          font(c, 800, o.text.length > 12 ? 112 : 128);
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(o.text, w * 0.565, h / 2 + 8);
        },
      });
      const g = new THREE.Group();
      tg.root.rotation.x = -Math.PI / 2;
      g.add(tg.root);
      v.scene.add(g);
      return { ...o, g, at: FROM + b(i) };
    });
    S.guest = makePerson({ top: '#18003E', skin: SKIN[2], hair: HAIR[0] });
    v.scene.add(S.guest.root);

    S.h1 = new Words(S.front, 'Gesturinn sparar.', 't-h1');
    S.h2 = new Words(S.front, 'Og fer.', 't-h1', { color: '#691FE7' });

    S.tags.forEach((tg, i) => cue(tg.at, 'slam', { gain: 0.8, pitch: 1 + i * 0.05 }));
    cue(LEAVE + 0.2, 'steps', { dur: 1.6, gain: 0.35 });
    cue(b(98), 'swoosh', { gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    // camera shake on each slam
    let shake = 0;
    S.tags.forEach((tg) => { shake += Math.abs(wobble(t - tg.at, 9, 10)) * (t > tg.at ? 1 : 0); });
    orbit(v.camera, [0.4, 0, 0.6], lerp(-2, 3, prog(t, FROM, TO)) * DEG, (55 + shake * 1.2) * DEG, lerp(16.5, 15.5, prog(t, FROM, TO)), { t, seed: 31 });

    S.tags.forEach((tg, i) => {
      const dt = t - tg.at;
      const fall = clamp(dt / 0.2 + 1);
      const land = dt >= 0;
      const y = land ? Math.abs(wobble(dt, 3.2, 9)) * 0.25 + 0.03 + i * 0.012 : lerp(7, 0.03, ease.inQuad(clamp((dt + 0.22) / 0.22)));
      tg.g.visible = dt > -0.22;
      tg.g.position.set(tg.pos[0], y, tg.pos[1]);
      tg.g.rotation.set(land ? wobble(dt, 4, 8) * 0.06 : 0.3, tg.rot + (land ? 0 : 0.6) + wobble(dt, 2.5, 7) * 0.08, land ? 0 : -0.25);
      const sq = land ? 1 + Math.max(0, wobble(dt, 6, 14)) * 0.08 : 1;
      tg.g.scale.set(sq, 1, sq);
    });

    // the guest walks out of frame to the right
    const g = S.guest;
    const u = prog(t, LEAVE, LEAVE + 1.7);
    const appear = spring(t - (LEAVE - 0.5), 3, 0.5);
    g.root.visible = t > LEAVE - 0.5;
    g.root.position.set(lerp(3.3, 13.5, ease.inQuad(u)), 0, 3.0);
    g.root.rotation.y = u > 0 ? Math.PI / 2 : 0.3;
    g.root.scale.setScalar(Math.max(1e-4, appear * 1.05));
    walkPose(g, (t - LEAVE) * 11, u > 0 ? 1 : 0);

    S.h1.update(t, { at: LEAVE, stagger: 0.07, x: 140, y: 330, out: TO - 0.35, outDur: 0.28 });
    S.h2.update(t, { at: b(98), stagger: 0.07, x: 140, y: 470, out: TO - 0.35, outDur: 0.28 });
  },
};
