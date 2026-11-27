// The evacuation boats' passengers (I1): where the islanders stand and sit on each boat, in world space. A boat's
// matrix composes its pose (story.boatsAt) and motion (story.boatMotion); the Fleet uses the same matrix, so people ride
// the boat's roll and pitch. Standing people stand on deckAt(x) (the deck rises toward the bow); seated people sit on
// the cargo hatch or the wheelhouse roof.
import * as THREE from "three";
import { deckAt, HATCH, ROOF_Y, ROOF_X } from "../../shared/kit/boats";
import { BoatPose, boatMotion } from "./story";

/** boat-local spots (x forward, z starboard): who stands where, who sits on the hatch / the wheelhouse roof */
export type Spot = { lx: number; lz: number; on: "deck" | "hatch" | "roof" };
export const SPOTS: Spot[] = [
  // foredeck crowd, standing round the hatch out to the bow
  { lx: 5.4, lz: -1.4, on: "deck" }, { lx: 6.3, lz: 0.9, on: "deck" }, { lx: 7.3, lz: -0.5, on: "deck" }, { lx: 5.0, lz: 1.6, on: "deck" },
  { lx: 0.6, lz: -1.6, on: "deck" }, { lx: 0.4, lz: 1.5, on: "deck" }, { lx: 2.8, lz: -1.75, on: "deck" }, { lx: 3.4, lz: 1.75, on: "deck" },
  // aft deck behind the wheelhouse
  { lx: -7.4, lz: -1.2, on: "deck" }, { lx: -8.2, lz: 0.8, on: "deck" },
  // sitting on the hatch and on the wheelhouse roof
  { lx: 1.8, lz: -0.5, on: "hatch" }, { lx: 2.9, lz: 0.4, on: "hatch" }, { lx: 3.9, lz: -0.4, on: "hatch" },
  { lx: ROOF_X[0] + 0.4, lz: 0.6, on: "roof" }, { lx: ROOF_X[0] + 1.2, lz: -0.7, on: "roof" }, // aft of the roof box
];
const surface = (s: Spot) => (s.on === "deck" ? deckAt(s.lx) : s.on === "hatch" ? HATCH.top : ROOF_Y);

const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
/** the world matrix of boat i (pose + motion at film time t); shared object, copy it if you keep it */
export const boatMatrix = (b: BoatPose, i: number, t: number) => {
  const mo = boatMotion(b, i, t);
  return m.compose(p.set(b.x, mo.y, b.z), q.setFromEuler(e.set(mo.roll, b.yaw, mo.pitch, "YXZ")), one);
};

export type Passenger = { k: number; on: Spot["on"]; seat: [number, number, number] };
/** every passenger of boat i at time t: `seat` = world point where the feet stand (deck) or the seat rests (hatch,
 *  roof) */
export const passengers = (b: BoatPose, i: number, t: number): Passenger[] => {
  const M = boatMatrix(b, i, t), v = new THREE.Vector3();
  return SPOTS.map((s, k) => {
    v.set(s.lx, surface(s), s.lz).applyMatrix4(M);
    return { k, on: s.on, seat: [v.x, v.y, v.z] };
  });
};
