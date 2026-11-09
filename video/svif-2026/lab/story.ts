import { createStage } from "@three/core";
import { createHomeStory } from "@three/stories/home";
import { createBusinessStory } from "@three/stories/business";
import { texturesReady } from "@three/textures";

// ?story=biz renders the business story (/fyrirtaeki); the home story is the default
const q = new URLSearchParams(location.search);
const canvas = document.getElementById("c") as HTMLCanvasElement;
const stage = createStage({ canvas, background: "#d9cfc0", fog: [30, 95], preserve: true, fov: 30 });
stage.resize(innerWidth, innerHeight);
const biz = q.get("story") === "biz";
const story = biz ? createBusinessStory(stage, { lite: q.has("lite") }) : createHomeStory(stage, { lite: q.has("lite") });
const extra: Promise<unknown> = biz ? (story as ReturnType<typeof createBusinessStory>).ready : Promise.resolve();
const labels = document.getElementById("labels")!;
function draw(g: number) {
  story.frame(g);
  labels.innerHTML = story.labels
    .map((l) => {
      const top = Math.min(l.y, l.ay);
      const hgt = Math.abs(l.ay - l.y);
      return `<div class="lead" style="left:${l.ax}px;top:${top}px;height:${hgt}px;transform:scaleY(${l.draw})"></div><div class="cap" style="left:${l.x}px;top:${l.y}px;opacity:${l.opacity}">${l.text}</div>`;
    })
    .join("");
  document.getElementById("g")!.textContent = "g=" + g.toFixed(2);
}
(window as any).__seek = (g: number) => draw(g);
(window as any).__stage = stage;
(window as any).__ready = Promise.all([texturesReady(), extra]).then(() => {
  draw(+(q.get("g") ?? "0.5"));
  return true;
});
