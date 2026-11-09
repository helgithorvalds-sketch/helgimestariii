# 02 — A warm-clay three.js look for Svif (three 0.186.1, vanilla WebGL)

Goal: real-time scenes that look like a photographed architectural model lit by the flyer's warm taupe light and diagonal sunbeam. They must feel premium, not "CG". The scenes are a clay house, the 20×20 cm booklet, coupon cards, a miniature neighbourhood, a door with a mail slot and a print stack. The same scene code has to drive both the scroll-scrubbed site canvas and offline video capture.

**Status: verified.** I built a working prototype and checked it three ways:
- It type-checks against `three@0.186.1` and `@types/three@0.186.0`.
- It renders in headless Chrome 153 (SwiftShader) for all six scenes.
- I timed it, checked determinism with md5 hashes, and tested context loss and restore.

Every API below was read in `node_modules/three` source, not taken from memory.

| What | Where |
|---|---|
| Recipe library (renderer, environment, lights, materials, geometry, helpers) | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/proto/src/svif3d.ts` |
| The six test scenes | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/proto/src/scenes.ts` |
| Client-only scroll runtime (render on demand, pause, DPR governor, context loss) | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/proto/src/stage-runtime.ts` |
| React 19 / TanStack Start component (SSR-safe) | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/proto/src/StoryStage.tsx` |
| Capture pipeline (Playwright → PNG → ffmpeg) | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/proto/test/capture.cjs` |
| Look sheet (tone-mapping and environment comparisons, all scenes) | `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/shots/look-sheet.jpg` |

`proto/node_modules` is a symlink to `svif/node_modules`. To run it:

```
cd proto && node_modules/.bin/tsc -p tsconfig.json && node_modules/.bin/vite build
node_modules/.bin/vite preview --port 4179
node test/shoot.cjs <out> '[{"name":"x","query":"scene=house&tm=agxlook","p":0.5}]'
```

---

## 0. The recipe in one screen

1. **Tone mapping: AgX plus a gentle "look"** (CDL power 1.1, saturation 1.08), exposure 1.0. I rendered Neutral, AgX and ACES on the same scene:
   - Neutral turned warm clay into saturated peach. That is the "AI render" look.
   - ACES pushed the backdrop toward orange.
   - AgX produced the flyer's greige taupe on its own.
2. **Light colour is almost neutral; the warmth comes from the room.** The flyer works this way. I measured the cover:
   - Beam: `#848276` / `#89867b`, luminance 0.22–0.24.
   - Shade: `#635c4f` / `#595140`, luminance 0.08–0.11.
   - So the beam is close to neutral, the shade is warm, and the key-to-shade ratio is about 2.2–2.8 : 1.

   In practice: a sun of `#fff6ea` at 3.2 and a procedural warm-taupe environment. Warm light on warm clay compounds the saturation, so avoid it.
3. **Procedural warm studio environment** (four unlit panels → PMREM, no network). It costs 57 ms once, even in SwiftShader. It models form better than `RoomEnvironment`, which is flat, neutral and washes the clay out.
4. **Shadows: `PCFShadowMap`, which is the soft option in r186.** `PCFSoftShadowMap` is removed and now only logs a warning. Settings:
   - `radius` 3–4 texels.
   - Map size 2048 on desktop, 1024 on mobile.
   - The shadow camera is fitted to the subject and its shadow throw, with bias derived from texel size.
   - Each object gets a cheap contact blob, and the neighbourhood gets a baked AO canvas.
5. **The sunbeam is a `SpotLight` with a window cookie** (`light.map`, `decay: 0`, `castShadow: true`). It gives the flyer's soft parallelogram on the floor and wall in one light.
6. **Clay material** (`MeshPhysicalMaterial`):
   - roughness 0.8, `specularIntensity` 0.5, broad `sheen` 0.6, no pure white.
   - Every edge is rounded: `RoundedBoxGeometry`, or `ExtrudeGeometry` bevel plus `toCreasedNormals`.
   - Paper uses roughness 0.5 with a light sheen and anisotropic cover textures.
7. **Camera: long lens**, vertical FOV 20° for the neighbourhood and 26–30° for tabletop scenes (roughly 50–70 mm full-frame equivalent). Dolly to fit on portrait screens; don't widen the lens. Smooth scroll progress, not positions, with exponential damping: λ = 9/s on native scroll, 16/s when Lenis is active. Skip depth of field on the site.
8. **Render only on demand.** Pause off screen. Cap DPR at 2 / 1.75 / 1.25. Use MSAA (it added only about 12% even in SwiftShader). Set `dithering: true` on every lit material. Rebuild PMREM after context loss. Show a poster when there's no WebGL2 or the GPU is software.
9. **SSR:** `await import()` the runtime inside `useEffect`. Server and first client render produce identical markup (poster plus a hidden canvas). Call `renderer.dispose()` and `forceContextLoss()` on unmount.
10. **Film:** the same `update(p)` functions, driven only by frame index. Output was byte-identical across reloads and after a context restore. Speed is 0.86 s per 1080p frame through ffmpeg in SwiftShader.

---

## 1. Renderer

Verified facts from `node_modules/three`:
- `WebGLRenderer` options (`src/renderers/WebGLRenderer.js:72-85`): `canvas, context, depth, stencil, alpha, antialias, premultipliedAlpha, preserveDrawingBuffer, powerPreference, failIfMajorPerformanceCaveat, reversedDepthBuffer, outputBufferType`.
- **New since r18x: `outputBufferType` and `setEffects()`.** With `outputBufferType: THREE.HalfFloatType`, the scene renders into an internal 4× MSAA half-float target (`src/renderers/webgl/WebGLOutput.js`). Tone mapping and sRGB are then applied in one final pass, and `setEffects([...passes])` runs post-processing between the two.
  - The final pass **has no dithering**.
  - Material `dithering` then runs in linear space before quantisation, so it stops working.
  - Keep the default `UnsignedByteType` path for the site; it is cheaper and dithers correctly. Use `HalfFloatType` only if you add post-processing, which I did not test.
- Tone mapping constants: `NeutralToneMapping = 7`, `AgXToneMapping = 6`, `ACESFilmicToneMapping = 4`, `CustomToneMapping = 5` (`src/constants.js:423-483`).
- `PCFSoftShadowMap` is `@deprecated since r186`. `WebGLShadowMap.render` rewrites it to `PCFShadowMap` with the warning *"PCFSoftShadowMap has been removed"* (`src/renderers/webgl/WebGLShadowMap.js:99`; the r186 release notes list "Remove remaining PCFSoftShadowMap code").

```ts
// svif3d.ts — createRenderer (verified)
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,                 // MSAA on the default framebuffer
  alpha: false,                    // opaque: the scene draws its own backdrop (see §6)
  premultipliedAlpha: true,
  stencil: false,
  depth: true,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: true, // helps on some browsers; NOT sufficient (see §8)
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.CustomToneMapping; // AgX + look, installed below
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio, TIERS[tier].dprMax)); // 2 / 1.75 / 1.25
```

### Tone mapping: which suits warm clay

The comparison is in `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/shots/v2/tm-compare.png`: identical scene and lights, Neutral, AgX and ACES from left to right.

- **Neutral (Khronos PBR Neutral)** is built to reproduce base colour 1:1 up to about 0.8 linear. That suits e-commerce ([model-viewer](https://modelviewer.dev/examples/tone-mapping)). With warm environment light on warm albedo it *keeps* the compounded saturation, and the clay reads orange-peach. It is only usable if every light is made nearly grey.
- **ACES Filmic** has more contrast and shifts hue: our taupe went olive-orange, and three applies an extra `exposure / 0.6` (`tonemapping_pars_fragment`).
- **AgX** is less saturated by design. donmccurdy calls it "a better foundation than ACES Filmic for new scenes" and says many users will want more contrast ([three.js forum](https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609)). On our scene it gave the flyer's muted greige with soft highlight roll-off. **Chosen.**
- **AgX + look.** Stock AgX is slightly flat. Blender and Filament add an ASC-CDL "look" after the sigmoid (Punchy is power 1.35, saturation 1.4). Three's source leaves that step commented out (`// v = agxLook(v, look);`). I install a copy of three's own AgX code as `CustomToneMapping` with power 1.1 and saturation 1.08. Comparison: `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/shots/v3/agx-compare.png`, showing stock AgX, AgX+look (chosen) and AgX+look at exposure 1.2.

```ts
// svif3d.ts — installAgxLook (verified: patches the exact line in r186's chunk; returns false if three changes it)
export function installAgxLook(power = 1.1, saturation = 1.08) {
  const marker = "vec3 CustomToneMapping( vec3 color ) { return color; }";
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (!chunk.includes(marker)) return false;
  const f = (n: number) => n.toFixed(4);
  THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(marker, /* glsl */ `
vec3 CustomToneMapping( vec3 color ) {
  const mat3 AgXInsetMatrix = mat3(
    vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
    vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
    vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
  const mat3 AgXOutsetMatrix = mat3(
    vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
    vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
    vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 ) );
  const float AgxMinEv = - 12.47393;
  const float AgxMaxEv = 4.026069;
  color *= toneMappingExposure;
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = AgXInsetMatrix * color;
  color = max( color, 1e-10 );
  color = log2( color );
  color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
  color = clamp( color, 0.0, 1.0 );
  color = agxDefaultContrastApprox( color );
  float luma = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color = pow( max( color, vec3( 0.0 ) ), vec3( ${f(power)} ) );
  color = luma + ${f(saturation)} * ( color - luma );
  color = AgXOutsetMatrix * color;
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
  return clamp( color, 0.0, 1.0 );
}`);
  return true;
}
// call once before any material compiles, then: renderer.toneMapping = THREE.CustomToneMapping
```

AgX makes the rose accent `#b29079` a little greyer. If the door or marker must read clearly as rose, push its albedo about 10% more saturated, for example `#b98a6e`.

### Physically based light units

r155 made lights physical by default and r165 removed `useLegacyLights` ([three.js forum](https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733)).

- In the shader, `irradiance = dotNL * light.color` and `BRDF_Lambert = RECIPROCAL_PI * diffuseColor` (`lights_physical_pars_fragment.glsl.js:491`, `common.glsl.js:103-105`). A clay face with albedo about 0.75 linear, square to a directional light of intensity 3.2, outputs 0.75 × 3.2 / π ≈ 0.76 before tone mapping. That is why 3.0–3.5 is the right range for the sun.
- Point and spot lights are in candela and decay with the inverse square. For a sun-like spot, set `decay = 0` so intensity doesn't depend on distance.
- Exposure stays at 1.0. Tune the lights, not exposure, so the site and the films share one exposure.

---

## 2. Environment lighting without network

`RoomEnvironment` in r186 takes **no constructor arguments**: `new RoomEnvironment()`; older versions took the renderer. It builds emissive Lambert panels around a room (`examples/jsm/environments/RoomEnvironment.js`). It is neutral white-grey and bright. On our clay it flattened the form at intensity 1.0 and went cold-grey at 0.55. See `/tmp/claude-0/-home-user-helgimestariii/48f7c4ac-5377-5d86-a541-83d389f507ff/scratchpad/research/shots/v5/env-compare.png`, showing RoomEnvironment 1.0, RoomEnvironment 0.55 and the warm studio from left to right.

**The custom warm studio is chosen.** Verified details:
- `PMREMGenerator.fromScene(scene, sigma = 0, near = 0.1, far = 100, { size = 256, position })` (`src/extras/PMREMGenerator.js:107`).
- It renders with tone mapping off into HalfFloat targets, so colours above 1.0 survive.
- If the environment scene has no `background`, PMREM uses the **renderer's clear colour** (black by default). Always set `env.background`.
- Cost: 57 ms in SwiftShader for the warm environment, against 90–113 ms for RoomEnvironment.

```ts
// svif3d.ts — createWarmEnvironment (verified)
export const LOOK = {
  sunColor: "#fff6ea", sunIntensity: 3.2,
  envRoom: "#7d7568", envRoomPower: 1.0,     // what the shade picks up (warm taupe)
  envKey: "#fffaf2",  envKeyPower: 5,        // soft window on the sun side
  envFloor: "#bdb19f", envFloorPower: 0.9,   // warm bounce
  envFillPower: 1.2,                         // dim, slightly cooler opposite panel
};
export const SUN_DIR = new THREE.Vector3(-0.62, 0.62, 0.48).normalize(); // towards the light: high, left, a bit in front

export function createWarmEnvironment(renderer: THREE.WebGLRenderer, o: WarmEnvOptions = {}) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(o.room ?? LOOK.envRoom).multiplyScalar(o.roomPower ?? LOOK.envRoomPower);
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const panel = (hex: THREE.ColorRepresentation, power: number, pos: THREE.Vector3, w: number, h: number) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.copy(pos); mesh.scale.set(w, h, 1); mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  const k = (o.keyDir ?? SUN_DIR).clone().normalize();
  panel(o.key ?? LOOK.envKey, o.keyPower ?? LOOK.envKeyPower, k.clone().multiplyScalar(6), 4.5, 3);
  panel("#f4e9d8", 1.8, new THREE.Vector3(0, 7, 0), 9, 9);
  panel(o.floor ?? LOOK.envFloor, o.floorPower ?? LOOK.envFloorPower, new THREE.Vector3(0, -5, 0), 16, 16);
  panel("#ebe7e0", o.fillPower ?? LOOK.envFillPower, new THREE.Vector3(-k.x, 0.35, -k.z).normalize().multiplyScalar(6), 5, 3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035, 0.1, 50);
  pmrem.dispose(); plane.dispose(); mats.forEach((m) => m.dispose());
  return rt; // scene.environment = rt.texture; rt.dispose() on teardown and before a rebuild
}
```

The light (cream) stage uses `{ room: "#cbbfae", roomPower: 1.25, floor: "#e3d8c6", floorPower: 1.2, keyPower: 6 }`. Leave `scene.environmentIntensity` at 1; the panel powers above are already calibrated. Use `scene.environmentRotation` (r162+) instead of rebuilding if the sun direction changes between chapters.

Don't add a `HemisphereLight` on top of the environment. It is a second, shapeless ambient that flattens the clay.

---

## 3. Key light, shadows, contact shadows

### 3a. Sun (directional), exterior scenes: house and neighbourhood

**r186 `PCFShadowMap` is already soft.** It takes five hardware-PCF taps (`sampler2DShadow`, LinearFilter) on a Vogel disk, rotated per pixel by interleaved gradient noise. The blur radius is `shadow.radius` in shadow-map **texels** (`shadowmap_pars_fragment.glsl.js`, `getShadow` under `SHADOWMAP_TYPE_PCF`).
- The noise is keyed only to `gl_FragCoord`, so it is static and deterministic. It doesn't flicker frame to frame and it compresses well in video.
- `blurSamples` only affects VSM.

Settings:

| | desktop | mobile |
|---|---|---|
| `shadow.mapSize` | 2048 | 1024 |
| `shadow.radius` | 3–4 | 2–3 (fewer texels, so the same world blur needs a smaller radius) |
| `normalBias` | 1.5 × texel (world units) | same |
| `bias` | −0.5 × texel / (far − near) | same |
| shadow camera | fitted to subject plus shadow throw, **not** to the view | same |

```ts
// svif3d.ts — createSun + fitSun (verified)
export function createSun(o: SunOptions = {}) {
  const sun = new THREE.DirectionalLight(o.color ?? LOOK.sunColor, o.intensity ?? LOOK.sunIntensity);
  sun.castShadow = true;
  const s = o.mapSize ?? 2048;
  sun.shadow.mapSize.set(s, s);
  sun.shadow.radius = o.radius ?? 4;
  return sun;
}
export function fitSun(sun: THREE.DirectionalLight, subject: THREE.Box3, dir = SUN_DIR, groundY = subject.min.y) {
  const box = subject.clone();
  for (const c of [
    new THREE.Vector3(subject.min.x, subject.max.y, subject.min.z), new THREE.Vector3(subject.max.x, subject.max.y, subject.min.z),
    new THREE.Vector3(subject.min.x, subject.max.y, subject.max.z), new THREE.Vector3(subject.max.x, subject.max.y, subject.max.z),
  ]) box.expandByPoint(c.clone().addScaledVector(dir, -(c.y - groundY) / Math.max(dir.y, 0.05))); // shadow throw
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius;
  sun.target.position.copy(sphere.center);
  sun.position.copy(sphere.center).addScaledVector(dir, r * 3);
  const cam = sun.shadow.camera;
  cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
  cam.near = r * 1.9; cam.far = r * 4.1;
  cam.updateProjectionMatrix();
  sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
  const texel = (2 * r) / sun.shadow.mapSize.x;
  sun.shadow.normalBias = texel * 1.5;
  sun.shadow.bias = -(texel * 0.5) / (cam.far - cam.near);
  sun.shadow.needsUpdate = true;
}
// scene.add(sun, sun.target)  <- the target must be in the scene
```

No acne or peter-panning showed up in any test render, including the 4 mm booklet and 1.2 mm coupon cards. With a fixed bias of 0.025 world units, the 4 mm booklet's shadow would detach; that is why the bias is texel-relative.

**Other shadow options, judged:**
- **VSM:** every receiver must also cast, light bleeds, and it costs two blur passes on an RG half-float target. Not needed now that PCF is soft.
- **PCSS** (contact-hardening): the official example patches `shadowmap_pars_fragment` by string replacement and requires `BasicShadowMap`. It hard-codes `NEAR_PLANE` and uses 17×2 samples. It is fragile and heavy, so skip it. The contact blob and AO below fake the contact-hardening cue cheaply.
- **The r186 `SunLight` addon** (cascaded shadows, `three/addons/lights/SunLight.js`, new in r186) is for large worlds. Our scenes fit one map, so `DirectionalLight` is simpler.

### 3b. The flyer sunbeam: a spot light with a window cookie (interior scenes: booklet, coupons, door, stack)

Verified:
- `SpotLight.map` is *"disabled if castShadow is false"* (`src/lights/SpotLight.js:111`).
- In r186 the shader does `directLight.color *= spotColor.rgb` inside the projected square (`lights_fragment_begin.glsl.js:137-138`). The cookie is a plain RGB mask.

The result is a soft-edged parallelogram on floor and wall, the same motif as the flyer cover (see the door and booklet tiles in the look sheet).

```ts
// svif3d.ts — createWindowBeam + cookieTexture (verified)
export function createWindowBeam(o: { intensity?: number; color?: THREE.ColorRepresentation; mapSize?: number; radius?: number } = {}) {
  const beam = new THREE.SpotLight(o.color ?? "#fff1de", o.intensity ?? 4.5, 0, THREE.MathUtils.degToRad(13), 0, 0); // distance 0, penumbra 0, decay 0
  beam.map = cookieTexture();
  beam.castShadow = true;                 // required for .map
  beam.shadow.mapSize.set(o.mapSize ?? 1024, o.mapSize ?? 1024);
  beam.shadow.radius = o.radius ?? 3;
  beam.shadow.bias = -0.0002;
  beam.shadow.normalBias = 0.01;
  return beam;
}
export function cookieTexture(size = 512) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, size, size);
  g.save(); g.translate(size / 2, size / 2);
  g.transform(1, 0, -0.42, 1, 0, 0);       // shear: diagonal beam
  g.shadowColor = "#fff"; g.shadowBlur = size * 0.02; g.shadowOffsetX = size * 4; // blurred shadow only (works in Safari, unlike ctx.filter)
  g.fillStyle = "#fff";
  const pw = size * 0.2, ph = size * 0.66, gap = size * 0.018;
  g.fillRect(-pw - gap / 2 - size * 4, -ph / 2, pw, ph);
  g.fillRect(gap / 2 - size * 4, -ph / 2, pw, ph);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;       // a mask, not a colour
  return t;
}
// usage (booklet scene): beam.position.set(-16, 14, 9); beam.target.position.set(0.9, 0.5, -1.6);
// beam.angle = degToRad(10); scene.add(beam, beam.target); intensity 5.5–6
```

Measured on the render: beam ≈ 2.7× the luminance of the shade, which matches the flyer's 2.2–2.8×.

Animating `beam.target` or the beam position slowly with scroll ("time passes in the room") is the most luxurious single move available. It needs no extra geometry, and the shadow re-renders anyway.

### 3c. Contact shadows and AO: cheapest first

| Technique | Cost | Use for |
|---|---|---|
| **Blob plane**: `MeshBasicMaterial` + radial `alphaMap`, `depthWrite: false`, `toneMapped: false`, opacity 0.35–0.55 | 1 draw, no pass | under the booklet, cards, house, stack |
| **Baked ground AO**: canvas with blurred footprints as the ground's `aoMap` (red channel). AO only darkens env/indirect light, so the sun's shadow stays crisp | 0 extra draws, one 1024² texture | neighbourhood |
| three's contact-shadow example: render depth from below into a 512² target, blur twice, map onto a plane | +1 scene render +4 blur passes per frame | only if objects move vertically a lot. Skip on mobile |
| `GTAOPass` / `SSAOPass` (addons) | full-screen normal+depth pass plus denoise | desktop film capture at most. Not on the site (not tested here) |

**Gotcha (found in testing):** `alphaMap` reads the **green channel**. A radial gradient drawn on a *transparent* canvas uploads un-premultiplied RGB = 255 right up to alpha 0. The result is a hard, jagged ellipse. Draw luminance on opaque black instead:

```ts
export function blobTexture(size = 128) {
  return canvasTexture(size, size, (g) => {
    const r = size / 2;
    g.fillStyle = "#000"; g.fillRect(0, 0, size, size);
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, "#fff"); grad.addColorStop(0.4, "#8c8c8c"); grad.addColorStop(0.75, "#262626"); grad.addColorStop(1, "#000");
    g.fillStyle = grad; g.fillRect(0, 0, size, size);
  }, false);
}
export function contactShadow(w: number, d: number, opacity = 0.55, color: THREE.ColorRepresentation = "#2a1f16") {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({
    color, alphaMap: blobTexture(), transparent: true, opacity, depthWrite: false, toneMapped: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 1;
  return mesh;  // place 1–2 mm above the surface; fade opacity as the object lifts
}
```

Ground AO uses the same off-canvas `shadowBlur` trick: `groundAoTexture(footprints, extent)` in `svif3d.ts`. `aoMap` uses UV channel 0 by default, so a `PlaneGeometry` works as is.

---

## 4. Materials and geometry: how to avoid the plastic/CG look

**Checklist, all applied in the prototype:**
1. Rounded edges everywhere. Bevel radius ≈ 1.5–3% of the object size, so each edge catches a thin line of light. This matters more than any material setting.
2. Roughness 0.75–0.85 and `specularIntensity` about 0.5, so there's no hot specular dot.
3. A broad `sheen` lobe for a velvety, plaster-like rise at grazing angles.
4. Albedo never pure white: clay `#e6e0d4`, roof a few % darker via vertex colour, windows `#bfb2a0`.
5. ±3% lightness variation per instance in the neighbourhood (`setColorAt`).
6. `dithering: true` on every lit material.
7. One light story (sun or beam plus the warm environment), never extra fill lights.

```ts
// svif3d.ts — clay + paper (verified)
export function clayMaterial(color: THREE.ColorRepresentation = PAL.clay, o: ClayOptions = {}) {
  const common = { color, roughness: o.roughness ?? 0.8, metalness: 0, vertexColors: !!o.vertexColors,
    bumpMap: o.grain ?? null, bumpScale: o.grain ? 0.35 : 1, dithering: true };
  if (o.physical === false) return new THREE.MeshStandardMaterial(common);          // low tier
  return new THREE.MeshPhysicalMaterial({ ...common,
    specularIntensity: 0.5,
    sheen: o.sheen ?? 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color("#fff3e4").multiplyScalar(0.5) });
}
export function paperMaterial(map: THREE.Texture | null, o: { roughness?: number; physical?: boolean } = {}) {
  const common = { map, color: "#ffffff", roughness: o.roughness ?? 0.5, metalness: 0, dithering: true };
  if (o.physical === false) return new THREE.MeshStandardMaterial(common);
  return new THREE.MeshPhysicalMaterial({ ...common, specularIntensity: 0.7,
    sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color("#ffffff").multiplyScalar(0.4) });
}
```

Plaster grain (`grainTexture`, seeded noise used as `bumpMap`, repeated 3×) adds tactility on the hero house only. Keep it off crowd instances.

**Geometry (verified in r186 source):**
- `RoundedBoxGeometry(width, height, depth, segments = 2, radius = 0.1)` is imported from `three/addons/geometries/RoundedBoxGeometry.js`. It is **already non-indexed**: calling `toNonIndexed()` on it logs a warning. It **keeps BoxGeometry's six groups** (+x, −x, +y, −y, +z, −z), so multi-material works. This is the workhorse for the booklet, cards, plinth, door and stack.
- **House:** a gable `Shape` passed to `ExtrudeGeometry({ depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 1 })`. Then `toCreasedNormals(geo, degToRad(35))` from `three/addons/utils/BufferGeometryUtils.js` gives smooth bevels while flat faces stay flat. Extrude output on its own is non-indexed with faceted normals, so the bevel shows as bands. Roof slabs, chimney, door and windows are rounded boxes. Everything goes through `mergeGeometries` with a `color` attribute, which gives **one geometry, one draw call**. See `houseGeometry()` in `svif3d.ts`.
- **LOD matters.** The hero house is about 5.4k triangles per pass. Instancing 45 of them gave 280k triangles per frame (shadow pass included). The `crowd: true` variant (bevel segments 2, rounded-box segments 1) has the same silhouette at about 1.1k triangles. That brought the neighbourhood to **103k triangles per frame in 5 draw calls**.
- **Booklet:** 20×20 cm with 1 unit = 10 cm, so `slab(2, 0.04, 2, 0.012, 3)`. Real thickness is about 3 mm; 4 mm reads better on screen. Materials are `[edge, spine, cover, back, edge, edge]` in group order. The cover UV orientation on the +y face was checked: not mirrored.
- **Page edge:** a 4×128 canvas with a hairline every 1/18 of the height (16 leaves plus the cover), darker lines at the covers, `ClampToEdge`. It reads as a page block without any extra geometry.
- **Cover photo:** `TextureLoader.loadAsync` → `colorSpace = SRGBColorSpace` → `anisotropy = min(8, renderer.capabilities.getMaxAnisotropy())` → `renderer.initTexture(t)`, which uploads before the first scroll frame.
  - Anisotropy is what keeps the cover crisp when the booklet tilts.
  - Size: 1024² on mobile (about 5.3 MB of GPU memory with mips), 2048² on desktop hero only.
  - Coupon text drawn in canvas needs `await document.fonts.load('300 120px Jost')` before drawing.
- **Draw-call trap:** each geometry group is a separate draw call, and the shadow pass doubles them. The coupons scene measured **50 calls**: three 6-group cards plus the booklet, ×2.
  - Coupon cards should use **one material**; their 1.2 mm edges are invisible.
  - The booklet needs three materials. Merge adjacent groups where possible.

---

## 5. Background: sweep vs fog vs CSS gradient

| | Pros | Cons | Verdict |
|---|---|---|---|
| **Lit studio sweep** (floor curving into a wall, `sweepGeometry()`) | real light falloff; the window beam lands on the wall like the flyer; receives shadows and AO | rendered colour ≠ CSS hex (it is lit and tone-mapped): measured `#d9d2c9` for a `#efe7da` albedo on the light stage. Dark gradients band in 8 bit | **use for full-bleed sticky stages**, with `dithering: true` |
| **Fog** (`THREE.Fog`) | free depth cue for the miniature; distant houses dissolve | must be set **relative to camera distance** with long lenses: my first neighbourhood render was 100% fog because the camera sat 40 units away | **use for the neighbourhood** |
| **Transparent canvas over CSS** (`alpha: true` + `ShadowMaterial` ground) | backdrop is the exact CSS colour, so it blends with the page | no beam on the wall; premultiplied-alpha edges; CSS gradients band unless grained | use for small embedded tiles only |

Verified colour-matching fact: fog is applied **after** tone mapping and colour-space conversion, in order `tonemapping_fragment → colorspace_fragment → fog_fragment → premultiplied_alpha → dithering` (`meshphysical.glsl.js:221-225`). `fog.color` and a `Color` background go through `getUnlitUniformColorSpace` (`WebGLMaterials.js:27`, `WebGLBackground.js:241`). So **`scene.background` hex = `fog.color` hex = the CSS hex, exactly.** Make the sweep or ground fade into fog of the section's CSS colour and the canvas edges disappear into the page.

To match a lit sweep to the page, render once at design time, read the edge pixel, and put that hex in the section's CSS. Don't try to invert the tone curve at runtime.

**Banding:** three's dithering is `rand(gl_FragCoord.xy)`, deterministic (`dithering_pars_fragment.glsl.js:7`). Enable it on every lit material. The site's existing `.grain` overlay on top of the canvas also hides residual banding in the CSS around it.

---

## 6. Camera

- **Lens:** vertical FOV 20° (≈ 68 mm full-frame equivalent) for the neighbourhood, 24–30° (≈ 45–56 mm) for house and tabletop. Elevation 30–45° for the miniature, 15–25° for wall and beam compositions. Long lens plus a high angle is what reads as "model photographed on a table".
- **Portrait screens:** keep the lens and dolly back (`frameSphere()` fits a bounding sphere to `min(vfov, hfov)`). Widening the FOV on phones distorts the clay and looks cheap.
- **Depth of field / tilt-shift:** avoid on the site. Crisp is the brand here.
  - If wanted for the neighbourhood film: `HorizontalTiltShiftShader` / `VerticalTiltShiftShader` exist in `examples/jsm/shaders/` (two full-screen passes, no depth needed), or `BokehPass`.
  - For films, the better option is accumulation: average N renders with camera jitter on an aperture disk, aimed at the focal point. It is deterministic and has no edge artefacts. Not built here.
- **Scroll damping:** smooth the *progress*, then evaluate the authored path. Don't smooth positions separately, or the camera cuts corners off the path.

```ts
export const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
// λ = 9/s on native/touch scroll (95% settled in ~330 ms), 16/s when Lenis is active (html has class "lenis").
// Lenis 1.3.26 defaults (verified in dist/lenis.mjs:434): lerp 0.1, smoothWheel true, syncTouch false (touch is native),
// autoRaf false, respectReducedMotion true. Lenis drives real document scroll, so window 'scroll' events still fire.
// clamp dt to 50 ms so a tab switch never produces a jump.
```

Easing for authored keyframes: use the site's single curve, `cubic-bezier(.22,1,.36,1)`, already in `playback.ts` and `src/three/anim.ts` as `easeOut`. Camera travel uses `easeInOut` (cubic). Nothing bounces.

---

## 7. Rendering strategy for a sticky scroll-scrubbed canvas on mobile

From `stage-runtime.ts` (type-checked):

- **Render on demand** (the [three.js manual pattern](https://threejs.org/manual/en/rendering-on-demand)). `setProgress(p)` stores a target and requests one rAF. Each frame damps toward the target, renders, and requests another frame only while not yet settled. A still page renders **zero** frames.
- **Pause:** an `IntersectionObserver` on the sticky element plus `visibilitychange`. Reset `last` on resume so `dt` doesn't spike.
- **Mobile URL bar:** a `ResizeObserver` that ignores height changes under 15% on coarse pointers. Size the sticky box at `100lvh`. That avoids reallocating the drawing buffer on every URL-bar show or hide.
- **DPR:** cap at 2 (desktop), 1.75 (capable phones), 1.25 (others). This matches the common "cap at 2" guidance ([Utsubo, 100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). A governor drops DPR by 0.25 (never raises it) when the median interval of 24 consecutive scrubbed frames exceeds 22 ms.
- **Budgets** (per frame, shadow pass included; three counts both in `renderer.info.render`):

| | target | measured in prototype |
|---|---|---|
| draw calls | ≤ 60 (mobile guidance is about 100 total, per the Utsubo tips) | house 6, neighbourhood 5, booklet 14, door 23, stack 16, coupons 50 (fix: one material per card) |
| triangles | ≤ 150k | hero house 10.9k, neighbourhood 103k (crowd LOD), stack 25k |
| shadow-casting lights | 1 | 1 |
| textures | cover 1024² mobile / 2048² desktop; canvas textures ≤ 512² (AO 1024²) | 7–11 textures per scene |
| JS | three + recipe ≈ **600 KB min / 150 KB gzip** (measured, tree-shaken by Vite 8/rolldown), in its own chunk | |

- **Shader compile hitch:** `await renderer.compileAsync(scene, camera)` before revealing the canvas. Upload textures early with `renderer.initTexture(t)`.
- **Context loss (verified):** three calls `preventDefault()` on `webglcontextlost` and re-initialises GL on `webglcontextrestored`, re-uploading geometry and textures lazily (`WebGLRenderer.js:1113-1145`). **Render-target contents are lost**, so the PMREM environment must be rebuilt. With the rebuild, the restored frame's md5 equalled the original frame's.

  ```ts
  canvas.addEventListener("webglcontextlost", () => { lost = true; cancelAnimationFrame(raf); showPoster(); });
  canvas.addEventListener("webglcontextrestored", () => {
    env.dispose(); env = createWarmEnvironment(renderer); scene.environment = env.texture;
    renderer.shadowMap.needsUpdate = true; lost = false; requestRender(); hidePoster();
  });
  ```
- **Fallback to posters:** `new WebGLRenderer()` **throws** when no WebGL2 context can be created (`WebGLRenderer.js:405-440`), so wrap creation in `try` and keep the poster.

  **`failIfMajorPerformanceCaveat: true` is not enough.** In Chrome 153 with SwiftShader it still created a context (tested in headless and headless-shell, with and without flags). Check the driver name as well:

  ```ts
  export function isSoftwareGL(renderer: THREE.WebGLRenderer) {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  }
  ```

  Posters come from the capture pipeline (§9) at the chapter's key progress values, as AVIF/WebP at 800w and 1600w. They are pixel-identical in look to the live canvas. Under `prefers-reduced-motion`, skip the damping (`reducedMotion: true`), or show the posters and cross-fade between them per chapter.
- **One canvas per page.** Browsers cap live WebGL contexts (about 16 in Chrome), and React StrictMode double-mounts in development. Use one sticky stage per story. Small explanatory tiles elsewhere should be the rendered videos or posters, not more contexts. If several live views are ever needed, use one fixed canvas with `setScissor` / `setViewport` per DOM rect.

Strategic note: Apple's own product pages mostly scrub **pre-rendered frames or video** on a canvas rather than real-time 3D ([CSS-Tricks on Apple's scroll animations](https://css-tricks.com/?p=308477)). We can have both. Use real-time three.js where the GPU is real. Because the scene functions are deterministic, the same frames can be shipped as a scrubbed image sequence or video for weak devices. Same look, no second art pipeline.

---

## 8. React 19 + TanStack Start (SSR) integration

- `@tanstack/react-router` exports `ClientOnly` and `useHydrated` (`dist/esm/ClientOnly.js`, implemented with `useSyncExternalStore`). They are not needed if the markup is identical on server and client, which is the pattern below.
- three is only ever imported from inside `useEffect` via `await import("./stage-runtime")`. Vite splits it into its own chunk. The server bundle never evaluates it, and the main chunk stays small.
- Hydration-safe: the server and the first client render both emit the poster `<img>` plus a canvas at `opacity: 0`. `live` flips only after the first real frame, and the cross-fade uses the site's curve.
- StrictMode and fast navigation: a `disposed` flag. If `mountStage` resolves after unmount, the stage is disposed immediately.
- Cleanup: dispose geometries, materials and **every texture slot** (`disposeScene()` walks material properties for `isTexture`, plus `SpotLight.map`). Then call `envRT.dispose()`, `renderer.dispose()` and `renderer.forceContextLoss()`. The last one frees the context now instead of waiting for GC.

```tsx
// StoryStage.tsx (type-checked with jsx: react-jsx against @types/react 19)
export function StoryStage({ sceneId, poster, background = "#4a4438", lengthVh = 300 }: {...}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const track = trackRef.current, sticky = stickyRef.current, canvas = canvasRef.current;
    if (!track || !sticky || !canvas) return;
    let disposed = false;
    let handle: StageHandle | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = () => {
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    const onScroll = () => handle?.setProgress(progress());
    const near = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      near.disconnect();
      try {
        const { mountStage } = await import("./stage-runtime");
        if (disposed) return;
        const h = await mountStage(sticky, canvas, { sceneId, coverUrl: "/cover-1024.jpg", backUrl: "/back-1024.jpg",
          reducedMotion: reduced, onFirstFrame: () => !disposed && setLive(true), onFallback: () => !disposed && setLive(false) });
        if (disposed) { h.dispose(); return; }
        handle = h;
        handle.setProgress(progress());
      } catch { /* no WebGL2 / software GPU: poster stays */ }
    }, { rootMargin: "100% 0px" });
    near.observe(track);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { disposed = true; near.disconnect(); window.removeEventListener("scroll", onScroll); handle?.dispose(); handle = null; };
  }, [sceneId]);
  return (
    <div ref={trackRef} style={{ height: `${lengthVh}vh`, position: "relative" }}>
      <div ref={stickyRef} style={{ position: "sticky", top: 0, height: "100lvh", overflow: "hidden", background }}>
        <img src={poster} alt="" aria-hidden="true" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: live ? 0 : 1, transition: "opacity 700ms cubic-bezier(.22,1,.36,1)" }} />
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
          opacity: live ? 1 : 0, transition: "opacity 700ms cubic-bezier(.22,1,.36,1)" }} />
      </div>
    </div>
  );
}
```

In the site, change the imports to the `@/` alias. Text overlays (white Jost titles, serif-italic line) stay as DOM inside the sticky box above the canvas. They keep the CSS fade and rise system and stay accessible.

---

## 9. Deterministic offline capture (films and posters)

- **Rule:** the only clock is the frame index. That means `p = i / (frames - 1)`, no `Date.now()`, no `Math.random()` (seeded `rng()` instead), no damping in capture, fixed DPR 1 and fixed size, fonts awaited, `compileAsync` before frame 0.
- **Verified:**
  - Two separate page loads produced the same frame **md5** (`1478316993ad4b274ca172a487fc13f4`).
  - The PCF IGN noise and the dithering are both `gl_FragCoord`-keyed, so they are stable.
  - `canvas.toDataURL()` called in the same task as `renderer.render()` returns the frame **without** `preserveDrawingBuffer`.
- **Chrome flags:**
  - `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader` is the documented WebGL-on-SwiftShader set ([Chromium docs](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)).
  - The automatic SwiftShader fallback was deprecated from Chrome 130 and removed in 139, with `--enable-unsafe-swiftshader` kept as the opt-in ([blink-dev intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM); [three.js forum](https://discourse.threejs.org/t/swiftshader-is-going-away-what-to-do/76140)).
  - In this container, Playwright 1.63 with Chrome 153 got WebGL2 on SwiftShader with every flag set and even with none; Playwright appears to add the opt-in itself. Pass the flags explicitly anyway so Puppeteer or plain Chrome behave the same.
- **Measured SwiftShader speed** (4 cores):

| Case | 1280×800 | 1920×1080 |
|---|---|---|
| house | 0.34 s | 0.69 s with MSAA, 0.62 s without |
| neighbourhood | | 0.93–1.41 s |
| door + beam | | 1.15–1.26 s |
| full pipeline including PNG encode and ffmpeg | | **0.86 s/frame** for the house |

  A 30 s film at 30 fps (900 frames) therefore takes about 13–20 min. Rendering at 2560×1440 and downscaling with Lanczos costs about 1.8× and gives cleaner edges.
- **What is slow in SwiftShader:**
  - Fragment count (resolution², DPR).
  - Triangle count in the shadow pass: the neighbourhood is about 2× the house at the same resolution.
  - Shader compile: page-ready took 2.3–3.9 s, and `KHR_parallel_shader_compile` is unsupported, so compiles run serially.
  - PMREM is minor (57–113 ms, once).
  - MSAA is only about +12%.
  - `MeshStandard` instead of `MeshPhysical` barely changed the neighbourhood timing; it is vertex/shadow bound.
  - Run one page at a time. SwiftShader already uses all cores.

```js
// test/capture.cjs (verified: produced a 1920x1080 h264 with 24 frames)
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:4179/?scene=${scene}&tm=agxlook&w=${W * SS}&h=${H * SS}`);
await page.waitForFunction(() => window.__svif && window.__svif.render);
const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', '30', '-i', '-',
  '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-tune', 'animation', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < frames; i++) {
  const p = i / (frames - 1);
  const url = await page.evaluate((p) => { window.__svif.render(p); return window.__svif.grab(); }, p);
  if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
```

Because the films call the same `update(p)` functions with the same easing as the site, film motion and site motion match by construction. That answers the owner's "videos should match the site's fade-ins".

---

## 10. Notes on the in-progress `svif/src/three/*` (parallel builder)

I read `core.ts`, `materials.ts`, `textures.ts` and `anim.ts` and did not modify them. What the tests suggest changing:

1. `toneMapping = NeutralToneMapping` with a warm sun (`#ffe4c6`) **and** a warm `HemisphereLight` **and** `RoomEnvironment` was the combination that rendered peach and orange in my comparison. Switch to AgX plus the look, a near-neutral sun (`#fff6ea`, about 3.2), the warm studio environment, and no hemisphere light.
2. `aimSun` uses a fixed `normalBias 0.025` and a near/far span of about `halfSize*8+60`. Use texel-relative bias and a tight near/far (`fitSun`), or the 4 mm booklet and 1.2 mm cards will lift off their shadows.
3. `dispose()` doesn't dispose material textures (maps, alpha maps, cookie) and doesn't call `forceContextLoss()`. There is no `webglcontextrestored` handling, and the PMREM environment must be rebuilt there.
4. `paper()` uses clearcoat. That works, but it adds a second specular lobe (cost, and a plasticky glint). Sheen plus roughness about 0.5 reads more like printed stock.
5. Use `renderer.capabilities.getMaxAnisotropy()` capped at 8 (`canvasTex` hard-codes 8, fine). Call `renderer.initTexture()` after load, and `compileAsync` before reveal.
6. Any transparent-canvas gradient used as an `alphaMap` needs an opaque black background (§3c).

---

## Sources

- three.js r186 release notes (PCFSoftShadowMap removal, SunLight, PMREM spiral blur, retroreflectivity): https://github.com/mrdoob/three.js/releases/tag/r186
- AgX discussion, donmccurdy on saturation, contrast and "better foundation than ACES": https://discourse.threejs.org/t/is-agx-tonemapping-implemented-correctly/60609
- Khronos PBR Neutral rationale (model-viewer): https://modelviewer.dev/examples/tone-mapping
- r155 lighting changes (physical units, π scaling, candela): https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733
- three.js contact-shadow example: https://github.com/mrdoob/three.js/blob/r186/examples/webgl_shadow_contact.html
- three.js PCSS example (chunk patching, BasicShadowMap): https://github.com/mrdoob/three.js/blob/r186/examples/webgl_shadowmap_pcss.html
- three.js manual, rendering on demand: https://threejs.org/manual/en/rendering-on-demand
- Performance budgets (DPR cap 2, about 100 draw calls on mobile, shadow-map sizes, disposal): https://www.utsubo.com/blog/threejs-best-practices-100-tips
- Chromium SwiftShader flags: https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md
- Intent to remove SwiftShader fallback: https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM
- three.js forum, "Swiftshader is going away": https://discourse.threejs.org/t/swiftshader-is-going-away-what-to-do/76140
- Apple-style scroll image sequences (CSS-Tricks): https://css-tricks.com/?p=308477
- Source files read in `svif/node_modules/three`:
  - `src/renderers/WebGLRenderer.js`
  - `src/renderers/webgl/WebGLOutput.js`
  - `src/renderers/webgl/WebGLShadowMap.js`
  - `src/renderers/shaders/ShaderChunk/{shadowmap_pars_fragment,tonemapping_pars_fragment,lights_fragment_begin,fog_fragment,dithering_pars_fragment,common}.glsl.js`
  - `src/extras/PMREMGenerator.js`
  - `src/lights/{LightShadow,DirectionalLightShadow,SpotLight}.js`
  - `src/materials/MeshPhysicalMaterial.js`
  - `examples/jsm/environments/{RoomEnvironment,ColorEnvironment}.js`
  - `examples/jsm/geometries/RoundedBoxGeometry.js`
  - `examples/jsm/utils/BufferGeometryUtils.js`
  - `examples/jsm/lights/SunLight.js`
  - `examples/jsm/postprocessing/SSAARenderPass.js`
- Also read: `lenis/dist/lenis.mjs` and `@tanstack/react-router/dist/esm/ClientOnly.js`.
