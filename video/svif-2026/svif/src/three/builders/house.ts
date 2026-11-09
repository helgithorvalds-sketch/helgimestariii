import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, glass, accent } from "../materials";
import { PAL } from "../palette";
import { contactShadow } from "../textures";

export type RoofKind = "gable" | "flat" | "mono";

export interface HouseOptions {
  w?: number;
  d?: number;
  h?: number;
  roof?: RoofKind;
  pitch?: number;
  body?: string;
  roofColor?: string;
  door?: string;
  chimney?: boolean;
  windows?: boolean;
  floors?: number;
  /** a letterbox slot in the door (the hero house) */
  slot?: boolean;
}

const matCache = new Map<string, THREE.Material>();
const m = (key: string, make: () => THREE.Material) => {
  let v = matCache.get(key);
  if (!v) matCache.set(key, (v = make()));
  return v;
};

/** A clay house in the miniature world. Origin at ground level, centred. */
export function createHouse(o: HouseOptions = {}) {
  const w = o.w ?? 1.6;
  const d = o.d ?? 1.3;
  const h = o.h ?? 1.0;
  const roof = o.roof ?? "gable";
  const pitch = o.pitch ?? 0.62;
  const g = new THREE.Group();
  const body = m("body" + (o.body ?? PAL.clay), () => clay(o.body ?? PAL.clay));
  const roofMat = m("roof" + (o.roofColor ?? "#cfc2ad"), () =>
    clay(o.roofColor ?? "#cfc2ad", { roughness: 0.78 }),
  );
  const winMat = m("glass", () => glass());
  const doorMat = m("door" + (o.door ?? PAL.roseDeep), () => accent(o.door ?? PAL.roseDeep));
  g.add(contactShadow(w * 1.55, d * 1.6, 0.85));

  const bodyGeo = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.045, w * 0.03));
  const bm = new THREE.Mesh(bodyGeo, body);
  bm.position.y = h / 2;
  bm.castShadow = bm.receiveShadow = true;
  g.add(bm);

  const ov = 0.09; // roof overhang
  if (roof === "gable") {
    const rh = (w / 2) * pitch;
    const s = new THREE.Shape();
    s.moveTo(-w / 2 - ov, 0);
    s.lineTo(0, rh + ov * pitch);
    s.lineTo(w / 2 + ov, 0);
    s.lineTo(w / 2 + ov - 0.06, -0.05);
    s.lineTo(0, rh + ov * pitch - 0.075);
    s.lineTo(-w / 2 - ov + 0.06, -0.05);
    s.closePath();
    const rg = new THREE.ExtrudeGeometry(s, {
      depth: d + ov * 2,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 1,
    });
    rg.translate(0, 0, -(d + ov * 2) / 2);
    const rm = new THREE.Mesh(rg, roofMat);
    rm.position.y = h;
    rm.castShadow = rm.receiveShadow = true;
    g.add(rm);
    // gable infill
    const gs = new THREE.Shape();
    gs.moveTo(-w / 2 + 0.01, 0);
    gs.lineTo(0, rh - 0.02);
    gs.lineTo(w / 2 - 0.01, 0);
    gs.closePath();
    const gg = new THREE.ExtrudeGeometry(gs, { depth: d - 0.02, bevelEnabled: false });
    gg.translate(0, 0, -(d - 0.02) / 2);
    const gm = new THREE.Mesh(gg, body);
    gm.position.y = h - 0.01;
    gm.castShadow = gm.receiveShadow = true;
    g.add(gm);
    if (o.chimney) {
      const ch = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.16, 2, 0.02), body);
      ch.position.set(w * 0.24, h + rh * 0.62, -d * 0.18);
      ch.castShadow = ch.receiveShadow = true;
      g.add(ch);
    }
  } else if (roof === "flat") {
    const rm = new THREE.Mesh(new RoundedBoxGeometry(w + 0.08, 0.07, d + 0.08, 2, 0.02), roofMat);
    rm.position.y = h + 0.035;
    rm.castShadow = rm.receiveShadow = true;
    g.add(rm);
  } else {
    // mono-pitch: a tilted slab
    const rm = new THREE.Mesh(new RoundedBoxGeometry(w + 0.16, 0.06, d + 0.16, 2, 0.02), roofMat);
    rm.position.y = h + (w * pitch * 0.25) / 2;
    rm.rotation.z = Math.atan((w * pitch * 0.25) / w);
    rm.castShadow = rm.receiveShadow = true;
    g.add(rm);
  }

  if (o.windows !== false) {
    const floors = o.floors ?? (h > 1.4 ? 2 : 1);
    const wg = new RoundedBoxGeometry(0.24, 0.3, 0.03, 1, 0.01);
    // a two-step frame in the wall colour with a small sill; the dark pane sits just behind it
    // (close-ups showed bare slabs standing off the wall)
    const frameGeo = new RoundedBoxGeometry(0.31, 0.37, 0.026, 2, 0.01);
    const lipGeo = new RoundedBoxGeometry(0.275, 0.335, 0.034, 1, 0.006);
    const sillGeo = new RoundedBoxGeometry(0.34, 0.03, 0.06, 1, 0.01);
    // only the hero house is seen up close; the town keeps single panes (draw calls on phones)
    const framed = !!o.slot;
    const addWindow = (x: number, y: number, side = false) => {
      if (!framed) {
        const pane = new THREE.Mesh(wg, winMat);
        if (side) {
          pane.rotation.y = Math.PI / 2;
          pane.position.set(w / 2 + 0.006, y, 0);
        } else pane.position.set(x, y, d / 2 + 0.006);
        g.add(pane);
        return;
      }
      const win = new THREE.Group();
      const frame = new THREE.Mesh(frameGeo, body);
      frame.position.z = 0.004;
      const lip = new THREE.Mesh(lipGeo, body);
      lip.position.z = 0.006;
      const pane = new THREE.Mesh(wg, winMat);
      pane.scale.set(0.92, 0.92, 1);
      pane.position.z = 0.012;
      const sill = new THREE.Mesh(sillGeo, body);
      sill.position.set(0, -0.2, 0.022);
      sill.castShadow = frame.castShadow = true;
      win.add(frame, lip, pane, sill);
      if (side) {
        win.rotation.y = Math.PI / 2;
        win.position.set(w / 2, y, 0);
      } else win.position.set(x, y, d / 2);
      g.add(win);
    };
    const cols = Math.max(1, Math.round(w / 0.62));
    for (let f = 0; f < floors; f++) {
      const y = floors === 1 ? h * 0.58 : h * (0.32 + f * 0.42);
      for (let c = 0; c < cols; c++) {
        const x = cols === 1 ? w * 0.22 : -w / 2 + (w / cols) * (c + 0.5);
        if (f === 0 && Math.abs(x) < 0.2 && cols > 1) continue; // leave room for the door
        addWindow(x, y);
      }
    }
    const door = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.48, 0.035, 1, 0.012), doorMat);
    door.position.set(cols === 1 ? -w * 0.2 : 0, 0.24, d / 2 + 0.008);
    door.castShadow = true;
    g.add(door);
    if (o.slot) {
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.024, 0.012),
        new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.6 }),
      );
      slot.position.set(door.position.x, 0.31, d / 2 + 0.028);
      g.add(slot);
      const plate = new THREE.Mesh(
        new RoundedBoxGeometry(0.21, 0.05, 0.01, 1, 0.006),
        m(
          "brass",
          () =>
            new THREE.MeshPhysicalMaterial({ color: "#c8a77f", roughness: 0.35, metalness: 0.6 }),
        ),
      );
      plate.position.set(door.position.x, 0.31, d / 2 + 0.026);
      g.add(plate);
      g.userData.slot = new THREE.Vector3(door.position.x, 0.31, d / 2 + 0.03);
    }
    // side windows
    addWindow(0, h * 0.58, true);
  }
  return g;
}

/** Ground plane that takes the long soft shadows. */
export function createGround(size = 80, color: string = PAL.ground) {
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0 }),
  );
  mesh.receiveShadow = true;
  return mesh;
}
