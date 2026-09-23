import { cn } from '@/lib/utils';
import { SPARKLINE_PAD, sparklineGeometry } from './sparklineGeometry';

export type SparklineTone = 'up' | 'down' | 'neutral';

export type SparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  tone?: SparklineTone;
  className?: string;
};

const TONE_CLASS: Record<SparklineTone, string> = {
  up: 'text-up',
  down: 'text-down',
  neutral: 'text-muted-foreground',
};

/**
 * DESIGN.md §5: 96×32 inline SVG, step-after path, 1.5px stroke, 12 % area fill,
 * end dot. With no points it draws the dashed border-coloured rule used by the
 * waitlist card. Decorative: the numbers it summarises are always in text nearby.
 */
export function Sparkline({ points, width = 96, height = 32, tone = 'neutral', className }: SparklineProps) {
  const geo = sparklineGeometry(points, width, height);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('shrink-0', TONE_CLASS[tone], className)}
      aria-hidden="true"
      focusable="false"
      data-testid="sparkline"
      data-tone={tone}
      data-empty={geo.end ? undefined : 'true'}
    >
      {geo.end ? (
        <>
          <path d={geo.area} fill="currentColor" opacity={0.12} />
          <path
            d={geo.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={geo.end.x} cy={geo.end.y} r={2.5} fill="currentColor" stroke="hsl(var(--card))" strokeWidth={1.5} />
        </>
      ) : (
        <line
          x1={SPARKLINE_PAD}
          y1={height / 2}
          x2={width - SPARKLINE_PAD}
          y2={height / 2}
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default Sparkline;
