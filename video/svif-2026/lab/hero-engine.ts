// Lab for the booklet engine: ?mode=riffle|close|legacy|pages&view=top|side|story  — __seek(p)
import * as THREE from "three";
import { createStage } from "@three/core";
import { createBooklet } from "@three/builders/brochure";
import { texturesReady, contactShadow } from "@three/textures";
import { createGround } from "@three/builders/house";

const q = new URLSearchParams(location.search);
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30 });
stage.resize(innerWidth, innerHeight);
const mode = q.get("mode") ?? "riffle";
const legacy = mode === "legacy";
const PAGES = Array.from({ length: 32 }, (_, i) => (i === 0 ? "p00.jpg" : `riffle/p${String(i).padStart(2, "0")}.webp`));
const book = legacy
  ? createBooklet({ renderer: stage.renderer, cover: "p00.jpg", insideCover: "p01.jpg", firstPage: "p29.jpg", back: "p31.jpg", leaves: [["p02.jpg", "p03.jpg"], ["p04.jpg", "p05.jpg"]] })
  : createBooklet({ renderer: stage.renderer, pages: PAGES });
const S = +(q.get("s") ?? "1");
book.group.scale.setScalar(S);
stage.scene.add(book.group);
try { stage.scene.add(createGround(400, "#d9cfc0")); } catch {}
const sh = contactShadow(5, 2.6, 0.5);
sh.position.set(-0.6, 0.002, 0);
stage.scene.add(sh);
const view = q.get("view") ?? "story";
const cam = stage.camera;
if (view === "top") { cam.position.set(-1, 9, 4.5); cam.lookAt(-1, 0, 0); }
else if (view === "side") { cam.position.set(-1, 1.2, 9); cam.lookAt(-1, 0.6, 0); }
else if (view === "low") { cam.position.set(2.5, 2.2, 6.5); cam.lookAt(-1, 0.3, 0); }
else if (view === "close") { cam.position.set(1.6, 3.4, 5.2); cam.lookAt(-0.6, 0.2, 0); }
else { cam.position.set(1.2, 5.2, 7.4); cam.lookAt(-1, 0.2, 0); }
stage.aimSun(new THREE.Vector3(-1, 0, 0), 4);
const gEl = document.getElementById("g")!;
function seek(p: number) {
  if (mode === "close") book.close(p);
  else if (mode === "legacy") {
    // the home story's two turns (g 2.0–2.36), then back
    const l0 = Math.min(1, Math.max(0, p * 2));
    const l1 = Math.min(1, Math.max(0, p * 2 - 0.5));
    book.setCover(Math.PI * 0.995);
    book.setLeaf(0, l0 * Math.PI * 0.99);
    book.setLeaf(1, l1 * Math.PI * 0.985);
  } else if (mode === "cover") book.setPages([p * Math.PI]);
  else if (mode === "one") {
    const e = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    book.setPages([Math.PI, Math.PI, e(p) * Math.PI]);
  }
  else book.riffle(p, { from: 1, turn: +(q.get("turn") ?? "0.3") });
  stage.render();
  gEl.textContent = `${mode} p=${p.toFixed(3)}`;
}
(window as any).__seek = seek;
(window as any).__book = book;
(window as any).__ready = Promise.all([texturesReady(), book.whenLoaded(32)]).then(() => { seek(+(q.get("p") ?? "0.3")); return true; });
