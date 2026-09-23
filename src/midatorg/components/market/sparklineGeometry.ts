/** Pure geometry for the Sparkline SVG (kept apart so the component file only exports components). */

export const SPARKLINE_PAD = 3;

export type SparklineGeometry = {
  /** Step-after polyline ("M … L …"), empty when there are no points. */
  line: string;
  /** The same path closed down to the baseline, for the 12 % area fill. */
  area: string;
  /** Last point, for the end dot. */
  end: { x: number; y: number } | null;
};

const PAD = SPARKLINE_PAD;

/**
 * Maps a series to a step-after path inside `width × height` with a 3px inset.
 * A flat series (or a single value) sits on the vertical midline.
 */
export function sparklineGeometry(points: readonly number[], width = 96, height = 32): SparklineGeometry {
  const values = points.filter((v) => Number.isFinite(v));
  if (values.length === 0) return { line: '', area: '', end: null };

  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const y = (v: number) => (span === 0 ? height / 2 : PAD + ((max - v) / span) * innerH);
  const x = (i: number) => (values.length === 1 ? PAD : PAD + (i / (values.length - 1)) * innerW);
  const f = (n: number) => Number(n.toFixed(1));

  const segments: string[] = [`M${f(x(0))} ${f(y(values[0]))}`];
  if (values.length === 1) {
    segments.push(`L${f(width - PAD)} ${f(y(values[0]))}`);
  } else {
    for (let i = 1; i < values.length; i++) {
      // horizontal run at the previous value, then the vertical step
      segments.push(`L${f(x(i))} ${f(y(values[i - 1]))}`, `L${f(x(i))} ${f(y(values[i]))}`);
    }
  }
  const line = segments.join(' ');
  const endX = width - PAD;
  const endY = y(values[values.length - 1]);
  const area = `${line} L${f(endX)} ${height} L${f(x(0))} ${height} Z`;
  return { line, area, end: { x: f(endX), y: f(endY) } };
}
