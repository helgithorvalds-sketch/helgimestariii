import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tapSmall } from '../../lib/motion';
import { href, paths } from '../../lib/paths';
import { canGoBack } from '../lib/hooks';

/** 40px circle, top-left of detail screens. Falls back to `to` on a deep link. */
export function BackButton({ to = href(paths.appHome), overlay = false, className }: { to?: string; overlay?: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <motion.button
      type="button"
      whileTap={tapSmall}
      aria-label="Til baka"
      onClick={() => (canGoBack() ? navigate(-1) : navigate(to, { replace: true }))}
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        overlay ? 'bg-white/90 text-foreground shadow-[var(--shadow-sm)] backdrop-blur-[2px]' : 'bg-secondary text-foreground hover:bg-border/60',
        className,
      )}
    >
      <ChevronLeft className="-ml-0.5 h-6 w-6" strokeWidth={2} aria-hidden="true" />
    </motion.button>
  );
}

/** Back · title · optional right slot. The first element on detail screens. */
export function PageHeader({ title, back = true, backTo, right, className }: { title?: string; back?: boolean; backTo?: string; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 pb-2 pt-[max(12px,var(--safe-top))]', className)}>
      {back && <BackButton to={backTo} />}
      {title && <h1 className="min-w-0 flex-1 truncate text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>}
      {!title && <div className="flex-1" />}
      {right}
    </div>
  );
}

/** The big title on tab root screens: 28/800. */
export function ScreenTitle({ children, right, className, sub }: { children: ReactNode; right?: ReactNode; className?: string; sub?: ReactNode }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-[max(16px,var(--safe-top))]', className)}>
      <div className="min-w-0">
        <h1 className="text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em]">{children}</h1>
        {sub && <p className="mt-1 text-[14px] text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
