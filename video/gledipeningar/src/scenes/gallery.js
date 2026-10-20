// Test-only scene: every model on one floor. Lives at t = 1000..1001, never in the real timeline.
import * as THREE from 'three';
import { ContactShadow } from '../three/stage.js';
import { el, css } from '../core/dom.js';
import { makeCoin } from '../models/coin.js';
import { makePerson } from '../models/people.js';
import { makePhone, drawTakkApp, makeTerminal, makeReceipt, makeTag, font } from '../models/devices.js';
import { makeButterSet, makePumpBottle, makeBag, makeVitamins, makeChicken, makeSalad, makeIceCream, makeBurger, makePlate } from '../models/food.js';
import { makeStore, makeCounter, makeCoupe, makeHighball, makeBeer, makeShot, makeWine, makeBedroom, makeBottleTable, makeCard } from '../models/places.js';
import { text3d } from '../three/text3d.js';
import { clay } from '../three/materials.js';

export default {
  id: 'gallery',
  from: 1000,
  to: 1002,
  setup(ctx, S) {
    const v = ctx.stage.makeScene({ fov: 30 });
    S.view = v;
    v.contact = new ContactShadow({ width: 30, depth: 30, height: 4, opacity: 0.5, blur: 2 });
    v.scene.add(v.contact.group);
    const bg = el('div', 'fill', S.back);
    css(bg, { background: '#EEE6F9' });
    const add = (o, x, z, s = 1, ry = 0) => { o.position.set(x, o.position.y, z); o.scale.multiplyScalar(s); o.rotation.y += ry; v.scene.add(o); return o; };
    const c = makeCoin(); c.rotation.x = Math.PI / 2; c.position.y = 1; add(c, -9, -4, 0.8);
    const p = makePerson({ face: true, top: '#DBC7FF' }); add(p.root, -7, -4, 1.2);
    const ph = makePhone(); ph.draw = drawTakkApp; ph.redraw({ balance: 1245, plus: 245, plusAlpha: 1 }); ph.root.position.y = 1; add(ph.root, -5, -4, 1.3);
    const tm = makeTerminal(); tm.root.position.y = 0.7; add(tm.root, -3, -4, 1.2);
    const rc = makeReceipt({ lines: [['Mjólk', '219 kr.'], ['Smjör', '689 kr.']], total: '6.480 kr.', takk: '+245 tkr' }); rc.shape(0.6); rc.root.position.y = 0.7; add(rc.root, -1.5, -4, 1.2);
    const tg = makeTag({ draw: (cx, w, h) => { cx.fillStyle = '#fff'; font(cx, 800, 300); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('−20%', w / 2 + 60, h / 2 + 10); } }); tg.root.position.y = 0.6; add(tg.root, 0.8, -4, 1.0);
    add(makeButterSet(), 4, -4, 0.9);
    const t3 = new THREE.Mesh(text3d(ctx.font3d, '15%', { size: 1.4, depth: 0.35 }), clay('#691FE7', { rough: 0.4, coat: 0.6 })); t3.position.y = 0.6; add(t3, 8, -4, 1);
    add(makePumpBottle(), -9, 0, 1.2); add(makeBag(), -7.3, 0, 1.2); add(makeVitamins(), -5.6, 0, 1.2);
    add(makeChicken(), -3.6, 0, 1.2); add(makeSalad(), -1.4, 0, 1.4); add(makeIceCream(), 0.6, 0, 1.4);
    const bg2 = makeBurger(); add(makePlate(0.9), 3, 0, 1); bg2.position.y = 0.08; add(bg2, 3, 0, 0.8);
    add(makeCoupe(), 5.2, 0, 1); add(makeHighball(), 6.2, 0, 1); add(makeBeer(), 7.2, 0, 1); add(makeShot(), 8.0, 0, 1); add(makeWine(), 8.9, 0, 1);
    add(makeStore(), -6, 6, 0.8); const bt = makeBottleTable(); add(bt.root, 0, 6, 0.9);
    const bed = makeBedroom(); add(bed.root, 6, 7, 0.5);
    const card = makeCard(); card.rotation.x = -0.9; card.position.y = 0.6; add(card, 3, 5, 1);
    v.camera.position.set(S.cam || 0, 13, 19);
    v.camera.lookAt(0, 0, 0.5);
    if (location.search.includes('zoom')) { v.camera.position.set(8, 1.2, 0.5); v.camera.lookAt(8, 0.6, -4); }
  },
  update() {},
};
