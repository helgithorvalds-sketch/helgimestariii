/**
 * Film composer (round 2): plays the site's own 3D scenes on a timeline with title cards in the
 * site's type and motion tokens, frame-exactly (window.__seek(t) renders time t synchronously).
 * Captured by film/capture.cjs.
 *
 *   film.html?film=home | biz      &t=12.3 (preview a time)   &debug
 *
 * Layout matches the site's pinned stage: the step title sits centred above the scene, the scene
 * is framed into the area below it (frameSceneArea), symmetric. The opener plays the hero's own
 * load animation (arrive → open → riffle through every page → close).
 */
import { createStage } from "@three/core";
import { createHeroScene } from "@three/hero";
import { texturesReady } from "@three/textures";
import { frameSceneArea, type Story } from "@three/story";
import { FILMS, gAt, type Film, type Caption } from "./film-specs";

const q = new URLSearchParams(location.search);
const film: Film = FILMS[q.get("film") ?? "home"];

// ---------- easing tokens (cubic-bezier, same as the site) ----------
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const E = {
  arrive: bezier(0.19, 1, 0.22, 1),
  settle: bezier(0.165, 0.84, 0.44, 1),
  glide: bezier(0.65, 0, 0.35, 1),
  breathe: bezier(0.45, 0, 0.55, 1),
  leave: bezier(0.5, 0, 0.75, 0),
};
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// ---------- layers ----------
const W = innerWidth;
const H = innerHeight;
/** the title block above the scene, as on the site (eyebrow + 1–2 title lines + sub) */
const SCENE_TOP = Math.round(H * 0.3);
const storyCanvas = document.getElementById("story") as HTMLCanvasElement;
const heroCanvas = document.getElementById("hero") as HTMLCanvasElement;
const storyWrap = document.getElementById("storyWrap")!;
const heroWrap = document.getElementById("heroWrap")!;
const labelsEl = document.getElementById("labels")!;
const capsEl = document.getElementById("captions")!;
const frameEl = document.getElementById("frame")!;
const logo = document.getElementById("logo") as HTMLImageElement;

const stage = createStage({ canvas: storyCanvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30 });
stage.resize(W, H);
let story: Story;
const hero = createHeroScene(heroCanvas, { cover: film.heroCover, preserve: true, maxWait: 60 });
hero.resize(W, H, { rect: [0.5, 0.1, 0.95, 0.9] });

// ---------- captions ----------
interface CapNode { c: Caption; el: HTMLElement; rule?: HTMLElement; ebText?: HTMLElement; lines: HTMLElement[]; sub?: HTMLElement; note?: HTMLElement }
/** `*…*` → <em class="acc">; a line that is all accent gets the large accent style */
function lineHTML(l: string) {
  const whole = /^\*[^*]+\*$/.test(l.trim());
  const html = l.replace(/\*([^*]+)\*/g, (_, s) => `<em class="${whole ? "acc" : "acci"}">${s}</em>`);
  return { html, whole };
}
const capNodes: CapNode[] = film.captions.map((c) => {
  const el = document.createElement("div");
  el.className = `c ${c.pos} ${c.tone}`;
  const node: CapNode = { c, el, lines: [] };
  if (c.eyebrow) {
    const ebEl = document.createElement("div");
    ebEl.className = "eb";
    const rule = document.createElement("i");
    const tx = document.createElement("span");
    tx.innerHTML = c.eyebrow;
    ebEl.append(rule, tx);
    el.append(ebEl);
    node.rule = rule;
    node.ebText = tx;
  }
  if (c.lines.length) {
    const ttl = document.createElement("div");
    ttl.className = "ttl";
    if (c.size) ttl.style.fontSize = c.size + "px";
    c.lines.forEach((l) => {
      const { html, whole } = lineHTML(l);
      const ln = document.createElement("span");
      ln.className = "ln" + (whole ? " whole" : "");
      const inner = document.createElement("span");
      inner.innerHTML = html;
      ln.append(inner);
      ttl.append(ln);
      node.lines.push(inner);
    });
    if (!c.eyebrow) ttl.style.marginTop = "0";
    el.append(ttl);
  }
  if (c.sub) {
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = c.sub;
    el.append(sub);
    node.sub = sub;
  }
  if (c.note) {
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = c.note;
    el.append(note);
    node.note = note;
  }
  el.style.opacity = "0";
  capsEl.append(el);
  return node;
});

function drawCaption(n: CapNode, t: number) {
  const { c } = n;
  const tin = t - c.at;
  if (t < c.at - 0.01 || t > c.out + 0.45) {
    n.el.style.opacity = "0";
    return;
  }
  n.el.style.opacity = (1 - E.leave(seg(t, c.out, c.out + 0.4))).toFixed(4);
  if (n.rule) n.rule.style.transform = `scaleX(${E.glide(seg(tin, 0, 1.2)).toFixed(4)})`;
  if (n.ebText) n.ebText.style.opacity = E.settle(seg(tin, 0.15, 0.85)).toFixed(4);
  let k = 0;
  n.lines.forEach((ln, i) => {
    const a = (c.eyebrow ? 0.22 : 0.07) + i * 0.09;
    const p = E.arrive(seg(tin, a, a + 1.0));
    ln.style.transform = `translate3d(0, ${((1 - p) * 112).toFixed(2)}%, 0)`;
    k = i;
  });
  for (const extra of [n.sub, n.note]) {
    if (!extra) continue;
    const a = 0.55 + k * 0.09;
    const p = E.settle(seg(tin, a, a + 0.8));
    extra.style.opacity = p.toFixed(4);
    extra.style.transform = `translate3d(0, ${((1 - p) * 10).toFixed(2)}px, 0)`;
  }
}

// ---------- labels (story callouts) ----------
const labelNodes = new Map<string, { lead: HTMLDivElement; cap: HTMLDivElement }>();
function drawLabels(scale: number) {
  const seen = new Set<string>();
  for (const l of story.labels) {
    seen.add(l.id);
    let n = labelNodes.get(l.id);
    if (!n) {
      const lead = document.createElement("div");
      lead.className = "lead";
      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = l.text;
      labelsEl.append(lead, cap);
      n = { lead, cap };
      labelNodes.set(l.id, n);
    }
    const top = Math.min(l.y, l.ay);
    n.lead.style.transform = `translate3d(${l.ax}px, ${top}px, 0) scaleY(${clamp(l.draw)})`;
    n.lead.style.height = `${Math.abs(l.ay - l.y)}px`;
    n.lead.style.opacity = (l.draw > 0.001 ? scale : 0).toString();
    n.cap.style.transform = `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -100%)`;
    n.cap.style.opacity = (l.opacity * scale).toFixed(4);
  }
  for (const [k, n] of labelNodes) if (!seen.has(k)) n.lead.style.opacity = n.cap.style.opacity = "0";
}

// ---------- timeline ----------
function fade(t: number, s: { t0: number; t1: number; fin?: number; fout?: number }) {
  if (t < s.t0 || t > s.t1) return 0;
  const fi = s.fin ?? 0.7;
  const fo = s.fout ?? 0.7;
  return Math.min(fi > 0 ? E.breathe(seg(t, s.t0, s.t0 + fi)) : 1, fo > 0 ? 1 - E.breathe(seg(t, s.t1 - fo, s.t1)) : 1);
}

function seek(t: number) {
  // the dark opener: the hero's own intro (arrive, open, riffle, close), then it rests closed
  let ho = 0;
  for (const s of film.hero) {
    const o = fade(t, s);
    if (o > ho) ho = o;
    if (o > 0) hero.frame({ t: Math.max(0, t - s.t0 - 0.1) });
  }
  heroWrap.style.opacity = ho.toFixed(4);
  // the clay world
  const so = fade(t, film.story);
  storyWrap.style.opacity = so.toFixed(4);
  if (so > 0) {
    frameSceneArea(stage.camera, W, H, SCENE_TOP, H);
    story.frame(gAt(film, t));
    drawLabels(1);
  }
  frameEl.style.borderColor = so > 0.5 ? "rgba(42,36,32,.13)" : "rgba(246,245,236,.16)";
  for (const n of capNodes) drawCaption(n, t);
  if (film.logo) {
    const lo = E.settle(seg(t, film.logo[0], film.logo[0] + 1.2)) * (1 - E.leave(seg(t, film.logo[1] - 0.5, film.logo[1])));
    logo.style.opacity = lo.toFixed(4);
    logo.style.transform = `translate(-50%, calc(-50% + ${((1 - lo) * 10).toFixed(2)}px))`;
  }
  (document.getElementById("g") as HTMLElement).textContent = q.has("debug") ? `t=${t.toFixed(2)} g=${gAt(film, t).toFixed(2)}` : "";
}

(window as any).__duration = film.duration;
(window as any).__events = film.events ?? [];
(window as any).__seek = (t: number) => seek(t);
(window as any).__ready = (async () => {
  const mod = film.kind === "biz" ? await import("@three/stories/business") : await import("@three/stories/home");
  story = (mod as any)[film.kind === "biz" ? "createBusinessStory" : "createHomeStory"](stage, {});
  if ((story as any).ready) await (story as any).ready;
  await Promise.all([texturesReady(), hero.allLoaded, document.fonts.ready, logo.decode().catch(() => {})]);
  await document.fonts.load("300 52px Jost");
  await document.fonts.load("italic 52px 'Instrument Serif'");
  seek(+(q.get("t") ?? "0"));
  return true;
})();
