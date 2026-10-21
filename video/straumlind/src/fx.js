import { el, css } from './core/dom.js';
import { rng, FPS } from './core/util.js';
import { prog, ease, clamp } from './core/anim.js';

let grain, wipeEls = [];
const wipes = [];

/**
 * Register a full-frame wipe. The cut between scenes should sit at `mid`.
 * kind: 'panel' (slab slides across), 'iris' (circle grows from a point then shrinks away).
 */
export function wipe(mid, { kind = 'panel', dur = 0.5, color = '#691FE7', dir = 1, x = 960, y = 540, angle = -8, half = false } = {}) {
  wipes.push({ mid, kind, dur, color, dir, x, y, angle, half });
}

export function setupFx(ctx) {
  // Film grain: one seeded noise tile, offset every frame.
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(96 + r() * 160);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grain = el('div', '', ctx.fx);
  grain.id = 'grain';
  grain.style.backgroundImage = `url(${c.toDataURL()})`;
  const vig = el('div', '', ctx.fx);
  vig.id = 'vignette';
  for (const w of wipes) {
    const e = el('div', 'abs', ctx.fx);
    css(e, { background: w.color, display: 'none' });
    wipeEls.push(e);
  }
}

export function updateFx(t) {
  const f = Math.round(t * FPS);
  const r = rng(1000 + f);
  css(grain, { transform: `translate3d(${Math.floor(r() * 64)}px, ${Math.floor(r() * 64)}px, 0)` });

  wipes.forEach((w, i) => {
    const e = wipeEls[i];
    const a = w.mid - w.dur / 2, b = w.mid + w.dur / 2;
    if (t < a || t > b || (w.half && t >= w.mid)) {
      css(e, { display: 'none' });
      return;
    }
    if (w.kind === 'panel') {
      // in: slab slides to cover; out: continues off the other side
      const p = t < w.mid ? ease.inOutQuart(prog(t, a, w.mid)) * 0.5 : 0.5 + ease.inOutQuart(prog(t, w.mid, b)) * 0.5;
      const span = 1920 * 1.6;
      const xx = w.dir > 0 ? -span + p * (span * 2) - 1920 * 0.3 : 1920 * 1.3 - p * (span * 2) + span - 1920 * 1.0;
      css(e, {
        display: 'block',
        width: `${span}px`,
        height: '1700px',
        transform: `translate3d(${xx.toFixed(1)}px, -310px, 0) rotate(${w.angle}deg)`,
        borderRadius: '0',
      });
    } else if (w.kind === 'iris') {
      const maxR = 2300;
      const p = t < w.mid ? ease.inQuart(prog(t, a, w.mid)) : 1 - ease.outQuart(prog(t, w.mid, b));
      const rad = p * maxR;
      const cx = t < w.mid ? w.x : 960, cy = t < w.mid ? w.y : 540;
      css(e, {
        display: 'block',
        width: `${(rad * 2).toFixed(1)}px`,
        height: `${(rad * 2).toFixed(1)}px`,
        borderRadius: '50%',
        transform: `translate3d(${(cx - rad).toFixed(1)}px, ${(cy - rad).toFixed(1)}px, 0)`,
      });
    }
  });
}
