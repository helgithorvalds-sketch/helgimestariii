import * as THREE from "three";
import { createStage } from "./core";
import { createBooklet } from "./builders/brochure";
import { texturesReady, contactShadow } from "./textures";
import { clamp, lerp, damp, easeInOut } from "./anim";

/**
 * The hero booklet on the dark stage (transparent canvas; the section paints the gradient + sunbeam).
 * State is a pure function of three inputs, so it renders on demand:
 *   arrive 0..1  – the one-time settle after load (driven by time, `arrive` easing)
 *   open   0..1  – scroll through the hero: the cover lifts and the inside spread shows
 *   tilt  [x,y]  – damped pointer tilt, ≤ 2.5° (desktop only)
 */
export interface HeroScene {
  ready: Promise<void>;
  /**
   * `clearLeft` (site only, optional): fraction of the canvas width taken by the copy on the left.
   * On wide screens the booklet then moves right just enough to clear it (never past ~95 % of the
   * width). Without it the layout is the film's (unchanged).
   * `clearText` (site only, optional): the same for the copy's drawn text. Where the column leaves
   * too little room (4:3 screens) the booklet shrinks (≥ 0.72) until it clears the text itself.
   */
  resize(w: number, h: number, o?: { clearLeft?: number; clearText?: number }): void;
  frame(s: { arrive: number; open: number; tiltX: number; tiltY: number }): void;
  dispose(): void;
}

export function createHeroScene(
  canvas: HTMLCanvasElement,
  o: { base?: string; cover?: string; inside?: string; first?: string; mobile?: boolean } = {},
): HeroScene {
  const stage = createStage({
    canvas,
    alpha: true,
    fov: 26,
    exposure: 1.03,
    maxDpr: o.mobile ? 1.6 : 2,
  });
  const { scene, camera, sun, hemi, renderer } = stage;
  renderer.shadowMap.enabled = false;
  hemi.intensity = 0.32;
  sun.intensity = 2.8;
  scene.environmentIntensity = 0.06;
  const rim = new THREE.DirectionalLight("#ffe9d2", 1.8);
  rim.position.set(4, 2, -5);
  scene.add(rim);

  const book = createBooklet({
    renderer,
    base: o.base ?? "/svif/kafli/",
    cover: o.cover ?? "p00.jpg",
    insideCover: o.inside ?? "p01.jpg",
    firstPage: o.first ?? "p29.jpg",
  });
  book.group.traverse((obj) => {
    const m = (obj as THREE.Mesh).material as
      THREE.MeshPhysicalMaterial | THREE.MeshPhysicalMaterial[] | undefined;
    const ms = Array.isArray(m) ? m : m ? [m] : [];
    ms.forEach((mm) => {
      if (mm.clearcoat !== undefined && mm.map) mm.clearcoat = Math.min(mm.clearcoat, 0.12);
    });
  });
  const g = new THREE.Group();
  g.add(book.group);
  scene.add(g);
  const blob = contactShadow(4.6, 2.6, 0.8);
  scene.add(blob);

  let wide = true;
  let aspect = 1.6;
  let clearLeft: number | undefined;
  let clearText: number | undefined;
  // phones (portrait): the canvas is its own box under the copy (StageHero), so the booklet is centred in it
  const phone = !!o.mobile;
  const layout = () => {
    // wide screens: the booklet sits in the right half; portrait tablets: centred low, below the copy
    if (phone) {
      // fit the booklet + its shadow (≈ 2.4 × 2.4 units) to the box: ~80 % of the height, ≤ 72 % of the width
      const d = Math.max(6.5, 7.2 / aspect);
      camera.position.set(0, -1.95 + 0.114 * d, d);
      camera.lookAt(0, -1.95, 0);
      return;
    }
    camera.position.set(0, 0.6, wide ? 8.9 : 11.2);
    camera.lookAt(wide ? 0.2 : 0, wide ? -0.2 : -0.9, 0);
  };
  layout();
  stage.aimSun(new THREE.Vector3(1.5, -1, 0), 3.5, new THREE.Vector3(-0.55, 0.75, 0.4).normalize());

  let tx = 0;
  let ty = 0;
  let last = performance.now();
  return {
    ready: texturesReady(),
    resize(w, h, ro) {
      wide = w / h > 1.05;
      aspect = w / h;
      clearLeft = ro?.clearLeft;
      clearText = ro?.clearText;
      layout();
      stage.resize(w, h);
    },
    frame({ arrive, open, tiltX, tiltY }) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tx = damp(tx, tiltX, 4, dt);
      ty = damp(ty, tiltY, 4, dt);
      const a = clamp(arrive, 0, 1);
      const op = easeInOut(clamp(open, 0, 1));
      const centred = phone;
      // screen fraction of a world x at the booklet's depth ≈ 0.5 + (x − 0.2) / (4.11 · aspect);
      // the settled booklet spans ≈ bx − 1.32 … bx + 1.27 (measured at 16:10)
      let bx = wide && !centred ? 1.55 : 0;
      // site only (< 1 on 4:3 screens): the booklet's scale when the copy leaves it too little room
      let fit = 1;
      if (wide && !centred && clearLeft !== undefined) {
        const k = 4.11 * aspect;
        const need = 1.324 + 0.2 + (clearLeft + 0.035 - 0.5) * k;
        const cap = 0.2 - 1.267 + 0.45 * k;
        bx = Math.min(cap, Math.max(1.55, need));
        if (need > cap) {
          // left edge clear of the drawn text, right edge on the cap: the largest scale that fits
          const left = 0.2 + ((clearText ?? clearLeft) + 0.035 - 0.5) * k;
          const right = 0.2 + 0.45 * k;
          fit = clamp((right - left) / (1.324 + 1.267), 0.72, 1);
          bx = right - 1.267 * fit;
        }
      }
      const by = wide && !centred ? 0.15 : -1.75;
      // arrive: the film's settle (unchanged); on the site the canvas fades in meanwhile (HeroBooklet)
      g.position.set(
        bx - op * (wide && !centred ? 0.55 * fit : 0),
        by + (1 - a) * 0.55 - op * 0.1,
        (1 - a) * -0.6,
      );
      g.rotation.set(
        lerp(0.95 + 0.22, 0.95, a) - op * 0.28 + ty * 0.044,
        lerp(-0.45 - 0.16, -0.45, a) + op * 0.3 + tx * 0.044,
        lerp(0.12 + 0.08, 0.12, a) - op * 0.08,
      );
      const sc = (wide && !centred ? 1 : 0.9) * fit;
      g.scale.setScalar(sc);
      book.setCover(op * Math.PI * 0.62);
      blob.position.set(bx + (0.15 - op * 0.4) * fit, by - (centred ? 1.3 : 1.9) * fit, 0.2);
      blob.scale.setScalar(sc * (0.85 + 0.15 * a));
      (blob.material as THREE.MeshBasicMaterial).opacity = 0.8 * a;
      stage.render();
    },
    dispose() {
      stage.dispose();
    },
  };
}

/** true while the damped tilt is still travelling */
export const TILT_EPS = 1e-3;
