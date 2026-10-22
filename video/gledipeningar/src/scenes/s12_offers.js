import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, wobble, DEG } from '../core/anim.js';
import { Words } from '../core/dom.js';
import { ContactShadow } from '../three/stage.js';
import { makeTag, font } from '../models/devices.js';
import { greenWorld, orbit, SHADOW_G } from './common.js';
import { wipe } from '../fx.js';

const FROM = b(144), TO = b(152);
const OFFERS = [
  { text: 'Hádegistilboð', bg: '#FFFFFF', fg: '#0C5C3B', pos: [3.85, 0.65], rot: 0.06 },
  { text: 'Þriðjudagstilboð', bg: '#0C5C3B', fg: '#FFFFFF', pos: [4.75, -0.5], rot: -0.09 },
  { text: 'Happy hour', bg: '#FF7AB6', fg: '#FFFFFF', pos: [4.0, -1.65], rot: 0.13 },
  { text: '2 fyrir 1', bg: '#FFD24D', fg: '#0C5C3B', pos: [4.65, 1.75], rot: -0.12 },
];
const SAY = b(148);

export default {
  id: 'offers',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    greenWorld(S);
    const v = ctx.stage.makeScene({ fov: 28, light: 'mint' });
    S.view = v;
    v.rig.key.position.set(-5, 11, 6);
    v.contact = new ContactShadow({ width: 22, depth: 16, height: 4, res: 1024, opacity: 0.45, blur: 1.8, color: SHADOW_G });
    v.contact.group.position.set(3, 0, 0.5);
    v.scene.add(v.contact.group);
    S.tags = OFFERS.map((o, i) => {
      const tg = makeTag({
        w: 3.9, h: 1.28, color: o.bg, depth: 0.05,
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
    S.h1 = new Words(S.front, 'Og þeir eru nú\nþegar með tilboð.', 't-h1');
    S.h1.root.style.fontSize = '112px';
    wipe(TO, { kind: 'panel', dur: 0.56, color: '#E8FCDA', dir: -1, angle: 10 });

    S.tags.forEach((tg, i) => cue(tg.at, 'slam', { gain: 0.8, pitch: 1 + i * 0.05 }));
    cue(SAY, 'swoosh', { gain: 0.5 });
  },

  update(lt, t, S) {
    const v = S.view;
    // camera shake on each slam
    let shake = 0;
    S.tags.forEach((tg) => { shake += Math.abs(wobble(t - tg.at, 9, 10)) * (t > tg.at ? 1 : 0); });
    // start tight on the first coupon, pull back as the pile grows
    const pull = ease.inOutCubic(prog(t, FROM + 0.05, FROM + b(3.4)));
    const tx = lerp(3.55, 1.75, pull);
    const dist = lerp(8.6, 13.4, pull) - prog(t, FROM + b(3.4), TO) * 0.6;
    orbit(v.camera, [tx, 0, lerp(0.6, 0.45, pull)], lerp(-2, 3, prog(t, FROM, TO)) * DEG, (55 + shake * 1.2) * DEG, dist, { t, seed: 31 });
    // a quick lens punch on every slam
    let punch = 0;
    S.tags.forEach((tg) => { const dt = t - tg.at; if (dt >= 0) punch += Math.exp(-dt * 11) * (1 - Math.exp(-dt * 90)); });
    v.camera.fov = 28 - Math.min(1, punch) * 2.2;
    v.camera.updateProjectionMatrix();

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

    S.h1.update(t, { at: SAY, stagger: 0.07, x: 140, y: 330, out: TO - 0.4, outDur: 0.3 });
  },
};
