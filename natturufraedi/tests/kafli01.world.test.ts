// The Heimaey world's lasting contract (story.ts): the lava front, the fissure, the lava lobe and the per-shot story
// state. Task 7 replaces the sampler SHOTS; these functions stay, so they are tested here (Ruling 14 / M1).
import { describe, it, expect } from "vitest";
import { lavaFront, fissure, LAVA_STOP, LAVA_FAR, lavaLobe, HARBOUR_MOUTH, stateOf, FPS, ShotDef } from "../src/kaflar/kafli01/story";

describe("kafli01 world contract", () => {
  it("lavaFront creeps toward the harbour mouth and stops 100 m short", () => {
    expect(LAVA_STOP).toBe(100);
    expect(lavaFront(1)).toBeCloseTo(LAVA_STOP, 6);
    expect(lavaFront(0)).toBeCloseTo(LAVA_FAR, 6);
    expect(lavaFront(0)).toBeGreaterThan(300);
    let prev = Infinity;
    for (let u = -0.2; u <= 1.2; u += 0.05) { const d = lavaFront(u); expect(d).toBeLessThanOrEqual(prev + 1e-9); prev = d; }
    expect(lavaFront(2)).toBeCloseTo(LAVA_STOP, 6); // it never passes the stop
  });
  it("fissure fountains are 0 before the ground tears and tall once it has", () => {
    expect(fissure(-1)).toBe(0);
    expect(fissure(0)).toBe(0);
    for (const t of [1.5, 3, 10, 40]) expect(fissure(t)).toBeGreaterThan(40);
  });
  it("lavaLobe's tip is exactly D from the harbour mouth", () => {
    for (const D of [LAVA_STOP, 150, 220, 300]) {
      const { tip } = lavaLobe(D);
      expect(Math.hypot(tip[0] - HARBOUR_MOUTH[0], tip[1] - HARBOUR_MOUTH[2])).toBeCloseTo(D, 6);
    }
  });
  it("stateOf opens the fissure at fissureAt and drives fis from it", () => {
    const s: ShotDef = { id: 1, a: 0, b: 300, light: "eruption", scene: "nott", fissureAt: 100, lava: [0.2, 0.8], ash: 0.4, cone: 0 };
    expect(stateOf(s, 99)).toMatchObject({ open: false, fis: 0 });
    expect(stateOf(s, 100).open).toBe(true);
    expect(stateOf(s, 100 + 2 * FPS).fis).toBeCloseTo(fissure(2), 9);
    expect(stateOf(s, 0).D).toBeCloseTo(lavaFront(0.2), 9);
    expect(stateOf(s, 299).D).toBeCloseTo(lavaFront(0.8), 9);
    const quiet: ShotDef = { id: 2, a: 0, b: 20, light: "night", scene: "nott" };
    expect(stateOf(quiet, 10)).toMatchObject({ open: false, fis: 0, D: null });
  });
});
