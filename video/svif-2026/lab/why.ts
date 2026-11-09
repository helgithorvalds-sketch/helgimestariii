import * as THREE from "three";
import { createStage } from "@three/core";
import { createHomeStory } from "@three/stories/home";
import { texturesReady } from "@three/textures";

const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30 });
stage.resize(innerWidth, innerHeight);
const story = createHomeStory(stage, {});
// shots: [g, camPos, target, fov]
const SHOTS: [number, number[], number[], number][] = (window as any).SHOTS ?? [];
(window as any).__shot = (g: number, pos: number[], target: number[], fov: number) => {
  story.frame(g);
  const cam = stage.camera;
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  cam.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
  stage.aimSun(new THREE.Vector3(target[0], 0, target[2]), 6);
  stage.render();
};
(window as any).__ready = texturesReady().then(() => true);
import { createTown } from "@three/builders/town";
const t = createTown({ seed: 11, radius: 7, pitch: 3.2, waves: 5, marked: 6, keepClear: 2.05, markRing: [2.1, 3.3] });
(window as any).__marks = t.marks.map((m) => [m.pos.x, m.pos.z]);
