import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { pacedWheelDelta, homeStoryPace } from "./scroll-input";

describe("paced wheel input", () => {
  test("small gestures remain proportional", () => {
    assert.equal(pacedWheelDelta(40, 0, 960), 30);
  });
  test("large gestures and repeated bursts cannot queue more than 240 pixels at 960px height", () => {
    let pending = 0;
    for (let i = 0; i < 100; i++) pending += pacedWheelDelta(2000, pending, 960);
    assert.equal(pending, 240);
    assert.equal(pacedWheelDelta(2000, pending, 960), 0);
  });
  test("reverse scrolling cancels forward momentum immediately", () => {
    const pending = 240;
    assert.equal(pending + pacedWheelDelta(-40, pending, 960), -30);
  });
  test("upward bursts have the same bound", () => {
    assert.equal(pacedWheelDelta(-2000, 0, 960), -240);
  });
  test("short viewports use a smaller queue", () => {
    assert.equal(pacedWheelDelta(2000, 0, 600), 150);
  });
  test("step boundaries run at 20% pace while resting portions run at 40%", () => {
    assert.equal(homeStoryPace(2), 0.2);
    assert.equal(homeStoryPace(2.5), 0.4);
    assert.ok(Math.abs(homeStoryPace(1.9) - homeStoryPace(2.1)) < 1e-10);
    assert.ok(homeStoryPace(2.1) < homeStoryPace(2.2));
  });
  test("boundary bursts queue only one fifth of normal travel", () => {
    assert.ok(Math.abs(pacedWheelDelta(2000, 0, 960, homeStoryPace(2)) - 48) < 1e-10);
    assert.equal(pacedWheelDelta(40, 0, 960), 30);
  });
});
