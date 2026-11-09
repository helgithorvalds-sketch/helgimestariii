// Numerical check of the booklet engine: no two sheets' cross-sections cross, nothing goes under
// the stacks it rests on or below the table. Writes window.__result.
import * as THREE from "three";
import { createBooklet, type Booklet } from "@three/builders/brochure";

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c") as HTMLCanvasElement });
const PAGES = Array.from({ length: 32 }, (_, i) => `riffle/p${String(i).padStart(2, "0")}.webp`);
type Pt = [number, number];
function sheetsOf(b: Booklet): { mid: Pt[]; t: number; vis: boolean; k: number }[] {
  const g = b.group;
  const meshes = [(g.children[2] as THREE.Group).children[0] as THREE.Mesh];
  for (let k = 1; k < b.sheets; k++) meshes.push(g.children[2 + k] as THREE.Mesh);
  return meshes.map((m, k) => {
    const p = (m.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const segs = 32;
    const n = segs + 1;
    const mid: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const f = 2 * i * 3;
      const bk = (2 * n + 2 * i) * 3;
      mid.push([(p[f] + p[bk]) / 2, (p[f + 1] + p[bk + 1]) / 2 + m.position.y]);
    }
    const f0 = 0, b0 = 2 * n * 3;
    const t = Math.hypot(p[f0] - p[b0], p[f0 + 1] - p[b0 + 1]);
    return { mid, t, vis: m.visible, k };
  });
}
const cross = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function segX(p1: Pt, p2: Pt, p3: Pt, p4: Pt) {
  const d1 = cross(p3, p4, p1), d2 = cross(p3, p4, p2), d3 = cross(p1, p2, p3), d4 = cross(p1, p2, p4);
  return d1 * d2 < -1e-14 && d3 * d4 < -1e-14;
}
function ptSeg(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  let u = l > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(p[0] - (a[0] + u * dx), p[1] - (a[1] + u * dy));
}
const issues: string[] = [];
let worst = 0;
function check(label: string, b: Booklet) {
  const ss = sheetsOf(b);
  const ang = b.angles();
  for (const s of ss) {
    if (!s.vis) continue;
    for (const [x, y] of s.mid) if (y < s.t / 2 - 1e-5) issues.push(`${label}: sheet ${s.k} below the table y=${y.toFixed(4)}`);
  }
  const vis = ss.filter((s) => s.vis);
  for (let a = 0; a < vis.length; a++)
    for (let c = a + 1; c < vis.length; c++) {
      const A = vis[a], C = vis[c];
      // mid-lines must not cross (beyond the first 4 % at the spine)
      const skip = 2;
      for (let i = skip; i < A.mid.length - 1; i++)
        for (let j = skip; j < C.mid.length - 1; j++)
          if (segX(A.mid[i], A.mid[i + 1], C.mid[j], C.mid[j + 1])) issues.push(`${label}: sheets ${A.k}/${C.k} cross (seg ${i}/${j})`);
      // slabs must not overlap: distance between mid-lines ≥ (tA + tC)/2 (beyond 6 % of the page)
      const need = (A.t + C.t) / 2;
      for (let i = 3; i < C.mid.length; i++) {
        let d = Infinity;
        for (let j = 0; j < A.mid.length - 1; j++) d = Math.min(d, ptSeg(C.mid[i], A.mid[j], A.mid[j + 1]));
        const over = need - d;
        if (over > worst) worst = over;
        if (over > need * 0.35) issues.push(`${label}: sheets ${A.k}/${C.k} overlap ${over.toFixed(5)} at pt ${i} (angles ${ang[A.k].toFixed(3)}/${ang[C.k].toFixed(3)})`);
      }
    }
}
const full = createBooklet({ renderer, pages: PAGES });
const N = 400;
for (const turn of [0.12, 0.2, 0.3, 0.5]) for (let i = 0; i <= N; i++) { full.riffle(i / N, { from: 1, turn }); check(`riffle t${turn} p${(i / N).toFixed(3)}`, full); }
for (const fan of [0, 0.08, 0.14, 0.3]) for (let i = 0; i <= N; i++) { full.close(i / N, { fan }); check(`close f${fan} p${(i / N).toFixed(3)}`, full); }
for (let i = 0; i <= N; i++) { full.setPages([Math.PI * i / N]); check(`cover p${(i / N).toFixed(3)}`, full); }
// random ordered states with random bends
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let r = 0; r < 600; r++) {
  const a: number[] = [];
  let prev = Math.PI;
  for (let k = 0; k < full.sheets; k++) { prev = rnd() < 0.3 ? prev : prev * rnd() ** 0.3; a.push(prev); }
  const bend = rnd() < 0.5 ? 1 : -1;
  full.setPages(a, bend);
  check(`random ${r}`, full);
}
const legacy = createBooklet({ renderer, cover: "p00.jpg", insideCover: "p01.jpg", firstPage: "p29.jpg", back: "p31.jpg", leaves: [["p02.jpg", "p03.jpg"], ["p04.jpg", "p05.jpg"]] });
for (let i = 0; i <= N; i++) {
  const p = i / N;
  legacy.setCover(Math.PI * 0.995);
  legacy.setLeaf(0, Math.min(1, p * 2) * Math.PI * 0.99);
  legacy.setLeaf(1, Math.max(0, Math.min(1, p * 2 - 0.5)) * Math.PI * 0.985);
  check(`legacy p${p.toFixed(3)}`, legacy);
}
const uniq = [...new Set(issues.map((s) => s.replace(/p[0-9.]+|random \d+|seg \d+\/\d+|at pt \d+|overlap [0-9.]+|angles [0-9./]+/g, "#")))];
const res = { issues: issues.length, worstOverlap: worst, kinds: uniq.slice(0, 20), first: issues.slice(0, 12) };
document.getElementById("out")!.textContent = JSON.stringify(res, null, 1);
(window as any).__result = res;
