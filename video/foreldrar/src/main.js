// Entry: builds the world, all scenes, and exposes window.renderAt(t) → JPEG data URL of the full frame.
import { createWorld, W, H } from './world.js';
import { loadFonts, canvas } from './assets.js';
import { drawHUD, drawCue } from './overlay.js';
import { CHAPTERS, CUES, T } from './timeline.js';
import * as tiles from './scenes/tiles.js';
import * as booklet from './scenes/booklet.js';
import * as order from './scenes/order.js';
import * as deliver from './scenes/deliver.js';
import * as finale from './scenes/finale.js';

const scenes = [tiles, booklet, order, deliver, finale];
const q = new URLSearchParams(location.search);
const world = createWorld();
const out = canvas(W, H); const g = out.getContext('2d');
g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
document.body.appendChild(out);

async function boot() {
  await loadFonts();
  for (const s of scenes) await s.init(world);
  window.ready = true;
}

function hudAlpha(t) { return t < T.endCard ? 1 : Math.max(0, 1 - (t - T.endCard) / 0.6); }

window.renderAt = (t, quality = 0.93, type = 'image/jpeg') => {
  world.reset();
  for (const s of scenes) s.update(t, world);
  world.applyCamera(t);
  world.finishFrame();
  world.renderer.render(world.scene, world.camera);
  g.drawImage(world.renderer.domElement, 0, 0, W, H);
  drawHUD(g, t, CHAPTERS, hudAlpha(t));
  for (const c of CUES) drawCue(g, c, t);
  for (const f of world.overlays) f(g, t);
  return out.toDataURL(type, quality);
};
boot().catch((e) => { console.error('BOOT', e.stack || e); window.bootError = String(e.stack || e); });
