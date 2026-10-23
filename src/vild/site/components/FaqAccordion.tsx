import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_IN_OUT, EASE_OUT, springSnappy } from '../../lib/motion';
import type { FaqItem } from '../content/faq';

/**
 * Hairline accordion: question in 17px/600, answer in body size. One open at
 * a time; the panel's height animates (a single element, so that is allowed)
 * and the chevron turns. Arrow keys move between questions.
 */
export function FaqAccordion({ items, className, defaultOpen }: { items: FaqItem[]; className?: string; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | undefined>(defaultOpen);
  const reduced = useReducedMotion();
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = items.length;
    const go = (j: number) => {
      e.preventDefault();
      triggers.current[(j + n) % n]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(n - 1);
  };

  return (
    <div className={cn('border-t border-border', className)}>
      {items.map((item, i) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} id={item.id} className="scroll-mt-24 border-b border-border">
            <h3 className="flex">
              <button
                ref={(el) => {
                  triggers.current[i] = el;
                }}
                type="button"
                id={`${item.id}-trigger`}
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                onClick={() => setOpen(isOpen ? undefined : item.id)}
                onKeyDown={(e) => onKey(e, i)}
                className="flex flex-1 items-center justify-between gap-4 py-5 text-left text-[17px] font-semibold leading-snug tracking-[-0.01em] transition-colors duration-150 hover:text-[hsl(var(--green-500))] sm:text-[18px]"
              >
                {item.q}
                <motion.span className="shrink-0 text-[hsl(var(--green-500))]" animate={{ rotate: isOpen ? 180 : 0 }} transition={springSnappy} aria-hidden="true">
                  <ChevronDown className="h-5 w-5" strokeWidth={1.75} />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="panel"
                  id={`${item.id}-panel`}
                  role="region"
                  aria-labelledby={`${item.id}-trigger`}
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: reduced ? { duration: 0 } : { height: { duration: 0.28, ease: EASE_OUT }, opacity: { duration: 0.2, delay: 0.06 } } }}
                  exit={{ height: 0, opacity: 0, transition: reduced ? { duration: 0 } : { height: { duration: 0.2, ease: EASE_IN_OUT }, opacity: { duration: 0.12 } } }}
                >
                  <p className="max-w-[62ch] pb-6 text-[15px] leading-[1.55] text-foreground/80 sm:text-[16px]">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
