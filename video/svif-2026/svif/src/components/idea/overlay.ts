/**
 * The vignettes' DOM overlays: tracked-caps captions on drawn hairlines, and hairline links between
 * two points. Plain DOM + one SVG, updated imperatively (live: every frame of a beat; stills: once
 * per size). Positions come in CSS px of the panel (live: projected by the runtime; stills: the
 * end-frame points baked by the lab, in % of the panel).
 *
 * Layout: a caption sits 8 px above (or below) its point, centred on it; it is kept inside the panel
 * (7% side margin) and pushed a row further out when it would cover a caption placed before it.
 * Its hairline runs from the anchor to the caption's near edge.
 */

export interface OverlayPoint {
  type: "label" | "link" | "figure";
  id: string;
  x: number;
  y: number;
  ax?: number;
  ay?: number;
  opacity: number;
  draw: number;
  side?: "above" | "below";
  progress?: number;
}

const SVGNS = "http://www.w3.org/2000/svg";
const GAP = 8;
const ROW = 6;

interface CapNode {
  el: HTMLSpanElement;
  line: SVGLineElement;
  text: string;
  w: number;
  h: number;
}
interface LinkNode {
  line: SVGLineElement;
  dot: SVGCircleElement;
}

export class OverlayLayer {
  private svg: SVGSVGElement;
  private caps = new Map<string, CapNode>();
  private links = new Map<string, LinkNode>();

  constructor(private root: HTMLElement) {
    this.svg = document.createElementNS(SVGNS, "svg");
    this.svg.setAttribute("class", "idea-ov-lines");
    this.svg.setAttribute("aria-hidden", "true");
    root.append(this.svg);
  }

  /** the figure's entrance (0..1) of the last update, if the vignette has one */
  figure = -1;

  update(list: OverlayPoint[], texts: Record<string, string>, W: number, H: number) {
    const seen = new Set<string>();
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const padX = Math.max(10, W * 0.07);
    const padY = Math.max(8, H * 0.04);
    this.figure = -1;
    // captions in a stable order: top to bottom, so pushes go outward predictably
    const labels = list.filter((o) => o.type === "label").sort((a, b) => a.y - b.y);
    for (const o of labels) {
      const text = texts[o.id];
      if (!text) continue;
      seen.add("c:" + o.id);
      const n = this.cap(o.id, text);
      const below = o.side === "below";
      const x = Math.min(Math.max(o.x, padX + n.w / 2), W - padX - n.w / 2);
      let y0 = below ? o.y + GAP : o.y - GAP - n.h;
      for (let guard = 0; guard < 6; guard++) {
        const hit = placed.find((p) => x - n.w / 2 - 6 < p.x1 && x + n.w / 2 + 6 > p.x0 && y0 - ROW < p.y1 && y0 + n.h + ROW > p.y0);
        if (!hit) break;
        y0 = below ? hit.y1 + ROW : hit.y0 - ROW - n.h;
      }
      y0 = Math.min(Math.max(y0, padY), H - padY - n.h);
      placed.push({ x0: x - n.w / 2, x1: x + n.w / 2, y0, y1: y0 + n.h });
      n.el.style.transform = `translate3d(${(x - n.w / 2).toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
      n.el.style.opacity = o.opacity.toFixed(3);
      // hairline: from the anchor to the caption's near edge (drawn from the anchor)
      if (o.ax !== undefined && o.ay !== undefined && o.draw > 0.001) {
        const ex = Math.min(Math.max(o.ax, x - n.w / 2 + 4), x + n.w / 2 - 4);
        const ey = below ? y0 - 4 : y0 + n.h + 4;
        const k = Math.min(1, Math.max(0, o.draw));
        n.line.setAttribute("x1", o.ax.toFixed(1));
        n.line.setAttribute("y1", o.ay.toFixed(1));
        n.line.setAttribute("x2", (o.ax + (ex - o.ax) * k).toFixed(1));
        n.line.setAttribute("y2", (o.ay + (ey - o.ay) * k).toFixed(1));
        n.line.style.opacity = "1";
      } else n.line.style.opacity = "0";
    }
    for (const o of list) {
      if (o.type === "figure") {
        this.figure = o.progress ?? 1;
        continue;
      }
      if (o.type !== "link" || o.ax === undefined || o.ay === undefined) continue;
      seen.add("l:" + o.id);
      const n = this.link(o.id);
      const k = Math.min(1, Math.max(0, o.draw));
      n.line.setAttribute("x1", o.x.toFixed(1));
      n.line.setAttribute("y1", o.y.toFixed(1));
      n.line.setAttribute("x2", (o.x + (o.ax - o.x) * k).toFixed(1));
      n.line.setAttribute("y2", (o.y + (o.ay - o.y) * k).toFixed(1));
      n.line.style.opacity = k > 0.001 ? "1" : "0";
      n.dot.setAttribute("cx", o.x.toFixed(1));
      n.dot.setAttribute("cy", o.y.toFixed(1));
      n.dot.style.opacity = o.opacity.toFixed(3);
    }
    for (const [id, n] of this.caps)
      if (!seen.has("c:" + id)) {
        n.el.style.opacity = "0";
        n.line.style.opacity = "0";
      }
    for (const [id, n] of this.links)
      if (!seen.has("l:" + id)) {
        n.line.style.opacity = "0";
        n.dot.style.opacity = "0";
      }
  }

  /** remove every caption and line (a new vignette) */
  clear() {
    for (const n of this.caps.values()) {
      n.el.remove();
      n.line.remove();
    }
    for (const n of this.links.values()) {
      n.line.remove();
      n.dot.remove();
    }
    this.caps.clear();
    this.links.clear();
    this.figure = -1;
  }

  /** caption sizes depend on the type size (breakpoints): measure again */
  remeasure() {
    for (const n of this.caps.values()) {
      n.w = n.el.offsetWidth;
      n.h = n.el.offsetHeight;
    }
  }

  dispose() {
    this.clear();
    this.svg.remove();
  }

  private cap(id: string, text: string) {
    let n = this.caps.get(id);
    if (n && n.text !== text) {
      n.el.textContent = text;
      n.text = text;
      n.w = n.el.offsetWidth;
      n.h = n.el.offsetHeight;
    }
    if (!n) {
      const el = document.createElement("span");
      el.className = "idea-cap";
      el.textContent = text;
      this.root.append(el);
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("class", "idea-lead");
      this.svg.append(line);
      n = { el, line, text, w: el.offsetWidth || text.length * 9, h: el.offsetHeight || 11 };
      this.caps.set(id, n);
    }
    return n;
  }

  private link(id: string) {
    let n = this.links.get(id);
    if (!n) {
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("class", "idea-link");
      const dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("class", "idea-dot");
      dot.setAttribute("r", "2.5");
      this.svg.append(line, dot);
      n = { line, dot };
      this.links.set(id, n);
    }
    return n;
  }
}

/** the end-frame overlays of the stills, stored in % of the panel, scaled to a panel size */
export function scaleStill(list: OverlayPoint[], W: number, H: number): OverlayPoint[] {
  return list.map((o) => ({
    ...o,
    x: (o.x / 100) * W,
    y: (o.y / 100) * H,
    ax: o.ax === undefined ? undefined : (o.ax / 100) * W,
    ay: o.ay === undefined ? undefined : (o.ay / 100) * H,
    opacity: 1,
    draw: 1,
    progress: 1,
  }));
}
