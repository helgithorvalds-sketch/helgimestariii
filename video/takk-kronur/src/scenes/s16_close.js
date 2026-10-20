import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, prog, spring, lerp, clamp, DEG } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { makeCoin } from '../models/coin.js';
import { background, orbit, BG } from './common.js';
import { takkSvg } from '../brand.js';

const FROM = b(168), TO = b(182);
const L2 = b(172);
const END = b(176);

export default {
  id: 'close',
  from: FROM,
  to: TO,
  setup(ctx, S) {
    background(S, 'studio');
    S.purple = el('div', 'fill', S.back);
    css(S.purple, { background: BG.purple, display: 'none' });
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 8, depth: 8, height: 3, opacity: 0.5, blur: 2.6 });
    v.scene.add(v.contact.group);
    S.coin = makeCoin();
    S.coinG = new THREE.Group();
    S.coin.rotation.x = Math.PI / 2;
    S.coinG.add(S.coin);
    S.coinG.position.set(3.1, 1.35, 0);
    S.coinG.scale.setScalar(1.25);
    v.scene.add(S.coinG);

    S.l1 = new Words(S.front, 'Afsláttur dregur\nfólk inn.', 't-h1');
    S.l2 = new Words(S.front, 'Krónur draga\nþað aftur.', 't-h1', { color: '#691FE7' });
    S.iris = el('div', 'abs', S.front);
    css(S.iris, { background: '#691FE7', borderRadius: '50%', display: 'none' });
    S.logo = el('div', 'abs', S.front, takkSvg({ pill: '#FFFFFF', letters: '#18003E', spark: '#836FFF', height: 190 }));
    S.tag = new Words(S.front, 'Næst á matseðlinum: veitingastaðir.', 't-h3', { color: '#FFFFFF', align: 'center' });

    cue(FROM, 'swoosh', { gain: 0.45 });
    cue(L2, 'swoosh', { gain: 0.45 });
    cue(END - 0.35, 'whoosh', { dur: 0.4, gain: 0.55, from: 300, to: 2400 });
    cue(END + 0.05, 'clink', { gain: 0.9, pitch: 1.0 });
    cue(END + 0.05, 'final', { gain: 0.9 });
  },

  update(lt, t, S) {
    const v = S.view;
    const cam = v.camera;
    orbit(cam, [0.6, 1.3, 0], lerp(-3, 3, prog(t, FROM, END)) * DEG, 6 * DEG, 10.2, { t, seed: 91 });
    const cIn = spring(t - FROM - 0.1, 2.6, 0.5);
    S.coinG.scale.setScalar(Math.max(1e-4, 1.25 * cIn));
    // a quarter turn on every bar, landing face-on
    const turns = Math.floor((t - FROM) / 2);
    const local = ((t - FROM) % 2) / 2;
    S.coinG.rotation.y = (turns + ease.inOutBack(clamp(local / 0.35), 1.2)) * Math.PI;
    S.coinG.position.y = 1.35 + Math.sin(t * 1.8) * 0.06;

    S.l1.update(t, { at: FROM + 0.05, stagger: 0.07, x: 140, y: 230, out: END - 0.5, outDur: 0.22, o: t < END ? 1 : 0 });
    S.l2.update(t, { at: L2, stagger: 0.07, x: 140, y: 520, out: END - 0.5, outDur: 0.22, o: t < END ? 1 : 0 });

    // iris from the coin into the end card
    cam.updateMatrixWorld();
    const c = toScreen(S.coinG.position, cam);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const edge = toScreen(S.coinG.position.clone().addScaledVector(right, 1.25), cam);
    const rad0 = Math.hypot(edge.x - c.x, edge.y - c.y) * 0.97;
    const ip = ease.inQuart(prog(t, END - 0.42, END));
    const rad = lerp(rad0, 2300, ip);
    css(S.iris, {
      display: ip > 0 && t < END ? 'block' : 'none',
      width: `${(rad * 2).toFixed(1)}px`, height: `${(rad * 2).toFixed(1)}px`,
      transform: `translate3d(${(c.x - rad).toFixed(1)}px, ${(c.y - rad).toFixed(1)}px, 0)`,
    });
    const endCard = t >= END;
    css(S.purple, { display: endCard ? 'block' : 'none' });
    v.visible = !endCard;
    const lg = spring(t - END, 2.6, 0.42);
    place(S.logo, { x: 960 - 437.5 / 2, y: 330, s: Math.max(0.001, lg), o: endCard ? 1 : 0, ox: '50%', oy: '50%' });
    S.tag.update(t, { at: END + b(1), stagger: 0.06, x: 0, y: 610 });
  },
};
