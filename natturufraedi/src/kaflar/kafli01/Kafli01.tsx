// "Ísland verður til – eldgos" (Kafli 1, Heimaey 1973) — 1080x1920 vertical cartoon science short. 3D shots: one
// Heimaey world posed per frame (world.ts) through the Geysir short's post chain (ink → lens blur → bloom → neutral
// tone map → grade). For now the timeline is the scene sampler (story.ts); Task 7 adds the real timeline, the
// captions / slams and the explainer boards ("bord" shots are flat and have no 3D layer).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../../shared/look/ink";
import { LensBlur } from "../../shared/look/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../../shared/look/grade";
import { CARD_K } from "../../shared/look/cardshade";
import { TOTAL, FLASHES, SHOTS, layersAt, dofAt, is3D } from "./story";
import "../../fonts";

export const KAFLI01_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    // the island is ~1.5 km across: keep the ink on far silhouettes (cones, terrain) longer than the Geysir valley does
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { fadeNear: 450, fadeFar: 1500 }),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  // world.ts sets the shared card gain per light (night faces dimmer); give the Geysir default back on unmount so it
  // never leaks into another composition in the same page (Remotion Studio)
  useEffect(() => () => { CARD_K.uGain.value = 1.03; }, []);
  const post = useMemo(() => (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — postprocessing child typing
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const target = world.update(id, f, cam, scene);
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.1, far: 4000 }}>
      <Inner id={id} />
    </ThreeCanvas>
  </AbsoluteFill>
);

export const Kafli01: React.FC = () => {
  const f = useCurrentFrame();
  let flash = 0;
  for (const fl of FLASHES) if (f >= fl && f < fl + 4) flash = [1, 0.75, 0.45, 0.2][f - fl];
  const layers = layersAt(f);
  const board = !layers.some((l) => is3D(l.id));
  return (
    <AbsoluteFill style={{ background: board ? "#f3e6c8" : "#0d1b3d" }}>
      {layers.filter((l) => is3D(l.id)).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
    </AbsoluteFill>
  );
};
