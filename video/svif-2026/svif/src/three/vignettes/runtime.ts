import * as THREE from "three";
import { createStage, type Stage } from "../core";
import { PAL } from "../palette";
import { createPedestal } from "./kit";
import type { Vignette, VignetteFactory, VignetteKey, VignetteKind, VignetteOverlay, VignettePose } from "./types";

/** An overlay projected to CSS pixels of the canvas. */
export interface ProjectedOverlay {
  type: VignetteOverlay["type"];
  id: string;
  /** label / placed figure: the text point · link: the start · free figure: NaN */
  x: number;
  y: number;
  /** label / figure: the hairline's anchor (if any) · link: the end */
  ax?: number;
  ay?: number;
  opacity: number;
  draw: number;
  side?: "above" | "below";
  align?: "left" | "right";
  quiet?: boolean;
  /** figure entrance 0..1 */
  progress?: number;
}

/**
 * Where the vignette's square composition sits on the canvas, in CSS px: its top-left corner and
 * side. The rest of the canvas shows more of the same world (an off-axis lens shift, not a crop).
 */
export interface VignetteFrame {
  x: number;
  y: number;
  s: number;
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
  /** place the square composition on the canvas (null: centred, as large as fits) */
  setFrame(f: VignetteFrame | null): void;
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

/**
 * Every texture this stage's scene uses that is not the renderer's own (render targets go with it),
 * including the DFG lookup table three binds to each physical material (module-level in three).
 */
function outliving(stage: Stage) {
  const out = new Set<THREE.Texture>();
  const add = (v: unknown) => {
    const t = v as THREE.Texture | null;
    if (t && t.isTexture && !t.isRenderTargetTexture) out.add(t);
  };
  const props = stage.renderer.properties;
  const seen = new Set<THREE.Material>();
  stage.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const depth = mesh.customDepthMaterial;
    for (const m of depth ? [...mats, depth] : mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      for (const v of Object.values(m)) add(v);
      const uniforms = (m as THREE.ShaderMaterial).uniforms;
      if (uniforms) for (const u of Object.values(uniforms)) add(u?.value);
      if (props.has(m)) {
        const live = (props.get(m) as { uniforms?: Record<string, { value?: unknown }> }).uniforms;
        if (live) for (const u of Object.values(live)) add(u?.value);
      }
    }
  });
  return out;
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
  const size = { w: 1, h: 1 };
  let frame: VignetteFrame | null = null;

  const applyPose = (vg: Vignette, t: number) => {
    vg.pose(t, pose);
    const cam = stage.camera;
    cam.position.copy(pose.pos);
    // the composition is square: aspect 1, then the canvas is a window around that square
    const f = frame ?? (() => {
      const s = Math.min(size.w, size.h);
      return { x: (size.w - s) / 2, y: (size.h - s) / 2, s };
    })();
    cam.fov = pose.fov;
    cam.aspect = 1;
    cam.setViewOffset(f.s, f.s, -f.x, -f.y, size.w, size.h);
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
          // compileAsync waits on KHR_parallel_shader_compile; where the driver lacks it three only
          // warns and polls, so compile in one go instead (as StoryStage does)
          if (stage.renderer.extensions.has("KHR_parallel_shader_compile")) await stage.renderer.compileAsync(vg.group, stage.camera, stage.scene);
          else stage.renderer.compile(vg.group, stage.camera, stage.scene);
        } catch {
          /* precompiling is an optimisation */
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
      const w = size.w;
      const h = size.h;
      const cam = stage.camera;
      const px = (p: THREE.Vector3) => {
        v.copy(p).project(cam);
        return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h] as const;
      };
      const out: ProjectedOverlay[] = [];
      for (const r of raw) {
        if (r.type === "figure") {
          const at = r.at ? px(r.at) : [NaN, NaN];
          const a = r.anchor ? px(r.anchor) : undefined;
          out.push({
            type: "figure",
            id: r.id,
            x: at[0],
            y: at[1],
            ax: a?.[0],
            ay: a?.[1],
            opacity: 1,
            draw: r.draw ?? 1,
            side: r.side,
            align: r.align,
            progress: r.progress,
          });
        } else if (r.type === "label") {
          const [x, y] = px(r.at);
          const a = r.anchor ? px(r.anchor) : undefined;
          out.push({
            type: "label",
            id: r.id,
            x,
            y,
            ax: a?.[0],
            ay: a?.[1],
            opacity: r.opacity,
            draw: r.draw,
            side: r.side,
            align: r.align,
            quiet: r.quiet,
          });
        } else {
          const [x, y] = px(r.from);
          const [ax, ay] = px(r.to);
          out.push({ type: "link", id: r.id, x, y, ax, ay, opacity: r.opacity, draw: r.draw });
        }
      }
      return out;
    },
    resize(w, h) {
      if (w <= 0 || h <= 0) return;
      size.w = w;
      size.h = h;
      stage.resize(w, h);
    },
    setFrame(f) {
      frame = f && f.s > 0 ? { ...f } : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // textures that outlive this canvas (page images cached across vignettes and rebuilds, the
      // engine's contact blob, three's own DFG lookup table) carry a 'dispose' listener of this
      // renderer that three (r186) never removes: they would keep the dead renderer, its context, the
      // canvas and through it the whole old page in memory. Collected before the materials go
      // (the LUT is only reachable through their uniforms), disposed below: that drops the GPU copy
      // and the listener of every renderer that drew them; a canvas still drawing one simply
      // uploads it again on its next frame.
      const shared = outliving(stage);
      for (const vg of built.values()) {
        stage.scene.remove(vg.group);
        vg.dispose();
      }
      built.clear();
      current = null;
      for (const t of shared) t.dispose();
      // the pedestal, the environment, the renderer and the context itself
      stage.dispose();
    },
  };
  return rt;
}
