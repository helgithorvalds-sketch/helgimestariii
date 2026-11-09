// Vignette lab: ?key=crowd&kind=home&t=1&size=600[&round][&nolabels]
// window.__svif.render(t) draws a frame (and the DOM overlays); __svif.overlays(t) returns them in %.
import { createVignetteRuntime, factoriesFor } from "@three/vignettes";
import type { ProjectedOverlay, VignetteKey, VignetteKind } from "@three/vignettes";

const q = new URLSearchParams(location.search);
const key = (q.get("key") ?? "crowd") as VignetteKey;
const kind = (q.get("kind") ?? "home") as VignetteKind;
const size = +(q.get("size") ?? "600");
const panel = document.getElementById("panel") as HTMLDivElement;
panel.style.width = panel.style.height = size + "px";
if (q.has("round")) panel.classList.add("round");
const canvas = document.getElementById("c") as HTMLCanvasElement;
const ov = document.getElementById("ov") as HTMLDivElement;
const svg = document.getElementById("lines") as unknown as SVGSVGElement;
const TEXT: Record<string, string> = {
  many: "Mörg fyrirtæki", yours: "Tilboðið þitt", buy: "Kaupin", booklet: "Nýji kaflinn", work: "Framkvæmdir",
  weekly: "Í hverri viku", figure: "350–500|Á mánuði", thrown: "Auglýsingu hent", kept: "Afsláttur geymdur",
  address: "Heimilisfangið", ok: "Staðfest", pages: "Eftir síðufjölda", monthly: "Mánaðarlega", term: "3 mánuðir í senn",
  design: "Hönnun & prentun", post: "Dreifing", mock: "Þrívíddarmynd", talk: "Mánaðarlegt samtal",
  yourcat: "Flokkurinn þinn", nocomp: "Enginn keppinautur",
};
if (kind === "biz") Object.assign(TEXT, {
  yours: "Sérkjörin ykkar", buy: "Skráning", booklet: "Bæklingurinn", work: "Fyrstu vikurnar", country: "Um allt land",
  figure: "Um 250|Á mánuði", kept: "Sérkjör geymd", address: "Nafn eða kennitala", yourcat: "Flokkurinn ykkar",
});
const rt = createVignetteRuntime({ canvas, kind, factories: factoriesFor(kind), preserve: true, maxDpr: +(q.get("dpr") ?? "1") });
rt.resize(size, size);
let last: ProjectedOverlay[] = [];
function drawOverlays(list: ProjectedOverlay[]) {
  ov.querySelectorAll(".cap,.fig").forEach((n) => n.remove());
  svg.innerHTML = "";
  if (q.has("nolabels")) return;
  for (const o of list) {
    if (o.type === "figure") {
      const [v, u] = (TEXT[o.id] ?? "").split("|");
      const d = document.createElement("div");
      d.className = "fig";
      d.style.opacity = String(o.progress ?? 1);
      d.innerHTML = `<b>${v}</b><i>${u ?? ""}</i>`;
      ov.append(d);
      continue;
    }
    if (o.type === "link") {
      const x2 = o.x + (o.ax! - o.x) * o.draw, y2 = o.y + (o.ay! - o.y) * o.draw;
      svg.insertAdjacentHTML("beforeend", `<line x1="${o.x}" y1="${o.y}" x2="${x2}" y2="${y2}" stroke="rgba(42,36,32,.42)" stroke-width="1"/>`);
      svg.insertAdjacentHTML("beforeend", `<circle cx="${o.x}" cy="${o.y}" r="2.2" fill="rgba(42,36,32,.6)" opacity="${o.opacity}"/>`);
      continue;
    }
    if (o.ax !== undefined) {
      const y2 = o.ay! + (o.y + (o.side === "below" ? 6 : -6) - o.ay!) * o.draw;
      svg.insertAdjacentHTML("beforeend", `<line x1="${o.ax}" y1="${o.ay}" x2="${o.ax}" y2="${y2}" stroke="rgba(42,36,32,.42)" stroke-width="1"/>`);
    }
    const d = document.createElement("div");
    d.className = "cap";
    d.textContent = TEXT[o.id] ?? o.id;
    d.style.opacity = String(o.opacity);
    const below = o.side === "below";
    d.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, ${below ? "8px" : "calc(-100% - 8px)"})`;
    ov.append(d);
  }
}
const render = (t: number) => {
  last = rt.draw(t);
  drawOverlays(last);
  (document.getElementById("info") as HTMLDivElement).textContent = `${key} t=${t.toFixed(2)}`;
  return true;
};
(window as any).__svif = {
  render,
  overlays: (t: number) => {
    const l = rt.draw(t);
    return l.map((o) => ({ ...o, x: (o.x / size) * 100, y: (o.y / size) * 100, ax: o.ax === undefined ? undefined : (o.ax / size) * 100, ay: o.ay === undefined ? undefined : (o.ay / size) * 100 }));
  },
  rt,
};
(window as any).__ready = rt.prepare(key).then((v) => {
  rt.use(key);
  render(+(q.get("t") ?? "1"));
  return !!v;
});
