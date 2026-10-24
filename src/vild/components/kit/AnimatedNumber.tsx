import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../lib/format';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Counts from the previous value to the next one (ease-out, ~700 ms).
 * Renders with Icelandic grouping and tabular figures; suffix " kr." by default,
 * an optional sign (`prefix`, e.g. "+" or "−") glued to the figure and read with it.
 */
export function AnimatedNumber({
  value,
  prefix = '',
  suffix = ' kr.',
  className,
  duration = 700,
  onComplete,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
  /** Called once the count has settled on `value` (immediately under reduced motion). */ onComplete?: () => void;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      from.current = value;
      setShown(value);
      done.current?.();
      return;
    }
    const start = performance.now();
    const a = from.current;
    const b = value;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (b - a) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        from.current = b;
        done.current?.();
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return (
    <span className={className} aria-label={`${prefix}${formatNumber(value)}${suffix}`}>
      <span aria-hidden="true" className="vild-num">
        {prefix}
        {formatNumber(shown)}
        {suffix}
      </span>
    </span>
  );
}
