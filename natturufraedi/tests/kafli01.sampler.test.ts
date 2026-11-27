import { describe, it, expect } from "vitest";
import { SHOTS, TOTAL, is3D, lavaFront, fissure, LAVA_STOP } from "../src/kaflar/kafli01/story";

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
  it("lavaFront creeps toward the harbour mouth and stops 100 m short", () => {
    expect(LAVA_STOP).toBe(100);
    expect(lavaFront(1)).toBeCloseTo(LAVA_STOP, 6);
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
});
