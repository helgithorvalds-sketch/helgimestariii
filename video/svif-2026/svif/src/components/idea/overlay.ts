/**
 * The vignettes' DOM overlays: tracked-caps captions on drawn hairlines, hairline links between two
 * points and the one big figure ("350–500" over "Á MÁNUÐI"). Plain DOM + one SVG, updated
 * imperatively (live: every frame of a beat; stills: once per size). Positions come in CSS px of
 * the panel (live: projected by the runtime; stills: the end-frame points baked by the lab, in % of
 * the vignette's square frame, see `scaleStill`).
 *
 * Layout: everything stays inside `bounds` (the scene area: never over the text). The figure is
 * placed first (a callout at its point, or the scene's top-left corner); a caption sits 8 px above
 * (or below) its point, centred on it (or, with `align`, starting or ending at it, so two captions
 * can lean apart), and is pushed a row further out when it would cover something placed before it.
 * Its hairline runs from the anchor to the caption's near edge. A caption text
 * "Line|second line" gets a second, serif-italic line; `quiet` captions are softer, with a dotted
 * hairline (things that are coming).
 */

export interface OverlayPoint {
  type: "label" | "link" | "figure";
  id: string;
  /** label / placed figure: the text point (NaN or null: a free figure) */
  x: number;
  y: number;
  ax?: number;
  ay?: number;
  opacity: number;
  draw: number;
  side?: "above" | "below";
  align?: "left" | "right";
  quiet?: boolean;
  progress?: number;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
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
interface FigNode {
  el: HTMLDivElement;
  line: SVGLineElement;
  text: string;
  w: number;
  h: number;
}

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export class OverlayLayer {
  private svg: SVGSVGElement;
  private caps = new Map<string, CapNode>();
  private links = new Map<string, LinkNode>();
  private figs = new Map<string, FigNode>();

  constructor(private root: HTMLElement) {
    this.svg = document.createElementNS(SVGNS, "svg");
    this.svg.setAttribute("class", "idea-ov-lines");
    this.svg.setAttribute("aria-hidden", "true");
    root.append(this.svg);
  }

  update(list: OverlayPoint[], texts: Record<string, string>, b: Bounds) {
    const seen = new Set<string>();
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const bw = b.x1 - b.x0;
    const bh = b.y1 - b.y0;
    const padX = Math.max(8, Math.min(28, bw * 0.03));
    const padY = Math.max(6, Math.min(20, bh * 0.03));

    /* the figure first: the biggest thing, everything else keeps clear of it */
    for (const o of list) {
      if (o.type !== "figure") continue;
      const text = texts[o.id];
      if (!text) continue;
      seen.add("f:" + o.id);
      const n = this.fig(o.id, text);
      const x = num(o.x);
      const y = num(o.y);
      let left: number;
      let top: number;
      if (x === undefined || y === undefined) {
        left = b.x0 + padX;
        top = b.y0 + padY;
      } else {
        left = o.align === "left" ? x - n.w : x;
        top = o.side === "below" ? y + GAP : y - GAP - n.h;
      }
      left = Math.min(Math.max(left, b.x0 + padX), b.x1 - padX - n.w);
      top = Math.min(Math.max(top, b.y0 + padY), b.y1 - padY - n.h);
      placed.push({ x0: left, x1: left + n.w, y0: top, y1: top + n.h });
      n.el.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      const p = Math.min(1, Math.max(0, o.progress ?? 1));
      n.el.style.setProperty("--fp", p.toFixed(3));
      n.el.style.opacity = p > 0.001 ? "1" : "0";
      const ax = num(o.ax);
      const ay = num(o.ay);
      const k = Math.min(1, Math.max(0, o.draw)) * Math.min(1, p * 1.4);
      if (ax !== undefined && ay !== undefined && k > 0.001) {
        const below = o.side === "below";
        const ex = Math.min(Math.max(ax, left + 6), left + n.w - 6);
        const ey = below ? top - 5 : top + n.h + 5;
        n.line.setAttribute("x1", ax.toFixed(1));
        n.line.setAttribute("y1", ay.toFixed(1));
        n.line.setAttribute("x2", (ax + (ex - ax) * k).toFixed(1));
        n.line.setAttribute("y2", (ay + (ey - ay) * k).toFixed(1));
        n.line.style.opacity = "1";
      } else n.line.style.opacity = "0";
    }

    /* captions in a stable order: top to bottom, so pushes go outward predictably */
    const labels = list.filter((o) => o.type === "label").sort((p, q) => p.y - q.y);
    for (const o of labels) {
      const text = texts[o.id];
      if (!text) continue;
      seen.add("c:" + o.id);
      const n = this.cap(o.id, text, !!o.quiet);
      const below = o.side === "below";
      // the caption's centre: on the point, or half a caption to the side it runs to
      const run = o.align === "right" ? 1 : o.align === "left" ? -1 : 0;
      n.el.classList.toggle("is-run-right", run > 0);
      n.el.classList.toggle("is-run-left", run < 0);
      const x = Math.min(Math.max(o.x + (run * n.w) / 2, b.x0 + padX + n.w / 2), b.x1 - padX - n.w / 2);
      let y0 = below ? o.y + GAP : o.y - GAP - n.h;
      for (let guard = 0; guard < 6; guard++) {
        const hit = placed.find(
          (p) => x - n.w / 2 - 6 < p.x1 && x + n.w / 2 + 6 > p.x0 && y0 - ROW < p.y1 && y0 + n.h + ROW > p.y0,
        );
        if (!hit) break;
        y0 = below ? hit.y1 + ROW : hit.y0 - ROW - n.h;
      }
      y0 = Math.min(Math.max(y0, b.y0 + padY), b.y1 - padY - n.h);
      placed.push({ x0: x - n.w / 2, x1: x + n.w / 2, y0, y1: y0 + n.h });
      n.el.style.transform = `translate3d(${(x - n.w / 2).toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
      n.el.style.opacity = o.opacity.toFixed(3);
      // hairline: from the anchor to the caption's near edge (drawn from the anchor)
      if (o.ax !== undefined && o.ay !== undefined && o.draw > 0.001) {
        // a centred caption takes its line a little inside its edges; a leaning one right at its edge
        const inset = run ? 0 : 4;
        const ex = Math.min(Math.max(o.ax, x - n.w / 2 + inset), x + n.w / 2 - inset);
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
    for (const [id, n] of this.figs)
      if (!seen.has("f:" + id)) {
        n.el.style.opacity = "0";
        n.line.style.opacity = "0";
      }
  }

  /** remove every caption, figure and line (a new vignette) */
  clear() {
    for (const n of this.caps.values()) {
      n.el.remove();
      n.line.remove();
    }
    for (const n of this.links.values()) {
      n.line.remove();
      n.dot.remove();
    }
    for (const n of this.figs.values()) {
      n.el.remove();
      n.line.remove();
    }
    this.caps.clear();
    this.links.clear();
    this.figs.clear();
  }

  /** caption sizes depend on the type size (breakpoints): measure again */
  remeasure() {
    for (const n of [...this.caps.values(), ...this.figs.values()]) {
      n.w = n.el.offsetWidth;
      n.h = n.el.offsetHeight;
    }
  }

  dispose() {
    this.clear();
    this.svg.remove();
  }

  private cap(id: string, text: string, quiet: boolean) {
    let n = this.caps.get(id);
    if (n && n.text !== text) {
      fill(n.el, text);
      n.text = text;
      n.w = n.el.offsetWidth;
      n.h = n.el.offsetHeight;
    }
    if (!n) {
      const el = document.createElement("span");
      el.className = quiet ? "idea-cap is-quiet" : "idea-cap";
      fill(el, text);
      this.root.append(el);
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("class", quiet ? "idea-lead is-quiet" : "idea-lead");
      this.svg.append(line);
      n = { el, line, text, w: el.offsetWidth || text.length * 9, h: el.offsetHeight || 11 };
      this.caps.set(id, n);
    }
    return n;
  }

  private fig(id: string, text: string) {
    let n = this.figs.get(id);
    if (!n) {
      const [value, unit = ""] = text.split("|");
      const el = document.createElement("div");
      el.className = "idea-figure";
      const clip = document.createElement("span");
      clip.className = "idea-figure-clip";
      const b = document.createElement("b");
      b.textContent = value;
      clip.append(b);
      const i = document.createElement("i");
      i.textContent = unit;
      el.append(clip, i);
      this.root.append(el);
      const line = document.createElementNS(SVGNS, "line");
      line.setAttribute("class", "idea-lead");
      this.svg.append(line);
      n = { el, line, text, w: el.offsetWidth || 160, h: el.offsetHeight || 80 };
      this.figs.set(id, n);
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

/** a caption's words: one line of tracked caps, or "caps|serif-italic second line" */
function fill(el: HTMLElement, text: string) {
  const [a, b] = text.split("|");
  el.textContent = "";
  const top = document.createElement("span");
  top.className = "idea-cap-a";
  top.textContent = a;
  el.append(top);
  if (b) {
    const sub = document.createElement("span");
    sub.className = "idea-cap-b";
    sub.textContent = b;
    el.append(sub);
  }
}

/**
 * The end-frame overlays of a still, stored in % of the vignette's square frame, scaled to where
 * that square sits on the panel (x, y: its top-left corner, s: its side, CSS px).
 */
export function scaleStill(list: OverlayPoint[], f: { x: number; y: number; s: number }): OverlayPoint[] {
  const X = (v: number | null | undefined) => (num(v) === undefined ? undefined : f.x + ((v as number) / 100) * f.s);
  const Y = (v: number | null | undefined) => (num(v) === undefined ? undefined : f.y + ((v as number) / 100) * f.s);
  return list.map((o) => ({
    ...o,
    x: X(o.x) ?? NaN,
    y: Y(o.y) ?? NaN,
    ax: X(o.ax),
    ay: Y(o.ay),
    opacity: 1,
    draw: 1,
    progress: 1,
  }));
}
