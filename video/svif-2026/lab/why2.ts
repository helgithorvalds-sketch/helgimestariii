// 4:5 stills from the story scenes for the "Af hverju SVIF" cards. ?story=biz for the business story.
import * as THREE from "three";
import { createStage } from "@three/core";
import { createHomeStory } from "@three/stories/home";
import { createBusinessStory } from "@three/stories/business";
import { createTown } from "@three/builders/town";
import { createDistrict } from "@three/builders/office";
import { texturesReady } from "@three/textures";

const q = new URLSearchParams(location.search);
const biz = q.get("story") === "biz";
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30, exposure: +(q.get("exp") ?? "0.92") });
stage.resize(innerWidth, innerHeight);
const story = biz ? createBusinessStory(stage, {}) : createHomeStory(stage, {});
const extra: Promise<unknown> = biz ? (story as ReturnType<typeof createBusinessStory>).ready : Promise.resolve();
// the same deterministic builders as the stories, for the marked buildings' positions
if (biz) {
  const d = createDistrict({ seed: 23, lite: false, halfX: 23, zMin: -26, zMax: 24, waves: 5, marked: 6, markRing: [5.5, 12] });
  (window as any).__marks = d.marks.map((m) => [m.pos.x, m.pos.z, m.door.x, m.door.y, m.door.z]);
} else {
  const t = createTown({ seed: 11, radius: 7, pitch: 3.2, waves: 5, marked: 6, keepClear: 2.05, markRing: [2.1, 3.3] });
  (window as any).__marks = t.marks.map((m) => [m.pos.x, m.pos.z]);
}
(window as any).__shot = (g: number, pos: number[], target: number[], fov: number, sunHalf = 6) => {
  story.frame(g);
  const cam = stage.camera;
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
  stage.aimSun(new THREE.Vector3(target[0], 0, target[2]), sunHalf);
  stage.render();
};
(window as any).__ready = Promise.all([texturesReady(), extra]).then(() => true);
