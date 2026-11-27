import { describe, it, expect } from "vitest";
import { SHOTS, TOTAL, is3D } from "../src/kaflar/kafli01/story";
// the world contract (lavaFront, fissure, lavaLobe, stateOf) lives in kafli01.world.test.ts: Task 7 deletes this file

// Task 3's scene set (handrit/kafli-01.md, Skotlisti)
const SCENES = ["stofa", "nott", "hofn", "hraun", "slongur", "idag", "bord"] as const;

describe("kafli01 sampler", () => {
  it("every scene id except bord appears in SHOTS, and its shots are 3D", () => {
    for (const sc of SCENES.filter((s) => s !== "bord")) {
      const shots = SHOTS.filter((s) => s.scene === sc);
      expect(shots.length, sc).toBeGreaterThan(0);
      for (const s of shots) expect(is3D(s.id), sc).toBe(true);
    }
  });
  it("only scene ids from the Task 3 set are used, and bord is never 3D", () => {
    for (const s of SHOTS) {
      expect(SCENES as readonly string[]).toContain(s.scene);
      if (s.scene === "bord") expect(is3D(s.id)).toBe(false);
    }
  });
  it("SHOTS are contiguous from 0 to TOTAL, with ids 1..n in order", () => {
    expect(SHOTS[0].a).toBe(0);
    SHOTS.forEach((s, i) => {
      expect(s.id).toBe(i + 1);
      expect(s.b).toBeGreaterThan(s.a);
      if (i) expect(s.a).toBe(SHOTS[i - 1].b);
    });
    expect(SHOTS[SHOTS.length - 1].b).toBe(TOTAL);
  });
  it("one 20-frame shot per scene", () => {
    for (const s of SHOTS) expect(s.b - s.a).toBe(20);
    expect(new Set(SHOTS.map((s) => s.scene)).size).toBe(SHOTS.length);
  });
});
