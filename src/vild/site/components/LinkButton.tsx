import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tap } from '../../lib/motion';
import type { ButtonVariant } from '../../components/kit';

type Size = 'sm' | 'md' | 'lg';

/* Mirrors kit/Button so links and buttons look identical. Kept here because a button inside a link is not valid HTML. */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[hsl(var(--green-500))] text-white hover:bg-[hsl(var(--green-600))] active:bg-[hsl(var(--green-700))]',
  mint: 'bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))] hover:bg-[hsl(var(--mint-100))]',
  secondary: 'bg-white text-foreground border border-border hover:bg-secondary',
  ghost: 'bg-transparent text-[hsl(var(--green-500))] hover:bg-accent',
  dark: 'bg-foreground text-white hover:bg-[hsl(var(--green-900))]',
  destructive: 'bg-destructive text-white hover:opacity-90',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[14px] rounded-[10px] gap-1.5',
  md: 'h-11 px-5 text-[15px] rounded-xl gap-2',
  lg: 'h-[52px] px-6 text-[16px] rounded-[14px] gap-2',
};

const MotionLink = motion.create(Link);

export type LinkButtonProps = {
  to: string;
  variant?: ButtonVariant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: ReactNode;
  title?: string;
  /** Plain <a> (same-page anchors, external). */
  anchor?: boolean;
  onClick?: () => void;
};

/** A link that looks like the kit Button. */
export function LinkButton({ to, variant = 'primary', size = 'md', full, className, children, title, anchor, onClick }: LinkButtonProps) {
  const cls = cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    className,
  );
  if (anchor) {
    return (
      <motion.a href={to} className={cls} whileTap={tap} title={title} onClick={onClick}>
        {children}
      </motion.a>
    );
  }
  return (
    <MotionLink to={to} className={cls} whileTap={tap} title={title} onClick={onClick}>
      {children}
    </MotionLink>
  );
}
