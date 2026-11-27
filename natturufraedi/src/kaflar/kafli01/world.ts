// Heimaey as one three.js scene: sky (stars and moon at night), the sea, the island with the town of bárujárnshús, the
// harbour and its boats, Heimaklettur, Helgafell, Eldfell (1973 cone or today's), the fissure, the lava lobe, and Amma's
// living room. update(id, f, cam, scene) poses everything for shot `id` at frame f (the Geysir World contract): which
// era and props are visible, the light rig (camera-relative sun / moon, or the orange key from the fire in the
// eruption), the two-tone and card uniforms, then the cast and effect cards.
import * as THREE from "three";
import { V } from "../../shared/kit/batch";
import { setWindowGlow } from "../../shared/kit/houses";
import { Fleet } from "../../shared/kit/boats";
import { cloudHD } from "../../shared/look/paint";
import { LIGHTS, LOOK, Light, LightPreset } from "../../shared/look/lights";
import { TONE, CHAR, untone } from "../../shared/look/shade";
import { CARD_K } from "../../shared/look/cardshade";
import { NOINK } from "../../shared/look/ink";
import { Cards, CamInfo } from "../../shared/cast/cards";
import { FPS, SHOTS, ShotDef, camAt, stateAt, LAND_Y, ELDFELL, FISSURE, LAVA_STOP, Scene, V3, hoseCrew } from "./story";
import { buildIsland, buildTown, buildHarbour, buildMountains, buildEldfell1973, buildEldfellToday, buildFissure, buildStofa, buildSea,
  LavaLobe, lavaMat, lavaTodayMat, GROUND_MAPS, COOL_SPOTS } from "./build";
import { stage, poseFleet, boatsAt, N_BOATS } from "./cast";

/** the sea's on-screen colour per light */
const SEA: Record<Light, string> = { day: "#3a78b4", golden: "#3d5f8c", night: "#1b2d58", eruption: "#1f2550" };
/** fog distances per light (the island is ~1.5 km across) */
const FOG: Record<Light, [number, number]> = { day: [180, 2200], golden: [150, 1700], night: [220, 1500], eruption: [240, 1700] };
/** linear multiply colour of the contact blobs per light */
const CONTACT: Record<Light, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.35, 0.38, 0.55], eruption: [0.34, 0.33, 0.5] };

export class World {
  root = new THREE.Group();
  private island = new THREE.Group();
  private era1973 = new THREE.Group();
  private ash = new THREE.Group();
  private stofa: THREE.Group;
  private ground: THREE.Mesh;
  private sea: THREE.Mesh;
  private eld73: THREE.Group; private eldNow: THREE.Mesh; private fissureG: THREE.Group;
  private lava: LavaLobe;
  // boat 3 (the hofn close-up) gets a teal hull: it stays teal under the eruption's blue shade
  private fleet = new Fleet(N_BOATS, ["#2f5d8f", "#3f7a4e", "#f2eee4", "#2f8a86", "#b8402e", "#2a2a30"]);
  private cards: Cards;
  private hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.5);
  private sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private stars: THREE.Points;
  private fog = new THREE.Fog("#bccbec", 150, 2000);
  private clouds: THREE.Mesh[] = [];
  private cloudMaps = new Map<Light, THREE.Texture[]>();
  private sunCache = new Map<number, THREE.Vector3>();

  constructor() {
    const R = this.root;
    // ---- sky (5 stops by elevation), stars ----
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
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3500, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    const sp: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
      const az = (a - Math.floor(a)) * Math.PI * 2, el = Math.asin(0.12 + 0.88 * (b - Math.floor(b)));
      sp.push(Math.cos(el) * Math.cos(az) * 3000, Math.sin(el) * 3000, Math.cos(el) * Math.sin(az) * 3000);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(1.1, 1.1, 1.25), size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false; this.stars.layers.set(NOINK); this.stars.renderOrder = -0.5;
    R.add(this.stars);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.4, d = 2400 + (i % 3) * 200;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.1, 1.1, 1.1) }));
      const w = 520 + (i % 4) * 120;
      m.position.set(200 + Math.cos(a) * d, 380 + (i % 4) * 110, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    // ---- the island (everything outdoors) ----
    this.sea = buildSea(this.island);
    this.ground = buildIsland(this.island);
    buildTown(this.island, this.ash);
    buildHarbour(this.island);
    buildMountains(this.island);
    this.eldNow = buildEldfellToday(this.island);
    this.eld73 = buildEldfell1973(this.era1973);
    this.fissureG = buildFissure(this.era1973);
    this.lava = new LavaLobe(this.island);
    this.island.add(this.era1973, this.ash, this.fleet.group);
    R.add(this.island);
    this.stofa = buildStofa(R);
    this.cards = new Cards(R);
  }

  private cloudsFor(l: Light) {
    let m = this.cloudMaps.get(l);
    if (!m) { m = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK[l].cloud)); this.cloudMaps.set(l, m); }
    return m;
  }
  /** day / golden / night: the key is camera-relative and frozen per shot (as in the Geysir short) */
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
  /** eruption: the key comes from the fire (Eldfell's vent once the cone stands, else the fissure point level with the
   *  look target), raised to the fountains' middle */
  private fireDir(focus: THREE.Vector3, cone: number, fis: number, from?: V3) {
    if (from) return V(...from).sub(focus).normalize();
    const z = cone > 0.3 ? ELDFELL[2] : Math.max(FISSURE.z0, Math.min(FISSURE.z1, focus.z));
    const src = V(FISSURE.x, LAND_Y + Math.max(60, fis * 1.2) + (cone > 0.3 ? 60 : 0), z);
    return src.sub(focus).normalize();
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light], K = LOOK[s.light], st = stateAt(id, f);
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.scene === "stofa" ? 0.1 : 0.5; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- what is on stage ----
    const indoors = s.scene === "stofa";
    this.island.visible = !indoors; this.stofa.visible = indoors;
    this.era1973.visible = !st.today;
    this.fissureG.visible = !st.today && st.open;
    this.eld73.visible = !st.today && st.cone > 0.01;
    this.eld73.scale.set(0.4 + 0.6 * st.cone, 0.15 + 0.85 * st.cone, 0.4 + 0.6 * st.cone);
    this.eldNow.visible = st.today;
    this.ash.visible = !st.today && st.ash > 0.05;
    const gm = this.ground.material as THREE.MeshLambertMaterial, gmap = !st.today && st.ash > 0.5 ? GROUND_MAPS.ash() : GROUND_MAPS.grass();
    if (gm.map !== gmap) { gm.map = gmap; gm.needsUpdate = true; }
    const lit = s.light === "night" || s.light === "eruption";
    setWindowGlow(lit ? 1.6 : 0);
    if (st.D !== null) {
      this.lava.set(st.D); this.lava.mesh.visible = true; this.lava.mesh.material = lavaMat();
      lavaMat().emissiveIntensity = 1 - 0.8 * st.cool;
      // where the hoses hit, the crust cools to grey-black (storknun): the hose crew's impact points, ~5 m across
      const hits = s.scene === "slongur" ? hoseCrew(st.D).map((m) => m.hit) : [];
      COOL_SPOTS.value.forEach((v, i) => (hits[i] ? v.set(hits[i][0], hits[i][1], hits[i][2], 8) : v.set(0, 0, 0, 0)));
    } else if (s.scene === "idag") {
      this.lava.set(LAVA_STOP); this.lava.mesh.visible = true; this.lava.mesh.material = lavaTodayMat();
    } else this.lava.mesh.visible = false;
    poseFleet(this.fleet, s.scene, t);
    // ---- light rig ----
    const sunDir = s.light === "eruption" ? this.fireDir(focus, st.cone, Math.max(st.fis, 40), s.keyFrom) : this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = indoors ? 7 : THREE.MathUtils.clamp(dist * 1.1 + 10, 14, 320);
    this.sun.position.copy(focus).addScaledVector(sunDir, 900); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 400; sc.far = 1500; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    CARD_K.uGain.value = L.charGain ?? 1.03;
    // ---- sky, stars, fog, sea, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position); this.stars.position.copy(cam.position);
    this.stars.visible = lit && !indoors;
    untone(L.fog, this.fog.color); [this.fog.near, this.fog.far] = FOG[s.light];
    scene.fog = this.fog; scene.background = null;
    untone(SEA[s.light], (this.sea.material as THREE.MeshBasicMaterial).color);
    const cm = this.cloudsFor(s.light);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      if (mat.map !== cm[i % 4]) { mat.map = cm[i % 4]; mat.needsUpdate = true; }
      m.visible = !indoors && s.light !== "eruption"; // the eruption sky belongs to the ash plume
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0), up = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 1);
    const info: CamInfo = { pos: cam.position, right, sun: sunDir };
    const st2 = stage(s, id, f, info, up, CONTACT[s.light], boatsAt(s.scene as Scene, t), cam.fov);
    this.cards.render(st2, cam, L.actorShadow);
    return focus;
  }
}
