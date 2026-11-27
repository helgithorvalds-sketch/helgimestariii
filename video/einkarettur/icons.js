// Small flat icons for shop signs and deal pages. drawIcon(c, kind, cx, cy, size, color): size = full icon width in px.
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

const ICONS = {
  /** Baby onesie. */
  clothes(c) {
    c.beginPath();
    c.moveTo(-15, -46); c.quadraticCurveTo(0, -34, 15, -46);
    c.lineTo(36, -38); c.quadraticCurveTo(46, -34, 48, -22); c.lineTo(36, -10); c.lineTo(25, -18);
    c.lineTo(25, 22); c.quadraticCurveTo(25, 34, 15, 40); c.lineTo(8, 46); c.lineTo(-8, 46); c.lineTo(-15, 40);
    c.quadraticCurveTo(-25, 34, -25, 22); c.lineTo(-25, -18); c.lineTo(-36, -10); c.lineTo(-48, -22); c.quadraticCurveTo(-46, -34, -36, -38);
    c.closePath(); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -20 + i * 13, 3.6, 0, Math.PI * 2); c.fill(); }
    c.restore();
  },
  /** Pram with hood and wheels. */
  pram(c) {
    c.beginPath(); c.moveTo(-40, -6); c.lineTo(34, -6); c.quadraticCurveTo(34, 26, 0, 26); c.lineTo(-14, 26); c.quadraticCurveTo(-40, 26, -40, -6); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-4, -10); c.lineTo(-4, -44); c.quadraticCurveTo(34, -42, 36, -10); c.closePath(); c.fill();
    c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(-40, -6); c.lineTo(-48, -24); c.stroke();
    for (const x of [-24, 18]) { c.beginPath(); c.arc(x, 38, 9, 0, Math.PI * 2); c.fill(); }
  },
  /** Teddy bear head. */
  toy(c) {
    for (const x of [-27, 27]) { c.beginPath(); c.arc(x, -26, 14, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.arc(0, 4, 38, 0, Math.PI * 2); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out';
    for (const x of [-13, 13]) { c.beginPath(); c.arc(x, -4, 5, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.ellipse(0, 18, 14, 10, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    c.beginPath(); c.arc(0, 14, 4.5, 0, Math.PI * 2); c.fill();
  },
  /** Rubber duck (baby swimming). */
  swim(c) {
    c.beginPath(); c.moveTo(-44, 4); c.quadraticCurveTo(-44, 34, -6, 34); c.lineTo(22, 34); c.quadraticCurveTo(46, 30, 42, 6); c.quadraticCurveTo(26, 14, 8, 6); c.lineTo(-30, 6); c.quadraticCurveTo(-40, 6, -44, -6); c.closePath(); c.fill();
    c.beginPath(); c.arc(14, -16, 21, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(32, -18); c.quadraticCurveTo(50, -18, 50, -10); c.quadraticCurveTo(44, -6, 32, -8); c.closePath(); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(18, -21, 4, 0, Math.PI * 2); c.fill(); c.restore();
    c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-46, 46); for (let i = 0; i <= 4; i++) c.quadraticCurveTo(-46 + i * 23 + 6, 40, -46 + i * 23 + 11.5, 46); c.stroke();
  },
  /** Camera (newborn photography). */
  camera(c) {
    rr(c, -46, -24, 92, 64, 14); c.fill();
    rr(c, -18, -36, 36, 16, 6); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(0, 8, 21, 0, Math.PI * 2); c.fill(); c.restore();
    c.beginPath(); c.arc(0, 8, 13, 0, Math.PI * 2); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(30, -12, 4, 0, Math.PI * 2); c.fill(); c.restore();
  },
  /** Baby bottle. */
  bottle(c) {
    c.beginPath(); c.moveTo(-6, -48); c.quadraticCurveTo(0, -54, 6, -48); c.lineTo(9, -34); c.lineTo(-9, -34); c.closePath(); c.fill();
    rr(c, -20, -34, 40, 12, 5); c.fill();
    rr(c, -24, -20, 48, 68, 14); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 3; i++) rr(c, -14, -6 + i * 14, 14, 4, 2), c.fill(); c.restore();
  },
  /** Little boot. */
  shoe(c) {
    c.beginPath(); c.moveTo(-30, -42); c.lineTo(4, -42); c.lineTo(4, 2); c.quadraticCurveTo(6, 10, 24, 14); c.quadraticCurveTo(46, 20, 44, 36); c.lineTo(44, 44); c.lineTo(-30, 44); c.closePath(); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; rr(c, -36, -32, 46, 8, 3); c.fill(); rr(c, -36, 30, 86, 5, 2); c.fill(); c.restore();
  },
  /** Food jar with spoon. */
  food(c) {
    rr(c, -30, -40, 60, 16, 6); c.fill();
    rr(c, -34, -20, 68, 66, 16); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.ellipse(0, 12, 18, 14, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.beginPath(); c.arc(0, 12, 7, 0, Math.PI * 2); c.fill();
  },
  /** Moon and star (sleep). */
  sleep(c) {
    c.beginPath(); c.arc(-4, 6, 38, 0, Math.PI * 2); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(16, -8, 32, 0, Math.PI * 2); c.fill(); c.restore();
    star(c, 30, -30, 13);
  },
  /** First aid cross (health). */
  health(c) {
    rr(c, -40, -40, 80, 80, 20); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; rr(c, -9, -26, 18, 52, 4); c.fill(); rr(c, -26, -9, 52, 18, 4); c.fill(); c.restore();
  },
};
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  c.closePath(); c.fill();
}

export const ICON_KINDS = Object.keys(ICONS);
/** Draws an icon centred on (cx,cy), size px wide, filled with color. The icon is drawn in its own layer so
 * destination-out cut-outs only cut the icon, not what is under it. */
export function drawIcon(c, kind, cx, cy, size, color) {
  const S = Math.ceil(size * 1.2); const off = document.createElement('canvas'); off.width = off.height = S;
  const o = off.getContext('2d'); o.translate(S / 2, S / 2); o.scale(size / 100, size / 100);
  o.fillStyle = color; o.strokeStyle = color; ICONS[kind](o);
  c.drawImage(off, cx - S / 2, cy - S / 2);
}
