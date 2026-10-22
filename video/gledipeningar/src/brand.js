// Takk wordmark paths, taken from takkkronur.is (/images/LogoWhite.svg, viewBox 0 0 184 81).
export const TAKK = {
  viewBox: [184, 81],
  pill: 'M143.86 0H40.14C17.9713 0 0 17.9713 0 40.14C0 62.3087 17.9713 80.2801 40.14 80.2801H143.86C166.029 80.2801 184 62.3087 184 40.14C184 17.9713 166.029 0 143.86 0Z',
  k1: 'M124.62 61.1445L114.074 45.766L124.62 31.3135H114.074L104.392 44.7257V18.4375H94.8389L94.8359 61.1445H104.392V46.6803L114.074 61.1445H124.62Z',
  k2: 'M156.856 61.1445L146.31 45.766L156.856 31.3135H146.31L136.628 44.7257V18.4375H127.075L127.072 61.1445H136.628V46.6803L146.31 61.1445H156.856Z',
  a: 'M81.0999 31.3458V33.8132C80.294 33.0484 79.3651 32.4096 78.3072 31.8997C76.6897 31.1231 74.8787 30.7334 72.8744 30.7334C70.1315 30.7334 67.6876 31.3986 65.5397 32.729C63.3917 34.0594 61.6921 35.8996 60.4467 38.2527C59.1984 40.6058 58.5742 43.2753 58.5742 46.2614C58.5742 49.2474 59.1984 51.8994 60.4467 54.2085C61.695 56.5205 63.4034 58.3608 65.5719 59.7322C67.7404 61.1036 70.1755 61.7893 72.8744 61.7893C74.9197 61.7893 76.7512 61.3996 78.3688 60.623C79.4061 60.1249 80.3145 59.5007 81.0999 58.7564V61.1739H90.3686V31.3458H81.0999ZM74.8406 53.2561C73.5718 53.2561 72.4377 52.9602 71.4356 52.3653C70.4334 51.7734 69.6334 50.9441 69.0415 49.8803C68.4466 48.8166 68.1506 47.6093 68.1506 46.2584C68.1506 44.9075 68.4466 43.7032 69.0415 42.6365C69.6334 41.5728 70.4334 40.7435 71.4356 40.1516C72.4377 39.5596 73.5718 39.2607 74.8406 39.2607C76.1095 39.2607 77.3168 39.5567 78.3395 40.1516C79.3622 40.7464 80.1387 41.564 80.672 42.6072C81.2024 43.6504 81.4691 44.846 81.4691 46.1969C81.4691 48.2833 80.8654 49.9829 79.6581 51.2899C78.4508 52.5997 76.845 53.2532 74.8406 53.2532V53.2561Z',
  t: 'M52.7578 50.6656C52.3007 51.1989 51.4802 51.7527 50.982 51.9813C50.4868 52.2099 49.9271 52.3212 49.3058 52.3212C48.3945 52.3212 47.6619 52.0545 47.1022 51.5154C46.5454 50.9762 46.2641 50.1557 46.2641 49.0392V40.7903H55.8405V31.2871H46.2641V18.458H36.7082V31.2783H27.1582V40.7873H36.7082V50.0238C36.7082 52.456 37.2269 54.4106 38.2584 56.2069C39.2957 58.0032 40.7111 59.3922 42.5074 60.3826C44.3037 61.3731 46.3667 61.8683 48.6817 61.8683C50.8765 61.8683 52.7344 61.5079 54.2699 60.7841C55.7995 60.0603 57.168 59.0405 58.3665 57.7219L52.7549 50.6626L52.7578 50.6656Z',
  spark: 'M46.268 31.2873C40.9905 31.2873 36.7092 35.5598 36.7092 40.8227C36.7092 35.5598 32.4338 31.2785 27.1562 31.2785C32.4338 31.2785 36.7034 27.0266 36.7034 21.7637C36.7034 27.0266 40.9875 31.2873 46.2651 31.2873H46.268Z',
};

/** Inline SVG of the Takk logo with chosen colours. */
export function takkSvg({ pill = '#FFFFFF', letters = '#18003E', spark = '#836FFF', height = 80, stroke = null } = {}) {
  const [vw, vh] = TAKK.viewBox;
  const w = (height * vw) / vh;
  const s = stroke ? ` stroke="${stroke.color}" stroke-width="${stroke.width}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${vw} ${vh}" fill="none" style="display:block">
<path d="${TAKK.pill}" fill="${pill}"${s}/>
<path d="${TAKK.k1}" fill="${letters}"/><path d="${TAKK.k2}" fill="${letters}"/>
<path d="${TAKK.a}" fill="${letters}"/><path d="${TAKK.t}" fill="${letters}"/>
<path d="${TAKK.spark}" fill="${spark}"/></svg>`;
}

/** Just the "t" mark with its spark, as inline SVG. */
export function tMarkSvg({ color = '#FFFFFF', spark = '#B9A2FF', size = 60 } = {}) {
  // bounds of the t glyph: x 27.15..58.37, y 18.45..61.87
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.72}" height="${size}" viewBox="26 17 33.5 46" fill="none" style="display:block">
<path d="${TAKK.t}" fill="${color}"/><path d="${TAKK.spark}" fill="${spark}"/></svg>`;
}

// Gleðipeningar: an original mark for the restaurant version (a smiling coin). viewBox 0 0 100 100.
export const GLEDI = {
  yellow: '#FFD24D',
  deep: '#F2B705',
  ink: '#18003E',
  smile: 'M76.74 54.47A29.5 29.5 0 0 1 23.26 54.47A4.5 4.5 0 0 1 31.42 50.66A20.5 20.5 0 0 0 68.58 50.66A4.5 4.5 0 0 1 76.74 54.47Z',
  eyeL: 'M30.5 34a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0Z',
  eyeR: 'M56.5 34a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0Z',
};

/** The smiling face on its own (no disc), as inline SVG. */
export function smileSvg({ color = GLEDI.ink, size = 60 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="18 18 64 64" fill="none" style="display:block">
<path d="${GLEDI.smile}" fill="${color}"/><path d="${GLEDI.eyeL}" fill="${color}"/><path d="${GLEDI.eyeR}" fill="${color}"/></svg>`;
}

/** Round app icon: yellow disc with the smile. */
export function glediIconSvg({ size = 80, disc = GLEDI.yellow, face = GLEDI.ink, ring = GLEDI.deep } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" style="display:block">
<circle cx="50" cy="50" r="49" fill="${ring}"/><circle cx="50" cy="50" r="44" fill="${disc}"/>
<path d="${GLEDI.smile}" fill="${face}"/><path d="${GLEDI.eyeL}" fill="${face}"/><path d="${GLEDI.eyeR}" fill="${face}"/></svg>`;
}

/** Icon + lowercase wordmark, as an HTML string (wordmark set in Figtree 800). */
export function glediLogoHtml({ height = 120, color = GLEDI.ink, disc = GLEDI.yellow, face = GLEDI.ink, ring = GLEDI.deep } = {}) {
  return `<div style="display:flex;align-items:center;gap:${Math.round(height * 0.22)}px;white-space:nowrap">
${glediIconSvg({ size: height, disc, face, ring })}
<span style="font:800 ${Math.round(height * 0.74)}px Figtree;letter-spacing:-0.045em;color:${color};line-height:1;padding-bottom:${Math.round(height * 0.08)}px">gleðipeningar</span></div>`;
}

// VILD: the restaurant brand. Mark = a circular arrow around a V; wordmark = thin, widely spaced capitals.
// Geometry traced from the supplied logo (1200 x 900 artboard, mark centred at 600, 330).
export const VILD = {
  light: '#B4FF9B',
  ink: '#0C5C3B',
  // filled outlines (used for both the 2D mark and the extruded coin face)
  ring: 'M600 202 A128 128 0 1 1 472 330 L488 330 A112 112 0 1 0 600 218 Z',
  chevron: 'M457.58 358.71 L480 332.35 L502.42 358.71 L514.61 348.35 L480 307.65 L445.39 348.35 Z',
  v: 'M544.06 289.47 L600 401.36 L655.94 289.47 L638.06 280.53 L600 356.64 L561.94 280.53 Z',
  // the coin logo (1200 x 900 artboard, coin centred at 600, 434.5): bold V with rounded tips and point
  coinV: 'M481 336 L578 548 Q600 576 622 548 L719 336 Q714 322 700 322 Q692 322 686 330 L600 476 L514 330 Q508 322 500 322 Q486 322 481 336 Z',
  // wordmark centrelines, stroked at 5 units
  word: [
    'M391 586 L440 694 L489 586',
    'M544.5 586 V689.5',
    'M599.5 586 V689.5 H665',
    'M720.5 586.5 H754.5 A51.5 51.5 0 0 1 806 638 A51.5 51.5 0 0 1 754.5 689.5 H720.5 Z',
  ],
};

/** The VILD mark alone (no background). */
export function vildMarkSvg({ color = VILD.ink, size = 80 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="438 182 296 296" fill="none" style="display:block">
<path d="${VILD.ring}" fill="${color}"/><path d="${VILD.chevron}" fill="${color}"/><path d="${VILD.v}" fill="${color}"/></svg>`;
}

/** The VILD coin logo: rim, inner ring, bold V, and an offset dark crescent for the coin's edge. */
export function vildIconSvg({ size = 80, disc = VILD.light, mark = VILD.ink } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="328 168 560 560" fill="none" style="display:block">
<circle cx="617" cy="466" r="253.5" fill="${mark}"/>
<circle cx="600" cy="434.5" r="250" fill="${disc}" stroke="${mark}" stroke-width="7"/>
<circle cx="600" cy="434.5" r="215" fill="none" stroke="${mark}" stroke-width="5"/>
<path d="${VILD.coinV}" fill="${mark}"/></svg>`;
}

/** The thin VILD wordmark. `draw` (0..1 per letter) animates the strokes drawing in. */
export function vildWordSvg({ color = VILD.ink, height = 100, stroke = 5 } = {}) {
  const w = (height * 432) / 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}" height="${height}" viewBox="383 578 432 120" fill="none" style="display:block">
${VILD.word.map((d, i) => `<path class="vw vw${i}" d="${d}" stroke="${color}" stroke-width="${stroke}" stroke-linejoin="miter" fill="none" pathLength="1"/>`).join('')}</svg>`;
}

/** Full logo as in the brand artwork: mark above the wordmark. */
export function vildLogoSvg({ color = VILD.ink, width = 520 } = {}) {
  const h = (width * 560) / 520;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h.toFixed(1)}" viewBox="340 170 520 560" fill="none" style="display:block">
<g class="vm"><path d="${VILD.ring}" fill="${color}"/><path d="${VILD.chevron}" fill="${color}"/><path d="${VILD.v}" fill="${color}"/></g>
${VILD.word.map((d, i) => `<path class="vw vw${i}" d="${d}" stroke="${color}" stroke-width="5" fill="none" pathLength="1"/>`).join('')}</svg>`;
}
