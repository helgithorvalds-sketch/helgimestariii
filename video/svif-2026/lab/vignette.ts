// Vignette lab (round 3): the "Meira um hugmyndina" panel with one vignette, faithful to the site
// (same fitting, same overlay layer, same copy).
//   ?key=iceland&kind=home&t=1                        a 600² square (old look)
//   &layout=wide&w=1240&h=697   | &layout=tall&w=350&h=590   the desktop / phone panel with its text
//   &layout=poster&size=1600    the still: the square frame centred with STILL_OVERSCAN margin
//   &nolabels &debug (scene rect) &dpr=1 &rect=x,y,w,h (the site's measured scene area, panel px)
// window.__svif.render(t) draws a frame; __svif.overlays(t) returns them in % of the square frame;
// __svif.box() the vignette's content box.
import * as THREE from "three";
import { createVignetteRuntime, factoriesFor } from "@three/vignettes";
import type { ProjectedOverlay, VignetteFrame, VignetteKey, VignetteKind } from "@three/vignettes";
import { IDEA_BIZ, IDEA_HOME } from "../svif/src/components/idea/copy";
import { DEFAULT_BOX, alignFor, fitFrame } from "../svif/src/components/idea/frame";
import { OverlayLayer, type OverlayPoint } from "../svif/src/components/idea/overlay";
import { STILL_OVERSCAN } from "../svif/src/components/idea/stills";
import "../svif/src/components/idea/idea.css";

const q = new URLSearchParams(location.search);
const key = (q.get("key") ?? "crowd") as VignetteKey;
const kind = (q.get("kind") ?? "home") as VignetteKind;
const layout = q.get("layout") ?? "square";
const size = +(q.get("size") ?? "600");
const W = layout === "square" || layout === "poster" ? size : +(q.get("w") ?? (layout === "tall" ? 350 : 1240));
const H = layout === "square" || layout === "poster" ? size : +(q.get("h") ?? (layout === "tall" ? 590 : 697));
const copy = kind === "biz" ? IDEA_BIZ : IDEA_HOME;
const item = copy.items.find((it) => it.vignette === key) ?? copy.items[0];
const copyWords: Record<string, string> = item.figure ? { ...item.labels, figure: `${item.figure.value}|${item.figure.unit}` } : item.labels;
const words: Record<string, string> = copyWords;

const panel = document.getElementById("panel") as HTMLDivElement;
panel.style.width = W + "px";
panel.style.height = H + "px";
if (q.has("round") || layout === "wide" || layout === "tall") panel.classList.add("round");
if (q.has("debug")) panel.classList.add("debug");
const canvas = document.getElementById("c") as HTMLCanvasElement;
const ov = document.getElementById("ov") as HTMLDivElement;
const sceneEl = document.getElementById("scene") as HTMLDivElement;
const text = document.getElementById("text") as HTMLDivElement;
const ctrl = document.getElementById("ctrl") as HTMLDivElement;
if (layout === "poster" || q.has("nolabels")) (document.getElementById("info") as HTMLDivElement).style.display = "none";

/* the panel's text and scene area, as the site lays them out (idea.css) */
let rect = { x: 0, y: 0, w: W, h: H };
if (layout === "wide" || layout === "tall") {
  const n = String(copy.items.indexOf(item) + 1).padStart(2, "0");
  text.innerHTML = `<p class="n">${n} / 06</p><h3>${item.caps} <i>${item.accent}</i></h3><p class="a">${item.answer.join(" ")}</p>`;
  text.style.display = "block";
  ctrl.innerHTML = `<b>‹</b><span>01&nbsp;&nbsp;&nbsp;02&nbsp;&nbsp;&nbsp;03&nbsp;&nbsp;&nbsp;04&nbsp;&nbsp;&nbsp;05&nbsp;&nbsp;&nbsp;06</span><b>›</b>`;
  ctrl.style.display = "flex";
  if (layout === "wide") {
    const pad = Math.min(56, Math.max(32, 0.035 * 1440));
    const col = Math.min(470, Math.max(330, 0.37 * W));
    Object.assign(text.style, { left: pad + "px", top: pad + "px", width: col - pad - 8 + "px" });
    text.style.setProperty("--tsize", "32px");
    Object.assign(ctrl.style, { left: pad - 12 + "px", bottom: pad * 0.62 + "px" });
    rect = { x: col, y: pad * 0.6, w: W - col - pad * 0.6, h: H - pad * 0.6 - pad * 0.5 };
  } else {
    const pad = 21;
    Object.assign(text.style, { left: pad + "px", top: pad + "px", width: W - 2 * pad + "px" });
    text.style.setProperty("--tsize", "22px");
    text.style.setProperty("--asize", "15px");
    Object.assign(ctrl.style, { left: "8px", right: "8px", bottom: "8px", justifyContent: "space-between" });
    const sceneH = Math.min(520, Math.max(220, 0.68 * (W + 40)));
    const top = H - 54 - sceneH;
    rect = { x: 8, y: top, w: W - 16, h: sceneH };
  }
  // &rect=x,y,w,h: the scene area exactly as measured on the site (.idea-scene in .idea-frame)
  const rq = q.get("rect")?.split(",").map(Number);
  if (rq && rq.length === 4 && rq.every(Number.isFinite)) rect = { x: rq[0], y: rq[1], w: rq[2], h: rq[3] };
}
Object.assign(sceneEl.style, { left: rect.x + "px", top: rect.y + "px", width: rect.w + "px", height: rect.h + "px" });

const rt = createVignetteRuntime({ canvas, kind, factories: factoriesFor(kind), preserve: true, maxDpr: +(q.get("dpr") ?? "1") });
rt.resize(W, H);
let frame: VignetteFrame = { x: 0, y: 0, s: size };
const layer = new OverlayLayer(ov);

function place() {
  const box = rt.current?.box ?? DEFAULT_BOX;
  if (layout === "poster") {
    const s = size / STILL_OVERSCAN;
    frame = { x: (size - s) / 2, y: (size - s) / 2, s };
  } else if (layout === "square") {
    frame = { x: 0, y: 0, s: size };
  } else frame = fitFrame(box, rect, alignFor(W, H));
  rt.setFrame(frame);
}

const bounds = () => ({ x0: rect.x, y0: rect.y, x1: rect.x + rect.w, y1: rect.y + rect.h });
const render = (t: number) => {
  const list = rt.draw(t) as OverlayPoint[];
  if (!q.has("nolabels") && layout !== "poster") layer.update(list, words, bounds());
  (document.getElementById("info") as HTMLDivElement).textContent = `${kind} ${key} t=${t.toFixed(2)}`;
  return true;
};
const pct = (v: number | undefined, o: number) => (v === undefined || !Number.isFinite(v) ? undefined : ((v - o) / frame.s) * 100);
(window as any).__svif = {
  render,
  overlays: (t: number) =>
    (rt.draw(t) as ProjectedOverlay[]).map((o) => ({
      ...o,
      x: pct(o.x, frame.x),
      y: pct(o.y, frame.y),
      ax: pct(o.ax, frame.x),
      ay: pct(o.ay, frame.y),
    })),
  box: () => rt.current?.box ?? DEFAULT_BOX,
  frame: () => frame,
  collide,
  // for flat-colour ID masks (r3fix-idea/maskcheck.cjs)
  MeshBasic: THREE.MeshBasicMaterial,
  rt,
};
/*
 * Intersection check (round 3, items 1 and 6): a vignette may list its things on
 * `group.userData.colliders` ({ name, obj, allow?(other, t) }). __svif.collide(step) samples t from 0
 * to 1 and reports, per pair of things present (visible, opacity > 0.02), any two of their meshes'
 * oriented boxes intersecting (each box shrunk 2 mm for resting contact), and any box corner below
 * the pedestal top (y < −2 mm).
 */
interface VCollider {
  name: string;
  obj: THREE.Object3D;
  allow?: (other: string, t: number) => boolean;
}
/** an oriented box: centre, unit axes, half sizes (separating-axis test below) */
interface Box {
  c: THREE.Vector3;
  u: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  e: [number, number, number];
}
function meshOBB(bb: THREE.Box3, mw: THREE.Matrix4): Box {
  const c = bb.getCenter(new THREE.Vector3()).applyMatrix4(mw);
  const h = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const el = mw.elements;
  const ax = new THREE.Vector3(el[0], el[1], el[2]);
  const ay = new THREE.Vector3(el[4], el[5], el[6]);
  const az = new THREE.Vector3(el[8], el[9], el[10]);
  const sx = ax.length() || 1;
  const sy = ay.length() || 1;
  const sz = az.length() || 1;
  return {
    c,
    u: [ax.divideScalar(sx), ay.divideScalar(sy), az.divideScalar(sz)],
    // shrunk 2 mm: resting contact is not a hit
    e: [Math.max(0.0004, h.x * sx - 0.002), Math.max(0.0004, h.y * sy - 0.002), Math.max(0.0004, h.z * sz - 0.002)],
  };
}
const _axis = new THREE.Vector3();
const _d = new THREE.Vector3();
function boxesHit(A: Box, B: Box) {
  _d.subVectors(B.c, A.c);
  const axes: THREE.Vector3[] = [...A.u, ...B.u];
  for (const a of A.u) for (const b of B.u) {
    const x = new THREE.Vector3().crossVectors(a, b);
    if (x.lengthSq() > 1e-10) axes.push(x.normalize());
  }
  for (const n of axes) {
    _axis.copy(n);
    const ra = A.e[0] * Math.abs(A.u[0].dot(_axis)) + A.e[1] * Math.abs(A.u[1].dot(_axis)) + A.e[2] * Math.abs(A.u[2].dot(_axis));
    const rb = B.e[0] * Math.abs(B.u[0].dot(_axis)) + B.e[1] * Math.abs(B.u[1].dot(_axis)) + B.e[2] * Math.abs(B.u[2].dot(_axis));
    if (Math.abs(_d.dot(_axis)) > ra + rb) return false;
  }
  return true;
}
function visibleDeep(o: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}
function solid(m: THREE.Mesh) {
  if (m.userData.prepass) return false;
  const mats = Array.isArray(m.material) ? m.material : [m.material];
  return mats.some((x) => x.depthWrite !== false && (x.opacity ?? 1) > 0.02 && !(x as THREE.MeshBasicMaterial).map?.userData?.blob);
}
function collide(step = 0.02) {
  const vg = rt.current;
  if (!vg) return [];
  const list = [...((vg.group.userData.colliders ?? []) as VCollider[])];
  // &probe: a deliberate offender (a box sunk into the pedestal across the scene's middle) proves
  // the check reports what it should
  if (q.has("probe")) {
    const pr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial());
    pr.position.set(+(q.get("px") ?? "0"), 0.1, +(q.get("pz") ?? "-0.6"));
    vg.group.add(pr);
    list.push({ name: "probe", obj: pr });
  }
  const issues = new Map<string, { kind: string; a: string; b?: string; t0: number; t1: number; worst: number }>();
  const note = (kind: string, a: string, b: string | undefined, t: number, v = 0) => {
    const k = `${kind}|${a}|${b ?? ""}`;
    const it = issues.get(k);
    if (it) {
      it.t1 = t;
      it.worst = Math.max(it.worst, v);
    } else issues.set(k, { kind, a, b, t0: t, t1: t, worst: v });
  };
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  for (let t = 0; t <= 1 + 1e-9; t = Math.round((t + step) * 1e6) / 1e6) {
    vg.update(t);
    vg.group.updateMatrixWorld(true);
    const items = list.map((c) => {
      const boxes: { o: Box; mesh: string }[] = [];
      const aabb = new THREE.Box3();
      if (visibleDeep(c.obj))
        c.obj.traverse((x) => {
          const m = x as THREE.Mesh;
          if (!m.isMesh || !visibleDeep(m) || !solid(m)) return;
          m.geometry.computeBoundingBox();
          const bb = m.geometry.boundingBox!;
          if (bb.isEmpty()) return;
          boxes.push({ o: meshOBB(bb, m.matrixWorld), mesh: m.name || m.userData.part || m.type });
          aabb.union(bb.clone().applyMatrix4(m.matrixWorld));
        });
      return { c, boxes, aabb };
    });
    for (const it of items) {
      for (const b of it.boxes) {
        let k = 0;
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1])
          corners[k++].copy(b.o.c).addScaledVector(b.o.u[0], sx * b.o.e[0]).addScaledVector(b.o.u[1], sy * b.o.e[1]).addScaledVector(b.o.u[2], sz * b.o.e[2]);
        const minY = Math.min(...corners.map((p) => p.y));
        if (minY < -0.002) note("GROUND", `${it.c.name}/${b.mesh}`, undefined, t, -minY);
        // standing over the pedestal's rim (its top ends at r = 2.4, the bevel starts 5 cm in)
        if (vg.pedestal !== false) {
          const out = Math.max(...corners.filter((p) => p.y < 0.08).map((p) => Math.hypot(p.x, p.z) - 2.33), -1);
          if (out > 0) note("RIM", `${it.c.name}/${b.mesh}`, undefined, t, out);
        }
      }
    }
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i];
        const B = items[j];
        if (!A.boxes.length || !B.boxes.length || !A.aabb.intersectsBox(B.aabb)) continue;
        if (A.c.allow?.(B.c.name, t) || B.c.allow?.(A.c.name, t)) continue;
        let hit = "";
        for (const a of A.boxes) {
          for (const b of B.boxes)
            if (boxesHit(a.o, b.o)) {
              hit = `${a.mesh}×${b.mesh}`;
              break;
            }
          if (hit) break;
        }
        if (hit) note("HIT", `${A.c.name}`, `${B.c.name} (${hit})`, t);
      }
  }
  render(1);
  return [...issues.values()].map((i) => `${i.kind} t ${i.t0.toFixed(2)}–${i.t1.toFixed(2)} ${i.a}${i.b ? " × " + i.b : ""}${i.worst ? ` (${(i.worst * 1000).toFixed(1)} mm)` : ""}`);
}

// &orbit=elev,azim,dist[&target=x,y,z][&fov=f]: inspect the scene from a free camera (the vignette's
// own motion still runs; only its pose is replaced)
function inspect(v: { pose: (t: number, out: { pos: any; target: any; fov: number }) => void }) {
  const o = q.get("orbit");
  if (!o) return;
  const [el, az, dist] = o.split(",").map(Number);
  const tg = (q.get("target") ?? "0,0.3,0").split(",").map(Number);
  const fov = +(q.get("fov") ?? "26");
  const own = v.pose.bind(v);
  v.pose = (t, out) => {
    own(t, out);
    const e = (el * Math.PI) / 180;
    const a = (az * Math.PI) / 180;
    out.target.set(tg[0], tg[1], tg[2]);
    out.pos.set(tg[0] + dist * Math.cos(e) * Math.sin(a), tg[1] + dist * Math.sin(e), tg[2] + dist * Math.cos(e) * Math.cos(a));
    out.fov = fov;
  };
}

(window as any).__ready = rt.prepare(key).then(async (v) => {
  if (v) inspect(v as any);
  rt.use(key);
  place();
  await (document as Document & { fonts: FontFaceSet }).fonts.ready;
  layer.remeasure();
  render(+(q.get("t") ?? "1"));
  return !!v;
});
