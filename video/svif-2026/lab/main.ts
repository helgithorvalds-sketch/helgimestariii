import * as THREE from "three";
import { createStage } from "@three/core";
import { createBooklet } from "@three/builders/brochure";
import { createHouse, createGround } from "@three/builders/house";
import { texturesReady } from "@three/textures";
import { PAL } from "@three/palette";

const q = new URLSearchParams(location.search);
const shot = q.get("shot") ?? "mix";
const tone = q.get("tone") ?? "agx";
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: q.get("bg") ?? "#cfc4b3", fog: [26, 62], preserve: true, fov: 28 });
if (tone === "neutral") stage.renderer.toneMapping = THREE.NeutralToneMapping;
if (tone === "aces") stage.renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.resize(innerWidth, innerHeight);
const { scene, camera } = stage;
scene.add(createGround(200));

const book = createBooklet({ renderer: stage.renderer, leaves: [["p03.jpg", "p04.jpg"]] });
const cover = +(q.get("cover") ?? "0");
const leaf = +(q.get("leaf") ?? "0");
book.setCover(cover);
book.setLeaf(0, leaf);

if (shot === "mix") {
  book.group.position.set(-1.2, 0.0, 1.0);
  book.group.rotation.y = 0.35;
  scene.add(book.group);
  const h = createHouse({ chimney: true });
  h.position.set(1.6, 0, -0.6);
  h.rotation.y = -0.5;
  scene.add(h);
  const h2 = createHouse({ w: 1.2, d: 1.1, h: 0.85, roof: "flat", body: PAL.clayWarm });
  h2.position.set(3.6, 0, -2.2);
  h2.rotation.y = -0.3;
  scene.add(h2);
  camera.position.set(4.5, 5.2, 8.5);
  camera.lookAt(0.6, 0.4, -0.2);
  stage.aimSun(new THREE.Vector3(0.6, 0, -0.4), 7);
} else if (shot === "book") {
  scene.add(book.group);
  book.group.rotation.y = 0.2;
  camera.position.set(0.6, 4.4, 3.6);
  camera.lookAt(0, 0, 0);
  stage.aimSun(new THREE.Vector3(0, 0, 0), 3);
} else if (shot === "town") {
  let k = 0;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    k++;
    const r = (Math.sin(k * 12.9898) * 43758.5453) % 1;
    const roof = Math.abs(r) < 0.25 ? "flat" : Math.abs(r) < 0.35 ? "mono" : "gable";
    const hh = createHouse({ w: 1.2 + Math.abs(r) * 0.8, d: 1.1 + Math.abs(r) * 0.5, h: 0.8 + Math.abs(r) * 0.9, roof, chimney: Math.abs(r) > 0.6, body: k % 5 === 0 ? PAL.clayWarm : PAL.clay, roofColor: k % 7 === 0 ? PAL.rose : PAL.clayShade });
    hh.position.set(i * 3.2 + (Math.abs(r) - 0.5) * 0.6, 0, j * 3.0);
    hh.rotation.y = (Math.round(Math.abs(r) * 3) * Math.PI) / 2;
    scene.add(hh);
  }
  camera.position.set(12, 14, 18);
  camera.lookAt(0, 0, 0);
  stage.aimSun(new THREE.Vector3(0, 0, 0), 13);
}
(window as any).__ready = texturesReady().then(() => {
  stage.render();
  return true;
});
