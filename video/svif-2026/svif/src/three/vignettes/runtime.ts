import * as THREE from "three";
import { createStage, type Stage } from "../core";
import { PAL } from "../palette";
import { createPedestal } from "./kit";
import type { Vignette, VignetteFactory, VignetteKey, VignetteKind, VignetteOverlay, VignettePose } from "./types";

/** An overlay projected to CSS pixels of the canvas. */
export interface ProjectedOverlay {
  type: VignetteOverlay["type"];
  id: string;
  /** label: the text point · link: the start · figure: unused */
  x: number;
  y: number;
  /** label: the hairline's anchor (if any) · link: the end */
  ax?: number;
  ay?: number;
  opacity: number;
  draw: number;
  side?: "above" | "below";
  /** figure entrance 0..1 */
  progress?: number;
}

export interface VignetteRuntime {
  readonly stage: Stage;
  readonly kind: VignetteKind;
  readonly current: Vignette | null;
  /** build once, wait for its textures and compile its materials (off screen) */
  prepare(key: VignetteKey): Promise<Vignette | null>;
  /** make a prepared vignette the one that draws */
  use(key: VignetteKey): Vignette | null;
  /** draw the current vignette at t ∈ [0, 1]; returns its overlays in CSS px */
  draw(t: number): ProjectedOverlay[];
  /** CSS size of the canvas */
  resize(w: number, h: number): void;
  /** every vignette, the pedestal, the renderer and the GL context */
  dispose(): void;
}

export interface RuntimeOptions {
  canvas: HTMLCanvasElement;
  kind: VignetteKind;
  factories: Partial<Record<VignetteKey, VignetteFactory>>;
  /** panel colour: the canvas background and fog (must equal the CSS panel) */
  background?: string;
  maxDpr?: number;
  shadowSize?: number;
  /** keep the drawing buffer (lab capture) */
  preserve?: boolean;
  envIntensity?: number;
  sunIntensity?: number;
}

export function createVignetteRuntime(o: RuntimeOptions): VignetteRuntime {
  const background = o.background ?? PAL.peach;
  const stage = createStage({
    canvas: o.canvas,
    background,
    fog: null,
    fov: 26,
    maxDpr: o.maxDpr ?? 2,
    shadowSize: o.shadowSize ?? 2048,
    preserve: o.preserve,
  });
  stage.sun.shadow.radius = 3;
  // a touch more key against fill than the stories: small objects need their form modelled
  stage.scene.environmentIntensity = o.envIntensity ?? 0.82;
  stage.sun.intensity = o.sunIntensity ?? 3.5;
  const fog = new THREE.Fog(background, 30, 60);
  stage.scene.fog = fog;
  const pedestal = createPedestal();
  stage.scene.add(pedestal);

  const built = new Map<VignetteKey, Vignette>();
  const pending = new Map<VignetteKey, Promise<Vignette | null>>();
  let current: Vignette | null = null;
  let disposed = false;
  const pose: VignettePose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 26 };
  const focus = new THREE.Vector3();
  const v = new THREE.Vector3();
  const raw: VignetteOverlay[] = [];

  const applyPose = (vg: Vignette, t: number) => {
    vg.pose(t, pose);
    const cam = stage.camera;
    cam.position.copy(pose.pos);
    if (cam.fov !== pose.fov) {
      cam.fov = pose.fov;
      cam.updateProjectionMatrix();
    }
    cam.lookAt(pose.target);
    cam.updateMatrixWorld();
    const d = pose.pos.distanceTo(pose.target);
    fog.near = d + 4;
    fog.far = d + 22;
    const [fx, fy, fz, half] = vg.focus;
    stage.aimSun(focus.set(fx, fy, fz), half);
  };

  const rt: VignetteRuntime = {
    stage,
    kind: o.kind,
    get current() {
      return current;
    },
    prepare(key) {
      const hit = built.get(key);
      if (hit) return Promise.resolve(hit);
      const p = pending.get(key);
      if (p) return p;
      const make = o.factories[key];
      if (!make) return Promise.resolve(null);
      const job = (async () => {
        const vg = make(stage, { kind: o.kind });
        vg.group.visible = false;
        stage.scene.add(vg.group);
        await vg.ready;
        if (disposed) return null;
        // compile this vignette's programs (with the stage's lights) before it is first shown, so its
        // first frame has no hitch; only its own group is touched, whatever is drawing meanwhile
        vg.update(0);
        try {
          await stage.renderer.compileAsync(vg.group, stage.camera, stage.scene);
        } catch {
          /* compileAsync is an optimisation */
        }
        if (disposed) return null;
        built.set(key, vg);
        return vg;
      })();
      pending.set(key, job);
      job.finally(() => pending.delete(key));
      return job;
    },
    use(key) {
      const vg = built.get(key) ?? null;
      if (!vg) return current;
      for (const b of built.values()) b.group.visible = b === vg;
      pedestal.visible = vg.pedestal !== false;
      current = vg;
      return vg;
    },
    draw(t) {
      const vg = current;
      if (!vg || disposed) return [];
      const tt = Math.min(1, Math.max(0, t));
      vg.update(tt);
      applyPose(vg, tt);
      stage.render();
      raw.length = 0;
      vg.overlays?.(tt, raw);
      const el = stage.renderer.domElement;
      const w = el.clientWidth || el.width;
      const h = el.clientHeight || el.height;
      const cam = stage.camera;
      const px = (p: THREE.Vector3) => {
        v.copy(p).project(cam);
        return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const;
      };
      const out: ProjectedOverlay[] = [];
      for (const r of raw) {
        if (r.type === "figure") {
          out.push({ type: "figure", id: r.id, x: 0, y: 0, opacity: 1, draw: 1, progress: r.progress });
        } else if (r.type === "label") {
          const [x, y] = px(r.at);
          const a = r.anchor ? px(r.anchor) : undefined;
          out.push({ type: "label", id: r.id, x, y, ax: a?.[0], ay: a?.[1], opacity: r.opacity, draw: r.draw, side: r.side });
        } else {
          const [x, y] = px(r.from);
          const [ax, ay] = px(r.to);
          out.push({ type: "link", id: r.id, x, y, ax, ay, opacity: r.opacity, draw: r.draw });
        }
      }
      return out;
    },
    resize(w, h) {
      stage.resize(w, h);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const vg of built.values()) {
        stage.scene.remove(vg.group);
        vg.dispose();
      }
      built.clear();
      current = null;
      // the pedestal, the environment, the renderer and the context itself
      stage.dispose();
    },
  };
  return rt;
}
