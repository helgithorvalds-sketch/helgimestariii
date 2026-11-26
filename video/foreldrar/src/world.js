// Renderer, scene, lights, ground and the camera director.
import * as THREE from 'three';
import { C } from './palette.js';
import { clamp, inOut, lerp } from './util.js';

export const W = 1920, H = 1080;

export function createWorld() {
  const q = new URLSearchParams(location.search);
  const scale = +(q.get('scale') || 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(Math.round(W * scale), Math.round(H * scale));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const bg = new THREE.Color(C.bg);
  scene.background = bg.clone();
  scene.fog = new THREE.Fog(bg.clone(), 40, 110);

  const hemi = new THREE.HemisphereLight('#ffffff', '#b8bcd6', 1.75); scene.add(hemi);
  const amb = new THREE.AmbientLight('#e9ebf7', 0.35); scene.add(amb);
  const sun = new THREE.DirectionalLight('#ffffff', 1.9);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.blurSamples = 12;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015;
  scene.add(sun); scene.add(sun.target);

  // Ground: unlit plane in the background colour (so the horizon melts away) + shadow catcher.
  const groundMat = new THREE.MeshBasicMaterial({ color: C.bg });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundMat); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; scene.add(ground);
  const shadowMat = new THREE.ShadowMaterial({ color: '#2b3170', opacity: 0.16 });
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), shadowMat); catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 400);
  const keys = [];
  const world = {
    THREE, renderer, scene, camera, sun, hemi, amb, ground, groundMat, catcher, shadowMat, keys, overlays: [],
    bgColor: new THREE.Color(C.bg),
    // Each scene adds camera keys {t, p:[x,y,z], l:[x,y,z], fov, ease}.
    addKeys(list) { keys.push(...list); keys.sort((a, b) => a.t - b.t); },
    setBg(color) { this.bgColor.set(color); },
    // Per-frame overrides scenes may set: camera override function, light offset.
    camOverride: null,
    reset() {
      this.bgColor.set(C.bg); this.camOverride = null; this.overlays.length = 0; this.shadowOpacity = 0.16; this.fogNear = 40; this.fogFar = 110;
      this.lightDir = [-0.45, 1, 0.55];
    },
    applyCamera(t) {
      let p, l, fov;
      if (this.camOverride) ({ p, l, fov } = this.camOverride(t));
      else ({ p, l, fov } = sampleKeys(keys, t));
      camera.position.set(p[0], p[1], p[2]); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(l[0], l[1], l[2]);
      // Shadow camera follows what the camera looks at.
      const dist = camera.position.distanceTo(new THREE.Vector3(...l));
      const r = Math.max(4, dist * Math.tan((fov * Math.PI) / 360) * 2.2);
      const d = new THREE.Vector3(...this.lightDir).normalize();
      sun.target.position.set(l[0], 0, l[2]);
      sun.position.set(l[0] + d.x * 40, d.y * 40, l[2] + d.z * 40);
      const sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 120; sc.updateProjectionMatrix();
      this.lookAt = l;
    },
    finishFrame() {
      scene.background.copy(this.bgColor); scene.fog.color.copy(this.bgColor); groundMat.color.copy(this.bgColor);
      scene.fog.near = this.fogNear; scene.fog.far = this.fogFar; shadowMat.opacity = this.shadowOpacity;
      // hemisphere ground colour drifts with the background (keeps pinks pink, blues blue)
      hemi.groundColor.set('#b8bcd6').lerp(this.bgColor, 0.35);
    },
  };
  return world;
}

export function sampleKeys(keys, t) {
  if (!keys.length) return { p: [0, 10, 20], l: [0, 0, 0], fov: 30 };
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (b.ease || inOut)(clamp((t - a.t) / (b.t - a.t || 1)));
      return { p: a.p.map((v, j) => lerp(v, b.p[j], k)), l: a.l.map((v, j) => lerp(v, b.l[j], k)), fov: lerp(a.fov, b.fov, k) };
    }
  }
  return keys[keys.length - 1];
}
