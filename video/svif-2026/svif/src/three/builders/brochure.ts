import * as THREE from "three";
import { paper } from "../materials";
import { loadTex, pageEdgeTex } from "../textures";

/**
 * The "Nýji kaflinn" booklet: a square 20×20 cm saddle-stitched brochure.
 * 1 world unit = 10 cm, so the booklet is 2×2 units. The spine runs along the
 * left edge (x = -1); the cover lies on +y. Pages are real page images.
 *
 * Opening: `cover` rotates the front cover around the spine (0 = closed, π = flat open).
 * `leaves` are extra pages that turn with a soft paper curl.
 */
export interface Booklet {
  group: THREE.Group;
  /** front cover angle 0..π */
  setCover: (a: number) => void;
  /** turn the i-th leaf 0..π */
  setLeaf: (i: number, a: number) => void;
  leafCount: number;
  W: number;
  T: number;
}

const W = 2;
const D = 2;
const T = 0.05; // closed thickness (exaggerated slightly so it reads)
const CT = 0.006; // cover board

export interface BookletOptions {
  base?: string; // url prefix for page images
  cover?: string;
  insideCover?: string;
  firstPage?: string;
  back?: string;
  /** pairs [front, back] for each turning leaf */
  leaves?: [string, string][];
  renderer?: THREE.WebGLRenderer;
  onTexture?: () => void;
}

function curlLeafGeometry(segments = 28) {
  const g = new THREE.PlaneGeometry(W, D, segments, 1);
  g.rotateX(-Math.PI / 2); // lie flat, facing +y
  g.translate(W / 2, 0, 0); // hinge at x = 0
  return g;
}

/** Bend a flat leaf (hinged at x=0) to angle `a` with a paper-like curl. */
function bendLeaf(geo: THREE.BufferGeometry, rest: Float32Array, a: number, lift = 0) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  // curl strength peaks mid-turn
  const k = Math.sin(a) * 0.55;
  for (let i = 0; i < pos.count; i++) {
    const x0 = rest[i * 3];
    const z0 = rest[i * 3 + 2];
    const u = x0 / W; // 0 at spine, 1 at edge
    // the free edge lags behind the spine: angle grows along the page
    const ang = a - k * Math.pow(u, 1.6) * (a < Math.PI / 2 ? 1 : -1) * 0.9;
    // arc length preserved approximately by integrating small segments
    const r = x0;
    pos.setXYZ(i, Math.cos(ang) * r, Math.sin(ang) * r + lift, z0);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

export function createBooklet(o: BookletOptions = {}): Booklet {
  const base = o.base ?? "/svif/kafli/";
  const tex = (name: string) => loadTex(base + name, o.renderer, o.onTexture);
  const group = new THREE.Group();
  group.name = "booklet";

  const edge = pageEdgeTex();
  edge.wrapS = edge.wrapT = THREE.RepeatWrapping;
  const edgeMat = paper(edge, "#ffffff", 0);
  const white = paper(null, "#f7f2ea", 0);

  // back cover
  const backTex = tex(o.back ?? "p31.jpg");
  const backGeo = new THREE.BoxGeometry(W, CT, D);
  const back = new THREE.Mesh(backGeo, [white, white, white, paper(backTex), white, white]);
  back.position.set(0, CT / 2, 0);
  back.castShadow = back.receiveShadow = true;
  group.add(back);

  // page block (top face shows the first page under the cover)
  const blockH = T - CT * 2;
  const firstTex = tex(o.firstPage ?? "p02.jpg");
  const blockGeo = new THREE.BoxGeometry(W - 0.03, blockH, D - 0.02);
  const block = new THREE.Mesh(blockGeo, [edgeMat, edgeMat, paper(firstTex, "#ffffff", 0.05), white, edgeMat, edgeMat]);
  block.position.set(0.012, CT + blockH / 2, 0);
  block.castShadow = block.receiveShadow = true;
  group.add(block);

  // front cover, hinged at the spine
  const coverPivot = new THREE.Group();
  coverPivot.position.set(-W / 2, T - CT / 2, 0);
  group.add(coverPivot);
  const coverTex = tex(o.cover ?? "p00.jpg");
  const insideTex = tex(o.insideCover ?? "p01.jpg");
  // inside of the cover is seen mirrored once the cover is turned over
  insideTex.wrapS = THREE.RepeatWrapping;
  const insideMat = paper(insideTex, "#ffffff", 0.05);
  const coverGeo = new THREE.BoxGeometry(W, CT, D);
  // BoxGeometry -y face: flip u so the inside page reads correctly when the cover lies open on the left
  const uv = coverGeo.attributes.uv as THREE.BufferAttribute;
  for (let i = 12; i < 16; i++) {
    uv.setX(i, 1 - uv.getX(i));
    uv.setY(i, 1 - uv.getY(i));
  }
  const cover = new THREE.Mesh(coverGeo, [white, white, paper(coverTex, "#ffffff", 0.35), insideMat, white, white]);
  cover.position.set(W / 2, 0, 0);
  cover.castShadow = cover.receiveShadow = true;
  coverPivot.add(cover);

  // turning leaves
  const leaves: { pivot: THREE.Group; front: THREE.Mesh; backM: THREE.Mesh; rest: Float32Array }[] = [];
  (o.leaves ?? []).forEach(([f, b], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(-W / 2 + 0.004, T - CT - 0.001 - i * 0.0012, 0);
    const gf = curlLeafGeometry();
    const gb = curlLeafGeometry();
    // back side faces -y, and its image is mirrored in u
    gb.rotateZ(Math.PI);
    gb.translate(W, 0, 0);
    const front = new THREE.Mesh(gf, paper(tex(f), "#ffffff", 0.05));
    const backM = new THREE.Mesh(gb, paper(tex(b), "#ffffff", 0.05));
    front.castShadow = backM.castShadow = true;
    front.receiveShadow = backM.receiveShadow = true;
    pivot.add(front, backM);
    group.add(pivot);
    leaves.push({ pivot, front, backM, rest: Float32Array.from(gf.attributes.position.array as Float32Array) });
  });
  const restB = leaves.map((l) => Float32Array.from(l.backM.geometry.attributes.position.array as Float32Array));

  const setCover = (a: number) => {
    coverPivot.rotation.z = a;
    // a little lift so the cover clears the pages as it opens
    coverPivot.position.y = T - CT / 2 + Math.sin(a) * 0.004;
  };
  const setLeaf = (i: number, a: number) => {
    const l = leaves[i];
    if (!l) return;
    bendLeaf(l.front.geometry, l.rest, a, 0.002);
    bendLeaf(l.backM.geometry, restB[i], a, 0.0005);
  };
  return { group, setCover, setLeaf, leafCount: leaves.length, W, T };
}
