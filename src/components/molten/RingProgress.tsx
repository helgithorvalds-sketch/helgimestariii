import { CountUp } from "./CountUp";

interface RingProgressProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  label?: string;
  showPercent?: boolean;
  children?: React.ReactNode;
}

export function RingProgress({
  value,
  size = 220,
  stroke = 14,
  label,
  showPercent = true,
  children,
}: RingProgressProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dash = c * clamped;
  const gradId = `ember-${size}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--ember-deep))" />
            <stop offset="50%" stopColor="hsl(var(--ember-2))" />
            <stop offset="100%" stopColor="hsl(var(--ember-3))" />
          </linearGradient>
          <filter id={`glow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--border) / 0.5)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          filter={`url(#glow-${size})`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? children : (
          <>
            {showPercent && (
              <div className="numbers-float text-5xl md:text-6xl ember-text">
                <CountUp to={Math.round(clamped * 100)} />%
              </div>
            )}
            {label && <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>}
          </>
        )}
      </div>
    </div>
  );
}