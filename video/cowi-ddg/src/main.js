// COWI · Danmarks Digitale Gadefoto — 68 s film, rendered frame by frame.
// window.renderFrame(t) draws the exact frame for time t (seconds); the
// render script steps through it at 30 fps and pipes screenshots to ffmpeg.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildGlobe, lonLat } from './globe.js';
import { buildDenmark } from './denmark.js';
import { buildCity } from './city.js';
import { setLook } from './materials.js';
import { COWI, logoSVG } from './brand.js';
import { clamp, lerp, seg, win, smooth, smoother, easeInOutCubic, easeOutCubic, easeInOutQuint, easeOutExpo, alongPoly, canvasTexture } from './util.js';

export const FPS = 30;
export const DURATION = 68;
const W = 1920, H = 1080;
const Q = Object.fromEntries(new URLSearchParams(location.search));
const MSAA = Q.msaa !== undefined ? +Q.msaa : 4;
const SHADOW = Q.shadow !== undefined ? +Q.shadow : 4096;
const AO = Q.ao !== '0';
const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Khronos PBR Neutral tone mapping: keeps the white clay white and brand colours true.
THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
  'vec3 CustomToneMapping( vec3 color ) { return color; }',
  `vec3 CustomToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    const float startCompression = 0.8 - 0.04;
    const float desaturation = 0.15;
    float x = min(color.r, min(color.g, color.b));
    float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
    color -= offset;
    float peak = max(color.r, max(color.g, color.b));
    if (peak < startCompression) return color;
    const float d = 1. - startCompression;
    float newPeak = 1. - d * d / (peak + d - startCompression);
    color *= newPeak / peak;
    float g = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
    return mix(color, newPeak * vec3(1, 1, 1), g);
  }`,
);

async function loadJSON(url) {
  const r = await fetch(url);
  return r.json();
}

// ------------------------------------------------------------------ setup
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.CustomToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const bgClay = canvasTexture(W, H, (g) => {
  const gr = g.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H * 0.5, W * 0.75);
  gr.addColorStop(0, '#fbfbfa');
  gr.addColorStop(1, '#e6e8eb');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
});
const bgSky = canvasTexture(16, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#5f9bd1');
  gr.addColorStop(0.42, '#a9cbe6');
  gr.addColorStop(0.5, '#dfe9f0');
  gr.addColorStop(1, '#e9eef0');
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
});

function makeComposer(scene, camera, { ao = false } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: MSAA });
  const c = new EffectComposer(renderer, rt);
  c.renderToScreen = false;
  const rp = new RenderPass(scene, camera);
  c.addPass(rp);
  let gtao = null;
  if (ao && AO) {
    gtao = new GTAOPass(scene, camera, W / 2, H / 2);
    gtao.setSize = () => {};
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 1.0;
    // Hide unlit overlays (dots, rings, route) from the AO normal/depth pass.
    gtao.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => {
        cache.set(o, o.visible);
        if (o.isPoints || o.isLine || (o.material && (o.material.isMeshBasicMaterial || o.material.isShaderMaterial))) o.visible = false;
      });
    };
    c.addPass(gtao);
  }
  c.addPass(new OutputPass());
  return { c, rp, gtao, camera };
}

const composite = (() => {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uWipe: { value: -1 }, uSplit: { value: 2 },
      uWipeC: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: W / H }, uFade: { value: 0 }, uVignette: { value: 0.18 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform float uWipe; uniform float uSplit;
      uniform vec2 uWipeC; uniform float uAspect; uniform float uFade; uniform float uVignette; varying vec2 vUv;
      void main(){
        vec4 a = texture2D(tA, vUv);
        vec4 b = texture2D(tB, vUv);
        vec4 c = mix(a, b, uMix);
        if (uWipe >= 0.0) {
          vec2 d = (vUv - uWipeC) * vec2(uAspect, 1.0);
          float r = length(d);
          float m = 1.0 - smoothstep(uWipe - 0.012, uWipe, r);
          float ringGlow = smoothstep(uWipe - 0.03, uWipe, r) * (1.0 - smoothstep(uWipe, uWipe + 0.01, r));
          c = mix(a, b, m);
          c.rgb = mix(c.rgb, vec3(1.0), ringGlow * 0.9);
        }
        if (uSplit < 1.5) c = vUv.x < uSplit ? a : b;
        vec2 q = vUv - 0.5;
        c.rgb *= 1.0 - uVignette * dot(q, q) * 1.6;
        c.rgb = mix(c.rgb, vec3(1.0), uFade);
        gl_FragColor = vec4(c.rgb, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const s = new THREE.Scene();
  s.add(q);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return { mat, render: () => { renderer.setRenderTarget(null); renderer.render(s, cam); } };
})();

// ------------------------------------------------------------------ build everything
await document.fonts.load('600 40px Inter');
await document.fonts.load('700 40px Inter');
await document.fonts.load('800 40px Inter');
const [world, dkData, dkRoads, cityData] = await Promise.all([
  loadJSON('data/world.json'),
  loadJSON('data/denmark.json'),
  loadJSON('data/dk-roads.json').catch(() => null),
  loadJSON('data/city.json'),
]);

// Globe
const G = buildGlobe(world);
G.scene.environment = envTex;
G.scene.background = bgClay;
const gSun = new THREE.DirectionalLight('#fffaf2', 2.4);
gSun.position.set(-2, 3, 4);
G.scene.add(gSun, new THREE.HemisphereLight('#ffffff', '#cdd3d8', 0.5));
const gCam = new THREE.PerspectiveCamera(30, W / H, 0.001, 50);
const gComp = makeComposer(G.scene, gCam);

// Denmark
const roadsForDk = dkRoads ? dkRoads.roads : dkData.roads.map((r) => ({ c: r.t ? 4 : 2, p: r.p }));
const D = buildDenmark(dkData, roadsForDk);
D.scene.environment = envTex;
D.scene.background = bgClay;
D.scene.fog = new THREE.Fog('#eceef0', 1500, 4000);
const dSun = new THREE.DirectionalLight('#fff8ee', 2.3);
dSun.castShadow = true;
dSun.shadow.mapSize.set(4096, 4096);
Object.assign(dSun.shadow.camera, { left: -320, right: 320, top: 320, bottom: -320, near: 1, far: 3000 });
dSun.shadow.bias = -0.0004;
dSun.position.set(-400, 900, 500);
D.scene.add(dSun, dSun.target, new THREE.HemisphereLight('#ffffff', '#d0d4d8', 0.45));
const dCam = new THREE.PerspectiveCamera(35, W / H, 0.5, 9000);
const dComp = makeComposer(D.scene, dCam);

// City
const C = buildCity(cityData);
C.scene.environment = envTex;
const cSun = new THREE.DirectionalLight('#fff6e8', 2.6);
cSun.castShadow = true;
cSun.shadow.mapSize.set(SHADOW, SHADOW);
cSun.shadow.bias = -0.0002;
cSun.shadow.normalBias = 0.02;
const cHemi = new THREE.HemisphereLight('#ffffff', '#cfd3d6', 0.45);
C.scene.add(cSun, cSun.target, cHemi);
const cCamA = new THREE.PerspectiveCamera(35, W / H, 0.3, 14000);
const cCamB = new THREE.PerspectiveCamera(60, W / H, 0.1, 6000);
const cCompA = makeComposer(C.scene, cCamA, { ao: true });
const cCompB = makeComposer(C.scene, cCamB, { ao: true });
// Tame the studio environment so the sun gives readable light and shadow.
const LIGHT = Object.assign({ env: 0.32, exposure: 0.92 }, window.LIGHT_OVERRIDE || {});
renderer.toneMappingExposure = LIGHT.exposure;
const tuned = new Set();
for (const sc of [G.scene, D.scene, C.scene])
  sc.traverse((o) => {
    if (!o.isMesh) return;
    const mats = [o.material, o.userData.clay, o.userData.color].flat().filter(Boolean);
    for (const m of mats) {
      if (tuned.has(m) || !('envMapIntensity' in m)) continue;
      tuned.add(m);
      m.envMapIntensity = (m.envMapIntensity ?? 1) * LIGHT.env;
    }
  });
console.log('city', { dots: C.dotsCount, trees: C.treeCount, routeLen: C.routeLens.at(-1), street: C.streetTotal });

// Overlay logos
$('bug').innerHTML = logoSVG(COWI.orange);
$('uiLogo').innerHTML = logoSVG(COWI.orange);
$('endLogo').innerHTML = logoSVG(COWI.orange);
const tape = $('tape');
const dirs = ['N', '·', 'NE', '·', 'E', '·', 'SE', '·', 'S', '·', 'SW', '·', 'W', '·', 'NW', '·'];
tape.innerHTML = [...dirs, ...dirs, ...dirs].map((d) => `<span>${d}</span>`).join('');

// ------------------------------------------------------------------ hero geometry helpers
const hero = C.hero;
const HP = V(hero.x, 0, hero.z);
const F = V(-hero.toHouse[0], 0, -hero.toHouse[1]); // house → street
const A = V(hero.along[0], 0, hero.along[1]); // along the street
const Dt = V(hero.roadPoint[0], 0, hero.roadPoint[1]); // the photo dot in front of the house
const at = (base, f = 0, a = 0, y = 0) => base.clone().addScaledVector(F, f).addScaledVector(A, a).setY(base.y + y);
// Arc length of the street at the house.
const sLens = C.streetLens;
let sHouse = 0;
{
  let bd = Infinity;
  for (let s = 0; s <= C.streetTotal; s += 0.5) {
    const p = alongPoly(hero.street.p, sLens, s);
    const d = Math.hypot(p.x - Dt.x, p.y - Dt.z);
    if (d < bd) { bd = d; sHouse = s; }
  }
}
// Street direction at the house (sign so that the car drives along +A).
const streetAngle = alongPoly(hero.street.p, sLens, sHouse).angle;
const streetSign = Math.cos(streetAngle) * A.x + Math.sin(streetAngle) * A.z >= 0 ? 1 : -1;

// ------------------------------------------------------------------ helpers
function toScreen(v, cam) {
  const p = v.clone().project(cam);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, behind: p.z > 1 };
}
function setCam(cam, pos, target, fov) {
  cam.position.copy(pos);
  if (fov) cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(target);
  cam.updateMatrixWorld();
}
const path = (pts) => {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return (u) => curve.getPoint(clamp(u));
};
function sunFollow(light, focus, size, dir = V(-0.55, 0.62, 0.56)) {
  light.target.position.copy(focus);
  light.position.copy(focus).addScaledVector(dir.clone().normalize(), Math.max(400, size * 3));
  const sc = light.shadow.camera;
  sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size;
  sc.near = 1; sc.far = Math.max(1200, size * 7);
  sc.updateProjectionMatrix();
  light.target.updateMatrixWorld();
}
function cityLook(look, variant) {
  setLook(C.root, look);
  if (look === 'color') {
    C.scene.background = bgSky;
    C.scene.fog = new THREE.Fog('#e3ebf0', 160, 1100);
    cHemi.intensity = 0.55;
    cSun.intensity = 2.8;
  } else {
    C.scene.background = bgClay;
    cHemi.intensity = 0.45;
    cSun.intensity = 2.6;
  }
  C.house.carport.visible = variant !== '2024';
  C.house.tree.scale.setScalar(variant === '2024' ? 0.72 : 1);
}
function clayFog(alt) {
  C.scene.fog = new THREE.Fog('#eceef0', alt * 2.2 + 250, alt * 7 + 1800);
}

// Overlay element helpers
const el = {};
for (const id of ['caption', 'capTxt', 'bug', 'permit', 'clock', 'clockT', 'hand', 'hud', 'date', 'dateTxt', 'split', 'yrL', 'yrR', 'title', 'ui', 'desk', 'typed', 'caret', 'ck1', 'ck2', 'ck3', 'stamp', 'approveBtn', 'pin', 'mapchip', 'end', 'endTag', 'endTag2', 'endRule', 'fade', 'leaders', 'co1', 'co2', 'co3', 'co4', 'photoDate', 'tabMap', 'tabPhoto', 'endLogo'])
  el[id] = $(id);
const op = (e, v) => (e.style.opacity = String(clamp(v)));

const CAPTIONS = [
  [6.0, 10.2, 'Denmark. 98 municipalities.'],
  [10.8, 16.4, 'Every day, thousands of decisions about places no one can see from their desk.'],
  [17.2, 22.0, 'Until now: drive out and look.'],
  [22.6, 28.2, 'COWI photographs every street. In 360°. Every 2 years.'],
  [31.0, 34.2, '2026: 5,000 km of paths, by bike.'],
  [43.4, 48.0, 'Every photo dated. Compare over time.'],
  [49.4, 55.0, 'No drive. Just a click.'],
  [56.0, 61.8, 'All of Denmark. Ready on your screen.'],
];
function updateCaption(t) {
  let shown = null;
  for (const c of CAPTIONS) if (t >= c[0] && t < c[1]) shown = c;
  if (!shown) return op(el.caption, 0);
  const [a, b, txt] = shown;
  if (el.capTxt.textContent !== txt) el.capTxt.textContent = txt;
  const k = win(t, a, b, 0.5, 0.45);
  op(el.caption, k);
  const inK = easeOutCubic(seg(t, a, a + 0.6));
  el.caption.style.transform = `translateY(${(1 - inK) * 24}px)`;
}

function leaderLine(from, to) {
  return `<path d="M${from.x.toFixed(1)},${from.y.toFixed(1)} L${to.x.toFixed(1)},${to.y.toFixed(1)}" stroke="#1c2b54" stroke-width="2" stroke-opacity="0.7" fill="none"/><circle cx="${to.x.toFixed(1)}" cy="${to.y.toFixed(1)}" r="5" fill="#fff" stroke="#f04e23" stroke-width="3"/>`;
}

// ------------------------------------------------------------------ the timeline
const T = {
  globeEnd: 10.8, dkStart: 10.0, dkEnd: 14.6, cityStart: 13.9,
  s4: 16.4, drive0: 18.4, drive1: 21.6, s5: 22.0, s6: 28.0, bike: 31.0, s7: 34.0, wipe0: 36.25, wipe1: 37.1,
  s8: 42.0, split0: 43.3, s9: 48.0, s10: 55.0, dk2: 58.7, end: 62.0,
};

function globeState(t) {
  const u = easeInOutCubic(seg(t, 0, 10.3));
  const lon = lerp(-42, 9.6, u);
  const lat = lerp(18, 47.5, easeInOutCubic(seg(t, 1.5, 10.0)));
  const dist = lerp(3.5, 1.118, easeInOutQuint(seg(t, 4.2, 10.6)));
  const target = new THREE.Vector3().lerpVectors(V(0, 0, 0), lonLat(10.6, 56.0, 1.0), easeInOutCubic(seg(t, 3.6, 9.6)));
  setCam(gCam, lonLat(lon, lat, dist), target, 30);
  const k = smooth(seg(t, 6.0, 8.2));
  G.dkMat.color.set('#f4f3f0').lerp(new THREE.Color(COWI.orange), k);
  G.dkU.uH.value = 0.0035 + 0.0022 * easeOutCubic(seg(t, 6.2, 8.8));
  gSun.position.copy(lonLat(lon - 40, lat + 25, 5));
}

function denmarkState(t, phase) {
  const [sx, sz] = D.silkeborg;
  const top = D.top;
  if (phase === 'in') {
    // From the globe framing down to Silkeborg.
    const u = easeInOutCubic(seg(t, T.dkStart, T.dkEnd));
    const p = path([V(10, 760, 980), V(-10, 420, 420), V(sx * 0.7, 130, sz + 120), V(sx, 34, sz + 26), V(sx, 9, sz + 5)]);
    const tg = path([V(0, top, 0), V(sx * 0.4, top, sz * 0.4), V(sx, top, sz), V(sx, top, sz), V(sx, top, sz)]);
    setCam(dCam, p(u), tg(u), 35);
    D.U.uWScale.value = clamp((dCam.position.y - top) / 300, 0.04, 2.2);
    D.U.uDraw.value = lerp(0, 520, easeInOutCubic(seg(t, 10.4, 13.6)));
    D.U.uGlow.value = 0.0;
    D.U.uMinCls.value = 0;
    D.pinMat.opacity = win(t, 11.5, 13.5, 0.5, 0.5);
    D.pin.scale.setScalar(clamp((dCam.position.y - top) / 60, 0.1, 3) * (1 + 0.15 * Math.sin(t * 5)));
    D.scene.fog.near = 1600; D.scene.fog.far = 4200;
  } else {
    // Pull back out over all of Denmark, every road glowing.
    const u = easeInOutCubic(seg(t, T.dk2 - 0.4, T.end));
    const p = path([V(sx, 40, sz + 40), V(sx * 0.6, 220, sz + 260), V(-10, 560, 520), V(0, 640, 540)]);
    const tg = path([V(sx, top, sz), V(sx * 0.6, top, sz * 0.6), V(0, top, 10), V(0, top, 15)]);
    setCam(dCam, p(u), tg(u), 35);
    D.U.uWScale.value = clamp((dCam.position.y - top) / 300, 0.04, 2.2);
    D.U.uDraw.value = 1e5;
    D.U.uGlow.value = 0.25 + 0.25 * smooth(seg(t, 59, 61));
    D.pinMat.opacity = 0.9;
    D.pin.scale.setScalar(1.6 + (1 - u) * 0.2);
  }
}

/** City state shared by every city render in this frame. */
function cityState(t) {
  const U = C.U;
  // Draw-in + rise (S3).
  U.uDraw.value = t < 18 ? lerp(0, 3600, easeInOutCubic(seg(t, 13.9, 16.6))) : 1e6;
  U.uRise.value = t < 19 ? lerp(-150, 3300, easeInOutCubic(seg(t, 14.3, 17.2))) : 1e6;
  // Dots + orange streets (S5 onward).
  if (t < T.s5) U.uSpread.value = -100;
  else if (t < T.s6) U.uSpread.value = lerp(0, 4200, easeInOutCubic(seg(t, 22.4, 27.6)));
  else U.uSpread.value = 1e6;
  U.uOrange.value = t >= T.s6 && t < T.s9 ? 0 : 1;
  C.dotU.uDotSize.value = t >= T.s6 && t < T.s7 ? 0 : t >= T.s7 && t < T.s9 ? 0.55 : t >= T.s10 && t < T.s10 + 1.2 ? 0.55 : 1.6;
  for (const pass of [cCompA.gtao, cCompB.gtao].filter(Boolean)) pass.blendIntensity = smooth(seg(t, 16.6, 17.6));
  // Permit marker ring.
  C.ringMat.opacity = win(t, 16.8, 22.0, 0.6, 0.6) * 0.95;
  C.ring.scale.setScalar(1 + 0.04 * Math.sin(t * 4));
  // Site-visit drive.
  const total = C.routeLens.at(-1);
  const dk = easeInOutCubic(seg(t, T.drive0, T.drive1));
  const d = dk * total;
  C.routeU.uDraw.value = t < T.drive0 || t > T.s5 + 0.6 ? 0 : d + 2;
  C.siteCar.visible = t > T.drive0 - 0.3 && t < T.s5 + 0.5;
  {
    const p = alongPoly(C.route, C.routeLens, Math.max(0, d - 3));
    C.siteCar.position.set(p.x, 0.32, p.y);
    C.siteCar.rotation.y = -p.angle;
    C.siteCar.scale.setScalar(lerp(3, 9, smooth(seg(t, T.drive0, 19.4)))); // exaggerated so it reads from the air
  }
  // Street-photo car (S6) drives along the hero street.
  const carS = sHouse + streetSign * lerp(-34, 10, seg(t, T.s6 - 0.2, T.bike + 0.2));
  const cp = alongPoly(hero.street.p, sLens, carS);
  C.ddg.position.set(cp.x, 0, cp.y);
  C.ddg.rotation.y = -cp.angle + (streetSign < 0 ? Math.PI : 0);
  C.ddg.visible = t >= T.s6 - 0.5 && t < T.bike + 0.2;
  for (const w of C.ddg.userData.wheels) w.rotation.z = -carS * 2.9 * streetSign;
  const camS = carS - streetSign * 0.8; // camera mast position
  for (const cd of C.chaseDots) {
    const passed = streetSign > 0 ? camS - cd.s : cd.s - camS;
    const on = C.ddg.visible && passed > 0;
    cd.d.userData.enabled = on;
    cd.f.userData.enabled = on && passed < 9;
    const k = clamp(passed / 9);
    cd.f.scale.setScalar(0.3 + k * 4.5);
    cd.f.material.opacity = (1 - k) * 0.9;
  }
  // Cyclist on the forest trail (S6b).
  const fr = C.forest;
  const rs = lerp(208, 226, seg(t, T.bike - 0.3, T.s7 + 0.2));
  const rp = alongPoly(fr.trail, fr.lens, rs);
  fr.rider.position.set(rp.x, fr.hAt(rp.x, rp.y) + 0.3, rp.y);
  fr.rider.rotation.y = -rp.angle;
  fr.rider.userData.update(rs * 2.3);
  for (const fd of fr.dots) {
    const passed = rs - 0.1 - fd.s;
    fd.d.userData.enabled = passed > 0;
    fd.f.userData.enabled = passed > 0 && passed < 8;
    const k = clamp(passed / 8);
    fd.f.scale.setScalar(0.3 + k * 4);
    fd.f.material.opacity = (1 - k) * 0.9;
  }
  return { carS, rp, rs };
}

/** Camera for the primary city render, by time. Returns {pos, target, fov, focus, size}. */
function cityCamA(t, st) {
  const hTop = at(HP, 0, 0, 3);
  if (t < T.drive0) {
    // S3 → S4: from 2.6 km up down to the house.
    const u = easeInOutCubic(seg(t, T.cityStart, 17.6));
    const p = path([V(-80, 2700, 900), V(hero.x * 0.6, 1100, hero.z * 0.6 + 700), at(HP, 160, 120, 190), at(HP, 58, 36, 44)]);
    const tg = path([V(0, 0, 0), V(hero.x * 0.7, 0, hero.z * 0.7), at(HP, 0, 0, 2), hTop]);
    const drift = seg(t, 17.6, T.drive0);
    const pos = p(u).add(A.clone().multiplyScalar(-6 * drift));
    return { pos, target: tg(u), fov: 35, focus: tg(u), size: lerp(1500, 70, u) };
  }
  if (t < T.s5) {
    // S4: rise to see the whole route, then come back over the house.
    const r = C.route;
    let x0 = hero.x, x1 = hero.x, z0 = hero.z, z1 = hero.z;
    for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const RC = V((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const ext = Math.max((x1 - x0) / 1.7, z1 - z0);
    const u1 = easeInOutCubic(seg(t, T.drive0, 19.4));
    const pos = new THREE.Vector3().lerpVectors(at(HP, 58, 36, 44), RC.clone().add(V(0, ext * 1.55, ext * 0.55)), u1);
    const tg = new THREE.Vector3().lerpVectors(hTop, RC, u1);
    const u2 = easeInOutCubic(seg(t, 20.9, T.s5 + 0.6));
    const pos2 = at(HP, 210, -120, 190);
    return { pos: pos.lerp(pos2, u2), target: tg.lerp(hTop, u2), fov: 35, focus: tg, size: lerp(lerp(70, 1700, u1), 220, u2) };
  }
  if (t < T.s6) {
    // S5: dots spread across every street while the camera pulls back.
    const u = easeInOutCubic(seg(t, T.s5, T.s6 + 0.3));
    const pos = new THREE.Vector3().lerpVectors(at(HP, 210, -120, 190), at(HP, 1200, -700, 1150), u);
    const tg = new THREE.Vector3().lerpVectors(hTop, at(HP, -150, 0, 0), u);
    return { pos, target: tg, fov: 35, focus: tg, size: lerp(250, 1500, u) };
  }
  if (t < T.bike) {
    // S6a: low chase shot of the street-photo car.
    const car = C.ddg.position;
    const yaw = -C.ddg.rotation.y;
    const fwd = V(Math.cos(yaw), 0, Math.sin(yaw));
    const side = V(-fwd.z, 0, fwd.x);
    const k = seg(t, T.s6, T.bike);
    const pos = car.clone().addScaledVector(fwd, lerp(7.5, 3.5, k)).addScaledVector(side, lerp(5.5, 7.2, k)).setY(lerp(1.9, 2.6, k));
    const tg = car.clone().addScaledVector(fwd, -0.6).setY(1.45);
    return { pos, target: tg, fov: 40, focus: car.clone(), size: 30 };
  }
  if (t < T.s7) {
    // S6b: tracking the cyclist on the forest trail.
    const { rp } = st;
    const base = C.forest.group.position;
    const rider = C.forest.rider.position.clone().add(base);
    const fwd = V(Math.cos(rp.angle), 0, Math.sin(rp.angle));
    const side = V(-fwd.z, 0, fwd.x);
    const k = seg(t, T.bike, T.s7);
    const pos = rider.clone().addScaledVector(fwd, lerp(5.5, 3.2, k)).addScaledVector(side, lerp(-3.6, -4.4, k)).setY(rider.y + lerp(1.3, 1.9, k));
    return { pos, target: rider.clone().setY(rider.y + 1.25).addScaledVector(fwd, -0.3), fov: 42, focus: rider, size: 45 };
  }
  if (t < T.wipe1) {
    // S7: dive into the photo dot in front of the house.
    const u = easeInOutCubic(seg(t, T.s7, T.wipe1 - 0.05));
    const p = path([at(Dt, 70, -60, 80), at(Dt, 30, -18, 30), at(Dt, 4, -1, 6.5), at(Dt, 0.3, 0, 2.6)]);
    const tg = path([at(HP, 0, 0, 2), at(Dt, -6, 0, 0), at(Dt, -0.5, 0, 0), at(Dt, -0.05, 0, 0)]);
    return { pos: p(u), target: tg(u), fov: 35, focus: Dt.clone(), size: 80 };
  }
  if (t >= T.s9 && t < T.s10) {
    // S9: top-down map view in the viewer pane.
    const k = seg(t, T.s9, 51.2);
    const pos = at(HP, 6, 0, lerp(320, 240, easeOutCubic(k)));
    return { pos, target: at(HP, 5.9, 0, 0), fov: 35, focus: HP.clone(), size: 220 };
  }
  // S10: pull back from the house up over Silkeborg.
  const u = easeInOutCubic(seg(t, T.s10 + 0.2, T.dk2 + 0.5));
  const p = path([at(Dt, 1.5, 0, 2.2), at(HP, 60, -30, 40), at(HP, 400, -300, 600), V(-200, 2600, 1700)]);
  const tg = path([at(HP, 0, 0, 3), at(HP, 0, 0, 2), at(HP, -50, 0, 0), V(0, 0, 0)]);
  return { pos: p(u), target: tg(u), fov: 35, focus: tg(u), size: lerp(60, 1600, u) };
}

/** Street-level 360° camera (inside the photo). */
function cityCamB(t) {
  const eye = at(Dt, 0, 0, 2.5);
  let yaw, pitch = 0.02;
  if (t < T.s8) {
    yaw = lerp(-2 * Math.PI, 0, easeInOutCubic(seg(t, T.wipe0 + 0.3, T.s8 - 0.1)));
    pitch = lerp(-0.6, 0.02, easeOutCubic(seg(t, T.wipe0, T.wipe1 + 0.6)));
  } else yaw = 0;
  const dir = F.clone().multiplyScalar(-Math.cos(yaw)).addScaledVector(A, Math.sin(yaw)).normalize();
  const fwdPush = t >= T.s8 ? easeInOutCubic(seg(t, T.s8, T.s9)) * 1.5 : 0;
  const pos = eye.clone().addScaledVector(F, -fwdPush);
  const target = pos.clone().add(dir.multiplyScalar(10)).setY(eye.y + Math.tan(pitch) * 10);
  return { pos, target, fov: 62, focus: at(HP, 4, 0, 0), size: 45, yaw, ao: t < T.split0 };
}

function renderCity(compo, cam, camState, look, variant) {
  cityLook(look, variant);
  compo.rp.camera = cam;
  if (compo.gtao) compo.gtao.camera = cam;
  setCam(cam, camState.pos, camState.target, camState.fov);
  if (look === 'clay') clayFog(Math.max(camState.pos.y, 20));
  sunFollow(cSun, camState.focus, camState.size);
  if (compo.gtao) compo.gtao.enabled = camState.ao ?? camState.pos.y < 120;
  compo.gtao?.updateGtaoMaterial({ radius: clamp(camState.pos.y * 0.04, 0.6, 22), distanceExponent: 1.5, thickness: clamp(camState.pos.y * 0.03, 1, 20), scale: 1.0 });
  compo.c.render();
  return compo.c.readBuffer.texture;
}

function renderGlobe() {
  gComp.c.render();
  return gComp.c.readBuffer.texture;
}
function renderDk() {
  dComp.c.render();
  return dComp.c.readBuffer.texture;
}

// ------------------------------------------------------------------ overlays
function updateOverlays(t, ctx) {
  updateCaption(t);
  op(el.bug, win(t, 1.0, T.end - 0.2, 1.0, 0.6) * (t > T.s9 && t < T.s10 ? 0 : 1) * (t > T.wipe0 && t < T.s9 ? 0.0 : 1));

  // Permit card near the house (S4).
  {
    const k = win(t, 16.9, T.drive0 + 0.35, 0.5, 0.35);
    op(el.permit, k);
    if (k > 0) {
      const s = toScreen(at(HP, 0, 0, 7), cCamA);
      el.permit.style.left = `${s.x - 40}px`;
      el.permit.style.top = `${s.y - 64 - 240}px`;
      el.permit.style.transform = `scale(${0.92 + 0.08 * easeOutCubic(seg(t, 16.9, 17.5))})`;
    }
  }
  // Travel clock (S4).
  {
    const k = win(t, T.drive0 + 0.1, T.s5 + 0.3, 0.4, 0.4);
    op(el.clock, k);
    const mins = Math.round(94 * easeInOutCubic(seg(t, T.drive0, T.drive1)));
    el.clockT.textContent = `${mins} min`;
    const a = (mins / 60) * Math.PI * 2;
    el.hand.setAttribute('d', `M20 20 L${(20 + Math.sin(a) * 11).toFixed(2)} ${(20 - Math.cos(a) * 11).toFixed(2)}`);
  }
  // Callouts on the street-photo car and the cyclist.
  let svg = '';
  const callout = (e, k, anchor, dx, dy) => {
    op(e, k);
    if (k <= 0.01) return;
    const s = toScreen(anchor, cCamA);
    const lx = s.x + dx, ly = s.y + dy;
    e.style.left = `${lx}px`;
    e.style.top = `${ly - 22}px`;
    svg += `<g opacity="${k.toFixed(3)}">${leaderLine({ x: lx + (dx < 0 ? e.offsetWidth : 0), y: ly }, s)}</g>`;
  };
  if (t > T.s6 - 0.2 && t < T.bike + 0.2) {
    const camHead = C.ddg.userData.cameraHead.getWorldPosition(new THREE.Vector3());
    const gnss = C.ddg.localToWorld(V(-1.5, 1.7, 0));
    callout(el.co1, win(t, 28.5, T.bike, 0.4, 0.3), camHead, 150, -110);
    callout(el.co2, win(t, 29.1, T.bike, 0.4, 0.3), gnss, -420, -40);
    const dotIdx = C.chaseDots.filter((c) => c.d.userData.enabled).at(streetSign > 0 ? -2 : 1);
    if (dotIdx) callout(el.co3, win(t, 29.7, T.bike, 0.4, 0.3), dotIdx.d.position.clone(), -360, 120);
    else op(el.co3, 0);
  } else [el.co1, el.co2, el.co3].forEach((e) => op(e, 0));
  if (t > T.bike && t < T.s7) {
    const cam = C.forest.rider.children.find((c) => c.isGroup && c.children.length > 3);
    const p = cam ? cam.getWorldPosition(new THREE.Vector3()) : C.forest.rider.position;
    callout(el.co4, win(t, 31.6, T.s7, 0.4, 0.3), p, 160, -60);
  } else op(el.co4, 0);
  el.leaders.innerHTML = svg;

  // 360 viewer HUD + title (S7–S8).
  const hudK = win(t, T.wipe1 - 0.1, T.s9 + 0.1, 0.5, 0.3);
  op(el.hud, hudK * (t > T.split0 ? 1 - smooth(seg(t, T.split0, T.split0 + 0.4)) : 1));
  if (ctx.yaw !== undefined) {
    const deg = ((THREE.MathUtils.radToDeg(ctx.heading) % 360) + 360) % 360;
    el.hud.querySelector('#tape').style.left = `${280 - 35 - (deg / 22.5) * 70 - 16 * 70}px`;
  }
  op(el.title, win(t, 37.6, 41.6, 0.6, 0.6));
  el.title.style.transform = `translateY(-50%) scale(${1 + 0.03 * seg(t, 37.6, 41.6)})`;
  op(el.date, win(t, 42.2, T.s9, 0.4, 0.3));
  el.dateTxt.textContent = t < T.split0 ? 'Photographed 14 May 2026 · 10:42' : 'Photo dates: 22 May 2024  |  14 May 2026';
  const splitK = easeInOutCubic(seg(t, T.split0, T.split0 + 0.9));
  ctx.split = t >= T.split0 && t < T.s9 ? lerp(1.0, 0.5, splitK) : 2;
  op(el.split, t >= T.split0 && t < T.s9 ? win(t, T.split0, T.s9, 0.2, 0.3) : 0);
  el.split.style.left = `${(ctx.split < 1.5 ? ctx.split : 1) * W}px`;
  op(el.yrL, win(t, T.split0 + 0.7, T.s9, 0.4, 0.3));
  op(el.yrR, win(t, T.split0 + 0.7, T.s9, 0.4, 0.3));
  el.yrL.style.left = `${ctx.split * W - 40 - 190}px`;
  el.yrR.style.left = `${ctx.split * W + 40}px`;

  // Caseworker desktop (S9).
  const uiK = win(t, T.s9, T.s10 + 0.5, 0.8, 0.6);
  op(el.ui, uiK);
  op(el.desk, uiK);
  const shrink = easeInOutCubic(seg(t, T.s9, T.s9 + 1.0)) * (1 - easeInOutCubic(seg(t, T.s10, T.s10 + 0.8)));
  const sc = lerp(1, 1342 / 1920, shrink);
  canvas.style.transform = `translate(${lerp(0, 36, shrink)}px, ${lerp(0, 120, shrink)}px) scale(${sc})`;
  canvas.style.clipPath = shrink > 0.001 ? `inset(0 round ${lerp(0, 26, shrink)}px)` : 'none';
  const addr = 'Eksempelvej 7, 8600 Silkeborg';
  const n = Math.floor(addr.length * seg(t, 49.3, 50.6));
  el.typed.textContent = addr.slice(0, n);
  op(el.caret, t > T.s9 && t < 51 ? (Math.floor(t * 2.5) % 2 ? 0.2 : 1) : 0);
  op(el.mapchip, win(t, 48.6, 51.5, 0.4, 0.3));
  el.tabMap.classList.toggle('on', t < 51.4);
  el.tabPhoto.classList.toggle('on', t >= 51.4);
  {
    const k = win(t, 50.6, 51.6, 0.2, 0.3);
    op(el.pin, k);
    if (k > 0) {
      const s = toScreen(at(HP, 0, 0, 0), cCamA);
      const drop = (1 - easeOutCubic(seg(t, 50.6, 51.0))) * 60;
      el.pin.style.left = `${36 + s.x * sc - 22}px`;
      el.pin.style.top = `${120 + s.y * sc - 58 - drop}px`;
    }
  }
  el.photoDate.textContent = t > 51.6 ? '14 May 2026' : '—';
  op(el.ck1, seg(t, 52.2, 52.5));
  op(el.ck2, seg(t, 52.6, 52.9));
  op(el.ck3, seg(t, 53.0, 53.3));
  const st = seg(t, 53.5, 53.75);
  op(el.stamp, st);
  el.stamp.style.transform = `translateX(-50%) rotate(-8deg) scale(${lerp(1.6, 1, easeOutCubic(st))})`;
  el.approveBtn.style.background = t > 53.4 && t < 53.7 ? '#31b18f' : '';

  // End card.
  const endK = smooth(seg(t, T.end - 0.4, T.end + 0.4));
  op(el.end, endK);
  const lk = easeOutExpo(seg(t, T.end + 0.3, T.end + 1.5));
  el.endLogo.style.opacity = String(lk);
  el.endLogo.style.transform = `translateY(${(1 - lk) * 30}px) scale(${0.96 + 0.04 * lk})`;
  el.endRule.style.width = `${easeInOutCubic(seg(t, T.end + 1.0, T.end + 1.9)) * 120}px`;
  op(el.endTag, seg(t, T.end + 1.5, T.end + 2.2));
  el.endTag.style.transform = `translateY(${(1 - easeOutCubic(seg(t, T.end + 1.5, T.end + 2.2))) * 14}px)`;
  op(el.endTag2, seg(t, T.end + 2.0, T.end + 2.7));
  op(el.fade, 0);
}

// ------------------------------------------------------------------ frame
function frame(t) {
  if (t >= T.end + 0.45) {
    // End card fully covers the 3D view.
    updateOverlays(t, {});
    return;
  }
  const cm = composite.mat.uniforms;
  cm.uMix.value = 0; cm.uWipe.value = -1; cm.uSplit.value = 2; cm.uFade.value = 0;
  const ctx = {};
  let texA, texB;
  const needCity = t >= T.cityStart && t < T.dk2 + 0.8;
  const st = needCity ? cityState(t) : null;

  if (t < T.dkStart) {
    globeState(t);
    texA = renderGlobe();
  } else if (t < T.globeEnd) {
    globeState(t);
    denmarkState(t, 'in');
    texA = renderGlobe();
    texB = renderDk();
    cm.uMix.value = smooth(seg(t, T.dkStart, T.globeEnd));
  } else if (t < T.cityStart) {
    denmarkState(t, 'in');
    texA = renderDk();
  } else if (t < T.dkEnd) {
    denmarkState(t, 'in');
    texA = renderDk();
    texB = renderCity(cCompA, cCamA, cityCamA(t, st), 'clay', '2026');
    cm.uMix.value = smooth(seg(t, T.cityStart, T.dkEnd));
  } else if (t < T.wipe0) {
    texA = renderCity(cCompA, cCamA, cityCamA(t, st), 'clay', '2026');
  } else if (t < T.wipe1) {
    texA = renderCity(cCompA, cCamA, cityCamA(t, st), 'clay', '2026');
    const b = cityCamB(t);
    texB = renderCity(cCompB, cCamB, b, 'color', '2026');
    cm.uWipe.value = lerp(0.0, 1.2, easeInOutCubic(seg(t, T.wipe0, T.wipe1)));
    ctx.yaw = b.yaw;
  } else if (t < T.s9) {
    const b = cityCamB(t);
    ctx.yaw = b.yaw;
    if (t >= T.split0) {
      texA = renderCity(cCompA, cCamB, b, 'color', '2024');
      texB = renderCity(cCompB, cCamB, b, 'color', '2026');
      // split position is set by updateOverlays below
    } else {
      texA = renderCity(cCompB, cCamB, b, 'color', '2026');
    }
  } else if (t < T.s10) {
    // Map (clay, top-down) then the street photo opens inside the viewer.
    const mapCam = cityCamA(t, st);
    texA = renderCity(cCompA, cCamA, mapCam, 'clay', '2026');
    const k = smooth(seg(t, 51.3, 51.9));
    if (k > 0) {
      const b = cityCamB(T.s9 - 0.01);
      texB = renderCity(cCompB, cCamB, b, 'color', '2026');
      cm.uMix.value = k;
    }
  } else if (t < T.dk2) {
    const a = cityCamA(t, st);
    texA = renderCity(cCompA, cCamA, a, 'clay', '2026');
    const k = 1 - smooth(seg(t, T.s10 + 0.15, T.s10 + 0.65));
    if (k > 0) {
      texB = renderCity(cCompB, cCamB, cityCamB(T.s9 - 0.01), 'color', '2026');
      cm.uMix.value = k;
    }
  } else if (t < T.dk2 + 0.8) {
    texA = renderCity(cCompA, cCamA, cityCamA(t, st), 'clay', '2026');
    denmarkState(t, 'out');
    texB = renderDk();
    cm.uMix.value = smooth(seg(t, T.dk2, T.dk2 + 0.8));
  } else {
    denmarkState(t, 'out');
    texA = renderDk();
  }
  ctx.heading = ctx.yaw !== undefined ? Math.atan2(cCamB.getWorldDirection(new THREE.Vector3()).x, -cCamB.getWorldDirection(new THREE.Vector3()).z) : 0;
  updateOverlays(t, ctx);
  if (ctx.split < 1.5 && t >= T.split0 && t < T.s9) cm.uSplit.value = ctx.split;
  if (t >= T.wipe0 && t < T.wipe1) {
    // Wipe from the dot's screen position.
    const s = toScreen(Dt.clone().setY(0.6), cCamA);
    cm.uWipeC.value.set(clamp(s.x / W, 0.1, 0.9), clamp(1 - s.y / H, 0.1, 0.9));
  }
  cm.tA.value = texA;
  cm.tB.value = texB ?? texA;
  cm.uVignette.value = t > T.wipe0 && t < T.s9 ? 0.28 : 0.16;
  composite.render();
}

window.renderFrame = (t) => {
  frame(t);
  const gl = renderer.getContext();
  gl.finish();
  return true;
};
// Debug: render the city from an arbitrary camera (relative to a named anchor).
window.debugShot = (t, look, anchor, off, toff, fov = 35) => {
  const st = cityState(t);
  const base = anchor === 'rider' ? C.forest.rider.position.clone().add(C.forest.group.position)
    : anchor === 'car' ? C.ddg.position.clone() : anchor === 'house' ? HP.clone() : V(0, 0, 0);
  void st;
  const cs = { pos: base.clone().add(V(...off)), target: base.clone().add(V(...toff)), fov, focus: base, size: 30, ao: true };
  const tex = renderCity(cCompA, cCamA, cs, look, '2026');
  const cm = composite.mat.uniforms;
  cm.uMix.value = 0; cm.uWipe.value = -1; cm.uSplit.value = 2; cm.tA.value = tex; cm.tB.value = tex;
  composite.render();
  for (const id of ['caption', 'bug', 'permit', 'clock', 'hud', 'date', 'split', 'yrL', 'yrR', 'title', 'ui', 'end', 'co1', 'co2', 'co3', 'co4']) op(el[id], 0);
  el.leaders.innerHTML = '';
  renderer.getContext().finish();
};
window.DURATION = DURATION;
window.FPS = FPS;
window.ready = true;
document.title = 'ready';
