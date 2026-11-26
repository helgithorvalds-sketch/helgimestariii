import { THREE, W, H, anims, sfxEvents, updatePins } from './lib.js';
import { build, END_BAR } from './story.js';
import { B } from './lib.js';

await Promise.all([600, 700, 800].map((w) => document.fonts.load(`${w} 40px PJS`, 'Þaðáéíóúýæö')));
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.getElementById('gl').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 200);
build({ scene, camera });
window.DURATION = B(END_BAR);
window.renderAt = (t) => {
  for (const f of anims) f(t);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  updatePins(t, camera);
  renderer.render(scene, camera);
};
window.getEvents = () => sfxEvents;
window.renderAt(0);
window.ready = true;
