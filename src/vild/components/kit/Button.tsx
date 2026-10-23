import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tap } from '../../lib/motion';

export type ButtonVariant = 'primary' | 'mint' | 'secondary' | 'ghost' | 'dark' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[hsl(var(--green-500))] text-white hover:bg-[hsl(var(--green-600))] active:bg-[hsl(var(--green-700))]',
  mint: 'bg-[hsl(var(--mint-300))] text-[hsl(var(--green-700))] hover:bg-[hsl(var(--mint-100))]',
  secondary: 'bg-white text-foreground border border-border hover:bg-secondary',
  ghost: 'bg-transparent text-[hsl(var(--green-500))] hover:bg-accent',
  dark: 'bg-foreground text-white hover:bg-[hsl(var(--green-900))]',
  destructive: 'bg-destructive text-white hover:opacity-90',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[14px] rounded-[10px] gap-1.5',
  md: 'h-11 px-5 text-[15px] rounded-xl gap-2',
  lg: 'h-[52px] px-6 text-[16px] rounded-[14px] gap-2',
};

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  full?: boolean;
  children?: ReactNode;
};

/** The one button. Press feedback is a tiny scale, not a colour flash. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, full, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type as ButtonHTMLAttributes<HTMLButtonElement>['type']}
      whileTap={disabled || loading ? undefined : tap}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
});
