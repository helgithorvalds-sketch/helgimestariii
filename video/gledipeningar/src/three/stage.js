import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

export const W = 1920;
export const H = 1080;

/**
 * One WebGL renderer shared by every scene. The canvas is transparent so CSS backgrounds
 * and DOM typography can sit behind and in front of the 3D layer.
 */
export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    const r = this.renderer;
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.VSMShadowMap;

    const pmrem = new THREE.PMREMGenerator(r);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    pmrem.dispose();
  }

  /** Create a scene with the studio light rig. */
  makeScene({ fov = 30, near = 0.1, far = 200, light = 'studio', envIntensity = 1 } = {}) {
    const scene = new THREE.Scene();
    scene.environment = this.envTex;
    scene.environmentIntensity = envIntensity;
    const camera = new THREE.PerspectiveCamera(fov, W / H, near, far);
    const rig = addLights(scene, light);
    return { scene, camera, rig, contact: null, stage: this };
  }

  render(view) {
    const r = this.renderer;
    if (view.contact) view.contact.update(r, view.scene);
    if (view.before) view.before(r);
    r.setRenderTarget(null);
    r.render(view.scene, view.camera);
  }

  clear() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
  }
}

function addLights(scene, kind) {
  const rig = {};
  if (kind === 'night') {
    rig.hemi = new THREE.HemisphereLight('#B9A2FF', '#18003E', 0.55);
    rig.key = new THREE.DirectionalLight('#F3E9FF', 1.4);
    rig.key.position.set(-3, 7, 5);
    rig.rim = new THREE.DirectionalLight('#9B6BFF', 2.2);
    rig.rim.position.set(4, 3, -6);
  } else if (kind === 'mint') {
    // the VILD world: same studio key, fill and bounce tinted fresh green instead of lilac
    rig.hemi = new THREE.HemisphereLight('#FFFFFF', '#BDEBA9', 0.7);
    rig.key = new THREE.DirectionalLight('#FFFFFF', 2.0);
    rig.key.position.set(-4, 9, 6);
    rig.rim = new THREE.DirectionalLight('#F1FFE6', 0.9);
    rig.rim.position.set(6, 5, -6);
  } else if (kind === 'greennight') {
    rig.hemi = new THREE.HemisphereLight('#C8FFB0', '#06281A', 0.55);
    rig.key = new THREE.DirectionalLight('#F4FFE8', 1.4);
    rig.key.position.set(-3, 7, 5);
    rig.rim = new THREE.DirectionalLight('#7EE08A', 2.0);
    rig.rim.position.set(4, 3, -6);
  } else if (kind === 'dawn') {
    rig.hemi = new THREE.HemisphereLight('#FFF8EA', '#C2EBAE', 0.75);
    rig.key = new THREE.DirectionalLight('#FFE9C8', 2.4);
    rig.key.position.set(-6, 6, 3);
    rig.rim = new THREE.DirectionalLight('#E2FAD4', 0.8);
    rig.rim.position.set(5, 4, -5);
  } else if (kind === 'morning') {
    rig.hemi = new THREE.HemisphereLight('#FFF6EC', '#CDB8F5', 0.75);
    rig.key = new THREE.DirectionalLight('#FFE9D2', 2.4);
    rig.key.position.set(-6, 6, 3);
    rig.rim = new THREE.DirectionalLight('#E4D6FF', 0.8);
    rig.rim.position.set(5, 4, -5);
  } else {
    rig.hemi = new THREE.HemisphereLight('#FFFFFF', '#C9B5F2', 0.7);
    rig.key = new THREE.DirectionalLight('#FFFFFF', 2.0);
    rig.key.position.set(-4, 9, 6);
    rig.rim = new THREE.DirectionalLight('#EDE4FF', 0.9);
    rig.rim.position.set(6, 5, -6);
  }
  scene.add(rig.hemi, rig.key, rig.rim, rig.key.target);
  return rig;
}

/** Turn on a soft VSM shadow from the key light for object-on-object shadows. */
export function enableKeyShadow(view, { size = 1024, extent = 6, radius = 10, samples = 12, bias = -0.0004 } = {}) {
  const k = view.rig.key;
  k.castShadow = true;
  k.shadow.mapSize.set(size, size);
  const c = k.shadow.camera;
  c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
  c.near = 0.5; c.far = 40;
  k.shadow.radius = radius;
  k.shadow.blurSamples = samples;
  k.shadow.bias = bias;
  k.shadow.normalBias = 0.02;
}

/**
 * Soft contact shadow on an invisible floor (after the three.js contact shadow example).
 * Renders the scene from below into a depth texture, blurs it twice and lays it on a plane.
 */
export class ContactShadow {
  constructor({ width = 10, depth = 10, height = 2.5, res = 512, opacity = 0.55, blur = 3.2, darkness = 1.2, y = 0, color = '#2A0A5E' } = {}) {
    this.group = new THREE.Group();
    this.group.position.y = y;
    this.blur = blur;
    this.rt = new THREE.WebGLRenderTarget(res, res);
    this.rt.texture.generateMipmaps = false;
    this.rtBlur = new THREE.WebGLRenderTarget(res, res);
    this.rtBlur.texture.generateMipmaps = false;

    const planeGeo = new THREE.PlaneGeometry(width, depth).rotateX(Math.PI / 2);
    this.planeMat = new THREE.MeshBasicMaterial({
      map: this.rt.texture,
      opacity,
      transparent: true,
      depthWrite: false,
      color: new THREE.Color(color),
    });
    this.plane = new THREE.Mesh(planeGeo, this.planeMat);
    this.plane.renderOrder = -1;
    this.plane.scale.y = -1;
    this.group.add(this.plane);

    this.blurPlane = new THREE.Mesh(planeGeo);
    this.blurPlane.visible = false;
    this.group.add(this.blurPlane);

    this.cam = new THREE.OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0, height);
    this.cam.rotation.x = Math.PI / 2;
    this.group.add(this.cam);

    this.depthMat = new THREE.MeshDepthMaterial();
    this.depthMat.userData.darkness = { value: darkness };
    this.depthMat.onBeforeCompile = (shader) => {
      shader.uniforms.darkness = this.depthMat.userData.darkness;
      shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
      )}`;
    };
    this.depthMat.depthTest = false;
    this.depthMat.depthWrite = false;

    this.hBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
    this.hBlur.depthTest = false;
    this.vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
    this.vBlur.depthTest = false;
    this.res = res;
  }

  set opacity(v) {
    this.planeMat.opacity = v;
  }

  blurPass(r, amount) {
    this.blurPlane.visible = true;
    this.blurPlane.material = this.hBlur;
    this.hBlur.uniforms.tDiffuse.value = this.rt.texture;
    this.hBlur.uniforms.h.value = (amount * 1) / 256;
    r.setRenderTarget(this.rtBlur);
    r.render(this.blurPlane, this.cam);
    this.blurPlane.material = this.vBlur;
    this.vBlur.uniforms.tDiffuse.value = this.rtBlur.texture;
    this.vBlur.uniforms.v.value = (amount * 1) / 256;
    r.setRenderTarget(this.rt);
    r.render(this.blurPlane, this.cam);
    this.blurPlane.visible = false;
  }

  update(r, scene) {
    if (!this.group.visible || this.planeMat.opacity <= 0.001) return;
    const bg = scene.background;
    scene.background = null;
    const prevOverride = scene.overrideMaterial;
    this.plane.visible = false;
    scene.overrideMaterial = this.depthMat;
    const clearAlpha = r.getClearAlpha();
    r.setClearAlpha(0);
    const prevAuto = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, this.cam);
    r.shadowMap.autoUpdate = prevAuto;
    scene.overrideMaterial = prevOverride;
    this.blurPass(r, this.blur);
    this.blurPass(r, this.blur * 0.45);
    r.setRenderTarget(null);
    r.setClearAlpha(clearAlpha);
    scene.background = bg;
    this.plane.visible = true;
  }
}

/** Project a world position to overlay pixel coordinates. */
export function toScreen(v3, camera) {
  const p = v3.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z };
}
