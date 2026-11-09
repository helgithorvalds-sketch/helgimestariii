import * as THREE from "three";
import type { Stage } from "./core";
import { clamp, easeInOut, lerp } from "./anim";

/**
 * A story is ONE miniature world driven by a single global progress value
 * g ∈ [0, steps]. Step k spans [k, k+1]. Everything in it (objects, camera,
 * sun, labels) is a pure function of g, so scrolling, autoplay and frame-exact
 * film rendering all produce the same pictures.
 */

export interface Pose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

/** A label drawn by the page (DOM) at a projected world position. */
export interface WorldLabel {
  id: string;
  text: string;
  /** where the label text sits */
  world: THREE.Vector3;
  /** what it points at (a hairline is drawn from here to the label) */
  anchor?: THREE.Vector3;
  /** 0..1: label opacity */
  opacity: number;
  /** 0..1: how far the hairline has drawn (defaults to opacity) */
  draw?: number;
  kind?: "callout" | "caps";
}

export interface StoryModule {
  /** set object state for global progress g */
  update(g: number): void;
  /** optional labels in world space */
  labels?(g: number, out: WorldLabel[]): void;
}

export interface CameraKey {
  /** global progress */
  g: number;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
  /** sun focus centre + half-size of the shadow box */
  focus?: [number, number, number, number];
}

/**
 * Camera director: a list of keys on the global timeline, interpolated with a
 * slow in/out between neighbours (no overshoot), plus a gentle continuous drift.
 */
export function makeDirector(keys: CameraKey[]) {
  const ks = [...keys].sort((a, b) => a.g - b.g);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  return function pose(g: number, out: Pose, focus: { center: THREE.Vector3; half: number }) {
    let i = 0;
    while (i < ks.length - 2 && g > ks[i + 1].g) i++;
    const a = ks[i];
    const b = ks[Math.min(i + 1, ks.length - 1)];
    const u = a === b ? 0 : easeInOut(clamp((g - a.g) / (b.g - a.g)));
    out.pos.copy(tmpA.fromArray(a.pos).lerp(tmpB.fromArray(b.pos), u));
    out.target.copy(tmpA.fromArray(a.target).lerp(tmpB.fromArray(b.target), u));
    out.fov = lerp(a.fov ?? 30, b.fov ?? 30, u);
    const fa = a.focus ?? [...a.target, 8];
    const fb = b.focus ?? [...b.target, 8];
    focus.center.set(lerp(fa[0], fb[0], u), lerp(fa[1], fb[1], u), lerp(fa[2], fb[2], u));
    focus.half = lerp(fa[3], fb[3], u);
  };
}

export interface ProjectedLabel {
  id: string;
  text: string;
  x: number;
  y: number;
  ax: number;
  ay: number;
  opacity: number;
  draw: number;
  kind: string;
}

export interface Story {
  steps: number;
  /** draw the world at global progress g */
  frame(g: number): void;
  /** labels for the last frame, already projected to CSS pixels */
  labels: ProjectedLabel[];
  dispose(): void;
}

export function createStory(
  stage: Stage,
  steps: number,
  modules: StoryModule[],
  director: ReturnType<typeof makeDirector>,
  opts: { designAspect?: number; maxPullback?: number } = {},
): Story {
  const designAspect = opts.designAspect ?? 1.6;
  const maxPull = opts.maxPullback ?? 2.3;
  const pose: Pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 30 };
  const focus = { center: new THREE.Vector3(), half: 8 };
  const rawLabels: WorldLabel[] = [];
  const v = new THREE.Vector3();
  const story: Story = {
    steps,
    labels: [],
    frame(g: number) {
      const gg = clamp(g, 0, steps);
      for (const m of modules) m.update(gg);
      director(gg, pose, focus);
      const cam = stage.camera;
      // narrower screens: step back along the view axis so the composition still fits
      const k = cam.aspect < designAspect ? Math.min(maxPull, Math.pow(designAspect / cam.aspect, 0.8)) : 1;
      cam.position.copy(pose.pos).sub(pose.target).multiplyScalar(k).add(pose.target);
      if (cam.fov !== pose.fov) {
        cam.fov = pose.fov;
        cam.updateProjectionMatrix();
      }
      cam.lookAt(pose.target);
      stage.aimSun(focus.center, focus.half);
      stage.render();
      // project labels
      rawLabels.length = 0;
      for (const m of modules) m.labels?.(gg, rawLabels);
      const el = stage.renderer.domElement;
      const w = el.clientWidth || el.width;
      const h = el.clientHeight || el.height;
      story.labels = rawLabels
        .filter((l) => l.opacity > 0.001)
        .map((l) => {
          v.copy(l.world).project(cam);
          const x = ((v.x + 1) / 2) * w;
          const y = ((1 - v.y) / 2) * h;
          const vis = v.z < 1;
          v.copy(l.anchor ?? l.world).project(cam);
          return { id: l.id, text: l.text, x, y, ax: ((v.x + 1) / 2) * w, ay: ((1 - v.y) / 2) * h, opacity: vis ? l.opacity : 0, draw: l.draw ?? l.opacity, kind: l.kind ?? "callout" };
        });
    },
    dispose() {
      stage.dispose();
    },
  };
  return story;
}
