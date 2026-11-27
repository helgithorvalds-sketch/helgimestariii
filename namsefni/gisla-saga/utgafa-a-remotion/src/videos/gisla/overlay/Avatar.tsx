import React from "react";
import type { CastId } from "./data";

// Flat bean-head avatar in a circle of the character's colour: bean face, two dot eyes, the character's hair/beard
// silhouette (from the cast table in serian.md). Plum ink like the 3D cards. viewBox 0..100.
const INK = "#241726";
const SKIN = "#F5D7BC";

// bean head: slightly taller than wide, pointier crown, narrower chin
export const darken = (hex: string, t: number) => {
  const c = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

const BEAN = "M50 24 C64 24 72 34 72 50 C72 66 63 78 50 78 C37 78 28 66 28 50 C28 34 36 24 50 24 Z";

const Hair: React.FC<{ id: CastId }> = ({ id }) => {
  switch (id) {
    case "gisli": // sandy-blond hair, short beard
      return (
        <>
          <path d="M27 47 C25 30 37 20 51 20 C65 20 75 30 73 47 C68 38 60 33 50 34 C42 34 33 38 27 47 Z" fill="#D8B266" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M29 56 C31 70 39 80 50 80 C61 80 69 70 71 56 C67 64 61 67 56 67 L44 67 C39 67 33 64 29 56 Z" fill="#C9A253" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M45 70 Q50 72.5 55 70" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "thorbjorn": // old father: white side hair, long flowing white beard + moustache
      return (
        <>
          <path d="M28 52 C26 36 33 26 42 24 C38 30 36 38 36 46 Z" fill="#EFEDE8" stroke={INK} strokeWidth={2.2} />
          <path d="M72 52 C74 36 67 26 58 24 C62 30 64 38 64 46 Z" fill="#EFEDE8" stroke={INK} strokeWidth={2.2} />
          <path d="M30 58 C30 74 38 104 50 108 C62 104 70 74 70 58 C64 66 58 64 50 64 C42 64 36 66 30 58 Z" fill="#F2F0EB" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M38 63 C43 58 48 59 50 61 C52 59 57 58 62 63 C57 64 53 64 50 63 C47 64 43 64 38 63 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.8} />
          <path d="M40 44 L46 45 M54 45 L60 44" stroke="#D9D6CF" strokeWidth={2.6} strokeLinecap="round" />
        </>
      );
    case "thordis": // long dark braid, dark hair with a centre parting
      return (
        <>
          <path d="M26 54 C23 32 36 19 50 19 C64 19 77 32 74 54 C70 44 64 36 50 33 C36 36 30 44 26 54 Z" fill="#3A2A21" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M50 21 L50 33" stroke="#5A4234" strokeWidth={1.6} />
          {[0, 1, 2, 3, 4].map((k) => (
            <ellipse key={k} cx={73 + k * 1.2} cy={60 + k * 9} rx={6 - k * 0.4} ry={5.4} fill="#3A2A21" stroke={INK} strokeWidth={2} />
          ))}
          <path d="M44 69 Q50 71 56 69" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "thorkell": // vain eldest son: neat combed hair with a side parting and a swoop
      return (
        <>
          <path d="M27 48 C25 30 37 20 52 20 C66 21 75 31 73 48 C70 40 66 34 60 31 C52 36 40 36 30 40 Z" fill="#9A6331" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M60 31 C56 27 48 25 41 27" fill="none" stroke="#6E4420" strokeWidth={1.8} strokeLinecap="round" />
          <path d="M33 39 C40 34 50 33 58 31" fill="none" stroke="#C08447" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M44 69 Q50 71.5 56 69" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "bardur": // smug neighbour: curly hair, smirk
      return (
        <>
          {[
            [32, 38], [38, 29], [46, 24], [55, 24], [63, 29], [69, 38], [30, 47], [70, 47], [42, 33], [51, 30], [59, 33],
          ].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={7.2} fill="#704A28" stroke={INK} strokeWidth={2} />
          ))}
          <path d="M43 68 Q51 72 58 66" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
        </>
      );
    case "skeggi": // huge black beard, black bushy brows
      return (
        <>
          <path d="M29 42 C29 28 39 21 50 21 C61 21 71 28 71 42 C64 34 57 31 50 31 C43 31 36 34 29 42 Z" fill="#1E1A1A" stroke={INK} strokeWidth={2.2} />
          <path d="M22 52 C22 80 34 106 50 108 C66 106 78 80 78 52 C72 62 64 61 58 60 C54 64 46 64 42 60 C36 61 28 62 22 52 Z" fill="#1B1716" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M44 66 Q50 69 56 66" fill="none" stroke="#7A2C22" strokeWidth={2.6} strokeLinecap="round" />
          <path d="M37 44 L47 46 M53 46 L63 44" stroke="#1B1716" strokeWidth={4} strokeLinecap="round" />
        </>
      );
  }
};

export const Avatar: React.FC<{ id: CastId; color: string; size: number; uid: string }> = ({ id, color, size, uid }) => {
  const clip = `av-clip-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", flex: "none" }}>
      <defs>
        <clipPath id={clip}>
          <circle cx={50} cy={50} r={47} />
        </clipPath>
      </defs>
      <circle cx={50} cy={50} r={48} fill={color} />
      <g clipPath={`url(#${clip})`}>
        {/* shoulders in the character colour, a shade darker */}
        <path d="M14 104 C16 86 32 80 50 80 C68 80 84 86 86 104 Z" fill={darken(color, 0.22)} stroke={INK} strokeWidth={2.4} />
        <path d={BEAN} fill={SKIN} stroke={INK} strokeWidth={2.8} />
        <circle cx={42} cy={51} r={3.4} fill={INK} />
        <circle cx={58} cy={51} r={3.4} fill={INK} />
        <Hair id={id} />
      </g>
      <circle cx={50} cy={50} r={47} fill="none" stroke={INK} strokeWidth={3.2} />
    </svg>
  );
};
