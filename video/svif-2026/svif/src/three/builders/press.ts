import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, glass, paper } from "../materials";
import { PAL } from "../palette";
import { contactShadow, loadTex } from "../textures";
import { ROSE_READ } from "./scenery";

/**
 * "Við prentum": a sleek two-tier clay press. The tiers are separate bodies with a real gap between
 * them (dark core recessed far behind the front), so printed copies slide out of the slot without
 * ever intersecting the machine, then settle onto a neat stack on the output tray in front.
 * Local origin: centre of the footprint on the ground; the slot faces +z.
 */
export interface Press {
  group: THREE.Group;
  /** the slot: centre height, front face z, inner depth, opening height */
  slot: { y: number; front: number; inner: number; h: number; width: number };
  /** the output tray's top surface (local) and its centre z */
  tray: { y: number; z: number; w: number; d: number };
  /** the status light / feed rollers, 0..1 while printing */
  setRun(v: number): void;
  /** named parts (collision lab) */
  parts: { name: string; obj: THREE.Object3D }[];
}

export function createPress(o: { renderer?: THREE.WebGLRenderer; logoUrl?: string } = {}): Press {
  const g = new THREE.Group();
  g.name = "press";
  const parts: Press["parts"] = [];
  const W = 2.3;
  const D = 1.25;
  const lowH = 0.46;
  const gap = 0.045;
  const upH = 0.44;
  const slotY = lowH + gap / 2;
  const front = D / 2;

  const lowMat = clay(PAL.clayShade, { roughness: 0.82 });
  const upMat = clay("#efe9de", { roughness: 0.78, sheen: 0.45 });
  const lower = new THREE.Mesh(new RoundedBoxGeometry(W, lowH, D, 3, 0.05), lowMat);
  lower.position.y = lowH / 2;
  const upper = new THREE.Mesh(new RoundedBoxGeometry(W, upH, D, 3, 0.05), upMat);
  upper.position.y = lowH + gap + upH / 2;
  // the dark core fills the gap except for a deep slot behind the front opening
  const inner = 0.95;
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.12, gap + 0.02, D - inner - 0.02),
    new THREE.MeshStandardMaterial({ color: "#2f2924", roughness: 0.8 }),
  );
  core.position.set(0, slotY, -D / 2 + (D - inner - 0.02) / 2 + 0.01);
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.12, 0.004, inner),
    new THREE.MeshStandardMaterial({ color: "#3a332d", roughness: 0.85 }),
  );
  throat.position.set(0, lowH + 0.002, front - inner / 2);
  // cheeks close the gap at the sides; the slot is the open middle
  const cheekGeo = new THREE.BoxGeometry(0.07, gap + 0.02, D - 0.07);
  const cheeks = [-1, 1].map((sx) => {
    const c = new THREE.Mesh(cheekGeo, lowMat);
    c.position.set(sx * (W / 2 - 0.05), slotY, 0);
    return c;
  });
  for (const m of [lower, upper, core, throat, ...cheeks]) {
    m.castShadow = m.receiveShadow = true;
    // the slot's walls stay their own meshes (merging them would give them one loose bounding box)
    m.userData.keep = true;
    g.add(m);
  }
  parts.push(
    { name: "press-lower", obj: lower },
    { name: "press-upper", obj: upper },
    { name: "press-cheek-l", obj: cheeks[0] },
    { name: "press-cheek-r", obj: cheeks[1] },
  );

  // a rose band along the top tier's lower edge, the status light and the logo
  const band = new THREE.Mesh(new RoundedBoxGeometry(W * 0.9, 0.022, 0.012, 1, 0.005), clay(ROSE_READ, { roughness: 0.55, sheen: 0.4 }));
  band.position.set(0, lowH + gap + 0.07, front + 0.004);
  g.add(band);
  const lightMat = new THREE.MeshPhysicalMaterial({ color: ROSE_READ, roughness: 0.4, emissive: new THREE.Color(ROSE_READ), emissiveIntensity: 0.15 });
  const light = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.012, 24), lightMat);
  light.rotation.x = Math.PI / 2;
  light.position.set(W / 2 - 0.22, lowH + gap + upH - 0.12, front + 0.005);
  g.add(light);
  if (o.logoUrl) {
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.168),
      new THREE.MeshPhysicalMaterial({ map: loadTex(o.logoUrl, o.renderer), transparent: true, roughness: 0.6, depthWrite: false }),
    );
    logo.position.set(-W / 2 + 0.36, lowH + gap + upH - 0.15, front + 0.002);
    logo.renderOrder = 2;
    g.add(logo);
  }

  // the control panel: a tilted slab with a dark screen
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.06, 0.3, 2, 0.02), upMat);
  panel.position.set(W / 2 - 0.36, lowH + gap + upH + 0.05, front - 0.24);
  panel.rotation.x = 0.32;
  const screen = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.012, 0.2, 1, 0.006), glass());
  screen.position.set(0, 0.03, 0.005);
  panel.add(screen);
  panel.castShadow = panel.receiveShadow = true;
  g.add(panel);

  // the paper feed on top: a tray of blank sheets, raised towards the back
  const feed = new THREE.Group();
  const feedTray = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.035, 0.66, 2, 0.012), clay(PAL.clayShade, { roughness: 0.82 }));
  const sheets = new THREE.Mesh(new RoundedBoxGeometry(0.92, 0.07, 0.54, 1, 0.006), paper(null, "#f6f1e7", 0));
  sheets.position.y = 0.0175 + 0.035;
  feed.add(feedTray, sheets);
  feed.position.set(-0.28, lowH + gap + upH + 0.04, -0.2);
  feed.rotation.x = -0.14;
  feed.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) m.castShadow = m.receiveShadow = true;
  });
  g.add(feed);
  parts.push({ name: "press-feed", obj: feed }, { name: "press-panel", obj: panel });

  // the output tray, on the ground in front of the slot
  const TW = 1.08;
  const TD = 1.02;
  const TH = 0.045;
  const trayZ = front + 0.06 + TD / 2;
  const tray = new THREE.Mesh(new RoundedBoxGeometry(TW, TH, TD, 2, 0.016), clay("#e6dccb", { roughness: 0.85 }));
  tray.position.set(0, TH / 2, trayZ);
  tray.castShadow = tray.receiveShadow = true;
  g.add(tray);
  parts.push({ name: "press-tray", obj: tray });

  const sh = contactShadow(W * 1.3, (D + TD + 0.2) * 1.3, 0.62);
  sh.position.set(0, 0.003, 0.4);
  g.add(sh);

  return {
    group: g,
    slot: { y: slotY, front, inner, h: gap, width: W - 2 * (0.05 + 0.035) },
    tray: { y: TH, z: trayZ, w: TW, d: TD },
    setRun(v) {
      lightMat.emissiveIntensity = 0.15 + 0.85 * Math.min(1, Math.max(0, v));
    },
    parts,
  };
}
