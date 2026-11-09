import { createStage } from "@three/core";
import { createHomeStory } from "@three/stories/home";
import { createBusinessStory } from "@three/stories/business";
import { texturesReady } from "@three/textures";
import { frameSceneArea } from "@three/story";
import { HOME_STEPS, BIZ_STEPS } from "../svif/src/content/story-copy";

// ?story=biz renders the business story (/fyrirtaeki); the home story is the default.
// ?site draws the round-2 stage chrome (header, step title, line) and frames the scene in the area
// under it, exactly as StoryStage does; without it the scene fills the canvas (posters, films).
const q = new URLSearchParams(location.search);
const site = q.has("site");
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30 });
stage.resize(innerWidth, innerHeight);
const biz = q.get("story") === "biz";
// ?orb=env:0.3,glow:1.5,… tunes the business story's orb (see OrbTuning in builders/orb.ts)
const orbTune = Object.fromEntries(
  (q.get("orb") ?? "")
    .split(",")
    .filter(Boolean)
    .map((kv) => {
      const [k, v] = kv.split(":");
      return [k, v === "false" ? false : v === "true" ? true : +v];
    }),
);
const story = biz ? createBusinessStory(stage, { lite: q.has("lite"), orb: orbTune }) : createHomeStory(stage, { lite: q.has("lite") });
const extra: Promise<unknown> = (story as { ready?: Promise<unknown> }).ready ?? Promise.resolve();
const steps = biz ? BIZ_STEPS : HOME_STEPS;
const labels = document.getElementById("labels")!;
if (site) document.body.classList.add("site");
if (biz) (document.querySelector(".kick em") as HTMLElement).textContent = "frá stofnun að póstkassa";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const rich = (s: string) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
let shownStep = -1;
let sceneTop = 0;
function layout(i: number) {
  if (!site) return;
  if (i !== shownStep) {
    shownStep = i;
    const s = steps[i];
    document.getElementById("title")!.innerHTML = rich(s.title);
    document.getElementById("body")!.textContent = s.body;
    document.getElementById("n")!.textContent = s.n;
    document.getElementById("of")!.textContent = String(steps.length).padStart(2, "0");
  }
  // the scene owns the area under the tallest step (as on the site)
  const copy = document.querySelector(".copy") as HTMLElement;
  let tallest = 0;
  const t = document.getElementById("title")!;
  const b = document.getElementById("body")!;
  const keep = [t.innerHTML, b.textContent];
  for (const s of steps) {
    t.innerHTML = rich(s.title);
    b.textContent = s.body;
    tallest = Math.max(tallest, copy.getBoundingClientRect().bottom);
  }
  t.innerHTML = keep[0];
  b.textContent = keep[1];
  sceneTop = Math.ceil(tallest + Math.max(12, innerHeight * 0.02));
  (document.getElementById("wash") as HTMLElement).style.height = `${sceneTop + 40}px`;
  frameSceneArea(stage.camera, innerWidth, innerHeight, sceneTop, innerHeight - Math.max(8, innerHeight * 0.015));
}

function draw(g: number) {
  const i = Math.min(steps.length - 1, Math.max(0, Math.floor(g - 1e-6)));
  layout(i);
  (document.getElementById("fill") as HTMLElement).style.transform = `scaleX(${(g / steps.length).toFixed(4)})`;
  story.frame(g);
  labels.innerHTML = story.labels
    .map((l) => {
      const y = site ? Math.max(l.y, sceneTop + 22) : l.y;
      const top = Math.min(y, l.ay);
      const hgt = Math.abs(l.ay - y);
      return `<div class="lead" style="left:${l.ax}px;top:${top}px;height:${hgt}px;transform:scaleY(${l.draw})"></div><div class="cap" style="left:${l.x}px;top:${y}px;opacity:${l.opacity}">${l.text}</div>`;
    })
    .join("");
  document.getElementById("g")!.textContent = "g=" + g.toFixed(2);
}
(window as any).__seek = (g: number) => draw(g);
(window as any).__stage = stage;
(window as any).__story = story;
(window as any).__ready = Promise.all([texturesReady(), extra, document.fonts?.ready]).then(() => {
  draw(+(q.get("g") ?? "0.5"));
  return true;
});
