// LAST LIGHT — real-time short. Everything is a pure function of time `T`
// so the same code drives the interactive player and the frame-exact video render.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { makeKeeper, makeLighthouse, makeBoat } from './procedural.js';

export const DURATION = 48;
export const FPS = 24;

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

// ---------------------------------------------------------------- story curves
export const story = {
  storm: t => 1 - 0.85 * sstep(36, 45, t),
  aurora: t => sstep(37.5, 45, t),
  lamp: t => {                       // ignition with a stutter
    if (t < 31) return 0;
    if (t < 31.9) return [0, .7, .1, .9, .2, 1, .4, 1][Math.floor((t - 31) * 9) % 8];
    return 1;
  },
  lightning: t => {
    let f = 0;
    for (const s of [3.4, 10.2, 10.55, 20.4, 20.7, 26.1]) {
      const d = t - s; if (d >= 0 && d < .45) f = Math.max(f, Math.exp(-d * 14) * (0.6 + 0.4 * Math.sin(d * 90) ** 2));
    }
    return f * story.storm(t);
  },
  fade: t => sstep(0, 1.2, t) * (1 - sstep(46.6, 48, t)),
};

// ---------------------------------------------------------------- world layout
export const LH = V(33, 2.4, 11);           // lighthouse base
const LH_HEIGHT = 15;
const groundH = x => 2.4 * sstep(22.5, 29, x); // basalt stair the keeper climbs

// keeper position along the beach
const WALK_V = 1.15, RUN_V = 3.6;
export function keeperState(t) {
  const x0 = -16;
  let x, mode;
  if (t < 22.5) { x = x0 + Math.max(0, t - 4) * WALK_V; mode = t < 4 ? 'idle' : 'walk'; }
  else if (t < 29.2) { x = x0 + 18.5 * WALK_V + (t - 22.5) * RUN_V; mode = 'run'; }
  else { x = x0 + 18.5 * WALK_V + 6.7 * RUN_V; mode = t > 39.5 ? 'wave' : 'idle'; }
  x = Math.min(x, 30.2);
  const z = 4.2 + 0.6 * Math.sin(x * 0.18) + 2.2 * sstep(20, 30, x);
  const face = mode === 'wave' ? -2.2 : (mode === 'idle' && t > 29 ? -1.3 : Math.PI / 2 - 0.08);
  return { pos: V(x, groundH(x), z), mode, face };
}

// boat: drifts toward the sea stacks, turns away once the beam finds it
export function boatState(t) {
  const a = V(-52, 0, -118), b = V(-16, 0, -58);
  let p, heading;
  if (t < 35.5) { p = a.clone().lerp(b, clamp(t / 35.5)); heading = Math.atan2(b.x - a.x, b.z - a.z); }
  else {
    const u = easeOut(clamp((t - 35.5) / 12.5));
    const ang = Math.atan2(b.x - a.x, b.z - a.z) - u * 2.3;
    p = b.clone().add(V(-Math.sin(u * 2.3) * 2 - u * 10, 0, -u * 8));
    heading = ang;
  }
  return { pos: p, heading };
}

// ---------------------------------------------------------------- Gerstner waves (shared CPU/GPU)
const WAVES = [
  [1, 0.6, 0.20, 34], [0.7, 1, 0.16, 21], [-0.3, 1, 0.14, 13], [0.2, 1, 0.10, 7.5], [1, -0.2, 0.08, 4.2],
];
export function gerstner(x, z, t, storm) {
  let ox = 0, oy = 0, oz = 0;
  const damp = sstep(2, -30, z);
  for (const [dx0, dz0, st, L] of WAVES) {
    const len = Math.hypot(dx0, dz0), dx = dx0 / len, dz = dz0 / len;
    const k = 2 * Math.PI / L, c = Math.sqrt(9.8 / k), f = k * (dx * x + dz * z - c * t);
    const a = (st * (0.45 + 0.75 * storm)) / k * damp;
    ox += dx * a * Math.cos(f); oy += a * Math.sin(f); oz += dz * a * Math.cos(f);
  }
  return V(ox, oy, oz);
}
const WAVES_GLSL = WAVES.map(w => `vec4(${w.map(n => n.toFixed(3)).join(',')})`).join(',');

// ---------------------------------------------------------------- engine
export class Film {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.T = 0;
    this.mode = 'film';
    this.pass = 'beauty';
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.capture });
    r.setPixelRatio(opts.pixelRatio || Math.min(devicePixelRatio, 1.75));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.35;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a1018, 0.0085);
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 2000);
    this.build();
    this.buildStudio();
    this.buildPost();
  }

  // ---------------------------------------------------------- scene
  build() {
    const S = this.scene;
    this.U = { uTime: { value: 0 }, uStorm: { value: 1 }, uAurora: { value: 0 }, uFlash: { value: 0 },
      uLamp: { value: 0 }, uBeamDir: { value: V(1, 0, 0) }, uLampPos: { value: LH.clone().add(V(0, LH_HEIGHT * .86, 0)) },
      uCam: { value: V() }, uFogColor: { value: new THREE.Color(0x0a1018) }, uFogDensity: { value: 0.0085 } };

    // lights
    this.hemi = new THREE.HemisphereLight(0x5a6f8c, 0x0b0c10, 0.55); S.add(this.hemi);
    const moon = this.moon = new THREE.DirectionalLight(0x9fb4d6, 0.9);
    moon.position.set(-60, 80, -40); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 260 });
    moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
    moon.target.position.set(10, 0, 5); S.add(moon, moon.target);
    this.flash = new THREE.DirectionalLight(0xdfe8ff, 0); this.flash.position.set(-30, 90, -100); S.add(this.flash);
    this.lampLight = new THREE.PointLight(0xffc27a, 0, 60, 1.6); this.lampLight.position.copy(this.U.uLampPos.value); S.add(this.lampLight);
    this.beamSpot = new THREE.SpotLight(0xffd9a0, 0, 260, 0.11, 0.6, 0.8);
    this.beamSpot.position.copy(this.U.uLampPos.value); S.add(this.beamSpot, this.beamSpot.target);
    this.doorLight = new THREE.PointLight(0xffb060, 0, 9, 2); this.doorLight.position.copy(LH).add(V(-1.6, 1.4, -1.2)); S.add(this.doorLight);
    this.keeperLight = new THREE.PointLight(0xffc68a, 0, 7, 1.6); S.add(this.keeperLight);

    this.placeholders();
    this.lampLight.position.copy(this.U.uLampPos.value); this.beamSpot.position.copy(this.U.uLampPos.value);
    this.buildSky(); this.buildOcean(); this.buildShore(); this.buildRain(); this.buildBeam();
  }

  buildSky() {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.U,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uStorm, uAurora, uFlash, uLamp; uniform vec3 uBeamDir;
        varying vec3 vDir;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5;} return s; }
        void main(){
          vec3 d = normalize(vDir); float y = max(d.y, 0.);
          vec3 zen = vec3(.006,.011,.022), hor = vec3(.035,.05,.07);
          vec3 col = mix(hor, zen, pow(y, .45));
          // stars
          vec2 sp = d.xz/(d.y+.25)*220.; vec2 ci = floor(sp); float st = h(ci);
          float star = step(.9965, st) * smoothstep(.5,.0,length(fract(sp)-.5)) * (.6+.4*sin(uTime*2.+st*90.));
          // aurora curtains: march a few layers through a plane above us
          vec3 aur = vec3(0.);
          if(d.y > 0.02){
            for(int i=0;i<14;i++){
              float fi = float(i);
              float ht = 1. + fi*.075;
              vec2 p = d.xz / d.y * ht * .32;
              p += vec2(uTime*.018, -uTime*.006);
              float band = fbm(vec2(p.x*.55 + fbm(p*.8+uTime*.03)*1.6, p.y*.18));
              float curtain = smoothstep(.52,.74, band) * smoothstep(.0,.25, d.y) * (1.-smoothstep(.6,1., d.y));
              vec3 c = mix(vec3(.15,1.,.55), vec3(.55,.25,1.), fi/14.);
              aur += c * curtain * (1. - fi/16.) * .11;
            }
          }
          // storm cloud deck
          vec2 cp = d.xz/(d.y+.12)*1.2 + vec2(uTime*.045, uTime*.01);
          float cl = fbm(cp*1.4 + fbm(cp*2.2));
          float cover = smoothstep(.38, .72, cl + uStorm*.32 - .18);
          vec3 cloudCol = mix(vec3(.018,.022,.03), vec3(.06,.07,.09), cl) ;
          cloudCol += vec3(.55,.62,.85) * uFlash * (.3 + 1.6*cl) ;
          col += star*vec3(.8,.85,1.) * (1.-cover);
          col += aur * uAurora * (1. - cover*.85);
          col = mix(col, cloudCol, cover * .96);
          // horizon haze & beam glow
          col += vec3(.04,.05,.07) * exp(-y*9.) ;
          col += vec3(1.,.72,.4) * uLamp * .08 * pow(max(dot(d, normalize(uBeamDir+vec3(0,.05,0))),0.), 60.);
          col += uFlash * vec3(.08,.09,.12);
          if(d.y < 0.) col = hor*.6 + vec3(.02)*uFlash;
          gl_FragColor = vec4(col, 1.);
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), m);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  buildOcean() {
    const g = new THREE.PlaneGeometry(700, 520, 360, 300); g.rotateX(-Math.PI / 2); g.translate(0, 0, -250);
    const m = new THREE.ShaderMaterial({
      uniforms: this.U, transparent: false,
      vertexShader: /* glsl */`
        uniform float uTime, uStorm; varying vec3 vW; varying vec3 vN; varying float vCrest;
        const vec4 W[5] = vec4[5](${WAVES_GLSL});
        void main(){
          vec3 p = (modelMatrix*vec4(position,1.)).xyz; vec3 o = p;
          vec3 T = vec3(1,0,0), B = vec3(0,0,1); float damp = smoothstep(2., -30., p.z); vCrest = 0.;
          for(int i=0;i<5;i++){
            vec2 d = normalize(W[i].xy); float k = 6.2831853/W[i].w, c = sqrt(9.8/k);
            float f = k*(dot(d, o.xz) - c*uTime); float st = W[i].z*(.45+.75*uStorm)*damp; float a = st/k;
            p.x += d.x*a*cos(f); p.y += a*sin(f); p.z += d.y*a*cos(f);
            T += vec3(-d.x*d.x*st*sin(f), d.x*st*cos(f), -d.x*d.y*st*sin(f));
            B += vec3(-d.x*d.y*st*sin(f), d.y*st*cos(f), -d.y*d.y*st*sin(f));
            vCrest += st*sin(f);
          }
          vN = normalize(cross(B, T)); vW = p;
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.);
        }`,
      fragmentShader: /* glsl */`
        uniform float uTime, uStorm, uAurora, uFlash, uLamp, uFogDensity; uniform vec3 uCam, uBeamDir, uLampPos, uFogColor;
        varying vec3 vW; varying vec3 vN; varying float vCrest;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 V = normalize(uCam - vW);
          // micro normal detail
          vec2 q = vW.xz*.9 + uTime*vec2(.3,.5);
          vec3 N = normalize(vN + vec3(n(q)-.5, 0., n(q+7.3)-.5)*.35);
          float fres = .02 + .98*pow(1.-max(dot(N,V),0.), 5.);
          vec3 R = reflect(-V, N);
          vec3 skyR = mix(vec3(.03,.045,.06), vec3(.008,.014,.025), clamp(R.y*2.,0.,1.));
          skyR += uAurora*vec3(.05,.35,.2)*smoothstep(.05,.5,R.y);
          skyR += uFlash*vec3(.35,.4,.55);
          vec3 deep = vec3(.004,.016,.022), sss = vec3(.02,.09,.085);
          vec3 col = mix(deep + sss*clamp(vCrest*2.,0.,1.), skyR, fres);
          // lamp glints
          vec3 L = normalize(uLampPos - vW); vec3 H = normalize(L+V);
          vec3 flatDir = normalize(vec3(uBeamDir.x,0.,uBeamDir.z));
          float inBeam = pow(max(dot(normalize(vec3(vW.x-uLampPos.x,0.,vW.z-uLampPos.z)), flatDir),0.), 220.);
          col += vec3(1.,.75,.45) * uLamp * (pow(max(dot(N,H),0.), 180.)*3. + inBeam*.35*fres*4.);
          // foam: crests + shoreline wash
          float foamN = n(vW.xz*1.7 + uTime*.4)*n(vW.xz*.6 - uTime*.2);
          float crest = smoothstep(.22,.5, vCrest*(.6+uStorm*.8)) * foamN*2.;
          float wash = smoothstep(-7., 1.5, vW.z) * smoothstep(.25,.65, foamN + .25*sin(vW.z*1.3 - uTime*1.6));
          col += vec3(.55,.6,.65) * clamp(crest + wash, 0., 1.) * (.25 + .5*uFlash + .25*uLamp);
          float dist = length(uCam - vW); float fog = 1. - exp(-uFogDensity*uFogDensity*dist*dist);
          col = mix(col, uFogColor, fog);
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.ocean = new THREE.Mesh(g, m); this.ocean.frustumCulled = false;
    this.scene.add(this.ocean);
  }

  buildShore() {
    const S = this.scene;
    // black sand, rising out of the sea
    const g = new THREE.PlaneGeometry(260, 90, 260, 90); g.rotateX(-Math.PI / 2); g.translate(0, 0, 32);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = 0.11 * z + 0.25 * Math.sin(x * .07 + z * .05) + 0.08 * Math.sin(x * .9 + z * .4) * sstep(0, 10, z);
      y += sstep(22, 60, z) * 3.2 * (0.6 + 0.4 * Math.sin(x * .05));
      p.setY(i, y - 0.35);
    }
    g.computeVertexNormals();
    const sand = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.42, metalness: 0.0 });
    sand.onBeforeCompile = sh => {   // wet sheen near the water
      sh.vertexShader = sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWz = (modelMatrix*vec4(transformed,1.)).xyz;').replace('void main() {', 'varying vec3 vWz;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vWz;\nvoid main() {')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(0.08, 0.75, smoothstep(0., 9., vWz.z)) + 0.15*fract(sin(dot(floor(vWz.xz*40.),vec2(12.9,78.2)))*437.5);');
    };
    this.sand = new THREE.Mesh(g, sand); this.sand.receiveShadow = true; S.add(this.sand);

    // basalt columns — hexagonal prisms, stepped like Reynisfjara's organ cliff
    const colGeo = new THREE.CylinderGeometry(0.62, 0.62, 1, 6, 1); colGeo.translate(0, 0.5, 0);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.72, metalness: 0.05, flatShading: true });
    const mats = [];
    const R = 0.62, dx = R * Math.sqrt(3), dz = R * 1.5;
    for (let row = 0; row < 24; row++) for (let col = 0; col < 34; col++) {
      const x = 14 + col * dx + (row % 2) * dx / 2, z = 1 + row * dz;
      const lhd = Math.hypot(x - LH.x, z - LH.z);
      const onPath = Math.abs(z - (4.2 + 0.6 * Math.sin(x * .18) + 2.2 * sstep(20, 30, x))) < 1.6 && x < 31;
      let hgt;
      if (lhd < 5.2) hgt = LH.y;                                   // plateau under the lighthouse
      else if (onPath) hgt = groundH(x);                             // stairs
      else {
        const cliff = (sstep(5, 17, z) * 9 + sstep(36, 48, x) * 4) * sstep(19, 27, x);
        hgt = 0.4 + cliff * (0.75 + 0.35 * hash(row * 91 + col)) + 3 * sstep(8, 0, lhd - 5) + hash(col * 7 + row) * 1.2 * sstep(18, 24, x);
        hgt = Math.round(hgt / .35) * .35;
      }
      if (hgt < 0.1 || (x < 21 && z < 9 && !onPath && hash(row + col * 13) < .7)) continue;
      const base = 0.11 * z - 1.2;
      const m = new THREE.Matrix4().compose(V(x, base, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (hash(row * col) - .5) * .12), V(1, Math.max(0.2, hgt - base), 1));
      mats.push(m);
    }
    const inst = new THREE.InstancedMesh(colGeo, colMat, mats.length);
    mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.castShadow = inst.receiveShadow = true; S.add(inst); this.columns = inst;

    // sea stacks (Reynisdrangar)
    const stackMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.85, flatShading: true });
    [[4, -46, 26, 5.5], [11, -53, 34, 6.5], [17.5, -47, 21, 4.5], [30, -40, 15, 4]].forEach(([x, z, hh, r], si) => {
      const sg = new THREE.CylinderGeometry(r * .25, r, hh, 9, 14); const pp = sg.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const X = pp.getX(i), Y = pp.getY(i), Z = pp.getZ(i);
        const k = 1 + 0.22 * Math.sin(Y * 1.3 + si) * Math.cos(Math.atan2(Z, X) * 3 + Y * .4) + 0.12 * hash(i + si * 99);
        pp.setXYZ(i, X * k, Y, Z * k);
      }
      sg.computeVertexNormals(); sg.translate(0, hh / 2 - 2, 0);
      const st = new THREE.Mesh(sg, stackMat); st.position.set(x, 0, z); st.castShadow = true; S.add(st);
    });
  }

  buildRain() {
    const N = 14000, g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 6), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random(), y = Math.random(), z = Math.random();
      for (let e = 0; e < 2; e++) { pos.set([x, y, z], i * 6 + e * 3); seed[i * 2 + e] = e; }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('endp', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: this.U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime, uStorm; uniform vec3 uCam; attribute float endp; varying float vA;
        void main(){ vec3 box = vec3(60., 34., 60.); vec3 wind = vec3(5.,-26.,2.);
          vec3 p = position*box + wind*uTime*(1.+position.x*.2);
          p = mod(p - (uCam - box*.5), box) + (uCam - box*.5);
          p -= normalize(wind)*endp*.55;
          vA = (1.-endp)*.6*uStorm*step(position.z, uStorm*1.1);
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float uFlash, uLamp; varying float vA; void main(){ gl_FragColor = vec4(vec3(.55,.62,.75)*(.35+uFlash*2.+uLamp*.15), vA*.35); }`,
    });
    this.rain = new THREE.LineSegments(g, m); this.rain.frustumCulled = false; this.scene.add(this.rain);
  }

  buildBeam() {
    // volumetric-looking cone: soft edges by view angle, falloff along length
    const g = new THREE.CylinderGeometry(0.25, 9, 160, 48, 1, true); g.translate(0, -80, 0); g.rotateZ(Math.PI / 2);
    const m = new THREE.ShaderMaterial({
      uniforms: { ...this.U, uLen: { value: 160 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec3 vN, vV; varying float vL; void main(){ vec4 w = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); vL = position.x/160.; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uLamp, uStorm; varying vec3 vN, vV; varying float vL;
        void main(){ float edge = pow(abs(dot(normalize(vN), vV)), 1.6); float fall = exp(-vL*3.2) * smoothstep(0.,.02,vL);
          gl_FragColor = vec4(vec3(1.,.8,.55) * edge * fall * uLamp * (.35 + .45*uStorm), 1.); }`,
    });
    this.beam = new THREE.Group();
    const b1 = new THREE.Mesh(g, m), b2 = new THREE.Mesh(g, m); b2.rotation.y = Math.PI; b1.frustumCulled = b2.frustumCulled = false;
    this.beam.add(b1, b2); this.beam.position.copy(this.U.uLampPos.value); this.scene.add(this.beam);
    // lens glow sprite
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(.2, 'rgba(255,190,110,.55)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    this.glow.position.copy(this.U.uLampPos.value); this.glow.scale.setScalar(5); this.scene.add(this.glow);
  }

  placeholders() {
    // hand-built assets; Meshy GLBs replace them in load() when present
    const lh = makeLighthouse(LH_HEIGHT); this.lighthouse = lh.root; this.lighthouse.position.copy(LH); this.scene.add(this.lighthouse);
    this.U.uLampPos.value.copy(LH).add(V(0, lh.root.userData.lampY, 0));
    const bt = makeBoat(); this.boat = new THREE.Group(); bt.root.scale.setScalar(.75); this.boat.add(bt.root); this.scene.add(this.boat);
    const kp = makeKeeper(); this.keeper = kp.root; this.keeperAnim = kp.animate; this.scene.add(this.keeper);
    this.assets = { keeper: kp.root, lighthouse: lh.root, boat: bt.root };
    this.assetSource = { keeper: 'procedural', lighthouse: 'procedural', boat: 'procedural' };
  }

  // ---------------------------------------------------------- assets
  async load(base = './', files = null) {
    // `files` lists the Meshy GLBs that exist; anything not listed keeps its hand-built stand-in
    const want = f => !files || files.includes(f);
    const loader = new GLTFLoader();
    const get = f => want(f) ? loader.loadAsync(base + f).catch(e => { console.warn('missing', f, e); return null; }) : Promise.resolve(null);
    const [lh, boat, rig, walk, run, wave] = await Promise.all(['lighthouse.glb', 'boat.glb', 'keeper_rigged.glb', 'keeper_walk.glb', 'keeper_run.glb', 'keeper_wave.glb'].map(get));
    const fit = (obj, height) => {
      const box = new THREE.Box3().setFromObject(obj), size = box.getSize(V()), s = height / size.y;
      obj.scale.multiplyScalar(s); const b2 = new THREE.Box3().setFromObject(obj), c = b2.getCenter(V());
      obj.position.sub(V(c.x, b2.min.y, c.z)); const wrap = new THREE.Group(); wrap.add(obj); return wrap;
    };
    const shadows = o => o.traverse(m => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; if (m.material) { m.material.envMapIntensity = 1; } } });
    if (lh) { this.scene.remove(this.lighthouse); this.lighthouse = fit(lh.scene, LH_HEIGHT); shadows(this.lighthouse); this.lighthouse.position.copy(LH); this.lighthouse.rotation.y = -0.6; this.scene.add(this.lighthouse); this.assets.lighthouse = lh.scene; this.assetSource.lighthouse = 'meshy'; }
    if (boat) { this.scene.remove(this.boat); this.boat = fit(boat.scene, 3.2); shadows(this.boat); this.scene.add(this.boat); this.assets.boat = boat.scene; this.assetSource.boat = 'meshy'; }
    if (rig) {
      this.scene.remove(this.keeper);
      this.keeper = fit(rig.scene, 1.35); shadows(this.keeper); this.scene.add(this.keeper);
      this.assets.keeper = rig.scene; this.assetSource.keeper = 'meshy'; this.keeperAnim = null;
      this.mixer = new THREE.AnimationMixer(rig.scene);
      const clip = g => g && g.animations && g.animations[0];
      this.actions = {};
      for (const [k, g] of Object.entries({ walk, run, wave })) { const c = clip(g); if (c) { const a = this.mixer.clipAction(c); a.play(); a.weight = 0; this.actions[k] = a; } }
      this.rigClipNames = Object.keys(this.actions);
    }
    this.setTime(this.T);
  }

  // ---------------------------------------------------------- studio (breakdown mode)
  buildStudio() {
    const s = this.studio = new THREE.Scene();
    s.background = new THREE.Color(0x0b0e13);
    const key = new THREE.DirectionalLight(0xffe2c0, 2.6); key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0x86b6ff, 2.2); rim.position.set(-5, 3, -6);
    s.add(key, rim, new THREE.HemisphereLight(0x8090a8, 0x101216, 0.9));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: .9 }));
    floor.rotation.x = -Math.PI / 2; s.add(floor);
    const grid = new THREE.PolarGridHelper(6, 12, 6, 64, 0x2a3340, 0x1c222b); grid.position.y = .002; s.add(grid);
    this.studioCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 200);
    this.controls = new OrbitControls(this.studioCam, this.canvas);
    this.controls.enableDamping = true; this.controls.enabled = false; this.controls.autoRotate = true; this.controls.autoRotateSpeed = 1.2;
    this.studioSlot = new THREE.Group(); s.add(this.studioSlot);
  }

  showAsset(name) {
    const src = this.assets && this.assets[name]; this.studioSlot.clear(); this.skelHelper = null; this.studioMixer = null;
    if (!src) return null;
    const procKeeper = name === 'keeper' && this.assetSource.keeper === 'procedural';
    let clone;
    if (procKeeper) { const k = makeKeeper(); clone = k.root; this.studioAnim = k.animate; }
    else { clone = name === 'keeper' ? SkeletonUtils.clone(src) : src.clone(true); this.studioAnim = null; }
    clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.set(1, 1, 1);
    const box = new THREE.Box3().setFromObject(clone), size = box.getSize(V()), s = 2.4 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(s); const b2 = new THREE.Box3().setFromObject(clone), c = b2.getCenter(V());
    clone.position.sub(V(c.x, b2.min.y, c.z));
    this.studioSlot.add(clone);
    const stats = { tris: 0, verts: 0, textures: new Set(), maps: [] };
    clone.traverse(m => {
      if (!m.isMesh) return;
      m.userData.orig = m.material;
      const g = m.geometry; stats.verts += g.attributes.position.count; stats.tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      const mm = Array.isArray(m.material) ? m.material : [m.material];
      mm.forEach(x => ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach(k => { if (x[k] && !stats.textures.has(x[k])) { stats.textures.add(x[k]); stats.maps.push(`${k.replace('Map', '').replace('map', 'albedo')} ${x[k].image?.width || '?'}²`); } }));
    });
    if (name === 'keeper') {
      this.skelHelper = procKeeper ? jointHelper(clone) : new THREE.SkeletonHelper(clone); this.skelHelper.visible = false; this.studioSlot.add(this.skelHelper);
      if (!procKeeper) {
        this.studioMixer = new THREE.AnimationMixer(clone);
        const a = this.actions && (this.actions.walk || Object.values(this.actions)[0]);
        if (a) this.studioMixer.clipAction(a.getClip()).play();
      }
      let bones = 0; clone.traverse(o => { if (o.isBone) bones++; }); stats.bones = bones || 14;
    }
    const h = 2.4 * size.y / Math.max(size.x, size.y, size.z);
    this.studioCam.position.set(3.6, h * .75 + .6, 4.6); this.controls.target.set(0, h * .48, 0); this.controls.update();
    this.applyPass(this.pass);
    return { tris: Math.round(stats.tris), verts: stats.verts, maps: stats.maps, bones: stats.bones, source: this.assetSource[name] };
  }

  applyPass(pass) {
    this.pass = pass;
    const clay = this._clay || (this._clay = new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: .55 }));
    const wire = this._wire || (this._wire = new THREE.MeshBasicMaterial({ color: 0x7fd6ff, wireframe: true, transparent: true, opacity: .55 }));
    const norm = this._norm || (this._norm = new THREE.MeshNormalMaterial());
    this.studioSlot.traverse(m => {
      if (!m.isMesh) return;
      m.material = pass === 'clay' ? clay : pass === 'wire' ? wire : pass === 'normals' ? norm : m.userData.orig;
    });
    if (this.skelHelper) this.skelHelper.visible = pass === 'skeleton';
    if (pass === 'skeleton') this.studioSlot.traverse(m => { if (m.isMesh) m.material = this._ghost || (this._ghost = new THREE.MeshStandardMaterial({ color: 0x3a4250, transparent: true, opacity: .35, depthWrite: false })); });
  }

  setMode(mode) {
    this.mode = mode;
    this.controls.enabled = mode === 'breakdown';
    this.renderPass.scene = mode === 'breakdown' ? this.studio : this.scene;
    this.renderPass.camera = mode === 'breakdown' ? this.studioCam : this.camera;
    this.bloom.strength = mode === 'breakdown' ? 0.15 : 0.85;
  }

  // ---------------------------------------------------------- post
  buildPost() {
    const c = this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera); c.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.55, 0.72); c.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 1 }, uAspect: { value: 16 / 9 }, uBars: { value: 1 }, uFlash: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uFade, uAspect, uBars, uFlash; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 uv = vUv, d = uv-.5; float r2 = dot(d,d);
          vec3 c; c.r = texture2D(tDiffuse, uv - d*r2*.012).r; c.g = texture2D(tDiffuse, uv).g; c.b = texture2D(tDiffuse, uv + d*r2*.012).b;
          // cool shadows, warm highlights
          float l = dot(c, vec3(.2126,.7152,.0722));
          c = mix(c * vec3(.86,.98,1.12), c * vec3(1.08,1.,.9), smoothstep(.15,.7,l));
          c *= 1. - .55*smoothstep(.2,.85, length(d*vec2(uAspect*.75,1.)));
          c += (h(uv*vec2(1920.,1080.) + fract(uTime*24.)*91.)-.5) * .045;
          c *= uFade;
          // 2.39:1 letterbox
          float bar = .5 - (uAspect/2.39)*.5; if(uBars > .5 && (uv.y < bar || uv.y > 1.-bar)) c = vec3(0.);
          gl_FragColor = vec4(max(c,0.), 1.);
        }`,
    });
    c.addPass(this.grade);
    c.addPass(new OutputPass());
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = this.studioCam.aspect = w / h; this.camera.updateProjectionMatrix(); this.studioCam.updateProjectionMatrix();
    this.grade.uniforms.uAspect.value = w / h;
  }

  // ---------------------------------------------------------- camera direction
  cameraAt(t) {
    const k = keeperState(t), kp = k.pos, b = boatState(t);
    const lamp = this.U.uLampPos.value;
    const shot = SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1];
    const u = clamp((t - shot.t0) / (shot.t1 - shot.t0));
    const ctx = { kp, b: b.pos, lamp, u, t, e: easeInOut(u) };
    const { pos, look, fov = 38, roll = 0 } = shot.cam(ctx);
    // handheld drift that grows with the storm
    const s = story.storm(t) * (shot.shake ?? 1);
    pos.x += Math.sin(t * 1.3) * .06 * s + Math.sin(t * 3.1) * .02 * s; pos.y += Math.sin(t * 1.7 + 1) * .05 * s;
    return { pos, look, fov, roll, shot };
  }

  // ---------------------------------------------------------- frame update
  setTime(t) {
    this.T = t = clamp(t, 0, DURATION);
    const U = this.U, storm = story.storm(t), lamp = story.lamp(t), fl = story.lightning(t);
    U.uTime.value = t; U.uStorm.value = storm; U.uAurora.value = story.aurora(t); U.uFlash.value = fl; U.uLamp.value = lamp;
    // beam: sweeps, then locks onto the boat 34.5–37.5, then resumes
    const bs = boatState(t);
    let ang = (t - 31) * 0.95;
    const toBoat = Math.atan2(-(bs.pos.z - LH.z), bs.pos.x - LH.x);
    if (t > 33.2) { const lock = sstep(33.2, 34.6, t) * (1 - sstep(38.5, 40, t)); ang = lerp(ang, toBoat + Math.PI * 2 * Math.round((ang - toBoat) / (Math.PI * 2)), lock); }
    this.beam.rotation.set(0, ang, -0.045);
    const dir = V(Math.cos(ang), -0.045, -Math.sin(ang)); U.uBeamDir.value.copy(dir);
    this.beam.visible = lamp > 0;
    this.glow.material.opacity = lamp; this.glow.scale.setScalar(2.5 + 2 * lamp);
    this.lampLight.intensity = lamp * 45;
    this.beamSpot.intensity = lamp * 2600 * (0.4 + 0.6 * (1 - story.aurora(t) * .5)); this.beamSpot.target.position.copy(U.uLampPos.value).addScaledVector(dir, 80);
    const ud = this.lighthouse.children[0]?.userData || this.lighthouse.userData;
    if (this.lighthouse.userData.glass) { this.lighthouse.userData.glass.emissiveIntensity = lamp * 1.2; this.lighthouse.userData.windows.emissiveIntensity = sstep(29.6, 30.4, t) * 2.5; }
    this.doorLight.intensity = sstep(29.5, 30.5, t) * 6 + lamp * 4;
    this.flash.intensity = fl * 9;
    this.moon.intensity = 0.55 + 0.6 * (1 - storm);
    this.hemi.intensity = 0.4 + 0.25 * (1 - storm) + story.aurora(t) * .25;
    this.hemi.color.setRGB(.35 + .0, .43 + .25 * story.aurora(t), .55);
    this.scene.fog.density = U.uFogDensity.value = 0.0045 + 0.0055 * storm;

    // boat
    const w = gerstner(bs.pos.x, bs.pos.z, t, storm), w2 = gerstner(bs.pos.x + 1.5, bs.pos.z, t, storm), w3 = gerstner(bs.pos.x, bs.pos.z + 1.5, t, storm);
    this.boat.position.set(bs.pos.x + w.x, w.y - 0.25, bs.pos.z + w.z);
    this.boat.rotation.set((w3.y - w.y) * .9, bs.heading, (w2.y - w.y) * -.9, 'YXZ');

    // keeper
    const ks = keeperState(t);
    this.keeper.position.copy(ks.pos);
    const kNext = keeperState(t + 0.05).pos; let face = ks.face;
    if (ks.mode === 'walk' || ks.mode === 'run') face = Math.atan2(kNext.x - ks.pos.x, kNext.z - ks.pos.z);
    this.keeper.rotation.y = face;
    this.keeperLight.position.copy(ks.pos).add(V(-.6, 2.3, -1.4)); this.keeperLight.intensity = 2.2 * (1 - 0.5 * story.aurora(t));
    const cross = (a, b) => sstep(a - .25, a + .25, t) * (1 - sstep(b - .25, b + .25, t));
    if (this.keeperAnim) this.keeperAnim(t, { walk: cross(4, 22.5), run: cross(22.5, 29.2), wave: cross(39.5, 99) });
    if (this.mixer) {
      const want = { walk: ks.mode === 'walk' ? 1 : 0, run: ks.mode === 'run' ? 1 : 0, wave: ks.mode === 'wave' ? 1 : 0 };
      // smooth crossfades from the timeline itself (stateless)
      const cross = (a, b) => sstep(a - .25, a + .25, t) * (1 - sstep(b - .25, b + .25, t));
      const wts = { walk: cross(4, 22.5), run: cross(22.5, 29.2), wave: cross(39.5, 99) };
      for (const [n, a] of Object.entries(this.actions)) {
        const d = a.getClip().duration, rate = n === 'walk' ? 1 : n === 'run' ? 1 : 1;
        const start = n === 'walk' ? 4 : n === 'run' ? 22.5 : 39.5;
        a.time = ((Math.max(0, t - start + 0.25) * rate) % d + d) % d;
        a.weight = wts[n] ?? want[n];
      }
      this.mixer.update(0);
      // if no clip is weighted, the rest pose stands (idle)
    }

    // camera
    const c = this.cameraAt(t);
    this.camera.position.copy(c.pos); this.camera.lookAt(c.look); this.camera.rotateZ(c.roll);
    if (this.camera.fov !== c.fov) { this.camera.fov = c.fov; this.camera.updateProjectionMatrix(); }
    U.uCam.value.copy(this.camera.position);
    this.sky.position.copy(this.camera.position);
    this.grade.uniforms.uTime.value = t; this.grade.uniforms.uFade.value = story.fade(t);
    this.currentShot = c.shot;
  }

  render(dt = 0) {
    if (this.mode === 'breakdown') {
      this.controls.update(); if (this.studioMixer) this.studioMixer.update(dt);
      if (this.studioAnim) { this._st = (this._st || 0) + dt; const ph = (this._st % 12); this.studioAnim(this._st, { walk: ph < 4 ? 1 : 0, run: ph >= 4 && ph < 8 ? 1 : 0, wave: ph >= 8 ? 1 : 0 }); }
      this.grade.uniforms.uBars.value = 0; this.grade.uniforms.uFade.value = 1;
    } else { this.grade.uniforms.uBars.value = 1; }
    this.composer.render();
  }
}

// ---------------------------------------------------------------- the shot list
export const SHOTS = [
  { id: 'SH01', name: 'Open water', t0: 0, t1: 6, note: 'Low dolly over the swell toward the shore. Title in.',
    cam: ({ e, lamp }) => ({ pos: V(lerp(-40, -22, e), lerp(4.2, 4.8, e), lerp(-74, -40, e)), look: V(lerp(10, 22, e), lerp(5, 7, e), 12), fov: 34 }) },
  { id: 'SH02', name: 'The shore', t0: 6, t1: 13, note: 'Wide from the sea stacks. The keeper sets out; the light is dark.',
    cam: ({ e, kp }) => ({ pos: V(lerp(-6, -2, e), lerp(5.5, 6.2, e), -24), look: V(lerp(4, 9, e), 3.2, 10), fov: 36 }) },
  { id: 'SH03', name: 'Tracking', t0: 13, t1: 19, note: 'Side track at hip height. Rain catches the rim light.', shake: 1.4,
    cam: ({ kp, e }) => ({ pos: kp.clone().add(V(lerp(-1.6, 1.4, e), 1.25, 5.4)), look: kp.clone().add(V(1.1, .75, 0)), fov: 34 }) },
  { id: 'SH04', name: 'The boat', t0: 19, t1: 23, note: 'Out on the swell, a boat drifts blind toward the stacks.', shake: 2,
    cam: ({ b, e }) => ({ pos: b.clone().add(V(lerp(9, 6, e), 2.6, lerp(10, 7, e))), look: b.clone().add(V(0, .9, 0)), fov: 30, roll: .03 }) },
  { id: 'SH05', name: 'The run', t0: 23, t1: 28.5, note: 'Low and ahead of the keeper, pulling back as they sprint.', shake: 1.8,
    cam: ({ kp, e }) => ({ pos: kp.clone().add(V(lerp(4.5, 5.5, e), .55, lerp(-2.4, -1.4, e))), look: kp.clone().add(V(0, .9, 0)), fov: 30 }) },
  { id: 'SH06', name: 'The tower', t0: 28.5, t1: 33.5, note: 'Worm’s-eye crane up the tower. The lamp stutters and catches.',
    cam: ({ e, lamp }) => ({ pos: V(LH.x - 9, LH.y + lerp(.6, 2.2, e), LH.z - 11), look: V(LH.x, lerp(LH.y + 3, lamp.y, easeInOut(sstep(.25, 1, e))), LH.z), fov: 40 }) },
  { id: 'SH07', name: 'Found', t0: 33.5, t1: 40, note: 'Over the lamp’s shoulder; the beam sweeps, finds the boat and holds.',
    cam: ({ e, lamp, b }) => ({ pos: lamp.clone().add(V(lerp(9, 6, e), lerp(7, 5, e), lerp(14, 11, e))), look: b.clone().lerp(lamp, lerp(.55, .3, e)), fov: lerp(42, 36, e) }) },
  { id: 'SH08', name: 'Aurora', t0: 40, t1: 48, note: 'The storm breaks. Long pull-back under the aurora; the keeper waves.',
    cam: ({ e, kp }) => ({ pos: V(lerp(16, -8, e), lerp(9, 12, e), lerp(-10, -32, e)), look: V(lerp(28, 20, e), lerp(3, 10, e), lerp(8, 12, e)), fov: lerp(30, 42, e) }) },
];

// joint gizmo for the hand-built rig: a dot per pivot group + bone lines to its parent
function jointHelper(root) {
  const g = new THREE.Group(); const pts = []; const lines = [];
  root.traverse(o => { if (o.isGroup && o !== root && o.parent) { pts.push(o); } });
  const dotGeo = new THREE.SphereGeometry(.035, 8, 6), dotMat = new THREE.MeshBasicMaterial({ color: 0xffb85c, depthTest: false });
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.length * 6), 3));
  const ln = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x7fd6ff, depthTest: false })); ln.renderOrder = 10; g.add(ln);
  const dots = pts.map(() => { const d = new THREE.Mesh(dotGeo, dotMat); d.renderOrder = 11; g.add(d); return d; });
  g.updateMatrixWorld = function (force) {
    const a = lineGeo.attributes.position, w = V(), pw = V(), inv = new THREE.Matrix4().copy(this.parent ? this.parent.matrixWorld : new THREE.Matrix4()).invert();
    pts.forEach((o, i) => { o.getWorldPosition(w).applyMatrix4(inv); dots[i].position.copy(w); o.parent.getWorldPosition(pw).applyMatrix4(inv); a.setXYZ(i * 2, w.x, w.y, w.z); a.setXYZ(i * 2 + 1, pw.x, pw.y, pw.z); });
    a.needsUpdate = true; THREE.Group.prototype.updateMatrixWorld.call(this, force);
  };
  return g;
}
