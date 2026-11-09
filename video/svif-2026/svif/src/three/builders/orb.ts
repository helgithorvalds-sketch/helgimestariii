import * as THREE from "three";
import { canvasTex } from "../textures";

/**
 * The SVIF system as an object (business story, step 03): a pearl of light inside a thin glass
 * shell, hovering over the district, and the hairline arcs it sends down to newly registered
 * companies. Premium, not science fiction: no rings, no neon, no particles. References read before
 * designing: Siri's orb (a soft layered glow, colours shifting slowly inside a glassy ball), the
 * Apple Intelligence glow (warm, soft-edged, never saturated) and pearlescent spheres (a bright
 * cream centre, a deeper rim, a faint colour shift at grazing angles).
 *
 *   Shell  MeshPhysicalMaterial: transmission (the district refracts through it), clearcoat, a touch
 *          of iridescence, warm attenuation. `lite` (phones) has no shell: the transmission pass
 *          renders the whole scene again, so the pearl stands alone there.
 *   Core   an opaque sphere with its own shader (opaque, so the shell's transmission pass sees it):
 *          cream at the centre, the brand rose towards the rim, three soft lobes of light drifting
 *          slowly with the story's progress. It lights when the orb arrives (grows inside the glass
 *          as the glass fades in), so nothing is ever half transparent in the wrong place.
 *   Pool   a soft rose disc on the ground under the orb (its light), placed by the story.
 *
 * Arcs are thin tubes along a cubic curve, drawn progressively from the orb to the roof, with one
 * bead of light that can travel along them. Everything is a pure function of the values set.
 */
export interface Orb {
  group: THREE.Group;
  radius: number;
  /** 0 = gone … 1 = there: the glass fades in while the light inside grows to size */
  setFade(a: number): void;
  /** the living inner light drifts with this (the story's global progress) */
  setLife(t: number): void;
  /** the pool of light on the ground under the orb (position it on the ground) */
  pool: THREE.Mesh;
  /** 0..1 strength of the pool */
  setPool(a: number): void;
  /** the point on the shell's underside facing a target, in the orb's local space */
  surfacePoint(target: THREE.Vector3, out: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

export interface OrbOptions {
  radius?: number;
  /** no glass shell (no transmission pass) */
  lite?: boolean;
  /** look tuning (the lab's ?orb=… reads these; the defaults are the designed look) */
  tune?: OrbTuning;
}

export interface OrbTuning {
  /** how much of the room the glass reflects (envMapIntensity) */
  env?: number;
  clearcoat?: number;
  roughness?: number;
  thickness?: number;
  iridescence?: number;
  /** HDR multiplier of the light inside (> 1 glows after tone mapping) */
  glow?: number;
  /** how far the light reaches towards the rim (fresnel power; lower = brighter edge) */
  rim?: number;
  /** size of the pearl inside the glass, as a fraction of the shell radius */
  core?: number;
  /** strength of the rose clouds inside (1 = designed) */
  cloud?: number;
  /** false: no glass shell on desktop either (the pearl is the surface) */
  glass?: boolean;
}

const lin = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();

/* ------------------------------------------------------------------ the pearl's shader */

const CORE_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vP = normalize(position);
  gl_Position = projectionMatrix * mv;
}`;

const CORE_FRAG = /* glsl */ `
uniform vec3 uCream;
uniform vec3 uSand;
uniform vec3 uRose;
uniform vec3 uPeach;
uniform vec3 uDeep;
uniform vec3 uLight;
uniform float uTime;
uniform float uGlow;
uniform float uRim;
uniform float uCloud;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float nv = max(dot(normalize(vN), normalize(vV)), 0.0);
  float rim = pow(1.0 - nv, uRim);
  // three soft clouds of rose light wandering slowly through the pearl (object space, so they
  // turn with it); the story advances uTime with its progress, so they drift as you scroll
  float t = uTime;
  vec3 d0 = normalize(vec3(sin(t * 1.9), 0.45 + 0.3 * cos(t * 1.3), cos(t * 1.9)));
  vec3 d1 = normalize(vec3(cos(t * 1.4 + 2.1), 0.0 + 0.45 * sin(t * 1.1 + 0.7), sin(t * 1.4 + 2.1)));
  vec3 d2 = normalize(vec3(sin(t * 1.1 + 4.2), -0.4 + 0.3 * cos(t * 0.9 + 1.9), cos(t * 1.1 + 4.2)));
  float c0 = smoothstep(0.05, 1.0, dot(vP, d0));
  float c1 = smoothstep(0.2, 1.0, dot(vP, d1));
  float c2 = smoothstep(0.3, 1.0, dot(vP, d2));
  // the pearl: a bright heart, warm sand towards the rim
  vec3 col = mix(uCream * uGlow, uSand, smoothstep(0.1, 1.0, rim));
  // the light inside: rose and peach clouds, one deeper
  col = mix(col, uRose * uGlow, clamp(c0 * 0.6 * uCloud, 0.0, 0.9));
  col = mix(col, uPeach * uGlow, clamp(c1 * 0.5 * uCloud, 0.0, 0.85));
  col = mix(col, uDeep, clamp(c2 * 0.3 * uCloud, 0.0, 0.5));
  // the heart stays luminous where we look straight into it
  col = mix(col, uLight * uGlow, pow(nv, 5.0) * 0.45);
  // and the rim deepens, as a pearl's does
  col = mix(col, uDeep, smoothstep(0.6, 1.0, rim) * 0.7);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createOrb(o: OrbOptions = {}): Orb {
  const R = o.radius ?? 0.95;
  const lite = !!o.lite;
  const t = o.tune ?? {};
  const glassOn = !lite && t.glass !== false;
  const group = new THREE.Group();
  group.name = "orb";

  // the pearl (the light): opaque, so a transmission pass refracts it like anything else behind glass
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uCream: { value: lin("#fff1df") },
      uSand: { value: lin("#d9bfa9") },
      uRose: { value: lin("#c98f72") },
      uPeach: { value: lin("#e9bca3") },
      uDeep: { value: lin("#8a6350") },
      uLight: { value: lin("#fffaf3") },
      uTime: { value: 0 },
      uGlow: { value: t.glow ?? 1.45 },
      uRim: { value: t.rim ?? 1.05 },
      uCloud: { value: t.cloud ?? 1.5 },
    },
    vertexShader: CORE_VERT,
    fragmentShader: CORE_FRAG,
  });
  coreMat.toneMapped = true;
  const coreR = glassOn ? R * (t.core ?? 0.72) : R * 0.92;
  const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 48, 32), coreMat);
  core.castShadow = false;
  group.add(core);

  // the glass: a thin pearlescent shell
  let shell: THREE.Mesh | null = null;
  let shellMat: THREE.MeshPhysicalMaterial | null = null;
  if (glassOn) {
    shellMat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: t.roughness ?? 0.1,
      transmission: 1,
      // a thin shell: the pearl shows at its true size inside a clear margin (a thick one would
      // magnify it like a marble and hide the glass)
      thickness: t.thickness ?? 0.16,
      ior: 1.48,
      attenuationColor: new THREE.Color("#f7ebe2"),
      attenuationDistance: 3.5,
      clearcoat: t.clearcoat ?? 0.8,
      clearcoatRoughness: 0.12,
      iridescence: t.iridescence ?? 0.4,
      iridescenceIOR: 1.33,
      iridescenceThicknessRange: [140, 400],
      specularIntensity: 1,
      envMapIntensity: t.env ?? 0.38,
      transparent: true,
      opacity: 1,
    });
    shell = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 48), shellMat);
    shell.castShadow = false;
    shell.renderOrder = 5;
    group.add(shell);
  } else {
    // phones: the pearl itself is the surface, with a soft satin sheen from the environment
    const pearl = new THREE.MeshPhysicalMaterial({
      color: "#f7ebe0",
      roughness: 0.3,
      metalness: 0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.25,
      iridescence: 0.35,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 360],
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    shell = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 40), pearl);
    shell.renderOrder = 5;
    shellMat = pearl;
    group.add(shell);
  }

  // the pool of light on the ground (the story positions it)
  const poolTex = canvasTex(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, "rgba(190,140,112,0.6)");
    r.addColorStop(0.35, "rgba(190,140,112,0.3)");
    r.addColorStop(0.7, "rgba(190,140,112,0.08)");
    r.addColorStop(1, "rgba(190,140,112,0)");
    c.fillStyle = r;
    c.fillRect(0, 0, w, h);
  });
  const poolGeo = new THREE.PlaneGeometry(R * 5.2, R * 5.2);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.renderOrder = -1;
  pool.visible = false;

  let fade = 1;
  const api: Orb = {
    group,
    radius: R,
    pool,
    setFade(a) {
      const v = Math.min(1, Math.max(0, a));
      if (v === fade) return;
      fade = v;
      group.visible = v > 0.003;
      // the glass comes in as a fade; the light inside grows to size (an opaque core cannot fade)
      if (shellMat) shellMat.opacity = glassOn ? v : 0.42 * v;
      const k = 1 - Math.pow(1 - v, 3);
      core.scale.setScalar(Math.max(0.001, k));
      core.visible = k > 0.02;
    },
    setLife(t) {
      coreMat.uniforms.uTime.value = t;
    },
    setPool(a) {
      poolMat.opacity = Math.min(1, Math.max(0, a));
      pool.visible = poolMat.opacity > 0.003;
    },
    surfacePoint(target, out) {
      // local: the direction from the orb's centre to the target, on the shell, a little below centre
      out.copy(target).sub(group.position).normalize();
      if (out.y > -0.25) out.y = -0.25;
      return out.normalize().multiplyScalar(R * 0.985);
    },
    dispose() {
      core.geometry.dispose();
      coreMat.dispose();
      shell?.geometry.dispose();
      shellMat?.dispose();
      poolGeo.dispose();
      poolMat.dispose();
      poolTex.dispose();
    },
  };
  return api;
}

/* ------------------------------------------------------------------ arcs */

export interface Arc {
  group: THREE.Group;
  /** 0..1: how far the line has drawn from the orb towards the roof */
  setDraw(p: number): void;
  /** position of the light bead along the drawn line (0 = orb, 1 = roof); < 0 or > 1 hides it */
  setPulse(p: number): void;
  /** 0..1 opacity of the whole arc */
  setFade(a: number): void;
  /** the end point (world) */
  end: THREE.Vector3;
  dispose(): void;
}

export interface ArcOptions {
  radius?: number;
  color?: string;
  segments?: number;
}

let pulseTex: THREE.Texture | null = null;
function pulseTexture() {
  if (pulseTex) return pulseTex;
  pulseTex = canvasTex(128, 128, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, "rgba(255,246,234,1)");
    r.addColorStop(0.18, "rgba(255,238,222,0.85)");
    r.addColorStop(0.45, "rgba(222,176,150,0.28)");
    r.addColorStop(1, "rgba(222,176,150,0)");
    c.fillStyle = r;
    c.fillRect(0, 0, w, h);
  });
  return pulseTex;
}

/**
 * A hairline from the orb's underside to a roof: out and slightly up first, then down onto the
 * building from above (a cubic curve), as a thread laid from a hovering lamp would hang.
 */
export function createArc(from: THREE.Vector3, to: THREE.Vector3, o: ArcOptions = {}): Arc {
  const group = new THREE.Group();
  group.name = "arc";
  const dist = from.distanceTo(to);
  const horiz = new THREE.Vector3(to.x - from.x, 0, to.z - from.z);
  const hl = horiz.length();
  if (hl > 1e-4) horiz.divideScalar(hl);
  const p1 = from.clone().addScaledVector(horiz, Math.min(0.42 * dist, hl * 0.55)).add(new THREE.Vector3(0, -0.02 * dist, 0));
  const p2 = to.clone().add(new THREE.Vector3(0, Math.max(0.45, 0.4 * dist), 0)).addScaledVector(horiz, -Math.min(0.08 * dist, hl * 0.12));
  const curve = new THREE.CubicBezierCurve3(from.clone(), p1, p2, to.clone());
  const tubular = o.segments ?? 56;
  const radial = 6;
  const geo = new THREE.TubeGeometry(curve, tubular, o.radius ?? 0.011, radial, false);
  const mat = new THREE.MeshBasicMaterial({ color: o.color ?? "#8f7664", transparent: true, opacity: 1, toneMapped: false });
  const tube = new THREE.Mesh(geo, mat);
  tube.frustumCulled = false;
  tube.renderOrder = 4;
  geo.setDrawRange(0, 0);
  tube.visible = false;
  group.add(tube);

  // the bead of light: a bright core and a soft halo sprite around it
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff4e6", toneMapped: false, transparent: true }));
  bead.visible = false;
  bead.renderOrder = 6;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTexture(), transparent: true, depthWrite: false, opacity: 0.9, toneMapped: false }));
  halo.scale.setScalar(0.5);
  halo.visible = false;
  halo.renderOrder = 6;
  group.add(bead, halo);

  // arc-length samples for an even travel of the bead
  const pts = curve.getSpacedPoints(120);
  let fade = 1;
  let draw = 0;
  const api: Arc = {
    group,
    end: to.clone(),
    setDraw(p) {
      draw = Math.min(1, Math.max(0, p));
      const n = Math.round(draw * tubular);
      geo.setDrawRange(0, n * radial * 6);
      tube.visible = n > 0 && fade > 0.003;
    },
    setPulse(p) {
      const on = p >= 0 && p <= 1 && fade > 0.003;
      bead.visible = halo.visible = on;
      if (!on) return;
      const k = Math.min(1, Math.max(0, p)) * (pts.length - 1);
      const i = Math.floor(k);
      const f = k - i;
      const a = pts[i];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      bead.position.lerpVectors(a, b, f);
      halo.position.copy(bead.position);
      // the bead is brightest mid-way, softer as it leaves and arrives
      const s = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
      halo.scale.setScalar(0.3 + 0.32 * s);
      (halo.material as THREE.SpriteMaterial).opacity = 0.9 * fade * s;
      (bead.material as THREE.MeshBasicMaterial).opacity = fade;
    },
    setFade(a) {
      fade = Math.min(1, Math.max(0, a));
      mat.opacity = fade;
      tube.visible = draw > 0 && fade > 0.003;
      if (fade <= 0.003) bead.visible = halo.visible = false;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      bead.geometry.dispose();
      (bead.material as THREE.Material).dispose();
      (halo.material as THREE.Material).dispose();
    },
  };
  return api;
}
