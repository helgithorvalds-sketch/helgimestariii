// Dev composition: the recurring cast (shared/cast/recurring.ts) and the Heimaey extras on one flat sheet, so a still
// shows every drawing at full size without the 3D world: rows Sóley / Kári / Amma (ung) / Amma (gömul) / hose men.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, Expr, bodySide, FrontOpts } from "../shared/look/toon";
import { drawSoley, drawKari, drawAmma } from "../shared/cast/recurring";
import { EYJAMADUR } from "../kaflar/kafli01/folk";

export const CAST_FRAMES = 1;
const ROWS: ((p: Pen, e: Expr, o: Partial<FrontOpts>) => void)[] = [
  (p, e, o) => drawSoley(p, e, o),
  (p, e, o) => drawKari(p, e, o),
  (p, e, o) => drawAmma(p, e, "ung", o),
  (p, e, o) => drawAmma(p, e, "gomul", o),
];
const EXPRS: Expr[][] = [["smile", "whistle", "shock"], ["grin", "laugh", "shock"], ["shock", "pained", "nervous"], ["smile_closed", "smile", "relief"]];

export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!;
    g.fillStyle = "#d9e4ef"; g.fillRect(0, 0, 1080, 1920);
    const cell = (col: number, row: number, k: number, fn: (p: Pen) => void) => {
      g.save(); g.translate(col * 360, row * 384 - 30); g.scale(k, k); fn(new Pen(g)); g.restore();
    };
    ROWS.forEach((draw, r) => EXPRS[r].forEach((e, c) => cell(c, r, 0.42, (p) => draw(p, e, { light: (-120 * Math.PI) / 180, ...(r === 3 && c === 1 ? { mode: "sit" } : r === 3 && c === 0 ? { prop: "photo" } : {}) }))));
    for (let c = 0; c < 3; c++) cell(c, 4, 0.42, (p) => bodySide(p, EYJAMADUR[c], { mode: "stand", prop: "hose", expr: c ? "stern" : "grin", seed: 3 + c }));
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} style={{ width: 1080, height: 1920 }} />
    </AbsoluteFill>
  );
};
