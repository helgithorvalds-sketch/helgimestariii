import * as THREE from "three";
import { createStage } from "@three/core";
import { createBooklet } from "@three/builders/brochure";
import { texturesReady, contactShadow } from "@three/textures";

const q = new URLSearchParams(location.search);
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, alpha: true, preserve: true, fov: 26, exposure: +(q.get("exp") ?? "1.0") });
stage.resize(innerWidth, innerHeight);
const { scene, camera, sun, hemi } = stage;
hemi.intensity = 0.3;
sun.intensity = +(q.get("sun") ?? "2.1");
scene.environmentIntensity = +(q.get("env") ?? "0.5");
// rim light from behind-right to lift the dark cover off the dark stage
const rim = new THREE.DirectionalLight("#ffe9d2", +(q.get("rim") ?? "1.4"));
rim.position.set(4, 2, -5);
scene.add(rim);

const book = createBooklet({ renderer: stage.renderer });
const g = new THREE.Group();
g.add(book.group);
book.group.position.set(0, 0, 0);
scene.add(g);
const ry = +(q.get("ry") ?? "-0.45");
const rx = +(q.get("rx") ?? "0.95");
g.rotation.set(rx, ry, +(q.get("rz") ?? "0.12"));
g.position.set(+(q.get("x") ?? "1.55"), +(q.get("y") ?? "0.15"), 0);
book.setCover(+(q.get("cover") ?? "0"));
const cc = +(q.get("cc") ?? "0.35");
book.group.traverse((o: any) => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach((m: any) => { if (m.clearcoat !== undefined && m.map) { m.clearcoat = Math.min(m.clearcoat, cc); } }); });

// shadow catcher floor (transparent except the shadow)
stage.renderer.shadowMap.enabled = false;
const blob = contactShadow(4.6, 2.6, +(q.get("blob") ?? "0.55"));
blob.position.set(1.7, -1.75, 0.2);
scene.add(blob);

camera.position.set(0, 0.6, 9.5);
camera.lookAt(0.2, -0.2, 0);
stage.aimSun(new THREE.Vector3(1.5, -1, 0), 3.5, new THREE.Vector3(-0.55, 0.75, 0.4).normalize());
(window as any).__ready = texturesReady().then(() => {
  stage.render();
  return true;
});
