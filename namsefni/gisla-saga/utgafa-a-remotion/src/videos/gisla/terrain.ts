// Ground height functions of the Gísla sets (shared by sets.ts geometry, story.ts cameras and cast.ts feet).
// Every set lives at its own origin; world.ts shows one set per shot.
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** Stokkar in Súrnadalur: flat farm terrace (yard x -25..28, z -11..45), steep green valley sides past |x| 30,
 *  the valley climbs up behind the farm (+z), the home field drops to the fjord in front (-z, water at FJORD_Y). */
export const FJORD_Y = -22;
const yardMask = (x: number, z: number) => sm((Math.abs(x - 2) - 26) / 10) + sm((-12 - z) / 6) + sm((z - 48) / 10);
export const hStokkar = (x: number, z: number) => {
  const s = Math.max(0, Math.abs(x) - 30);
  const side = 0.9 * s + 0.0045 * s * s;
  const up = z > 50 ? 0.16 * (z - 50) + 0.0002 * (z - 50) ** 2 : 0;
  const down = z < -12 ? -30 * sm((-12 - z) / 85) : 0;
  const bump = (0.9 * Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.07) + 0.6 * Math.sin(x * 0.031 - z * 0.043)) * Math.min(1, yardMask(x, z));
  return side + up + down + bump;
};

/** Saxa: a low rocky island, plateau ~2.3 m over the sea out to r 22 m, falling under water by r ~46 m */
export const hSaxa = (x: number, z: number) => {
  const r = Math.hypot(x / 1.15, z - 2);
  const core = 2.4 * (1 - sm((r - 20) / 18)) - 3.5 * sm((r - 32) / 16);
  const bump = 0.22 * Math.sin(x * 0.35 + 0.5) * Math.cos(z * 0.3) + 0.3 * Math.sin(x * 0.12 - z * 0.09);
  return core + bump;
};

/** Dýrafjörður, the green point (Eyrarhvolsoddi): a low spit at the origin, land rising behind it (+z), fjord water
 *  at y = 0 in front (-z) */
export const hIce = (x: number, z: number) => {
  const d = Math.hypot(x / 70, (z + 15) / 55);
  const spit = 2.0 * (1 - d * d);
  const land = -4 + sm((z - 15) / 45) * (7 + 0.06 * Math.max(0, z - 60));
  const bump = 0.15 * Math.sin(x * 0.2) * Math.cos(z * 0.17);
  return Math.max(spit, land) + bump;
};
