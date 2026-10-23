import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeUp } from '../../lib/motion';

/** Content column: max 1120px, 16/24/32px gutters. */
export function Container({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'footer' | 'header' | 'nav' }) {
  return <Tag className={cn('mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8', className)}>{children}</Tag>;
}

/** Display headline (site hero): 44–72px, 800, -0.03em. */
export function Display({ as: Tag = 'h1', className, children, id }: { as?: 'h1' | 'h2' | 'p'; className?: string; children: ReactNode; id?: string }) {
  return (
    <Tag id={id} className={cn('text-[40px] sm:text-[52px] lg:text-[68px]', className, 'font-extrabold leading-[1.02] tracking-[-0.03em]')}>
      {children}
    </Tag>
  );
}

/** Section headline: 32–44px, 800, -0.03em. */
export function Headline({ as: Tag = 'h2', className, children, id }: { as?: 'h1' | 'h2' | 'h3'; className?: string; children: ReactNode; id?: string }) {
  return (
    <Tag id={id} className={cn('text-[30px] sm:text-[38px] lg:text-[44px]', className, 'font-extrabold leading-[1.05] tracking-[-0.03em]')}>
      {children}
    </Tag>
  );
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('vild-eyebrow', className)}>{children}</p>;
}

export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('text-[17px] leading-[1.5] text-muted-foreground sm:text-[19px]', className)}>{children}</p>;
}

/** A section header that rises in once when scrolled into view (the only scroll animation on the site). */
export function Reveal({ className, children, as = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'header' }) {
  const Tag = as === 'header' ? motion.header : motion.div;
  return (
    <Tag className={className} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3, margin: '0px 0px -40px 0px' }}>
      {children}
    </Tag>
  );
}
