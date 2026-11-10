import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PAL } from "./palette";

export interface StageOptions {
  /** 'warm' (default): AgX + look, procedural warm studio IBL, near-neutral sun. 'room': the older RoomEnvironment rig */
  look?: "warm" | "room";
  canvas: HTMLCanvasElement;
  /** transparent canvas (the page paints the backdrop) */
  alpha?: boolean;
  /** cap on devicePixelRatio */
  maxDpr?: number;
  /** keep the drawing buffer (needed for frame capture) */
  preserve?: boolean;
  /** scene background colour (null = transparent) */
  background?: string | null;
  /** linear fog [near, far] in world units, coloured like the background */
  fog?: [number, number] | null;
  fov?: number;
  exposure?: number;
  /** shadow map size for the sun */
  shadowSize?: number;
}

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** fit renderer + camera to the canvas' CSS size */
  resize: (w: number, h: number) => void;
  /** aim the sun's shadow box at a point with a given half-size */
  aimSun: (target: THREE.Vector3, halfSize: number, dir?: THREE.Vector3) => void;
  render: () => void;
  dispose: () => void;
}

/** Direction the light comes from (normalised): low, from the upper left like the flyer's sunbeam. */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.62, 0.48).normalize();

export function createStage(o: StageOptions): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas: o.canvas,
    antialias: true,
    alpha: !!o.alpha,
    powerPreference: "high-performance",
    preserveDrawingBuffer: !!o.preserve,
  });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  renderer.setPixelRatio(Math.min(dpr, o.maxDpr ?? 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const warm = (o.look ?? "warm") === "warm";
  renderer.toneMapping = warm && installAgxLook() ? THREE.CustomToneMapping : THREE.AgXToneMapping;
  renderer.toneMappingExposure = o.exposure ?? (warm ? 1.0 : 1.08);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  if (o.alpha) renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  if (o.background) scene.background = new THREE.Color(o.background);
  if (o.fog && o.background) scene.fog = new THREE.Fog(o.background, o.fog[0], o.fog[1]);

  // Soft, image-based fill from a procedural room: gives clay its gentle gradients and paper its sheen.
  let envRT: THREE.WebGLRenderTarget;
  if (warm) {
    envRT = createWarmEnvironment(renderer);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 1.0;
  } else {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    envRT = pmrem.fromScene(room, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.38;
    room.dispose?.();
    pmrem.dispose();
  }

  const camera = new THREE.PerspectiveCamera(o.fov ?? 30, 1, 0.1, 400);

  const hemi = new THREE.HemisphereLight(PAL.sky, "#9c8c76", warm ? 0 : 0.42);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(warm ? "#fff6ea" : PAL.sun, warm ? 3.2 : 3.4);
  sun.castShadow = true;
  const ss = o.shadowSize ?? 2048;
  sun.shadow.mapSize.set(ss, ss);
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3.5;
  scene.add(sun);
  scene.add(sun.target);

  const aimSun = (target: THREE.Vector3, halfSize: number, dir = SUN_DIR) => {
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(dir, halfSize * 4 + 20);
    const c = sun.shadow.camera;
    c.left = -halfSize;
    c.right = halfSize;
    c.top = halfSize;
    c.bottom = -halfSize;
    c.near = 0.5;
    c.far = halfSize * 8 + 60;
    c.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
  };
  aimSun(new THREE.Vector3(), 8);

  const resize = (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  return {
    renderer,
    scene,
    camera,
    sun,
    hemi,
    resize,
    aimSun,
    render: () => renderer.render(scene, camera),
    dispose: () => {
      envRT.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      // release the GL context itself (not just its resources): browsers cap live contexts (Chrome: 16).
      // A context that is already lost has nothing to release, and asking it for WEBGL_lose_context
      // only gets null back (three then warns "extension not supported")
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    },
  };
}

/* ---------------------------------------------------------------- the warm look (research 02) */

let agxLook: boolean | null = null;
/**
 * three's AgX (r186) plus the Blender/Filament "look" step (ASC-CDL power 1.1, saturation 1.08)
 * after the sigmoid. Installed once into ShaderChunk; used via THREE.CustomToneMapping.
 */
export function installAgxLook(power = 1.1, saturation = 1.08) {
  if (agxLook !== null) return agxLook;
  const marker = "vec3 CustomToneMapping( vec3 color ) { return color; }";
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (!chunk.includes(marker)) return (agxLook = false);
  const f = (n: number) => n.toFixed(4);
  const glsl = `
vec3 CustomToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
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
}`;
  THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(marker, glsl);
  return (agxLook = true);
}

/**
 * A procedural warm studio for image-based lighting (no network, no HDR file): a window softbox on the
 * sun side, a ceiling glow, a warm floor bounce and a dim fill opposite the key. Models clay form far
 * better than RoomEnvironment, which is flat and neutral.
 */
export function createWarmEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#7d7568");
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const panel = (hex: string, power: number, pos: THREE.Vector3, w: number, h: number) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.copy(pos);
    mesh.scale.set(w, h, 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  const k = SUN_DIR.clone().normalize();
  panel("#fffaf2", 5, k.clone().multiplyScalar(6), 4.5, 3);
  panel("#f4e9d8", 1.8, new THREE.Vector3(0, 7, 0), 9, 9);
  panel("#bdb19f", 0.9, new THREE.Vector3(0, -5, 0), 16, 16);
  panel("#ebe7e0", 1.2, new THREE.Vector3(-k.x, 0.35, -k.z).normalize().multiplyScalar(6), 5, 3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.035, 0.1, 50);
  pmrem.dispose();
  plane.dispose();
  mats.forEach((m) => m.dispose());
  return rt;
}
