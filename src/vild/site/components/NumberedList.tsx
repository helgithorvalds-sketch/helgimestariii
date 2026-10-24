import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeUp, staggerParent, useRevealProps, viewportSection } from '../../lib/motion';

export type NumberedItem = { title: string; body: ReactNode };

/**
 * Editorial list: a big green numeral on the left, title and two lines on the
 * right, hairlines between. Not cards. The rows rise in one after another the
 * first time the list scrolls into view.
 */
export function NumberedList({ items, className, start = 1 }: { items: NumberedItem[]; className?: string; start?: number }) {
  const reveal = useRevealProps(viewportSection);
  return (
    <motion.ol className={cn('border-t border-border', className)} variants={staggerParent(0.12)} {...reveal}>
      {items.map((item, i) => (
        <motion.li key={item.title} variants={fadeUp} className="grid grid-cols-[64px_1fr] gap-4 border-b border-border py-7 sm:grid-cols-[104px_1fr] sm:gap-6 sm:py-9">
          <span className="vild-num text-[36px] font-extrabold leading-none tracking-[-0.03em] text-[hsl(var(--green-500))] sm:text-[48px]" aria-hidden="true">
            {String(start + i).padStart(2, '0')}
          </span>
          <div className="min-w-0 pt-0.5 sm:pt-1.5">
            <h3 className="text-[20px] font-bold leading-tight tracking-[-0.02em] sm:text-[22px]">{item.title}</h3>
            <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.5] text-muted-foreground sm:text-[16px]">{item.body}</p>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}
