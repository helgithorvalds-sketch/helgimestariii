// Haukadalur as one three.js scene: sky, Icelandic grass, the pale geothermal ground, Geysir's silica mound and
// turquoise pool (bulging before the BÚMM), Strokkur, steaming vents, the rope fence, the GEYSIR sign, Bjarnarfell and
// the far hills, plus the cast (cast.ts). update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex, rng, cloudHD } from "../../shared/look/paint";
import { Pen } from "../../shared/look/toon";
import { LIGHTS, LOOK, LightPreset } from "../../shared/look/lights";
import { TONE, CHAR, untone } from "../../shared/look/shade";
import { NOINK } from "../../shared/look/ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { fxSignFace } from "../../shared/look/fx";
import { FPS, SHOTS, ShotDef, camAt, POOL_R, MOUND_R, POOL_Y, RIM_Y, STROKKUR, FENCE_R, SIGN, domeAt, boilAt } from "./story";

// ---------------- painted textures ----------------
const blotch = (g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, a: number) => {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
};
/** Icelandic summer grass: olive-yellow green with moss blotches and tufts */
const mossHD = () => ctex("mossHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#86a947"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 40; i++) blotch(g, r() * 1024, r() * 1024, 90 + r() * 220, r() > 0.5 ? "164,182,82" : "98,132,52", 0.35);
  for (let i = 0; i < 18; i++) blotch(g, r() * 1024, r() * 1024, 40 + r() * 90, "150,120,70", 0.25);
  g.lineWidth = 2; g.lineCap = "round";
  for (let i = 0; i < 1600; i++) {
    const x = r() * 1024, y = r() * 1024, h = 6 + r() * 10, l = r() < 0.4;
    g.strokeStyle = l ? "rgba(196,214,110,0.35)" : "rgba(70,104,36,0.4)";
    g.beginPath(); g.moveTo(x - 3, y - h); g.lineTo(x, y); g.lineTo(x + 3, y - h * 0.8); g.stroke();
  }
  for (let i = 0; i < 26; i++) { g.fillStyle = r() > 0.5 ? "#f4f0e2" : "#c9a9e8"; g.beginPath(); g.arc(r() * 1024, r() * 1024, 3, 0, Math.PI * 2); g.fill(); }
});
/** geothermal ground: pale grey-beige clay with rust and ochre streaks, a few cracks */
const geoHD = () => ctex("geoHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#d9d0bd"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 30; i++) blotch(g, r() * 1024, r() * 1024, 80 + r() * 200, ["205,150,80", "190,110,70", "235,225,205", "160,150,135"][i % 4], 0.35);
  g.strokeStyle = "rgba(120,90,60,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { let x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
});
/** silica sinter of the mounds: whitish grey with faint growth rings */
const sinterHD = () => ctex("sinterHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#e4e0d6"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) blotch(g, r() * 1024, r() * 1024, 60 + r() * 160, r() > 0.6 ? "196,170,130" : "205,205,200", 0.4);
  g.strokeStyle = "rgba(150,140,125,0.25)"; g.lineWidth = 4;
  for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(0, i * 57 + r() * 20); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, i * 57 + 10 * Math.sin(x * 0.02 + i)); g.stroke(); }
});
/** the pool seen from above: deep blue vent, turquoise water, pale rim */
const poolTex = (key: string, deep: string, mid: string, edge: string) => ctex(key, 512, 512, (g, r) => {
  const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, deep); gr.addColorStop(0.28, deep); gr.addColorStop(0.55, mid); gr.addColorStop(0.9, edge); gr.addColorStop(1, "#e8fbf8");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = 90 + r() * 140; g.beginPath(); g.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 14 + r() * 20, 0.2, 2.4); g.stroke(); }
});
const gravelHD = () => ctex("gravelHD", 512, 512, (g, r) => {
  g.fillStyle = "#a59c8d"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = ["#8f8678", "#bdb4a5", "#7d7468", "#c9c1b3"][i % 4]; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 4, 2 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill(); }
});
const steamFx = () => ctex("bgSteam", 256, 256, (g) => blotch(g, 128, 128, 120, "255,255,255", 0.8));

// ---------------- geometry helpers ----------------
/** a disc of rings x segs on the xz plane (y = 0), uv = planar 0..1 */
const polarDisc = (R: number, rings = 12, segs = 64) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  pos.push(0, 0, 0); uv.push(0.5, 0.5);
  for (let i = 1; i <= rings; i++) for (let j = 0; j < segs; j++) {
    const rr = (R * i) / rings, a = (j / segs) * Math.PI * 2;
    pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); uv.push(0.5 + (Math.cos(a) * rr) / (2 * R), 0.5 + (Math.sin(a) * rr) / (2 * R));
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 1; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = 1 + (i - 1) * segs + j, b = 1 + (i - 1) * segs + ((j + 1) % segs), c = 1 + i * segs + j, d = 1 + i * segs + ((j + 1) % segs);
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** sinter mound: a lathe from the ground (r = R) up to the rim, then a lip falling into the bowl */
const mound = (R: number, rimR: number, rimY: number, bowlY: number) => {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) { const u = i / n, rr = R - (R - rimR) * u; pts.push(new THREE.Vector2(rr, rimY * (1 - (1 - u) ** 2.2))); }
  pts.push(new THREE.Vector2(rimR - 0.12, rimY + 0.06), new THREE.Vector2(rimR - 0.3, rimY), new THREE.Vector2(rimR - 0.45, bowlY));
  return new THREE.LatheGeometry(pts.reverse(), 72);
};
/** smooth rounded hill (ellipsoidal cap) */
const hill = (rx: number, rz: number, h: number) => {
  const g = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(rx, h, rz);
  return g;
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 60, 700);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private water: THREE.Mesh; private waterBase: Float32Array;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor() {
    const R = this.root;
    // ---- sky + light (as the template) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 640 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 150 + (i % 4) * 34;
      m.position.set(Math.cos(a) * d, 130 + (i % 4) * 40, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    // ---- ground ----
    const b = new Batch();
    const moss = lam("mossHD", () => ({ map: rep2(mossHD(), 1) }));
    const geo = lam("geoHD", () => ({ map: rep2(geoHD(), 1) }));
    const sinter = lam("sinterHD", () => ({ map: rep2(sinterHD(), 1) }));
    const gravel = lam("gravelHD", () => ({ map: rep2(gravelHD(), 1) }));
    const wood = lam("woodPost", () => ({ color: "#8a5a36" }));
    const rope = lam("rope", () => ({ color: "#d9c79a" }));
    const rock = lam("rock", () => ({ color: "#6f6a66" }));
    const shrub = lam("shrub", () => ({ color: "#4f7d34" }));
    const ground = new THREE.PlaneGeometry(1800, 1800, 1, 1); ground.rotateX(-Math.PI / 2);
    const uv = ground.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 300, uv.getY(i) * 300);
    b.add(ground, moss);
    // the geothermal field (irregular blobs of pale clay) around both springs, a hair above the grass
    const field = (cx: number, cz: number, rr: number, seed: number) => {
      const r = rng(seed), segs = 48, pos: number[] = [cx, 0.012, cz], uvs: number[] = [cx / 6, cz / 6], idx: number[] = [];
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2, k = rr * (0.8 + 0.35 * r());
        pos.push(cx + Math.cos(a) * k, 0.012, cz + Math.sin(a) * k); uvs.push((cx + Math.cos(a) * k) / 6, (cz + Math.sin(a) * k) / 6);
      }
      for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx); g.computeVertexNormals();
      b.add(g, geo);
    };
    field(0, 0, 19, 5); field(STROKKUR[0], STROKKUR[2], 11, 9); field(-12, -14, 9, 13); field(10, -8, 7, 17);
    // sinter mounds + bowls
    const gm = mound(MOUND_R, POOL_R + 0.45, RIM_Y, POOL_Y - 0.7);
    gm.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= 4; });
    b.add(gm, sinter);
    const sm = mound(5.5, 1.75, 0.45, -0.4);
    b.add(sm, sinter, new THREE.Matrix4().makeTranslation(...STROKKUR));
    // gravel path from the south to the rope, and a ring path outside it
    const path = new THREE.PlaneGeometry(2.8, 60); path.rotateX(-Math.PI / 2);
    { const pu = path.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < pu.count; i++) pu.setXY(i, pu.getX(i) * 1.4, pu.getY(i) * 30); }
    b.add(path, gravel, new THREE.Matrix4().makeTranslation(0, 0.02, FENCE_R + 30.5));
    const ringP = new THREE.RingGeometry(FENCE_R + 0.4, FENCE_R + 2.6, 96); ringP.rotateX(-Math.PI / 2);
    { const ru = ringP.attributes.uv as THREE.BufferAttribute, rp = ringP.attributes.position as THREE.BufferAttribute; for (let i = 0; i < ru.count; i++) ru.setXY(i, rp.getX(i) / 2, rp.getZ(i) / 2); }
    b.add(ringP, gravel, new THREE.Matrix4().makeTranslation(0, 0.018, 0));
    // rope fence: posts on a circle, ropes sagging between them
    const N = 40;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, x = Math.cos(a) * FENCE_R, z = Math.sin(a) * FENCE_R;
      b.add(boxGeo(V(x - 0.05, 0, z - 0.05), V(x + 0.05, 0.95, z + 0.05)), wood);
      const a2 = ((k + 1) / N) * Math.PI * 2, x2 = Math.cos(a2) * FENCE_R, z2 = Math.sin(a2) * FENCE_R;
      for (let s = 0; s < 4; s++) {
        const u0 = s / 4, u1 = (s + 1) / 4, sag = (u: number) => 0.86 - 0.12 * 4 * u * (1 - u);
        const p0 = V(x + (x2 - x) * u0, sag(u0), z + (z2 - z) * u0), p1 = V(x + (x2 - x) * u1, sag(u1), z + (z2 - z) * u1);
        const seg = new THREE.CylinderGeometry(0.018, 0.018, p0.distanceTo(p1), 5);
        const m = new THREE.Matrix4().compose(p0.clone().add(p1).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize()), V(1, 1, 1));
        b.add(seg, rope, m);
      }
    }
    // the GEYSIR sign: two posts + plank (the painted face is its own unlit card)
    for (const s of [-1, 1]) b.add(boxGeo(V(SIGN[0] + s * 0.75 - 0.06, 0, SIGN[2] - 0.06), V(SIGN[0] + s * 0.75 + 0.06, 1.75, SIGN[2] + 0.06)), wood);
    b.add(boxGeo(V(SIGN[0] - 1.0, 1.0, SIGN[2] - 0.05), V(SIGN[0] + 1.0, 1.85, SIGN[2] + 0.03)), wood);
    // hills: Bjarnarfell behind (north), rolling hills around, far blue ridges
    const hillM = lam("hillMoss", () => ({ map: rep2(mossHD(), 1), color: "#a8b08a" }));
    b.add(hill(230, 150, 190), hillM, new THREE.Matrix4().makeTranslation(-40, -20, -420));
    for (const [x, z, rx, rz, h] of [[260, -120, 160, 120, 70], [-280, -60, 180, 140, 85], [120, 260, 150, 110, 45], [-200, 300, 170, 120, 60], [380, 200, 200, 150, 90], [-420, -280, 220, 160, 120], [40, -300, 120, 80, 55]] as const)
      b.add(hill(rx, rz, h), hillM, new THREE.Matrix4().makeTranslation(x, -4, z));
    // rocks + low birch scrub on the grass
    const r = rng(77);
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, d = 24 + r() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 3 && z > 10) continue;
      const s = 0.5 + r() * 1.4;
      if (i % 3 === 0) { const g = new THREE.DodecahedronGeometry(s * 0.6, 0); g.scale(1, 0.6, 1); b.add(g, rock, new THREE.Matrix4().makeTranslation(x, s * 0.15, z)); }
      else { const g = new THREE.SphereGeometry(s, 10, 8); g.scale(1.3, 0.7, 1.1); b.add(g, shrub, new THREE.Matrix4().makeTranslation(x, s * 0.4, z)); }
    }
    b.build(R);
    // sign face (unlit, readable in any light)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), new THREE.MeshBasicMaterial({ map: ctex("geysirSign", 700, 300, (g) => fxSignFace(new Pen(g))), color: 0xe9e9e9 }));
    face.position.set(SIGN[0], 1.425, SIGN[2] + 0.04); face.layers.set(NOINK); R.add(face);
    // ---- the pools ----
    const pt = poolTex("poolG", "#0b4f86", "#139ac6", "#7ad6e0");
    const wg = polarDisc(POOL_R, 14, 72);
    this.water = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ map: pt, color: new THREE.Color(0.92, 0.95, 0.98) }));
    this.water.position.set(0, POOL_Y, 0); this.water.layers.set(NOINK); R.add(this.water);
    this.waterBase = (wg.attributes.position.array as Float32Array).slice();
    const sw = new THREE.Mesh(polarDisc(1.4, 6, 48), new THREE.MeshBasicMaterial({ map: poolTex("poolS", "#0a4a7c", "#1597c3", "#86dbe2"), color: new THREE.Color(0.92, 0.95, 0.98) }));
    sw.position.set(STROKKUR[0], 0.34, STROKKUR[2]); sw.layers.set(NOINK); R.add(sw);
    // distant steam plumes over the field (soft, static)
    const st = steamFx();
    for (const [x, z, s] of [[-60, -90, 30], [70, -140, 40], [-130, 40, 26]] as const) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0.55 }));
      m.position.set(x, s * 0.6, z); m.scale.set(s, s * 1.4, 1); m.layers.set(NOINK); R.add(m);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = 60; this.fog.far = s.light === "golden" ? 600 : 750;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light === "golden" ? "golden" : "day"][i % 4]; // Geysir paints day and golden only
    }
    // ---- the pool: dome bulge before the BÚMM + boiling wobble ----
    const dome = domeAt(t), boil = boilAt(t), P = this.water.geometry.attributes.position as THREE.BufferAttribute, B = this.waterBase;
    for (let i = 0; i < P.count; i++) {
      const x = B[i * 3], z = B[i * 3 + 2], rr = Math.hypot(x, z) / POOL_R;
      const y = dome * Math.max(0, 1 - rr * rr) ** 1.5 + 0.06 * boil * Math.sin(x * 3.1 + t * 11) * Math.sin(z * 2.7 - t * 9) * (1 - rr);
      P.setY(i, y);
    }
    P.needsUpdate = true;
    // ---- cast + effects (as the template) ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, f, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}

function rep2(t: THREE.Texture, k: number) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(k, k); t.anisotropy = 16; t.needsUpdate = true; return t; }
