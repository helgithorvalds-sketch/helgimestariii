import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EASE_OUT, useRevealProps } from '../../lib/motion';

const bar = (delay: number): Variants => ({
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.5, ease: EASE_OUT, delay } },
});

/**
 * The yellow marker behind a credit amount (`.vild-marker`), drawn left to
 * right the first time it is seen, as if by hand. The amount sits on top; the
 * bar is a separate layer so only a transform animates.
 */
export function DrawnMarker({ children, className, delay = 0.15 }: { children: ReactNode; className?: string; delay?: number }) {
  const reveal = useRevealProps();
  return (
    <motion.span className={cn('relative inline-block px-[0.12em]', className)} variants={{ hidden: {}, show: {} }} {...reveal}>
      <motion.span aria-hidden="true" className="absolute inset-x-0 bottom-[12%] top-[18%] origin-left rounded-[2px] bg-[hsl(var(--yellow))]" variants={bar(delay)} />
      <span className="relative">{children}</span>
    </motion.span>
  );
}
