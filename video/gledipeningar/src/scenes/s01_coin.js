import * as THREE from 'three';
import { b, cue } from '../core/util.js';
import { ease, key, prog, clamp, lerp, wobble, drift, DEG, TAU } from '../core/anim.js';
import { el, css, place, Words } from '../core/dom.js';
import { ContactShadow, toScreen } from '../three/stage.js';
import { makeCoin } from '../models/coin.js';

// Beat grid for this scene (absolute seconds).
const HIT1 = b(1); // first impact
const HIT2 = b(2); // second impact, Euler-disk spin starts
const FLAT = b(5.7); // coin lies flat
const OUT = b(8);

const R = 1, TH = 0.085; // coin radius, half thickness
const contactH = (beta) => R * Math.abs(Math.sin(beta)) + TH * Math.abs(Math.cos(beta));

export default {
  id: 'coin',
  from: 0,
  to: OUT,
  setup(ctx, S) {
    const v = ctx.stage.makeScene({ fov: 26 });
    S.view = v;
    v.contact = new ContactShadow({ width: 9, depth: 9, height: 3, opacity: 0.62, blur: 2.4, darkness: 1.3 });
    v.scene.add(v.contact.group);
    v.rig.key.position.set(-5, 9, 7);

    const coin = makeCoin();
    v.scene.add(coin);
    S.coin = coin;

    // Euler-disk precession: angle phi integrated from a rate that rises as the tilt falls.
    const beta0 = 72 * DEG;
    S.beta = (t) => beta0 * Math.pow(1 - prog(t, HIT2, FLAT), 0.8);
    const N = 2400;
    S.phi = new Float64Array(N + 1);
    const dt = (FLAT - HIT2) / N;
    for (let i = 0; i < N; i++) {
      const tt = HIT2 + i * dt;
      const sb = Math.max(Math.sin(S.beta(tt)), 0.035);
      S.phi[i + 1] = S.phi[i] + (TAU * 1.05) / Math.sqrt(sb) * dt;
    }
    S.phiAt = (t) => {
      const f = clamp((t - HIT2) / dt, 0, N);
      const i = Math.floor(f);
      return i >= N ? S.phi[N] : lerp(S.phi[i], S.phi[i + 1], f - i);
    };
    // Spin so the mark ends upright.
    const spinK = 0.11;
    S.spinEnd = spinK * S.phi[N];
    S.spin = (t) => spinK * S.phiAt(t) - S.spinEnd;

    // DOM: soft studio background and title.
    S.bg = el('div', 'fill', S.back);
    css(S.bg, { background: 'radial-gradient(ellipse 80% 75% at 60% 42%, #F7F3FC 0%, #EEE6F9 55%, #E2D6F5 100%)' });
    S.kicker = el('div', 'abs t-label purple', S.front, 'Vildarkerfi Haga');
    S.kicker.style.fontSize = '28px';
    S.title = new Words(S.front, 'Takk krónur', 't-mega');
    S.title.root.style.fontSize = '184px';
    S.iris = el('div', 'abs', S.front);
    css(S.iris, { background: '#691FE7', borderRadius: '50%', display: 'none' });

    cue(0.0, 'whoosh', { dur: 0.5, gain: 0.5, from: 300, to: 1600 });
    cue(HIT1, 'clink', { pitch: 1.0, gain: 1.0 });
    cue(HIT2, 'clink', { pitch: 1.12, gain: 0.75 });
    cue(HIT2 + 0.02, 'rattle', { dur: FLAT - HIT2, gain: 0.55 });
    cue(FLAT, 'tink', { gain: 0.7 });
    cue(b(3), 'tick', { gain: 0.35 });
    cue(b(6.6), 'whoosh', { dur: 0.75, gain: 0.7, from: 200, to: 2400 });
  },

  update(lt, t, S) {
    const v = S.view;
    const coin = S.coin;
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let beta, phi, spin, pos;

    if (t < HIT1) {
      // Falling and flipping toward the camera.
      const p = prog(t, -0.12, HIT1);
      const fall = p * p;
      pos = [lerp(-0.5, 0, ease.outQuad(p)), lerp(3.15, contactH(68 * DEG), fall), lerp(-0.8, 0, p)];
      beta = lerp(-250 * DEG, 68 * DEG, ease.outQuad(p));
      phi = 90 * DEG;
      spin = lerp(-0.8, -0.25, p) - 0.0;
    } else if (t < HIT2) {
      // One bounce.
      const p = prog(t, HIT1, HIT2);
      const hop = 4 * p * (1 - p) * 0.62;
      beta = lerp(68 * DEG, 72 * DEG, p) + Math.sin(p * Math.PI) * 10 * DEG;
      pos = [lerp(0, 0.12, p), contactH(beta) + hop, lerp(0, 0.05, p)];
      phi = lerp(90 * DEG, 90 * DEG + 0.0, p);
      spin = lerp(-0.25, S.spin(HIT2), p);
    } else {
      beta = S.beta(t);
      if (t > FLAT) beta = Math.abs(wobble(t - FLAT, 7.5, 9)) * 2.2 * DEG;
      phi = 90 * DEG + S.phiAt(Math.min(t, FLAT));
      spin = S.spin(Math.min(t, FLAT));
      pos = [0.12, contactH(beta), 0.05];
    }

    const n = new THREE.Vector3(Math.sin(beta) * Math.cos(phi), Math.cos(beta), Math.sin(beta) * Math.sin(phi)).normalize();
    q.setFromUnitVectors(up, n);
    const qs = new THREE.Quaternion().setFromAxisAngle(up, spin);
    coin.quaternion.copy(q).multiply(qs);
    coin.position.set(pos[0], pos[1], pos[2]);

    // Camera: low three-quarter view with the coin in the right third, then crane to top-down.
    const cam = v.camera;
    const d = drift(t, 0.04, 0.4, 3);
    const crane = ease.inOutCubic(prog(t, b(5.5), b(7.4)));
    const az = key(t, [[0, -12 * DEG], [HIT2, -3 * DEG, ease.outCubic], [b(5.5), 8 * DEG, ease.inOutSine]]);
    const elev = lerp(key(t, [[0, 12 * DEG], [HIT2, 15 * DEG], [b(5.5), 20 * DEG]]), 89.6 * DEG, crane);
    const dist = lerp(key(t, [[0, 9.0], [HIT2, 8.0, ease.outCubic], [b(5.5), 7.6]]), 5.2, crane);
    const target = new THREE.Vector3(0.12 - 1.85 * (1 - crane), 0.5 * (1 - crane), 0.05);
    cam.position.set(
      target.x + Math.sin(az) * Math.cos(elev) * dist + d[0],
      target.y + Math.sin(elev) * dist + d[1],
      target.z + Math.cos(az) * Math.cos(elev) * dist + d[2]
    );
    cam.up.set(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), crane).normalize();
    cam.lookAt(target);
    cam.updateMatrixWorld();

    // Iris: purple floods out from the coin face into the next scene.
    const c = toScreen(coin.position, cam);
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const edge = toScreen(coin.position.clone().addScaledVector(right, R), cam);
    const rad0 = Math.hypot(edge.x - c.x, edge.y - c.y) * 0.8;
    const ip = ease.inQuart(prog(t, b(7.1), OUT));
    const rad = lerp(rad0, 2400, ip);
    css(S.iris, {
      display: ip > 0 ? 'block' : 'none',
      width: `${(rad * 2).toFixed(1)}px`, height: `${(rad * 2).toFixed(1)}px`,
      transform: `translate3d(${(c.x - rad).toFixed(1)}px, ${(c.y - rad).toFixed(1)}px, 0)`,
      opacity: Math.min(1, ip * 6).toFixed(3),
    });

    // Title: kicker then the two words on beats 3 and 4.
    const tx = 150, ty = 380;
    const kIn = ease.outExpo(prog(t, b(2.6), b(3.6)));
    const out = ease.inCubic(prog(t, b(5.4), b(6.0)));
    place(S.kicker, { x: tx + 10, y: ty - 58 + (1 - kIn) * 20 - out * 30, o: kIn * (1 - out) });
    S.title.update(t, { at: b(3), stagger: b(1), dur: 0.7, out: b(5.4), outDur: 0.3, x: tx, y: ty });
  },
};
