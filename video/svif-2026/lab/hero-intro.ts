// The hero intro in a box the size of the hero's right column: ?biz&m&t=  — __seek(t)
import { createHeroScene } from "@three/hero";
const q = new URLSearchParams(location.search);
const canvas = document.getElementById("c") as HTMLCanvasElement;
const s = createHeroScene(canvas, { book: q.has("biz") ? "biz" : "home", mobile: q.has("m"), preserve: true, maxWait: 30 });
s.resize(innerWidth, innerHeight);
const gEl = document.getElementById("g")!;
(window as any).__seek = (t: number) => { s.frame({ t }); gEl.textContent = q.has("nolabel") ? "" : `t=${t.toFixed(2)}s`; };
(window as any).__scene = s;
(window as any).__ready = s.allLoaded.then(() => { (window as any).__seek(+(q.get("t") ?? "5")); return true; });
