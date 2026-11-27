// I1: the islanders crowding the evacuation boats stand ON the deck (which rises toward the bow) and ride the boat's
// roll and pitch: back in the boat's own frame, every standing passenger's feet sit on deckAt(x), and every seated
// one's seat sits on the hatch or the wheelhouse roof.
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { boatsAt, N_BOATS } from "../src/kaflar/kafli01/story";
import { passengers, boatMatrix } from "../src/kaflar/kafli01/deck";
import { deckAt, HATCH, ROOF_Y } from "../src/shared/kit/boats";

describe("kafli01 boat passengers", () => {
  it("stand on the deck and sit on the hatch / wheelhouse roof, at every boat pose", () => {
    const inv = new THREE.Matrix4(), v = new THREE.Vector3();
    let n = 0;
    for (const t of [0, 0.7, 1.9, 3.3]) boatsAt("hofn", t).forEach((b, i) => {
      inv.copy(boatMatrix(b, i, t)).invert();
      for (const p of passengers(b, i, t)) {
        v.set(...p.seat).applyMatrix4(inv);
        const want = p.on === "deck" ? deckAt(v.x) : p.on === "hatch" ? HATCH.top : ROOF_Y;
        expect(Math.abs(v.y - want), `boat ${i} t ${t} ${p.on} at x ${v.x.toFixed(2)}`).toBeLessThan(0.03);
        n++;
      }
    });
    expect(n).toBeGreaterThan(4 * N_BOATS * 10); // a crowd: at least 10 on each boat
  });
  it("the deck rises toward the bow (so a constant height would bury the foredeck crowd)", () => {
    expect(deckAt(7) - deckAt(0)).toBeGreaterThan(0.3);
  });
});
