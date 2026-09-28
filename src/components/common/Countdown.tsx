import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCountdown } from '../../lib/format';

type CountdownProps = {
  /** ISO timestamp the countdown ends at. */
  until: string | Date;
  onExpire?: () => void;
  className?: string;
  /** Text to render once expired (default "00:00"). */
  expiredLabel?: string;
};

function msLeft(until: string | Date): number {
  const end = until instanceof Date ? until.getTime() : Date.parse(until);
  return Number.isFinite(end) ? end - Date.now() : 0;
}

/** Live "mm:ss" until `until`; calls `onExpire` once when it reaches zero. */
export function Countdown({ until, onExpire, className, expiredLabel }: CountdownProps) {
  const [left, setLeft] = useState(() => msLeft(until));
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    fired.current = false;
    setLeft(msLeft(until));
    const id = window.setInterval(() => setLeft(msLeft(until)), 1000);
    return () => window.clearInterval(id);
  }, [until]);

  useEffect(() => {
    if (left <= 0 && !fired.current) {
      fired.current = true;
      onExpireRef.current?.();
    }
  }, [left]);

  const iso = until instanceof Date ? until.toISOString() : until;
  return (
    <time dateTime={iso} className={cn('tabular-nums', className)} aria-live="off">
      {left <= 0 && expiredLabel ? expiredLabel : formatCountdown(left)}
    </time>
  );
}
