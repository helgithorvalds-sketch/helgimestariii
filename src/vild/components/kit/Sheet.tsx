import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { backdropVariants, sheetVariants } from '../../lib/motion';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Extra classes for the panel. */
  className?: string;
  /** On ≥ md screens, show as a centred dialog instead of a bottom sheet. */
  desktopDialog?: boolean;
};

/**
 * Bottom sheet with a drag handle: drag down past 120px or fling to close;
 * rubber-bands upward. Portalled to <body> (which carries the .vild class).
 */
export function Sheet({ open, onClose, title, children, className, desktopDialog = true }: SheetProps) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('vild fixed inset-0 z-[60] flex items-end justify-center', desktopDialog && 'md:items-center')} role="presentation">
          <motion.div
            className="absolute inset-0 bg-[hsl(var(--green-900))]/45"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={sheetVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            className={cn(
              'relative w-full max-h-[92dvh] overflow-hidden rounded-t-[22px] bg-white text-foreground shadow-[var(--shadow-lg)]',
              'pb-[max(16px,var(--safe-bottom))]',
              desktopDialog && 'md:max-w-[480px] md:rounded-[22px] md:pb-4',
              className,
            )}
          >
            <div className="flex cursor-grab touch-none items-center justify-center pb-1 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => drag.start(e)}>
              <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
            </div>
            {(title || true) && (
              <div className="flex items-center justify-between px-5 pb-2 pt-1">
                <h2 className="text-[18px] font-bold tracking-tight">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Loka" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="max-h-[calc(92dvh-72px)] overflow-y-auto px-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
