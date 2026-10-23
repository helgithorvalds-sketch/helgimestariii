import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../lib/format';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Counts from the previous value to the next one (ease-out, ~700 ms).
 * Renders with Icelandic grouping and tabular figures; suffix " kr." by default.
 */
export function AnimatedNumber({ value, suffix = ' kr.', className, duration = 700 }: { value: number; suffix?: string; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      from.current = value;
      setShown(value);
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
      else from.current = b;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return (
    <span className={className} aria-label={`${formatNumber(value)}${suffix}`}>
      <span aria-hidden="true" className="vild-num">
        {formatNumber(shown)}
        {suffix}
      </span>
    </span>
  );
}
