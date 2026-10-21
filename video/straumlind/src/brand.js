// Straumlind logo, taken from straumlind.is (/images/logo-color.svg, viewBox 0 0 84.19 9.81).
// The mark is a bolt cut between two halves: cyan on the right, orange on the left. The wordmark is navy.
export const LOGO = {
  viewBox: [84.19, 9.81],
  cyan: "M10.12,0V4.69A5.12,5.12,0,0,1,5,9.81H4.86l2.52-6H5.05L6,0Z",
  orange: "M0,9.81V5.12A5.12,5.12,0,0,1,5.12,0h.14L2.74,6H5.07l-1,3.82Z",
  word: [
  "M13.47,6.29h.84a1.14,1.14,0,0,0,.48.92A2.26,2.26,0,0,0,16,7.5c1.12,0,1.68-.38,1.68-1.13a1,1,0,0,0-.32-.76,2,2,0,0,0-1-.34l-.87-.1c-1.27-.16-1.91-.74-1.91-1.75a1.63,1.63,0,0,1,.65-1.37A2.87,2.87,0,0,1,16,1.57a2.77,2.77,0,0,1,1.7.46,1.92,1.92,0,0,1,.72,1.39h-.83a1.13,1.13,0,0,0-.44-.85A2,2,0,0,0,16,2.29a2,2,0,0,0-1.18.28.91.91,0,0,0-.39.79.89.89,0,0,0,.3.71,1.86,1.86,0,0,0,1,.34l.92.11c1.29.17,1.93.77,1.93,1.79a1.67,1.67,0,0,1-.68,1.42,3.08,3.08,0,0,1-1.89.5,2.94,2.94,0,0,1-1.82-.49A1.9,1.9,0,0,1,13.47,6.29Z",
  "M23.4,2.42V8.18h-.85V2.42H20.44V1.65h5.07v.77Z",
  "M28.54,5.4V8.18h-.86V1.65h2.84a2.55,2.55,0,0,1,1.66.48,1.72,1.72,0,0,1,.57,1.39,1.76,1.76,0,0,1-.37,1.17,1.79,1.79,0,0,1-1.06.62l1.62,2.87H32L30.43,5.4Zm2-.75a1.53,1.53,0,0,0,1-.28,1,1,0,0,0,.33-.85,1,1,0,0,0-.35-.83,1.69,1.69,0,0,0-1.05-.27H28.54V4.65Z",
  "M36.25,6.7l-.59,1.48h-.9l2.73-6.53h.72L41,8.18H40l-.6-1.48Zm1.6-4L36.54,6h2.61Z",
  "M42.94,5.84V1.65h.86V5.78a1.73,1.73,0,0,0,3.46,0V1.65h.87V5.84a2.25,2.25,0,0,1-.69,1.76,3.2,3.2,0,0,1-3.81,0A2.25,2.25,0,0,1,42.94,5.84Z",
  "M57.37,8.18h-.86V3.24L54.44,6.88h-.6L51.77,3.24V8.18h-.86V1.65h.86l2.37,4.24,2.37-4.24h.86Z",
  "M61,1.65V7.41h3.66v.77H60.15V1.65Z",
  "M68,1.65V8.18h-.86V1.65Z",
  "M76.27,8.18h-.86l-3.74-5V8.18h-.86V1.65h.86l3.74,5.06V1.65h.86Z",
  "M81.46,1.65a2.76,2.76,0,0,1,2,.71,2.89,2.89,0,0,1,.71,2.12v.86a2.85,2.85,0,0,1-.72,2.12,2.72,2.72,0,0,1-2,.72H79.05V1.65Zm1.41,5.26a2.28,2.28,0,0,0,.46-1.55V4.53a2.41,2.41,0,0,0-.46-1.6,1.82,1.82,0,0,0-1.41-.51H79.91v5h1.55A1.85,1.85,0,0,0,82.87,6.91Z"
],
};

export const COLORS = { cyan: '#00BDD0', orange: '#FF7800', wordmark: '#00506E', navy: '#0B3446' };

/** Full logo (bolt + wordmark) as inline SVG at a given height in px. */
export function logoSvg({ height = 40, word = COLORS.wordmark, cyan = COLORS.cyan, orange = COLORS.orange, mark = true, wordmark = true } = {}) {
  const x0 = mark ? 0 : 13.0, x1 = wordmark ? 84.19 : 10.2;
  const vw = x1 - x0, vh = 9.81;
  const w = (height * vw) / vh;
  const parts = [];
  if (mark) parts.push(`<path d="${LOGO.cyan}" fill="${cyan}"/><path d="${LOGO.orange}" fill="${orange}"/>`);
  if (wordmark) parts.push(LOGO.word.map((d) => `<path d="${d}" fill="${word}"/>`).join(''));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}" height="${height}" viewBox="${x0} 0 ${vw} ${vh}" style="display:block">${parts.join('')}</svg>`;
}

/** Draw the bolt mark on a 2D canvas, centred at (cx, cy) with height h. */
export function drawMark(ctx, cx, cy, h, { cyan = COLORS.cyan, orange = COLORS.orange } = {}) {
  const s = h / 9.81;
  ctx.save();
  ctx.translate(cx - (10.12 * s) / 2, cy - h / 2);
  ctx.scale(s, s);
  ctx.fillStyle = cyan;
  ctx.fill(new Path2D(LOGO.cyan));
  ctx.fillStyle = orange;
  ctx.fill(new Path2D(LOGO.orange));
  ctx.restore();
}
