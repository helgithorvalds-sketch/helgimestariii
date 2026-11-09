/**
 * Collision lab for the home story (round-2 rule: nothing ever passes through the ground, the plinth,
 * another object or the booklet, at any g).
 *
 *   collide.html?aspect=2.4&step=0.01&lite
 *
 * Samples g from 0 to the end every `step`. For every object the story registers (createHomeStory's
 * `colliders` hook) that is present at g, each of its meshes becomes an oriented box (geometry
 * bounds recomputed every sample, so bending pages and swinging doors count). Reports:
 *   - GROUND: any box corner below y = 0 (−2 mm tolerance)
 *   - HIT:    two different objects' boxes intersecting (each box shrunk 2.5 mm for resting contact),
 *             unless one object declares the other allowed at that g (a booklet in a letterbox)
 *   - CAMERA: the camera inside an object's box (grown by the near plane)
 * Results: the page text and window.__report.
 */
import * as THREE from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { createStage } from "@three/core";
import { createHomeStory, type HomeCollider } from "@three/stories/home";
import { createBusinessStory } from "@three/stories/business";
import { texturesReady } from "@three/textures";

// ?story=biz checks the business story (/fyrirtaeki) instead of the home story
const q = new URLSearchParams(location.search);
const aspect = +(q.get("aspect") ?? "2.4");
const step = +(q.get("step") ?? "0.01");
const biz = q.get("story") === "biz";
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30, maxDpr: 1, shadowSize: 256 });
stage.resize(320, 180);
const colliders: HomeCollider[] = [];
const story = biz ? createBusinessStory(stage, { lite: q.has("lite"), colliders }) : createHomeStory(stage, { lite: q.has("lite"), colliders });
// ?probe: a deliberate offender (a box sunk into the ground through the house's wall, from g 1 to 2,
// and one crossing the booklet's page) proves the checker reports what it should
if (q.has("probe")) {
  const probe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial());
  probe.position.set(1.0, 0.1, 0.8);
  stage.scene.add(probe);
  colliders.push({ name: "probe-wall", obj: probe, active: (g) => g >= 1 && g <= 2 });
  const probe2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial());
  probe2.position.set(0.3, 0.1, 2.3);
  stage.scene.add(probe2);
  colliders.push({ name: "probe-page", obj: probe2, active: (g) => g >= 1.5 && g <= 1.6 });
}

const EPS_SHRINK = 0.0025;
const GROUND_TOL = -0.002;

interface Item {
  c: HomeCollider;
  boxes: OBB[];
  aabb: THREE.Box3;
}

const tmpBox = new THREE.Box3();
const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

function visibleDeep(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
/** shadows, decals and overlays are not things */
function physical(m: THREE.Mesh) {
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  return mats.some((x) => x.depthWrite !== false && !(x as THREE.ShaderMaterial).isShaderMaterial);
}

/**
 * An oriented box for a geometry box under a world matrix. (three's OBB.applyMatrix4 adds the
 * translation to the box centre without rotating or scaling the centre's offset, which is wrong for
 * any geometry not centred on its origin, so the box is built here from the matrix columns.)
 */
const _cx = new THREE.Vector3();
const _cy = new THREE.Vector3();
const _cz = new THREE.Vector3();
function meshOBB(bb: THREE.Box3, mw: THREE.Matrix4) {
  const o = new OBB();
  bb.getCenter(o.center).applyMatrix4(mw);
  bb.getSize(o.halfSize).multiplyScalar(0.5);
  const e = mw.elements;
  _cx.set(e[0], e[1], e[2]);
  _cy.set(e[4], e[5], e[6]);
  _cz.set(e[8], e[9], e[10]);
  const sx = _cx.length() || 1;
  const sy = _cy.length() || 1;
  const sz = _cz.length() || 1;
  o.halfSize.set(o.halfSize.x * sx, o.halfSize.y * sy, o.halfSize.z * sz);
  _cx.divideScalar(sx);
  _cy.divideScalar(sy);
  _cz.divideScalar(sz);
  // Matrix3.set is row-major: the columns are the box axes
  o.rotation.set(_cx.x, _cy.x, _cz.x, _cx.y, _cy.y, _cz.y, _cx.z, _cy.z, _cz.z);
  return o;
}

function obbCorners(o: OBB, out: THREE.Vector3[]) {
  const r = o.rotation.elements;
  const ax = new THREE.Vector3(r[0], r[1], r[2]).multiplyScalar(o.halfSize.x);
  const ay = new THREE.Vector3(r[3], r[4], r[5]).multiplyScalar(o.halfSize.y);
  const az = new THREE.Vector3(r[6], r[7], r[8]).multiplyScalar(o.halfSize.z);
  let k = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out[k++].copy(o.center).addScaledVector(ax, sx).addScaledVector(ay, sy).addScaledVector(az, sz);
  return out;
}

function gather(g: number): Item[] {
  const items: Item[] = [];
  for (const c of colliders) {
    if (!c.active(g)) continue;
    const boxes: OBB[] = [];
    const aabb = new THREE.Box3();
    if (c.box) {
      const b = c.box(g);
      if (!b) continue;
      boxes.push(new OBB().fromBox3(b));
      aabb.copy(b);
    } else if (c.obj) {
      c.obj.updateMatrixWorld(true);
      c.obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !visibleDeep(m) || !physical(m)) return;
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox!;
        if (bb.isEmpty()) return;
        // a turning wheel is round: test it in its axle frame (the frame without the spin)
        const mw = m.userData.axle && m.parent?.parent ? m.parent.parent.matrixWorld : m.matrixWorld;
        boxes.push(meshOBB(bb, mw));
        aabb.union(tmpBox.copy(bb).applyMatrix4(mw));
      });
    }
    if (boxes.length) items.push({ c, boxes, aabb });
  }
  return items;
}

const shrink = (o: OBB) => {
  const s = o.clone();
  s.halfSize.set(Math.max(0.0004, s.halfSize.x - EPS_SHRINK), Math.max(0.0004, s.halfSize.y - EPS_SHRINK), Math.max(0.0004, s.halfSize.z - EPS_SHRINK));
  return s;
};

interface Issue {
  kind: "GROUND" | "HIT" | "CAMERA";
  a: string;
  b?: string;
  g0: number;
  g1: number;
  worst: number;
}

async function run() {
  await texturesReady();
  await (story as { ready?: Promise<void> }).ready;
  const issues = new Map<string, Issue>();
  const note = (kind: Issue["kind"], a: string, b: string | undefined, g: number, v: number) => {
    // group the town's many houses under one name per kind
    const key = `${kind}|${a}|${b ?? ""}`;
    const it = issues.get(key);
    if (it) {
      it.g1 = g;
      it.worst = Math.max(it.worst, v);
    } else issues.set(key, { kind, a, b, g0: g, g1: g, worst: v });
  };
  const end = story.steps;
  let samples = 0;
  const t0 = performance.now();
  for (let g = 0; g <= end + 1e-9; g = Math.round((g + step) * 1e6) / 1e6) {
    // the director fits shots to this aspect (the scene area StoryStage gives the story)
    stage.camera.aspect = aspect;
    stage.camera.updateProjectionMatrix();
    story.frame(g);
    samples++;
    const items = gather(g);
    // ground
    for (const it of items) {
      let minY = Infinity;
      for (const b of it.boxes) for (const p of obbCorners(b, corners)) minY = Math.min(minY, p.y);
      if (minY < GROUND_TOL) note("GROUND", it.c.name, undefined, g, -minY);
    }
    // pairs
    const shr = items.map((it) => it.boxes.map(shrink));
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i];
        const B = items[j];
        // static town against static town is checked once (g = end)
        const townA = !!A.c.box;
        const townB = !!B.c.box;
        if (townA && townB && g < end - 1e-9) continue;
        if (!A.aabb.intersectsBox(B.aabb)) continue;
        if (A.c.allow?.(B.c.name, g) || B.c.allow?.(A.c.name, g)) continue;
        let hit = false;
        for (const a of shr[i]) {
          for (const b of shr[j]) if (a.intersectsOBB(b)) {
            hit = true;
            break;
          }
          if (hit) break;
        }
        if (hit) note("HIT", A.c.name, B.c.name, g, 0);
      }
    }
    // camera
    const cam = stage.camera.position;
    for (const it of items) {
      for (const b of it.boxes) {
        const grown = b.clone();
        grown.halfSize.addScalar(0.1);
        if (grown.containsPoint(cam)) {
          note("CAMERA", it.c.name, undefined, g, 0);
          break;
        }
      }
    }
  }
  const list = [...issues.values()].sort((a, b) => a.g0 - b.g0);
  const fmt = (i: Issue) =>
    `${i.kind.padEnd(6)} g ${i.g0.toFixed(2)}–${i.g1.toFixed(2)}  ${i.a}${i.b ? "  ×  " + i.b : ""}${i.kind === "GROUND" ? `  (${(i.worst * 1000).toFixed(1)} mm below)` : ""}`;
  const text =
    `${biz ? "business" : "home"} story collision check · aspect ${aspect} · ${samples} samples (step ${step}) · ${colliders.length} registered objects · ${((performance.now() - t0) / 1000).toFixed(1)} s\n\n` +
    (list.length ? list.map(fmt).join("\n") : "No problems: nothing below the ground, no two objects intersect, the camera stays outside everything.");
  document.getElementById("out")!.textContent = text;
  (window as any).__report = { aspect, samples, objects: colliders.length, issues: list };
  return list.length;
}
(window as any).__done = run();
