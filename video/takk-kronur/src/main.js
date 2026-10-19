import opentype from 'opentype.js';
import { Stage } from './three/stage.js';
import { getCues, FPS } from './core/util.js';
import { SCENES, DURATION } from './scenes/index.js';
import { setupFx, updateFx } from './fx.js';

async function boot() {
  const weights = [400, 500, 600, 700, 800, 900];
  await Promise.all(weights.map((w) => document.fonts.load(`${w} 100px Figtree`, 'ÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö0123456789')));
  await document.fonts.ready;

  const stage = new Stage(document.getElementById('gl'));
  const fontBuf = await (await fetch('public/fonts/figtree-latin-800-normal.woff')).arrayBuffer();
  const ctx = {
    stage,
    back: document.getElementById('back'),
    front: document.getElementById('front'),
    fx: document.getElementById('fx'),
    font3d: opentype.parse(fontBuf),
  };

  const only = new URLSearchParams(location.search).get('scene');
  const scenes = only ? SCENES.filter((s) => only.split(',').includes(s.id)) : SCENES;
  for (const s of scenes) {
    s.back = document.createElement('div');
    s.back.className = 'layer';
    ctx.back.appendChild(s.back);
    s.front = document.createElement('div');
    s.front.className = 'layer';
    ctx.front.appendChild(s.front);
    await s.setup(ctx, s);
  }
  setupFx(ctx);

  let lastActive = [];
  window.seek = (t) => {
    const active = scenes.filter((s) => t >= s.from && t < s.to);
    for (const s of lastActive) if (!active.includes(s)) { s.back.style.display = 'none'; s.front.style.display = 'none'; }
    for (const s of active) { s.back.style.display = 'block'; s.front.style.display = 'block'; }
    lastActive = active;
    let rendered = false;
    stage.clear();
    for (const s of active) {
      s.update(t - s.from, t, s);
      if (s.view && s.view.visible !== false) {
        stage.renderer.autoClear = !rendered;
        stage.render(s.view);
        rendered = true;
      }
    }
    stage.renderer.autoClear = true;
    updateFx(t);
    return true;
  };

  window.__meta = { duration: DURATION, fps: FPS, cues: getCues(), scenes: SCENES.map((s) => ({ id: s.id, from: s.from, to: s.to })) };
  window.ready = true;
}

boot().catch((e) => {
  console.error('BOOT ERROR', e && e.stack ? e.stack : e);
  window.bootError = String(e && e.stack ? e.stack : e);
});
